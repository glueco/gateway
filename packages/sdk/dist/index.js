'use strict';

var sha256 = require('@noble/hashes/sha256');
var shared = require('@glueco/shared');
var ed = require('@noble/ed25519');
var sha512 = require('@noble/hashes/sha512');

function _interopNamespace(e) {
  if (e && e.__esModule) return e;
  var n = Object.create(null);
  if (e) {
    Object.keys(e).forEach(function (k) {
      if (k !== 'default') {
        var d = Object.getOwnPropertyDescriptor(e, k);
        Object.defineProperty(n, k, d.get ? d : {
          enumerable: true,
          get: function () { return e[k]; }
        });
      }
    });
  }
  n.default = e;
  return Object.freeze(n);
}

var ed__namespace = /*#__PURE__*/_interopNamespace(ed);

var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined") return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});
ed__namespace.etc.sha512Sync = (...m) => sha512.sha512(ed__namespace.etc.concatBytes(...m));
async function generateKeyPair() {
  const privateKeyBytes = ed__namespace.utils.randomPrivateKey();
  const publicKeyBytes = await ed__namespace.getPublicKeyAsync(privateKeyBytes);
  return {
    publicKey: base64Encode(publicKeyBytes),
    privateKey: base64Encode(privateKeyBytes)
  };
}
async function sign(privateKeyBase64, message) {
  const privateKey = base64Decode(privateKeyBase64);
  const signature = await ed__namespace.signAsync(message, privateKey);
  return base64Encode(signature);
}
var MemoryKeyStorage = class {
  constructor() {
    this.keyPair = null;
  }
  async load() {
    return this.keyPair;
  }
  async save(keyPair) {
    this.keyPair = keyPair;
  }
  async delete() {
    this.keyPair = null;
  }
};
var FileKeyStorage = class {
  constructor(filePath) {
    this.filePath = filePath;
  }
  async load() {
    try {
      const fs = await import('fs/promises');
      const content = await fs.readFile(this.filePath, "utf-8");
      return JSON.parse(content);
    } catch {
      return null;
    }
  }
  async save(keyPair) {
    const fs = await import('fs/promises');
    const path = await import('path');
    const dir = path.dirname(this.filePath);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(this.filePath, JSON.stringify(keyPair, null, 2), {
      mode: 384
      // Owner read/write only
    });
  }
  async delete() {
    try {
      const fs = await import('fs/promises');
      await fs.unlink(this.filePath);
    } catch {
    }
  }
};
var EnvKeyStorage = class {
  constructor(publicKeyEnv = "GATEWAY_PUBLIC_KEY", privateKeyEnv = "GATEWAY_PRIVATE_KEY") {
    this.publicKeyEnv = publicKeyEnv;
    this.privateKeyEnv = privateKeyEnv;
  }
  async load() {
    const publicKey = process.env[this.publicKeyEnv];
    const privateKey = process.env[this.privateKeyEnv];
    if (!publicKey || !privateKey) {
      return null;
    }
    return { publicKey, privateKey };
  }
  async save(keyPair) {
    console.warn(
      `EnvKeyStorage: Cannot save keys. Set ${this.publicKeyEnv} and ${this.privateKeyEnv} manually.`
    );
    console.log(`Public Key: ${keyPair.publicKey}`);
    console.log(`Private Key: ${keyPair.privateKey}`);
  }
  async delete() {
    console.warn(
      `EnvKeyStorage: Cannot delete keys. Remove env vars manually.`
    );
  }
};
function base64Encode(bytes) {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(bytes).toString("base64");
  }
  return btoa(String.fromCharCode(...bytes));
}
function base64Decode(str) {
  if (typeof Buffer !== "undefined") {
    return new Uint8Array(Buffer.from(str, "base64"));
  }
  return new Uint8Array(
    atob(str).split("").map((c) => c.charCodeAt(0))
  );
}
var GatewayError = class extends Error {
  constructor(code, message, status, options) {
    super(message);
    this.name = "GatewayError";
    this.code = code;
    this.status = status;
    this.requestId = options?.requestId;
    this.details = options?.details;
  }
  /**
   * Check if this error matches a specific error code.
   */
  is(code) {
    return this.code === code;
  }
  /**
   * Convert to a plain object for logging/serialization.
   */
  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      status: this.status,
      ...this.requestId && { requestId: this.requestId },
      ...this.details !== void 0 && { details: this.details }
    };
  }
};
function parseGatewayError(body, status) {
  const parsed = shared.GatewayErrorResponseSchema.safeParse(body);
  if (!parsed.success) {
    return null;
  }
  const { error } = parsed.data;
  return new GatewayError(error.code, error.message, status, {
    requestId: error.requestId,
    details: error.details
  });
}
function isGatewayError(error) {
  return error instanceof GatewayError;
}

// src/fetch.ts
function createGatewayFetch(options) {
  const { appId, proxyUrl, keyPair, baseFetch, throwOnError = false } = options;
  const fetchFn = resolveFetch(baseFetch);
  return async (input, init) => {
    const proxyUrlObj = new URL(proxyUrl);
    let url;
    if (typeof input === "string") {
      url = new URL(input, proxyUrlObj);
    } else if (input instanceof URL) {
      url = input;
    } else {
      url = new URL(input.url, proxyUrlObj);
    }
    const method = init?.method || "GET";
    let bodyBytes;
    if (init?.body) {
      if (typeof init.body === "string") {
        bodyBytes = new TextEncoder().encode(init.body);
      } else if (init.body instanceof ArrayBuffer) {
        bodyBytes = new Uint8Array(init.body);
      } else if (init.body instanceof Uint8Array) {
        bodyBytes = init.body;
      } else {
        bodyBytes = new TextEncoder().encode(String(init.body));
      }
    } else {
      bodyBytes = new Uint8Array(0);
    }
    const timestamp = Math.floor(Date.now() / 1e3).toString();
    const nonce = generateNonce();
    const bodyHash = base64UrlEncode(sha256.sha256(bodyBytes));
    const pathWithQuery = shared.getPathWithQuery(url);
    const canonicalPayload = shared.buildCanonicalRequestV1({
      method: method.toUpperCase(),
      pathWithQuery,
      appId,
      ts: timestamp,
      nonce,
      bodyHash
    });
    const signature = await sign(
      keyPair.privateKey,
      new TextEncoder().encode(canonicalPayload)
    );
    const headers = new Headers(init?.headers);
    headers.set("x-pop-v", shared.POP_VERSION);
    headers.set("x-app-id", appId);
    headers.set("x-ts", timestamp);
    headers.set("x-nonce", nonce);
    headers.set("x-sig", signature);
    const targetUrl = new URL(url.pathname + url.search, proxyUrlObj);
    const response = await fetchFn(targetUrl.toString(), {
      ...init,
      headers
    });
    if (throwOnError && !response.ok) {
      const body = await response.clone().json().catch(() => ({}));
      const gatewayError = parseGatewayError(body, response.status);
      if (gatewayError) {
        throw gatewayError;
      }
      throw new Error(
        `Gateway request failed: ${response.status} ${response.statusText}`
      );
    }
    return response;
  };
}
function createGatewayFetchFromEnv(options) {
  const appId = process.env.GATEWAY_APP_ID;
  const proxyUrl = process.env.GATEWAY_PROXY_URL;
  const publicKey = process.env.GATEWAY_PUBLIC_KEY;
  const privateKey = process.env.GATEWAY_PRIVATE_KEY;
  if (!appId || !proxyUrl || !publicKey || !privateKey) {
    throw new Error(
      "Missing required environment variables: GATEWAY_APP_ID, GATEWAY_PROXY_URL, GATEWAY_PUBLIC_KEY, GATEWAY_PRIVATE_KEY"
    );
  }
  return createGatewayFetch({
    appId,
    proxyUrl,
    keyPair: { publicKey, privateKey },
    ...options
  });
}
function resolveFetch(customFetch) {
  if (customFetch) {
    return customFetch;
  }
  if (typeof globalThis.fetch !== "undefined") {
    return globalThis.fetch;
  }
  if (typeof window !== "undefined" && typeof window.fetch !== "undefined") {
    return window.fetch;
  }
  throw new Error(
    "No fetch implementation available. Please provide a fetch function via options or ensure global fetch is available."
  );
}
function generateNonce() {
  const bytes = new Uint8Array(16);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    const nodeCrypto = __require("crypto");
    const randomBytes = nodeCrypto.randomBytes(16);
    bytes.set(randomBytes);
  }
  return base64UrlEncode(bytes);
}
function base64UrlEncode(bytes) {
  let base64;
  if (typeof Buffer !== "undefined") {
    base64 = Buffer.from(bytes).toString("base64");
  } else {
    base64 = btoa(String.fromCharCode(...bytes));
  }
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

// src/pairing.ts
function parsePairingString(pairingString) {
  const trimmed = pairingString.trim();
  if (!trimmed.startsWith("pair::")) {
    throw new Error('Invalid pairing string: must start with "pair::"');
  }
  const parts = trimmed.split("::");
  if (parts.length !== 3) {
    throw new Error(
      "Invalid pairing string format. Expected: pair::<proxy_url>::<connect_code>"
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
    connectCode
  };
}
function createPairingString(proxyUrl, connectCode) {
  return `pair::${proxyUrl}::${connectCode}`;
}
async function connect(options) {
  const fetchFn = resolveFetch(options.fetch);
  const { proxyUrl, connectCode } = parsePairingString(options.pairingString);
  const keyPair = options.keyPair || await generateKeyPair();
  if (options.keyStorage) {
    await options.keyStorage.save(keyPair);
  }
  const requestPayload = {
    connectCode,
    app: {
      name: options.app.name,
      description: options.app.description,
      homepage: options.app.homepage
    },
    publicKey: keyPair.publicKey,
    requestedPermissions: options.requestedPermissions,
    redirectUri: options.redirectUri
  };
  const validation = shared.InstallRequestSchema.safeParse(requestPayload);
  if (!validation.success) {
    throw new ConnectError(
      `Invalid connect payload: ${validation.error.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join(", ")}`,
      400
    );
  }
  const response = await fetchFn(`${proxyUrl}/api/connect/prepare`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(requestPayload)
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const gatewayError = parseGatewayError(body, response.status);
    if (gatewayError) {
      throw gatewayError;
    }
    throw new ConnectError(
      body.error || "Failed to prepare connection",
      response.status
    );
  }
  const data = await response.json();
  return {
    approvalUrl: data.approvalUrl,
    sessionToken: data.sessionToken,
    expiresAt: new Date(data.expiresAt),
    proxyUrl,
    keyPair
  };
}
function handleCallback(params) {
  const status = params.get("status");
  const appId = params.get("app_id");
  if (status === "approved" && appId) {
    return { approved: true, appId };
  }
  return { approved: false };
}
var ConnectError = class extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.name = "ConnectError";
  }
};

// src/client.ts
var GatewayClient = class {
  constructor(options = {}) {
    this.keyPair = null;
    this.config = null;
    this.gatewayFetch = null;
    this.keyStorage = options.keyStorage || new MemoryKeyStorage();
    this.configStorage = options.configStorage || new MemoryConfigStorage();
    this.fetchFn = resolveFetch(options.fetch);
    this.throwOnError = options.throwOnError ?? false;
  }
  /**
   * Check if the client is connected and has valid credentials.
   * Returns true only if we have keys AND a config with a valid appId.
   */
  async isConnected() {
    await this.loadState();
    return !!(this.keyPair && this.config && this.config.appId);
  }
  /**
   * Check if a connection flow is pending (connect() was called but callback not yet received).
   * Useful for handling page refreshes during the approval flow.
   */
  async isPendingApproval() {
    await this.loadState();
    return !!(this.keyPair && this.config && !this.config.appId);
  }
  /**
   * Initiate the connection flow.
   * Returns the approval URL to redirect the user to.
   */
  async connect(options) {
    const result = await connect({
      ...options,
      keyStorage: this.keyStorage,
      fetch: this.fetchFn
    });
    this.keyPair = result.keyPair;
    this.config = {
      appId: "",
      // Will be set after callback
      proxyUrl: result.proxyUrl
    };
    await this.configStorage.save(this.config);
    return result;
  }
  /**
   * Handle the callback after user approval.
   * This loads the stored config (saved during connect()) and updates it with the appId.
   */
  async handleCallback(params) {
    const result = handleCallback(params);
    if (result.approved && result.appId) {
      await this.loadState();
      if (!this.config) {
        throw new Error(
          "No config found. Make sure connect() was called before handleCallback(). The config should have been persisted during the connect flow."
        );
      }
      this.config = {
        ...this.config,
        appId: result.appId
      };
      await this.configStorage.save(this.config);
      this.gatewayFetch = null;
    }
    return result;
  }
  /**
   * Get the PoP-enabled fetch function.
   * Use this with vendor SDKs.
   */
  async getFetch() {
    if (this.gatewayFetch) {
      return this.gatewayFetch;
    }
    await this.loadState();
    if (!this.keyPair || !this.config || !this.config.appId) {
      throw new Error("Client not connected. Call connect() first.");
    }
    this.gatewayFetch = createGatewayFetch({
      appId: this.config.appId,
      proxyUrl: this.config.proxyUrl,
      keyPair: this.keyPair,
      baseFetch: this.fetchFn,
      throwOnError: this.throwOnError
    });
    return this.gatewayFetch;
  }
  /**
   * Get the proxy URL for configuring SDK baseURL.
   */
  async getProxyUrl() {
    await this.loadState();
    if (!this.config || !this.config.proxyUrl) {
      throw new Error("Client not connected. Call connect() first.");
    }
    return this.config.proxyUrl;
  }
  /**
   * Get a resource-scoped base URL.
   * Use this with OpenAI SDK baseURL.
   *
   * @example
   * const baseURL = await client.getResourceBaseUrl('llm', 'groq');
   * // Returns: https://gateway.example.com/r/llm/groq
   */
  async getResourceBaseUrl(resourceType, provider) {
    const proxyUrl = await this.getProxyUrl();
    return `${proxyUrl}/r/${resourceType}/${provider}`;
  }
  /**
   * Get the app ID.
   */
  async getAppId() {
    await this.loadState();
    if (!this.config || !this.config.appId) {
      throw new Error("Client not connected. Call connect() first.");
    }
    return this.config.appId;
  }
  /**
   * Disconnect and clear all stored credentials.
   */
  async disconnect() {
    await this.keyStorage.delete();
    await this.configStorage.delete();
    this.keyPair = null;
    this.config = null;
    this.gatewayFetch = null;
  }
  /**
   * Load state from storage.
   */
  async loadState() {
    if (!this.keyPair) {
      this.keyPair = await this.keyStorage.load();
    }
    if (!this.config) {
      this.config = await this.configStorage.load();
    }
  }
};
var MemoryConfigStorage = class {
  constructor() {
    this.config = null;
  }
  async load() {
    return this.config;
  }
  async save(config) {
    this.config = config;
  }
  async delete() {
    this.config = null;
  }
};
var FileConfigStorage = class {
  constructor(filePath) {
    this.filePath = filePath;
  }
  async load() {
    try {
      const fs = await import('fs/promises');
      const content = await fs.readFile(this.filePath, "utf-8");
      return JSON.parse(content);
    } catch {
      return null;
    }
  }
  async save(config) {
    const fs = await import('fs/promises');
    const path = await import('path');
    const dir = path.dirname(this.filePath);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(this.filePath, JSON.stringify(config, null, 2));
  }
  async delete() {
    try {
      const fs = await import('fs/promises');
      await fs.unlink(this.filePath);
    } catch {
    }
  }
};
var EnvConfigStorage = class {
  constructor(appIdEnv = "GATEWAY_APP_ID", proxyUrlEnv = "GATEWAY_PROXY_URL") {
    this.appIdEnv = appIdEnv;
    this.proxyUrlEnv = proxyUrlEnv;
  }
  async load() {
    const appId = process.env[this.appIdEnv];
    const proxyUrl = process.env[this.proxyUrlEnv];
    if (!appId || !proxyUrl) {
      return null;
    }
    return { appId, proxyUrl };
  }
  async save(config) {
    console.warn(
      `EnvConfigStorage: Cannot save config. Set ${this.appIdEnv} and ${this.proxyUrlEnv} manually.`
    );
    console.log(`App ID: ${config.appId}`);
    console.log(`Proxy URL: ${config.proxyUrl}`);
  }
  async delete() {
    console.warn(
      `EnvConfigStorage: Cannot delete config. Remove env vars manually.`
    );
  }
};

exports.ConnectError = ConnectError;
exports.EnvConfigStorage = EnvConfigStorage;
exports.EnvKeyStorage = EnvKeyStorage;
exports.FileConfigStorage = FileConfigStorage;
exports.FileKeyStorage = FileKeyStorage;
exports.GatewayClient = GatewayClient;
exports.GatewayError = GatewayError;
exports.MemoryConfigStorage = MemoryConfigStorage;
exports.MemoryKeyStorage = MemoryKeyStorage;
exports.connect = connect;
exports.createGatewayFetch = createGatewayFetch;
exports.createGatewayFetchFromEnv = createGatewayFetchFromEnv;
exports.createPairingString = createPairingString;
exports.generateKeyPair = generateKeyPair;
exports.handleCallback = handleCallback;
exports.isGatewayError = isGatewayError;
exports.parseGatewayError = parseGatewayError;
exports.parsePairingString = parsePairingString;
exports.resolveFetch = resolveFetch;
exports.sign = sign;
//# sourceMappingURL=index.js.map
//# sourceMappingURL=index.js.map