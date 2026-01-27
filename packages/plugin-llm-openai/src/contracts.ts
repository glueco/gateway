// ============================================
// OPENAI PLUGIN CONTRACTS
// Shared request/response schemas for proxy and client
// ============================================

import { z } from "zod";

// ============================================
// REQUEST SCHEMAS (OpenAI Chat Completion API)
// ============================================

export const ChatMessageSchema = z.object({
  role: z.enum(["system", "user", "assistant", "tool", "function"]),
  content: z
    .union([
      z.string(),
      z.array(
        z.object({
          type: z.enum(["text", "image_url"]),
          text: z.string().optional(),
          image_url: z
            .object({
              url: z.string(),
              detail: z.enum(["auto", "low", "high"]).optional(),
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
  function_call: z
    .object({
      name: z.string(),
      arguments: z.string(),
    })
    .optional(),
});

export type ChatMessage = z.infer<typeof ChatMessageSchema>;

export const ToolSchema = z.object({
  type: z.literal("function"),
  function: z.object({
    name: z.string(),
    description: z.string().optional(),
    parameters: z.record(z.unknown()).optional(),
    strict: z.boolean().optional(),
  }),
});

export type Tool = z.infer<typeof ToolSchema>;

export const ChatCompletionRequestSchema = z.object({
  model: z.string(),
  messages: z.array(ChatMessageSchema),
  temperature: z.number().min(0).max(2).optional(),
  top_p: z.number().min(0).max(1).optional(),
  n: z.number().int().min(1).max(10).optional(),
  stream: z.boolean().optional(),
  stream_options: z
    .object({
      include_usage: z.boolean().optional(),
    })
    .optional(),
  stop: z.union([z.string(), z.array(z.string())]).optional(),
  max_tokens: z.number().int().positive().optional(),
  max_completion_tokens: z.number().int().positive().optional(),
  presence_penalty: z.number().min(-2).max(2).optional(),
  frequency_penalty: z.number().min(-2).max(2).optional(),
  logit_bias: z.record(z.number()).optional(),
  logprobs: z.boolean().optional(),
  top_logprobs: z.number().int().min(0).max(20).optional(),
  user: z.string().optional(),
  tools: z.array(ToolSchema).optional(),
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
  parallel_tool_calls: z.boolean().optional(),
  response_format: z
    .union([
      z.object({ type: z.literal("text") }),
      z.object({ type: z.literal("json_object") }),
      z.object({
        type: z.literal("json_schema"),
        json_schema: z.object({
          name: z.string(),
          description: z.string().optional(),
          schema: z.record(z.unknown()),
          strict: z.boolean().optional(),
        }),
      }),
    ])
    .optional(),
  seed: z.number().int().optional(),
  service_tier: z.enum(["auto", "default"]).optional(),
});

export type ChatCompletionRequest = z.infer<typeof ChatCompletionRequestSchema>;

// ============================================
// RESPONSE SCHEMAS
// ============================================

export const ChatCompletionChoiceSchema = z.object({
  index: z.number(),
  message: z.object({
    role: z.literal("assistant"),
    content: z.string().nullable(),
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
    function_call: z
      .object({
        name: z.string(),
        arguments: z.string(),
      })
      .optional(),
    refusal: z.string().nullable().optional(),
  }),
  finish_reason: z
    .enum(["stop", "length", "tool_calls", "content_filter", "function_call"])
    .nullable(),
  logprobs: z
    .object({
      content: z
        .array(
          z.object({
            token: z.string(),
            logprob: z.number(),
            bytes: z.array(z.number()).nullable(),
            top_logprobs: z.array(
              z.object({
                token: z.string(),
                logprob: z.number(),
                bytes: z.array(z.number()).nullable(),
              }),
            ),
          }),
        )
        .nullable(),
    })
    .nullable()
    .optional(),
});

export type ChatCompletionChoice = z.infer<typeof ChatCompletionChoiceSchema>;

export const UsageSchema = z.object({
  prompt_tokens: z.number(),
  completion_tokens: z.number(),
  total_tokens: z.number(),
  prompt_tokens_details: z
    .object({
      cached_tokens: z.number().optional(),
    })
    .optional(),
  completion_tokens_details: z
    .object({
      reasoning_tokens: z.number().optional(),
    })
    .optional(),
});

export type Usage = z.infer<typeof UsageSchema>;

export const ChatCompletionResponseSchema = z.object({
  id: z.string(),
  object: z.literal("chat.completion"),
  created: z.number(),
  model: z.string(),
  choices: z.array(ChatCompletionChoiceSchema),
  usage: UsageSchema.optional(),
  system_fingerprint: z.string().optional(),
  service_tier: z.string().optional(),
});

export type ChatCompletionResponse = z.infer<
  typeof ChatCompletionResponseSchema
>;

// ============================================
// STREAMING RESPONSE SCHEMAS
// ============================================

export const ChatCompletionChunkSchema = z.object({
  id: z.string(),
  object: z.literal("chat.completion.chunk"),
  created: z.number(),
  model: z.string(),
  system_fingerprint: z.string().optional(),
  choices: z.array(
    z.object({
      index: z.number(),
      delta: z.object({
        role: z.string().optional(),
        content: z.string().optional(),
        tool_calls: z
          .array(
            z.object({
              index: z.number(),
              id: z.string().optional(),
              type: z.literal("function").optional(),
              function: z
                .object({
                  name: z.string().optional(),
                  arguments: z.string().optional(),
                })
                .optional(),
            }),
          )
          .optional(),
        refusal: z.string().nullable().optional(),
      }),
      finish_reason: z
        .enum([
          "stop",
          "length",
          "tool_calls",
          "content_filter",
          "function_call",
        ])
        .nullable(),
      logprobs: z
        .object({
          content: z
            .array(
              z.object({
                token: z.string(),
                logprob: z.number(),
                bytes: z.array(z.number()).nullable(),
                top_logprobs: z.array(
                  z.object({
                    token: z.string(),
                    logprob: z.number(),
                    bytes: z.array(z.number()).nullable(),
                  }),
                ),
              }),
            )
            .nullable(),
        })
        .nullable()
        .optional(),
    }),
  ),
  usage: UsageSchema.optional(),
  service_tier: z.string().optional(),
});

export type ChatCompletionChunk = z.infer<typeof ChatCompletionChunkSchema>;

// ============================================
// PLUGIN CONSTANTS
// ============================================

export const PLUGIN_ID = "llm:openai" as const;
export const RESOURCE_TYPE = "llm" as const;
export const PROVIDER = "openai" as const;
export const VERSION = "1.0.0";

/** Default allowed models */
export const DEFAULT_OPENAI_MODELS = [
  // GPT-4o family
  "gpt-4o",
  "gpt-4o-2024-11-20",
  "gpt-4o-2024-08-06",
  "gpt-4o-2024-05-13",
  "gpt-4o-mini",
  "gpt-4o-mini-2024-07-18",
  // GPT-4 Turbo
  "gpt-4-turbo",
  "gpt-4-turbo-2024-04-09",
  "gpt-4-turbo-preview",
  "gpt-4-0125-preview",
  "gpt-4-1106-preview",
  // GPT-4
  "gpt-4",
  "gpt-4-0613",
  // GPT-3.5 Turbo
  "gpt-3.5-turbo",
  "gpt-3.5-turbo-0125",
  "gpt-3.5-turbo-1106",
  // o1 family (reasoning models)
  "o1",
  "o1-2024-12-17",
  "o1-preview",
  "o1-preview-2024-09-12",
  "o1-mini",
  "o1-mini-2024-09-12",
] as const;

/** Supported actions */
export const ACTIONS = ["chat.completions"] as const;
export type OpenAIAction = (typeof ACTIONS)[number];

/** Enforcement knobs */
export const ENFORCEMENT_SUPPORT = [
  "model",
  "max_tokens",
  "streaming",
] as const;

/** Default API URL */
export const DEFAULT_API_URL = "https://api.openai.com/v1";
