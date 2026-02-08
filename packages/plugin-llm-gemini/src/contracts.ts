// ============================================
// GEMINI PLUGIN CONTRACTS
// Shared request/response schemas for proxy and client
// ============================================

import { z } from "zod";

// ============================================
// REQUEST SCHEMAS (OpenAI-compatible)
// ============================================

export const ChatMessageSchema = z.object({
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

export type ChatMessage = z.infer<typeof ChatMessageSchema>;

export const ChatCompletionRequestSchema = z.object({
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

export type ChatCompletionRequest = z.infer<typeof ChatCompletionRequestSchema>;

// ============================================
// RESPONSE SCHEMAS (OpenAI-compatible)
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
  }),
  finish_reason: z.string().nullable(),
});

export type ChatCompletionChoice = z.infer<typeof ChatCompletionChoiceSchema>;

export const UsageSchema = z.object({
  prompt_tokens: z.number(),
  completion_tokens: z.number(),
  total_tokens: z.number(),
});

export type Usage = z.infer<typeof UsageSchema>;

export const ChatCompletionResponseSchema = z.object({
  id: z.string(),
  object: z.literal("chat.completion"),
  created: z.number(),
  model: z.string(),
  choices: z.array(ChatCompletionChoiceSchema),
  usage: UsageSchema.optional(),
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
      }),
      finish_reason: z.string().nullable(),
    }),
  ),
});

export type ChatCompletionChunk = z.infer<typeof ChatCompletionChunkSchema>;

// ============================================
// PLUGIN CONSTANTS
// ============================================

export const PLUGIN_ID = "llm:gemini" as const;
export const RESOURCE_TYPE = "llm" as const;
export const PROVIDER = "gemini" as const;
export const VERSION = "1.0.0";

/** Default allowed models */
export const DEFAULT_GEMINI_MODELS = [
  // Gemini 3 family
  "gemini-3-pro",
  "gemini-3-flash",
  // Gemini 2.5 family
  "gemini-2.5-pro",
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
] as const;

/** Supported actions */
export const ACTIONS = ["chat.completions"] as const;
export type GeminiAction = (typeof ACTIONS)[number];

/** Enforcement knobs */
export const ENFORCEMENT_SUPPORT = [
  "model",
  "max_tokens",
  "streaming",
] as const;
