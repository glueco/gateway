import { z } from 'zod';

declare const ChatMessageSchema: z.ZodObject<{
    role: z.ZodEnum<["system", "user", "assistant", "tool", "function"]>;
    content: z.ZodNullable<z.ZodUnion<[z.ZodString, z.ZodArray<z.ZodObject<{
        type: z.ZodEnum<["text", "image_url"]>;
        text: z.ZodOptional<z.ZodString>;
        image_url: z.ZodOptional<z.ZodObject<{
            url: z.ZodString;
            detail: z.ZodOptional<z.ZodEnum<["auto", "low", "high"]>>;
        }, "strip", z.ZodTypeAny, {
            url: string;
            detail?: "auto" | "low" | "high" | undefined;
        }, {
            url: string;
            detail?: "auto" | "low" | "high" | undefined;
        }>>;
    }, "strip", z.ZodTypeAny, {
        type: "text" | "image_url";
        text?: string | undefined;
        image_url?: {
            url: string;
            detail?: "auto" | "low" | "high" | undefined;
        } | undefined;
    }, {
        type: "text" | "image_url";
        text?: string | undefined;
        image_url?: {
            url: string;
            detail?: "auto" | "low" | "high" | undefined;
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
    function_call: z.ZodOptional<z.ZodObject<{
        name: z.ZodString;
        arguments: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        name: string;
        arguments: string;
    }, {
        name: string;
        arguments: string;
    }>>;
}, "strip", z.ZodTypeAny, {
    role: "function" | "system" | "user" | "assistant" | "tool";
    content: string | {
        type: "text" | "image_url";
        text?: string | undefined;
        image_url?: {
            url: string;
            detail?: "auto" | "low" | "high" | undefined;
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
    function_call?: {
        name: string;
        arguments: string;
    } | undefined;
}, {
    role: "function" | "system" | "user" | "assistant" | "tool";
    content: string | {
        type: "text" | "image_url";
        text?: string | undefined;
        image_url?: {
            url: string;
            detail?: "auto" | "low" | "high" | undefined;
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
    function_call?: {
        name: string;
        arguments: string;
    } | undefined;
}>;
type ChatMessage = z.infer<typeof ChatMessageSchema>;
declare const ToolSchema: z.ZodObject<{
    type: z.ZodLiteral<"function">;
    function: z.ZodObject<{
        name: z.ZodString;
        description: z.ZodOptional<z.ZodString>;
        parameters: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        strict: z.ZodOptional<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        name: string;
        description?: string | undefined;
        parameters?: Record<string, unknown> | undefined;
        strict?: boolean | undefined;
    }, {
        name: string;
        description?: string | undefined;
        parameters?: Record<string, unknown> | undefined;
        strict?: boolean | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    function: {
        name: string;
        description?: string | undefined;
        parameters?: Record<string, unknown> | undefined;
        strict?: boolean | undefined;
    };
    type: "function";
}, {
    function: {
        name: string;
        description?: string | undefined;
        parameters?: Record<string, unknown> | undefined;
        strict?: boolean | undefined;
    };
    type: "function";
}>;
type Tool = z.infer<typeof ToolSchema>;
declare const ChatCompletionRequestSchema: z.ZodObject<{
    model: z.ZodString;
    messages: z.ZodArray<z.ZodObject<{
        role: z.ZodEnum<["system", "user", "assistant", "tool", "function"]>;
        content: z.ZodNullable<z.ZodUnion<[z.ZodString, z.ZodArray<z.ZodObject<{
            type: z.ZodEnum<["text", "image_url"]>;
            text: z.ZodOptional<z.ZodString>;
            image_url: z.ZodOptional<z.ZodObject<{
                url: z.ZodString;
                detail: z.ZodOptional<z.ZodEnum<["auto", "low", "high"]>>;
            }, "strip", z.ZodTypeAny, {
                url: string;
                detail?: "auto" | "low" | "high" | undefined;
            }, {
                url: string;
                detail?: "auto" | "low" | "high" | undefined;
            }>>;
        }, "strip", z.ZodTypeAny, {
            type: "text" | "image_url";
            text?: string | undefined;
            image_url?: {
                url: string;
                detail?: "auto" | "low" | "high" | undefined;
            } | undefined;
        }, {
            type: "text" | "image_url";
            text?: string | undefined;
            image_url?: {
                url: string;
                detail?: "auto" | "low" | "high" | undefined;
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
        function_call: z.ZodOptional<z.ZodObject<{
            name: z.ZodString;
            arguments: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            name: string;
            arguments: string;
        }, {
            name: string;
            arguments: string;
        }>>;
    }, "strip", z.ZodTypeAny, {
        role: "function" | "system" | "user" | "assistant" | "tool";
        content: string | {
            type: "text" | "image_url";
            text?: string | undefined;
            image_url?: {
                url: string;
                detail?: "auto" | "low" | "high" | undefined;
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
        function_call?: {
            name: string;
            arguments: string;
        } | undefined;
    }, {
        role: "function" | "system" | "user" | "assistant" | "tool";
        content: string | {
            type: "text" | "image_url";
            text?: string | undefined;
            image_url?: {
                url: string;
                detail?: "auto" | "low" | "high" | undefined;
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
        function_call?: {
            name: string;
            arguments: string;
        } | undefined;
    }>, "many">;
    temperature: z.ZodOptional<z.ZodNumber>;
    top_p: z.ZodOptional<z.ZodNumber>;
    n: z.ZodOptional<z.ZodNumber>;
    stream: z.ZodOptional<z.ZodBoolean>;
    stream_options: z.ZodOptional<z.ZodObject<{
        include_usage: z.ZodOptional<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        include_usage?: boolean | undefined;
    }, {
        include_usage?: boolean | undefined;
    }>>;
    stop: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodArray<z.ZodString, "many">]>>;
    max_tokens: z.ZodOptional<z.ZodNumber>;
    max_completion_tokens: z.ZodOptional<z.ZodNumber>;
    presence_penalty: z.ZodOptional<z.ZodNumber>;
    frequency_penalty: z.ZodOptional<z.ZodNumber>;
    logit_bias: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodNumber>>;
    logprobs: z.ZodOptional<z.ZodBoolean>;
    top_logprobs: z.ZodOptional<z.ZodNumber>;
    user: z.ZodOptional<z.ZodString>;
    tools: z.ZodOptional<z.ZodArray<z.ZodObject<{
        type: z.ZodLiteral<"function">;
        function: z.ZodObject<{
            name: z.ZodString;
            description: z.ZodOptional<z.ZodString>;
            parameters: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
            strict: z.ZodOptional<z.ZodBoolean>;
        }, "strip", z.ZodTypeAny, {
            name: string;
            description?: string | undefined;
            parameters?: Record<string, unknown> | undefined;
            strict?: boolean | undefined;
        }, {
            name: string;
            description?: string | undefined;
            parameters?: Record<string, unknown> | undefined;
            strict?: boolean | undefined;
        }>;
    }, "strip", z.ZodTypeAny, {
        function: {
            name: string;
            description?: string | undefined;
            parameters?: Record<string, unknown> | undefined;
            strict?: boolean | undefined;
        };
        type: "function";
    }, {
        function: {
            name: string;
            description?: string | undefined;
            parameters?: Record<string, unknown> | undefined;
            strict?: boolean | undefined;
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
    parallel_tool_calls: z.ZodOptional<z.ZodBoolean>;
    response_format: z.ZodOptional<z.ZodUnion<[z.ZodObject<{
        type: z.ZodLiteral<"text">;
    }, "strip", z.ZodTypeAny, {
        type: "text";
    }, {
        type: "text";
    }>, z.ZodObject<{
        type: z.ZodLiteral<"json_object">;
    }, "strip", z.ZodTypeAny, {
        type: "json_object";
    }, {
        type: "json_object";
    }>, z.ZodObject<{
        type: z.ZodLiteral<"json_schema">;
        json_schema: z.ZodObject<{
            name: z.ZodString;
            description: z.ZodOptional<z.ZodString>;
            schema: z.ZodRecord<z.ZodString, z.ZodUnknown>;
            strict: z.ZodOptional<z.ZodBoolean>;
        }, "strip", z.ZodTypeAny, {
            name: string;
            schema: Record<string, unknown>;
            description?: string | undefined;
            strict?: boolean | undefined;
        }, {
            name: string;
            schema: Record<string, unknown>;
            description?: string | undefined;
            strict?: boolean | undefined;
        }>;
    }, "strip", z.ZodTypeAny, {
        type: "json_schema";
        json_schema: {
            name: string;
            schema: Record<string, unknown>;
            description?: string | undefined;
            strict?: boolean | undefined;
        };
    }, {
        type: "json_schema";
        json_schema: {
            name: string;
            schema: Record<string, unknown>;
            description?: string | undefined;
            strict?: boolean | undefined;
        };
    }>]>>;
    seed: z.ZodOptional<z.ZodNumber>;
    service_tier: z.ZodOptional<z.ZodEnum<["auto", "default"]>>;
}, "strip", z.ZodTypeAny, {
    model: string;
    messages: {
        role: "function" | "system" | "user" | "assistant" | "tool";
        content: string | {
            type: "text" | "image_url";
            text?: string | undefined;
            image_url?: {
                url: string;
                detail?: "auto" | "low" | "high" | undefined;
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
        function_call?: {
            name: string;
            arguments: string;
        } | undefined;
    }[];
    max_tokens?: number | undefined;
    user?: string | undefined;
    temperature?: number | undefined;
    top_p?: number | undefined;
    n?: number | undefined;
    stream?: boolean | undefined;
    stream_options?: {
        include_usage?: boolean | undefined;
    } | undefined;
    stop?: string | string[] | undefined;
    max_completion_tokens?: number | undefined;
    presence_penalty?: number | undefined;
    frequency_penalty?: number | undefined;
    logit_bias?: Record<string, number> | undefined;
    logprobs?: boolean | undefined;
    top_logprobs?: number | undefined;
    tools?: {
        function: {
            name: string;
            description?: string | undefined;
            parameters?: Record<string, unknown> | undefined;
            strict?: boolean | undefined;
        };
        type: "function";
    }[] | undefined;
    tool_choice?: "auto" | "none" | "required" | {
        function: {
            name: string;
        };
        type: "function";
    } | undefined;
    parallel_tool_calls?: boolean | undefined;
    response_format?: {
        type: "text";
    } | {
        type: "json_object";
    } | {
        type: "json_schema";
        json_schema: {
            name: string;
            schema: Record<string, unknown>;
            description?: string | undefined;
            strict?: boolean | undefined;
        };
    } | undefined;
    seed?: number | undefined;
    service_tier?: "auto" | "default" | undefined;
}, {
    model: string;
    messages: {
        role: "function" | "system" | "user" | "assistant" | "tool";
        content: string | {
            type: "text" | "image_url";
            text?: string | undefined;
            image_url?: {
                url: string;
                detail?: "auto" | "low" | "high" | undefined;
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
        function_call?: {
            name: string;
            arguments: string;
        } | undefined;
    }[];
    max_tokens?: number | undefined;
    user?: string | undefined;
    temperature?: number | undefined;
    top_p?: number | undefined;
    n?: number | undefined;
    stream?: boolean | undefined;
    stream_options?: {
        include_usage?: boolean | undefined;
    } | undefined;
    stop?: string | string[] | undefined;
    max_completion_tokens?: number | undefined;
    presence_penalty?: number | undefined;
    frequency_penalty?: number | undefined;
    logit_bias?: Record<string, number> | undefined;
    logprobs?: boolean | undefined;
    top_logprobs?: number | undefined;
    tools?: {
        function: {
            name: string;
            description?: string | undefined;
            parameters?: Record<string, unknown> | undefined;
            strict?: boolean | undefined;
        };
        type: "function";
    }[] | undefined;
    tool_choice?: "auto" | "none" | "required" | {
        function: {
            name: string;
        };
        type: "function";
    } | undefined;
    parallel_tool_calls?: boolean | undefined;
    response_format?: {
        type: "text";
    } | {
        type: "json_object";
    } | {
        type: "json_schema";
        json_schema: {
            name: string;
            schema: Record<string, unknown>;
            description?: string | undefined;
            strict?: boolean | undefined;
        };
    } | undefined;
    seed?: number | undefined;
    service_tier?: "auto" | "default" | undefined;
}>;
type ChatCompletionRequest = z.infer<typeof ChatCompletionRequestSchema>;
declare const ChatCompletionChoiceSchema: z.ZodObject<{
    index: z.ZodNumber;
    message: z.ZodObject<{
        role: z.ZodLiteral<"assistant">;
        content: z.ZodNullable<z.ZodString>;
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
        function_call: z.ZodOptional<z.ZodObject<{
            name: z.ZodString;
            arguments: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            name: string;
            arguments: string;
        }, {
            name: string;
            arguments: string;
        }>>;
        refusal: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    }, "strip", z.ZodTypeAny, {
        role: "assistant";
        content: string | null;
        tool_calls?: {
            function: {
                name: string;
                arguments: string;
            };
            type: "function";
            id: string;
        }[] | undefined;
        function_call?: {
            name: string;
            arguments: string;
        } | undefined;
        refusal?: string | null | undefined;
    }, {
        role: "assistant";
        content: string | null;
        tool_calls?: {
            function: {
                name: string;
                arguments: string;
            };
            type: "function";
            id: string;
        }[] | undefined;
        function_call?: {
            name: string;
            arguments: string;
        } | undefined;
        refusal?: string | null | undefined;
    }>;
    finish_reason: z.ZodNullable<z.ZodEnum<["stop", "length", "tool_calls", "content_filter", "function_call"]>>;
    logprobs: z.ZodOptional<z.ZodNullable<z.ZodObject<{
        content: z.ZodNullable<z.ZodArray<z.ZodObject<{
            token: z.ZodString;
            logprob: z.ZodNumber;
            bytes: z.ZodNullable<z.ZodArray<z.ZodNumber, "many">>;
            top_logprobs: z.ZodArray<z.ZodObject<{
                token: z.ZodString;
                logprob: z.ZodNumber;
                bytes: z.ZodNullable<z.ZodArray<z.ZodNumber, "many">>;
            }, "strip", z.ZodTypeAny, {
                token: string;
                logprob: number;
                bytes: number[] | null;
            }, {
                token: string;
                logprob: number;
                bytes: number[] | null;
            }>, "many">;
        }, "strip", z.ZodTypeAny, {
            top_logprobs: {
                token: string;
                logprob: number;
                bytes: number[] | null;
            }[];
            token: string;
            logprob: number;
            bytes: number[] | null;
        }, {
            top_logprobs: {
                token: string;
                logprob: number;
                bytes: number[] | null;
            }[];
            token: string;
            logprob: number;
            bytes: number[] | null;
        }>, "many">>;
    }, "strip", z.ZodTypeAny, {
        content: {
            top_logprobs: {
                token: string;
                logprob: number;
                bytes: number[] | null;
            }[];
            token: string;
            logprob: number;
            bytes: number[] | null;
        }[] | null;
    }, {
        content: {
            top_logprobs: {
                token: string;
                logprob: number;
                bytes: number[] | null;
            }[];
            token: string;
            logprob: number;
            bytes: number[] | null;
        }[] | null;
    }>>>;
}, "strip", z.ZodTypeAny, {
    message: {
        role: "assistant";
        content: string | null;
        tool_calls?: {
            function: {
                name: string;
                arguments: string;
            };
            type: "function";
            id: string;
        }[] | undefined;
        function_call?: {
            name: string;
            arguments: string;
        } | undefined;
        refusal?: string | null | undefined;
    };
    index: number;
    finish_reason: "length" | "tool_calls" | "function_call" | "stop" | "content_filter" | null;
    logprobs?: {
        content: {
            top_logprobs: {
                token: string;
                logprob: number;
                bytes: number[] | null;
            }[];
            token: string;
            logprob: number;
            bytes: number[] | null;
        }[] | null;
    } | null | undefined;
}, {
    message: {
        role: "assistant";
        content: string | null;
        tool_calls?: {
            function: {
                name: string;
                arguments: string;
            };
            type: "function";
            id: string;
        }[] | undefined;
        function_call?: {
            name: string;
            arguments: string;
        } | undefined;
        refusal?: string | null | undefined;
    };
    index: number;
    finish_reason: "length" | "tool_calls" | "function_call" | "stop" | "content_filter" | null;
    logprobs?: {
        content: {
            top_logprobs: {
                token: string;
                logprob: number;
                bytes: number[] | null;
            }[];
            token: string;
            logprob: number;
            bytes: number[] | null;
        }[] | null;
    } | null | undefined;
}>;
type ChatCompletionChoice = z.infer<typeof ChatCompletionChoiceSchema>;
declare const UsageSchema: z.ZodObject<{
    prompt_tokens: z.ZodNumber;
    completion_tokens: z.ZodNumber;
    total_tokens: z.ZodNumber;
    prompt_tokens_details: z.ZodOptional<z.ZodObject<{
        cached_tokens: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        cached_tokens?: number | undefined;
    }, {
        cached_tokens?: number | undefined;
    }>>;
    completion_tokens_details: z.ZodOptional<z.ZodObject<{
        reasoning_tokens: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        reasoning_tokens?: number | undefined;
    }, {
        reasoning_tokens?: number | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
    prompt_tokens_details?: {
        cached_tokens?: number | undefined;
    } | undefined;
    completion_tokens_details?: {
        reasoning_tokens?: number | undefined;
    } | undefined;
}, {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
    prompt_tokens_details?: {
        cached_tokens?: number | undefined;
    } | undefined;
    completion_tokens_details?: {
        reasoning_tokens?: number | undefined;
    } | undefined;
}>;
type Usage = z.infer<typeof UsageSchema>;
declare const ChatCompletionResponseSchema: z.ZodObject<{
    id: z.ZodString;
    object: z.ZodLiteral<"chat.completion">;
    created: z.ZodNumber;
    model: z.ZodString;
    choices: z.ZodArray<z.ZodObject<{
        index: z.ZodNumber;
        message: z.ZodObject<{
            role: z.ZodLiteral<"assistant">;
            content: z.ZodNullable<z.ZodString>;
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
            function_call: z.ZodOptional<z.ZodObject<{
                name: z.ZodString;
                arguments: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                name: string;
                arguments: string;
            }, {
                name: string;
                arguments: string;
            }>>;
            refusal: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        }, "strip", z.ZodTypeAny, {
            role: "assistant";
            content: string | null;
            tool_calls?: {
                function: {
                    name: string;
                    arguments: string;
                };
                type: "function";
                id: string;
            }[] | undefined;
            function_call?: {
                name: string;
                arguments: string;
            } | undefined;
            refusal?: string | null | undefined;
        }, {
            role: "assistant";
            content: string | null;
            tool_calls?: {
                function: {
                    name: string;
                    arguments: string;
                };
                type: "function";
                id: string;
            }[] | undefined;
            function_call?: {
                name: string;
                arguments: string;
            } | undefined;
            refusal?: string | null | undefined;
        }>;
        finish_reason: z.ZodNullable<z.ZodEnum<["stop", "length", "tool_calls", "content_filter", "function_call"]>>;
        logprobs: z.ZodOptional<z.ZodNullable<z.ZodObject<{
            content: z.ZodNullable<z.ZodArray<z.ZodObject<{
                token: z.ZodString;
                logprob: z.ZodNumber;
                bytes: z.ZodNullable<z.ZodArray<z.ZodNumber, "many">>;
                top_logprobs: z.ZodArray<z.ZodObject<{
                    token: z.ZodString;
                    logprob: z.ZodNumber;
                    bytes: z.ZodNullable<z.ZodArray<z.ZodNumber, "many">>;
                }, "strip", z.ZodTypeAny, {
                    token: string;
                    logprob: number;
                    bytes: number[] | null;
                }, {
                    token: string;
                    logprob: number;
                    bytes: number[] | null;
                }>, "many">;
            }, "strip", z.ZodTypeAny, {
                top_logprobs: {
                    token: string;
                    logprob: number;
                    bytes: number[] | null;
                }[];
                token: string;
                logprob: number;
                bytes: number[] | null;
            }, {
                top_logprobs: {
                    token: string;
                    logprob: number;
                    bytes: number[] | null;
                }[];
                token: string;
                logprob: number;
                bytes: number[] | null;
            }>, "many">>;
        }, "strip", z.ZodTypeAny, {
            content: {
                top_logprobs: {
                    token: string;
                    logprob: number;
                    bytes: number[] | null;
                }[];
                token: string;
                logprob: number;
                bytes: number[] | null;
            }[] | null;
        }, {
            content: {
                top_logprobs: {
                    token: string;
                    logprob: number;
                    bytes: number[] | null;
                }[];
                token: string;
                logprob: number;
                bytes: number[] | null;
            }[] | null;
        }>>>;
    }, "strip", z.ZodTypeAny, {
        message: {
            role: "assistant";
            content: string | null;
            tool_calls?: {
                function: {
                    name: string;
                    arguments: string;
                };
                type: "function";
                id: string;
            }[] | undefined;
            function_call?: {
                name: string;
                arguments: string;
            } | undefined;
            refusal?: string | null | undefined;
        };
        index: number;
        finish_reason: "length" | "tool_calls" | "function_call" | "stop" | "content_filter" | null;
        logprobs?: {
            content: {
                top_logprobs: {
                    token: string;
                    logprob: number;
                    bytes: number[] | null;
                }[];
                token: string;
                logprob: number;
                bytes: number[] | null;
            }[] | null;
        } | null | undefined;
    }, {
        message: {
            role: "assistant";
            content: string | null;
            tool_calls?: {
                function: {
                    name: string;
                    arguments: string;
                };
                type: "function";
                id: string;
            }[] | undefined;
            function_call?: {
                name: string;
                arguments: string;
            } | undefined;
            refusal?: string | null | undefined;
        };
        index: number;
        finish_reason: "length" | "tool_calls" | "function_call" | "stop" | "content_filter" | null;
        logprobs?: {
            content: {
                top_logprobs: {
                    token: string;
                    logprob: number;
                    bytes: number[] | null;
                }[];
                token: string;
                logprob: number;
                bytes: number[] | null;
            }[] | null;
        } | null | undefined;
    }>, "many">;
    usage: z.ZodOptional<z.ZodObject<{
        prompt_tokens: z.ZodNumber;
        completion_tokens: z.ZodNumber;
        total_tokens: z.ZodNumber;
        prompt_tokens_details: z.ZodOptional<z.ZodObject<{
            cached_tokens: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            cached_tokens?: number | undefined;
        }, {
            cached_tokens?: number | undefined;
        }>>;
        completion_tokens_details: z.ZodOptional<z.ZodObject<{
            reasoning_tokens: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            reasoning_tokens?: number | undefined;
        }, {
            reasoning_tokens?: number | undefined;
        }>>;
    }, "strip", z.ZodTypeAny, {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
        prompt_tokens_details?: {
            cached_tokens?: number | undefined;
        } | undefined;
        completion_tokens_details?: {
            reasoning_tokens?: number | undefined;
        } | undefined;
    }, {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
        prompt_tokens_details?: {
            cached_tokens?: number | undefined;
        } | undefined;
        completion_tokens_details?: {
            reasoning_tokens?: number | undefined;
        } | undefined;
    }>>;
    system_fingerprint: z.ZodOptional<z.ZodString>;
    service_tier: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    object: "chat.completion";
    model: string;
    id: string;
    created: number;
    choices: {
        message: {
            role: "assistant";
            content: string | null;
            tool_calls?: {
                function: {
                    name: string;
                    arguments: string;
                };
                type: "function";
                id: string;
            }[] | undefined;
            function_call?: {
                name: string;
                arguments: string;
            } | undefined;
            refusal?: string | null | undefined;
        };
        index: number;
        finish_reason: "length" | "tool_calls" | "function_call" | "stop" | "content_filter" | null;
        logprobs?: {
            content: {
                top_logprobs: {
                    token: string;
                    logprob: number;
                    bytes: number[] | null;
                }[];
                token: string;
                logprob: number;
                bytes: number[] | null;
            }[] | null;
        } | null | undefined;
    }[];
    service_tier?: string | undefined;
    usage?: {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
        prompt_tokens_details?: {
            cached_tokens?: number | undefined;
        } | undefined;
        completion_tokens_details?: {
            reasoning_tokens?: number | undefined;
        } | undefined;
    } | undefined;
    system_fingerprint?: string | undefined;
}, {
    object: "chat.completion";
    model: string;
    id: string;
    created: number;
    choices: {
        message: {
            role: "assistant";
            content: string | null;
            tool_calls?: {
                function: {
                    name: string;
                    arguments: string;
                };
                type: "function";
                id: string;
            }[] | undefined;
            function_call?: {
                name: string;
                arguments: string;
            } | undefined;
            refusal?: string | null | undefined;
        };
        index: number;
        finish_reason: "length" | "tool_calls" | "function_call" | "stop" | "content_filter" | null;
        logprobs?: {
            content: {
                top_logprobs: {
                    token: string;
                    logprob: number;
                    bytes: number[] | null;
                }[];
                token: string;
                logprob: number;
                bytes: number[] | null;
            }[] | null;
        } | null | undefined;
    }[];
    service_tier?: string | undefined;
    usage?: {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
        prompt_tokens_details?: {
            cached_tokens?: number | undefined;
        } | undefined;
        completion_tokens_details?: {
            reasoning_tokens?: number | undefined;
        } | undefined;
    } | undefined;
    system_fingerprint?: string | undefined;
}>;
type ChatCompletionResponse = z.infer<typeof ChatCompletionResponseSchema>;
declare const ChatCompletionChunkSchema: z.ZodObject<{
    id: z.ZodString;
    object: z.ZodLiteral<"chat.completion.chunk">;
    created: z.ZodNumber;
    model: z.ZodString;
    system_fingerprint: z.ZodOptional<z.ZodString>;
    choices: z.ZodArray<z.ZodObject<{
        index: z.ZodNumber;
        delta: z.ZodObject<{
            role: z.ZodOptional<z.ZodString>;
            content: z.ZodOptional<z.ZodString>;
            tool_calls: z.ZodOptional<z.ZodArray<z.ZodObject<{
                index: z.ZodNumber;
                id: z.ZodOptional<z.ZodString>;
                type: z.ZodOptional<z.ZodLiteral<"function">>;
                function: z.ZodOptional<z.ZodObject<{
                    name: z.ZodOptional<z.ZodString>;
                    arguments: z.ZodOptional<z.ZodString>;
                }, "strip", z.ZodTypeAny, {
                    name?: string | undefined;
                    arguments?: string | undefined;
                }, {
                    name?: string | undefined;
                    arguments?: string | undefined;
                }>>;
            }, "strip", z.ZodTypeAny, {
                index: number;
                function?: {
                    name?: string | undefined;
                    arguments?: string | undefined;
                } | undefined;
                type?: "function" | undefined;
                id?: string | undefined;
            }, {
                index: number;
                function?: {
                    name?: string | undefined;
                    arguments?: string | undefined;
                } | undefined;
                type?: "function" | undefined;
                id?: string | undefined;
            }>, "many">>;
            refusal: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        }, "strip", z.ZodTypeAny, {
            role?: string | undefined;
            content?: string | undefined;
            tool_calls?: {
                index: number;
                function?: {
                    name?: string | undefined;
                    arguments?: string | undefined;
                } | undefined;
                type?: "function" | undefined;
                id?: string | undefined;
            }[] | undefined;
            refusal?: string | null | undefined;
        }, {
            role?: string | undefined;
            content?: string | undefined;
            tool_calls?: {
                index: number;
                function?: {
                    name?: string | undefined;
                    arguments?: string | undefined;
                } | undefined;
                type?: "function" | undefined;
                id?: string | undefined;
            }[] | undefined;
            refusal?: string | null | undefined;
        }>;
        finish_reason: z.ZodNullable<z.ZodEnum<["stop", "length", "tool_calls", "content_filter", "function_call"]>>;
        logprobs: z.ZodOptional<z.ZodNullable<z.ZodObject<{
            content: z.ZodNullable<z.ZodArray<z.ZodObject<{
                token: z.ZodString;
                logprob: z.ZodNumber;
                bytes: z.ZodNullable<z.ZodArray<z.ZodNumber, "many">>;
                top_logprobs: z.ZodArray<z.ZodObject<{
                    token: z.ZodString;
                    logprob: z.ZodNumber;
                    bytes: z.ZodNullable<z.ZodArray<z.ZodNumber, "many">>;
                }, "strip", z.ZodTypeAny, {
                    token: string;
                    logprob: number;
                    bytes: number[] | null;
                }, {
                    token: string;
                    logprob: number;
                    bytes: number[] | null;
                }>, "many">;
            }, "strip", z.ZodTypeAny, {
                top_logprobs: {
                    token: string;
                    logprob: number;
                    bytes: number[] | null;
                }[];
                token: string;
                logprob: number;
                bytes: number[] | null;
            }, {
                top_logprobs: {
                    token: string;
                    logprob: number;
                    bytes: number[] | null;
                }[];
                token: string;
                logprob: number;
                bytes: number[] | null;
            }>, "many">>;
        }, "strip", z.ZodTypeAny, {
            content: {
                top_logprobs: {
                    token: string;
                    logprob: number;
                    bytes: number[] | null;
                }[];
                token: string;
                logprob: number;
                bytes: number[] | null;
            }[] | null;
        }, {
            content: {
                top_logprobs: {
                    token: string;
                    logprob: number;
                    bytes: number[] | null;
                }[];
                token: string;
                logprob: number;
                bytes: number[] | null;
            }[] | null;
        }>>>;
    }, "strip", z.ZodTypeAny, {
        index: number;
        finish_reason: "length" | "tool_calls" | "function_call" | "stop" | "content_filter" | null;
        delta: {
            role?: string | undefined;
            content?: string | undefined;
            tool_calls?: {
                index: number;
                function?: {
                    name?: string | undefined;
                    arguments?: string | undefined;
                } | undefined;
                type?: "function" | undefined;
                id?: string | undefined;
            }[] | undefined;
            refusal?: string | null | undefined;
        };
        logprobs?: {
            content: {
                top_logprobs: {
                    token: string;
                    logprob: number;
                    bytes: number[] | null;
                }[];
                token: string;
                logprob: number;
                bytes: number[] | null;
            }[] | null;
        } | null | undefined;
    }, {
        index: number;
        finish_reason: "length" | "tool_calls" | "function_call" | "stop" | "content_filter" | null;
        delta: {
            role?: string | undefined;
            content?: string | undefined;
            tool_calls?: {
                index: number;
                function?: {
                    name?: string | undefined;
                    arguments?: string | undefined;
                } | undefined;
                type?: "function" | undefined;
                id?: string | undefined;
            }[] | undefined;
            refusal?: string | null | undefined;
        };
        logprobs?: {
            content: {
                top_logprobs: {
                    token: string;
                    logprob: number;
                    bytes: number[] | null;
                }[];
                token: string;
                logprob: number;
                bytes: number[] | null;
            }[] | null;
        } | null | undefined;
    }>, "many">;
    usage: z.ZodOptional<z.ZodObject<{
        prompt_tokens: z.ZodNumber;
        completion_tokens: z.ZodNumber;
        total_tokens: z.ZodNumber;
        prompt_tokens_details: z.ZodOptional<z.ZodObject<{
            cached_tokens: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            cached_tokens?: number | undefined;
        }, {
            cached_tokens?: number | undefined;
        }>>;
        completion_tokens_details: z.ZodOptional<z.ZodObject<{
            reasoning_tokens: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            reasoning_tokens?: number | undefined;
        }, {
            reasoning_tokens?: number | undefined;
        }>>;
    }, "strip", z.ZodTypeAny, {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
        prompt_tokens_details?: {
            cached_tokens?: number | undefined;
        } | undefined;
        completion_tokens_details?: {
            reasoning_tokens?: number | undefined;
        } | undefined;
    }, {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
        prompt_tokens_details?: {
            cached_tokens?: number | undefined;
        } | undefined;
        completion_tokens_details?: {
            reasoning_tokens?: number | undefined;
        } | undefined;
    }>>;
    service_tier: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    object: "chat.completion.chunk";
    model: string;
    id: string;
    created: number;
    choices: {
        index: number;
        finish_reason: "length" | "tool_calls" | "function_call" | "stop" | "content_filter" | null;
        delta: {
            role?: string | undefined;
            content?: string | undefined;
            tool_calls?: {
                index: number;
                function?: {
                    name?: string | undefined;
                    arguments?: string | undefined;
                } | undefined;
                type?: "function" | undefined;
                id?: string | undefined;
            }[] | undefined;
            refusal?: string | null | undefined;
        };
        logprobs?: {
            content: {
                top_logprobs: {
                    token: string;
                    logprob: number;
                    bytes: number[] | null;
                }[];
                token: string;
                logprob: number;
                bytes: number[] | null;
            }[] | null;
        } | null | undefined;
    }[];
    service_tier?: string | undefined;
    usage?: {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
        prompt_tokens_details?: {
            cached_tokens?: number | undefined;
        } | undefined;
        completion_tokens_details?: {
            reasoning_tokens?: number | undefined;
        } | undefined;
    } | undefined;
    system_fingerprint?: string | undefined;
}, {
    object: "chat.completion.chunk";
    model: string;
    id: string;
    created: number;
    choices: {
        index: number;
        finish_reason: "length" | "tool_calls" | "function_call" | "stop" | "content_filter" | null;
        delta: {
            role?: string | undefined;
            content?: string | undefined;
            tool_calls?: {
                index: number;
                function?: {
                    name?: string | undefined;
                    arguments?: string | undefined;
                } | undefined;
                type?: "function" | undefined;
                id?: string | undefined;
            }[] | undefined;
            refusal?: string | null | undefined;
        };
        logprobs?: {
            content: {
                top_logprobs: {
                    token: string;
                    logprob: number;
                    bytes: number[] | null;
                }[];
                token: string;
                logprob: number;
                bytes: number[] | null;
            }[] | null;
        } | null | undefined;
    }[];
    service_tier?: string | undefined;
    usage?: {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
        prompt_tokens_details?: {
            cached_tokens?: number | undefined;
        } | undefined;
        completion_tokens_details?: {
            reasoning_tokens?: number | undefined;
        } | undefined;
    } | undefined;
    system_fingerprint?: string | undefined;
}>;
type ChatCompletionChunk = z.infer<typeof ChatCompletionChunkSchema>;
declare const PLUGIN_ID: "llm:openai";
declare const RESOURCE_TYPE: "llm";
declare const PROVIDER: "openai";
declare const VERSION = "1.0.0";
/** Default allowed models */
declare const DEFAULT_OPENAI_MODELS: readonly ["gpt-4o", "gpt-4o-2024-11-20", "gpt-4o-2024-08-06", "gpt-4o-2024-05-13", "gpt-4o-mini", "gpt-4o-mini-2024-07-18", "gpt-4-turbo", "gpt-4-turbo-2024-04-09", "gpt-4-turbo-preview", "gpt-4-0125-preview", "gpt-4-1106-preview", "gpt-4", "gpt-4-0613", "gpt-3.5-turbo", "gpt-3.5-turbo-0125", "gpt-3.5-turbo-1106", "o1", "o1-2024-12-17", "o1-preview", "o1-preview-2024-09-12", "o1-mini", "o1-mini-2024-09-12"];
/** Supported actions */
declare const ACTIONS: readonly ["chat.completions"];
type OpenAIAction = (typeof ACTIONS)[number];
/** Enforcement knobs */
declare const ENFORCEMENT_SUPPORT: readonly ["model", "max_tokens", "streaming"];
/** Default API URL */
declare const DEFAULT_API_URL = "https://api.openai.com/v1";

export { ACTIONS, type ChatCompletionChoice, ChatCompletionChoiceSchema, type ChatCompletionChunk, ChatCompletionChunkSchema, type ChatCompletionRequest, ChatCompletionRequestSchema, type ChatCompletionResponse, ChatCompletionResponseSchema, type ChatMessage, ChatMessageSchema, DEFAULT_API_URL, DEFAULT_OPENAI_MODELS, ENFORCEMENT_SUPPORT, type OpenAIAction, PLUGIN_ID, PROVIDER, RESOURCE_TYPE, type Tool, ToolSchema, type Usage, UsageSchema, VERSION };
