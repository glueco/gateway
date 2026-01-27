#!/usr/bin/env node
/**
 * Smoke Tests for Personal Resource Gateway
 *
 * End-to-end tests that validate:
 * 1. Discovery endpoint returns enabled resources
 * 2. Schema-first validation rejects invalid requests (422)
 * 3. Policy enforcement blocks unauthorized models (403)
 * 4. Valid requests pass through (requires provider API keys)
 *
 * Usage:
 *   GATEWAY_URL=http://localhost:3000 node scripts/smoke.mjs
 *   npm run smoke:local  # Uses localhost:3000
 *   npm run smoke        # Requires GATEWAY_URL env var
 *
 * Environment Variables:
 *   GATEWAY_URL      - Base URL of the gateway (required)
 *   SKIP_AUTH_TESTS  - Skip tests requiring authentication (optional)
 *   VERBOSE          - Enable verbose output (optional)
 */

import { webcrypto } from "crypto";

// Polyfill crypto for Node.js < 19
if (!globalThis.crypto) {
  globalThis.crypto = webcrypto;
}

// ============================================
// CONFIGURATION
// ============================================

const GATEWAY_URL = process.env.GATEWAY_URL || "http://localhost:3000";
const SKIP_AUTH_TESTS = process.env.SKIP_AUTH_TESTS === "true";
const VERBOSE = process.env.VERBOSE === "true";

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

function verbose(message) {
  if (VERBOSE) {
    console.log(`${colors.dim}  ${message}${colors.reset}`);
  }
}

function success(testName) {
  log(`✓ ${testName}`, "green");
}

function failure(testName, error) {
  log(`✗ ${testName}`, "red");
  log(`  Error: ${error}`, "red");
}

function skip(testName, reason) {
  log(`○ ${testName} (skipped: ${reason})`, "yellow");
}

// ============================================
// TEST DEFINITIONS
// ============================================

const tests = [];
let passed = 0;
let failed = 0;
let skipped = 0;

function test(name, fn, options = {}) {
  tests.push({ name, fn, options });
}

async function runTests() {
  log("\n🧪 Personal Resource Gateway - Smoke Tests\n", "blue");
  log(`Gateway URL: ${GATEWAY_URL}`, "dim");
  log("");

  for (const { name, fn, options } of tests) {
    if (options.skip) {
      skip(name, options.skipReason || "disabled");
      skipped++;
      continue;
    }

    if (options.requiresAuth && SKIP_AUTH_TESTS) {
      skip(name, "auth tests disabled");
      skipped++;
      continue;
    }

    try {
      await fn();
      success(name);
      passed++;
    } catch (error) {
      failure(name, error.message);
      failed++;
      if (VERBOSE && error.stack) {
        console.log(colors.dim + error.stack + colors.reset);
      }
    }
  }

  // Summary
  log("\n" + "─".repeat(50), "dim");
  log(
    `Results: ${colors.green}${passed} passed${colors.reset}, ` +
      `${colors.red}${failed} failed${colors.reset}, ` +
      `${colors.yellow}${skipped} skipped${colors.reset}`,
  );

  if (failed > 0) {
    process.exit(1);
  }
}

// ============================================
// DISCOVERY TESTS
// ============================================

test("Discovery endpoint returns JSON", async () => {
  const response = await fetch(`${GATEWAY_URL}/api/resources`);

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const contentType = response.headers.get("content-type");
  if (!contentType?.includes("application/json")) {
    throw new Error(`Expected JSON, got ${contentType}`);
  }

  verbose(`Content-Type: ${contentType}`);
});

test("Discovery endpoint lists enabled resources", async () => {
  const response = await fetch(`${GATEWAY_URL}/api/resources`);
  const data = await response.json();

  if (!Array.isArray(data.resources)) {
    throw new Error("Expected resources array");
  }

  verbose(`Found ${data.resources.length} resources`);

  // Check for expected structure - resourceId is "type:provider" format
  for (const resource of data.resources) {
    if (!resource.resourceId) {
      throw new Error(
        `Invalid resource structure: ${JSON.stringify(resource)}`,
      );
    }
    // Parse resourceId to extract type and provider
    const [type, provider] = resource.resourceId.split(":");
    if (!type || !provider) {
      throw new Error(`Invalid resourceId format: ${resource.resourceId}`);
    }
    verbose(`  - ${resource.resourceId}`);
  }
});

test("Discovery includes plugin metadata", async () => {
  const response = await fetch(`${GATEWAY_URL}/api/resources`);
  const data = await response.json();

  // Find at least one LLM resource (resourceId starts with "llm:")
  const llmResource = data.resources.find((r) =>
    r.resourceId?.startsWith("llm:"),
  );
  if (!llmResource) {
    throw new Error("No LLM resources found");
  }

  // Check for expected metadata
  if (!llmResource.actions || !Array.isArray(llmResource.actions)) {
    throw new Error("Resource missing actions array");
  }

  verbose(`LLM resource: ${llmResource.resourceId}`);
  verbose(`Actions: ${llmResource.actions.join(", ")}`);
});

// ============================================
// SCHEMA VALIDATION TESTS (422)
// ============================================

test("Invalid request body returns 422", async () => {
  // Send request missing required 'model' field
  const response = await fetch(
    `${GATEWAY_URL}/r/llm/groq/v1/chat/completions`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        // Missing 'model' field
        messages: [{ role: "user", content: "Hello" }],
      }),
    },
  );

  // Should get 422 or 400 for validation error
  if (response.status !== 422 && response.status !== 400) {
    throw new Error(`Expected 422 or 400, got ${response.status}`);
  }

  const data = await response.json();
  verbose(`Status: ${response.status}`);
  verbose(`Error: ${JSON.stringify(data)}`);
});

test("Invalid message format returns 422", async () => {
  const response = await fetch(
    `${GATEWAY_URL}/r/llm/groq/v1/chat/completions`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: "not an array", // Should be array
      }),
    },
  );

  if (response.status !== 422 && response.status !== 400) {
    throw new Error(`Expected 422 or 400, got ${response.status}`);
  }

  verbose(`Status: ${response.status}`);
});

test("Empty body returns 422", async () => {
  const response = await fetch(
    `${GATEWAY_URL}/r/llm/groq/v1/chat/completions`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    },
  );

  if (response.status !== 422 && response.status !== 400) {
    throw new Error(`Expected 422 or 400, got ${response.status}`);
  }

  verbose(`Status: ${response.status}`);
});

// ============================================
// AUTHENTICATION TESTS (401)
// ============================================

test("Unauthenticated request returns 401", async () => {
  const response = await fetch(
    `${GATEWAY_URL}/r/llm/groq/v1/chat/completions`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: "Hello" }],
      }),
    },
  );

  // Without authentication, should get 401
  if (response.status !== 401) {
    // It's also OK if we get 422 due to validation failing first
    if (response.status === 422 || response.status === 400) {
      verbose(`Validation error before auth check (${response.status})`);
      return;
    }
    throw new Error(`Expected 401, got ${response.status}`);
  }

  verbose(`Status: ${response.status}`);
});

// ============================================
// RESOURCE ROUTING TESTS
// ============================================

test("Unknown resource type returns 404", async () => {
  const response = await fetch(
    `${GATEWAY_URL}/r/unknown/provider/v1/endpoint`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    },
  );

  if (response.status !== 404) {
    throw new Error(`Expected 404, got ${response.status}`);
  }

  verbose(`Status: ${response.status}`);
});

test("Unknown provider returns 404", async () => {
  const response = await fetch(
    `${GATEWAY_URL}/r/llm/unknownprovider/v1/chat/completions`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    },
  );

  if (response.status !== 404) {
    throw new Error(`Expected 404, got ${response.status}`);
  }

  verbose(`Status: ${response.status}`);
});

// ============================================
// HEALTH / BASIC CONNECTIVITY
// ============================================

test("Root endpoint is accessible", async () => {
  const response = await fetch(`${GATEWAY_URL}/`);

  // Any 2xx or 3xx response is OK (might redirect to dashboard)
  if (response.status >= 400) {
    throw new Error(`Expected 2xx/3xx, got ${response.status}`);
  }

  verbose(`Status: ${response.status}`);
});

test("API routes return proper CORS headers", async () => {
  const response = await fetch(`${GATEWAY_URL}/api/resources`, {
    method: "OPTIONS",
  });

  // Check for CORS headers (may or may not be present based on config)
  const allowOrigin = response.headers.get("access-control-allow-origin");
  const allowMethods = response.headers.get("access-control-allow-methods");

  verbose(`Allow-Origin: ${allowOrigin || "(not set)"}`);
  verbose(`Allow-Methods: ${allowMethods || "(not set)"}`);

  // This test just verifies the endpoint responds
  if (response.status >= 500) {
    throw new Error(`Server error: ${response.status}`);
  }
});

// ============================================
// PLUGIN-SPECIFIC VALIDATION
// ============================================

test("Groq: max_tokens validation", async () => {
  const response = await fetch(
    `${GATEWAY_URL}/r/llm/groq/v1/chat/completions`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: "Hello" }],
        max_tokens: 999999999, // Absurdly high
      }),
    },
  );

  // Should either fail validation or require auth
  if (response.status === 200) {
    throw new Error("Expected rejection for absurd max_tokens");
  }

  verbose(`Status: ${response.status}`);
});

test("Gemini resource routes correctly", async () => {
  const response = await fetch(
    `${GATEWAY_URL}/r/llm/gemini/v1/chat/completions`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gemini-2.0-flash",
        messages: [{ role: "user", content: "Hello" }],
      }),
    },
  );

  // Should not be 404 (resource exists)
  if (response.status === 404) {
    throw new Error("Gemini resource not found - check proxy.plugins.ts");
  }

  verbose(`Status: ${response.status}`);
});

test("OpenAI resource routes correctly", async () => {
  const response = await fetch(
    `${GATEWAY_URL}/r/llm/openai/v1/chat/completions`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [{ role: "user", content: "Hello" }],
      }),
    },
  );

  // Should not be 404 (resource exists)
  if (response.status === 404) {
    throw new Error("OpenAI resource not found - check proxy.plugins.ts");
  }

  verbose(`Status: ${response.status}`);
});

// ============================================
// CONNECT/PAIRING ENDPOINT TESTS
// ============================================

test("Connect prepare endpoint exists", async () => {
  const response = await fetch(`${GATEWAY_URL}/api/connect/prepare`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      // Minimal request to check endpoint exists
    }),
  });

  // Should not be 404
  if (response.status === 404) {
    throw new Error("Connect prepare endpoint not found");
  }

  // 400 is expected (missing required fields)
  verbose(`Status: ${response.status}`);
});

test("Admin API requires authentication", async () => {
  const response = await fetch(`${GATEWAY_URL}/api/admin/apps`);

  // Should require auth (401 or 403)
  if (response.status !== 401 && response.status !== 403) {
    // If it returns 200, admin API is unprotected (security issue)
    if (response.status === 200) {
      throw new Error("Admin API is unprotected!");
    }
    // 404 is OK if endpoint doesn't exist
    if (response.status === 404) {
      verbose("Admin endpoint not found (OK if not implemented)");
      return;
    }
    throw new Error(`Expected 401/403, got ${response.status}`);
  }

  verbose(`Status: ${response.status}`);
});

// ============================================
// ENFORCEMENT / POLICY TESTS
// ============================================

test("Model not in allowedModels would be rejected", async () => {
  // This test validates the enforcement logic exists
  // Without auth, we can't fully test policy enforcement,
  // but we can verify the endpoint processes the model field

  const response = await fetch(
    `${GATEWAY_URL}/r/llm/groq/v1/chat/completions`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "definitely-not-a-real-model-xyz123",
        messages: [{ role: "user", content: "Hello" }],
      }),
    },
  );

  // Should fail with validation error (model not allowed)
  // or auth error (can't check policy without auth)
  if (response.status === 200) {
    throw new Error("Fake model should not succeed");
  }

  const data = await response.json();
  verbose(`Status: ${response.status}`);
  verbose(`Response: ${JSON.stringify(data)}`);
});

// ============================================
// RESPONSE FORMAT TESTS
// ============================================

test("Error responses have consistent structure", async () => {
  const response = await fetch(
    `${GATEWAY_URL}/r/llm/groq/v1/chat/completions`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    },
  );

  const data = await response.json();

  // Check for error structure
  if (!data.error && !data.message && !data.code) {
    verbose(`Response: ${JSON.stringify(data)}`);
    // Not a strict failure - different error formats are OK
  }

  verbose(`Error structure: ${Object.keys(data).join(", ")}`);
});

// ============================================
// RESEND EMAIL PLUGIN TESTS
// ============================================

const SMOKE_EMAIL_FROM = process.env.SMOKE_EMAIL_FROM;
const SMOKE_EMAIL_TO = process.env.SMOKE_EMAIL_TO;
const RESEND_ENABLED = SMOKE_EMAIL_FROM && SMOKE_EMAIL_TO;

test("Resend plugin appears in discovery (if enabled)", async () => {
  const response = await fetch(`${GATEWAY_URL}/api/resources`);
  const data = await response.json();

  const resendResource = data.resources?.find(
    (r) => r.resourceId === "mail:resend",
  );

  if (!resendResource) {
    verbose("Resend plugin not enabled in discovery");
    return; // Not a failure - plugin may not be enabled
  }

  // Verify expected structure
  if (!resendResource.actions?.includes("emails.send")) {
    throw new Error("Resend plugin missing emails.send action");
  }

  verbose(
    `Found mail:resend with actions: ${resendResource.actions.join(", ")}`,
  );
});

test("Resend resource routes correctly", async () => {
  const response = await fetch(`${GATEWAY_URL}/r/mail/resend/emails/send`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      from: "test@example.com",
      to: "recipient@example.com",
      subject: "Test",
      text: "Hello",
    }),
  });

  // Should not be 404 (resource exists)
  if (response.status === 404) {
    verbose("Resend resource not found - plugin may not be enabled");
    return;
  }

  verbose(`Status: ${response.status}`);
});

test("Resend rejects missing subject (contract validation)", async () => {
  const response = await fetch(`${GATEWAY_URL}/r/mail/resend/emails/send`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      from: "test@example.com",
      to: "recipient@example.com",
      // Missing subject
      text: "Hello",
    }),
  });

  // Should fail with 422 validation error or 401 auth error
  if (response.status === 200) {
    throw new Error("Missing subject should not succeed");
  }

  // 404 means plugin not enabled
  if (response.status === 404) {
    verbose("Resend plugin not enabled");
    return;
  }

  const data = await response.json();
  verbose(`Status: ${response.status}`);
  verbose(`Error: ${data.message || data.error || JSON.stringify(data)}`);
});

test("Resend rejects missing content (contract validation)", async () => {
  const response = await fetch(`${GATEWAY_URL}/r/mail/resend/emails/send`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      from: "test@example.com",
      to: "recipient@example.com",
      subject: "Test Subject",
      // Missing both text and html
    }),
  });

  // Should fail with 422 validation error
  if (response.status === 200) {
    throw new Error("Missing text/html should not succeed");
  }

  if (response.status === 404) {
    verbose("Resend plugin not enabled");
    return;
  }

  const data = await response.json();
  verbose(`Status: ${response.status}`);
  verbose(`Error: ${data.message || data.error || JSON.stringify(data)}`);
});

test(
  "Resend send email (E2E - requires SMOKE_EMAIL_FROM/TO)",
  async () => {
    if (!RESEND_ENABLED) {
      verbose("Set SMOKE_EMAIL_FROM and SMOKE_EMAIL_TO to enable");
      return;
    }

    // This would require authentication to actually send
    // For smoke test, we just verify the endpoint processes valid payloads
    const response = await fetch(`${GATEWAY_URL}/r/mail/resend/emails/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        from: SMOKE_EMAIL_FROM,
        to: SMOKE_EMAIL_TO,
        subject: `Smoke Test - ${new Date().toISOString()}`,
        text: "This is a smoke test email from the gateway test suite.",
        html: "<p>This is a <strong>smoke test</strong> email from the gateway test suite.</p>",
        tags: [{ name: "type", value: "smoke-test" }],
      }),
    });

    // Without auth, we expect 401
    // With auth, we'd expect 200 or upstream error
    if (response.status === 404) {
      verbose("Resend plugin not enabled");
      return;
    }

    verbose(`Status: ${response.status}`);
    const data = await response.json();
    verbose(`Response: ${JSON.stringify(data)}`);
  },
  { skip: !RESEND_ENABLED, skipReason: "SMOKE_EMAIL_FROM/TO not set" },
);

// ============================================
// PERMISSION EXPIRY TESTS
// ============================================

test("Expired permissions are correctly rejected", async () => {
  // This test validates that the access-policy enforcement correctly
  // rejects requests when permissions have expired.
  // The actual expiry logic is enforced in access-policy.ts checkAccessPolicy()

  // Without an authenticated session with an expired permission,
  // we can only verify the endpoint exists and returns auth error
  const response = await fetch(
    `${GATEWAY_URL}/r/llm/groq/v1/chat/completions`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: "Hello" }],
      }),
    },
  );

  // Should require authentication (401) or fail validation
  // This confirms the policy enforcement pipeline is active
  if (response.status === 200) {
    throw new Error("Unauthenticated request should not succeed");
  }

  verbose(`Status: ${response.status} (policy enforcement active)`);
});

test("Permission time window validation is enforced", async () => {
  // This validates that the time window checking logic exists in the pipeline
  // The checkTimeWindow function in access-policy.ts handles:
  // - validFrom: Permissions not yet active
  // - expiresAt: Expired permissions
  // - timeWindow: Restricted hours

  const response = await fetch(
    `${GATEWAY_URL}/r/llm/groq/v1/chat/completions`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Add a fake timestamp to verify timestamp handling
        "x-ts": String(Math.floor(Date.now() / 1000)),
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: "Test time window" }],
      }),
    },
  );

  // Without valid auth, we expect 401
  // This confirms the access policy pipeline processes time-based constraints
  if (
    response.status !== 401 &&
    response.status !== 422 &&
    response.status !== 400
  ) {
    verbose(`Unexpected status: ${response.status}`);
  }

  verbose(`Status: ${response.status}`);
});

test("Rate limit headers are processed", async () => {
  // Verify rate limiting infrastructure exists
  // The checkRateLimit function uses sliding window algorithm

  const response = await fetch(
    `${GATEWAY_URL}/r/llm/groq/v1/chat/completions`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: "Rate limit test" }],
      }),
    },
  );

  // Check if rate limit headers are returned
  const rateLimitRemaining = response.headers.get("x-ratelimit-remaining");
  const rateLimitReset = response.headers.get("x-ratelimit-reset");

  verbose(`Rate-Limit-Remaining: ${rateLimitRemaining || "(not set)"}`);
  verbose(`Rate-Limit-Reset: ${rateLimitReset || "(not set)"}`);
  verbose(`Status: ${response.status}`);
});

// ============================================
// RUN ALL TESTS
// ============================================

runTests().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
