import {
  ACTIONS,
  ActionOneRequestSchema,
  ActionOneResponseSchema,
  ActionTwoRequestSchema,
  ActionTwoResponseSchema,
  DEFAULT_API_URL,
  ENFORCEMENT_SUPPORT,
  NAME,
  PLUGIN_ID,
  PROVIDER,
  RESOURCE_TYPE,
  VERSION
} from "./chunk-L3B3KZZO.mjs";

// src/client.ts
function template(transport) {
  return {
    transport,
    async actionOne(request, options) {
      return transport.request(
        PLUGIN_ID,
        "action.one",
        request,
        options
      );
    },
    async actionTwo(request, options) {
      return transport.request(
        PLUGIN_ID,
        "action.two",
        request,
        options
      );
    }
  };
}
var client_default = template;
export {
  ACTIONS,
  ActionOneRequestSchema,
  ActionOneResponseSchema,
  ActionTwoRequestSchema,
  ActionTwoResponseSchema,
  DEFAULT_API_URL,
  ENFORCEMENT_SUPPORT,
  NAME,
  PLUGIN_ID,
  PROVIDER,
  RESOURCE_TYPE,
  VERSION,
  client_default as default,
  template
};
//# sourceMappingURL=client.mjs.map