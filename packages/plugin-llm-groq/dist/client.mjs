import {
  ACTIONS,
  ChatCompletionChoiceSchema,
  ChatCompletionChunkSchema,
  ChatCompletionRequestSchema,
  ChatCompletionResponseSchema,
  ChatMessageSchema,
  DEFAULT_GROQ_MODELS,
  ENFORCEMENT_SUPPORT,
  PLUGIN_ID,
  PROVIDER,
  RESOURCE_TYPE,
  UsageSchema,
  VERSION
} from "./chunk-MRDVVFUV.mjs";

// src/client.ts
function groq(transport) {
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
var client_default = groq;
export {
  ACTIONS,
  ChatCompletionChoiceSchema,
  ChatCompletionChunkSchema,
  ChatCompletionRequestSchema,
  ChatCompletionResponseSchema,
  ChatMessageSchema,
  DEFAULT_GROQ_MODELS,
  ENFORCEMENT_SUPPORT,
  PLUGIN_ID,
  PROVIDER,
  RESOURCE_TYPE,
  UsageSchema,
  VERSION,
  client_default as default,
  groq
};
//# sourceMappingURL=client.mjs.map