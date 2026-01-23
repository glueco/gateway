/**
 * Browser-safe connect flow implementation.
 * This reimplements the SDK's connect() function without Node.js dependencies.
 */

export interface KeyPair {
  publicKey: string;
  privateKey: string;
}

export interface PairingInfo {
  proxyUrl: string;
  connectCode: string;
}

/**
 * Parse a pairing string into its components.
 * Format: pair::<proxy_url>::<connect_code>
 */
export function parsePairingString(pairingString: string): PairingInfo {
  const trimmed = pairingString.trim();

  if (!trimmed.startsWith("pair::")) {
    throw new Error('Invalid pairing string: must start with "pair::"');
  }

  const parts = trimmed.split("::");

  if (parts.length !== 3) {
    throw new Error(
      "Invalid pairing string format. Expected: pair::<proxy_url>::<connect_code>",
    );
  }

  const [, proxyUrl, connectCode] = parts;

  try {
    new URL(proxyUrl);
  } catch {
    throw new Error(`Invalid proxy URL in pairing string: ${proxyUrl}`);
  }

  if (!connectCode || connectCode.length < 16) {
    throw new Error("Invalid connect code in pairing string");
  }

  return {
    proxyUrl,
    connectCode,
  };
}

export interface ConnectOptions {
  /** The pairing string from the gateway */
  pairingString: string;

  /** App metadata */
  app: {
    name: string;
    description?: string;
    homepage?: string;
  };

  /** Permissions to request */
  requestedPermissions: Array<{
    resourceId: string;
    actions: string[];
  }>;

  /** URL to redirect back to after approval */
  redirectUri: string;

  /** Existing keypair to use */
  keyPair: KeyPair;
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

  /** The keypair used */
  keyPair: KeyPair;
}

/**
 * Initiate the connection flow (browser-safe).
 */
export async function connect(options: ConnectOptions): Promise<ConnectResult> {
  const { proxyUrl, connectCode } = parsePairingString(options.pairingString);

  const requestPayload = {
    connectCode,
    app: {
      name: options.app.name,
      description: options.app.description,
      homepage: options.app.homepage,
    },
    publicKey: options.keyPair.publicKey,
    requestedPermissions: options.requestedPermissions,
    redirectUri: options.redirectUri,
  };

  const response = await fetch(`${proxyUrl}/api/connect/prepare`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestPayload),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    // Handle structured error response: { error: { code, message, details? } }
    const errorMessage =
      body?.error?.message ||
      (typeof body?.error === "string" ? body.error : null) ||
      `Connection failed: ${response.status}`;
    throw new Error(errorMessage);
  }

  const data = await response.json();

  return {
    approvalUrl: data.approvalUrl,
    sessionToken: data.sessionToken,
    expiresAt: new Date(data.expiresAt),
    proxyUrl,
    keyPair: options.keyPair,
  };
}

/**
 * Handle the callback after approval.
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
