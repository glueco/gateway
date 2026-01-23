// ============================================
// @glueco/sdk - PERSONAL RESOURCE GATEWAY SDK
// Thin transport + signing layer
// ============================================

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
export {
  createGatewayFetch,
  createGatewayFetchFromEnv,
  type GatewayFetchOptions,
  type GatewayFetch,
} from "./fetch";
export {
  generateKeyPair,
  sign,
  KeyStorage,
  FileKeyStorage,
  MemoryKeyStorage,
  EnvKeyStorage,
  type KeyPair,
} from "./keys";
export {
  GatewayClient,
  MemoryConfigStorage,
  FileConfigStorage,
  EnvConfigStorage,
  type GatewayClientOptions,
  type ConfigStorage,
  type GatewayConfig,
} from "./client";
