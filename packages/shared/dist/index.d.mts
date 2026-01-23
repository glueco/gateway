import { z } from 'zod';

/**
 * Gateway error codes.
 */
declare enum ErrorCode {
    ERR_RESOURCE_REQUIRED = "ERR_RESOURCE_REQUIRED",
    ERR_UNKNOWN_RESOURCE = "ERR_UNKNOWN_RESOURCE",
    ERR_RESOURCE_NOT_CONFIGURED = "ERR_RESOURCE_NOT_CONFIGURED",
    ERR_UNSUPPORTED_ACTION = "ERR_UNSUPPORTED_ACTION",
    ERR_MISSING_AUTH = "ERR_MISSING_AUTH",
    ERR_INVALID_SIGNATURE = "ERR_INVALID_SIGNATURE",
    ERR_EXPIRED_TIMESTAMP = "ERR_EXPIRED_TIMESTAMP",
    ERR_INVALID_NONCE = "ERR_INVALID_NONCE",
    ERR_APP_NOT_FOUND = "ERR_APP_NOT_FOUND",
    ERR_APP_DISABLED = "ERR_APP_DISABLED",
    ERR_PERMISSION_DENIED = "ERR_PERMISSION_DENIED",
    ERR_CONSTRAINT_VIOLATION = "ERR_CONSTRAINT_VIOLATION",
    ERR_RATE_LIMIT_EXCEEDED = "ERR_RATE_LIMIT_EXCEEDED",
    ERR_BUDGET_EXCEEDED = "ERR_BUDGET_EXCEEDED",
    ERR_INVALID_REQUEST = "ERR_INVALID_REQUEST",
    ERR_INVALID_JSON = "ERR_INVALID_JSON",
    ERR_INTERNAL = "ERR_INTERNAL",
    ERR_UPSTREAM_ERROR = "ERR_UPSTREAM_ERROR",
    ERR_INVALID_PAIRING_STRING = "ERR_INVALID_PAIRING_STRING",
    ERR_INVALID_CONNECT_CODE = "ERR_INVALID_CONNECT_CODE",
    ERR_SESSION_EXPIRED = "ERR_SESSION_EXPIRED"
}
/**
 * Get HTTP status code for an error code.
 */
declare function getErrorStatus(code: ErrorCode): number;
/**
 * Gateway error class.
 */
declare class GatewayError extends Error {
    readonly code: ErrorCode;
    readonly status: number;
    readonly details?: Record<string, unknown>;
    constructor(code: ErrorCode, message: string, details?: Record<string, unknown>);
    toJSON(): {
        error: {
            details?: Record<string, unknown> | undefined;
            code: ErrorCode;
            message: string;
        };
    };
}
/**
 * Create a resource required error with helpful message.
 */
declare function resourceRequiredError(hint?: string): GatewayError;

/**
 * Chat message schema (OpenAI-compatible).
 */
declare const ChatMessageSchema: z.ZodObject<{
    role: z.ZodEnum<["system", "user", "assistant", "tool"]>;
    content: z.ZodNullable<z.ZodUnion<[z.ZodString, z.ZodArray<z.ZodObject<{
        type: z.ZodString;
        text: z.ZodOptional<z.ZodString>;
        image_url: z.ZodOptional<z.ZodObject<{
            url: z.ZodString;
            detail: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            url: string;
            detail?: string | undefined;
        }, {
            url: string;
            detail?: string | undefined;
        }>>;
    }, "strip", z.ZodTypeAny, {
        type: string;
        text?: string | undefined;
        image_url?: {
            url: string;
            detail?: string | undefined;
        } | undefined;
    }, {
        type: string;
        text?: string | undefined;
        image_url?: {
            url: string;
            detail?: string | undefined;
        } | undefined;
    }>, "many">]>>;
    name: z.ZodOptional<z.ZodString>;
    tool_calls: z.ZodOptional<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        type: z.ZodLiteral<"function">;
        function: z.ZodObject<{
            name: z.ZodString;
            arguments: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            name: string;
            arguments: string;
        }, {
            name: string;
            arguments: string;
        }>;
    }, "strip", z.ZodTypeAny, {
        function: {
            name: string;
            arguments: string;
        };
        type: "function";
        id: string;
    }, {
        function: {
            name: string;
            arguments: string;
        };
        type: "function";
        id: string;
    }>, "many">>;
    tool_call_id: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    role: "system" | "user" | "assistant" | "tool";
    content: string | {
        type: string;
        text?: string | undefined;
        image_url?: {
            url: string;
            detail?: string | undefined;
        } | undefined;
    }[] | null;
    name?: string | undefined;
    tool_calls?: {
        function: {
            name: string;
            arguments: string;
        };
        type: "function";
        id: string;
    }[] | undefined;
    tool_call_id?: string | undefined;
}, {
    role: "system" | "user" | "assistant" | "tool";
    content: string | {
        type: string;
        text?: string | undefined;
        image_url?: {
            url: string;
            detail?: string | undefined;
        } | undefined;
    }[] | null;
    name?: string | undefined;
    tool_calls?: {
        function: {
            name: string;
            arguments: string;
        };
        type: "function";
        id: string;
    }[] | undefined;
    tool_call_id?: string | undefined;
}>;
/**
 * Chat completion request schema (OpenAI-compatible).
 */
declare const ChatCompletionRequestSchema: z.ZodObject<{
    model: z.ZodString;
    messages: z.ZodArray<z.ZodObject<{
        role: z.ZodEnum<["system", "user", "assistant", "tool"]>;
        content: z.ZodNullable<z.ZodUnion<[z.ZodString, z.ZodArray<z.ZodObject<{
            type: z.ZodString;
            text: z.ZodOptional<z.ZodString>;
            image_url: z.ZodOptional<z.ZodObject<{
                url: z.ZodString;
                detail: z.ZodOptional<z.ZodString>;
            }, "strip", z.ZodTypeAny, {
                url: string;
                detail?: string | undefined;
            }, {
                url: string;
                detail?: string | undefined;
            }>>;
        }, "strip", z.ZodTypeAny, {
            type: string;
            text?: string | undefined;
            image_url?: {
                url: string;
                detail?: string | undefined;
            } | undefined;
        }, {
            type: string;
            text?: string | undefined;
            image_url?: {
                url: string;
                detail?: string | undefined;
            } | undefined;
        }>, "many">]>>;
        name: z.ZodOptional<z.ZodString>;
        tool_calls: z.ZodOptional<z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            type: z.ZodLiteral<"function">;
            function: z.ZodObject<{
                name: z.ZodString;
                arguments: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                name: string;
                arguments: string;
            }, {
                name: string;
                arguments: string;
            }>;
        }, "strip", z.ZodTypeAny, {
            function: {
                name: string;
                arguments: string;
            };
            type: "function";
            id: string;
        }, {
            function: {
                name: string;
                arguments: string;
            };
            type: "function";
            id: string;
        }>, "many">>;
        tool_call_id: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        role: "system" | "user" | "assistant" | "tool";
        content: string | {
            type: string;
            text?: string | undefined;
            image_url?: {
                url: string;
                detail?: string | undefined;
            } | undefined;
        }[] | null;
        name?: string | undefined;
        tool_calls?: {
            function: {
                name: string;
                arguments: string;
            };
            type: "function";
            id: string;
        }[] | undefined;
        tool_call_id?: string | undefined;
    }, {
        role: "system" | "user" | "assistant" | "tool";
        content: string | {
            type: string;
            text?: string | undefined;
            image_url?: {
                url: string;
                detail?: string | undefined;
            } | undefined;
        }[] | null;
        name?: string | undefined;
        tool_calls?: {
            function: {
                name: string;
                arguments: string;
            };
            type: "function";
            id: string;
        }[] | undefined;
        tool_call_id?: string | undefined;
    }>, "many">;
    temperature: z.ZodOptional<z.ZodNumber>;
    top_p: z.ZodOptional<z.ZodNumber>;
    n: z.ZodOptional<z.ZodNumber>;
    stream: z.ZodOptional<z.ZodBoolean>;
    stop: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodArray<z.ZodString, "many">]>>;
    max_tokens: z.ZodOptional<z.ZodNumber>;
    max_completion_tokens: z.ZodOptional<z.ZodNumber>;
    presence_penalty: z.ZodOptional<z.ZodNumber>;
    frequency_penalty: z.ZodOptional<z.ZodNumber>;
    logit_bias: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodNumber>>;
    user: z.ZodOptional<z.ZodString>;
    tools: z.ZodOptional<z.ZodArray<z.ZodObject<{
        type: z.ZodLiteral<"function">;
        function: z.ZodObject<{
            name: z.ZodString;
            description: z.ZodOptional<z.ZodString>;
            parameters: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        }, "strip", z.ZodTypeAny, {
            name: string;
            description?: string | undefined;
            parameters?: Record<string, unknown> | undefined;
        }, {
            name: string;
            description?: string | undefined;
            parameters?: Record<string, unknown> | undefined;
        }>;
    }, "strip", z.ZodTypeAny, {
        function: {
            name: string;
            description?: string | undefined;
            parameters?: Record<string, unknown> | undefined;
        };
        type: "function";
    }, {
        function: {
            name: string;
            description?: string | undefined;
            parameters?: Record<string, unknown> | undefined;
        };
        type: "function";
    }>, "many">>;
    tool_choice: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<"none">, z.ZodLiteral<"auto">, z.ZodLiteral<"required">, z.ZodObject<{
        type: z.ZodLiteral<"function">;
        function: z.ZodObject<{
            name: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            name: string;
        }, {
            name: string;
        }>;
    }, "strip", z.ZodTypeAny, {
        function: {
            name: string;
        };
        type: "function";
    }, {
        function: {
            name: string;
        };
        type: "function";
    }>]>>;
    response_format: z.ZodOptional<z.ZodObject<{
        type: z.ZodEnum<["text", "json_object"]>;
    }, "strip", z.ZodTypeAny, {
        type: "text" | "json_object";
    }, {
        type: "text" | "json_object";
    }>>;
    seed: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    model: string;
    messages: {
        role: "system" | "user" | "assistant" | "tool";
        content: string | {
            type: string;
            text?: string | undefined;
            image_url?: {
                url: string;
                detail?: string | undefined;
            } | undefined;
        }[] | null;
        name?: string | undefined;
        tool_calls?: {
            function: {
                name: string;
                arguments: string;
            };
            type: "function";
            id: string;
        }[] | undefined;
        tool_call_id?: string | undefined;
    }[];
    user?: string | undefined;
    temperature?: number | undefined;
    top_p?: number | undefined;
    n?: number | undefined;
    stream?: boolean | undefined;
    stop?: string | string[] | undefined;
    max_tokens?: number | undefined;
    max_completion_tokens?: number | undefined;
    presence_penalty?: number | undefined;
    frequency_penalty?: number | undefined;
    logit_bias?: Record<string, number> | undefined;
    tools?: {
        function: {
            name: string;
            description?: string | undefined;
            parameters?: Record<string, unknown> | undefined;
        };
        type: "function";
    }[] | undefined;
    tool_choice?: "none" | "auto" | "required" | {
        function: {
            name: string;
        };
        type: "function";
    } | undefined;
    response_format?: {
        type: "text" | "json_object";
    } | undefined;
    seed?: number | undefined;
}, {
    model: string;
    messages: {
        role: "system" | "user" | "assistant" | "tool";
        content: string | {
            type: string;
            text?: string | undefined;
            image_url?: {
                url: string;
                detail?: string | undefined;
            } | undefined;
        }[] | null;
        name?: string | undefined;
        tool_calls?: {
            function: {
                name: string;
                arguments: string;
            };
            type: "function";
            id: string;
        }[] | undefined;
        tool_call_id?: string | undefined;
    }[];
    user?: string | undefined;
    temperature?: number | undefined;
    top_p?: number | undefined;
    n?: number | undefined;
    stream?: boolean | undefined;
    stop?: string | string[] | undefined;
    max_tokens?: number | undefined;
    max_completion_tokens?: number | undefined;
    presence_penalty?: number | undefined;
    frequency_penalty?: number | undefined;
    logit_bias?: Record<string, number> | undefined;
    tools?: {
        function: {
            name: string;
            description?: string | undefined;
            parameters?: Record<string, unknown> | undefined;
        };
        type: "function";
    }[] | undefined;
    tool_choice?: "none" | "auto" | "required" | {
        function: {
            name: string;
        };
        type: "function";
    } | undefined;
    response_format?: {
        type: "text" | "json_object";
    } | undefined;
    seed?: number | undefined;
}>;
type ChatCompletionRequest = z.infer<typeof ChatCompletionRequestSchema>;
type ChatMessage = z.infer<typeof ChatMessageSchema>;
/**
 * Permission request schema.
 */
declare const PermissionRequestSchema: z.ZodObject<{
    resourceId: z.ZodString;
    actions: z.ZodArray<z.ZodString, "many">;
    constraints: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    resourceId: string;
    actions: string[];
    constraints?: Record<string, unknown> | undefined;
}, {
    resourceId: string;
    actions: string[];
    constraints?: Record<string, unknown> | undefined;
}>;
/**
 * App metadata schema.
 */
declare const AppMetadataSchema: z.ZodObject<{
    name: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    homepage: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    name: string;
    description?: string | undefined;
    homepage?: string | undefined;
}, {
    name: string;
    description?: string | undefined;
    homepage?: string | undefined;
}>;
/**
 * Install request schema (for prepare endpoint).
 */
declare const InstallRequestSchema: z.ZodObject<{
    connectCode: z.ZodString;
    app: z.ZodObject<{
        name: z.ZodString;
        description: z.ZodOptional<z.ZodString>;
        homepage: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        name: string;
        description?: string | undefined;
        homepage?: string | undefined;
    }, {
        name: string;
        description?: string | undefined;
        homepage?: string | undefined;
    }>;
    publicKey: z.ZodString;
    requestedPermissions: z.ZodArray<z.ZodObject<{
        resourceId: z.ZodString;
        actions: z.ZodArray<z.ZodString, "many">;
        constraints: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    }, "strip", z.ZodTypeAny, {
        resourceId: string;
        actions: string[];
        constraints?: Record<string, unknown> | undefined;
    }, {
        resourceId: string;
        actions: string[];
        constraints?: Record<string, unknown> | undefined;
    }>, "many">;
    redirectUri: z.ZodString;
}, "strip", z.ZodTypeAny, {
    connectCode: string;
    app: {
        name: string;
        description?: string | undefined;
        homepage?: string | undefined;
    };
    publicKey: string;
    requestedPermissions: {
        resourceId: string;
        actions: string[];
        constraints?: Record<string, unknown> | undefined;
    }[];
    redirectUri: string;
}, {
    connectCode: string;
    app: {
        name: string;
        description?: string | undefined;
        homepage?: string | undefined;
    };
    publicKey: string;
    requestedPermissions: {
        resourceId: string;
        actions: string[];
        constraints?: Record<string, unknown> | undefined;
    }[];
    redirectUri: string;
}>;
type InstallRequest = z.infer<typeof InstallRequestSchema>;

/**
 * Time window restriction.
 * Allows access only during specific hours of the day.
 */
interface TimeWindow {
    /** Start hour (0-23) in the specified timezone */
    startHour: number;
    /** End hour (0-23) in the specified timezone */
    endHour: number;
    /** Timezone for the time window (e.g., "UTC", "America/New_York") */
    timezone: string;
    /** Days of week allowed (0=Sunday, 6=Saturday). Empty = all days */
    allowedDays?: number[];
}
/**
 * Rate limit configuration.
 */
interface RateLimitConfig$1 {
    /** Maximum requests allowed in the window */
    maxRequests: number;
    /** Window duration in seconds */
    windowSeconds: number;
}
/**
 * Burst limit configuration.
 * Allows short-term spikes above the sustained rate limit.
 */
interface BurstConfig {
    /** Maximum requests allowed in burst window */
    limit: number;
    /** Burst window duration in seconds (typically short, e.g., 10s) */
    windowSeconds: number;
}
/**
 * Quota configuration for daily/monthly limits.
 */
interface QuotaConfig {
    /** Daily request quota (null = unlimited) */
    daily?: number;
    /** Monthly request quota (null = unlimited) */
    monthly?: number;
}
/**
 * Token budget for LLM resources.
 */
interface TokenBudget {
    /** Daily token budget (null = unlimited) */
    daily?: number;
    /** Monthly token budget (null = unlimited) */
    monthly?: number;
}
/**
 * LLM-specific constraints.
 */
interface LLMConstraints {
    /** Allowed model IDs (empty = all models allowed) */
    allowedModels?: string[];
    /** Maximum output tokens per request */
    maxOutputTokens?: number;
    /** Maximum input tokens per request */
    maxInputTokens?: number;
    /** Allow streaming responses */
    allowStreaming?: boolean;
    /** Maximum context window */
    maxContextWindow?: number;
}
/**
 * Email-specific constraints.
 */
interface EmailConstraints {
    /** Allowed from domains */
    allowedFromDomains?: string[];
    /** Maximum recipients per email */
    maxRecipients?: number;
    /** Allow HTML content */
    allowHtml?: boolean;
    /** Maximum attachment size in bytes */
    maxAttachmentSize?: number;
}
/**
 * Generic HTTP constraints.
 */
interface HTTPConstraints {
    /** Maximum request body size in bytes */
    maxRequestBodySize?: number;
    /** Allowed HTTP methods */
    allowedMethods?: string[];
    /** Custom constraints */
    custom?: Record<string, unknown>;
}
/**
 * Union type for all constraint types.
 */
type ResourceConstraints$1 = LLMConstraints | EmailConstraints | HTTPConstraints | Record<string, unknown>;
/**
 * Complete access policy for a permission.
 * This is what the proxy owner configures during approval.
 */
interface AccessPolicy {
    /** When the permission becomes valid (ISO string, null = immediately) */
    validFrom?: string | null;
    /** When the permission expires (ISO string, null = never) */
    expiresAt?: string | null;
    /** Time-of-day restrictions */
    timeWindow?: TimeWindow | null;
    /** Sustained rate limit */
    rateLimit?: RateLimitConfig$1;
    /** Burst allowance */
    burst?: BurstConfig;
    /** Request quotas */
    quota?: QuotaConfig;
    /** Token budget (LLM resources) */
    tokenBudget?: TokenBudget;
    /** Resource-specific constraints */
    constraints?: ResourceConstraints$1;
}
type ExpiryPreset = "1_hour" | "4_hours" | "today" | "24_hours" | "this_week" | "1_month" | "3_months" | "1_year" | "never" | "custom";
interface ExpiryPresetOption {
    value: ExpiryPreset;
    label: string;
    description: string;
    getDate: () => Date | null;
}
/**
 * Get expiry date from preset.
 */
declare function getExpiryFromPreset(preset: ExpiryPreset): Date | null;
/**
 * All available expiry presets with labels.
 */
declare const EXPIRY_PRESETS: ExpiryPresetOption[];
interface RateLimitPreset {
    label: string;
    value: RateLimitConfig$1;
}
declare const RATE_LIMIT_PRESETS: RateLimitPreset[];
/**
 * Check if a permission is currently valid based on time controls.
 */
declare function isPermissionValidNow(policy: AccessPolicy): {
    valid: boolean;
    reason?: string;
};
/**
 * Format an access policy for display.
 */
declare function formatAccessPolicySummary(policy: AccessPolicy): string[];

/**
 * Resource identifier format: <resourceType>:<provider>
 * Examples: llm:groq, llm:gemini, mail:resend
 */
type ResourceId = `${string}:${string}`;
/**
 * Parse a resource ID into its components.
 */
declare function parseResourceId(resourceId: string): {
    resourceType: string;
    provider: string;
};
/**
 * Create a resource ID from components.
 */
declare function createResourceId(resourceType: string, provider: string): ResourceId;
/**
 * Pairing string info parsed from pair::<url>::<code>
 */
interface PairingInfo {
    proxyUrl: string;
    connectCode: string;
}
/**
 * Rate limit configuration.
 */
interface RateLimitConfig {
    maxRequests: number;
    windowSeconds: number;
}
/**
 * Permission request for an app.
 */
interface PermissionRequest {
    resourceId: string;
    actions: string[];
    constraints?: Record<string, unknown>;
    rateLimit?: RateLimitConfig;
}
/**
 * App metadata for registration.
 */
interface AppMetadata {
    name: string;
    description?: string;
    homepage?: string;
}
/**
 * Gateway config stored after approval.
 */
interface GatewayConfig {
    appId: string;
    proxyUrl: string;
}
/**
 * Resource constraint types (generic).
 */
interface ResourceConstraints {
    allowedModels?: string[];
    maxOutputTokens?: number;
    maxInputTokens?: number;
    allowStreaming?: boolean;
    allowedFromDomains?: string[];
    maxRecipients?: number;
    allowHtml?: boolean;
    maxRequestBodySize?: number;
    custom?: Record<string, unknown>;
}

export { type AccessPolicy, type AppMetadata, AppMetadataSchema, type BurstConfig, type ChatCompletionRequest, ChatCompletionRequestSchema, type ChatMessage, ChatMessageSchema, EXPIRY_PRESETS, type EmailConstraints, ErrorCode, type ExpiryPreset, type ExpiryPresetOption, type GatewayConfig, GatewayError, type HTTPConstraints, type InstallRequest, InstallRequestSchema, type LLMConstraints, type PairingInfo, type PermissionRequest, PermissionRequestSchema, type QuotaConfig, RATE_LIMIT_PRESETS, type RateLimitConfig, type RateLimitPreset, type ResourceConstraints, type ResourceId, type TimeWindow, type TokenBudget, createResourceId, formatAccessPolicySummary, getErrorStatus, getExpiryFromPreset, isPermissionValidNow, parseResourceId, resourceRequiredError };
