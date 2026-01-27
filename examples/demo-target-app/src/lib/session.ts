/**
 * Session Storage with TTL
 * Stores proxy connection state temporarily in localStorage.
 * Expiry is determined by the gateway's permission expiry.
 */

export interface KeyPair {
  publicKey: string;
  privateKey: string;
}

export interface SessionData {
  proxyUrl: string;
  appId: string;
  keyPair: KeyPair;
  createdAt: number; // Unix timestamp in ms - when connection was established
  expiresAt: number; // Unix timestamp in ms - from gateway permission expiry
}

export interface PendingConnection {
  proxyUrl: string;
  keyPair: KeyPair;
  createdAt: number;
  expiresAt: number;
}

const SESSION_KEY = "proxy_system_check_session";
const PENDING_KEY = "proxy_system_check_pending";
const DEFAULT_TTL_MS = 60 * 60 * 1000; // 1 hour fallback

/**
 * Check if we're in a browser environment
 */
function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

/**
 * Save session data with expiry time from gateway.
 * If no expiresAt is provided, falls back to default TTL.
 */
export function saveSession(
  data: Omit<SessionData, "createdAt" | "expiresAt">,
  expiresAt?: Date | number | null,
): void {
  if (!isBrowser()) return;

  const now = Date.now();

  // Calculate expiry - use provided value or fall back to default TTL
  let expiryMs: number;
  if (expiresAt instanceof Date) {
    expiryMs = expiresAt.getTime();
  } else if (typeof expiresAt === "number") {
    expiryMs = expiresAt;
  } else {
    // Fallback to default TTL if no expiry provided
    expiryMs = now + DEFAULT_TTL_MS;
  }

  const session: SessionData = {
    ...data,
    createdAt: now,
    expiresAt: expiryMs,
  };

  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  // Clear pending connection on successful session
  localStorage.removeItem(PENDING_KEY);
}

/**
 * Load session data if it exists and hasn't expired
 */
export function loadSession(): SessionData | null {
  if (!isBrowser()) return null;

  const stored = localStorage.getItem(SESSION_KEY);
  if (!stored) return null;

  try {
    const session: SessionData = JSON.parse(stored);

    // Check if expired
    if (Date.now() > session.expiresAt) {
      clearSession();
      return null;
    }

    return session;
  } catch {
    clearSession();
    return null;
  }
}

/**
 * Clear the session (disconnect)
 */
export function clearSession(): void {
  if (!isBrowser()) return;
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(PENDING_KEY);
}

/**
 * Save a pending connection (before approval)
 */
export function savePendingConnection(
  data: Omit<PendingConnection, "createdAt" | "expiresAt">,
  ttlMs: number = 10 * 60 * 1000, // 10 minutes for pending
): void {
  if (!isBrowser()) return;

  const now = Date.now();
  const pending: PendingConnection = {
    ...data,
    createdAt: now,
    expiresAt: now + ttlMs,
  };

  localStorage.setItem(PENDING_KEY, JSON.stringify(pending));
}

/**
 * Load pending connection if it exists and hasn't expired
 */
export function loadPendingConnection(): PendingConnection | null {
  if (!isBrowser()) return null;

  const stored = localStorage.getItem(PENDING_KEY);
  if (!stored) return null;

  try {
    const pending: PendingConnection = JSON.parse(stored);

    // Check if expired
    if (Date.now() > pending.expiresAt) {
      localStorage.removeItem(PENDING_KEY);
      return null;
    }

    return pending;
  } catch {
    localStorage.removeItem(PENDING_KEY);
    return null;
  }
}

/**
 * Clear pending connection
 */
export function clearPendingConnection(): void {
  if (!isBrowser()) return;
  localStorage.removeItem(PENDING_KEY);
}

/**
 * Get remaining session time in seconds
 */
export function getSessionTimeRemaining(): number | null {
  const session = loadSession();
  if (!session) return null;

  const remaining = Math.max(0, session.expiresAt - Date.now());
  return Math.floor(remaining / 1000);
}

/**
 * Extend session TTL (refresh)
 */
export function extendSession(ttlMs: number = DEFAULT_TTL_MS): void {
  const session = loadSession();
  if (!session) return;

  session.expiresAt = Date.now() + ttlMs;
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

/**
 * Format remaining time for display
 */
export function formatTimeRemaining(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}
