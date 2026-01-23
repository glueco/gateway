import { parsePairingString } from "./pairing";
import { generateKeyPair, KeyPair, KeyStorage, MemoryKeyStorage } from "./keys";

// ============================================
// CONNECT FLOW
// Handles the pairing and approval process
// ============================================

export interface ConnectOptions {
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
}

export interface ConnectResult {
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
export async function connect(options: ConnectOptions): Promise<ConnectResult> {
  // Parse pairing string
  const { proxyUrl, connectCode } = parsePairingString(options.pairingString);

  // Generate or use provided keypair
  const keyPair = options.keyPair || (await generateKeyPair());

  // Save to storage if provided
  if (options.keyStorage) {
    await options.keyStorage.save(keyPair);
  }

  // Call prepare endpoint
  const response = await fetch(`${proxyUrl}/api/connect/prepare`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      connectCode,
      name: options.app.name,
      description: options.app.description,
      homepage: options.app.homepage,
      publicKey: keyPair.publicKey,
      requestedPermissions: options.requestedPermissions,
      redirectUri: options.redirectUri,
    }),
  });

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ error: "Unknown error" }));
    throw new ConnectError(
      error.error || "Failed to prepare connection",
      response.status,
    );
  }

  const data = await response.json();

  return {
    approvalUrl: data.approvalUrl,
    sessionToken: data.sessionToken,
    expiresAt: new Date(data.expiresAt),
    proxyUrl,
    keyPair,
  };
}

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
export function handleCallback(params: URLSearchParams): {
  approved: boolean;
  appId?: string;
} {
  const status = params.get("status");
  const appId = params.get("app_id");

  if (status === "approved" && appId) {
    return { approved: true, appId };
  }

  return { approved: false };
}

/**
 * Error thrown during connection.
 */
export class ConnectError extends Error {
  constructor(
    message: string,
    public statusCode: number,
  ) {
    super(message);
    this.name = "ConnectError";
  }
}
