/**
 * Encrypted Admin Cookie Authentication
 * Provides secure cookie-based session management for admin access.
 * Uses AES-256-GCM encryption with the MASTER_KEY.
 */

import { cookies } from "next/headers";
import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scryptSync,
} from "crypto";

// ============================================
// CONFIGURATION
// ============================================

const COOKIE_NAME = "prg_admin_session";
const ALGORITHM = "aes-256-gcm";
const KEY_LENGTH = 32;
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

// 90 days in seconds
const SESSION_TTL_SECONDS = 90 * 24 * 60 * 60;

interface SessionPayload {
  /** When the session was created */
  createdAt: number;
  /** When the session expires */
  expiresAt: number;
  /** Random session ID for revocation */
  sessionId: string;
}

// ============================================
// KEY DERIVATION
// ============================================

/**
 * Derive encryption key from MASTER_KEY.
 * Uses a different salt than vault.ts for separation.
 */
function getAuthKey(): Buffer {
  const masterKeyEnv = process.env.MASTER_KEY;

  if (!masterKeyEnv) {
    throw new Error("MASTER_KEY environment variable is not set");
  }

  // Different salt for cookie encryption
  const salt = "prg-admin-cookie-auth-v1";
  return scryptSync(masterKeyEnv, salt, KEY_LENGTH);
}

// ============================================
// ENCRYPTION / DECRYPTION
// ============================================

/**
 * Encrypt session payload to a cookie value.
 */
function encryptSession(payload: SessionPayload): string {
  const key = getAuthKey();
  const iv = randomBytes(IV_LENGTH);

  const cipher = createCipheriv(ALGORITHM, key, iv);

  const plaintext = JSON.stringify(payload);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);

  const authTag = cipher.getAuthTag();

  // Format: base64(iv + encrypted + authTag)
  const combined = Buffer.concat([iv, encrypted, authTag]);
  return combined.toString("base64url");
}

/**
 * Decrypt session payload from cookie value.
 */
function decryptSession(cookieValue: string): SessionPayload | null {
  try {
    const key = getAuthKey();
    const combined = Buffer.from(cookieValue, "base64url");

    if (combined.length < IV_LENGTH + AUTH_TAG_LENGTH + 1) {
      return null;
    }

    const iv = combined.subarray(0, IV_LENGTH);
    const authTag = combined.subarray(combined.length - AUTH_TAG_LENGTH);
    const encrypted = combined.subarray(
      IV_LENGTH,
      combined.length - AUTH_TAG_LENGTH,
    );

    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]);

    return JSON.parse(decrypted.toString("utf8")) as SessionPayload;
  } catch {
    return null;
  }
}

// ============================================
// SESSION MANAGEMENT
// ============================================

/**
 * Create a new admin session and set the cookie.
 * Returns the session ID for reference.
 */
export async function createAdminSession(): Promise<string> {
  const sessionId = randomBytes(16).toString("hex");
  const now = Date.now();

  const payload: SessionPayload = {
    createdAt: now,
    expiresAt: now + SESSION_TTL_SECONDS * 1000,
    sessionId,
  };

  const encrypted = encryptSession(payload);

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, encrypted, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_TTL_SECONDS,
    path: "/",
  });

  return sessionId;
}

/**
 * Validate admin session from cookie.
 * Returns true if a valid, non-expired session exists.
 */
export async function validateAdminSession(): Promise<boolean> {
  try {
    const cookieStore = await cookies();
    const cookie = cookieStore.get(COOKIE_NAME);

    if (!cookie?.value) {
      return false;
    }

    const payload = decryptSession(cookie.value);

    if (!payload) {
      return false;
    }

    // Check expiration
    if (Date.now() > payload.expiresAt) {
      await clearAdminSession();
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Get session info (for display purposes).
 */
export async function getAdminSessionInfo(): Promise<{
  valid: boolean;
  expiresAt?: Date;
  sessionId?: string;
}> {
  try {
    const cookieStore = await cookies();
    const cookie = cookieStore.get(COOKIE_NAME);

    if (!cookie?.value) {
      return { valid: false };
    }

    const payload = decryptSession(cookie.value);

    if (!payload || Date.now() > payload.expiresAt) {
      return { valid: false };
    }

    return {
      valid: true,
      expiresAt: new Date(payload.expiresAt),
      sessionId: payload.sessionId,
    };
  } catch {
    return { valid: false };
  }
}

/**
 * Clear admin session (logout).
 */
export async function clearAdminSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

/**
 * Validate admin credentials and create session if valid.
 * Returns true if login successful.
 */
export async function loginAdmin(providedSecret: string): Promise<boolean> {
  const adminSecret = process.env.ADMIN_SECRET;

  // In development, allow empty ADMIN_SECRET
  if (!adminSecret && process.env.NODE_ENV === "development") {
    await createAdminSession();
    return true;
  }

  if (!adminSecret) {
    return false;
  }

  // Constant-time comparison would be ideal here
  if (providedSecret === adminSecret) {
    await createAdminSession();
    return true;
  }

  return false;
}
