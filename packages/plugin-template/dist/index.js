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
  ActionOneRequestSchema: () => ActionOneRequestSchema,
  ActionOneResponseSchema: () => ActionOneResponseSchema,
  ActionTwoRequestSchema: () => ActionTwoRequestSchema,
  ActionTwoResponseSchema: () => ActionTwoResponseSchema,
  DEFAULT_API_URL: () => DEFAULT_API_URL,
  ENFORCEMENT_SUPPORT: () => ENFORCEMENT_SUPPORT,
  NAME: () => NAME,
  PLUGIN_ID: () => PLUGIN_ID,
  PROVIDER: () => PROVIDER,
  RESOURCE_TYPE: () => RESOURCE_TYPE,
  VERSION: () => VERSION,
  default: () => proxy_default,
  templatePlugin: () => templatePlugin
});
module.exports = __toCommonJS(src_exports);

// src/proxy.ts
var import_shared = require("@glueco/shared");

// src/contracts.ts
var import_zod = require("zod");
var ActionOneRequestSchema = import_zod.z.object({
  /** Example input field */
  input: import_zod.z.string(),
  /** Optional configuration */
  config: import_zod.z.object({
    option1: import_zod.z.boolean().optional(),
    option2: import_zod.z.number().optional()
  }).optional()
});
var ActionTwoRequestSchema = import_zod.z.object({
  /** Data to process */
  data: import_zod.z.array(import_zod.z.string()),
  /** Processing options */
  options: import_zod.z.object({
    limit: import_zod.z.number().int().positive().optional(),
    format: import_zod.z.enum(["json", "text"]).optional()
  }).optional()
});
var ActionOneResponseSchema = import_zod.z.object({
  /** Result of processing */
  result: import_zod.z.string(),
  /** Metadata about the operation */
  metadata: import_zod.z.object({
    processingTime: import_zod.z.number(),
    timestamp: import_zod.z.number()
  })
});
var ActionTwoResponseSchema = import_zod.z.object({
  /** Processed items */
  items: import_zod.z.array(
    import_zod.z.object({
      id: import_zod.z.string(),
      value: import_zod.z.string()
    })
  ),
  /** Total count */
  total: import_zod.z.number()
});
var PLUGIN_ID = "example:template";
var RESOURCE_TYPE = "example";
var PROVIDER = "template";
var VERSION = "1.0.0";
var NAME = "Example Template Plugin";
var ACTIONS = ["action.one", "action.two"];
var ENFORCEMENT_SUPPORT = ["field1", "field2"];
var DEFAULT_API_URL = "https://api.example.com/v1";

// src/proxy.ts
var ProviderApiError = class extends Error {
  constructor(status, body) {
    super(`Provider API error: ${status}`);
    this.status = status;
    this.body = body;
    this.name = "ProviderApiError";
  }
};
function mapProviderError(error) {
  const message = error.body;
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
var templatePlugin = {
  // Use createPluginBase for defaults
  ...(0, import_shared.createPluginBase)({
    id: PLUGIN_ID,
    resourceType: RESOURCE_TYPE,
    provider: PROVIDER,
    version: VERSION,
    name: NAME,
    actions: [...ACTIONS],
    supports: {
      enforcement: [...ENFORCEMENT_SUPPORT]
    },
    // Client contract metadata for SDK-compatible plugins
    // This makes the plugin "SDK-compatible" per the architecture rules
    client: {
      namespace: "template",
      actions: {
        "action.one": {
          description: "Execute action one - example action"
        },
        "action.two": {
          description: "Execute action two - example action"
        }
      }
    }
  }),
  // Optional: Reference to core extractor or custom config
  extractors: {
    "action.one": {
      type: "generic"
      // Use "openai-compatible", "gemini", or "generic"
    },
    "action.two": {
      type: "generic"
    }
  },
  // Optional: Credential schema for admin UI
  credentialSchema: {
    fields: [
      {
        name: "apiKey",
        type: "secret",
        label: "API Key",
        description: "Your provider API key",
        required: true
      },
      {
        name: "baseUrl",
        type: "url",
        label: "Base URL",
        description: "Custom API base URL (optional)",
        required: false,
        default: DEFAULT_API_URL
      }
    ]
  },
  /**
   * Validate input and apply constraints.
   * This is called before execute() to ensure the request is valid.
   */
  validateAndShape(action, input, constraints) {
    if (!ACTIONS.includes(action)) {
      return { valid: false, error: `Unsupported action: ${action}` };
    }
    const schema = action === "action.one" ? ActionOneRequestSchema : ActionTwoRequestSchema;
    const parsed = schema.safeParse(input);
    if (!parsed.success) {
      return {
        valid: false,
        error: `Invalid request: ${parsed.error.errors.map((e) => e.message).join(", ")}`
      };
    }
    return { valid: true, shapedInput: parsed.data };
  },
  /**
   * Execute the action against the upstream provider.
   * This is where you make the actual API call.
   */
  async execute(action, shapedInput, ctx, options) {
    const baseUrl = ctx.config?.baseUrl || DEFAULT_API_URL;
    const endpoint = `${baseUrl}/${action.replace(".", "/")}`;
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${ctx.secret}`
      },
      body: JSON.stringify(shapedInput),
      signal: options.signal
    });
    if (!response.ok) {
      const errorBody = await response.text();
      throw new ProviderApiError(response.status, errorBody);
    }
    if (options.stream && response.body) {
      return {
        stream: response.body,
        contentType: "text/event-stream"
      };
    }
    const json = await response.json();
    return {
      response: json,
      contentType: "application/json",
      usage: this.extractUsage(json)
    };
  },
  /**
   * Extract usage metrics from the response.
   * Used for auditing and budget tracking.
   */
  extractUsage(response) {
    const res = response;
    return {
      // Customize for your provider's response format
      custom: {
        rawUsage: res.usage
      }
    };
  },
  /**
   * Map provider-specific errors to standardized format.
   */
  mapError(error) {
    if (error instanceof ProviderApiError) {
      return mapProviderError(error);
    }
    return {
      status: 500,
      code: "INTERNAL_ERROR",
      message: error instanceof Error ? error.message : "Unknown error",
      retryable: false
    };
  }
};
var proxy_default = templatePlugin;
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
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
  templatePlugin
});
//# sourceMappingURL=index.js.map