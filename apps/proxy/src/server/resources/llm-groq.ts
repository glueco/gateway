import {
  ResourcePlugin,
  ResourceConstraints,
  ValidationResult,
  ExecuteOptions,
  ExecuteResult,
  UsageMetrics,
  MappedError,
  ChatCompletionRequest,
  ChatCompletionRequestSchema,
} from "./types";

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

export const groqPlugin: ResourcePlugin = {
  resourceId: "llm:groq",
  resourceType: "llm",
  provider: "groq",
  name: "Groq LLM",
  supportedActions: ["chat.completions"],

  validateAndShape(
    action: string,
    input: unknown,
    constraints: ResourceConstraints,
  ): ValidationResult {
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
    secret: string,
    config: Record<string, unknown> | null,
    options: ExecuteOptions,
  ): Promise<ExecuteResult> {
    const request = shapedInput as ChatCompletionRequest;
    const baseUrl = (config?.baseUrl as string) || GROQ_API_URL;

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${secret}`,
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

  extractUsage(response: unknown): UsageMetrics {
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

  mapError(error: unknown): MappedError {
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

class GroqApiError extends Error {
  constructor(
    public status: number,
    public body: string,
  ) {
    super(`Groq API error: ${status}`);
  }
}

function mapGroqError(error: GroqApiError): MappedError {
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

export default groqPlugin;
