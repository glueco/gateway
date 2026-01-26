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

// src/client.ts
var client_exports = {};
__export(client_exports, {
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
  default: () => client_default,
  template: () => template
});
module.exports = __toCommonJS(client_exports);

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
  template
});
//# sourceMappingURL=client.js.map