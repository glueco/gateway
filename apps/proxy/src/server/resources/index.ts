// Resource Plugin Registry
// Register all available plugins here

import {
  registerPlugin,
  getPlugin,
  getPluginByTypeAndProvider,
  getAllPlugins,
  getPluginsByType,
  hasPlugin,
  hasPluginForTypeAndProvider,
  ChatCompletionRequestSchema,
} from "./types";
import groqPlugin from "./llm-groq";
import geminiPlugin from "./llm-gemini";

// Register all plugins
export function initializePlugins(): void {
  registerPlugin(groqPlugin);
  registerPlugin(geminiPlugin);
}

// Initialize on module load
initializePlugins();

// Re-export for convenience
export {
  getPlugin,
  getPluginByTypeAndProvider,
  getAllPlugins,
  getPluginsByType,
  hasPlugin,
  hasPluginForTypeAndProvider,
  ChatCompletionRequestSchema,
};
export type {
  ResourcePlugin,
  ResourceConstraints,
  ValidationResult,
  ExecuteOptions,
  ExecuteResult,
  UsageMetrics,
  MappedError,
  ChatCompletionRequest,
} from "./types";
