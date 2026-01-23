import * as ed from "@noble/ed25519";
import { sha512 } from "@noble/hashes/sha512";

// Configure ed25519 to use sha512
ed.etc.sha512Sync = (...m) => sha512(ed.etc.concatBytes(...m));

// ============================================
// KEY MANAGEMENT
// ============================================

export interface KeyPair {
  publicKey: string; // Base64 encoded
  privateKey: string; // Base64 encoded
}

/**
 * Generate a new Ed25519 keypair.
 */
export async function generateKeyPair(): Promise<KeyPair> {
  const privateKeyBytes = ed.utils.randomPrivateKey();
  const publicKeyBytes = await ed.getPublicKeyAsync(privateKeyBytes);

  return {
    publicKey: base64Encode(publicKeyBytes),
    privateKey: base64Encode(privateKeyBytes),
  };
}

/**
 * Sign a message with a private key.
 */
export async function sign(
  privateKeyBase64: string,
  message: Uint8Array,
): Promise<string> {
  const privateKey = base64Decode(privateKeyBase64);
  const signature = await ed.signAsync(message, privateKey);
  return base64Encode(signature);
}

// ============================================
// KEY STORAGE INTERFACE
// ============================================

/**
 * Interface for key storage backends.
 * Implement this to customize where keys are stored.
 */
export interface KeyStorage {
  load(): Promise<KeyPair | null>;
  save(keyPair: KeyPair): Promise<void>;
  delete(): Promise<void>;
}

/**
 * In-memory key storage.
 * Keys are lost when the process exits.
 */
export class MemoryKeyStorage implements KeyStorage {
  private keyPair: KeyPair | null = null;

  async load(): Promise<KeyPair | null> {
    return this.keyPair;
  }

  async save(keyPair: KeyPair): Promise<void> {
    this.keyPair = keyPair;
  }

  async delete(): Promise<void> {
    this.keyPair = null;
  }
}

/**
 * File-based key storage.
 * Stores keys in a JSON file.
 */
export class FileKeyStorage implements KeyStorage {
  constructor(private filePath: string) {}

  async load(): Promise<KeyPair | null> {
    try {
      // Dynamic import for Node.js fs
      const fs = await import("fs/promises");
      const content = await fs.readFile(this.filePath, "utf-8");
      return JSON.parse(content) as KeyPair;
    } catch {
      return null;
    }
  }

  async save(keyPair: KeyPair): Promise<void> {
    const fs = await import("fs/promises");
    const path = await import("path");

    // Ensure directory exists
    const dir = path.dirname(this.filePath);
    await fs.mkdir(dir, { recursive: true });

    // Write file with restricted permissions
    await fs.writeFile(this.filePath, JSON.stringify(keyPair, null, 2), {
      mode: 0o600, // Owner read/write only
    });
  }

  async delete(): Promise<void> {
    try {
      const fs = await import("fs/promises");
      await fs.unlink(this.filePath);
    } catch {
      // Ignore if file doesn't exist
    }
  }
}

/**
 * Environment-based key storage.
 * Loads from environment variables, does not save.
 */
export class EnvKeyStorage implements KeyStorage {
  constructor(
    private publicKeyEnv: string = "GATEWAY_PUBLIC_KEY",
    private privateKeyEnv: string = "GATEWAY_PRIVATE_KEY",
  ) {}

  async load(): Promise<KeyPair | null> {
    const publicKey = process.env[this.publicKeyEnv];
    const privateKey = process.env[this.privateKeyEnv];

    if (!publicKey || !privateKey) {
      return null;
    }

    return { publicKey, privateKey };
  }

  async save(keyPair: KeyPair): Promise<void> {
    console.warn(
      `EnvKeyStorage: Cannot save keys. Set ${this.publicKeyEnv} and ${this.privateKeyEnv} manually.`,
    );
    console.log(`Public Key: ${keyPair.publicKey}`);
    console.log(`Private Key: ${keyPair.privateKey}`);
  }

  async delete(): Promise<void> {
    console.warn(
      `EnvKeyStorage: Cannot delete keys. Remove env vars manually.`,
    );
  }
}

// ============================================
// BASE64 UTILITIES
// ============================================

function base64Encode(bytes: Uint8Array): string {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(bytes).toString("base64");
  }
  return btoa(String.fromCharCode(...bytes));
}

function base64Decode(str: string): Uint8Array {
  if (typeof Buffer !== "undefined") {
    return new Uint8Array(Buffer.from(str, "base64"));
  }
  return new Uint8Array(
    atob(str)
      .split("")
      .map((c) => c.charCodeAt(0)),
  );
}
