#!/usr/bin/env node
/**
 * Permission Expiry Test
 *
 * This test validates that the gateway correctly rejects requests
 * after a permission has expired.
 *
 * It works by:
 * 1. Creating an app and permission via the database
 * 2. Making authenticated requests before expiry (should succeed)
 * 3. Waiting for the permission to expire
 * 4. Making authenticated requests after expiry (should fail with 403 EXPIRED)
 *
 * Usage:
 *   DATABASE_URL=... node scripts/test-expiry.mjs
 *   npm run test:expiry
 *
 * Prerequisites:
 *   - Gateway must be running (GATEWAY_URL)
 *   - Database access (DATABASE_URL)
 *   - At least one resource configured (e.g., llm:groq)
 */

import { webcrypto } from "crypto";

// Dynamic import for Prisma (ESM compatible)
const { PrismaClient } = await import("@prisma/client");

// Polyfill crypto for Node.js
if (!globalThis.crypto) {
  globalThis.crypto = webcrypto;
}

// Ed25519 utilities for PoP auth
import * as ed from "@noble/ed25519";
import { sha512 } from "@noble/hashes/sha512";
ed.etc.sha512Sync = (...m) => sha512(ed.etc.concatBytes(...m));

// ============================================
// CONFIGURATION
// ============================================

const GATEWAY_URL = process.env.GATEWAY_URL || "http://localhost:3000";
const EXPIRY_SECONDS = 5; // Permission expires after 5 seconds

const prisma = new PrismaClient();

// ============================================
// UTILITIES
// ============================================

const colors = {
  reset: "\x1b[0m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  dim: "\x1b[2m",
};

function log(message, color = "reset") {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function base64UrlEncode(bytes) {
  const base64 = Buffer.from(bytes).toString("base64");
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function generateNonce() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return base64UrlEncode(bytes);
}

async function generateKeyPair() {
  const privateKey = ed.utils.randomPrivateKey();
  const publicKey = await ed.getPublicKeyAsync(privateKey);
  return {
    privateKey: base64UrlEncode(privateKey),
    publicKey: base64UrlEncode(publicKey),
    privateKeyBytes: privateKey,
    publicKeyBytes: publicKey,
  };
}

/**
 * Build the canonical request string for PoP V1 signature.
 * Format (newline-separated):
 * v1
 * <METHOD>
 * <PATH_WITH_QUERY>
 * <APP_ID>
 * <TIMESTAMP>
 * <NONCE>
 * <BODY_HASH>
 * (trailing newline)
 */
function buildCanonicalRequestV1({
  method,
  pathWithQuery,
  appId,
  ts,
  nonce,
  bodyHash,
}) {
  return [
    "v1",
    method.toUpperCase(),
    pathWithQuery,
    appId,
    ts,
    nonce,
    bodyHash,
    "", // trailing newline
  ].join("\n");
}

async function signRequest(
  privateKeyBytes,
  method,
  pathWithQuery,
  appId,
  ts,
  nonce,
  body,
) {
  const encoder = new TextEncoder();
  const bodyHash = await crypto.subtle.digest("SHA-256", encoder.encode(body));
  const bodyHashB64 = base64UrlEncode(new Uint8Array(bodyHash));

  const canonical = buildCanonicalRequestV1({
    method,
    pathWithQuery,
    appId,
    ts,
    nonce,
    bodyHash: bodyHashB64,
  });

  log(`   Canonical request:\n${canonical}`, "dim");

  const signature = await ed.signAsync(
    encoder.encode(canonical),
    privateKeyBytes,
  );

  return base64UrlEncode(signature);
}

async function makeAuthenticatedRequest(
  url,
  method,
  body,
  appId,
  privateKeyBytes,
) {
  const ts = String(Math.floor(Date.now() / 1000));
  const nonce = generateNonce();
  const bodyStr = JSON.stringify(body);

  // Extract path with query from URL
  const urlObj = new URL(url);
  const pathWithQuery = urlObj.pathname + urlObj.search;

  const sig = await signRequest(
    privateKeyBytes,
    method,
    pathWithQuery,
    appId,
    ts,
    nonce,
    bodyStr,
  );

  const response = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      "x-app-id": appId,
      "x-ts": ts,
      "x-nonce": nonce,
      "x-sig": sig,
      "x-pop-v": "1", // PoP version header
    },
    body: bodyStr,
  });

  return response;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ============================================
// TEST
// ============================================

async function runExpiryTest() {
  log("\n🧪 Permission Expiry Test\n", "blue");
  log(`Gateway URL: ${GATEWAY_URL}`, "dim");
  log(`Expiry Time: ${EXPIRY_SECONDS} seconds`, "dim");
  log("");

  let testApp = null;

  try {
    // Step 1: Generate keys for the test app
    log("1. Generating Ed25519 keypair...", "blue");
    const keys = await generateKeyPair();
    log(`   Public Key: ${keys.publicKey.substring(0, 20)}...`, "dim");

    // Step 2: Check if a resource exists
    log("2. Checking for available resources...", "blue");
    const resource = await prisma.resourceSecret.findFirst({
      where: { status: "ACTIVE" },
    });

    if (!resource) {
      throw new Error(
        "No active resources found. Please add at least one resource in the admin dashboard.",
      );
    }
    log(`   Found resource: ${resource.resourceId}`, "dim");

    // Step 3: Create test app with credential
    log("3. Creating test app with short-lived permission...", "blue");
    const expiresAt = new Date(Date.now() + EXPIRY_SECONDS * 1000);

    testApp = await prisma.app.create({
      data: {
        name: `Expiry Test App ${Date.now()}`,
        description: "Automated test for permission expiry",
        status: "ACTIVE",
        credentials: {
          create: {
            publicKey: keys.publicKey,
            label: "test-credential",
          },
        },
        permissions: {
          create: {
            resourceId: resource.resourceId,
            action: "chat.completions",
            expiresAt: expiresAt,
            rateLimitRequests: 100,
            rateLimitWindowSecs: 60,
          },
        },
      },
      include: {
        permissions: true,
        credentials: true,
      },
    });

    log(`   App ID: ${testApp.id}`, "dim");
    log(`   Permission expires at: ${expiresAt.toISOString()}`, "dim");

    // Step 4: Make request BEFORE expiry - should succeed
    log("4. Making request BEFORE expiry...", "blue");

    const [resourceType, provider] = resource.resourceId.split(":");
    const url = `${GATEWAY_URL}/r/${resourceType}/${provider}/v1/chat/completions`;

    const beforeResponse = await makeAuthenticatedRequest(
      url,
      "POST",
      {
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: "Hello, test!" }],
        max_tokens: 10,
      },
      testApp.id,
      keys.privateKeyBytes,
    );

    const beforeStatus = beforeResponse.status;
    const beforeBody = await beforeResponse.json().catch(() => ({}));

    log(
      `   Status: ${beforeStatus}`,
      beforeStatus === 200 ? "green" : "yellow",
    );

    if (beforeStatus === 200) {
      log("   ✓ Request succeeded before expiry", "green");
    } else if (beforeStatus === 401 || beforeStatus === 403) {
      // Could be auth issue or resource not configured
      log(
        `   ⚠ Request failed: ${beforeBody.error?.message || beforeBody.error || JSON.stringify(beforeBody)}`,
        "yellow",
      );
      log(
        "   Note: This might be due to missing API key for the resource",
        "dim",
      );
    } else {
      log(`   Response: ${JSON.stringify(beforeBody)}`, "dim");
    }

    // Step 5: Wait for permission to expire
    log(
      `5. Waiting ${EXPIRY_SECONDS + 1} seconds for permission to expire...`,
      "blue",
    );
    await sleep((EXPIRY_SECONDS + 1) * 1000);

    const now = new Date();
    log(`   Current time: ${now.toISOString()}`, "dim");
    log(`   Permission expired at: ${expiresAt.toISOString()}`, "dim");

    // Step 6: Make request AFTER expiry - should fail with EXPIRED
    log("6. Making request AFTER expiry...", "blue");

    const afterResponse = await makeAuthenticatedRequest(
      url,
      "POST",
      {
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: "Hello, test after expiry!" }],
        max_tokens: 10,
      },
      testApp.id,
      keys.privateKeyBytes,
    );

    const afterStatus = afterResponse.status;
    const afterBody = await afterResponse.json().catch(() => ({}));

    log(`   Status: ${afterStatus}`, "dim");
    log(`   Response: ${JSON.stringify(afterBody)}`, "dim");

    // Verify the response
    if (afterStatus === 403) {
      const errorCode = afterBody.error?.code;
      if (errorCode === "ERR_PERMISSION_EXPIRED" || errorCode === "EXPIRED") {
        log(
          "\n✓ TEST PASSED: Permission correctly expired and request was rejected!",
          "green",
        );
        log(`  Error code: ${errorCode}`, "green");
        log(`  Message: ${afterBody.error?.message}`, "dim");
      } else {
        log(
          `\n⚠ Got 403 but with different error code: ${errorCode}`,
          "yellow",
        );
        log(`  Expected: ERR_PERMISSION_EXPIRED`, "dim");
      }
    } else if (afterStatus === 200) {
      log(
        "\n✗ TEST FAILED: Request succeeded after permission expired!",
        "red",
      );
      log("  The permission expiry is not being enforced correctly.", "red");
      process.exit(1);
    } else {
      log(`\n⚠ Unexpected status: ${afterStatus}`, "yellow");
      log(`  Response: ${JSON.stringify(afterBody)}`, "dim");
    }

    // Step 7: Verify permission status in database
    log("\n7. Verifying permission status in database...", "blue");

    const updatedPermission = await prisma.resourcePermission.findFirst({
      where: { appId: testApp.id },
    });

    if (updatedPermission) {
      log(`   Permission status: ${updatedPermission.status}`, "dim");
      if (updatedPermission.status === "EXPIRED") {
        log("   ✓ Permission correctly marked as EXPIRED in database", "green");
      } else {
        log(
          `   ⚠ Permission status is ${updatedPermission.status}, expected EXPIRED`,
          "yellow",
        );
      }
    }
  } catch (error) {
    log(`\n✗ Test error: ${error.message}`, "red");
    console.error(error);
    process.exit(1);
  } finally {
    // Cleanup: Delete test app
    if (testApp) {
      log("\n8. Cleaning up test data...", "blue");
      try {
        await prisma.app.delete({
          where: { id: testApp.id },
        });
        log("   ✓ Test app deleted", "dim");
      } catch (cleanupError) {
        log(`   ⚠ Cleanup failed: ${cleanupError.message}`, "yellow");
      }
    }

    await prisma.$disconnect();
  }

  log("\n✓ Permission Expiry Test Complete\n", "green");
}

// Run the test
runExpiryTest().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
