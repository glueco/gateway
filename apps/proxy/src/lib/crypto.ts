import * as ed from "@noble/ed25519";
import { sha512 } from "@noble/hashes/sha512";
import { sha256 } from "@noble/hashes/sha256";

// Configure ed25519 to use sha512
ed.etc.sha512Sync = (...m) => sha512(ed.etc.concatBytes(...m));

// ============================================
// PoP SIGNATURE VERIFICATION
// ============================================

export interface PoPHeaders {
  popVersion: string | null;
  appId: string;
  timestamp: string;
  nonce: string;
  signature: string;
}

/**
 * @deprecated Use buildCanonicalRequestV1 from @glueco/shared instead
 */
export interface SignaturePayload {
  method: string;
  path: string;
  appId: string;
  timestamp: string;
  nonce: string;
  bodyHash: string;
}

/**
 * @deprecated Use buildCanonicalRequestV1 from @glueco/shared instead
 * Create the canonical signature payload string.
 * Format:
 * v1\n
 * <HTTP_METHOD>\n
 * <PATH>\n
 * <x-app-id>\n
 * <x-ts>\n
 * <x-nonce>\n
 * <sha256_base64url(body_bytes)>\n
 */
export function createCanonicalPayload(payload: SignaturePayload): string {
  return [
    "v1",
    payload.method.toUpperCase(),
    payload.path,
    payload.appId,
    payload.timestamp,
    payload.nonce,
    payload.bodyHash,
    "", // trailing newline
  ].join("\n");
}

/**
 * Compute SHA-256 hash of body and encode as base64url.
 */
export function hashBody(body: Uint8Array | string): string {
  const bytes =
    typeof body === "string" ? new TextEncoder().encode(body) : body;
  const hash = sha256(bytes);
  return base64UrlEncode(hash);
}

/**
 * Verify an Ed25519 signature using a pre-built canonical string.
 * This is the preferred method - use buildCanonicalRequestV1 from @glueco/shared.
 */
export async function verifySignatureWithCanonical(
  publicKeyBase64: string,
  signatureBase64: string,
  canonicalString: string,
): Promise<boolean> {
  try {
    const publicKey = base64Decode(publicKeyBase64);
    const signature = base64Decode(signatureBase64);
    const message = new TextEncoder().encode(canonicalString);

    return await ed.verifyAsync(signature, message, publicKey);
  } catch (error) {
    console.error("Signature verification error:", error);
    return false;
  }
}

/**
 * @deprecated Use verifySignatureWithCanonical instead
 * Verify an Ed25519 signature.
 */
export async function verifySignature(
  publicKeyBase64: string,
  signatureBase64: string,
  payload: SignaturePayload,
): Promise<boolean> {
  return verifySignatureWithCanonical(
    publicKeyBase64,
    signatureBase64,
    createCanonicalPayload(payload),
  );
}

/**
 * Validate timestamp is within acceptable window (±90 seconds).
 */
export function validateTimestamp(
  timestamp: string,
  windowSeconds: number = 90,
): boolean {
  const ts = parseInt(timestamp, 10);
  if (isNaN(ts)) return false;

  const now = Math.floor(Date.now() / 1000);
  const diff = Math.abs(now - ts);

  return diff <= windowSeconds;
}

// ============================================
// KEY GENERATION (for testing/SDK)
// ============================================

/**
 * Generate a new Ed25519 keypair.
 * Returns { publicKey, privateKey } as base64-encoded strings.
 */
export async function generateKeyPair(): Promise<{
  publicKey: string;
  privateKey: string;
}> {
  const privateKeyBytes = ed.utils.randomPrivateKey();
  const publicKeyBytes = await ed.getPublicKeyAsync(privateKeyBytes);

  return {
    publicKey: base64Encode(publicKeyBytes),
    privateKey: base64Encode(privateKeyBytes),
  };
}

/**
 * Sign a payload with a private key.
 */
export async function signPayload(
  privateKeyBase64: string,
  payload: SignaturePayload,
): Promise<string> {
  const privateKey = base64Decode(privateKeyBase64);
  const message = new TextEncoder().encode(createCanonicalPayload(payload));
  const signature = await ed.signAsync(message, privateKey);

  return base64Encode(signature);
}

// ============================================
// BASE64 UTILITIES
// ============================================

/**
 * Encode bytes to standard base64.
 */
export function base64Encode(bytes: Uint8Array): string {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(bytes).toString("base64");
  }
  // Browser fallback
  return btoa(String.fromCharCode(...bytes));
}

/**
 * Decode base64 string to bytes.
 */
export function base64Decode(str: string): Uint8Array {
  if (typeof Buffer !== "undefined") {
    return new Uint8Array(Buffer.from(str, "base64"));
  }
  // Browser fallback
  return new Uint8Array(
    atob(str)
      .split("")
      .map((c) => c.charCodeAt(0)),
  );
}

/**
 * Encode bytes to base64url (URL-safe base64).
 */
export function base64UrlEncode(bytes: Uint8Array): string {
  return base64Encode(bytes)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/**
 * Decode base64url string to bytes.
 */
export function base64UrlDecode(str: string): Uint8Array {
  // Add padding if needed
  let padded = str.replace(/-/g, "+").replace(/_/g, "/");
  while (padded.length % 4) {
    padded += "=";
  }
  return base64Decode(padded);
}
