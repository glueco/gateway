// ============================================
// POST /api/rotate
// Rotate gateway credential
// ============================================

import { NextRequest, NextResponse } from "next/server";
import { verifyConnectionHandle, createConnectionHandle } from "@/lib/handle.server";
import { createGatewayFetch } from "@glueco/sdk";
import * as ed from "@noble/ed25519";
import { sha512 } from "@noble/hashes/sha512";

// Configure ed25519 to use sha512
ed.etc.sha512Sync = (...m) => sha512(ed.etc.concatBytes(...m));

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { handle } = body;

    if (!handle) {
      return NextResponse.json(
        { error: "handle is required" },
        { status: 400 }
      );
    }

    // Verify current connection handle
    const handlePayload = verifyConnectionHandle(handle);
    if (!handlePayload) {
      return NextResponse.json(
        { error: "Invalid or expired connection handle" },
        { status: 401 }
      );
    }

    const { gatewayUrl, appId } = handlePayload;

    // Get current private key
    const currentPrivateKey = process.env.GATEWAY_PRIVATE_KEY;
    if (!currentPrivateKey) {
      return NextResponse.json(
        { error: "GATEWAY_PRIVATE_KEY not configured" },
        { status: 500 }
      );
    }

    // Get or generate new private key
    const nextPrivateKey = process.env.GATEWAY_NEXT_PRIVATE_KEY;
    if (!nextPrivateKey) {
      return NextResponse.json(
        { error: "GATEWAY_NEXT_PRIVATE_KEY not configured. Set the new private key before rotating." },
        { status: 400 }
      );
    }

    // Derive public keys
    const currentPrivateKeyBytes = Buffer.from(currentPrivateKey, "base64");
    const currentPublicKeyBytes = ed.getPublicKey(currentPrivateKeyBytes);
    const currentPublicKey = Buffer.from(currentPublicKeyBytes).toString("base64");

    const nextPrivateKeyBytes = Buffer.from(nextPrivateKey, "base64");
    const nextPublicKeyBytes = ed.getPublicKey(nextPrivateKeyBytes);
    const newPublicKey = Buffer.from(nextPublicKeyBytes).toString("base64");

    // Create gateway fetch with CURRENT key to sign the rotation request
    const gatewayFetch = createGatewayFetch({
      appId,
      proxyUrl: gatewayUrl,
      keyPair: {
        publicKey: currentPublicKey,
        privateKey: currentPrivateKey,
      },
    });

    // Call proxy rotate endpoint
    const response = await gatewayFetch(`${gatewayUrl}/api/connect/rotate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ newPublicKey }),
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      return NextResponse.json(
        { error: errorBody?.error?.message || errorBody?.error || "Failed to rotate" },
        { status: response.status }
      );
    }

    // Create new connection handle (same gatewayUrl/appId, fresh expiry)
    const newHandle = createConnectionHandle(gatewayUrl, appId);

    return NextResponse.json({
      status: "rotated",
      newHandle,
      message: "Key rotated successfully. Update GATEWAY_PRIVATE_KEY to the new key.",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Rotate error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
