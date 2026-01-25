// ============================================
// PLUGIN TYPES (Proxy-local runtime types)
// Re-exports and extends shared plugin contract
// ============================================

// Re-export core plugin types from shared
export type {
  PluginContract,
  PluginAuth,
  PluginSupports,
  PluginUsageMetrics,
  PluginExecuteOptions,
  PluginExecuteResult,
  PluginValidationResult,
  PluginMappedError,
  PluginExecuteContext,
  PluginResourceConstraints,
  PluginMetadata,
  ExtractorDescriptor,
  PluginCredentialSchema,
  CredentialField,
} from "@glueco/shared";

export {
  validatePluginMetadata,
  pluginToDiscoveryEntry,
  createPluginBase,
  DEFAULT_PLUGIN_AUTH,
  DEFAULT_PLUGIN_SUPPORTS,
} from "@glueco/shared";
