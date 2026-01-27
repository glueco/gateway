import { z } from "zod";

// ============================================
// POLICY ENFORCEMENT CONTRACTS
// Schema-first enforcement types - no extractors
// ============================================

/**
 * Enforcement fields returned by validateAndShape.
 * These are normalized, enforceable knobs that plugins MUST provide
 * when constraints require them. This replaces the legacy extractor system.
 *
 * The schema-first approach ensures:
 * - Enforcement cannot be bypassed by malformed payloads
 * - Plugins are responsible for extracting enforcement fields during validation
 * - No "fail-open" extraction - if a field is needed, it must be provided
 */
export const EnforcementFieldsSchema = z.object({
  // LLM-specific fields
  model: z.string().optional(),
  maxOutputTokens: z.number().int().positive().optional(),
  usesTools: z.boolean().optional(),
  stream: z.boolean().optional(),

  // Email-specific fields
  fromDomain: z.string().optional(),
  toDomains: z.array(z.string()).optional(),
  recipientCount: z.number().int().positive().optional(),

  // Generic fields
  contentType: z.string().optional(),
});

export type EnforcementFields = z.infer<typeof EnforcementFieldsSchema>;

/**
 * @deprecated Use EnforcementFields instead. ExtractedRequest is kept for backward compatibility
 * but will be removed in a future version. The extractor system has been replaced with
 * schema-first validation where plugins return enforcement fields from validateAndShape.
 */
export const ExtractedRequestSchema = EnforcementFieldsSchema;

/**
 * @deprecated Use EnforcementFields instead.
 */
export type ExtractedRequest = EnforcementFields;

/**
 * Enforcement metadata that target apps may optionally provide.
 * This is NOT required for enforcement - the proxy can operate without it.
 * Treat as advisory only.
 */
export const EnforcementMetaSchema = z.object({
  /** App-provided request ID for correlation */
  requestId: z.string().optional(),
  /** Declared intent (advisory only, not enforced) */
  intent: z.string().optional(),
  /** App-declared expected model (advisory only) */
  expectedModel: z.string().optional(),
});

export type EnforcementMeta = z.infer<typeof EnforcementMetaSchema>;

/**
 * Policy definition for enforcement.
 * This mirrors ResourceConstraints but is focused on enforcement.
 */
export interface EnforcementPolicy {
  // LLM policies
  allowedModels?: string[];
  maxOutputTokens?: number;
  allowTools?: boolean;
  allowStreaming?: boolean;

  // Email policies
  allowedFromDomains?: string[];
  allowedToDomains?: string[];
  maxRecipients?: number;

  // Generic
  maxRequestBodySize?: number;
}

/**
 * Result of policy enforcement.
 */
export interface EnforcementResult {
  allowed: boolean;
  violation?: {
    code: string;
    message: string;
    field: string;
    actual?: unknown;
    limit?: unknown;
  };
}
