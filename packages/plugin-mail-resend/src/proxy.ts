// ============================================
// RESEND PLUGIN PROXY
// Server-side plugin implementation for the gateway
// ============================================
//
// This module is imported by the proxy to handle Resend email requests.
// It should NOT be imported by target apps.
//
// Import path: @glueco/plugin-mail-resend/proxy
// ============================================

import type {
  PluginContract,
  PluginResourceConstraints,
  PluginValidationResult,
  PluginExecuteContext,
  PluginExecuteOptions,
  PluginExecuteResult,
  PluginUsageMetrics,
  PluginMappedError,
  EnforcementFields,
} from "@glueco/shared";
import { createPluginBase } from "@glueco/shared";

import {
  SendEmailRequestSchema,
  type SendEmailRequest,
  type ShapedSendEmailRequest,
  type ResendEnforcementFields,
  PLUGIN_ID,
  RESOURCE_TYPE,
  PROVIDER,
  VERSION,
  PLUGIN_NAME,
  ACTIONS,
  ENFORCEMENT_SUPPORT,
  extractDomain,
  normalizeToArray,
  extractUniqueDomains,
} from "./contracts";

// ============================================
// CONFIGURATION
// ============================================

const RESEND_API_URL = "https://api.resend.com";
const DEFAULT_TIMEOUT_MS = 30_000;

// ============================================
// ERROR HANDLING
// ============================================

class ResendApiError extends Error {
  constructor(
    public status: number,
    public body: string,
  ) {
    super(`Resend API error: ${status}`);
    this.name = "ResendApiError";
  }
}

function mapResendError(error: ResendApiError): PluginMappedError {
  let parsed: { message?: string; name?: string; statusCode?: number } = {};
  try {
    parsed = JSON.parse(error.body);
  } catch {
    // Ignore parse errors
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
        retryable: false,
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
        retryable: false,
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
        retryable: true,
      };
    default:
      return {
        status: error.status,
        code: "UNKNOWN",
        message,
        retryable: false,
      };
  }
}

// ============================================
// ENFORCEMENT HELPERS
// ============================================

/**
 * Extract enforcement fields from shaped request.
 * These are used for policy enforcement.
 */
function extractEnforcementFields(
  shaped: ShapedSendEmailRequest,
): ResendEnforcementFields {
  const allRecipients = [
    ...shaped.to,
    ...(shaped.cc || []),
    ...(shaped.bcc || []),
  ];

  return {
    fromDomain: extractDomain(shaped.from),
    toDomains: extractUniqueDomains(allRecipients),
    recipientCount: allRecipients.length,
    hasHtml: !!shaped.html,
    hasAttachments:
      Array.isArray(shaped.attachments) && shaped.attachments.length > 0,
  };
}

/**
 * Convert ResendEnforcementFields to shared EnforcementFields format.
 */
function toSharedEnforcement(
  fields: ResendEnforcementFields,
): EnforcementFields {
  return {
    fromDomain: fields.fromDomain,
    toDomains: fields.toDomains,
    recipientCount: fields.recipientCount,
  };
}

// ============================================
// PLUGIN IMPLEMENTATION
// ============================================

const resendPlugin: PluginContract = {
  ...createPluginBase({
    id: PLUGIN_ID,
    resourceType: RESOURCE_TYPE,
    provider: PROVIDER,
    version: VERSION,
    name: PLUGIN_NAME,
    actions: [...ACTIONS],
    supports: {
      enforcement: [...ENFORCEMENT_SUPPORT],
    },
    // Client contract metadata for SDK-compatible plugins
    client: {
      namespace: "resend",
      actions: {
        "emails.send": {
          description: "Send transactional emails via Resend",
        },
      },
    },
  }),

  // Credential schema for UI
  credentialSchema: {
    fields: [
      {
        name: "apiKey",
        type: "secret",
        label: "API Key",
        description: "Your Resend API key (starts with re_)",
        required: true,
      },
    ],
  },

  validateAndShape(
    action: string,
    input: unknown,
    constraints: PluginResourceConstraints,
  ): PluginValidationResult {
    if (action !== "emails.send") {
      return { valid: false, error: `Unsupported action: ${action}` };
    }

    // Parse input - schema-first validation
    const parsed = SendEmailRequestSchema.safeParse(input);
    if (!parsed.success) {
      const errors = parsed.error.errors.map((e) => {
        const path = e.path.join(".");
        return path ? `${path}: ${e.message}` : e.message;
      });
      return {
        valid: false,
        error: `Invalid request: ${errors.join("; ")}`,
      };
    }

    const request = parsed.data;

    // Normalize to arrays for consistent processing
    const shapedRequest: ShapedSendEmailRequest = {
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
      attachments: request.attachments,
    };

    // Remove empty arrays
    if (shapedRequest.cc?.length === 0) delete shapedRequest.cc;
    if (shapedRequest.bcc?.length === 0) delete shapedRequest.bcc;
    if (shapedRequest.reply_to?.length === 0) delete shapedRequest.reply_to;

    // Extract enforcement fields
    const resendEnforcement = extractEnforcementFields(shapedRequest);
    const enforcement = toSharedEnforcement(resendEnforcement);

    // ----------------------------------------
    // Plugin-level constraint enforcement
    // ----------------------------------------

    // Check allowedFromDomains
    if (
      constraints.allowedFromDomains &&
      constraints.allowedFromDomains.length > 0
    ) {
      const allowed = constraints.allowedFromDomains as string[];
      if (!allowed.includes(resendEnforcement.fromDomain)) {
        return {
          valid: false,
          error: `From domain '${resendEnforcement.fromDomain}' not allowed. Allowed: ${allowed.join(", ")}`,
        };
      }
    }

    // Check allowedToDomains
    if (
      constraints.allowedToDomains &&
      constraints.allowedToDomains.length > 0
    ) {
      const allowed = constraints.allowedToDomains as string[];
      const disallowed = resendEnforcement.toDomains.filter(
        (d) => !allowed.includes(d),
      );
      if (disallowed.length > 0) {
        return {
          valid: false,
          error: `Recipient domain(s) not allowed: ${disallowed.join(", ")}. Allowed: ${allowed.join(", ")}`,
        };
      }
    }

    // Check maxRecipients
    if (constraints.maxRecipients !== undefined) {
      const max = constraints.maxRecipients as number;
      if (resendEnforcement.recipientCount > max) {
        return {
          valid: false,
          error: `Recipient count (${resendEnforcement.recipientCount}) exceeds limit (${max})`,
        };
      }
    }

    // Check allowHtml (if set to false)
    if (constraints.allowHtml === false && resendEnforcement.hasHtml) {
      return {
        valid: false,
        error: "HTML content is not allowed",
      };
    }

    // Check allowAttachments (if set to false)
    if (
      constraints.allowAttachments === false &&
      resendEnforcement.hasAttachments
    ) {
      return {
        valid: false,
        error: "Attachments are not allowed",
      };
    }

    return { valid: true, shapedInput: shapedRequest, enforcement };
  },

  async execute(
    action: string,
    shapedInput: unknown,
    ctx: PluginExecuteContext,
    options: PluginExecuteOptions,
  ): Promise<PluginExecuteResult> {
    const request = shapedInput as ShapedSendEmailRequest;

    // Build Resend API payload
    const payload: Record<string, unknown> = {
      from: request.from,
      to: request.to,
      subject: request.subject,
    };

    // Add optional fields
    if (request.text) payload.text = request.text;
    if (request.html) payload.html = request.html;
    if (request.cc?.length) payload.cc = request.cc;
    if (request.bcc?.length) payload.bcc = request.bcc;
    if (request.reply_to?.length) payload.reply_to = request.reply_to;
    if (request.headers) payload.headers = request.headers;
    if (request.tags?.length) payload.tags = request.tags;
    if (request.scheduled_at) payload.scheduled_at = request.scheduled_at;
    if (request.attachments?.length) payload.attachments = request.attachments;

    // Create timeout controller
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

    // Combine with provided signal
    const signal = options.signal
      ? AbortSignal.any([options.signal, controller.signal])
      : controller.signal;

    try {
      const response = await fetch(`${RESEND_API_URL}/emails`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${ctx.secret}`,
        },
        body: JSON.stringify(payload),
        signal,
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new ResendApiError(response.status, errorBody);
      }

      const json = await response.json();
      return {
        response: json,
        contentType: "application/json",
        usage: this.extractUsage(json),
      };
    } finally {
      clearTimeout(timeout);
    }
  },

  extractUsage(_response: unknown): PluginUsageMetrics {
    // For email, we count as 1 email sent
    // Future: could track recipients, attachments size, etc.
    return {
      // Custom metrics could be added here
    };
  },

  mapError(error: unknown): PluginMappedError {
    if (error instanceof ResendApiError) {
      return mapResendError(error);
    }

    if (error instanceof Error && error.name === "AbortError") {
      return {
        status: 504,
        code: "TIMEOUT",
        message: "Request timed out",
        retryable: true,
      };
    }

    return {
      status: 500,
      code: "INTERNAL_ERROR",
      message: error instanceof Error ? error.message : "Unknown error",
      retryable: false,
    };
  },
};

export default resendPlugin;

// Also export named for flexibility
export { resendPlugin };
