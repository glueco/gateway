/**
 * Client-side crypto utilities for PoP signing.
 * Uses browser-compatible crypto operations.
 */

import { sha256 } from "@noble/hashes/sha256";
import * as ed from "@noble/ed25519";
import { sha512 } from "@noble/hashes/sha512";

// Configure ed25519 to use sha512
ed.etc.sha512Sync = (...m) => sha512(ed.etc.concatBytes(...m));

export interface KeyPair {
  publicKey: string;
  privateKey: string;
}

/**
 * PoP protocol version
 */
export const POP_VERSION = "1";

/**
 * Build canonical request string for PoP v1
 */
export function buildCanonicalRequestV1(params: {
  method: string;
  pathWithQuery: string;
  appId: string;
  ts: string;
  nonce: string;
  bodyHash: string;
}): string {
  return [
    "v1",
    params.method.toUpperCase(),
    params.pathWithQuery,
    params.appId,
    params.ts,
    params.nonce,
    params.bodyHash,
    "",
  ].join("\n");
}

/**
 * Generate a random nonce
 */
export function generateNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Base64 URL encode
 */
export function base64UrlEncode(bytes: Uint8Array): string {
  const base64 = btoa(String.fromCharCode(...bytes));
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/**
 * Base64 decode
 */
export function base64Decode(base64: string): Uint8Array {
  const normalized = base64.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
  const binary = atob(padded);
  return new Uint8Array([...binary].map((c) => c.charCodeAt(0)));
}

/**
 * Base64 encode
 */
export function base64Encode(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes));
}

/**
 * Sign a message with Ed25519 private key
 */
export async function sign(
  privateKeyBase64: string,
  message: Uint8Array,
): Promise<string> {
  const privateKey = base64Decode(privateKeyBase64);
  const signature = await ed.signAsync(message, privateKey);
  return base64Encode(signature);
}

/**
 * Generate Ed25519 keypair
 */
export async function generateKeyPair(): Promise<KeyPair> {
  const privateKeyBytes = ed.utils.randomPrivateKey();
  const publicKeyBytes = await ed.getPublicKeyAsync(privateKeyBytes);

  return {
    publicKey: base64Encode(publicKeyBytes),
    privateKey: base64Encode(privateKeyBytes),
  };
}

/**
 * PoP headers for a request
 */
export interface PopHeaders {
  "x-pop-v": string;
  "x-app-id": string;
  "x-ts": string;
  "x-nonce": string;
  "x-sig": string;
}

/**
 * Generate PoP headers for a request
 */
export async function generatePopHeaders(opts: {
  method: string;
  pathWithQuery: string;
  appId: string;
  keyPair: KeyPair;
  body?: string;
}): Promise<PopHeaders> {
  const { method, pathWithQuery, appId, keyPair, body } = opts;

  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonce = generateNonce();

  const bodyBytes = body ? new TextEncoder().encode(body) : new Uint8Array(0);
  const bodyHash = base64UrlEncode(sha256(bodyBytes));

  const canonicalPayload = buildCanonicalRequestV1({
    method: method.toUpperCase(),
    pathWithQuery,
    appId,
    ts: timestamp,
    nonce,
    bodyHash,
  });

  const signature = await sign(
    keyPair.privateKey,
    new TextEncoder().encode(canonicalPayload),
  );

  return {
    "x-pop-v": POP_VERSION,
    "x-app-id": appId,
    "x-ts": timestamp,
    "x-nonce": nonce,
    "x-sig": signature,
  };
}

/**
 * Preview what the PoP headers will look like (without real signature)
 */
export function previewPopHeaders(opts: {
  method: string;
  pathWithQuery: string;
  appId: string;
  body?: string;
}): Omit<PopHeaders, "x-sig"> & { "x-sig": string } {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonce = generateNonce();

  return {
    "x-pop-v": POP_VERSION,
    "x-app-id": opts.appId,
    "x-ts": timestamp,
    "x-nonce": nonce,
    "x-sig": "<will be computed at request time>",
  };
}
