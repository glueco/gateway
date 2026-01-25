import { z } from 'zod';
import { PluginContract } from '@glueco/shared';

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
declare const groqPlugin: PluginContract;

export { type ChatCompletionRequest, groqPlugin as default, groqPlugin };
