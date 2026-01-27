// src/contracts.ts
import { z } from "zod";
var EmailTagSchema = z.object({
  name: z.string().min(1),
  value: z.string()
});
var AttachmentSchema = z.object({
  filename: z.string().min(1),
  content: z.string(),
  // Base64 encoded
  contentType: z.string().optional()
});
var SendEmailRequestSchema = z.object({
  // Required fields
  from: z.string().email("Invalid 'from' email address"),
  to: z.union([
    z.string().email("Invalid 'to' email address"),
    z.array(z.string().email("Invalid 'to' email address")).min(1)
  ]),
  subject: z.string().min(1, "Subject cannot be empty"),
  // Content - at least one required
  text: z.string().optional(),
  html: z.string().optional(),
  // Optional recipients
  cc: z.union([
    z.string().email("Invalid 'cc' email address"),
    z.array(z.string().email("Invalid 'cc' email address"))
  ]).optional(),
  bcc: z.union([
    z.string().email("Invalid 'bcc' email address"),
    z.array(z.string().email("Invalid 'bcc' email address"))
  ]).optional(),
  // Optional metadata
  reply_to: z.union([
    z.string().email("Invalid 'reply_to' email address"),
    z.array(z.string().email("Invalid 'reply_to' email address"))
  ]).optional(),
  headers: z.record(z.string()).optional(),
  tags: z.array(EmailTagSchema).optional(),
  // Optional scheduling (ISO 8601 datetime)
  scheduled_at: z.string().datetime().optional(),
  // Optional attachments
  attachments: z.array(AttachmentSchema).optional()
}).refine((data) => data.text || data.html, {
  message: "At least one of 'text' or 'html' must be provided",
  path: ["text"]
});
var SendEmailResponseSchema = z.object({
  id: z.string()
});
var ResendErrorResponseSchema = z.object({
  statusCode: z.number().optional(),
  message: z.string(),
  name: z.string().optional()
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

export {
  EmailTagSchema,
  AttachmentSchema,
  SendEmailRequestSchema,
  SendEmailResponseSchema,
  ResendErrorResponseSchema,
  PLUGIN_ID,
  RESOURCE_TYPE,
  PROVIDER,
  VERSION,
  PLUGIN_NAME,
  ACTIONS,
  ENFORCEMENT_SUPPORT,
  extractDomain,
  normalizeToArray,
  extractUniqueDomains
};
//# sourceMappingURL=chunk-TWLFBQ3L.mjs.map