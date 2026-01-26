// ============================================
// TEMPLATE PLUGIN CONTRACTS
// Shared request/response schemas for proxy and client
// ============================================
//
// This file contains the Zod schemas that define the request/response
// contracts for the plugin. These schemas are shared between:
// - Proxy (for validation)
// - Client (for type inference)
//
// Guidelines:
// 1. Keep schemas in this file, not in proxy.ts or client.ts
// 2. Export both schemas AND inferred types
// 3. Use descriptive names: <Action>RequestSchema, <Action>ResponseSchema
// 4. Include constants like PLUGIN_ID, VERSION, ACTIONS here
//
// ============================================

import { z } from "zod";

// ============================================
// REQUEST SCHEMAS
// Define the structure of incoming requests
// ============================================

/**
 * Example request schema for action.one
 * Replace with your actual request structure
 */
export const ActionOneRequestSchema = z.object({
  /** Example input field */
  input: z.string(),
  /** Optional configuration */
  config: z
    .object({
      option1: z.boolean().optional(),
      option2: z.number().optional(),
    })
    .optional(),
});

export type ActionOneRequest = z.infer<typeof ActionOneRequestSchema>;

/**
 * Example request schema for action.two
 */
export const ActionTwoRequestSchema = z.object({
  /** Data to process */
  data: z.array(z.string()),
  /** Processing options */
  options: z
    .object({
      limit: z.number().int().positive().optional(),
      format: z.enum(["json", "text"]).optional(),
    })
    .optional(),
});

export type ActionTwoRequest = z.infer<typeof ActionTwoRequestSchema>;

// ============================================
// RESPONSE SCHEMAS
// Define the structure of outgoing responses
// ============================================

/**
 * Example response schema for action.one
 */
export const ActionOneResponseSchema = z.object({
  /** Result of processing */
  result: z.string(),
  /** Metadata about the operation */
  metadata: z.object({
    processingTime: z.number(),
    timestamp: z.number(),
  }),
});

export type ActionOneResponse = z.infer<typeof ActionOneResponseSchema>;

/**
 * Example response schema for action.two
 */
export const ActionTwoResponseSchema = z.object({
  /** Processed items */
  items: z.array(
    z.object({
      id: z.string(),
      value: z.string(),
    }),
  ),
  /** Total count */
  total: z.number(),
});

export type ActionTwoResponse = z.infer<typeof ActionTwoResponseSchema>;

// ============================================
// PLUGIN CONSTANTS
// Shared identifiers and configuration
// ============================================

/**
 * Plugin identifier in format: <resourceType>:<provider>
 */
export const PLUGIN_ID = "example:template" as const;

/**
 * Resource type category
 */
export const RESOURCE_TYPE = "example" as const;

/**
 * Provider name
 */
export const PROVIDER = "template" as const;

/**
 * Plugin version (semver)
 * This is the contract version - target apps can use this
 * to verify compatibility with the proxy plugin version.
 *
 * TODO: Add version compatibility checking in future iteration
 */
export const VERSION = "1.0.0";

/**
 * Human-readable display name
 */
export const NAME = "Example Template Plugin";

/**
 * Supported actions
 */
export const ACTIONS = ["action.one", "action.two"] as const;
export type TemplateAction = (typeof ACTIONS)[number];

/**
 * Enforcement knobs this plugin supports
 */
export const ENFORCEMENT_SUPPORT = ["field1", "field2"] as const;

/**
 * Default API base URL
 */
export const DEFAULT_API_URL = "https://api.example.com/v1";
