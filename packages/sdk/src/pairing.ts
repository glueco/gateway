// ============================================
// PAIRING STRING PARSER
// ============================================

export interface PairingInfo {
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
export function parsePairingString(pairingString: string): PairingInfo {
  const trimmed = pairingString.trim();

  // Validate format
  if (!trimmed.startsWith("pair::")) {
    throw new Error('Invalid pairing string: must start with "pair::"');
  }

  // Split by `::`
  const parts = trimmed.split("::");

  if (parts.length !== 3) {
    throw new Error(
      "Invalid pairing string format. Expected: pair::<proxy_url>::<connect_code>",
    );
  }

  const [, proxyUrl, connectCode] = parts;

  // Validate proxy URL
  try {
    new URL(proxyUrl);
  } catch {
    throw new Error(`Invalid proxy URL in pairing string: ${proxyUrl}`);
  }

  // Validate connect code
  if (!connectCode || connectCode.length < 16) {
    throw new Error("Invalid connect code in pairing string");
  }

  return {
    proxyUrl,
    connectCode,
  };
}

/**
 * Create a pairing string from components.
 * Useful for testing or manual construction.
 */
export function createPairingString(
  proxyUrl: string,
  connectCode: string,
): string {
  return `pair::${proxyUrl}::${connectCode}`;
}
