import { sha256 } from "@noble/hashes/sha256";
import { sign, KeyPair } from "./keys";

// ============================================
// GATEWAY FETCH
// PoP-enabled fetch wrapper for runtime requests
// ============================================

export interface GatewayFetchOptions {
  /** App ID received after approval */
  appId: string;

  /** Gateway/proxy URL */
  proxyUrl: string;

  /** Keypair for signing */
  keyPair: KeyPair;

  /** Optional base fetch function (for testing) */
  baseFetch?: typeof fetch;
}

export type GatewayFetch = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

/**
 * Create a PoP-enabled fetch function.
 *
 * This wrapper:
 * - Adds PoP headers (x-app-id, x-ts, x-nonce, x-sig)
 * - Routes requests through the gateway
 * - Preserves request body and headers
 *
 * @example
 * const gatewayFetch = createGatewayFetch({
 *   appId: 'clx123...',
 *   proxyUrl: 'https://gateway.example.com',
 *   keyPair: { publicKey: '...', privateKey: '...' },
 * });
 *
 * // Use with OpenAI SDK - explicit resource in URL
 * const client = new OpenAI({
 *   apiKey: 'unused',
 *   baseURL: 'https://gateway.example.com/r/llm/groq', // Note: /r/<type>/<provider>
 *   fetch: gatewayFetch,
 * });
 */
export function createGatewayFetch(options: GatewayFetchOptions): GatewayFetch {
  const { appId, proxyUrl, keyPair, baseFetch = fetch } = options;

  return async (
    input: RequestInfo | URL,
    init?: RequestInit,
  ): Promise<Response> => {
    // Parse the URL
    const url =
      typeof input === "string"
        ? new URL(input)
        : input instanceof URL
          ? input
          : new URL(input.url);
    const method = init?.method || "GET";

    // Get body bytes
    let bodyBytes: Uint8Array;
    if (init?.body) {
      if (typeof init.body === "string") {
        bodyBytes = new TextEncoder().encode(init.body);
      } else if (init.body instanceof ArrayBuffer) {
        bodyBytes = new Uint8Array(init.body);
      } else if (init.body instanceof Uint8Array) {
        bodyBytes = init.body;
      } else {
        // For other body types, convert to string
        bodyBytes = new TextEncoder().encode(String(init.body));
      }
    } else {
      bodyBytes = new Uint8Array(0);
    }

    // Generate PoP headers
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const nonce = generateNonce();
    const bodyHash = base64UrlEncode(sha256(bodyBytes));

    // Create canonical payload
    const canonicalPayload = [
      "v1",
      method.toUpperCase(),
      url.pathname,
      appId,
      timestamp,
      nonce,
      bodyHash,
      "", // trailing newline
    ].join("\n");

    // Sign the payload
    const signature = await sign(
      keyPair.privateKey,
      new TextEncoder().encode(canonicalPayload),
    );

    // Merge headers
    const headers = new Headers(init?.headers);
    headers.set("x-app-id", appId);
    headers.set("x-ts", timestamp);
    headers.set("x-nonce", nonce);
    headers.set("x-sig", signature);

    // Route through proxy (replace origin with proxy URL)
    const proxyUrlObj = new URL(proxyUrl);
    const targetUrl = new URL(url.pathname + url.search, proxyUrlObj);

    // Make the request
    return baseFetch(targetUrl.toString(), {
      ...init,
      headers,
    });
  };
}

/**
 * Create a gateway fetch from environment variables.
 * Expects: GATEWAY_APP_ID, GATEWAY_PROXY_URL, GATEWAY_PUBLIC_KEY, GATEWAY_PRIVATE_KEY
 */
export function createGatewayFetchFromEnv(): GatewayFetch {
  const appId = process.env.GATEWAY_APP_ID;
  const proxyUrl = process.env.GATEWAY_PROXY_URL;
  const publicKey = process.env.GATEWAY_PUBLIC_KEY;
  const privateKey = process.env.GATEWAY_PRIVATE_KEY;

  if (!appId || !proxyUrl || !publicKey || !privateKey) {
    throw new Error(
      "Missing required environment variables: GATEWAY_APP_ID, GATEWAY_PROXY_URL, GATEWAY_PUBLIC_KEY, GATEWAY_PRIVATE_KEY",
    );
  }

  return createGatewayFetch({
    appId,
    proxyUrl,
    keyPair: { publicKey, privateKey },
  });
}

// ============================================
// UTILITIES
// ============================================

function generateNonce(): string {
  const bytes = new Uint8Array(16);

  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    // Node.js fallback
    const nodeCrypto = require("crypto");
    const randomBytes = nodeCrypto.randomBytes(16);
    bytes.set(randomBytes);
  }

  return base64UrlEncode(bytes);
}

function base64UrlEncode(bytes: Uint8Array): string {
  let base64: string;

  if (typeof Buffer !== "undefined") {
    base64 = Buffer.from(bytes).toString("base64");
  } else {
    base64 = btoa(String.fromCharCode(...bytes));
  }

  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
