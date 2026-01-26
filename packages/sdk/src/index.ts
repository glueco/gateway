// ============================================
// @glueco/sdk - PERSONAL RESOURCE GATEWAY SDK
// Thin transport + signing layer
// ============================================

// Transport interface for plugin clients
// This is the primary interface plugins should depend on
export {
  type GatewayTransport,
  type GatewayRequestOptions,
  type GatewayResponse,
  type GatewayStreamResponse,
  type PluginClientFactory,
  type PluginClient,
} from "./transport";

// Core transport
export {
  createGatewayFetch,
  createGatewayFetchFromEnv,
  resolveFetch,
  type GatewayFetchOptions,
  type GatewayFetch,
} from "./fetch";

// Connect/pairing flow
export {
  parsePairingString,
  createPairingString,
  type PairingInfo,
} from "./pairing";
export {
  connect,
  handleCallback,
  ConnectError,
  type ConnectOptions,
  type ConnectResult,
} from "./connect";

// Errors
export { GatewayError, parseGatewayError, isGatewayError } from "./errors";

// Keys
export {
  generateKeyPair,
  sign,
  KeyStorage,
  FileKeyStorage,
  MemoryKeyStorage,
  EnvKeyStorage,
  type KeyPair,
} from "./keys";

// High-level client
export {
  GatewayClient,
  MemoryConfigStorage,
  FileConfigStorage,
  EnvConfigStorage,
  type GatewayClientOptions,
  type ConfigStorage,
  type GatewayConfig,
} from "./client";
