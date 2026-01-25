// ============================================
// PLUGIN REGISTRY
// Central registry for all enabled plugins
// ============================================

import { logger } from "@/lib/logger";
import type { PluginContract, PluginMetadata } from "./types";
import { validatePluginMetadata, pluginToDiscoveryEntry } from "./types";

// ============================================
// REGISTRY STATE (Module-level singleton)
// ============================================

const pluginRegistry = new Map<string, PluginContract>();
let registryInitialized = false;

// ============================================
// REGISTRATION
// ============================================

/**
 * Register a plugin in the registry.
 * Validates plugin metadata and prevents duplicates.
 */
export function registerPlugin(plugin: PluginContract): void {
  // Validate plugin metadata
  const validation = validatePluginMetadata(plugin);
  if (!validation.valid) {
    logger.error(`Failed to register plugin: ${validation.error}`, {
      pluginId: (plugin as { id?: string })?.id || "unknown",
    });
    throw new Error(`Invalid plugin: ${validation.error}`);
  }

  // Check for duplicate
  if (pluginRegistry.has(plugin.id)) {
    logger.warn(`Plugin already registered, skipping duplicate: ${plugin.id}`);
    return;
  }

  // Verify ID matches resourceType:provider
  const expectedId = `${plugin.resourceType}:${plugin.provider}`;
  if (plugin.id !== expectedId) {
    throw new Error(
      `Plugin ID mismatch: expected '${expectedId}', got '${plugin.id}'`,
    );
  }

  // Register
  pluginRegistry.set(plugin.id, plugin);
  logger.info(
    `Registered plugin: ${plugin.id} (${plugin.name} v${plugin.version})`,
  );
}

/**
 * Unregister a plugin from the registry.
 */
export function unregisterPlugin(pluginId: string): boolean {
  const removed = pluginRegistry.delete(pluginId);
  if (removed) {
    logger.info(`Unregistered plugin: ${pluginId}`);
  }
  return removed;
}

// ============================================
// LOOKUP
// ============================================

/**
 * Get plugin by resource ID.
 */
export function getPlugin(resourceId: string): PluginContract | undefined {
  return pluginRegistry.get(resourceId);
}

/**
 * Get plugin by resource type and provider.
 */
export function getPluginByTypeAndProvider(
  resourceType: string,
  provider: string,
): PluginContract | undefined {
  const resourceId = `${resourceType}:${provider}`;
  return pluginRegistry.get(resourceId);
}

/**
 * Check if a plugin exists.
 */
export function hasPlugin(resourceId: string): boolean {
  return pluginRegistry.has(resourceId);
}

/**
 * Check if a plugin exists for type and provider.
 */
export function hasPluginForTypeAndProvider(
  resourceType: string,
  provider: string,
): boolean {
  return pluginRegistry.has(`${resourceType}:${provider}`);
}

// ============================================
// LISTING
// ============================================

/**
 * Get all registered plugins.
 */
export function listPlugins(): PluginContract[] {
  return Array.from(pluginRegistry.values());
}

/**
 * Get all registered plugin IDs.
 */
export function listPluginIds(): string[] {
  return Array.from(pluginRegistry.keys());
}

/**
 * Get plugins by resource type.
 */
export function getPluginsByType(resourceType: string): PluginContract[] {
  return listPlugins().filter((p) => p.resourceType === resourceType);
}

/**
 * Get available resource types.
 */
export function getResourceTypes(): string[] {
  const types = new Set<string>();
  for (const plugin of pluginRegistry.values()) {
    types.add(plugin.resourceType);
  }
  return Array.from(types);
}

/**
 * Get providers for a resource type.
 */
export function getProviders(resourceType: string): string[] {
  return getPluginsByType(resourceType).map((p) => p.provider);
}

// ============================================
// DISCOVERY
// ============================================

/**
 * Get discovery entries for all plugins.
 */
export function getDiscoveryEntries(): ReturnType<
  typeof pluginToDiscoveryEntry
>[] {
  return listPlugins().map(pluginToDiscoveryEntry);
}

/**
 * Get plugin count.
 */
export function getPluginCount(): number {
  return pluginRegistry.size;
}

// ============================================
// INITIALIZATION STATE
// ============================================

/**
 * Mark registry as initialized.
 */
export function markInitialized(): void {
  registryInitialized = true;
  logger.info(
    `Plugin registry initialized with ${pluginRegistry.size} plugin(s)`,
  );
}

/**
 * Check if registry is initialized.
 */
export function isInitialized(): boolean {
  return registryInitialized;
}

/**
 * Clear registry (for testing).
 */
export function clearRegistry(): void {
  pluginRegistry.clear();
  registryInitialized = false;
  logger.debug("Plugin registry cleared");
}
