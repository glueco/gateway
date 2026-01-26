// src/contracts.ts
import { z } from "zod";
var ActionOneRequestSchema = z.object({
  /** Example input field */
  input: z.string(),
  /** Optional configuration */
  config: z.object({
    option1: z.boolean().optional(),
    option2: z.number().optional()
  }).optional()
});
var ActionTwoRequestSchema = z.object({
  /** Data to process */
  data: z.array(z.string()),
  /** Processing options */
  options: z.object({
    limit: z.number().int().positive().optional(),
    format: z.enum(["json", "text"]).optional()
  }).optional()
});
var ActionOneResponseSchema = z.object({
  /** Result of processing */
  result: z.string(),
  /** Metadata about the operation */
  metadata: z.object({
    processingTime: z.number(),
    timestamp: z.number()
  })
});
var ActionTwoResponseSchema = z.object({
  /** Processed items */
  items: z.array(
    z.object({
      id: z.string(),
      value: z.string()
    })
  ),
  /** Total count */
  total: z.number()
});
var PLUGIN_ID = "example:template";
var RESOURCE_TYPE = "example";
var PROVIDER = "template";
var VERSION = "1.0.0";
var NAME = "Example Template Plugin";
var ACTIONS = ["action.one", "action.two"];
var ENFORCEMENT_SUPPORT = ["field1", "field2"];
var DEFAULT_API_URL = "https://api.example.com/v1";

export {
  ActionOneRequestSchema,
  ActionTwoRequestSchema,
  ActionOneResponseSchema,
  ActionTwoResponseSchema,
  PLUGIN_ID,
  RESOURCE_TYPE,
  PROVIDER,
  VERSION,
  NAME,
  ACTIONS,
  ENFORCEMENT_SUPPORT,
  DEFAULT_API_URL
};
//# sourceMappingURL=chunk-L3B3KZZO.mjs.map