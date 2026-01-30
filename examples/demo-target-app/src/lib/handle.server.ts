// ============================================
// CONNECTION HANDLE
// Server-signed handle for secure gateway connections
// ============================================

import { createHmac } from "crypto";

// Handle TTL: 1 hour
const HANDLE_TTL_MS = 60 * 60 * 1000;

export interface HandlePayload {
  gatewayUrl: string;
  appId: string;
  exp: number;
}

/**
 * Get the handle secret from environment.
 */
function getHandleSecret(): string {
  const secret = process.env.DEMO_HANDLE_SECRET;
  if (!secret) {
    throw new Error(
      "DEMO_HANDLE_SECRET not configured. Set a random secret for handle signing."
    );
  }
  return secret;
}

/**
 * Create a signed connection handle.
 * Handle format: base64url(JSON payload).signature
 */
export function createConnectionHandle(
  gatewayUrl: string,
  appId: string
): string {
  const payload: HandlePayload = {
    gatewayUrl,
    appId,
    exp: Date.now() + HANDLE_TTL_MS,
  };

  const payloadStr = JSON.stringify(payload);
  const payloadB64 = Buffer.from(payloadStr).toString("base64url");

  const signature = createHmac("sha256", getHandleSecret())
    .update(payloadB64)
    .digest("base64url");

  return `${payloadB64}.${signature}`;
}

/**
 * Verify and decode a connection handle.
 * Returns payload if valid and not expired, null otherwise.
 */
export function verifyConnectionHandle(handle: string): HandlePayload | null {
  try {
    const [payloadB64, signature] = handle.split(".");

    if (!payloadB64 || !signature) {
      return null;
    }

    // Verify signature
    const expectedSig = createHmac("sha256", getHandleSecret())
      .update(payloadB64)
      .digest("base64url");

    if (signature !== expectedSig) {
      return null;
    }

    // Decode and parse payload
    const payloadStr = Buffer.from(payloadB64, "base64url").toString("utf-8");
    const payload = JSON.parse(payloadStr) as HandlePayload;

    // Check expiry
    if (payload.exp < Date.now()) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}
