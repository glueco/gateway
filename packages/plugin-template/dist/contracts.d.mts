import { z } from 'zod';

/**
 * Example request schema for action.one
 * Replace with your actual request structure
 */
declare const ActionOneRequestSchema: z.ZodObject<{
    /** Example input field */
    input: z.ZodString;
    /** Optional configuration */
    config: z.ZodOptional<z.ZodObject<{
        option1: z.ZodOptional<z.ZodBoolean>;
        option2: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        option1?: boolean | undefined;
        option2?: number | undefined;
    }, {
        option1?: boolean | undefined;
        option2?: number | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    input: string;
    config?: {
        option1?: boolean | undefined;
        option2?: number | undefined;
    } | undefined;
}, {
    input: string;
    config?: {
        option1?: boolean | undefined;
        option2?: number | undefined;
    } | undefined;
}>;
type ActionOneRequest = z.infer<typeof ActionOneRequestSchema>;
/**
 * Example request schema for action.two
 */
declare const ActionTwoRequestSchema: z.ZodObject<{
    /** Data to process */
    data: z.ZodArray<z.ZodString, "many">;
    /** Processing options */
    options: z.ZodOptional<z.ZodObject<{
        limit: z.ZodOptional<z.ZodNumber>;
        format: z.ZodOptional<z.ZodEnum<["json", "text"]>>;
    }, "strip", z.ZodTypeAny, {
        limit?: number | undefined;
        format?: "json" | "text" | undefined;
    }, {
        limit?: number | undefined;
        format?: "json" | "text" | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    data: string[];
    options?: {
        limit?: number | undefined;
        format?: "json" | "text" | undefined;
    } | undefined;
}, {
    data: string[];
    options?: {
        limit?: number | undefined;
        format?: "json" | "text" | undefined;
    } | undefined;
}>;
type ActionTwoRequest = z.infer<typeof ActionTwoRequestSchema>;
/**
 * Example response schema for action.one
 */
declare const ActionOneResponseSchema: z.ZodObject<{
    /** Result of processing */
    result: z.ZodString;
    /** Metadata about the operation */
    metadata: z.ZodObject<{
        processingTime: z.ZodNumber;
        timestamp: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        processingTime: number;
        timestamp: number;
    }, {
        processingTime: number;
        timestamp: number;
    }>;
}, "strip", z.ZodTypeAny, {
    result: string;
    metadata: {
        processingTime: number;
        timestamp: number;
    };
}, {
    result: string;
    metadata: {
        processingTime: number;
        timestamp: number;
    };
}>;
type ActionOneResponse = z.infer<typeof ActionOneResponseSchema>;
/**
 * Example response schema for action.two
 */
declare const ActionTwoResponseSchema: z.ZodObject<{
    /** Processed items */
    items: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        value: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        value: string;
        id: string;
    }, {
        value: string;
        id: string;
    }>, "many">;
    /** Total count */
    total: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    items: {
        value: string;
        id: string;
    }[];
    total: number;
}, {
    items: {
        value: string;
        id: string;
    }[];
    total: number;
}>;
type ActionTwoResponse = z.infer<typeof ActionTwoResponseSchema>;
/**
 * Plugin identifier in format: <resourceType>:<provider>
 */
declare const PLUGIN_ID: "example:template";
/**
 * Resource type category
 */
declare const RESOURCE_TYPE: "example";
/**
 * Provider name
 */
declare const PROVIDER: "template";
/**
 * Plugin version (semver)
 * This is the contract version - target apps can use this
 * to verify compatibility with the proxy plugin version.
 *
 * TODO: Add version compatibility checking in future iteration
 */
declare const VERSION = "1.0.0";
/**
 * Human-readable display name
 */
declare const NAME = "Example Template Plugin";
/**
 * Supported actions
 */
declare const ACTIONS: readonly ["action.one", "action.two"];
type TemplateAction = (typeof ACTIONS)[number];
/**
 * Enforcement knobs this plugin supports
 */
declare const ENFORCEMENT_SUPPORT: readonly ["field1", "field2"];
/**
 * Default API base URL
 */
declare const DEFAULT_API_URL = "https://api.example.com/v1";

export { ACTIONS, type ActionOneRequest, ActionOneRequestSchema, type ActionOneResponse, ActionOneResponseSchema, type ActionTwoRequest, ActionTwoRequestSchema, type ActionTwoResponse, ActionTwoResponseSchema, DEFAULT_API_URL, ENFORCEMENT_SUPPORT, NAME, PLUGIN_ID, PROVIDER, RESOURCE_TYPE, type TemplateAction, VERSION };
