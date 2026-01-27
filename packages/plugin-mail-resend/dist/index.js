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

// src/index.ts
var src_exports = {};
__export(src_exports, {
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
  default: () => proxy_default,
  extractDomain: () => extractDomain,
  extractUniqueDomains: () => extractUniqueDomains,
  normalizeToArray: () => normalizeToArray,
  resendPlugin: () => resendPlugin
});
module.exports = __toCommonJS(src_exports);

// src/proxy.ts
var import_shared = require("@glueco/shared");

// src/contracts.ts
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

// src/proxy.ts
var RESEND_API_URL = "https://api.resend.com";
var DEFAULT_TIMEOUT_MS = 3e4;
var ResendApiError = class extends Error {
  constructor(status, body) {
    super(`Resend API error: ${status}`);
    this.status = status;
    this.body = body;
    this.name = "ResendApiError";
  }
};
function mapResendError(error) {
  let parsed = {};
  try {
    parsed = JSON.parse(error.body);
  } catch {
  }
  const message = parsed.message || error.body;
  switch (error.status) {
    case 400:
      return { status: 400, code: "BAD_REQUEST", message, retryable: false };
    case 401:
      return {
        status: 401,
        code: "UNAUTHORIZED",
        message: "Invalid API key",
        retryable: false
      };
    case 403:
      return { status: 403, code: "FORBIDDEN", message, retryable: false };
    case 404:
      return { status: 404, code: "NOT_FOUND", message, retryable: false };
    case 422:
      return {
        status: 422,
        code: "VALIDATION_ERROR",
        message,
        retryable: false
      };
    case 429:
      return { status: 429, code: "RATE_LIMITED", message, retryable: true };
    case 500:
    case 502:
    case 503:
      return {
        status: error.status,
        code: "PROVIDER_ERROR",
        message,
        retryable: true
      };
    default:
      return {
        status: error.status,
        code: "UNKNOWN",
        message,
        retryable: false
      };
  }
}
function extractEnforcementFields(shaped) {
  const allRecipients = [
    ...shaped.to,
    ...shaped.cc || [],
    ...shaped.bcc || []
  ];
  return {
    fromDomain: extractDomain(shaped.from),
    toDomains: extractUniqueDomains(allRecipients),
    recipientCount: allRecipients.length,
    hasHtml: !!shaped.html,
    hasAttachments: Array.isArray(shaped.attachments) && shaped.attachments.length > 0
  };
}
function toSharedEnforcement(fields) {
  return {
    fromDomain: fields.fromDomain,
    toDomains: fields.toDomains,
    recipientCount: fields.recipientCount
  };
}
var resendPlugin = {
  ...(0, import_shared.createPluginBase)({
    id: PLUGIN_ID,
    resourceType: RESOURCE_TYPE,
    provider: PROVIDER,
    version: VERSION,
    name: PLUGIN_NAME,
    actions: [...ACTIONS],
    supports: {
      enforcement: [...ENFORCEMENT_SUPPORT]
    },
    // Client contract metadata for SDK-compatible plugins
    client: {
      namespace: "resend",
      actions: {
        "emails.send": {
          description: "Send transactional emails via Resend"
        }
      }
    }
  }),
  // Credential schema for UI
  credentialSchema: {
    fields: [
      {
        name: "apiKey",
        type: "secret",
        label: "API Key",
        description: "Your Resend API key (starts with re_)",
        required: true
      }
    ]
  },
  validateAndShape(action, input, constraints) {
    if (action !== "emails.send") {
      return { valid: false, error: `Unsupported action: ${action}` };
    }
    const parsed = SendEmailRequestSchema.safeParse(input);
    if (!parsed.success) {
      const errors = parsed.error.errors.map((e) => {
        const path = e.path.join(".");
        return path ? `${path}: ${e.message}` : e.message;
      });
      return {
        valid: false,
        error: `Invalid request: ${errors.join("; ")}`
      };
    }
    const request = parsed.data;
    const shapedRequest = {
      from: request.from,
      to: normalizeToArray(request.to),
      subject: request.subject,
      text: request.text,
      html: request.html,
      cc: normalizeToArray(request.cc),
      bcc: normalizeToArray(request.bcc),
      reply_to: normalizeToArray(request.reply_to),
      headers: request.headers,
      tags: request.tags,
      scheduled_at: request.scheduled_at,
      attachments: request.attachments
    };
    if (shapedRequest.cc?.length === 0) delete shapedRequest.cc;
    if (shapedRequest.bcc?.length === 0) delete shapedRequest.bcc;
    if (shapedRequest.reply_to?.length === 0) delete shapedRequest.reply_to;
    const resendEnforcement = extractEnforcementFields(shapedRequest);
    const enforcement = toSharedEnforcement(resendEnforcement);
    if (constraints.allowedFromDomains && constraints.allowedFromDomains.length > 0) {
      const allowed = constraints.allowedFromDomains;
      if (!allowed.includes(resendEnforcement.fromDomain)) {
        return {
          valid: false,
          error: `From domain '${resendEnforcement.fromDomain}' not allowed. Allowed: ${allowed.join(", ")}`
        };
      }
    }
    if (constraints.allowedToDomains && constraints.allowedToDomains.length > 0) {
      const allowed = constraints.allowedToDomains;
      const disallowed = resendEnforcement.toDomains.filter(
        (d) => !allowed.includes(d)
      );
      if (disallowed.length > 0) {
        return {
          valid: false,
          error: `Recipient domain(s) not allowed: ${disallowed.join(", ")}. Allowed: ${allowed.join(", ")}`
        };
      }
    }
    if (constraints.maxRecipients !== void 0) {
      const max = constraints.maxRecipients;
      if (resendEnforcement.recipientCount > max) {
        return {
          valid: false,
          error: `Recipient count (${resendEnforcement.recipientCount}) exceeds limit (${max})`
        };
      }
    }
    if (constraints.allowHtml === false && resendEnforcement.hasHtml) {
      return {
        valid: false,
        error: "HTML content is not allowed"
      };
    }
    if (constraints.allowAttachments === false && resendEnforcement.hasAttachments) {
      return {
        valid: false,
        error: "Attachments are not allowed"
      };
    }
    return { valid: true, shapedInput: shapedRequest, enforcement };
  },
  async execute(action, shapedInput, ctx, options) {
    const request = shapedInput;
    const payload = {
      from: request.from,
      to: request.to,
      subject: request.subject
    };
    if (request.text) payload.text = request.text;
    if (request.html) payload.html = request.html;
    if (request.cc?.length) payload.cc = request.cc;
    if (request.bcc?.length) payload.bcc = request.bcc;
    if (request.reply_to?.length) payload.reply_to = request.reply_to;
    if (request.headers) payload.headers = request.headers;
    if (request.tags?.length) payload.tags = request.tags;
    if (request.scheduled_at) payload.scheduled_at = request.scheduled_at;
    if (request.attachments?.length) payload.attachments = request.attachments;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);
    const signal = options.signal ? AbortSignal.any([options.signal, controller.signal]) : controller.signal;
    try {
      const response = await fetch(`${RESEND_API_URL}/emails`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${ctx.secret}`
        },
        body: JSON.stringify(payload),
        signal
      });
      if (!response.ok) {
        const errorBody = await response.text();
        throw new ResendApiError(response.status, errorBody);
      }
      const json = await response.json();
      return {
        response: json,
        contentType: "application/json",
        usage: this.extractUsage(json)
      };
    } finally {
      clearTimeout(timeout);
    }
  },
  extractUsage(_response) {
    return {
      // Custom metrics could be added here
    };
  },
  mapError(error) {
    if (error instanceof ResendApiError) {
      return mapResendError(error);
    }
    if (error instanceof Error && error.name === "AbortError") {
      return {
        status: 504,
        code: "TIMEOUT",
        message: "Request timed out",
        retryable: true
      };
    }
    return {
      status: 500,
      code: "INTERNAL_ERROR",
      message: error instanceof Error ? error.message : "Unknown error",
      retryable: false
    };
  }
};
var proxy_default = resendPlugin;
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
  normalizeToArray,
  resendPlugin
});
//# sourceMappingURL=index.js.map