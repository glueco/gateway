// src/index.ts
import { z } from "zod";
import { createPluginBase } from "@glueco/shared";
var GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta";
var DEFAULT_GEMINI_MODELS = [
  "gemini-2.0-flash-exp",
  "gemini-1.5-flash",
  "gemini-1.5-flash-8b",
  "gemini-1.5-pro"
];
var ChatMessageSchema = z.object({
  role: z.enum(["system", "user", "assistant", "tool"]),
  content: z.union([
    z.string(),
    z.array(
      z.object({
        type: z.string(),
        text: z.string().optional(),
        image_url: z.object({
          url: z.string(),
          detail: z.string().optional()
        }).optional()
      })
    )
  ]).nullable(),
  name: z.string().optional(),
  tool_calls: z.array(
    z.object({
      id: z.string(),
      type: z.literal("function"),
      function: z.object({
        name: z.string(),
        arguments: z.string()
      })
    })
  ).optional(),
  tool_call_id: z.string().optional()
});
var ChatCompletionRequestSchema = z.object({
  model: z.string(),
  messages: z.array(ChatMessageSchema),
  temperature: z.number().min(0).max(2).optional(),
  top_p: z.number().min(0).max(1).optional(),
  n: z.number().int().min(1).max(10).optional(),
  stream: z.boolean().optional(),
  stop: z.union([z.string(), z.array(z.string())]).optional(),
  max_tokens: z.number().int().positive().optional(),
  max_completion_tokens: z.number().int().positive().optional(),
  presence_penalty: z.number().min(-2).max(2).optional(),
  frequency_penalty: z.number().min(-2).max(2).optional(),
  logit_bias: z.record(z.number()).optional(),
  user: z.string().optional(),
  tools: z.array(
    z.object({
      type: z.literal("function"),
      function: z.object({
        name: z.string(),
        description: z.string().optional(),
        parameters: z.record(z.unknown()).optional()
      })
    })
  ).optional(),
  tool_choice: z.union([
    z.literal("none"),
    z.literal("auto"),
    z.literal("required"),
    z.object({
      type: z.literal("function"),
      function: z.object({ name: z.string() })
    })
  ]).optional(),
  response_format: z.object({
    type: z.enum(["text", "json_object"])
  }).optional(),
  seed: z.number().int().optional()
});
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
  ...createPluginBase({
    id: "llm:gemini",
    resourceType: "llm",
    provider: "gemini",
    version: "1.0.0",
    name: "Google Gemini",
    actions: ["chat.completions"],
    supports: {
      enforcement: ["model", "max_tokens", "streaming"]
    }
  }),
  // Extractor reference for enforcement
  extractors: {
    "chat.completions": {
      type: "gemini"
    }
  },
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
    const allowedModels = constraints.allowedModels ?? DEFAULT_GEMINI_MODELS;
    const modelWithoutPrefix = modelName.replace("models/", "");
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
    return { valid: true, shapedInput: shapedRequest };
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
var index_default = geminiPlugin;
export {
  index_default as default,
  geminiPlugin
};
//# sourceMappingURL=index.mjs.map