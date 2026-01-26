import {
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
  VERSION
} from "./chunk-P5DH3YX2.mjs";

// src/client.ts
function gemini(transport) {
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
      return transport.requestStream(PLUGIN_ID, "chat.completions", request, options);
    }
  };
}
var client_default = gemini;
export {
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
  client_default as default,
  gemini
};
//# sourceMappingURL=client.mjs.map