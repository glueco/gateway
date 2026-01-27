import {
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
  VERSION
} from "./chunk-6FNYHOB5.mjs";

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
export {
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
  client_default as default,
  openai
};
//# sourceMappingURL=client.mjs.map