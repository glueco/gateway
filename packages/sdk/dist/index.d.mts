/**
 * Request options for gateway transport.
 */
interface GatewayRequestOptions {
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
interface GatewayResponse<T = unknown> {
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
interface GatewayStreamResponse {
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
interface GatewayTransport {
    /**
     * Make a typed request to a resource action.
     *
     * @param resourceId - Resource identifier (e.g., "llm:gemini")
     * @param action - Action name (e.g., "chat.completions")
     * @param payload - Request payload (will be JSON serialized)
     * @param options - Optional request options
     * @returns Promise resolving to typed response
     */
    request<TResponse = unknown, TPayload = unknown>(resourceId: string, action: string, payload: TPayload, options?: GatewayRequestOptions): Promise<GatewayResponse<TResponse>>;
    /**
     * Make a streaming request to a resource action.
     *
     * @param resourceId - Resource identifier (e.g., "llm:gemini")
     * @param action - Action name (e.g., "chat.completions")
     * @param payload - Request payload (will be JSON serialized)
     * @param options - Optional request options
     * @returns Promise resolving to stream response
     */
    requestStream<TPayload = unknown>(resourceId: string, action: string, payload: TPayload, options?: Omit<GatewayRequestOptions, "stream">): Promise<GatewayStreamResponse>;
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
type PluginClientFactory<TClient> = (transport: GatewayTransport) => TClient;
/**
 * Type helper to extract the return type of a plugin client factory.
 */
type PluginClient<T extends PluginClientFactory<unknown>> = T extends PluginClientFactory<infer C> ? C : never;

interface KeyPair {
    publicKey: string;
    privateKey: string;
}
/**
 * Generate a new Ed25519 keypair.
 */
declare function generateKeyPair(): Promise<KeyPair>;
/**
 * Sign a message with a private key.
 */
declare function sign(privateKeyBase64: string, message: Uint8Array): Promise<string>;
/**
 * Interface for key storage backends.
 * Implement this to customize where keys are stored.
 */
interface KeyStorage {
    load(): Promise<KeyPair | null>;
    save(keyPair: KeyPair): Promise<void>;
    delete(): Promise<void>;
}
/**
 * In-memory key storage.
 * Keys are lost when the process exits.
 */
declare class MemoryKeyStorage implements KeyStorage {
    private keyPair;
    load(): Promise<KeyPair | null>;
    save(keyPair: KeyPair): Promise<void>;
    delete(): Promise<void>;
}
/**
 * File-based key storage.
 * Stores keys in a JSON file.
 */
declare class FileKeyStorage implements KeyStorage {
    private filePath;
    constructor(filePath: string);
    load(): Promise<KeyPair | null>;
    save(keyPair: KeyPair): Promise<void>;
    delete(): Promise<void>;
}
/**
 * Environment-based key storage.
 * Loads from environment variables, does not save.
 */
declare class EnvKeyStorage implements KeyStorage {
    private publicKeyEnv;
    private privateKeyEnv;
    constructor(publicKeyEnv?: string, privateKeyEnv?: string);
    load(): Promise<KeyPair | null>;
    save(keyPair: KeyPair): Promise<void>;
    delete(): Promise<void>;
}

interface GatewayFetchOptions {
    /** App ID received after approval */
    appId: string;
    /** Gateway/proxy URL */
    proxyUrl: string;
    /** Keypair for signing */
    keyPair: KeyPair;
    /** Optional base fetch function (for testing) */
    baseFetch?: typeof fetch;
    /** Whether to throw GatewayError on error responses (default: false for compatibility) */
    throwOnError?: boolean;
}
type GatewayFetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
/**
 * Create a PoP-enabled fetch function.
 *
 * This wrapper:
 * - Adds PoP headers (x-pop-v, x-app-id, x-ts, x-nonce, x-sig)
 * - Routes requests through the gateway
 * - Preserves request body and headers
 * - Includes query params in signature (v1 protocol)
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
declare function createGatewayFetch(options: GatewayFetchOptions): GatewayFetch;
/**
 * Create a gateway fetch from environment variables.
 * Expects: GATEWAY_APP_ID, GATEWAY_PROXY_URL, GATEWAY_PUBLIC_KEY, GATEWAY_PRIVATE_KEY
 */
declare function createGatewayFetchFromEnv(options?: Pick<GatewayFetchOptions, "baseFetch" | "throwOnError">): GatewayFetch;
/**
 * Resolve fetch implementation.
 * Uses provided fetch, falls back to global, or throws clear error.
 */
declare function resolveFetch(customFetch?: typeof fetch): typeof fetch;

interface PairingInfo {
    proxyUrl: string;
    connectCode: string;
}
/**
 * Parse a pairing string into its components.
 * Format: pair::<proxy_url>::<connect_code>
 *
 * @example
 * const info = parsePairingString('pair::https://my-gateway.vercel.app::abc123xyz');
 * // { proxyUrl: 'https://my-gateway.vercel.app', connectCode: 'abc123xyz' }
 */
declare function parsePairingString(pairingString: string): PairingInfo;
/**
 * Create a pairing string from components.
 * Useful for testing or manual construction.
 */
declare function createPairingString(proxyUrl: string, connectCode: string): string;

interface ConnectOptions {
    /** The pairing string from the gateway */
    pairingString: string;
    /** App metadata */
    app: {
        name: string;
        description?: string;
        homepage?: string;
    };
    /**
     * Permissions to request.
     * resourceId format: <resourceType>:<provider> (e.g., "llm:groq")
     */
    requestedPermissions: Array<{
        resourceId: string;
        actions: string[];
    }>;
    /** URL to redirect back to after approval */
    redirectUri: string;
    /** Key storage backend (default: memory) */
    keyStorage?: KeyStorage;
    /** Existing keypair to use (optional) */
    keyPair?: KeyPair;
    /** Custom fetch implementation (optional) */
    fetch?: typeof fetch;
}
interface ConnectResult {
    /** URL to redirect the user to for approval */
    approvalUrl: string;
    /** Session token for tracking */
    sessionToken: string;
    /** When the session expires */
    expiresAt: Date;
    /** The proxy URL for future requests */
    proxyUrl: string;
    /** The generated keypair (store securely!) */
    keyPair: KeyPair;
}
/**
 * Initiate the connection flow.
 *
 * 1. Parses the pairing string
 * 2. Generates (or uses provided) keypair
 * 3. Calls the prepare endpoint
 * 4. Returns the approval URL
 *
 * @example
 * const result = await connect({
 *   pairingString: 'pair::https://gateway.example.com::abc123',
 *   app: { name: 'My App' },
 *   requestedPermissions: [
 *     { resourceId: 'llm:groq', actions: ['chat.completions'] }
 *   ],
 *   redirectUri: 'https://myapp.com/callback',
 * });
 *
 * // Redirect user to result.approvalUrl
 * // Save result.keyPair securely!
 */
declare function connect(options: ConnectOptions): Promise<ConnectResult>;
/**
 * Handle the callback after approval.
 * Call this when the user is redirected back to your app.
 *
 * @example
 * const params = new URLSearchParams(window.location.search);
 * const result = handleCallback(params);
 *
 * if (result.approved) {
 *   console.log('App ID:', result.appId);
 * }
 */
declare function handleCallback(params: URLSearchParams): {
    approved: boolean;
    appId?: string;
};
/**
 * Error thrown during connection.
 */
declare class ConnectError extends Error {
    statusCode: number;
    constructor(message: string, statusCode: number);
}

/**
 * Error thrown when the gateway returns an error response.
 * Contains structured error information from the gateway.
 */
declare class GatewayError extends Error {
    readonly code: string;
    readonly status: number;
    readonly requestId?: string;
    readonly details?: unknown;
    constructor(code: string, message: string, status: number, options?: {
        requestId?: string;
        details?: unknown;
    });
    /**
     * Check if this error matches a specific error code.
     */
    is(code: string): boolean;
    /**
     * Convert to a plain object for logging/serialization.
     */
    toJSON(): {
        details?: {} | null | undefined;
        requestId?: string | undefined;
        name: string;
        code: string;
        message: string;
        status: number;
    };
}
/**
 * Parse a gateway error response and create a GatewayError.
 * Returns null if the response doesn't match the expected schema.
 */
declare function parseGatewayError(body: unknown, status: number): GatewayError | null;
/**
 * Type guard to check if an error is a GatewayError.
 */
declare function isGatewayError(error: unknown): error is GatewayError;

interface GatewayClientOptions {
    /** Storage for keypair */
    keyStorage?: KeyStorage;
    /** Storage for app config (appId, proxyUrl) */
    configStorage?: ConfigStorage;
    /** Custom fetch function (for testing or custom environments) */
    fetch?: typeof fetch;
    /** Whether to throw GatewayError on error responses (default: false) */
    throwOnError?: boolean;
}
interface ConfigStorage {
    load(): Promise<GatewayConfig | null>;
    save(config: GatewayConfig): Promise<void>;
    delete(): Promise<void>;
}
interface GatewayConfig {
    appId: string;
    proxyUrl: string;
}
/**
 * High-level gateway client.
 * Manages keys, config, and provides a simple interface.
 *
 * @example
 * const client = new GatewayClient({
 *   keyStorage: new FileKeyStorage('./.gateway/keys.json'),
 *   configStorage: new FileConfigStorage('./.gateway/config.json'),
 * });
 *
 * // First time: connect
 * if (!await client.isConnected()) {
 *   const result = await client.connect({
 *     pairingString: 'pair::...',
 *     app: { name: 'My App' },
 *     requestedPermissions: [
 *       { resourceId: 'llm:groq', actions: ['chat.completions'] }
 *     ],
 *     redirectUri: 'https://myapp.com/callback',
 *   });
 *   // Redirect user to result.approvalUrl
 * }
 *
 * // After callback
 * await client.handleCallback(params);
 *
 * // Get fetch for use with SDKs
 * const gatewayFetch = await client.getFetch();
 *
 * // Use with OpenAI SDK - explicit resource in baseURL
 * const openai = new OpenAI({
 *   apiKey: 'unused',
 *   baseURL: `${await client.getProxyUrl()}/r/llm/groq`,
 *   fetch: gatewayFetch,
 * });
 */
declare class GatewayClient {
    private keyStorage;
    private configStorage;
    private fetchFn;
    private throwOnError;
    private keyPair;
    private config;
    private gatewayFetch;
    constructor(options?: GatewayClientOptions);
    /**
     * Check if the client is connected and has valid credentials.
     * Returns true only if we have keys AND a config with a valid appId.
     */
    isConnected(): Promise<boolean>;
    /**
     * Check if a connection flow is pending (connect() was called but callback not yet received).
     * Useful for handling page refreshes during the approval flow.
     */
    isPendingApproval(): Promise<boolean>;
    /**
     * Initiate the connection flow.
     * Returns the approval URL to redirect the user to.
     */
    connect(options: {
        pairingString: string;
        app: {
            name: string;
            description?: string;
            homepage?: string;
        };
        requestedPermissions: Array<{
            resourceId: string;
            actions: string[];
        }>;
        redirectUri: string;
    }): Promise<ConnectResult>;
    /**
     * Handle the callback after user approval.
     * This loads the stored config (saved during connect()) and updates it with the appId.
     */
    handleCallback(params: URLSearchParams): Promise<{
        approved: boolean;
        appId?: string;
    }>;
    /**
     * Get the PoP-enabled fetch function.
     * Use this with vendor SDKs.
     */
    getFetch(): Promise<GatewayFetch>;
    /**
     * Get the proxy URL for configuring SDK baseURL.
     */
    getProxyUrl(): Promise<string>;
    /**
     * Get a resource-scoped base URL.
     * Use this with OpenAI SDK baseURL.
     *
     * @example
     * const baseURL = await client.getResourceBaseUrl('llm', 'groq');
     * // Returns: https://gateway.example.com/r/llm/groq
     */
    getResourceBaseUrl(resourceType: string, provider: string): Promise<string>;
    /**
     * Get the app ID.
     */
    getAppId(): Promise<string>;
    /**
     * Get a GatewayTransport instance for use with plugin clients.
     *
     * This is the recommended way to use typed plugin clients:
     *
     * @example
     * ```ts
     * import { gemini } from "@glueco/plugin-llm-gemini/client";
     *
     * const transport = await client.getTransport();
     * const geminiClient = gemini(transport);
     *
     * const response = await geminiClient.generateContent({
     *   model: "gemini-1.5-flash",
     *   messages: [{ role: "user", content: "Hello!" }]
     * });
     * ```
     */
    getTransport(): Promise<GatewayTransport>;
    /**
     * Disconnect and clear all stored credentials.
     */
    disconnect(): Promise<void>;
    /**
     * Load state from storage.
     */
    private loadState;
}
/**
 * In-memory config storage.
 */
declare class MemoryConfigStorage implements ConfigStorage {
    private config;
    load(): Promise<GatewayConfig | null>;
    save(config: GatewayConfig): Promise<void>;
    delete(): Promise<void>;
}
/**
 * File-based config storage.
 */
declare class FileConfigStorage implements ConfigStorage {
    private filePath;
    constructor(filePath: string);
    load(): Promise<GatewayConfig | null>;
    save(config: GatewayConfig): Promise<void>;
    delete(): Promise<void>;
}
/**
 * Environment-based config storage.
 */
declare class EnvConfigStorage implements ConfigStorage {
    private appIdEnv;
    private proxyUrlEnv;
    constructor(appIdEnv?: string, proxyUrlEnv?: string);
    load(): Promise<GatewayConfig | null>;
    save(config: GatewayConfig): Promise<void>;
    delete(): Promise<void>;
}

export { type ConfigStorage, ConnectError, type ConnectOptions, type ConnectResult, EnvConfigStorage, EnvKeyStorage, FileConfigStorage, FileKeyStorage, GatewayClient, type GatewayClientOptions, type GatewayConfig, GatewayError, type GatewayFetch, type GatewayFetchOptions, type GatewayRequestOptions, type GatewayResponse, type GatewayStreamResponse, type GatewayTransport, type KeyPair, type KeyStorage, MemoryConfigStorage, MemoryKeyStorage, type PairingInfo, type PluginClient, type PluginClientFactory, connect, createGatewayFetch, createGatewayFetchFromEnv, createPairingString, generateKeyPair, handleCallback, isGatewayError, parseGatewayError, parsePairingString, resolveFetch, sign };
