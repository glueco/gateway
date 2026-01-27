"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var src_exports = {};
__export(src_exports, {
  ACTIONS: () => ACTIONS,
  ChatCompletionChoiceSchema: () => ChatCompletionChoiceSchema,
  ChatCompletionChunkSchema: () => ChatCompletionChunkSchema,
  ChatCompletionRequestSchema: () => ChatCompletionRequestSchema,
  ChatCompletionResponseSchema: () => ChatCompletionResponseSchema,
  ChatMessageSchema: () => ChatMessageSchema,
  DEFAULT_GROQ_MODELS: () => DEFAULT_GROQ_MODELS,
  ENFORCEMENT_SUPPORT: () => ENFORCEMENT_SUPPORT,
  PLUGIN_ID: () => PLUGIN_ID,
  PROVIDER: () => PROVIDER,
  RESOURCE_TYPE: () => RESOURCE_TYPE,
  UsageSchema: () => UsageSchema,
  VERSION: () => VERSION,
  default: () => proxy_default,
  groqPlugin: () => groqPlugin
});
module.exports = __toCommonJS(src_exports);

// src/proxy.ts
var import_shared = require("@glueco/shared");

// src/contracts.ts
var import_zod = require("zod");
var ChatMessageSchema = import_zod.z.object({
  role: import_zod.z.enum(["system", "user", "assistant", "tool"]),
  content: import_zod.z.union([
    import_zod.z.string(),
    import_zod.z.array(
      import_zod.z.object({
        type: import_zod.z.string(),
        text: import_zod.z.string().optional(),
        image_url: import_zod.z.object({
          url: import_zod.z.string(),
          detail: import_zod.z.string().optional()
        }).optional()
      })
    )
  ]).nullable(),
  name: import_zod.z.string().optional(),
  tool_calls: import_zod.z.array(
    import_zod.z.object({
      id: import_zod.z.string(),
      type: import_zod.z.literal("function"),
      function: import_zod.z.object({
        name: import_zod.z.string(),
        arguments: import_zod.z.string()
      })
    })
  ).optional(),
  tool_call_id: import_zod.z.string().optional()
});
var ChatCompletionRequestSchema = import_zod.z.object({
  model: import_zod.z.string(),
  messages: import_zod.z.array(ChatMessageSchema),
  temperature: import_zod.z.number().min(0).max(2).optional(),
  top_p: import_zod.z.number().min(0).max(1).optional(),
  n: import_zod.z.number().int().min(1).max(10).optional(),
  stream: import_zod.z.boolean().optional(),
  stop: import_zod.z.union([import_zod.z.string(), import_zod.z.array(import_zod.z.string())]).optional(),
  max_tokens: import_zod.z.number().int().positive().optional(),
  max_completion_tokens: import_zod.z.number().int().positive().optional(),
  presence_penalty: import_zod.z.number().min(-2).max(2).optional(),
  frequency_penalty: import_zod.z.number().min(-2).max(2).optional(),
  logit_bias: import_zod.z.record(import_zod.z.number()).optional(),
  user: import_zod.z.string().optional(),
  tools: import_zod.z.array(
    import_zod.z.object({
      type: import_zod.z.literal("function"),
      function: import_zod.z.object({
        name: import_zod.z.string(),
        description: import_zod.z.string().optional(),
        parameters: import_zod.z.record(import_zod.z.unknown()).optional()
      })
    })
  ).optional(),
  tool_choice: import_zod.z.union([
    import_zod.z.literal("none"),
    import_zod.z.literal("auto"),
    import_zod.z.literal("required"),
    import_zod.z.object({
      type: import_zod.z.literal("function"),
      function: import_zod.z.object({ name: import_zod.z.string() })
    })
  ]).optional(),
  response_format: import_zod.z.object({
    type: import_zod.z.enum(["text", "json_object"])
  }).optional(),
  seed: import_zod.z.number().int().optional()
});
var ChatCompletionChoiceSchema = import_zod.z.object({
  index: import_zod.z.number(),
  message: import_zod.z.object({
    role: import_zod.z.literal("assistant"),
    content: import_zod.z.string().nullable(),
    tool_calls: import_zod.z.array(
      import_zod.z.object({
        id: import_zod.z.string(),
        type: import_zod.z.literal("function"),
        function: import_zod.z.object({
          name: import_zod.z.string(),
          arguments: import_zod.z.string()
        })
      })
    ).optional()
  }),
  finish_reason: import_zod.z.string().nullable()
});
var UsageSchema = import_zod.z.object({
  prompt_tokens: import_zod.z.number(),
  completion_tokens: import_zod.z.number(),
  total_tokens: import_zod.z.number()
});
var ChatCompletionResponseSchema = import_zod.z.object({
  id: import_zod.z.string(),
  object: import_zod.z.literal("chat.completion"),
  created: import_zod.z.number(),
  model: import_zod.z.string(),
  choices: import_zod.z.array(ChatCompletionChoiceSchema),
  usage: UsageSchema.optional()
});
var ChatCompletionChunkSchema = import_zod.z.object({
  id: import_zod.z.string(),
  object: import_zod.z.literal("chat.completion.chunk"),
  created: import_zod.z.number(),
  model: import_zod.z.string(),
  choices: import_zod.z.array(
    import_zod.z.object({
      index: import_zod.z.number(),
      delta: import_zod.z.object({
        role: import_zod.z.string().optional(),
        content: import_zod.z.string().optional(),
        tool_calls: import_zod.z.array(
          import_zod.z.object({
            index: import_zod.z.number(),
            id: import_zod.z.string().optional(),
            type: import_zod.z.literal("function").optional(),
            function: import_zod.z.object({
              name: import_zod.z.string().optional(),
              arguments: import_zod.z.string().optional()
            }).optional()
          })
        ).optional()
      }),
      finish_reason: import_zod.z.string().nullable()
    })
  )
});
var PLUGIN_ID = "llm:groq";
var RESOURCE_TYPE = "llm";
var PROVIDER = "groq";
var VERSION = "1.0.0";
var DEFAULT_GROQ_MODELS = [
  "llama-3.3-70b-versatile",
  "llama-3.1-70b-versatile",
  "llama-3.1-8b-instant",
  "llama3-70b-8192",
  "llama3-8b-8192",
  "mixtral-8x7b-32768",
  "gemma2-9b-it"
];
var ACTIONS = ["chat.completions"];
var ENFORCEMENT_SUPPORT = [
  "model",
  "max_tokens",
  "streaming"
];

// src/proxy.ts
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
  ...(0, import_shared.createPluginBase)({
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
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  ACTIONS,
  ChatCompletionChoiceSchema,
  ChatCompletionChunkSchema,
  ChatCompletionRequestSchema,
  ChatCompletionResponseSchema,
  ChatMessageSchema,
  DEFAULT_GROQ_MODELS,
  ENFORCEMENT_SUPPORT,
  PLUGIN_ID,
  PROVIDER,
  RESOURCE_TYPE,
  UsageSchema,
  VERSION,
  groqPlugin
});
//# sourceMappingURL=index.js.map