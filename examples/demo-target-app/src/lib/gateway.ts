// ============================================
// GATEWAY CLIENT
// Browser-compatible gateway client using SDK primitives
// ============================================

import {
  connect,
  handleCallback,
  createGatewayFetch,
  parsePairingString,
  generateKeyPair,
  type KeyPair,
  type ConnectResult,
  type GatewayTransport,
  type GatewayResponse,
  type GatewayStreamResponse,
  type GatewayRequestOptions,
} from "@glueco/sdk";
import {
  BrowserKeyStorage,
  BrowserConfigStorage,
  type GatewayConfig,
} from "./storage";

// ============================================
// BROWSER GATEWAY CLIENT
// ============================================

/**
 * Browser-compatible gateway client.
 * Uses localStorage for key and config storage.
 */
export class BrowserGatewayClient {
  private keyStorage: BrowserKeyStorage;
  private configStorage: BrowserConfigStorage;
  private keyPair: KeyPair | null = null;
  private config: GatewayConfig | null = null;
  private transport: GatewayTransport | null = null;

  constructor() {
    this.keyStorage = new BrowserKeyStorage();
    this.configStorage = new BrowserConfigStorage();
  }

  /**
   * Check if the client is connected.
   */
  async isConnected(): Promise<boolean> {
    await this.loadState();
    return !!(this.keyPair && this.config && this.config.appId);
  }

  /**
   * Connect to a gateway using a pairing string.
   */
  async connect(options: {
    pairingString: string;
    app: { name: string; description?: string; homepage?: string };
    requestedPermissions: Array<{ resourceId: string; actions: string[] }>;
    redirectUri: string;
  }): Promise<ConnectResult> {
    const { proxyUrl } = parsePairingString(options.pairingString);

    const result = await connect({
      ...options,
      keyStorage: this.keyStorage,
    });

    // Store partial config
    this.keyPair = result.keyPair;
    this.config = {
      appId: "", // Will be set after callback
      proxyUrl,
    };
    await this.configStorage.save(this.config);

    // Set session expiry from gateway response
    this.configStorage.setExpiry(result.expiresAt);

    return result;
  }

  /**
   * Handle the callback after approval.
   */
  async handleCallback(params: URLSearchParams): Promise<{
    approved: boolean;
    appId?: string;
  }> {
    const result = handleCallback(params);

    if (result.approved && result.appId) {
      await this.loadState();

      if (!this.config) {
        throw new Error("No config found after callback");
      }

      this.config = {
        ...this.config,
        appId: result.appId,
      };
      await this.configStorage.save(this.config);
      this.transport = null; // Clear cached transport
    }

    return result;
  }

  /**
   * Get the configured proxy URL.
   */
  async getProxyUrl(): Promise<string> {
    await this.loadState();
    if (!this.config) {
      throw new Error("Not connected");
    }
    return this.config.proxyUrl;
  }

  /**
   * Get the app ID.
   */
  async getAppId(): Promise<string> {
    await this.loadState();
    if (!this.config || !this.config.appId) {
      throw new Error("Not connected");
    }
    return this.config.appId;
  }

  /**
   * Get a GatewayTransport for making requests.
   */
  async getTransport(): Promise<GatewayTransport> {
    if (this.transport) {
      return this.transport;
    }

    await this.loadState();

    if (!this.keyPair || !this.config || !this.config.appId) {
      throw new Error("Not connected");
    }

    const gatewayFetch = createGatewayFetch({
      appId: this.config.appId,
      proxyUrl: this.config.proxyUrl,
      keyPair: this.keyPair,
    });

    const proxyUrl = this.config.proxyUrl;

    this.transport = {
      async request<TResponse = unknown, TPayload = unknown>(
        resourceId: string,
        action: string,
        payload: TPayload,
        options?: GatewayRequestOptions,
      ): Promise<GatewayResponse<TResponse>> {
        const url = `${proxyUrl}/api/resources/${encodeURIComponent(resourceId)}/actions/${encodeURIComponent(action)}`;
        const response = await gatewayFetch(url, {
          method: "POST",
          body: JSON.stringify(payload),
        });

        const data = await response.json();

        // Extract headers
        const headers: Record<string, string> = {};
        response.headers.forEach((value, key) => {
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
        options?: Omit<GatewayRequestOptions, "stream">,
      ): Promise<GatewayStreamResponse> {
        const url = `${proxyUrl}/api/resources/${encodeURIComponent(resourceId)}/actions/${encodeURIComponent(action)}`;
        const response = await gatewayFetch(url, {
          method: "POST",
          body: JSON.stringify({ ...payload, stream: true }),
        });

        // Extract headers
        const headers: Record<string, string> = {};
        response.headers.forEach((value, key) => {
          headers[key] = value;
        });

        return {
          stream: response.body!,
          status: response.status,
          headers,
        };
      },

      getProxyUrl: () => proxyUrl,
      getFetch: () => gatewayFetch,
    };

    return this.transport;
  }

  /**
   * Disconnect and clear all stored data.
   */
  async disconnect(): Promise<void> {
    await this.keyStorage.delete();
    await this.configStorage.delete();
    this.keyPair = null;
    this.config = null;
    this.transport = null;
  }

  /**
   * Load state from storage.
   */
  private async loadState(): Promise<void> {
    if (!this.keyPair) {
      this.keyPair = await this.keyStorage.load();
    }
    if (!this.config) {
      this.config = await this.configStorage.load();
    }
  }
}

// ============================================
// SINGLETON
// ============================================

let gatewayClient: BrowserGatewayClient | null = null;

/**
 * Get or create the gateway client singleton.
 */
export function getGatewayClient(): BrowserGatewayClient {
  if (!gatewayClient) {
    gatewayClient = new BrowserGatewayClient();
  }
  return gatewayClient;
}

/**
 * Get the config storage instance.
 */
export function getConfigStorage(): BrowserConfigStorage {
  const client = getGatewayClient();
  // Access storage through client (it's private, so we create a new one that shares the same localStorage keys)
  return new BrowserConfigStorage();
}

/**
 * Clear the gateway client singleton.
 */
export function clearGatewayClient(): void {
  gatewayClient = null;
}

// Re-export types for convenience
export type { GatewayTransport, GatewayResponse, GatewayStreamResponse } from "@glueco/sdk";
export type { GatewayConfig, BrowserConfigStorage, BrowserKeyStorage } from "./storage";
