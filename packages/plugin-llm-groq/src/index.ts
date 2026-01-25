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
// GROQ LLM PLUGIN (OpenAI-Compatible)
// ============================================

const GROQ_API_URL = "https://api.groq.com/openai/v1";

// Default allowed models if not specified in constraints
const DEFAULT_GROQ_MODELS = [
  "llama-3.3-70b-versatile",
  "llama-3.1-70b-versatile",
  "llama-3.1-8b-instant",
  "llama3-70b-8192",
  "llama3-8b-8192",
  "mixtral-8x7b-32768",
  "gemma2-9b-it",
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
// ERROR HANDLING
// ============================================

class GroqApiError extends Error {
  constructor(
    public status: number,
    public body: string,
  ) {
    super(`Groq API error: ${status}`);
    this.name = "GroqApiError";
  }
}

function mapGroqError(error: GroqApiError): PluginMappedError {
  let parsed: { error?: { message?: string; type?: string; code?: string } } =
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

const groqPlugin: PluginContract = {
  ...createPluginBase({
    id: "llm:groq",
    resourceType: "llm",
    provider: "groq",
    version: "1.0.0",
    name: "Groq LLM",
    actions: ["chat.completions"],
    supports: {
      enforcement: ["model", "max_tokens", "streaming"],
    },
  }),

  // Extractor reference for enforcement
  extractors: {
    "chat.completions": {
      type: "openai-compatible",
    },
  },

  // Credential schema for UI
  credentialSchema: {
    fields: [
      {
        name: "apiKey",
        type: "secret",
        label: "API Key",
        description: "Your Groq API key",
        required: true,
      },
      {
        name: "baseUrl",
        type: "url",
        label: "Base URL",
        description: "Custom API base URL (optional)",
        required: false,
        default: GROQ_API_URL,
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

    // Check allowed models
    const allowedModels = constraints.allowedModels ?? DEFAULT_GROQ_MODELS;
    if (!allowedModels.includes(request.model)) {
      return {
        valid: false,
        error: `Model '${request.model}' not allowed. Allowed: ${allowedModels.join(", ")}`,
      };
    }

    // Enforce max tokens
    const maxTokens = constraints.maxOutputTokens ?? 4096;
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
        : maxTokens,
    };

    return { valid: true, shapedInput: shapedRequest };
  },

  async execute(
    action: string,
    shapedInput: unknown,
    ctx: PluginExecuteContext,
    options: PluginExecuteOptions,
  ): Promise<PluginExecuteResult> {
    const request = shapedInput as ChatCompletionRequest;
    const baseUrl = (ctx.config?.baseUrl as string) || GROQ_API_URL;

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${ctx.secret}`,
      },
      body: JSON.stringify(request),
      signal: options.signal,
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new GroqApiError(response.status, errorBody);
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
    if (error instanceof GroqApiError) {
      return mapGroqError(error);
    }

    return {
      status: 500,
      code: "INTERNAL_ERROR",
      message: error instanceof Error ? error.message : "Unknown error",
      retryable: false,
    };
  },
};

export default groqPlugin;

// Also export named for flexibility
export { groqPlugin };
export type { ChatCompletionRequest };
