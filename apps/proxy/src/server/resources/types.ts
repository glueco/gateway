import { z } from "zod";
import {
  ChatCompletionRequestSchema,
  type ChatCompletionRequest,
  type ResourceConstraints,
} from "@glueco/shared";

// ============================================
// RESOURCE PLUGIN INTERFACE
// Every resource plugin must implement this
// ============================================

/**
 * Result of constraint validation.
 */
export interface ValidationResult {
  valid: boolean;
  error?: string;
  shapedInput?: unknown; // Transformed/validated input
}

/**
 * Usage metrics extracted from response.
 */
export interface UsageMetrics {
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  model?: string;
  custom?: Record<string, unknown>;
}

/**
 * Execute options.
 */
export interface ExecuteOptions {
  stream: boolean;
  signal?: AbortSignal;
}

/**
 * Execute result.
 */
export interface ExecuteResult {
  // For non-streaming
  response?: unknown;

  // For streaming
  stream?: ReadableStream<Uint8Array>;

  // Content type
  contentType: string;

  // Usage (available after completion for non-streaming)
  usage?: UsageMetrics;
}

/**
 * Mapped error.
 */
export interface MappedError {
  status: number;
  code: string;
  message: string;
  retryable: boolean;
}

/**
 * Resource plugin interface.
 * Every resource type must implement this.
 */
export interface ResourcePlugin {
  /**
   * Resource identifier (e.g., "llm:groq", "mail:resend")
   */
  readonly resourceId: string;

  /**
   * Resource type category (e.g., "llm", "mail")
   */
  readonly resourceType: string;

  /**
   * Provider name (e.g., "groq", "gemini", "resend")
   */
  readonly provider: string;

  /**
   * Human-readable name
   */
  readonly name: string;

  /**
   * Supported actions
   */
  readonly supportedActions: string[];

  /**
   * Validate input and apply constraints.
   * Returns shaped input ready for execution.
   */
  validateAndShape(
    action: string,
    input: unknown,
    constraints: ResourceConstraints,
  ): ValidationResult;

  /**
   * Execute the resource action.
   */
  execute(
    action: string,
    shapedInput: unknown,
    secret: string,
    config: Record<string, unknown> | null,
    options: ExecuteOptions,
  ): Promise<ExecuteResult>;

  /**
   * Extract usage metrics from response.
   */
  extractUsage(response: unknown): UsageMetrics;

  /**
   * Map errors to standardized format.
   */
  mapError(error: unknown): MappedError;
}

// ============================================
// PLUGIN REGISTRY
// ============================================

const plugins = new Map<string, ResourcePlugin>();

export function registerPlugin(plugin: ResourcePlugin): void {
  // Validate resourceId matches resourceType:provider format
  const expectedId = `${plugin.resourceType}:${plugin.provider}`;
  if (plugin.resourceId !== expectedId) {
    throw new Error(
      `Plugin resourceId mismatch: expected '${expectedId}', got '${plugin.resourceId}'`,
    );
  }
  plugins.set(plugin.resourceId, plugin);
}

export function getPlugin(resourceId: string): ResourcePlugin | undefined {
  return plugins.get(resourceId);
}

export function getPluginByTypeAndProvider(
  resourceType: string,
  provider: string,
): ResourcePlugin | undefined {
  const resourceId = `${resourceType}:${provider}`;
  return plugins.get(resourceId);
}

export function getAllPlugins(): ResourcePlugin[] {
  return Array.from(plugins.values());
}

export function getPluginsByType(type: string): ResourcePlugin[] {
  return getAllPlugins().filter((p) => p.resourceType === type);
}

export function hasPlugin(resourceId: string): boolean {
  return plugins.has(resourceId);
}

export function hasPluginForTypeAndProvider(
  resourceType: string,
  provider: string,
): boolean {
  return plugins.has(`${resourceType}:${provider}`);
}

// Re-export shared types
export { ChatCompletionRequestSchema, ResourceConstraints };
export type { ChatCompletionRequest };
