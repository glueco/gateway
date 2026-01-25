/**
 * Plugin Template
 *
 * Copy this package and customize it to create your own plugin.
 *
 * Steps to create a new plugin:
 * 1. Copy this entire directory: packages/plugin-template -> packages/plugin-<resourceType>-<provider>
 * 2. Update package.json with your plugin name and description
 * 3. Customize this file with your provider's API logic
 * 4. Build: npm run build
 * 5. Add to proxy.plugins.ts
 */

import type {
  PluginContract,
  PluginResourceConstraints,
  PluginValidationResult,
  PluginExecuteContext,
  PluginExecuteOptions,
  PluginExecuteResult,
  PluginUsageMetrics,
  PluginMappedError,
} from "@glueco/shared";
import { createPluginBase } from "@glueco/shared";

// ============================================
// CONFIGURATION
// Customize these for your provider
// ============================================

/** The upstream API base URL */
const API_BASE_URL = "https://api.example.com/v1";

/** Resource type: "llm", "mail", "storage", etc. */
const RESOURCE_TYPE = "example";

/** Provider name: "example", "provider-name", etc. */
const PROVIDER = "template";

/** Plugin version (semver) */
const VERSION = "1.0.0";

/** Human-readable name */
const NAME = "Example Template Plugin";

/** Supported actions */
const ACTIONS = ["action.one", "action.two"];

/** Supported enforcement knobs */
const ENFORCEMENT_SUPPORT = ["field1", "field2"];

// ============================================
// ERROR HANDLING
// ============================================

class ProviderApiError extends Error {
  constructor(
    public status: number,
    public body: string,
  ) {
    super(`Provider API error: ${status}`);
    this.name = "ProviderApiError";
  }
}

function mapProviderError(error: ProviderApiError): PluginMappedError {
  const message = error.body;

  switch (error.status) {
    case 400:
      return { status: 400, code: "BAD_REQUEST", message, retryable: false };
    case 401:
      return {
        status: 401,
        code: "UNAUTHORIZED",
        message: "Invalid API key",
        retryable: false,
      };
    case 403:
      return { status: 403, code: "FORBIDDEN", message, retryable: false };
    case 404:
      return { status: 404, code: "NOT_FOUND", message, retryable: false };
    case 429:
      return { status: 429, code: "RATE_LIMITED", message, retryable: true };
    case 500:
    case 502:
    case 503:
      return {
        status: error.status,
        code: "PROVIDER_ERROR",
        message,
        retryable: true,
      };
    default:
      return {
        status: error.status,
        code: "UNKNOWN",
        message,
        retryable: false,
      };
  }
}

// ============================================
// PLUGIN IMPLEMENTATION
// ============================================

const templatePlugin: PluginContract = {
  // Use createPluginBase for defaults
  ...createPluginBase({
    id: `${RESOURCE_TYPE}:${PROVIDER}`,
    resourceType: RESOURCE_TYPE,
    provider: PROVIDER,
    version: VERSION,
    name: NAME,
    actions: ACTIONS,
    supports: {
      enforcement: ENFORCEMENT_SUPPORT,
    },
  }),

  // Optional: Reference to core extractor or custom config
  extractors: {
    "action.one": {
      type: "generic", // Use "openai-compatible", "gemini", or "generic"
    },
  },

  // Optional: Credential schema for admin UI
  credentialSchema: {
    fields: [
      {
        name: "apiKey",
        type: "secret",
        label: "API Key",
        description: "Your provider API key",
        required: true,
      },
      {
        name: "baseUrl",
        type: "url",
        label: "Base URL",
        description: "Custom API base URL (optional)",
        required: false,
        default: API_BASE_URL,
      },
    ],
  },

  /**
   * Validate input and apply constraints.
   * This is called before execute() to ensure the request is valid.
   */
  validateAndShape(
    action: string,
    input: unknown,
    constraints: PluginResourceConstraints,
  ): PluginValidationResult {
    // Check if action is supported
    if (!ACTIONS.includes(action)) {
      return { valid: false, error: `Unsupported action: ${action}` };
    }

    // TODO: Add your validation logic here
    // Example:
    // - Parse and validate input structure
    // - Check against constraints (e.g., allowedModels, maxTokens)
    // - Shape the input for execution

    // For now, just pass through
    return { valid: true, shapedInput: input };
  },

  /**
   * Execute the action against the upstream provider.
   * This is where you make the actual API call.
   */
  async execute(
    action: string,
    shapedInput: unknown,
    ctx: PluginExecuteContext,
    options: PluginExecuteOptions,
  ): Promise<PluginExecuteResult> {
    const baseUrl = (ctx.config?.baseUrl as string) || API_BASE_URL;

    // TODO: Build the request for your provider
    // This is a minimal example - customize for your API

    const endpoint = `${baseUrl}/${action.replace(".", "/")}`;

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${ctx.secret}`,
      },
      body: JSON.stringify(shapedInput),
      signal: options.signal,
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new ProviderApiError(response.status, errorBody);
    }

    // Handle streaming if supported
    if (options.stream && response.body) {
      return {
        stream: response.body,
        contentType: "text/event-stream",
      };
    }

    // Non-streaming response
    const json = await response.json();
    return {
      response: json,
      contentType: "application/json",
      usage: this.extractUsage(json),
    };
  },

  /**
   * Extract usage metrics from the response.
   * Used for auditing and budget tracking.
   */
  extractUsage(response: unknown): PluginUsageMetrics {
    // TODO: Customize for your provider's response format
    const res = response as Record<string, unknown>;

    return {
      // Example for LLM-like providers:
      // inputTokens: res.usage?.prompt_tokens,
      // outputTokens: res.usage?.completion_tokens,
      // totalTokens: res.usage?.total_tokens,
      // model: res.model,
      custom: {
        // Add any custom metrics here
        rawUsage: res.usage,
      },
    };
  },

  /**
   * Map provider-specific errors to standardized format.
   */
  mapError(error: unknown): PluginMappedError {
    if (error instanceof ProviderApiError) {
      return mapProviderError(error);
    }

    return {
      status: 500,
      code: "INTERNAL_ERROR",
      message: error instanceof Error ? error.message : "Unknown error",
      retryable: false,
    };
  },
};

// Export as default (required for plugin loading)
export default templatePlugin;

// Also export named for flexibility
export { templatePlugin };
