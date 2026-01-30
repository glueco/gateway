// ============================================
// BROWSER STORAGE IMPLEMENTATIONS
// LocalStorage-based KeyStorage and ConfigStorage for browser environments
// ============================================

import type { KeyPair } from "@glueco/sdk";

// ============================================
// TYPES
// ============================================

/**
 * Storage interface for keypairs (matches SDK's KeyStorage).
 */
export interface KeyStorage {
  load(): Promise<KeyPair | null>;
  save(keyPair: KeyPair): Promise<void>;
  delete(): Promise<void>;
}

/**
 * Storage interface for gateway config (matches SDK's ConfigStorage).
 */
export interface ConfigStorage {
  load(): Promise<GatewayConfig | null>;
  save(config: GatewayConfig): Promise<void>;
  delete(): Promise<void>;
}

/**
 * Gateway configuration stored after approval.
 */
export interface GatewayConfig {
  appId: string;
  proxyUrl: string;
}

// ============================================
// BROWSER KEY STORAGE
// ============================================

const KEY_STORAGE_KEY = "gateway:keys";

/**
 * Browser-compatible KeyStorage using localStorage.
 * Stores the Ed25519 keypair as hex-encoded strings.
 */
export class BrowserKeyStorage implements KeyStorage {
  async load(): Promise<KeyPair | null> {
    try {
      const stored = localStorage.getItem(KEY_STORAGE_KEY);
      if (!stored) return null;
      
      const parsed = JSON.parse(stored) as KeyPair;
      if (!parsed.publicKey || !parsed.privateKey) return null;
      
      return parsed;
    } catch {
      return null;
    }
  }

  async save(keyPair: KeyPair): Promise<void> {
    localStorage.setItem(KEY_STORAGE_KEY, JSON.stringify(keyPair));
  }

  async delete(): Promise<void> {
    localStorage.removeItem(KEY_STORAGE_KEY);
  }
}

// ============================================
// BROWSER CONFIG STORAGE
// ============================================

const CONFIG_STORAGE_KEY = "gateway:config";
const EXPIRY_STORAGE_KEY = "gateway:expiry";

/**
 * Browser-compatible ConfigStorage using localStorage.
 * Stores appId and proxyUrl, plus optional session expiry.
 */
export class BrowserConfigStorage implements ConfigStorage {
  async load(): Promise<GatewayConfig | null> {
    try {
      // Check expiry first
      const expiryStr = localStorage.getItem(EXPIRY_STORAGE_KEY);
      if (expiryStr) {
        const expiry = new Date(expiryStr);
        if (expiry <= new Date()) {
          // Session expired, clear everything
          await this.delete();
          return null;
        }
      }

      const stored = localStorage.getItem(CONFIG_STORAGE_KEY);
      if (!stored) return null;

      const parsed = JSON.parse(stored) as GatewayConfig;
      if (!parsed.proxyUrl) return null;

      return parsed;
    } catch {
      return null;
    }
  }

  async save(config: GatewayConfig): Promise<void> {
    localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(config));
  }

  async delete(): Promise<void> {
    localStorage.removeItem(CONFIG_STORAGE_KEY);
    localStorage.removeItem(EXPIRY_STORAGE_KEY);
  }

  // Extension: session expiry management
  setExpiry(expiresAt: Date): void {
    localStorage.setItem(EXPIRY_STORAGE_KEY, expiresAt.toISOString());
  }

  getExpiry(): Date | null {
    const stored = localStorage.getItem(EXPIRY_STORAGE_KEY);
    if (!stored) return null;
    return new Date(stored);
  }

  getTimeRemaining(): number | null {
    const expiry = this.getExpiry();
    if (!expiry) return null;
    return Math.max(0, Math.floor((expiry.getTime() - Date.now()) / 1000));
  }
}

// ============================================
// HELPERS
// ============================================

/**
 * Format seconds remaining as human-readable string.
 */
export function formatTimeRemaining(seconds: number): string {
  if (seconds <= 0) return "Expired";
  
  if (seconds < 60) {
    return `${seconds}s`;
  }
  
  if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return secs > 0 ? `${minutes}m ${secs}s` : `${minutes}m`;
  }
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
}
