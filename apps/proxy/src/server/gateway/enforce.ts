import {
  EnforcementFields,
  EnforcementPolicy,
  EnforcementResult,
  ErrorCode,
} from "@glueco/shared";

// ============================================
// POLICY ENFORCEMENT (Schema-First)
// Pure, deterministic policy enforcement logic
// Consumes enforcement fields from validateAndShape, not extractors
// ============================================

/**
 * List of constraint keys that require enforcement fields.
 * If any of these are present and restrictive, the enforcement fields
 * MUST contain the corresponding values.
 */
const ENFORCEABLE_CONSTRAINT_KEYS = [
  "allowedModels",
  "maxOutputTokens",
  "allowTools",
  "allowStreaming",
  "modelRateLimits",
] as const;

/**
 * Check if constraints contain any fields that require enforcement.
 * Used to determine if enforcement validation should run.
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
 * Enforce policy against enforcement fields from validateAndShape.
 *
 * Schema-first enforcement rules:
 * 1. If policy defines allowedModels:
 *    - enforcement.model MUST be present (fail-closed)
 *    - Reject if model not in allowed list
 * 2. If policy defines maxOutputTokens and enforcement.maxOutputTokens exists:
 *    - Reject if exceeds limit
 * 3. If policy defines allowTools=false:
 *    - enforcement.usesTools MUST be present (fail-closed)
 *    - Reject if usesTools=true
 * 4. If policy defines allowStreaming=false:
 *    - enforcement.stream MUST be present (fail-closed)
 *    - Reject if stream=true
 *
 * This is FAIL-CLOSED: if a constraint exists and the enforcement field
 * is not provided, the request is rejected.
 */
export function enforcePolicy(
  policy: EnforcementPolicy,
  enforcement: EnforcementFields,
): EnforcementResult {
  // Rule 1: Model allowlist (fail-closed)
  if (policy.allowedModels && policy.allowedModels.length > 0) {
    // Model MUST be provided when allowedModels constraint exists
    if (!enforcement.model) {
      return {
        allowed: false,
        violation: {
          code: ErrorCode.ERR_POLICY_VIOLATION,
          message:
            "Model must be specified when allowedModels constraint is set",
          field: "model",
          actual: undefined,
          limit: policy.allowedModels,
        },
      };
    }

    const modelAllowed = policy.allowedModels.some(
      (allowed) =>
        // Exact match
        allowed === enforcement.model ||
        // Match with models/ prefix stripped from enforcement
        allowed === enforcement.model?.replace(/^models\//, "") ||
        // Match with models/ prefix added to allowed
        `models/${allowed}` === enforcement.model ||
        // Match with models/ prefix stripped from allowed
        allowed.replace(/^models\//, "") === enforcement.model,
    );

    if (!modelAllowed) {
      return {
        allowed: false,
        violation: {
          code: ErrorCode.ERR_MODEL_NOT_ALLOWED,
          message: `Model '${enforcement.model}' is not allowed. Allowed models: ${policy.allowedModels.join(", ")}`,
          field: "model",
          actual: enforcement.model,
          limit: policy.allowedModels,
        },
      };
    }
  }

  // Rule 2: Max output tokens
  if (
    policy.maxOutputTokens !== undefined &&
    enforcement.maxOutputTokens !== undefined
  ) {
    if (enforcement.maxOutputTokens > policy.maxOutputTokens) {
      return {
        allowed: false,
        violation: {
          code: ErrorCode.ERR_MAX_TOKENS_EXCEEDED,
          message: `Requested max_tokens (${enforcement.maxOutputTokens}) exceeds limit (${policy.maxOutputTokens})`,
          field: "maxOutputTokens",
          actual: enforcement.maxOutputTokens,
          limit: policy.maxOutputTokens,
        },
      };
    }
  }

  // Rule 3: Tools allowlist (fail-closed)
  if (policy.allowTools === false) {
    // usesTools MUST be provided when allowTools=false constraint exists
    if (enforcement.usesTools === undefined) {
      return {
        allowed: false,
        violation: {
          code: ErrorCode.ERR_POLICY_VIOLATION,
          message:
            "Tool usage status must be specified when allowTools constraint is set",
          field: "usesTools",
          actual: undefined,
          limit: false,
        },
      };
    }

    if (enforcement.usesTools === true) {
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
  }

  // Rule 4: Streaming allowlist (fail-closed)
  if (policy.allowStreaming === false) {
    // stream MUST be provided when allowStreaming=false constraint exists
    if (enforcement.stream === undefined) {
      return {
        allowed: false,
        violation: {
          code: ErrorCode.ERR_POLICY_VIOLATION,
          message:
            "Streaming status must be specified when allowStreaming constraint is set",
          field: "stream",
          actual: undefined,
          limit: false,
        },
      };
    }

    if (enforcement.stream === true) {
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
