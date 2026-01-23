// ============================================
// SHARED TYPES
// Common types used by proxy and SDK
// ============================================

/**
 * Resource identifier format: <resourceType>:<provider>
 * Examples: llm:groq, llm:gemini, mail:resend
 */
export type ResourceId = `${string}:${string}`;

/**
 * Parse a resource ID into its components.
 */
export function parseResourceId(resourceId: string): {
  resourceType: string;
  provider: string;
} {
  const parts = resourceId.split(":");
  if (parts.length !== 2) {
    throw new Error(
      `Invalid resource ID format: ${resourceId}. Expected: <resourceType>:<provider>`,
    );
  }
  return {
    resourceType: parts[0],
    provider: parts[1],
  };
}

/**
 * Create a resource ID from components.
 */
export function createResourceId(
  resourceType: string,
  provider: string,
): ResourceId {
  return `${resourceType}:${provider}` as ResourceId;
}

/**
 * Pairing string info parsed from pair::<url>::<code>
 */
export interface PairingInfo {
  proxyUrl: string;
  connectCode: string;
}

/**
 * Rate limit configuration.
 */
export interface RateLimitConfig {
  maxRequests: number;
  windowSeconds: number;
}

/**
 * Permission request for an app.
 */
export interface PermissionRequest {
  resourceId: string;
  actions: string[];
  constraints?: Record<string, unknown>;
  rateLimit?: RateLimitConfig; // Per-permission rate limit
}

/**
 * App metadata for registration.
 */
export interface AppMetadata {
  name: string;
  description?: string;
  homepage?: string;
}

/**
 * Gateway config stored after approval.
 */
export interface GatewayConfig {
  appId: string;
  proxyUrl: string;
}

/**
 * Resource constraint types (generic).
 */
export interface ResourceConstraints {
  // LLM constraints
  allowedModels?: string[];
  maxOutputTokens?: number;
  maxInputTokens?: number;
  allowStreaming?: boolean;

  // Email constraints
  allowedFromDomains?: string[];
  maxRecipients?: number;
  allowHtml?: boolean;

  // Generic
  maxRequestBodySize?: number;
  custom?: Record<string, unknown>;
}

export * from "./errors";
export * from "./schemas";
export * from "./access-policy";
export * from "./pop";
export * from "./enforcement";
