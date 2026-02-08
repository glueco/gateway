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
  DEFAULT_GEMINI_MODELS: () => DEFAULT_GEMINI_MODELS,
  ENFORCEMENT_SUPPORT: () => ENFORCEMENT_SUPPORT,
  PLUGIN_ID: () => PLUGIN_ID,
  PROVIDER: () => PROVIDER,
  RESOURCE_TYPE: () => RESOURCE_TYPE,
  UsageSchema: () => UsageSchema,
  VERSION: () => VERSION,
  default: () => proxy_default,
  geminiPlugin: () => geminiPlugin
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
var PLUGIN_ID = "llm:gemini";
var RESOURCE_TYPE = "llm";
var PROVIDER = "gemini";
var VERSION = "1.0.0";
var DEFAULT_GEMINI_MODELS = [
  // Gemini 3 family
  "gemini-3-pro",
  "gemini-3-flash",
  // Gemini 2.5 family
  "gemini-2.5-pro",
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite"
];
var ACTIONS = ["chat.completions"];
var ENFORCEMENT_SUPPORT = [
  "model",
  "max_tokens",
  "streaming"
];

// src/proxy.ts
var GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta";
function convertToGeminiFormat(request) {
  const contents = [];
  let systemInstruction;
  for (const message of request.messages) {
    if (message.role === "system") {
      const text = typeof message.content === "string" ? message.content : "";
      systemInstruction = { parts: [{ text }] };
    } else {
      const role = message.role === "assistant" ? "model" : "user";
      const parts = [];
      if (typeof message.content === "string") {
        parts.push({ text: message.content });
      } else if (Array.isArray(message.content)) {
        for (const part of message.content) {
          if (part.type === "text" && part.text) {
            parts.push({ text: part.text });
          }
        }
      } else if (message.content === null) {
        parts.push({ text: "" });
      }
      if (parts.length > 0) {
        contents.push({ role, parts });
      }
    }
  }
  const geminiRequest = { contents };
  if (systemInstruction) {
    geminiRequest.systemInstruction = systemInstruction;
  }
  const generationConfig = {};
  if (request.temperature !== void 0) {
    generationConfig.temperature = request.temperature;
  }
  if (request.top_p !== void 0) {
    generationConfig.topP = request.top_p;
  }
  if (request.max_tokens !== void 0) {
    generationConfig.maxOutputTokens = request.max_tokens;
  }
  if (request.stop) {
    generationConfig.stopSequences = Array.isArray(request.stop) ? request.stop : [request.stop];
  }
  if (Object.keys(generationConfig).length > 0) {
    geminiRequest.generationConfig = generationConfig;
  }
  return geminiRequest;
}
function convertToOpenAIFormat(geminiResponse, model) {
  const candidate = geminiResponse.candidates?.[0];
  const content = candidate?.content?.parts?.map((p) => p.text || "").join("") || "";
  return {
    id: `chatcmpl-${Date.now()}`,
    object: "chat.completion",
    created: Math.floor(Date.now() / 1e3),
    model: model.replace("models/", ""),
    choices: [
      {
        index: 0,
        message: {
          role: "assistant",
          content
        },
        finish_reason: mapFinishReason(candidate?.finishReason)
      }
    ],
    usage: {
      prompt_tokens: geminiResponse.usageMetadata?.promptTokenCount || 0,
      completion_tokens: geminiResponse.usageMetadata?.candidatesTokenCount || 0,
      total_tokens: geminiResponse.usageMetadata?.totalTokenCount || 0
    }
  };
}
function mapFinishReason(reason) {
  switch (reason) {
    case "STOP":
      return "stop";
    case "MAX_TOKENS":
      return "length";
    case "SAFETY":
      return "content_filter";
    case "RECITATION":
      return "content_filter";
    default:
      return "stop";
  }
}
function transformGeminiStream(input, model) {
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let buffer = "";
  return new ReadableStream({
    async start(controller) {
      const reader = input.getReader();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            controller.enqueue(encoder.encode("data: [DONE]\n\n"));
            controller.close();
            break;
          }
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";
          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6);
              if (data === "[DONE]") {
                controller.enqueue(encoder.encode("data: [DONE]\n\n"));
                continue;
              }
              try {
                const geminiChunk = JSON.parse(data);
                const openaiChunk = convertStreamChunkToOpenAI(
                  geminiChunk,
                  model
                );
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify(openaiChunk)}

`)
                );
              } catch {
              }
            }
          }
        }
      } catch (error) {
        controller.error(error);
      }
    }
  });
}
function convertStreamChunkToOpenAI(geminiChunk, model) {
  const candidate = geminiChunk.candidates?.[0];
  const content = candidate?.content?.parts?.map((p) => p.text || "").join("") || "";
  return {
    id: `chatcmpl-${Date.now()}`,
    object: "chat.completion.chunk",
    created: Math.floor(Date.now() / 1e3),
    model: model.replace("models/", ""),
    choices: [
      {
        index: 0,
        delta: {
          content
        },
        finish_reason: candidate?.finishReason ? mapFinishReason(candidate.finishReason) : null
      }
    ]
  };
}
var GeminiApiError = class extends Error {
  constructor(status, body) {
    super(`Gemini API error: ${status}`);
    this.status = status;
    this.body = body;
    this.name = "GeminiApiError";
  }
};
function mapGeminiError(error) {
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
var geminiPlugin = {
  ...(0, import_shared.createPluginBase)({
    id: PLUGIN_ID,
    resourceType: RESOURCE_TYPE,
    provider: PROVIDER,
    version: VERSION,
    name: "Google Gemini",
    actions: [...ACTIONS],
    supports: {
      enforcement: [...ENFORCEMENT_SUPPORT]
    },
    defaultModels: DEFAULT_GEMINI_MODELS,
    // Client contract metadata for SDK-compatible plugins
    client: {
      namespace: "gemini",
      actions: {
        "chat.completions": {
          description: "Generate chat completions using Gemini models (OpenAI-compatible)"
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
        description: "Your Google AI Studio API key",
        required: true
      },
      {
        name: "baseUrl",
        type: "url",
        label: "Base URL",
        description: "Custom API base URL (optional)",
        required: false,
        default: GEMINI_API_URL
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
    let modelName = request.model;
    if (!modelName.startsWith("models/")) {
      modelName = `models/${modelName}`;
    }
    const modelWithoutPrefix = modelName.replace("models/", "");
    const enforcement = {
      model: modelWithoutPrefix,
      stream: request.stream ?? false,
      usesTools: Array.isArray(request.tools) && request.tools.length > 0,
      maxOutputTokens: request.max_tokens ?? request.max_completion_tokens
    };
    const allowedModels = constraints.allowedModels ?? [
      ...DEFAULT_GEMINI_MODELS
    ];
    if (!allowedModels.some((m) => m === modelWithoutPrefix || m === modelName)) {
      return {
        valid: false,
        error: `Model '${request.model}' not allowed. Allowed: ${allowedModels.join(", ")}`
      };
    }
    const maxTokens = constraints.maxOutputTokens ?? 8192;
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
      model: modelName,
      max_tokens: requestedTokens ? Math.min(requestedTokens, maxTokens) : void 0
    };
    return { valid: true, shapedInput: shapedRequest, enforcement };
  },
  async execute(action, shapedInput, ctx, options) {
    const request = shapedInput;
    const baseUrl = ctx.config?.baseUrl || GEMINI_API_URL;
    const geminiRequest = convertToGeminiFormat(request);
    const endpoint = request.stream ? `${baseUrl}/${request.model}:streamGenerateContent?alt=sse&key=${ctx.secret}` : `${baseUrl}/${request.model}:generateContent?key=${ctx.secret}`;
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(geminiRequest),
      signal: options.signal
    });
    if (!response.ok) {
      const errorBody = await response.text();
      throw new GeminiApiError(response.status, errorBody);
    }
    if (request.stream) {
      const transformedStream = transformGeminiStream(
        response.body,
        request.model
      );
      return {
        stream: transformedStream,
        contentType: "text/event-stream"
      };
    } else {
      const geminiResponse = await response.json();
      const openaiResponse = convertToOpenAIFormat(
        geminiResponse,
        request.model
      );
      return {
        response: openaiResponse,
        contentType: "application/json",
        usage: this.extractUsage(openaiResponse)
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
    if (error instanceof GeminiApiError) {
      return mapGeminiError(error);
    }
    return {
      status: 500,
      code: "INTERNAL_ERROR",
      message: error instanceof Error ? error.message : "Unknown error",
      retryable: false
    };
  }
};
var proxy_default = geminiPlugin;
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  ACTIONS,
  ChatCompletionChoiceSchema,
  ChatCompletionChunkSchema,
  ChatCompletionRequestSchema,
  ChatCompletionResponseSchema,
  ChatMessageSchema,
  DEFAULT_GEMINI_MODELS,
  ENFORCEMENT_SUPPORT,
  PLUGIN_ID,
  PROVIDER,
  RESOURCE_TYPE,
  UsageSchema,
  VERSION,
  geminiPlugin
});
//# sourceMappingURL=index.js.map