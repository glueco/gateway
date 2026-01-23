import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scryptSync,
} from "crypto";
import { base64Encode, base64Decode } from "./crypto";

// ============================================
// SECRETS VAULT
// Envelope encryption for upstream API keys
// ============================================

const ALGORITHM = "aes-256-gcm";
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 16; // 128 bits
const AUTH_TAG_LENGTH = 16;

/**
 * Get the master key from environment.
 * In production, this should come from KMS.
 */
function getMasterKey(): Buffer {
  const masterKeyEnv = process.env.MASTER_KEY;

  if (!masterKeyEnv) {
    throw new Error("MASTER_KEY environment variable is not set");
  }

  // Derive a proper 32-byte key from the master key
  // Using scrypt for key derivation
  const salt = "personal-resource-gateway-v1"; // Static salt for deterministic derivation
  return scryptSync(masterKeyEnv, salt, KEY_LENGTH);
}

export interface EncryptedSecret {
  encryptedKey: string; // Base64 encoded encrypted data + auth tag
  keyIv: string; // Base64 encoded IV
}

/**
 * Encrypt a secret (e.g., API key) for storage.
 */
export function encryptSecret(plaintext: string): EncryptedSecret {
  const key = getMasterKey();
  const iv = randomBytes(IV_LENGTH);

  const cipher = createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);

  const authTag = cipher.getAuthTag();

  // Combine encrypted data and auth tag
  const combined = Buffer.concat([encrypted, authTag]);

  return {
    encryptedKey: base64Encode(new Uint8Array(combined)),
    keyIv: base64Encode(new Uint8Array(iv)),
  };
}

/**
 * Decrypt a secret from storage.
 */
export function decryptSecret(encrypted: EncryptedSecret): string {
  const key = getMasterKey();
  const iv = Buffer.from(base64Decode(encrypted.keyIv));
  const combined = Buffer.from(base64Decode(encrypted.encryptedKey));

  // Split encrypted data and auth tag
  const authTag = combined.subarray(combined.length - AUTH_TAG_LENGTH);
  const encryptedData = combined.subarray(0, combined.length - AUTH_TAG_LENGTH);

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(encryptedData),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}

/**
 * Rotate encryption for a secret (re-encrypt with current key).
 * Useful when master key changes.
 */
export function rotateSecret(encrypted: EncryptedSecret): EncryptedSecret {
  const plaintext = decryptSecret(encrypted);
  return encryptSecret(plaintext);
}

/**
 * Validate that the master key is configured correctly.
 */
export function validateMasterKey(): boolean {
  try {
    const testPlaintext = "test-encryption-validation";
    const encrypted = encryptSecret(testPlaintext);
    const decrypted = decryptSecret(encrypted);
    return decrypted === testPlaintext;
  } catch (error) {
    console.error("Master key validation failed:", error);
    return false;
  }
}
