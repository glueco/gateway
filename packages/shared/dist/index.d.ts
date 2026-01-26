import { z, ZodSchema } from 'zod';

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
    ERR_SESSION_EXPIRED = "ERR_SESSION_EXPIRED",
    ERR_UNSUPPORTED_POP_VERSION = "ERR_UNSUPPORTED_POP_VERSION",
    ERR_POLICY_VIOLATION = "ERR_POLICY_VIOLATION",
    ERR_MODEL_NOT_ALLOWED = "ERR_MODEL_NOT_ALLOWED",
    ERR_MAX_TOKENS_EXCEEDED = "ERR_MAX_TOKENS_EXCEEDED",
    ERR_TOOLS_NOT_ALLOWED = "ERR_TOOLS_NOT_ALLOWED",
    ERR_STREAMING_NOT_ALLOWED = "ERR_STREAMING_NOT_ALLOWED"
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
    readonly requestId?: string;
    constructor(code: ErrorCode, message: string, options?: {
        details?: Record<string, unknown>;
        requestId?: string;
    });
    toJSON(): {
        error: {
            details?: Record<string, unknown> | undefined;
            requestId?: string | undefined;
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
 * Standard error response schema.
 * All API errors should conform to this shape.
 */
declare const GatewayErrorResponseSchema: z.ZodObject<{
    error: z.ZodObject<{
        code: z.ZodString;
        message: z.ZodString;
        requestId: z.ZodOptional<z.ZodString>;
        details: z.ZodOptional<z.ZodUnknown>;
    }, "strip", z.ZodTypeAny, {
        code: string;
        message: string;
        details?: unknown;
        requestId?: string | undefined;
    }, {
        code: string;
        message: string;
        details?: unknown;
        requestId?: string | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    error: {
        code: string;
        message: string;
        details?: unknown;
        requestId?: string | undefined;
    };
}, {
    error: {
        code: string;
        message: string;
        details?: unknown;
        requestId?: string | undefined;
    };
}>;
type GatewayErrorResponse = z.infer<typeof GatewayErrorResponseSchema>;
/**
 * Create a standard error response object.
 */
declare function createErrorResponse(code: string, message: string, options?: {
    requestId?: string;
    details?: unknown;
}): GatewayErrorResponse;

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
 * Includes optional requested duration for apps to suggest their needs.
 */
declare const PermissionRequestSchema: z.ZodObject<{
    resourceId: z.ZodString;
    actions: z.ZodArray<z.ZodString, "many">;
    constraints: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    /** Optional: App's requested/preferred duration for this permission */
    requestedDuration: z.ZodOptional<z.ZodUnion<[z.ZodObject<{
        type: z.ZodLiteral<"preset">;
        preset: z.ZodEnum<["1_hour", "4_hours", "24_hours", "1_week", "1_month", "3_months", "1_year", "forever", "custom"]>;
    }, "strip", z.ZodTypeAny, {
        type: "preset";
        preset: "custom" | "1_hour" | "4_hours" | "24_hours" | "1_week" | "1_month" | "3_months" | "1_year" | "forever";
    }, {
        type: "preset";
        preset: "custom" | "1_hour" | "4_hours" | "24_hours" | "1_week" | "1_month" | "3_months" | "1_year" | "forever";
    }>, z.ZodObject<{
        type: z.ZodLiteral<"duration">;
        durationMs: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        type: "duration";
        durationMs: number;
    }, {
        type: "duration";
        durationMs: number;
    }>, z.ZodObject<{
        type: z.ZodLiteral<"until">;
        expiresAt: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        type: "until";
        expiresAt: string;
    }, {
        type: "until";
        expiresAt: string;
    }>]>>;
}, "strip", z.ZodTypeAny, {
    resourceId: string;
    actions: string[];
    constraints?: Record<string, unknown> | undefined;
    requestedDuration?: {
        type: "preset";
        preset: "custom" | "1_hour" | "4_hours" | "24_hours" | "1_week" | "1_month" | "3_months" | "1_year" | "forever";
    } | {
        type: "duration";
        durationMs: number;
    } | {
        type: "until";
        expiresAt: string;
    } | undefined;
}, {
    resourceId: string;
    actions: string[];
    constraints?: Record<string, unknown> | undefined;
    requestedDuration?: {
        type: "preset";
        preset: "custom" | "1_hour" | "4_hours" | "24_hours" | "1_week" | "1_month" | "3_months" | "1_year" | "forever";
    } | {
        type: "duration";
        durationMs: number;
    } | {
        type: "until";
        expiresAt: string;
    } | undefined;
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
        /** Optional: App's requested/preferred duration for this permission */
        requestedDuration: z.ZodOptional<z.ZodUnion<[z.ZodObject<{
            type: z.ZodLiteral<"preset">;
            preset: z.ZodEnum<["1_hour", "4_hours", "24_hours", "1_week", "1_month", "3_months", "1_year", "forever", "custom"]>;
        }, "strip", z.ZodTypeAny, {
            type: "preset";
            preset: "custom" | "1_hour" | "4_hours" | "24_hours" | "1_week" | "1_month" | "3_months" | "1_year" | "forever";
        }, {
            type: "preset";
            preset: "custom" | "1_hour" | "4_hours" | "24_hours" | "1_week" | "1_month" | "3_months" | "1_year" | "forever";
        }>, z.ZodObject<{
            type: z.ZodLiteral<"duration">;
            durationMs: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            type: "duration";
            durationMs: number;
        }, {
            type: "duration";
            durationMs: number;
        }>, z.ZodObject<{
            type: z.ZodLiteral<"until">;
            expiresAt: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            type: "until";
            expiresAt: string;
        }, {
            type: "until";
            expiresAt: string;
        }>]>>;
    }, "strip", z.ZodTypeAny, {
        resourceId: string;
        actions: string[];
        constraints?: Record<string, unknown> | undefined;
        requestedDuration?: {
            type: "preset";
            preset: "custom" | "1_hour" | "4_hours" | "24_hours" | "1_week" | "1_month" | "3_months" | "1_year" | "forever";
        } | {
            type: "duration";
            durationMs: number;
        } | {
            type: "until";
            expiresAt: string;
        } | undefined;
    }, {
        resourceId: string;
        actions: string[];
        constraints?: Record<string, unknown> | undefined;
        requestedDuration?: {
            type: "preset";
            preset: "custom" | "1_hour" | "4_hours" | "24_hours" | "1_week" | "1_month" | "3_months" | "1_year" | "forever";
        } | {
            type: "duration";
            durationMs: number;
        } | {
            type: "until";
            expiresAt: string;
        } | undefined;
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
        requestedDuration?: {
            type: "preset";
            preset: "custom" | "1_hour" | "4_hours" | "24_hours" | "1_week" | "1_month" | "3_months" | "1_year" | "forever";
        } | {
            type: "duration";
            durationMs: number;
        } | {
            type: "until";
            expiresAt: string;
        } | undefined;
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
        requestedDuration?: {
            type: "preset";
            preset: "custom" | "1_hour" | "4_hours" | "24_hours" | "1_week" | "1_month" | "3_months" | "1_year" | "forever";
        } | {
            type: "duration";
            durationMs: number;
        } | {
            type: "until";
            expiresAt: string;
        } | undefined;
    }[];
    redirectUri: string;
}>;
type InstallRequest = z.infer<typeof InstallRequestSchema>;
/**
 * Resource auth configuration in discovery response.
 */
declare const ResourceAuthSchema: z.ZodObject<{
    pop: z.ZodObject<{
        version: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        version: number;
    }, {
        version: number;
    }>;
}, "strip", z.ZodTypeAny, {
    pop: {
        version: number;
    };
}, {
    pop: {
        version: number;
    };
}>;
/**
 * Resource entry in discovery response.
 */
declare const ResourceDiscoveryEntrySchema: z.ZodObject<{
    resourceId: z.ZodString;
    actions: z.ZodArray<z.ZodString, "many">;
    auth: z.ZodObject<{
        pop: z.ZodObject<{
            version: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            version: number;
        }, {
            version: number;
        }>;
    }, "strip", z.ZodTypeAny, {
        pop: {
            version: number;
        };
    }, {
        pop: {
            version: number;
        };
    }>;
    constraints: z.ZodOptional<z.ZodObject<{
        supports: z.ZodArray<z.ZodString, "many">;
    }, "strip", z.ZodTypeAny, {
        supports: string[];
    }, {
        supports: string[];
    }>>;
}, "strip", z.ZodTypeAny, {
    resourceId: string;
    actions: string[];
    auth: {
        pop: {
            version: number;
        };
    };
    constraints?: {
        supports: string[];
    } | undefined;
}, {
    resourceId: string;
    actions: string[];
    auth: {
        pop: {
            version: number;
        };
    };
    constraints?: {
        supports: string[];
    } | undefined;
}>;
/**
 * Gateway info in discovery response.
 */
declare const GatewayInfoSchema: z.ZodObject<{
    version: z.ZodString;
    name: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    version: string;
    name?: string | undefined;
}, {
    version: string;
    name?: string | undefined;
}>;
/**
 * Full discovery response schema.
 */
declare const ResourcesDiscoveryResponseSchema: z.ZodObject<{
    gateway: z.ZodObject<{
        version: z.ZodString;
        name: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        version: string;
        name?: string | undefined;
    }, {
        version: string;
        name?: string | undefined;
    }>;
    resources: z.ZodArray<z.ZodObject<{
        resourceId: z.ZodString;
        actions: z.ZodArray<z.ZodString, "many">;
        auth: z.ZodObject<{
            pop: z.ZodObject<{
                version: z.ZodNumber;
            }, "strip", z.ZodTypeAny, {
                version: number;
            }, {
                version: number;
            }>;
        }, "strip", z.ZodTypeAny, {
            pop: {
                version: number;
            };
        }, {
            pop: {
                version: number;
            };
        }>;
        constraints: z.ZodOptional<z.ZodObject<{
            supports: z.ZodArray<z.ZodString, "many">;
        }, "strip", z.ZodTypeAny, {
            supports: string[];
        }, {
            supports: string[];
        }>>;
    }, "strip", z.ZodTypeAny, {
        resourceId: string;
        actions: string[];
        auth: {
            pop: {
                version: number;
            };
        };
        constraints?: {
            supports: string[];
        } | undefined;
    }, {
        resourceId: string;
        actions: string[];
        auth: {
            pop: {
                version: number;
            };
        };
        constraints?: {
            supports: string[];
        } | undefined;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    gateway: {
        version: string;
        name?: string | undefined;
    };
    resources: {
        resourceId: string;
        actions: string[];
        auth: {
            pop: {
                version: number;
            };
        };
        constraints?: {
            supports: string[];
        } | undefined;
    }[];
}, {
    gateway: {
        version: string;
        name?: string | undefined;
    };
    resources: {
        resourceId: string;
        actions: string[];
        auth: {
            pop: {
                version: number;
            };
        };
        constraints?: {
            supports: string[];
        } | undefined;
    }[];
}>;
type ResourcesDiscoveryResponse = z.infer<typeof ResourcesDiscoveryResponseSchema>;
type ResourceDiscoveryEntry = z.infer<typeof ResourceDiscoveryEntrySchema>;
type GatewayInfo = z.infer<typeof GatewayInfoSchema>;

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
 * Per-model rate limit configuration.
 * Allows fine-grained control over different models.
 */
interface ModelRateLimit {
    /** Model identifier */
    model: string;
    /** Maximum requests per window for this model */
    maxRequests: number;
    /** Window duration in seconds */
    windowSeconds: number;
    /** Maximum output tokens per request for this model (overrides global) */
    maxOutputTokens?: number;
    /** Daily token budget for this specific model */
    dailyTokenBudget?: number;
    /** Monthly token budget for this specific model */
    monthlyTokenBudget?: number;
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
    /** Per-model rate limits (overrides global rate limits) */
    modelRateLimits?: ModelRateLimit[];
    /** Allow tool/function calling */
    allowTools?: boolean;
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
 * PoP header schema for v1 protocol.
 * Validates all required headers for PoP authentication.
 */
declare const PopHeadersV1Schema: z.ZodObject<{
    "x-pop-v": z.ZodLiteral<"1">;
    "x-app-id": z.ZodString;
    "x-ts": z.ZodString;
    "x-nonce": z.ZodString;
    "x-sig": z.ZodString;
}, "strip", z.ZodTypeAny, {
    "x-pop-v": "1";
    "x-app-id": string;
    "x-ts": string;
    "x-nonce": string;
    "x-sig": string;
}, {
    "x-pop-v": "1";
    "x-app-id": string;
    "x-ts": string;
    "x-nonce": string;
    "x-sig": string;
}>;
type PopHeadersV1 = z.infer<typeof PopHeadersV1Schema>;
/**
 * Parameters for building a canonical request string.
 */
interface CanonicalRequestParams {
    /** HTTP method (will be uppercased) */
    method: string;
    /** URL path with query string (e.g., "/v1/chat/completions?stream=true") */
    pathWithQuery: string;
    /** App ID from x-app-id header */
    appId: string;
    /** Unix timestamp from x-ts header */
    ts: string;
    /** Nonce from x-nonce header */
    nonce: string;
    /** Base64url-encoded SHA-256 hash of request body */
    bodyHash: string;
}
/**
 * Build the canonical request string for PoP v1 signature.
 *
 * Format:
 * ```
 * v1\n
 * <METHOD>\n
 * <PATH_WITH_QUERY>\n
 * <APP_ID>\n
 * <TS>\n
 * <NONCE>\n
 * <BODY_HASH>\n
 * ```
 *
 * @param params - The canonical request parameters
 * @returns The canonical request string to be signed
 *
 * @example
 * const canonical = buildCanonicalRequestV1({
 *   method: "POST",
 *   pathWithQuery: "/v1/chat/completions?stream=true",
 *   appId: "app_123",
 *   ts: "1706000000",
 *   nonce: "abc123xyz456def7",
 *   bodyHash: "base64url-sha256-hash",
 * });
 */
declare function buildCanonicalRequestV1(params: CanonicalRequestParams): string;
/**
 * Extract path with query from a URL.
 * Combines pathname and search (including '?' when present).
 *
 * @example
 * getPathWithQuery(new URL("https://example.com/v1/chat?stream=true"))
 * // Returns: "/v1/chat?stream=true"
 *
 * getPathWithQuery(new URL("https://example.com/v1/chat"))
 * // Returns: "/v1/chat"
 */
declare function getPathWithQuery(url: URL): string;
/**
 * Current PoP protocol version.
 */
declare const POP_VERSION: "1";
/**
 * Error codes specific to PoP authentication.
 */
declare enum PopErrorCode {
    UNSUPPORTED_VERSION = "ERR_UNSUPPORTED_POP_VERSION"
}

/**
 * Extracted request fields for policy enforcement.
 * These are normalized, enforceable knobs extracted from provider-native requests.
 * All fields are optional since extraction may fail or fields may not apply.
 */
declare const ExtractedRequestSchema: z.ZodObject<{
    model: z.ZodOptional<z.ZodString>;
    maxOutputTokens: z.ZodOptional<z.ZodNumber>;
    usesTools: z.ZodOptional<z.ZodBoolean>;
    stream: z.ZodOptional<z.ZodBoolean>;
    fromDomain: z.ZodOptional<z.ZodString>;
    toDomains: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    recipientCount: z.ZodOptional<z.ZodNumber>;
    contentType: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    model?: string | undefined;
    stream?: boolean | undefined;
    maxOutputTokens?: number | undefined;
    usesTools?: boolean | undefined;
    fromDomain?: string | undefined;
    toDomains?: string[] | undefined;
    recipientCount?: number | undefined;
    contentType?: string | undefined;
}, {
    model?: string | undefined;
    stream?: boolean | undefined;
    maxOutputTokens?: number | undefined;
    usesTools?: boolean | undefined;
    fromDomain?: string | undefined;
    toDomains?: string[] | undefined;
    recipientCount?: number | undefined;
    contentType?: string | undefined;
}>;
type ExtractedRequest = z.infer<typeof ExtractedRequestSchema>;
/**
 * Enforcement metadata that target apps may optionally provide.
 * This is NOT required for enforcement - the proxy can operate without it.
 * Treat as advisory only.
 */
declare const EnforcementMetaSchema: z.ZodObject<{
    /** App-provided request ID for correlation */
    requestId: z.ZodOptional<z.ZodString>;
    /** Declared intent (advisory only, not enforced) */
    intent: z.ZodOptional<z.ZodString>;
    /** App-declared expected model (advisory only) */
    expectedModel: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    requestId?: string | undefined;
    intent?: string | undefined;
    expectedModel?: string | undefined;
}, {
    requestId?: string | undefined;
    intent?: string | undefined;
    expectedModel?: string | undefined;
}>;
type EnforcementMeta = z.infer<typeof EnforcementMetaSchema>;
/**
 * Policy definition for enforcement.
 * This mirrors ResourceConstraints but is focused on enforcement.
 */
interface EnforcementPolicy {
    allowedModels?: string[];
    maxOutputTokens?: number;
    allowTools?: boolean;
    allowStreaming?: boolean;
    allowedFromDomains?: string[];
    allowedToDomains?: string[];
    maxRecipients?: number;
    maxRequestBodySize?: number;
}
/**
 * Result of policy enforcement.
 */
interface EnforcementResult {
    allowed: boolean;
    violation?: {
        code: string;
        message: string;
        field: string;
        actual?: unknown;
        limit?: unknown;
    };
}

/**
 * Plugin authentication configuration.
 */
declare const PluginAuthSchema: z.ZodObject<{
    pop: z.ZodObject<{
        version: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        version: number;
    }, {
        version: number;
    }>;
}, "strip", z.ZodTypeAny, {
    pop: {
        version: number;
    };
}, {
    pop: {
        version: number;
    };
}>;
type PluginAuth = z.infer<typeof PluginAuthSchema>;
/**
 * Plugin support configuration.
 * Describes which enforcement knobs the plugin supports.
 */
declare const PluginSupportsSchema: z.ZodObject<{
    enforcement: z.ZodArray<z.ZodString, "many">;
}, "strip", z.ZodTypeAny, {
    enforcement: string[];
}, {
    enforcement: string[];
}>;
type PluginSupports = z.infer<typeof PluginSupportsSchema>;
/**
 * Extractor descriptor - describes how to extract enforceable fields.
 * Can reference a function name (for core extractors) or provide inline config.
 */
declare const ExtractorDescriptorSchema: z.ZodObject<{
    /** Reference to core extractor by name (e.g., "openai-compatible", "gemini") */
    type: z.ZodOptional<z.ZodString>;
    /** Custom extraction config (for future use) */
    config: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    type?: string | undefined;
    config?: Record<string, unknown> | undefined;
}, {
    type?: string | undefined;
    config?: Record<string, unknown> | undefined;
}>;
type ExtractorDescriptor = z.infer<typeof ExtractorDescriptorSchema>;
/**
 * Credential schema field descriptor.
 * Used for UI generation to collect provider credentials.
 */
declare const CredentialFieldSchema: z.ZodObject<{
    name: z.ZodString;
    type: z.ZodEnum<["string", "secret", "url", "number", "boolean"]>;
    label: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    required: z.ZodDefault<z.ZodBoolean>;
    default: z.ZodOptional<z.ZodUnknown>;
}, "strip", z.ZodTypeAny, {
    type: "string" | "number" | "boolean" | "url" | "secret";
    name: string;
    required: boolean;
    label: string;
    description?: string | undefined;
    default?: unknown;
}, {
    type: "string" | "number" | "boolean" | "url" | "secret";
    name: string;
    label: string;
    description?: string | undefined;
    required?: boolean | undefined;
    default?: unknown;
}>;
type CredentialField = z.infer<typeof CredentialFieldSchema>;
/**
 * Full credential schema for a plugin.
 */
declare const PluginCredentialSchemaSchema: z.ZodObject<{
    fields: z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        type: z.ZodEnum<["string", "secret", "url", "number", "boolean"]>;
        label: z.ZodString;
        description: z.ZodOptional<z.ZodString>;
        required: z.ZodDefault<z.ZodBoolean>;
        default: z.ZodOptional<z.ZodUnknown>;
    }, "strip", z.ZodTypeAny, {
        type: "string" | "number" | "boolean" | "url" | "secret";
        name: string;
        required: boolean;
        label: string;
        description?: string | undefined;
        default?: unknown;
    }, {
        type: "string" | "number" | "boolean" | "url" | "secret";
        name: string;
        label: string;
        description?: string | undefined;
        required?: boolean | undefined;
        default?: unknown;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    fields: {
        type: "string" | "number" | "boolean" | "url" | "secret";
        name: string;
        required: boolean;
        label: string;
        description?: string | undefined;
        default?: unknown;
    }[];
}, {
    fields: {
        type: "string" | "number" | "boolean" | "url" | "secret";
        name: string;
        label: string;
        description?: string | undefined;
        required?: boolean | undefined;
        default?: unknown;
    }[];
}>;
type PluginCredentialSchema = z.infer<typeof PluginCredentialSchemaSchema>;
/**
 * Usage metrics extracted from response.
 */
interface PluginUsageMetrics {
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
    model?: string;
    custom?: Record<string, unknown>;
}
/**
 * Execute options passed to plugin.
 */
interface PluginExecuteOptions {
    stream: boolean;
    signal?: AbortSignal;
}
/**
 * Execute result from plugin.
 */
interface PluginExecuteResult {
    /** For non-streaming responses */
    response?: unknown;
    /** For streaming responses */
    stream?: ReadableStream<Uint8Array>;
    /** Response content type */
    contentType: string;
    /** Usage metrics (available for non-streaming) */
    usage?: PluginUsageMetrics;
}
/**
 * Validation result from plugin.
 */
interface PluginValidationResult {
    valid: boolean;
    error?: string;
    /** Transformed/validated input ready for execution */
    shapedInput?: unknown;
}
/**
 * Mapped error from plugin.
 */
interface PluginMappedError {
    status: number;
    code: string;
    message: string;
    retryable: boolean;
}
/**
 * Context for plugin execution.
 * Contains resolved credentials and configuration.
 */
interface PluginExecuteContext {
    /** The resolved API key/secret */
    secret: string;
    /** Additional config (e.g., custom baseUrl) */
    config: Record<string, unknown> | null;
}
/**
 * Resource constraints passed to validation.
 */
interface PluginResourceConstraints {
    allowedModels?: string[];
    maxOutputTokens?: number;
    maxInputTokens?: number;
    allowStreaming?: boolean;
    allowedFromDomains?: string[];
    maxRecipients?: number;
    allowHtml?: boolean;
    maxRequestBodySize?: number;
    [key: string]: unknown;
}
/**
 * Action schema descriptor for client contracts.
 * Describes the request/response schema for a single action.
 */
interface PluginActionSchemaDescriptor {
    /** Zod schema for validating requests (optional, can be inferred from contracts) */
    requestSchema?: ZodSchema;
    /** Zod schema for validating responses (optional, can be inferred from contracts) */
    responseSchema?: ZodSchema;
    /** Human-readable description of this action */
    description?: string;
}
/**
 * Client contract metadata for dual-entrypoint plugins.
 * Describes how the client-side interface is organized.
 *
 * Example:
 * ```ts
 * client: {
 *   namespace: "gemini",
 *   actions: {
 *     "chat.completions": {
 *       requestSchema: ChatCompletionRequestSchema,
 *       responseSchema: ChatCompletionResponseSchema,
 *       description: "Generate chat completions using Gemini"
 *     }
 *   }
 * }
 * ```
 */
interface PluginClientContract {
    /**
     * Namespace for the client wrapper (used for import organization).
     * Example: "gemini" -> `import { gemini } from "@glueco/plugin-llm-gemini/client"`
     */
    namespace: string;
    /**
     * Action descriptors mapping action names to their schemas.
     * Keys should match the `actions` array in the plugin.
     */
    actions: Record<string, PluginActionSchemaDescriptor>;
    /**
     * Package entrypoint for the client module.
     * Default: "./client"
     */
    entrypoint?: string;
}
/**
 * Core plugin contract.
 * Every plugin must implement this interface.
 */
interface PluginContract {
    /**
     * Unique plugin identifier.
     * Format: <resourceType>:<provider>
     * Examples: "llm:groq", "llm:gemini", "mail:resend"
     */
    readonly id: string;
    /**
     * Resource type category.
     * Examples: "llm", "mail", "storage"
     */
    readonly resourceType: string;
    /**
     * Provider name.
     * Examples: "groq", "gemini", "resend", "openai"
     */
    readonly provider: string;
    /**
     * Plugin version string (semver).
     */
    readonly version: string;
    /**
     * Human-readable display name.
     */
    readonly name: string;
    /**
     * Supported actions.
     * Examples: ["chat.completions", "models.list"]
     */
    readonly actions: string[];
    /**
     * Authentication configuration for discovery.
     */
    readonly auth: PluginAuth;
    /**
     * Enforcement support configuration.
     */
    readonly supports: PluginSupports;
    /**
     * Optional extractor descriptors per action.
     * Key = action name, value = extractor descriptor.
     */
    readonly extractors?: Record<string, ExtractorDescriptor>;
    /**
     * Optional credential schema for UI generation.
     */
    readonly credentialSchema?: PluginCredentialSchema;
    /**
     * Optional client contract metadata for dual-entrypoint plugins.
     * Describes the client-side interface for typed wrappers.
     *
     * This metadata is used by:
     * - SDK typed wrappers to provide autocomplete
     * - Documentation generation
     * - System-check app (optional validation)
     */
    readonly client?: PluginClientContract;
    /**
     * Validate input and apply constraints.
     * Returns shaped input ready for execution.
     */
    validateAndShape(action: string, input: unknown, constraints: PluginResourceConstraints): PluginValidationResult;
    /**
     * Execute the resource action.
     */
    execute(action: string, shapedInput: unknown, ctx: PluginExecuteContext, options: PluginExecuteOptions): Promise<PluginExecuteResult>;
    /**
     * Extract usage metrics from response.
     */
    extractUsage(response: unknown): PluginUsageMetrics;
    /**
     * Map provider errors to standardized format.
     */
    mapError(error: unknown): PluginMappedError;
}
/**
 * Schema to validate plugin metadata at registration.
 */
declare const PluginClientContractSchema: z.ZodObject<{
    namespace: z.ZodString;
    actions: z.ZodRecord<z.ZodString, z.ZodObject<{
        requestSchema: z.ZodOptional<z.ZodAny>;
        responseSchema: z.ZodOptional<z.ZodAny>;
        description: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        description?: string | undefined;
        requestSchema?: any;
        responseSchema?: any;
    }, {
        description?: string | undefined;
        requestSchema?: any;
        responseSchema?: any;
    }>>;
    entrypoint: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    actions: Record<string, {
        description?: string | undefined;
        requestSchema?: any;
        responseSchema?: any;
    }>;
    namespace: string;
    entrypoint?: string | undefined;
}, {
    actions: Record<string, {
        description?: string | undefined;
        requestSchema?: any;
        responseSchema?: any;
    }>;
    namespace: string;
    entrypoint?: string | undefined;
}>;
declare const PluginMetadataSchema: z.ZodObject<{
    id: z.ZodString;
    resourceType: z.ZodString;
    provider: z.ZodString;
    version: z.ZodString;
    name: z.ZodString;
    actions: z.ZodArray<z.ZodString, "many">;
    auth: z.ZodObject<{
        pop: z.ZodObject<{
            version: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            version: number;
        }, {
            version: number;
        }>;
    }, "strip", z.ZodTypeAny, {
        pop: {
            version: number;
        };
    }, {
        pop: {
            version: number;
        };
    }>;
    supports: z.ZodObject<{
        enforcement: z.ZodArray<z.ZodString, "many">;
    }, "strip", z.ZodTypeAny, {
        enforcement: string[];
    }, {
        enforcement: string[];
    }>;
    extractors: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodObject<{
        /** Reference to core extractor by name (e.g., "openai-compatible", "gemini") */
        type: z.ZodOptional<z.ZodString>;
        /** Custom extraction config (for future use) */
        config: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    }, "strip", z.ZodTypeAny, {
        type?: string | undefined;
        config?: Record<string, unknown> | undefined;
    }, {
        type?: string | undefined;
        config?: Record<string, unknown> | undefined;
    }>>>;
    credentialSchema: z.ZodOptional<z.ZodObject<{
        fields: z.ZodArray<z.ZodObject<{
            name: z.ZodString;
            type: z.ZodEnum<["string", "secret", "url", "number", "boolean"]>;
            label: z.ZodString;
            description: z.ZodOptional<z.ZodString>;
            required: z.ZodDefault<z.ZodBoolean>;
            default: z.ZodOptional<z.ZodUnknown>;
        }, "strip", z.ZodTypeAny, {
            type: "string" | "number" | "boolean" | "url" | "secret";
            name: string;
            required: boolean;
            label: string;
            description?: string | undefined;
            default?: unknown;
        }, {
            type: "string" | "number" | "boolean" | "url" | "secret";
            name: string;
            label: string;
            description?: string | undefined;
            required?: boolean | undefined;
            default?: unknown;
        }>, "many">;
    }, "strip", z.ZodTypeAny, {
        fields: {
            type: "string" | "number" | "boolean" | "url" | "secret";
            name: string;
            required: boolean;
            label: string;
            description?: string | undefined;
            default?: unknown;
        }[];
    }, {
        fields: {
            type: "string" | "number" | "boolean" | "url" | "secret";
            name: string;
            label: string;
            description?: string | undefined;
            required?: boolean | undefined;
            default?: unknown;
        }[];
    }>>;
    client: z.ZodOptional<z.ZodObject<{
        namespace: z.ZodString;
        actions: z.ZodRecord<z.ZodString, z.ZodObject<{
            requestSchema: z.ZodOptional<z.ZodAny>;
            responseSchema: z.ZodOptional<z.ZodAny>;
            description: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            description?: string | undefined;
            requestSchema?: any;
            responseSchema?: any;
        }, {
            description?: string | undefined;
            requestSchema?: any;
            responseSchema?: any;
        }>>;
        entrypoint: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        actions: Record<string, {
            description?: string | undefined;
            requestSchema?: any;
            responseSchema?: any;
        }>;
        namespace: string;
        entrypoint?: string | undefined;
    }, {
        actions: Record<string, {
            description?: string | undefined;
            requestSchema?: any;
            responseSchema?: any;
        }>;
        namespace: string;
        entrypoint?: string | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    name: string;
    id: string;
    actions: string[];
    version: string;
    auth: {
        pop: {
            version: number;
        };
    };
    supports: {
        enforcement: string[];
    };
    resourceType: string;
    provider: string;
    extractors?: Record<string, {
        type?: string | undefined;
        config?: Record<string, unknown> | undefined;
    }> | undefined;
    credentialSchema?: {
        fields: {
            type: "string" | "number" | "boolean" | "url" | "secret";
            name: string;
            required: boolean;
            label: string;
            description?: string | undefined;
            default?: unknown;
        }[];
    } | undefined;
    client?: {
        actions: Record<string, {
            description?: string | undefined;
            requestSchema?: any;
            responseSchema?: any;
        }>;
        namespace: string;
        entrypoint?: string | undefined;
    } | undefined;
}, {
    name: string;
    id: string;
    actions: string[];
    version: string;
    auth: {
        pop: {
            version: number;
        };
    };
    supports: {
        enforcement: string[];
    };
    resourceType: string;
    provider: string;
    extractors?: Record<string, {
        type?: string | undefined;
        config?: Record<string, unknown> | undefined;
    }> | undefined;
    credentialSchema?: {
        fields: {
            type: "string" | "number" | "boolean" | "url" | "secret";
            name: string;
            label: string;
            description?: string | undefined;
            required?: boolean | undefined;
            default?: unknown;
        }[];
    } | undefined;
    client?: {
        actions: Record<string, {
            description?: string | undefined;
            requestSchema?: any;
            responseSchema?: any;
        }>;
        namespace: string;
        entrypoint?: string | undefined;
    } | undefined;
}>;
type PluginMetadata = z.infer<typeof PluginMetadataSchema>;
/**
 * Validate plugin object has correct metadata.
 */
declare function validatePluginMetadata(plugin: unknown): {
    valid: boolean;
    error?: string;
    metadata?: PluginMetadata;
};
/**
 * Discovery entry format for plugins.
 */
interface PluginDiscoveryEntry {
    resourceId: string;
    actions: string[];
    auth: PluginAuth;
    version: string;
    constraints: {
        supports: string[];
    };
    /** Client entrypoint info (if SDK-compatible) */
    client?: {
        namespace: string;
        entrypoint: string;
    };
}
/**
 * Convert plugin to discovery entry format.
 * Includes version for client compatibility checks.
 *
 * TODO: Add version compatibility negotiation in future iteration.
 * The version exposed here allows target apps to verify they are
 * using a compatible client version.
 */
declare function pluginToDiscoveryEntry(plugin: PluginContract): PluginDiscoveryEntry;
/**
 * Base plugin options for creating plugins.
 */
interface CreatePluginOptions {
    id: string;
    resourceType: string;
    provider: string;
    version: string;
    name: string;
    actions: string[];
    auth?: PluginAuth;
    supports?: PluginSupports;
    extractors?: Record<string, ExtractorDescriptor>;
    credentialSchema?: PluginCredentialSchema;
    /** Client contract metadata for SDK-compatible plugins */
    client?: PluginClientContract;
}
/**
 * Default auth configuration.
 */
declare const DEFAULT_PLUGIN_AUTH: PluginAuth;
/**
 * Default supports configuration.
 */
declare const DEFAULT_PLUGIN_SUPPORTS: PluginSupports;
/**
 * Helper to create plugin with defaults.
 */
declare function createPluginBase(options: CreatePluginOptions): {
    id: string;
    resourceType: string;
    provider: string;
    version: string;
    name: string;
    actions: string[];
    auth: PluginAuth;
    supports: PluginSupports;
    extractors?: Record<string, ExtractorDescriptor>;
    credentialSchema?: PluginCredentialSchema;
    client?: PluginClientContract;
};

/**
 * Preset duration identifiers.
 * Apps can request these, and the proxy recognizes them.
 */
type DurationPresetId = "1_hour" | "4_hours" | "24_hours" | "1_week" | "1_month" | "3_months" | "1_year" | "forever" | "custom";
/**
 * Duration preset definition.
 */
interface DurationPreset {
    id: DurationPresetId;
    label: string;
    description: string;
    /** Duration in milliseconds, null = never expires */
    durationMs: number | null;
    /** Suggested for short-term testing */
    isTemporary?: boolean;
    /** Suggested for production use */
    isRecommended?: boolean;
}
/**
 * All available duration presets in order of duration.
 */
declare const DURATION_PRESETS: DurationPreset[];
/**
 * Get a preset by ID.
 */
declare function getDurationPreset(id: DurationPresetId): DurationPreset | undefined;
/**
 * Calculate expiry date from a duration preset ID.
 * @returns Date object or null for "forever"
 */
declare function getExpiryFromDurationPreset(presetId: DurationPresetId, fromDate?: Date): Date | null;
/**
 * Calculate expiry date from a duration in milliseconds.
 */
declare function getExpiryFromDuration(durationMs: number, fromDate?: Date): Date;
/**
 * Find the closest matching preset for a given duration.
 */
declare function findClosestPreset(durationMs: number | null): DurationPreset;
/**
 * Format a duration in milliseconds to human readable.
 */
declare function formatDuration(durationMs: number | null): string;
/**
 * Format an expiry date relative to now.
 */
declare function formatExpiryRelative(expiresAt: Date | null): string;
/**
 * Duration preset ID schema for validation.
 */
declare const DurationPresetIdSchema: z.ZodEnum<["1_hour", "4_hours", "24_hours", "1_week", "1_month", "3_months", "1_year", "forever", "custom"]>;
/**
 * Requested duration schema.
 * Apps can specify their preferred duration when requesting permissions.
 */
declare const RequestedDurationSchema: z.ZodUnion<[z.ZodObject<{
    type: z.ZodLiteral<"preset">;
    preset: z.ZodEnum<["1_hour", "4_hours", "24_hours", "1_week", "1_month", "3_months", "1_year", "forever", "custom"]>;
}, "strip", z.ZodTypeAny, {
    type: "preset";
    preset: "custom" | "1_hour" | "4_hours" | "24_hours" | "1_week" | "1_month" | "3_months" | "1_year" | "forever";
}, {
    type: "preset";
    preset: "custom" | "1_hour" | "4_hours" | "24_hours" | "1_week" | "1_month" | "3_months" | "1_year" | "forever";
}>, z.ZodObject<{
    type: z.ZodLiteral<"duration">;
    durationMs: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    type: "duration";
    durationMs: number;
}, {
    type: "duration";
    durationMs: number;
}>, z.ZodObject<{
    type: z.ZodLiteral<"until">;
    expiresAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    type: "until";
    expiresAt: string;
}, {
    type: "until";
    expiresAt: string;
}>]>;
type RequestedDuration = z.infer<typeof RequestedDurationSchema>;
/**
 * Resolve a RequestedDuration to an expiry Date (or null for forever).
 */
declare function resolveRequestedDuration(duration: RequestedDuration | undefined, fromDate?: Date): Date | null;
/**
 * Create a preset-based RequestedDuration.
 */
declare function createPresetDuration(preset: DurationPresetId): RequestedDuration;
/**
 * Create a duration-based RequestedDuration.
 */
declare function createDurationMs(durationMs: number): RequestedDuration;
/**
 * Create an until-based RequestedDuration.
 */
declare function createUntilDuration(expiresAt: Date): RequestedDuration;

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

export { type AccessPolicy, type AppMetadata, AppMetadataSchema, type BurstConfig, type CanonicalRequestParams, type ChatCompletionRequest, ChatCompletionRequestSchema, type ChatMessage, ChatMessageSchema, type CreatePluginOptions, type CredentialField, CredentialFieldSchema, DEFAULT_PLUGIN_AUTH, DEFAULT_PLUGIN_SUPPORTS, DURATION_PRESETS, type DurationPreset, type DurationPresetId, DurationPresetIdSchema, EXPIRY_PRESETS, type EmailConstraints, type EnforcementMeta, EnforcementMetaSchema, type EnforcementPolicy, type EnforcementResult, ErrorCode, type ExpiryPreset, type ExpiryPresetOption, type ExtractedRequest, ExtractedRequestSchema, type ExtractorDescriptor, ExtractorDescriptorSchema, type GatewayConfig, GatewayError, type GatewayErrorResponse, GatewayErrorResponseSchema, type GatewayInfo, GatewayInfoSchema, type HTTPConstraints, type InstallRequest, InstallRequestSchema, type LLMConstraints, type ModelRateLimit, POP_VERSION, type PairingInfo, type PermissionRequest, PermissionRequestSchema, type PluginActionSchemaDescriptor, type PluginAuth, PluginAuthSchema, type PluginClientContract, PluginClientContractSchema, type PluginContract, type PluginCredentialSchema, PluginCredentialSchemaSchema, type PluginDiscoveryEntry, type PluginExecuteContext, type PluginExecuteOptions, type PluginExecuteResult, type PluginMappedError, type PluginMetadata, PluginMetadataSchema, type PluginResourceConstraints, type PluginSupports, PluginSupportsSchema, type PluginUsageMetrics, type PluginValidationResult, PopErrorCode, type PopHeadersV1, PopHeadersV1Schema, type QuotaConfig, RATE_LIMIT_PRESETS, type RateLimitConfig, type RateLimitPreset, type RequestedDuration, RequestedDurationSchema, ResourceAuthSchema, type ResourceConstraints, type ResourceDiscoveryEntry, ResourceDiscoveryEntrySchema, type ResourceId, type ResourcesDiscoveryResponse, ResourcesDiscoveryResponseSchema, type TimeWindow, type TokenBudget, buildCanonicalRequestV1, createDurationMs, createErrorResponse, createPluginBase, createPresetDuration, createResourceId, createUntilDuration, findClosestPreset, formatAccessPolicySummary, formatDuration, formatExpiryRelative, getDurationPreset, getErrorStatus, getExpiryFromDuration, getExpiryFromDurationPreset, getExpiryFromPreset, getPathWithQuery, isPermissionValidNow, parseResourceId, pluginToDiscoveryEntry, resolveRequestedDuration, resourceRequiredError, validatePluginMetadata };
