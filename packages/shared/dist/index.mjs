import { z } from 'zod';

// src/errors.ts
var ErrorCode = /* @__PURE__ */ ((ErrorCode2) => {
  ErrorCode2["ERR_RESOURCE_REQUIRED"] = "ERR_RESOURCE_REQUIRED";
  ErrorCode2["ERR_UNKNOWN_RESOURCE"] = "ERR_UNKNOWN_RESOURCE";
  ErrorCode2["ERR_RESOURCE_NOT_CONFIGURED"] = "ERR_RESOURCE_NOT_CONFIGURED";
  ErrorCode2["ERR_UNSUPPORTED_ACTION"] = "ERR_UNSUPPORTED_ACTION";
  ErrorCode2["ERR_MISSING_AUTH"] = "ERR_MISSING_AUTH";
  ErrorCode2["ERR_INVALID_SIGNATURE"] = "ERR_INVALID_SIGNATURE";
  ErrorCode2["ERR_EXPIRED_TIMESTAMP"] = "ERR_EXPIRED_TIMESTAMP";
  ErrorCode2["ERR_INVALID_NONCE"] = "ERR_INVALID_NONCE";
  ErrorCode2["ERR_APP_NOT_FOUND"] = "ERR_APP_NOT_FOUND";
  ErrorCode2["ERR_APP_DISABLED"] = "ERR_APP_DISABLED";
  ErrorCode2["ERR_PERMISSION_DENIED"] = "ERR_PERMISSION_DENIED";
  ErrorCode2["ERR_CONSTRAINT_VIOLATION"] = "ERR_CONSTRAINT_VIOLATION";
  ErrorCode2["ERR_RATE_LIMIT_EXCEEDED"] = "ERR_RATE_LIMIT_EXCEEDED";
  ErrorCode2["ERR_BUDGET_EXCEEDED"] = "ERR_BUDGET_EXCEEDED";
  ErrorCode2["ERR_INVALID_REQUEST"] = "ERR_INVALID_REQUEST";
  ErrorCode2["ERR_INVALID_JSON"] = "ERR_INVALID_JSON";
  ErrorCode2["ERR_INTERNAL"] = "ERR_INTERNAL";
  ErrorCode2["ERR_UPSTREAM_ERROR"] = "ERR_UPSTREAM_ERROR";
  ErrorCode2["ERR_INVALID_PAIRING_STRING"] = "ERR_INVALID_PAIRING_STRING";
  ErrorCode2["ERR_INVALID_CONNECT_CODE"] = "ERR_INVALID_CONNECT_CODE";
  ErrorCode2["ERR_SESSION_EXPIRED"] = "ERR_SESSION_EXPIRED";
  return ErrorCode2;
})(ErrorCode || {});
function getErrorStatus(code) {
  switch (code) {
    case "ERR_RESOURCE_REQUIRED" /* ERR_RESOURCE_REQUIRED */:
    case "ERR_INVALID_REQUEST" /* ERR_INVALID_REQUEST */:
    case "ERR_INVALID_JSON" /* ERR_INVALID_JSON */:
    case "ERR_CONSTRAINT_VIOLATION" /* ERR_CONSTRAINT_VIOLATION */:
    case "ERR_INVALID_PAIRING_STRING" /* ERR_INVALID_PAIRING_STRING */:
    case "ERR_INVALID_CONNECT_CODE" /* ERR_INVALID_CONNECT_CODE */:
      return 400;
    case "ERR_MISSING_AUTH" /* ERR_MISSING_AUTH */:
    case "ERR_INVALID_SIGNATURE" /* ERR_INVALID_SIGNATURE */:
    case "ERR_EXPIRED_TIMESTAMP" /* ERR_EXPIRED_TIMESTAMP */:
    case "ERR_INVALID_NONCE" /* ERR_INVALID_NONCE */:
      return 401;
    case "ERR_PERMISSION_DENIED" /* ERR_PERMISSION_DENIED */:
    case "ERR_APP_DISABLED" /* ERR_APP_DISABLED */:
      return 403;
    case "ERR_APP_NOT_FOUND" /* ERR_APP_NOT_FOUND */:
    case "ERR_UNKNOWN_RESOURCE" /* ERR_UNKNOWN_RESOURCE */:
    case "ERR_UNSUPPORTED_ACTION" /* ERR_UNSUPPORTED_ACTION */:
      return 404;
    case "ERR_SESSION_EXPIRED" /* ERR_SESSION_EXPIRED */:
      return 410;
    case "ERR_RATE_LIMIT_EXCEEDED" /* ERR_RATE_LIMIT_EXCEEDED */:
    case "ERR_BUDGET_EXCEEDED" /* ERR_BUDGET_EXCEEDED */:
      return 429;
    case "ERR_RESOURCE_NOT_CONFIGURED" /* ERR_RESOURCE_NOT_CONFIGURED */:
    case "ERR_INTERNAL" /* ERR_INTERNAL */:
    case "ERR_UPSTREAM_ERROR" /* ERR_UPSTREAM_ERROR */:
      return 500;
    default:
      return 500;
  }
}
var GatewayError = class extends Error {
  constructor(code, message, details) {
    super(message);
    this.name = "GatewayError";
    this.code = code;
    this.status = getErrorStatus(code);
    this.details = details;
  }
  toJSON() {
    return {
      error: {
        code: this.code,
        message: this.message,
        ...this.details && { details: this.details }
      }
    };
  }
};
function resourceRequiredError(hint) {
  const message = hint ? `Resource not specified. ${hint}` : "Resource not specified. Set baseURL to /r/<resourceType>/<provider>/v1 or provide x-gateway-resource header.";
  return new GatewayError("ERR_RESOURCE_REQUIRED" /* ERR_RESOURCE_REQUIRED */, message, {
    examples: {
      groq: "/r/llm/groq/v1/chat/completions",
      gemini: "/r/llm/gemini/v1/chat/completions",
      header: "x-gateway-resource: llm:groq"
    }
  });
}
var ChatMessageSchema = z.object({
  role: z.enum(["system", "user", "assistant", "tool"]),
  content: z.union([
    z.string(),
    z.array(
      z.object({
        type: z.string(),
        text: z.string().optional(),
        image_url: z.object({
          url: z.string(),
          detail: z.string().optional()
        }).optional()
      })
    )
  ]).nullable(),
  name: z.string().optional(),
  tool_calls: z.array(
    z.object({
      id: z.string(),
      type: z.literal("function"),
      function: z.object({
        name: z.string(),
        arguments: z.string()
      })
    })
  ).optional(),
  tool_call_id: z.string().optional()
});
var ChatCompletionRequestSchema = z.object({
  model: z.string(),
  messages: z.array(ChatMessageSchema),
  temperature: z.number().min(0).max(2).optional(),
  top_p: z.number().min(0).max(1).optional(),
  n: z.number().int().min(1).max(10).optional(),
  stream: z.boolean().optional(),
  stop: z.union([z.string(), z.array(z.string())]).optional(),
  max_tokens: z.number().int().positive().optional(),
  max_completion_tokens: z.number().int().positive().optional(),
  presence_penalty: z.number().min(-2).max(2).optional(),
  frequency_penalty: z.number().min(-2).max(2).optional(),
  logit_bias: z.record(z.number()).optional(),
  user: z.string().optional(),
  tools: z.array(
    z.object({
      type: z.literal("function"),
      function: z.object({
        name: z.string(),
        description: z.string().optional(),
        parameters: z.record(z.unknown()).optional()
      })
    })
  ).optional(),
  tool_choice: z.union([
    z.literal("none"),
    z.literal("auto"),
    z.literal("required"),
    z.object({
      type: z.literal("function"),
      function: z.object({ name: z.string() })
    })
  ]).optional(),
  response_format: z.object({
    type: z.enum(["text", "json_object"])
  }).optional(),
  seed: z.number().int().optional()
});
var PermissionRequestSchema = z.object({
  resourceId: z.string().regex(/^[a-z]+:[a-z0-9-]+$/, {
    message: "Invalid resource ID format. Expected: <resourceType>:<provider>"
  }),
  actions: z.array(z.string()).min(1),
  constraints: z.record(z.unknown()).optional()
});
var AppMetadataSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  homepage: z.string().url().optional()
});
var InstallRequestSchema = z.object({
  connectCode: z.string().min(16),
  app: AppMetadataSchema,
  publicKey: z.string().min(40),
  requestedPermissions: z.array(PermissionRequestSchema).min(1),
  redirectUri: z.string().url()
});

// src/access-policy.ts
function getExpiryFromPreset(preset) {
  const now = /* @__PURE__ */ new Date();
  switch (preset) {
    case "1_hour":
      return new Date(now.getTime() + 60 * 60 * 1e3);
    case "4_hours":
      return new Date(now.getTime() + 4 * 60 * 60 * 1e3);
    case "today":
      const endOfDay = new Date(now);
      endOfDay.setHours(23, 59, 59, 999);
      return endOfDay;
    case "24_hours":
      return new Date(now.getTime() + 24 * 60 * 60 * 1e3);
    case "this_week":
      const endOfWeek = new Date(now);
      const daysUntilSunday = 7 - endOfWeek.getDay();
      endOfWeek.setDate(endOfWeek.getDate() + daysUntilSunday);
      endOfWeek.setHours(23, 59, 59, 999);
      return endOfWeek;
    case "1_month":
      return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1e3);
    case "3_months":
      return new Date(now.getTime() + 90 * 24 * 60 * 60 * 1e3);
    case "1_year":
      return new Date(now.getTime() + 365 * 24 * 60 * 60 * 1e3);
    case "never":
      return null;
    case "custom":
      return null;
    // Custom requires manual date input
    default:
      return null;
  }
}
var EXPIRY_PRESETS = [
  {
    value: "1_hour",
    label: "1 hour",
    description: "Expires in 1 hour",
    getDate: () => getExpiryFromPreset("1_hour")
  },
  {
    value: "4_hours",
    label: "4 hours",
    description: "Expires in 4 hours",
    getDate: () => getExpiryFromPreset("4_hours")
  },
  {
    value: "today",
    label: "End of today",
    description: "Expires at midnight",
    getDate: () => getExpiryFromPreset("today")
  },
  {
    value: "24_hours",
    label: "24 hours",
    description: "Expires in 24 hours",
    getDate: () => getExpiryFromPreset("24_hours")
  },
  {
    value: "this_week",
    label: "This week",
    description: "Expires end of week",
    getDate: () => getExpiryFromPreset("this_week")
  },
  {
    value: "1_month",
    label: "1 month",
    description: "Expires in 30 days",
    getDate: () => getExpiryFromPreset("1_month")
  },
  {
    value: "3_months",
    label: "3 months",
    description: "Expires in 90 days",
    getDate: () => getExpiryFromPreset("3_months")
  },
  {
    value: "1_year",
    label: "1 year",
    description: "Expires in 1 year",
    getDate: () => getExpiryFromPreset("1_year")
  },
  {
    value: "never",
    label: "Never",
    description: "No expiration",
    getDate: () => null
  },
  {
    value: "custom",
    label: "Custom",
    description: "Set custom date",
    getDate: () => null
  }
];
var RATE_LIMIT_PRESETS = [
  {
    label: "5 per minute (very restricted)",
    value: { maxRequests: 5, windowSeconds: 60 }
  },
  { label: "10 per minute", value: { maxRequests: 10, windowSeconds: 60 } },
  { label: "30 per minute", value: { maxRequests: 30, windowSeconds: 60 } },
  {
    label: "60 per minute (standard)",
    value: { maxRequests: 60, windowSeconds: 60 }
  },
  { label: "100 per hour", value: { maxRequests: 100, windowSeconds: 3600 } },
  { label: "500 per hour", value: { maxRequests: 500, windowSeconds: 3600 } },
  { label: "1000 per day", value: { maxRequests: 1e3, windowSeconds: 86400 } }
];
function isPermissionValidNow(policy) {
  const now = /* @__PURE__ */ new Date();
  if (policy.validFrom) {
    const validFromDate = new Date(policy.validFrom);
    if (now < validFromDate) {
      return {
        valid: false,
        reason: `Permission not yet valid. Starts at ${validFromDate.toISOString()}`
      };
    }
  }
  if (policy.expiresAt) {
    const expiresAtDate = new Date(policy.expiresAt);
    if (now > expiresAtDate) {
      return {
        valid: false,
        reason: `Permission expired at ${expiresAtDate.toISOString()}`
      };
    }
  }
  if (policy.timeWindow) {
    const { startHour, endHour, timezone, allowedDays } = policy.timeWindow;
    const formatter = new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      hour12: false,
      timeZone: timezone
    });
    const currentHour = parseInt(formatter.format(now), 10);
    const dayFormatter = new Intl.DateTimeFormat("en-US", {
      weekday: "short",
      timeZone: timezone
    });
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const currentDayName = dayFormatter.format(now);
    const currentDay = dayNames.indexOf(currentDayName.slice(0, 3));
    if (allowedDays && allowedDays.length > 0 && !allowedDays.includes(currentDay)) {
      return {
        valid: false,
        reason: `Access not allowed on this day (${currentDayName})`
      };
    }
    let inWindow;
    if (startHour <= endHour) {
      inWindow = currentHour >= startHour && currentHour < endHour;
    } else {
      inWindow = currentHour >= startHour || currentHour < endHour;
    }
    if (!inWindow) {
      return {
        valid: false,
        reason: `Access only allowed between ${startHour}:00-${endHour}:00 ${timezone}`
      };
    }
  }
  return { valid: true };
}
function formatAccessPolicySummary(policy) {
  const summary = [];
  if (policy.expiresAt) {
    const date = new Date(policy.expiresAt);
    summary.push(
      `Expires: ${date.toLocaleDateString()} ${date.toLocaleTimeString()}`
    );
  }
  if (policy.validFrom) {
    const date = new Date(policy.validFrom);
    summary.push(
      `Starts: ${date.toLocaleDateString()} ${date.toLocaleTimeString()}`
    );
  }
  if (policy.timeWindow) {
    const { startHour, endHour, timezone } = policy.timeWindow;
    summary.push(`Hours: ${startHour}:00-${endHour}:00 ${timezone}`);
  }
  if (policy.rateLimit) {
    const { maxRequests, windowSeconds } = policy.rateLimit;
    if (windowSeconds === 60) summary.push(`Rate: ${maxRequests}/min`);
    else if (windowSeconds === 3600) summary.push(`Rate: ${maxRequests}/hour`);
    else if (windowSeconds === 86400) summary.push(`Rate: ${maxRequests}/day`);
    else summary.push(`Rate: ${maxRequests}/${windowSeconds}s`);
  }
  if (policy.quota?.daily) {
    summary.push(`Daily quota: ${policy.quota.daily}`);
  }
  if (policy.quota?.monthly) {
    summary.push(`Monthly quota: ${policy.quota.monthly}`);
  }
  if (policy.tokenBudget?.daily) {
    summary.push(`Daily tokens: ${policy.tokenBudget.daily.toLocaleString()}`);
  }
  return summary;
}

// src/index.ts
function parseResourceId(resourceId) {
  const parts = resourceId.split(":");
  if (parts.length !== 2) {
    throw new Error(
      `Invalid resource ID format: ${resourceId}. Expected: <resourceType>:<provider>`
    );
  }
  return {
    resourceType: parts[0],
    provider: parts[1]
  };
}
function createResourceId(resourceType, provider) {
  return `${resourceType}:${provider}`;
}

export { AppMetadataSchema, ChatCompletionRequestSchema, ChatMessageSchema, EXPIRY_PRESETS, ErrorCode, GatewayError, InstallRequestSchema, PermissionRequestSchema, RATE_LIMIT_PRESETS, createResourceId, formatAccessPolicySummary, getErrorStatus, getExpiryFromPreset, isPermissionValidNow, parseResourceId, resourceRequiredError };
//# sourceMappingURL=index.mjs.map
//# sourceMappingURL=index.mjs.map