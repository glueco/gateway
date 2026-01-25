import { z } from "zod";
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
// GEMINI LLM PLUGIN
// Accepts OpenAI-compatible requests, translates to Gemini API
// ============================================

const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta";

// Default allowed models if not specified in constraints
const DEFAULT_GEMINI_MODELS = [
  "gemini-2.0-flash-exp",
  "gemini-1.5-flash",
  "gemini-1.5-flash-8b",
  "gemini-1.5-pro",
];

// ============================================
// REQUEST SCHEMA (OpenAI-compatible)
// ============================================

const ChatMessageSchema = z.object({
  role: z.enum(["system", "user", "assistant", "tool"]),
  content: z
    .union([
      z.string(),
      z.array(
        z.object({
          type: z.string(),
          text: z.string().optional(),
          image_url: z
            .object({
              url: z.string(),
              detail: z.string().optional(),
            })
            .optional(),
        }),
      ),
    ])
    .nullable(),
  name: z.string().optional(),
  tool_calls: z
    .array(
      z.object({
        id: z.string(),
        type: z.literal("function"),
        function: z.object({
          name: z.string(),
          arguments: z.string(),
        }),
      }),
    )
    .optional(),
  tool_call_id: z.string().optional(),
});

const ChatCompletionRequestSchema = z.object({
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
  tools: z
    .array(
      z.object({
        type: z.literal("function"),
        function: z.object({
          name: z.string(),
          description: z.string().optional(),
          parameters: z.record(z.unknown()).optional(),
        }),
      }),
    )
    .optional(),
  tool_choice: z
    .union([
      z.literal("none"),
      z.literal("auto"),
      z.literal("required"),
      z.object({
        type: z.literal("function"),
        function: z.object({ name: z.string() }),
      }),
    ])
    .optional(),
  response_format: z
    .object({
      type: z.enum(["text", "json_object"]),
    })
    .optional(),
  seed: z.number().int().optional(),
});

type ChatCompletionRequest = z.infer<typeof ChatCompletionRequestSchema>;

// ============================================
// FORMAT CONVERSION
// ============================================

interface GeminiContent {
  role: "user" | "model";
  parts: Array<
    { text: string } | { inlineData: { mimeType: string; data: string } }
  >;
}

interface GeminiRequest {
  contents: GeminiContent[];
  systemInstruction?: { parts: Array<{ text: string }> };
  generationConfig?: {
    temperature?: number;
    topP?: number;
    maxOutputTokens?: number;
    stopSequences?: string[];
  };
}

function convertToGeminiFormat(request: ChatCompletionRequest): GeminiRequest {
  const contents: GeminiContent[] = [];
  let systemInstruction: { parts: Array<{ text: string }> } | undefined;

  for (const message of request.messages) {
    if (message.role === "system") {
      // Gemini handles system prompts separately
      const text = typeof message.content === "string" ? message.content : "";
      systemInstruction = { parts: [{ text }] };
    } else {
      const role = message.role === "assistant" ? "model" : "user";
      const parts: Array<{ text: string }> = [];

      if (typeof message.content === "string") {
        parts.push({ text: message.content });
      } else if (Array.isArray(message.content)) {
        for (const part of message.content) {
          if (part.type === "text" && part.text) {
            parts.push({ text: part.text });
          }
          // Image handling could be added here
        }
      } else if (message.content === null) {
        parts.push({ text: "" });
      }

      if (parts.length > 0) {
        contents.push({ role, parts });
      }
    }
  }

  const geminiRequest: GeminiRequest = { contents };

  if (systemInstruction) {
    geminiRequest.systemInstruction = systemInstruction;
  }

  // Generation config
  const generationConfig: GeminiRequest["generationConfig"] = {};

  if (request.temperature !== undefined) {
    generationConfig.temperature = request.temperature;
  }
  if (request.top_p !== undefined) {
    generationConfig.topP = request.top_p;
  }
  if (request.max_tokens !== undefined) {
    generationConfig.maxOutputTokens = request.max_tokens;
  }
  if (request.stop) {
    generationConfig.stopSequences = Array.isArray(request.stop)
      ? request.stop
      : [request.stop];
  }

  if (Object.keys(generationConfig).length > 0) {
    geminiRequest.generationConfig = generationConfig;
  }

  return geminiRequest;
}

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
      role?: string;
    };
    finishReason?: string;
  }>;
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    totalTokenCount?: number;
  };
}

function convertToOpenAIFormat(geminiResponse: GeminiResponse, model: string) {
  const candidate = geminiResponse.candidates?.[0];
  const content =
    candidate?.content?.parts?.map((p) => p.text || "").join("") || "";

  return {
    id: `chatcmpl-${Date.now()}`,
    object: "chat.completion",
    created: Math.floor(Date.now() / 1000),
    model: model.replace("models/", ""),
    choices: [
      {
        index: 0,
        message: {
          role: "assistant",
          content,
        },
        finish_reason: mapFinishReason(candidate?.finishReason),
      },
    ],
    usage: {
      prompt_tokens: geminiResponse.usageMetadata?.promptTokenCount || 0,
      completion_tokens:
        geminiResponse.usageMetadata?.candidatesTokenCount || 0,
      total_tokens: geminiResponse.usageMetadata?.totalTokenCount || 0,
    },
  };
}

function mapFinishReason(reason?: string): string {
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

function transformGeminiStream(
  input: ReadableStream<Uint8Array>,
  model: string,
): ReadableStream<Uint8Array> {
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
            // Send final [DONE] message
            controller.enqueue(encoder.encode("data: [DONE]\n\n"));
            controller.close();
            break;
          }

          buffer += decoder.decode(value, { stream: true });

          // Process SSE events
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
                const geminiChunk = JSON.parse(data) as GeminiResponse;
                const openaiChunk = convertStreamChunkToOpenAI(
                  geminiChunk,
                  model,
                );
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify(openaiChunk)}\n\n`),
                );
              } catch {
                // Skip malformed chunks
              }
            }
          }
        }
      } catch (error) {
        controller.error(error);
      }
    },
  });
}

function convertStreamChunkToOpenAI(
  geminiChunk: GeminiResponse,
  model: string,
) {
  const candidate = geminiChunk.candidates?.[0];
  const content =
    candidate?.content?.parts?.map((p) => p.text || "").join("") || "";

  return {
    id: `chatcmpl-${Date.now()}`,
    object: "chat.completion.chunk",
    created: Math.floor(Date.now() / 1000),
    model: model.replace("models/", ""),
    choices: [
      {
        index: 0,
        delta: {
          content,
        },
        finish_reason: candidate?.finishReason
          ? mapFinishReason(candidate.finishReason)
          : null,
      },
    ],
  };
}

// ============================================
// ERROR HANDLING
// ============================================

class GeminiApiError extends Error {
  constructor(
    public status: number,
    public body: string,
  ) {
    super(`Gemini API error: ${status}`);
    this.name = "GeminiApiError";
  }
}

function mapGeminiError(error: GeminiApiError): PluginMappedError {
  let parsed: { error?: { message?: string; status?: string; code?: number } } =
    {};
  try {
    parsed = JSON.parse(error.body);
  } catch {
    // Ignore parse errors
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

const geminiPlugin: PluginContract = {
  ...createPluginBase({
    id: "llm:gemini",
    resourceType: "llm",
    provider: "gemini",
    version: "1.0.0",
    name: "Google Gemini",
    actions: ["chat.completions"],
    supports: {
      enforcement: ["model", "max_tokens", "streaming"],
    },
  }),

  // Extractor reference for enforcement
  extractors: {
    "chat.completions": {
      type: "gemini",
    },
  },

  // Credential schema for UI
  credentialSchema: {
    fields: [
      {
        name: "apiKey",
        type: "secret",
        label: "API Key",
        description: "Your Google AI Studio API key",
        required: true,
      },
      {
        name: "baseUrl",
        type: "url",
        label: "Base URL",
        description: "Custom API base URL (optional)",
        required: false,
        default: GEMINI_API_URL,
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

    // Parse input
    const parsed = ChatCompletionRequestSchema.safeParse(input);
    if (!parsed.success) {
      return {
        valid: false,
        error: `Invalid request: ${parsed.error.errors.map((e) => e.message).join(", ")}`,
      };
    }

    const request = parsed.data;

    // Get model name (add models/ prefix if not present)
    let modelName = request.model;
    if (!modelName.startsWith("models/")) {
      modelName = `models/${modelName}`;
    }

    // Check allowed models (compare without prefix)
    const allowedModels = constraints.allowedModels ?? DEFAULT_GEMINI_MODELS;
    const modelWithoutPrefix = modelName.replace("models/", "");

    if (
      !allowedModels.some((m) => m === modelWithoutPrefix || m === modelName)
    ) {
      return {
        valid: false,
        error: `Model '${request.model}' not allowed. Allowed: ${allowedModels.join(", ")}`,
      };
    }

    // Enforce max tokens
    const maxTokens = constraints.maxOutputTokens ?? 8192;
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

    // Shape the request
    const shapedRequest = {
      ...request,
      model: modelName,
      max_tokens: requestedTokens
        ? Math.min(requestedTokens, maxTokens)
        : undefined,
    };

    return { valid: true, shapedInput: shapedRequest };
  },

  async execute(
    action: string,
    shapedInput: unknown,
    ctx: PluginExecuteContext,
    options: PluginExecuteOptions,
  ): Promise<PluginExecuteResult> {
    const request = shapedInput as ChatCompletionRequest & { model: string };
    const baseUrl = (ctx.config?.baseUrl as string) || GEMINI_API_URL;

    // Convert OpenAI format to Gemini format
    const geminiRequest = convertToGeminiFormat(request);

    const endpoint = request.stream
      ? `${baseUrl}/${request.model}:streamGenerateContent?alt=sse&key=${ctx.secret}`
      : `${baseUrl}/${request.model}:generateContent?key=${ctx.secret}`;

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(geminiRequest),
      signal: options.signal,
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new GeminiApiError(response.status, errorBody);
    }

    if (request.stream) {
      // Transform Gemini SSE stream to OpenAI-compatible SSE stream
      const transformedStream = transformGeminiStream(
        response.body!,
        request.model,
      );
      return {
        stream: transformedStream,
        contentType: "text/event-stream",
      };
    } else {
      // Transform Gemini response to OpenAI-compatible format
      const geminiResponse = await response.json();
      const openaiResponse = convertToOpenAIFormat(
        geminiResponse,
        request.model,
      );

      return {
        response: openaiResponse,
        contentType: "application/json",
        usage: this.extractUsage(openaiResponse),
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
    if (error instanceof GeminiApiError) {
      return mapGeminiError(error);
    }

    return {
      status: 500,
      code: "INTERNAL_ERROR",
      message: error instanceof Error ? error.message : "Unknown error",
      retryable: false,
    };
  },
};

export default geminiPlugin;

// Also export named for flexibility
export { geminiPlugin };
export type { ChatCompletionRequest };
