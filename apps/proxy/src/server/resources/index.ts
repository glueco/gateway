// ============================================
// DEPRECATED: Legacy Resource Plugin Registry
// This module is deprecated. Use @/server/plugins instead.
// Keeping for backwards compatibility during migration.
// ============================================

/**
 * @deprecated Use imports from "@/server/plugins" instead.
 * This module will be removed in a future version.
 */

// Re-export from new plugins module for backwards compatibility
export {
  getPlugin,
  getPluginByTypeAndProvider,
  listPlugins as getAllPlugins,
  getPluginsByType,
  hasPlugin,
  hasPluginForTypeAndProvider,
} from "@/server/plugins";

// Re-export types for backwards compatibility
export type {
  PluginContract as ResourcePlugin,
  PluginResourceConstraints as ResourceConstraints,
  PluginValidationResult as ValidationResult,
  PluginExecuteOptions as ExecuteOptions,
  PluginExecuteResult as ExecuteResult,
  PluginUsageMetrics as UsageMetrics,
  PluginMappedError as MappedError,
} from "@/server/plugins";

// Re-export schema from shared
export { ChatCompletionRequestSchema } from "@glueco/shared";
export type { ChatCompletionRequest } from "@glueco/shared";
