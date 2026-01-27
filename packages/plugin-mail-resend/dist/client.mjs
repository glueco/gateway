import {
  ACTIONS,
  AttachmentSchema,
  ENFORCEMENT_SUPPORT,
  EmailTagSchema,
  PLUGIN_ID,
  PLUGIN_NAME,
  PROVIDER,
  RESOURCE_TYPE,
  ResendErrorResponseSchema,
  SendEmailRequestSchema,
  SendEmailResponseSchema,
  VERSION,
  extractDomain,
  extractUniqueDomains,
  normalizeToArray
} from "./chunk-TWLFBQ3L.mjs";

// src/client.ts
function resend(transport) {
  return {
    transport,
    emails: {
      async send(request, options) {
        return transport.request(
          PLUGIN_ID,
          "emails.send",
          request,
          options
        );
      }
    }
  };
}
var client_default = resend;
export {
  ACTIONS,
  AttachmentSchema,
  ENFORCEMENT_SUPPORT,
  EmailTagSchema,
  PLUGIN_ID,
  PLUGIN_NAME,
  PROVIDER,
  RESOURCE_TYPE,
  ResendErrorResponseSchema,
  SendEmailRequestSchema,
  SendEmailResponseSchema,
  VERSION,
  client_default as default,
  extractDomain,
  extractUniqueDomains,
  normalizeToArray,
  resend
};
//# sourceMappingURL=client.mjs.map