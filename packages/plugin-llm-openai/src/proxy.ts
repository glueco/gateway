// ============================================
// OPENAI PLUGIN PROXY
// Server-side plugin implementation for the gateway
// ============================================
//
// This module is imported by the proxy to handle OpenAI requests.
// It should NOT be imported by target apps.
//
// Import path: @glueco/plugin-llm-openai/proxy
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
  EnforcementFields,
} from "@glueco/shared";
import { createPluginBase } from "@glueco/shared";

import {
  ChatCompletionRequestSchema,
  type ChatCompletionRequest,
  PLUGIN_ID,
  RESOURCE_TYPE,
  PROVIDER,
  VERSION,
  DEFAULT_OPENAI_MODELS,
  ACTIONS,
  ENFORCEMENT_SUPPORT,
  DEFAULT_API_URL,
} from "./contracts";

// ============================================
// ERROR HANDLING
// ============================================

class OpenAIApiError extends Error {
  constructor(
    public status: number,
    public body: string,
  ) {
    super(`OpenAI API error: ${status}`);
    this.name = "OpenAIApiError";
  }
}

function mapOpenAIError(error: OpenAIApiError): PluginMappedError {
  let parsed: { error?: { message?: string; type?: string; code?: string } } =
    {};
  try {
    parsed = JSON.parse(error.body);
  } catch {
    // Ignore parse errors
  }

  const message = parsed.error?.message || error.body;
  const code = parsed.error?.code;

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
      // OpenAI distinguishes between rate limits and quota exceeded
      if (code === "insufficient_quota") {
        return {
          status: 429,
          code: "QUOTA_EXCEEDED",
          message: "API quota exceeded",
          retryable: false,
        };
      }
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

const openaiPlugin: PluginContract = {
  ...createPluginBase({
    id: PLUGIN_ID,
    resourceType: RESOURCE_TYPE,
    provider: PROVIDER,
    version: VERSION,
    name: "OpenAI LLM",
    actions: [...ACTIONS],
    supports: {
      enforcement: [...ENFORCEMENT_SUPPORT],
    },
    // Client contract metadata for SDK-compatible plugins
    client: {
      namespace: "openai",
      actions: {
        "chat.completions": {
          description: "Generate chat completions using OpenAI GPT models",
        },
      },
    },
  }),

  // Credential schema for UI
  credentialSchema: {
    fields: [
      {
        name: "apiKey",
        type: "secret",
        label: "API Key",
        description: "Your OpenAI API key (starts with sk-)",
        required: true,
      },
      {
        name: "organization",
        type: "string",
        label: "Organization ID",
        description: "Optional OpenAI organization ID",
        required: false,
      },
      {
        name: "baseUrl",
        type: "url",
        label: "Base URL",
        description:
          "Custom API base URL (optional, for Azure OpenAI or proxies)",
        required: false,
        default: DEFAULT_API_URL,
      },
    ],
  },

  validateAndShape(
    action: string,
    input: unknown,
    constraints: PluginResourceConstraints,
  ): PluginValidationResult {
    if (action !== "chat.completions") {
      return { valid: false, error: `Unsupported action: ${action}` };
    }

    // Parse input - this is the schema-first validation
    const parsed = ChatCompletionRequestSchema.safeParse(input);
    if (!parsed.success) {
      return {
        valid: false,
        error: `Invalid request: ${parsed.error.errors.map((e) => e.message).join(", ")}`,
      };
    }

    const request = parsed.data;

    // Build enforcement fields from validated request
    // These are extracted DURING validation, not after
    const enforcement: EnforcementFields = {
      model: request.model,
      stream: request.stream ?? false,
      usesTools: Array.isArray(request.tools) && request.tools.length > 0,
      maxOutputTokens: request.max_tokens ?? request.max_completion_tokens,
    };

    // Check allowed models
    const allowedModels = constraints.allowedModels ?? [
      ...DEFAULT_OPENAI_MODELS,
    ];
    if (!allowedModels.includes(request.model)) {
      return {
        valid: false,
        error: `Model '${request.model}' not allowed. Allowed: ${allowedModels.join(", ")}`,
      };
    }

    // Enforce max tokens
    const maxTokens = constraints.maxOutputTokens ?? 16384;
    const requestedTokens = request.max_tokens ?? request.max_completion_tokens;

    if (requestedTokens && requestedTokens > maxTokens) {
      return {
        valid: false,
        error: `max_tokens (${requestedTokens}) exceeds limit (${maxTokens})`,
      };
    }

    // Check streaming permission
    if (request.stream && constraints.allowStreaming === false) {
      return {
        valid: false,
        error: "Streaming is not allowed for this app",
      };
    }

    // Shape the request (apply defaults, caps)
    const shapedRequest: ChatCompletionRequest = {
      ...request,
      max_tokens: requestedTokens
        ? Math.min(requestedTokens, maxTokens)
        : undefined, // OpenAI doesn't require max_tokens
    };

    return { valid: true, shapedInput: shapedRequest, enforcement };
  },

  async execute(
    action: string,
    shapedInput: unknown,
    ctx: PluginExecuteContext,
    options: PluginExecuteOptions,
  ): Promise<PluginExecuteResult> {
    const request = shapedInput as ChatCompletionRequest;
    const baseUrl = (ctx.config?.baseUrl as string) || DEFAULT_API_URL;
    const organization = ctx.config?.organization as string | undefined;

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${ctx.secret}`,
    };

    // Add organization header if provided
    if (organization) {
      headers["OpenAI-Organization"] = organization;
    }

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers,
      body: JSON.stringify(request),
      signal: options.signal,
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new OpenAIApiError(response.status, errorBody);
    }

    if (request.stream) {
      // Return streaming response
      return {
        stream: response.body!,
        contentType: "text/event-stream",
      };
    } else {
      // Return JSON response
      const json = await response.json();
      return {
        response: json,
        contentType: "application/json",
        usage: this.extractUsage(json),
      };
    }
  },

  extractUsage(response: unknown): PluginUsageMetrics {
    const res = response as {
      usage?: {
        prompt_tokens?: number;
        completion_tokens?: number;
        total_tokens?: number;
      };
      model?: string;
    };

    return {
      inputTokens: res.usage?.prompt_tokens,
      outputTokens: res.usage?.completion_tokens,
      totalTokens: res.usage?.total_tokens,
      model: res.model,
    };
  },

  mapError(error: unknown): PluginMappedError {
    if (error instanceof OpenAIApiError) {
      return mapOpenAIError(error);
    }

    return {
      status: 500,
      code: "INTERNAL_ERROR",
      message: error instanceof Error ? error.message : "Unknown error",
      retryable: false,
    };
  },
};

export default openaiPlugin;

// Also export named for flexibility
export { openaiPlugin };
