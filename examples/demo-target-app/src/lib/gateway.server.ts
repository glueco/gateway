// ============================================
// SERVER-SIDE GATEWAY CLIENT
// Creates transport for PoP-signed requests
// ============================================

import {
  createGatewayFetch,
  type GatewayTransport,
  type GatewayResponse,
  type GatewayStreamResponse,
  type GatewayRequestOptions,
} from "@glueco/sdk";
import * as ed from "@noble/ed25519";
import { sha512 } from "@noble/hashes/sha512";

// Configure ed25519 to use sha512
ed.etc.sha512Sync = (...m) => sha512(ed.etc.concatBytes(...m));

/**
 * Get the gateway key pair from environment.
 * Validates that private key is valid base64 and exactly 32 bytes.
 */
function getKeyPair(): { publicKey: string; privateKey: string } {
  const raw = process.env.GATEWAY_PRIVATE_KEY ?? "";
  
  if (!raw) {
    throw new Error(
      "GATEWAY_PRIVATE_KEY not configured. Set base64-encoded Ed25519 private key."
    );
  }

  // Validate base64 encoding
  let privateKeyBytes: Uint8Array;
  try {
    privateKeyBytes = Buffer.from(raw, "base64");
  } catch {
    throw new Error("GATEWAY_PRIVATE_KEY must be valid base64");
  }

  // Validate length (Ed25519 private keys are 32 bytes)
  if (privateKeyBytes.length !== 32) {
    throw new Error(
      `GATEWAY_PRIVATE_KEY must decode to 32 bytes (got ${privateKeyBytes.length})`
    );
  }

  // Derive public key from private key
  const publicKeyBytes = ed.getPublicKey(privateKeyBytes);
  const publicKey = Buffer.from(publicKeyBytes).toString("base64");

  return { publicKey, privateKey: raw };
}

/**
 * Create a server-side transport for gateway requests.
 * Uses GATEWAY_PRIVATE_KEY for PoP signing.
 */
export function createServerTransport(
  gatewayUrl: string,
  appId: string
): GatewayTransport {
  const keyPair = getKeyPair();

  const gatewayFetch = createGatewayFetch({
    appId,
    proxyUrl: gatewayUrl,
    keyPair,
  });

  return {
    async request<TResponse = unknown, TPayload = unknown>(
      resourceId: string,
      action: string,
      payload: TPayload,
      options?: GatewayRequestOptions
    ): Promise<GatewayResponse<TResponse>> {
      // Resource route: /r/{type}/{provider}/{action}
      // resourceId format: "type:provider" (e.g., "llm:groq")
      const [resourceType, provider] = resourceId.split(":");
      const url = `${gatewayUrl}/r/${resourceType}/${provider}/${action}`;

      const response = await gatewayFetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      // Extract headers
      const headers: Record<string, string> = {};
      response.headers.forEach((value: string, key: string) => {
        headers[key] = value;
      });

      return {
        data: data as TResponse,
        status: response.status,
        headers,
      };
    },

    async requestStream<TPayload = unknown>(
      resourceId: string,
      action: string,
      payload: TPayload,
      options?: Omit<GatewayRequestOptions, "stream">
    ): Promise<GatewayStreamResponse> {
      // Resource route: /r/{type}/{provider}/{action}
      const [resourceType, provider] = resourceId.split(":");
      const url = `${gatewayUrl}/r/${resourceType}/${provider}/${action}`;

      const response = await gatewayFetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ...payload, stream: true }),
      });

      // Extract headers
      const headers: Record<string, string> = {};
      response.headers.forEach((value: string, key: string) => {
        headers[key] = value;
      });

      return {
        stream: response.body!,
        status: response.status,
        headers,
      };
    },

    getProxyUrl: () => gatewayUrl,
    getFetch: () => gatewayFetch,
  };
}

/**
 * Get the public key from GATEWAY_PRIVATE_KEY.
 * Used when connecting to a gateway.
 */
export function getPublicKey(): string {
  return getKeyPair().publicKey;
}
