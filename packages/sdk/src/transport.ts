// ============================================
// GATEWAY TRANSPORT INTERFACE
// Minimal transport interface for plugin clients
// ============================================

/**
 * Request options for gateway transport.
 */
export interface GatewayRequestOptions {
  /** HTTP method override (default: POST) */
  method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

  /** Custom headers to include */
  headers?: Record<string, string>;

  /** Request timeout in milliseconds */
  timeout?: number;

  /** AbortSignal for cancellation */
  signal?: AbortSignal;

  /** Enable streaming response */
  stream?: boolean;
}

/**
 * Response from gateway transport.
 */
export interface GatewayResponse<T = unknown> {
  /** Response data (for non-streaming) */
  data: T;

  /** Response status code */
  status: number;

  /** Response headers */
  headers: Record<string, string>;
}

/**
 * Streaming response from gateway transport.
 */
export interface GatewayStreamResponse {
  /** Readable stream of response data */
  stream: ReadableStream<Uint8Array>;

  /** Response status code */
  status: number;

  /** Response headers */
  headers: Record<string, string>;
}

/**
 * Gateway Transport Interface
 *
 * This is the minimal interface that plugin clients depend on.
 * It abstracts away PoP signing, baseURL handling, and error parsing.
 *
 * Plugin clients should use this interface instead of importing
 * the full SDK implementation to maintain separation of concerns.
 *
 * @example
 * ```ts
 * // In plugin client
 * export function gemini(transport: GatewayTransport) {
 *   return {
 *     async generateContent(payload: GeminiGenerateContentRequest) {
 *       return transport.request<GeminiGenerateContentResponse>(
 *         "llm:gemini",
 *         "chat.completions",
 *         payload
 *       );
 *     }
 *   };
 * }
 * ```
 */
export interface GatewayTransport {
  /**
   * Make a typed request to a resource action.
   *
   * @param resourceId - Resource identifier (e.g., "llm:gemini")
   * @param action - Action name (e.g., "chat.completions")
   * @param payload - Request payload (will be JSON serialized)
   * @param options - Optional request options
   * @returns Promise resolving to typed response
   */
  request<TResponse = unknown, TPayload = unknown>(
    resourceId: string,
    action: string,
    payload: TPayload,
    options?: GatewayRequestOptions,
  ): Promise<GatewayResponse<TResponse>>;

  /**
   * Make a streaming request to a resource action.
   *
   * @param resourceId - Resource identifier (e.g., "llm:gemini")
   * @param action - Action name (e.g., "chat.completions")
   * @param payload - Request payload (will be JSON serialized)
   * @param options - Optional request options
   * @returns Promise resolving to stream response
   */
  requestStream<TPayload = unknown>(
    resourceId: string,
    action: string,
    payload: TPayload,
    options?: Omit<GatewayRequestOptions, "stream">,
  ): Promise<GatewayStreamResponse>;

  /**
   * Get the base proxy URL.
   * Useful for constructing URLs for vendor SDKs.
   */
  getProxyUrl(): string;

  /**
   * Get the PoP-signed fetch function.
   * Use this when you need to use vendor SDKs that require a custom fetch.
   *
   * @returns Fetch function with PoP signing
   */
  getFetch(): typeof fetch;
}

/**
 * Type helper for creating typed plugin client factories.
 *
 * @example
 * ```ts
 * export const gemini: PluginClientFactory<GeminiClient> = (transport) => ({
 *   generateContent: (payload) => transport.request("llm:gemini", "chat.completions", payload)
 * });
 * ```
 */
export type PluginClientFactory<TClient> = (
  transport: GatewayTransport,
) => TClient;

/**
 * Type helper to extract the return type of a plugin client factory.
 */
export type PluginClient<T extends PluginClientFactory<unknown>> =
  T extends PluginClientFactory<infer C> ? C : never;
