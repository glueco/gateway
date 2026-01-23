import { z } from "zod";

// ============================================
// POLICY ENFORCEMENT CONTRACTS
// Thin extraction types for policy enforcement
// ============================================

/**
 * Extracted request fields for policy enforcement.
 * These are normalized, enforceable knobs extracted from provider-native requests.
 * All fields are optional since extraction may fail or fields may not apply.
 */
export const ExtractedRequestSchema = z.object({
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

export type ExtractedRequest = z.infer<typeof ExtractedRequestSchema>;

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
