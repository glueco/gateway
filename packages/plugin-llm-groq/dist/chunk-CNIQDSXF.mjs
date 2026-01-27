import {
  ACTIONS,
  ChatCompletionRequestSchema,
  DEFAULT_GROQ_MODELS,
  ENFORCEMENT_SUPPORT,
  PLUGIN_ID,
  PROVIDER,
  RESOURCE_TYPE,
  VERSION
} from "./chunk-MRDVVFUV.mjs";

// src/proxy.ts
import { createPluginBase } from "@glueco/shared";
var GROQ_API_URL = "https://api.groq.com/openai/v1";
var GroqApiError = class extends Error {
  constructor(status, body) {
    super(`Groq API error: ${status}`);
    this.status = status;
    this.body = body;
    this.name = "GroqApiError";
  }
};
function mapGroqError(error) {
  let parsed = {};
  try {
    parsed = JSON.parse(error.body);
  } catch {
  }
  const message = parsed.error?.message || error.body;
  switch (error.status) {
    case 400:
      return { status: 400, code: "BAD_REQUEST", message, retryable: false };
    case 401:
      return {
        status: 401,
        code: "UNAUTHORIZED",
        message: "Invalid API key",
        retryable: false
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
        retryable: true
      };
    default:
      return {
        status: error.status,
        code: "UNKNOWN",
        message,
        retryable: false
      };
  }
}
var groqPlugin = {
  ...createPluginBase({
    id: PLUGIN_ID,
    resourceType: RESOURCE_TYPE,
    provider: PROVIDER,
    version: VERSION,
    name: "Groq LLM",
    actions: [...ACTIONS],
    supports: {
      enforcement: [...ENFORCEMENT_SUPPORT]
    },
    // Client contract metadata for SDK-compatible plugins
    client: {
      namespace: "groq",
      actions: {
        "chat.completions": {
          description: "Generate chat completions using Groq's fast LLM inference"
        }
      }
    }
  }),
  // Credential schema for UI
  credentialSchema: {
    fields: [
      {
        name: "apiKey",
        type: "secret",
        label: "API Key",
        description: "Your Groq API key",
        required: true
      },
      {
        name: "baseUrl",
        type: "url",
        label: "Base URL",
        description: "Custom API base URL (optional)",
        required: false,
        default: GROQ_API_URL
      }
    ]
  },
  validateAndShape(action, input, constraints) {
    if (action !== "chat.completions") {
      return { valid: false, error: `Unsupported action: ${action}` };
    }
    const parsed = ChatCompletionRequestSchema.safeParse(input);
    if (!parsed.success) {
      return {
        valid: false,
        error: `Invalid request: ${parsed.error.errors.map((e) => e.message).join(", ")}`
      };
    }
    const request = parsed.data;
    const enforcement = {
      model: request.model,
      stream: request.stream ?? false,
      usesTools: Array.isArray(request.tools) && request.tools.length > 0,
      maxOutputTokens: request.max_tokens ?? request.max_completion_tokens
    };
    const allowedModels = constraints.allowedModels ?? [...DEFAULT_GROQ_MODELS];
    if (!allowedModels.includes(request.model)) {
      return {
        valid: false,
        error: `Model '${request.model}' not allowed. Allowed: ${allowedModels.join(", ")}`
      };
    }
    const maxTokens = constraints.maxOutputTokens ?? 4096;
    const requestedTokens = request.max_tokens ?? request.max_completion_tokens;
    if (requestedTokens && requestedTokens > maxTokens) {
      return {
        valid: false,
        error: `max_tokens (${requestedTokens}) exceeds limit (${maxTokens})`
      };
    }
    if (request.stream && constraints.allowStreaming === false) {
      return {
        valid: false,
        error: "Streaming is not allowed for this app"
      };
    }
    const shapedRequest = {
      ...request,
      max_tokens: requestedTokens ? Math.min(requestedTokens, maxTokens) : maxTokens
    };
    return { valid: true, shapedInput: shapedRequest, enforcement };
  },
  async execute(action, shapedInput, ctx, options) {
    const request = shapedInput;
    const baseUrl = ctx.config?.baseUrl || GROQ_API_URL;
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${ctx.secret}`
      },
      body: JSON.stringify(request),
      signal: options.signal
    });
    if (!response.ok) {
      const errorBody = await response.text();
      throw new GroqApiError(response.status, errorBody);
    }
    if (request.stream) {
      return {
        stream: response.body,
        contentType: "text/event-stream"
      };
    } else {
      const json = await response.json();
      return {
        response: json,
        contentType: "application/json",
        usage: this.extractUsage(json)
      };
    }
  },
  extractUsage(response) {
    const res = response;
    return {
      inputTokens: res.usage?.prompt_tokens,
      outputTokens: res.usage?.completion_tokens,
      totalTokens: res.usage?.total_tokens,
      model: res.model
    };
  },
  mapError(error) {
    if (error instanceof GroqApiError) {
      return mapGroqError(error);
    }
    return {
      status: 500,
      code: "INTERNAL_ERROR",
      message: error instanceof Error ? error.message : "Unknown error",
      retryable: false
    };
  }
};
var proxy_default = groqPlugin;

export {
  groqPlugin,
  proxy_default
};
//# sourceMappingURL=chunk-CNIQDSXF.mjs.map