/**
 * Session Storage with TTL
 * Stores proxy connection state temporarily in localStorage.
 * All keys and credentials expire after TTL (default: 30 minutes).
 */

export interface KeyPair {
  publicKey: string;
  privateKey: string;
}

export interface SessionData {
  proxyUrl: string;
  appId: string;
  keyPair: KeyPair;
  createdAt: number; // Unix timestamp in ms
  expiresAt: number; // Unix timestamp in ms
}

export interface PendingConnection {
  proxyUrl: string;
  keyPair: KeyPair;
  createdAt: number;
  expiresAt: number;
}

const SESSION_KEY = "proxy_system_check_session";
const PENDING_KEY = "proxy_system_check_pending";
const DEFAULT_TTL_MS = 30 * 60 * 1000; // 30 minutes

/**
 * Check if we're in a browser environment
 */
function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

/**
 * Save session data with TTL
 */
export function saveSession(
  data: Omit<SessionData, "createdAt" | "expiresAt">,
  ttlMs: number = DEFAULT_TTL_MS,
): void {
  if (!isBrowser()) return;

  const now = Date.now();
  const session: SessionData = {
    ...data,
    createdAt: now,
    expiresAt: now + ttlMs,
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
