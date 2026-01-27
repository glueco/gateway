import { z } from 'zod';

/**
 * Email tag for tracking/categorization
 */
declare const EmailTagSchema: z.ZodObject<{
    name: z.ZodString;
    value: z.ZodString;
}, "strip", z.ZodTypeAny, {
    value: string;
    name: string;
}, {
    value: string;
    name: string;
}>;
type EmailTag = z.infer<typeof EmailTagSchema>;
/**
 * Attachment schema (base64 encoded content)
 */
declare const AttachmentSchema: z.ZodObject<{
    filename: z.ZodString;
    content: z.ZodString;
    contentType: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    filename: string;
    content: string;
    contentType?: string | undefined;
}, {
    filename: string;
    content: string;
    contentType?: string | undefined;
}>;
type Attachment = z.infer<typeof AttachmentSchema>;
/**
 * Send Email Request schema
 * Matches Resend API: https://resend.com/docs/api-reference/emails/send-email
 */
declare const SendEmailRequestSchema: z.ZodEffects<z.ZodObject<{
    from: z.ZodString;
    to: z.ZodUnion<[z.ZodString, z.ZodArray<z.ZodString, "many">]>;
    subject: z.ZodString;
    text: z.ZodOptional<z.ZodString>;
    html: z.ZodOptional<z.ZodString>;
    cc: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodArray<z.ZodString, "many">]>>;
    bcc: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodArray<z.ZodString, "many">]>>;
    reply_to: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodArray<z.ZodString, "many">]>>;
    headers: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
    tags: z.ZodOptional<z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        value: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        value: string;
        name: string;
    }, {
        value: string;
        name: string;
    }>, "many">>;
    scheduled_at: z.ZodOptional<z.ZodString>;
    attachments: z.ZodOptional<z.ZodArray<z.ZodObject<{
        filename: z.ZodString;
        content: z.ZodString;
        contentType: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        filename: string;
        content: string;
        contentType?: string | undefined;
    }, {
        filename: string;
        content: string;
        contentType?: string | undefined;
    }>, "many">>;
}, "strip", z.ZodTypeAny, {
    from: string;
    to: string | string[];
    subject: string;
    text?: string | undefined;
    html?: string | undefined;
    cc?: string | string[] | undefined;
    bcc?: string | string[] | undefined;
    reply_to?: string | string[] | undefined;
    headers?: Record<string, string> | undefined;
    tags?: {
        value: string;
        name: string;
    }[] | undefined;
    scheduled_at?: string | undefined;
    attachments?: {
        filename: string;
        content: string;
        contentType?: string | undefined;
    }[] | undefined;
}, {
    from: string;
    to: string | string[];
    subject: string;
    text?: string | undefined;
    html?: string | undefined;
    cc?: string | string[] | undefined;
    bcc?: string | string[] | undefined;
    reply_to?: string | string[] | undefined;
    headers?: Record<string, string> | undefined;
    tags?: {
        value: string;
        name: string;
    }[] | undefined;
    scheduled_at?: string | undefined;
    attachments?: {
        filename: string;
        content: string;
        contentType?: string | undefined;
    }[] | undefined;
}>, {
    from: string;
    to: string | string[];
    subject: string;
    text?: string | undefined;
    html?: string | undefined;
    cc?: string | string[] | undefined;
    bcc?: string | string[] | undefined;
    reply_to?: string | string[] | undefined;
    headers?: Record<string, string> | undefined;
    tags?: {
        value: string;
        name: string;
    }[] | undefined;
    scheduled_at?: string | undefined;
    attachments?: {
        filename: string;
        content: string;
        contentType?: string | undefined;
    }[] | undefined;
}, {
    from: string;
    to: string | string[];
    subject: string;
    text?: string | undefined;
    html?: string | undefined;
    cc?: string | string[] | undefined;
    bcc?: string | string[] | undefined;
    reply_to?: string | string[] | undefined;
    headers?: Record<string, string> | undefined;
    tags?: {
        value: string;
        name: string;
    }[] | undefined;
    scheduled_at?: string | undefined;
    attachments?: {
        filename: string;
        content: string;
        contentType?: string | undefined;
    }[] | undefined;
}>;
type SendEmailRequest = z.infer<typeof SendEmailRequestSchema>;
/**
 * Successful send response from Resend
 */
declare const SendEmailResponseSchema: z.ZodObject<{
    id: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
}, {
    id: string;
}>;
type SendEmailResponse = z.infer<typeof SendEmailResponseSchema>;
/**
 * Error response from Resend
 */
declare const ResendErrorResponseSchema: z.ZodObject<{
    statusCode: z.ZodOptional<z.ZodNumber>;
    message: z.ZodString;
    name: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    message: string;
    name?: string | undefined;
    statusCode?: number | undefined;
}, {
    message: string;
    name?: string | undefined;
    statusCode?: number | undefined;
}>;
type ResendErrorResponse = z.infer<typeof ResendErrorResponseSchema>;
interface ShapedSendEmailRequest {
    from: string;
    to: string[];
    subject: string;
    text?: string;
    html?: string;
    cc?: string[];
    bcc?: string[];
    reply_to?: string[];
    headers?: Record<string, string>;
    tags?: EmailTag[];
    scheduled_at?: string;
    attachments?: Attachment[];
}
/**
 * Enforcement fields for email validation.
 * These are extracted during validateAndShape for policy enforcement.
 */
interface ResendEnforcementFields {
    /** Domain of the 'from' address */
    fromDomain: string;
    /** Unique domains across all recipients */
    toDomains: string[];
    /** Total count of all recipients (to + cc + bcc) */
    recipientCount: number;
    /** Whether HTML content is present */
    hasHtml: boolean;
    /** Whether attachments are present */
    hasAttachments: boolean;
}
declare const PLUGIN_ID: "mail:resend";
declare const RESOURCE_TYPE: "mail";
declare const PROVIDER: "resend";
declare const VERSION = "0.1.0";
declare const PLUGIN_NAME = "Resend Email";
/** Supported actions */
declare const ACTIONS: readonly ["emails.send"];
type ResendAction = (typeof ACTIONS)[number];
/** Enforcement knobs this plugin supports */
declare const ENFORCEMENT_SUPPORT: readonly ["fromDomain", "toDomains", "recipientCount", "hasHtml"];
/**
 * Extract domain from email address
 */
declare function extractDomain(email: string): string;
/**
 * Normalize email field to array
 */
declare function normalizeToArray(value: string | string[] | undefined): string[];
/**
 * Extract unique domains from email list
 */
declare function extractUniqueDomains(emails: string[]): string[];

export { ACTIONS, type Attachment, AttachmentSchema, ENFORCEMENT_SUPPORT, type EmailTag, EmailTagSchema, PLUGIN_ID, PLUGIN_NAME, PROVIDER, RESOURCE_TYPE, type ResendAction, type ResendEnforcementFields, type ResendErrorResponse, ResendErrorResponseSchema, type SendEmailRequest, SendEmailRequestSchema, type SendEmailResponse, SendEmailResponseSchema, type ShapedSendEmailRequest, VERSION, extractDomain, extractUniqueDomains, normalizeToArray };
