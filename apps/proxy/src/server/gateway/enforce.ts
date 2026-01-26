import {
  ExtractedRequest,
  EnforcementPolicy,
  EnforcementResult,
  ErrorCode,
} from "@glueco/shared";

// ============================================
// POLICY ENFORCEMENT
// Pure, deterministic policy enforcement logic
// ============================================

/**
 * List of constraint keys that require body extraction for enforcement.
 * If none of these are present, we skip body parsing entirely.
 */
const ENFORCEABLE_CONSTRAINT_KEYS = [
  "allowedModels",
  "maxOutputTokens",
  "allowTools",
  "allowStreaming",
  "modelRateLimits",
] as const;

/**
 * Check if constraints contain any fields that require body extraction.
 * Used to skip parsing when no enforcement is needed.
 */
export function hasEnforceableConstraints(
  constraints: Record<string, unknown> | null | undefined,
): boolean {
  if (!constraints) return false;

  for (const key of ENFORCEABLE_CONSTRAINT_KEYS) {
    const value = constraints[key];
    if (value === undefined || value === null) continue;

    // allowedModels: must be non-empty array
    if (key === "allowedModels" && Array.isArray(value) && value.length > 0) {
      return true;
    }

    // maxOutputTokens: must be a positive number
    if (key === "maxOutputTokens" && typeof value === "number" && value > 0) {
      return true;
    }

    // allowTools/allowStreaming: only enforce if explicitly false
    if ((key === "allowTools" || key === "allowStreaming") && value === false) {
      return true;
    }

    // modelRateLimits: must be non-empty array
    if (key === "modelRateLimits" && Array.isArray(value) && value.length > 0) {
      return true;
    }
  }

  return false;
}

/**
 * Enforce policy against extracted request fields.
 *
 * Rules:
 * 1. If policy defines allowedModels and extracted.model exists:
 *    - Reject if model not in allowed list
 * 2. If policy defines maxOutputTokens and extracted.maxOutputTokens exists:
 *    - Reject if exceeds limit
 * 3. If policy defines allowTools=false and extracted.usesTools=true:
 *    - Reject
 * 4. If policy defines allowStreaming=false and extracted.stream=true:
 *    - Reject
 *
 * If no extractor or no fields extracted, only enforce what is available.
 * This ensures graceful degradation.
 */
export function enforcePolicy(
  policy: EnforcementPolicy,
  extracted: ExtractedRequest,
): EnforcementResult {
  // Rule 1: Model allowlist
  if (policy.allowedModels && extracted.model) {
    const modelAllowed = policy.allowedModels.some(
      (allowed) =>
        // Exact match
        allowed === extracted.model ||
        // Match with models/ prefix stripped
        allowed === extracted.model?.replace(/^models\//, "") ||
        // Match with models/ prefix added
        `models/${allowed}` === extracted.model,
    );

    if (!modelAllowed) {
      return {
        allowed: false,
        violation: {
          code: ErrorCode.ERR_MODEL_NOT_ALLOWED,
          message: `Model '${extracted.model}' is not allowed. Allowed models: ${policy.allowedModels.join(", ")}`,
          field: "model",
          actual: extracted.model,
          limit: policy.allowedModels,
        },
      };
    }
  }

  // Rule 2: Max output tokens
  if (
    policy.maxOutputTokens !== undefined &&
    extracted.maxOutputTokens !== undefined
  ) {
    if (extracted.maxOutputTokens > policy.maxOutputTokens) {
      return {
        allowed: false,
        violation: {
          code: ErrorCode.ERR_MAX_TOKENS_EXCEEDED,
          message: `Requested max_tokens (${extracted.maxOutputTokens}) exceeds limit (${policy.maxOutputTokens})`,
          field: "maxOutputTokens",
          actual: extracted.maxOutputTokens,
          limit: policy.maxOutputTokens,
        },
      };
    }
  }

  // Rule 3: Tools allowlist
  if (policy.allowTools === false && extracted.usesTools === true) {
    return {
      allowed: false,
      violation: {
        code: ErrorCode.ERR_TOOLS_NOT_ALLOWED,
        message: "Tool usage is not allowed for this app",
        field: "usesTools",
        actual: true,
        limit: false,
      },
    };
  }

  // Rule 4: Streaming allowlist
  if (policy.allowStreaming === false && extracted.stream === true) {
    return {
      allowed: false,
      violation: {
        code: ErrorCode.ERR_STREAMING_NOT_ALLOWED,
        message: "Streaming is not allowed for this app",
        field: "stream",
        actual: true,
        limit: false,
      },
    };
  }

  // All checks passed
  return { allowed: true };
}

/**
 * Convert ResourceConstraints to EnforcementPolicy.
 * ResourceConstraints from the database may have extra fields;
 * this extracts only what's needed for enforcement.
 */
export function constraintsToPolicy(
  constraints: Record<string, unknown> | null | undefined,
): EnforcementPolicy {
  if (!constraints) {
    return {};
  }

  const policy: EnforcementPolicy = {};

  if (Array.isArray(constraints.allowedModels)) {
    policy.allowedModels = constraints.allowedModels.filter(
      (m): m is string => typeof m === "string",
    );
  }

  if (typeof constraints.maxOutputTokens === "number") {
    policy.maxOutputTokens = constraints.maxOutputTokens;
  }

  // Note: allowTools is derived from absence of tools restriction
  // If not explicitly set, we don't restrict
  if (constraints.allowTools === false) {
    policy.allowTools = false;
  }

  if (constraints.allowStreaming === false) {
    policy.allowStreaming = false;
  }

  if (typeof constraints.maxRequestBodySize === "number") {
    policy.maxRequestBodySize = constraints.maxRequestBodySize;
  }

  return policy;
}
