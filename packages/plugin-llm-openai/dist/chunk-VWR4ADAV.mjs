// src/contracts.ts
import { z } from "zod";
var ChatMessageSchema = z.object({
  role: z.enum(["system", "user", "assistant", "tool", "function"]),
  content: z.union([
    z.string(),
    z.array(
      z.object({
        type: z.enum(["text", "image_url"]),
        text: z.string().optional(),
        image_url: z.object({
          url: z.string(),
          detail: z.enum(["auto", "low", "high"]).optional()
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
  tool_call_id: z.string().optional(),
  function_call: z.object({
    name: z.string(),
    arguments: z.string()
  }).optional()
});
var ToolSchema = z.object({
  type: z.literal("function"),
  function: z.object({
    name: z.string(),
    description: z.string().optional(),
    parameters: z.record(z.unknown()).optional(),
    strict: z.boolean().optional()
  })
});
var ChatCompletionRequestSchema = z.object({
  model: z.string(),
  messages: z.array(ChatMessageSchema),
  temperature: z.number().min(0).max(2).optional(),
  top_p: z.number().min(0).max(1).optional(),
  n: z.number().int().min(1).max(10).optional(),
  stream: z.boolean().optional(),
  stream_options: z.object({
    include_usage: z.boolean().optional()
  }).optional(),
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
  tool_choice: z.union([
    z.literal("none"),
    z.literal("auto"),
    z.literal("required"),
    z.object({
      type: z.literal("function"),
      function: z.object({ name: z.string() })
    })
  ]).optional(),
  parallel_tool_calls: z.boolean().optional(),
  response_format: z.union([
    z.object({ type: z.literal("text") }),
    z.object({ type: z.literal("json_object") }),
    z.object({
      type: z.literal("json_schema"),
      json_schema: z.object({
        name: z.string(),
        description: z.string().optional(),
        schema: z.record(z.unknown()),
        strict: z.boolean().optional()
      })
    })
  ]).optional(),
  seed: z.number().int().optional(),
  service_tier: z.enum(["auto", "default"]).optional()
});
var ChatCompletionChoiceSchema = z.object({
  index: z.number(),
  message: z.object({
    role: z.literal("assistant"),
    content: z.string().nullable(),
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
    function_call: z.object({
      name: z.string(),
      arguments: z.string()
    }).optional(),
    refusal: z.string().nullable().optional()
  }),
  finish_reason: z.enum(["stop", "length", "tool_calls", "content_filter", "function_call"]).nullable(),
  logprobs: z.object({
    content: z.array(
      z.object({
        token: z.string(),
        logprob: z.number(),
        bytes: z.array(z.number()).nullable(),
        top_logprobs: z.array(
          z.object({
            token: z.string(),
            logprob: z.number(),
            bytes: z.array(z.number()).nullable()
          })
        )
      })
    ).nullable()
  }).nullable().optional()
});
var UsageSchema = z.object({
  prompt_tokens: z.number(),
  completion_tokens: z.number(),
  total_tokens: z.number(),
  prompt_tokens_details: z.object({
    cached_tokens: z.number().optional()
  }).optional(),
  completion_tokens_details: z.object({
    reasoning_tokens: z.number().optional()
  }).optional()
});
var ChatCompletionResponseSchema = z.object({
  id: z.string(),
  object: z.literal("chat.completion"),
  created: z.number(),
  model: z.string(),
  choices: z.array(ChatCompletionChoiceSchema),
  usage: UsageSchema.optional(),
  system_fingerprint: z.string().optional(),
  service_tier: z.string().optional()
});
var ChatCompletionChunkSchema = z.object({
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
        tool_calls: z.array(
          z.object({
            index: z.number(),
            id: z.string().optional(),
            type: z.literal("function").optional(),
            function: z.object({
              name: z.string().optional(),
              arguments: z.string().optional()
            }).optional()
          })
        ).optional(),
        refusal: z.string().nullable().optional()
      }),
      finish_reason: z.enum([
        "stop",
        "length",
        "tool_calls",
        "content_filter",
        "function_call"
      ]).nullable(),
      logprobs: z.object({
        content: z.array(
          z.object({
            token: z.string(),
            logprob: z.number(),
            bytes: z.array(z.number()).nullable(),
            top_logprobs: z.array(
              z.object({
                token: z.string(),
                logprob: z.number(),
                bytes: z.array(z.number()).nullable()
              })
            )
          })
        ).nullable()
      }).nullable().optional()
    })
  ),
  usage: UsageSchema.optional(),
  service_tier: z.string().optional()
});
var PLUGIN_ID = "llm:openai";
var RESOURCE_TYPE = "llm";
var PROVIDER = "openai";
var VERSION = "1.0.0";
var DEFAULT_OPENAI_MODELS = [
  // GPT-5 family
  "gpt-5.2",
  "gpt-5.2-pro",
  "gpt-5-mini",
  "gpt-5-nano",
  // GPT-4.1 family
  "gpt-4.1",
  "gpt-4.1-mini",
  "gpt-4.1-nano",
  // GPT-4o family
  "gpt-4o",
  "gpt-4o-mini",
  // o3/o4 reasoning models
  "o3",
  "o3-pro",
  "o4-mini"
];
var ACTIONS = ["chat.completions"];
var ENFORCEMENT_SUPPORT = [
  "model",
  "max_tokens",
  "streaming"
];
var DEFAULT_API_URL = "https://api.openai.com/v1";

export {
  ChatMessageSchema,
  ToolSchema,
  ChatCompletionRequestSchema,
  ChatCompletionChoiceSchema,
  UsageSchema,
  ChatCompletionResponseSchema,
  ChatCompletionChunkSchema,
  PLUGIN_ID,
  RESOURCE_TYPE,
  PROVIDER,
  VERSION,
  DEFAULT_OPENAI_MODELS,
  ACTIONS,
  ENFORCEMENT_SUPPORT,
  DEFAULT_API_URL
};
//# sourceMappingURL=chunk-VWR4ADAV.mjs.map