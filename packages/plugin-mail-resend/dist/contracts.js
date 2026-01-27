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

// src/contracts.ts
var contracts_exports = {};
__export(contracts_exports, {
  ACTIONS: () => ACTIONS,
  AttachmentSchema: () => AttachmentSchema,
  ENFORCEMENT_SUPPORT: () => ENFORCEMENT_SUPPORT,
  EmailTagSchema: () => EmailTagSchema,
  PLUGIN_ID: () => PLUGIN_ID,
  PLUGIN_NAME: () => PLUGIN_NAME,
  PROVIDER: () => PROVIDER,
  RESOURCE_TYPE: () => RESOURCE_TYPE,
  ResendErrorResponseSchema: () => ResendErrorResponseSchema,
  SendEmailRequestSchema: () => SendEmailRequestSchema,
  SendEmailResponseSchema: () => SendEmailResponseSchema,
  VERSION: () => VERSION,
  extractDomain: () => extractDomain,
  extractUniqueDomains: () => extractUniqueDomains,
  normalizeToArray: () => normalizeToArray
});
module.exports = __toCommonJS(contracts_exports);
var import_zod = require("zod");
var EmailTagSchema = import_zod.z.object({
  name: import_zod.z.string().min(1),
  value: import_zod.z.string()
});
var AttachmentSchema = import_zod.z.object({
  filename: import_zod.z.string().min(1),
  content: import_zod.z.string(),
  // Base64 encoded
  contentType: import_zod.z.string().optional()
});
var SendEmailRequestSchema = import_zod.z.object({
  // Required fields
  from: import_zod.z.string().email("Invalid 'from' email address"),
  to: import_zod.z.union([
    import_zod.z.string().email("Invalid 'to' email address"),
    import_zod.z.array(import_zod.z.string().email("Invalid 'to' email address")).min(1)
  ]),
  subject: import_zod.z.string().min(1, "Subject cannot be empty"),
  // Content - at least one required
  text: import_zod.z.string().optional(),
  html: import_zod.z.string().optional(),
  // Optional recipients
  cc: import_zod.z.union([
    import_zod.z.string().email("Invalid 'cc' email address"),
    import_zod.z.array(import_zod.z.string().email("Invalid 'cc' email address"))
  ]).optional(),
  bcc: import_zod.z.union([
    import_zod.z.string().email("Invalid 'bcc' email address"),
    import_zod.z.array(import_zod.z.string().email("Invalid 'bcc' email address"))
  ]).optional(),
  // Optional metadata
  reply_to: import_zod.z.union([
    import_zod.z.string().email("Invalid 'reply_to' email address"),
    import_zod.z.array(import_zod.z.string().email("Invalid 'reply_to' email address"))
  ]).optional(),
  headers: import_zod.z.record(import_zod.z.string()).optional(),
  tags: import_zod.z.array(EmailTagSchema).optional(),
  // Optional scheduling (ISO 8601 datetime)
  scheduled_at: import_zod.z.string().datetime().optional(),
  // Optional attachments
  attachments: import_zod.z.array(AttachmentSchema).optional()
}).refine((data) => data.text || data.html, {
  message: "At least one of 'text' or 'html' must be provided",
  path: ["text"]
});
var SendEmailResponseSchema = import_zod.z.object({
  id: import_zod.z.string()
});
var ResendErrorResponseSchema = import_zod.z.object({
  statusCode: import_zod.z.number().optional(),
  message: import_zod.z.string(),
  name: import_zod.z.string().optional()
});
var PLUGIN_ID = "mail:resend";
var RESOURCE_TYPE = "mail";
var PROVIDER = "resend";
var VERSION = "0.1.0";
var PLUGIN_NAME = "Resend Email";
var ACTIONS = ["emails.send"];
var ENFORCEMENT_SUPPORT = [
  "fromDomain",
  "toDomains",
  "recipientCount",
  "hasHtml"
];
function extractDomain(email) {
  const parts = email.split("@");
  return parts[parts.length - 1]?.toLowerCase() || "";
}
function normalizeToArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}
function extractUniqueDomains(emails) {
  const domains = /* @__PURE__ */ new Set();
  for (const email of emails) {
    domains.add(extractDomain(email));
  }
  return Array.from(domains).sort();
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
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
});
//# sourceMappingURL=contracts.js.map