// ============================================
// PLUGINS MODULE
// Initializes and exports the plugin registry
// ============================================

import { logger } from "@/lib/logger";
import { ENABLED_PLUGINS } from "./enabled.generated";
import {
  registerPlugin,
  markInitialized,
  isInitialized,
  getPlugin,
  getPluginByTypeAndProvider,
  listPlugins,
  listPluginIds,
  getPluginsByType,
  getResourceTypes,
  getProviders,
  getDiscoveryEntries,
  getPluginCount,
  hasPlugin,
  hasPluginForTypeAndProvider,
} from "./registry";

// ============================================
// INITIALIZATION
// ============================================

/**
 * Initialize the plugin registry with enabled plugins.
 * Safe to call multiple times - will only initialize once.
 */
export function initializePlugins(): void {
  if (isInitialized()) {
    logger.debug("Plugin registry already initialized, skipping");
    return;
  }

  logger.info(
    `Initializing plugin registry with ${ENABLED_PLUGINS.length} plugin(s)...`,
  );

  for (const plugin of ENABLED_PLUGINS) {
    try {
      registerPlugin(plugin);
    } catch (error) {
      logger.error(
        `Failed to register plugin: ${error instanceof Error ? error.message : "unknown error"}`,
        {
          pluginId: plugin?.id || "unknown",
        },
      );
      // Continue registering other plugins
    }
  }

  markInitialized();
}

// Auto-initialize on module load
initializePlugins();

// ============================================
// EXPORTS
// ============================================

// Re-export registry functions
export {
  getPlugin,
  getPluginByTypeAndProvider,
  listPlugins,
  listPluginIds,
  getPluginsByType,
  getResourceTypes,
  getProviders,
  getDiscoveryEntries,
  getPluginCount,
  hasPlugin,
  hasPluginForTypeAndProvider,
  isInitialized,
};

// Re-export types
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
} from "./types";
