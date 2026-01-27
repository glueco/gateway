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

// src/client.ts
var client_exports = {};
__export(client_exports, {
  ACTIONS: () => ACTIONS,
  ChatCompletionChoiceSchema: () => ChatCompletionChoiceSchema,
  ChatCompletionChunkSchema: () => ChatCompletionChunkSchema,
  ChatCompletionRequestSchema: () => ChatCompletionRequestSchema,
  ChatCompletionResponseSchema: () => ChatCompletionResponseSchema,
  ChatMessageSchema: () => ChatMessageSchema,
  DEFAULT_API_URL: () => DEFAULT_API_URL,
  DEFAULT_OPENAI_MODELS: () => DEFAULT_OPENAI_MODELS,
  ENFORCEMENT_SUPPORT: () => ENFORCEMENT_SUPPORT,
  PLUGIN_ID: () => PLUGIN_ID,
  PROVIDER: () => PROVIDER,
  RESOURCE_TYPE: () => RESOURCE_TYPE,
  ToolSchema: () => ToolSchema,
  UsageSchema: () => UsageSchema,
  VERSION: () => VERSION,
  default: () => client_default,
  openai: () => openai
});
module.exports = __toCommonJS(client_exports);

// src/contracts.ts
var import_zod = require("zod");
var ChatMessageSchema = import_zod.z.object({
  role: import_zod.z.enum(["system", "user", "assistant", "tool", "function"]),
  content: import_zod.z.union([
    import_zod.z.string(),
    import_zod.z.array(
      import_zod.z.object({
        type: import_zod.z.enum(["text", "image_url"]),
        text: import_zod.z.string().optional(),
        image_url: import_zod.z.object({
          url: import_zod.z.string(),
          detail: import_zod.z.enum(["auto", "low", "high"]).optional()
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
  tool_call_id: import_zod.z.string().optional(),
  function_call: import_zod.z.object({
    name: import_zod.z.string(),
    arguments: import_zod.z.string()
  }).optional()
});
var ToolSchema = import_zod.z.object({
  type: import_zod.z.literal("function"),
  function: import_zod.z.object({
    name: import_zod.z.string(),
    description: import_zod.z.string().optional(),
    parameters: import_zod.z.record(import_zod.z.unknown()).optional(),
    strict: import_zod.z.boolean().optional()
  })
});
var ChatCompletionRequestSchema = import_zod.z.object({
  model: import_zod.z.string(),
  messages: import_zod.z.array(ChatMessageSchema),
  temperature: import_zod.z.number().min(0).max(2).optional(),
  top_p: import_zod.z.number().min(0).max(1).optional(),
  n: import_zod.z.number().int().min(1).max(10).optional(),
  stream: import_zod.z.boolean().optional(),
  stream_options: import_zod.z.object({
    include_usage: import_zod.z.boolean().optional()
  }).optional(),
  stop: import_zod.z.union([import_zod.z.string(), import_zod.z.array(import_zod.z.string())]).optional(),
  max_tokens: import_zod.z.number().int().positive().optional(),
  max_completion_tokens: import_zod.z.number().int().positive().optional(),
  presence_penalty: import_zod.z.number().min(-2).max(2).optional(),
  frequency_penalty: import_zod.z.number().min(-2).max(2).optional(),
  logit_bias: import_zod.z.record(import_zod.z.number()).optional(),
  logprobs: import_zod.z.boolean().optional(),
  top_logprobs: import_zod.z.number().int().min(0).max(20).optional(),
  user: import_zod.z.string().optional(),
  tools: import_zod.z.array(ToolSchema).optional(),
  tool_choice: import_zod.z.union([
    import_zod.z.literal("none"),
    import_zod.z.literal("auto"),
    import_zod.z.literal("required"),
    import_zod.z.object({
      type: import_zod.z.literal("function"),
      function: import_zod.z.object({ name: import_zod.z.string() })
    })
  ]).optional(),
  parallel_tool_calls: import_zod.z.boolean().optional(),
  response_format: import_zod.z.union([
    import_zod.z.object({ type: import_zod.z.literal("text") }),
    import_zod.z.object({ type: import_zod.z.literal("json_object") }),
    import_zod.z.object({
      type: import_zod.z.literal("json_schema"),
      json_schema: import_zod.z.object({
        name: import_zod.z.string(),
        description: import_zod.z.string().optional(),
        schema: import_zod.z.record(import_zod.z.unknown()),
        strict: import_zod.z.boolean().optional()
      })
    })
  ]).optional(),
  seed: import_zod.z.number().int().optional(),
  service_tier: import_zod.z.enum(["auto", "default"]).optional()
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
    ).optional(),
    function_call: import_zod.z.object({
      name: import_zod.z.string(),
      arguments: import_zod.z.string()
    }).optional(),
    refusal: import_zod.z.string().nullable().optional()
  }),
  finish_reason: import_zod.z.enum(["stop", "length", "tool_calls", "content_filter", "function_call"]).nullable(),
  logprobs: import_zod.z.object({
    content: import_zod.z.array(
      import_zod.z.object({
        token: import_zod.z.string(),
        logprob: import_zod.z.number(),
        bytes: import_zod.z.array(import_zod.z.number()).nullable(),
        top_logprobs: import_zod.z.array(
          import_zod.z.object({
            token: import_zod.z.string(),
            logprob: import_zod.z.number(),
            bytes: import_zod.z.array(import_zod.z.number()).nullable()
          })
        )
      })
    ).nullable()
  }).nullable().optional()
});
var UsageSchema = import_zod.z.object({
  prompt_tokens: import_zod.z.number(),
  completion_tokens: import_zod.z.number(),
  total_tokens: import_zod.z.number(),
  prompt_tokens_details: import_zod.z.object({
    cached_tokens: import_zod.z.number().optional()
  }).optional(),
  completion_tokens_details: import_zod.z.object({
    reasoning_tokens: import_zod.z.number().optional()
  }).optional()
});
var ChatCompletionResponseSchema = import_zod.z.object({
  id: import_zod.z.string(),
  object: import_zod.z.literal("chat.completion"),
  created: import_zod.z.number(),
  model: import_zod.z.string(),
  choices: import_zod.z.array(ChatCompletionChoiceSchema),
  usage: UsageSchema.optional(),
  system_fingerprint: import_zod.z.string().optional(),
  service_tier: import_zod.z.string().optional()
});
var ChatCompletionChunkSchema = import_zod.z.object({
  id: import_zod.z.string(),
  object: import_zod.z.literal("chat.completion.chunk"),
  created: import_zod.z.number(),
  model: import_zod.z.string(),
  system_fingerprint: import_zod.z.string().optional(),
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
        ).optional(),
        refusal: import_zod.z.string().nullable().optional()
      }),
      finish_reason: import_zod.z.enum([
        "stop",
        "length",
        "tool_calls",
        "content_filter",
        "function_call"
      ]).nullable(),
      logprobs: import_zod.z.object({
        content: import_zod.z.array(
          import_zod.z.object({
            token: import_zod.z.string(),
            logprob: import_zod.z.number(),
            bytes: import_zod.z.array(import_zod.z.number()).nullable(),
            top_logprobs: import_zod.z.array(
              import_zod.z.object({
                token: import_zod.z.string(),
                logprob: import_zod.z.number(),
                bytes: import_zod.z.array(import_zod.z.number()).nullable()
              })
            )
          })
        ).nullable()
      }).nullable().optional()
    })
  ),
  usage: UsageSchema.optional(),
  service_tier: import_zod.z.string().optional()
});
var PLUGIN_ID = "llm:openai";
var RESOURCE_TYPE = "llm";
var PROVIDER = "openai";
var VERSION = "1.0.0";
var DEFAULT_OPENAI_MODELS = [
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
  "o1-mini-2024-09-12"
];
var ACTIONS = ["chat.completions"];
var ENFORCEMENT_SUPPORT = [
  "model",
  "max_tokens",
  "streaming"
];
var DEFAULT_API_URL = "https://api.openai.com/v1";

// src/client.ts
function openai(transport) {
  return {
    transport,
    async chatCompletions(request, options) {
      const payload = { ...request, stream: false };
      return transport.request(
        PLUGIN_ID,
        "chat.completions",
        payload,
        options
      );
    },
    async chatCompletionsStream(request, options) {
      return transport.requestStream(
        PLUGIN_ID,
        "chat.completions",
        request,
        options
      );
    }
  };
}
var client_default = openai;
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  ACTIONS,
  ChatCompletionChoiceSchema,
  ChatCompletionChunkSchema,
  ChatCompletionRequestSchema,
  ChatCompletionResponseSchema,
  ChatMessageSchema,
  DEFAULT_API_URL,
  DEFAULT_OPENAI_MODELS,
  ENFORCEMENT_SUPPORT,
  PLUGIN_ID,
  PROVIDER,
  RESOURCE_TYPE,
  ToolSchema,
  UsageSchema,
  VERSION,
  openai
});
//# sourceMappingURL=client.js.map