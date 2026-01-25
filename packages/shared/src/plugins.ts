import { z } from "zod";

// ============================================
// PLUGIN CONTRACT
// Core types and schemas for resource plugins
// ============================================

/**
 * Plugin authentication configuration.
 */
export const PluginAuthSchema = z.object({
  pop: z.object({
    version: z.number().int().positive(),
  }),
});

export type PluginAuth = z.infer<typeof PluginAuthSchema>;

/**
 * Plugin support configuration.
 * Describes which enforcement knobs the plugin supports.
 */
export const PluginSupportsSchema = z.object({
  enforcement: z.array(z.string()),
});

export type PluginSupports = z.infer<typeof PluginSupportsSchema>;

/**
 * Extractor descriptor - describes how to extract enforceable fields.
 * Can reference a function name (for core extractors) or provide inline config.
 */
export const ExtractorDescriptorSchema = z.object({
  /** Reference to core extractor by name (e.g., "openai-compatible", "gemini") */
  type: z.string().optional(),
  /** Custom extraction config (for future use) */
  config: z.record(z.unknown()).optional(),
});

export type ExtractorDescriptor = z.infer<typeof ExtractorDescriptorSchema>;

/**
 * Credential schema field descriptor.
 * Used for UI generation to collect provider credentials.
 */
export const CredentialFieldSchema = z.object({
  name: z.string(),
  type: z.enum(["string", "secret", "url", "number", "boolean"]),
  label: z.string(),
  description: z.string().optional(),
  required: z.boolean().default(true),
  default: z.unknown().optional(),
});

export type CredentialField = z.infer<typeof CredentialFieldSchema>;

/**
 * Full credential schema for a plugin.
 */
export const PluginCredentialSchemaSchema = z.object({
  fields: z.array(CredentialFieldSchema),
});

export type PluginCredentialSchema = z.infer<
  typeof PluginCredentialSchemaSchema
>;

// ============================================
// PLUGIN EXECUTION TYPES
// ============================================

/**
 * Usage metrics extracted from response.
 */
export interface PluginUsageMetrics {
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  model?: string;
  custom?: Record<string, unknown>;
}

/**
 * Execute options passed to plugin.
 */
export interface PluginExecuteOptions {
  stream: boolean;
  signal?: AbortSignal;
}

/**
 * Execute result from plugin.
 */
export interface PluginExecuteResult {
  /** For non-streaming responses */
  response?: unknown;
  /** For streaming responses */
  stream?: ReadableStream<Uint8Array>;
  /** Response content type */
  contentType: string;
  /** Usage metrics (available for non-streaming) */
  usage?: PluginUsageMetrics;
}

/**
 * Validation result from plugin.
 */
export interface PluginValidationResult {
  valid: boolean;
  error?: string;
  /** Transformed/validated input ready for execution */
  shapedInput?: unknown;
}

/**
 * Mapped error from plugin.
 */
export interface PluginMappedError {
  status: number;
  code: string;
  message: string;
  retryable: boolean;
}

/**
 * Context for plugin execution.
 * Contains resolved credentials and configuration.
 */
export interface PluginExecuteContext {
  /** The resolved API key/secret */
  secret: string;
  /** Additional config (e.g., custom baseUrl) */
  config: Record<string, unknown> | null;
}

/**
 * Resource constraints passed to validation.
 */
export interface PluginResourceConstraints {
  // LLM constraints
  allowedModels?: string[];
  maxOutputTokens?: number;
  maxInputTokens?: number;
  allowStreaming?: boolean;

  // Email constraints
  allowedFromDomains?: string[];
  maxRecipients?: number;
  allowHtml?: boolean;

  // Generic
  maxRequestBodySize?: number;

  // Extensible
  [key: string]: unknown;
}

// ============================================
// PLUGIN CONTRACT INTERFACE
// ============================================

/**
 * Core plugin contract.
 * Every plugin must implement this interface.
 */
export interface PluginContract {
  /**
   * Unique plugin identifier.
   * Format: <resourceType>:<provider>
   * Examples: "llm:groq", "llm:gemini", "mail:resend"
   */
  readonly id: string;

  /**
   * Resource type category.
   * Examples: "llm", "mail", "storage"
   */
  readonly resourceType: string;

  /**
   * Provider name.
   * Examples: "groq", "gemini", "resend", "openai"
   */
  readonly provider: string;

  /**
   * Plugin version string (semver).
   */
  readonly version: string;

  /**
   * Human-readable display name.
   */
  readonly name: string;

  /**
   * Supported actions.
   * Examples: ["chat.completions", "models.list"]
   */
  readonly actions: string[];

  /**
   * Authentication configuration for discovery.
   */
  readonly auth: PluginAuth;

  /**
   * Enforcement support configuration.
   */
  readonly supports: PluginSupports;

  /**
   * Optional extractor descriptors per action.
   * Key = action name, value = extractor descriptor.
   */
  readonly extractors?: Record<string, ExtractorDescriptor>;

  /**
   * Optional credential schema for UI generation.
   */
  readonly credentialSchema?: PluginCredentialSchema;

  /**
   * Validate input and apply constraints.
   * Returns shaped input ready for execution.
   */
  validateAndShape(
    action: string,
    input: unknown,
    constraints: PluginResourceConstraints,
  ): PluginValidationResult;

  /**
   * Execute the resource action.
   */
  execute(
    action: string,
    shapedInput: unknown,
    ctx: PluginExecuteContext,
    options: PluginExecuteOptions,
  ): Promise<PluginExecuteResult>;

  /**
   * Extract usage metrics from response.
   */
  extractUsage(response: unknown): PluginUsageMetrics;

  /**
   * Map provider errors to standardized format.
   */
  mapError(error: unknown): PluginMappedError;
}

// ============================================
// PLUGIN VALIDATION SCHEMA
// ============================================

/**
 * Schema to validate plugin metadata at registration.
 */
export const PluginMetadataSchema = z.object({
  id: z.string().regex(/^[a-z]+:[a-z0-9-]+$/, {
    message: "Plugin ID must be in format: <resourceType>:<provider>",
  }),
  resourceType: z.string().min(1),
  provider: z.string().min(1),
  version: z.string().min(1),
  name: z.string().min(1),
  actions: z.array(z.string()).min(1),
  auth: PluginAuthSchema,
  supports: PluginSupportsSchema,
  extractors: z.record(ExtractorDescriptorSchema).optional(),
  credentialSchema: PluginCredentialSchemaSchema.optional(),
});

export type PluginMetadata = z.infer<typeof PluginMetadataSchema>;

/**
 * Validate plugin object has correct metadata.
 */
export function validatePluginMetadata(plugin: unknown): {
  valid: boolean;
  error?: string;
  metadata?: PluginMetadata;
} {
  if (!plugin || typeof plugin !== "object") {
    return { valid: false, error: "Plugin must be an object" };
  }

  const result = PluginMetadataSchema.safeParse(plugin);
  if (!result.success) {
    return {
      valid: false,
      error: `Invalid plugin metadata: ${result.error.errors.map((e) => e.message).join(", ")}`,
    };
  }

  // Verify ID matches resourceType:provider
  const meta = result.data;
  const expectedId = `${meta.resourceType}:${meta.provider}`;
  if (meta.id !== expectedId) {
    return {
      valid: false,
      error: `Plugin ID '${meta.id}' must match '${expectedId}'`,
    };
  }

  return { valid: true, metadata: meta };
}

// ============================================
// DISCOVERY TYPES (based on plugin registry)
// ============================================

/**
 * Convert plugin to discovery entry format.
 */
export function pluginToDiscoveryEntry(plugin: PluginContract): {
  resourceId: string;
  actions: string[];
  auth: PluginAuth;
  constraints: {
    supports: string[];
  };
} {
  return {
    resourceId: plugin.id,
    actions: plugin.actions,
    auth: plugin.auth,
    constraints: {
      supports: plugin.supports.enforcement,
    },
  };
}

// ============================================
// HELPER TYPES FOR PLUGIN AUTHORS
// ============================================

/**
 * Base plugin options for creating plugins.
 */
export interface CreatePluginOptions {
  id: string;
  resourceType: string;
  provider: string;
  version: string;
  name: string;
  actions: string[];
  auth?: PluginAuth;
  supports?: PluginSupports;
  extractors?: Record<string, ExtractorDescriptor>;
  credentialSchema?: PluginCredentialSchema;
}

/**
 * Default auth configuration.
 */
export const DEFAULT_PLUGIN_AUTH: PluginAuth = {
  pop: { version: 1 },
};

/**
 * Default supports configuration.
 */
export const DEFAULT_PLUGIN_SUPPORTS: PluginSupports = {
  enforcement: [],
};

/**
 * Helper to create plugin with defaults.
 */
export function createPluginBase(options: CreatePluginOptions): {
  id: string;
  resourceType: string;
  provider: string;
  version: string;
  name: string;
  actions: string[];
  auth: PluginAuth;
  supports: PluginSupports;
  extractors?: Record<string, ExtractorDescriptor>;
  credentialSchema?: PluginCredentialSchema;
} {
  return {
    id: options.id,
    resourceType: options.resourceType,
    provider: options.provider,
    version: options.version,
    name: options.name,
    actions: options.actions,
    auth: options.auth ?? DEFAULT_PLUGIN_AUTH,
    supports: options.supports ?? DEFAULT_PLUGIN_SUPPORTS,
    extractors: options.extractors,
    credentialSchema: options.credentialSchema,
  };
}
