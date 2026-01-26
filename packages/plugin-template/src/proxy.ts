// ============================================
// TEMPLATE PLUGIN PROXY
// Server-side plugin implementation for the gateway
// ============================================
//
// This module is imported by the proxy to handle plugin requests.
// It should NOT be imported by target apps.
//
// IMPORTANT: This entrypoint is for PROXY only.
// - Do NOT import client code here
// - Do NOT use browser-only APIs
// - Keep Node-specific code here
//
// Import path: @glueco/plugin-template/proxy
// ============================================

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

import {
  ActionOneRequestSchema,
  ActionTwoRequestSchema,
  PLUGIN_ID,
  RESOURCE_TYPE,
  PROVIDER,
  VERSION,
  NAME,
  ACTIONS,
  ENFORCEMENT_SUPPORT,
  DEFAULT_API_URL,
} from "./contracts";

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
    id: PLUGIN_ID,
    resourceType: RESOURCE_TYPE,
    provider: PROVIDER,
    version: VERSION,
    name: NAME,
    actions: [...ACTIONS],
    supports: {
      enforcement: [...ENFORCEMENT_SUPPORT],
    },
    // Client contract metadata for SDK-compatible plugins
    // This makes the plugin "SDK-compatible" per the architecture rules
    client: {
      namespace: "template",
      actions: {
        "action.one": {
          description: "Execute action one - example action",
        },
        "action.two": {
          description: "Execute action two - example action",
        },
      },
    },
  }),

  // Optional: Reference to core extractor or custom config
  extractors: {
    "action.one": {
      type: "generic", // Use "openai-compatible", "gemini", or "generic"
    },
    "action.two": {
      type: "generic",
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
        default: DEFAULT_API_URL,
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
    if (!ACTIONS.includes(action as (typeof ACTIONS)[number])) {
      return { valid: false, error: `Unsupported action: ${action}` };
    }

    // Select schema based on action
    const schema =
      action === "action.one" ? ActionOneRequestSchema : ActionTwoRequestSchema;

    // Parse and validate input
    const parsed = schema.safeParse(input);
    if (!parsed.success) {
      return {
        valid: false,
        error: `Invalid request: ${parsed.error.errors.map((e) => e.message).join(", ")}`,
      };
    }

    // TODO: Apply constraints here
    // Example:
    // if (constraints.field1 && parsed.data.field1 !== constraints.field1) {
    //   return { valid: false, error: "field1 constraint violated" };
    // }

    return { valid: true, shapedInput: parsed.data };
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
    const baseUrl = (ctx.config?.baseUrl as string) || DEFAULT_API_URL;

    // Build the request for your provider
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
    const res = response as Record<string, unknown>;

    return {
      // Customize for your provider's response format
      custom: {
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
