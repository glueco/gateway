// ============================================
// RESEND PLUGIN CONTRACTS
// Shared request/response schemas for proxy and client
// ============================================

import { z } from "zod";

// ============================================
// REQUEST SCHEMAS
// ============================================

/**
 * Email tag for tracking/categorization
 */
export const EmailTagSchema = z.object({
  name: z.string().min(1),
  value: z.string(),
});

export type EmailTag = z.infer<typeof EmailTagSchema>;

/**
 * Attachment schema (base64 encoded content)
 */
export const AttachmentSchema = z.object({
  filename: z.string().min(1),
  content: z.string(), // Base64 encoded
  contentType: z.string().optional(),
});

export type Attachment = z.infer<typeof AttachmentSchema>;

/**
 * Send Email Request schema
 * Matches Resend API: https://resend.com/docs/api-reference/emails/send-email
 */
export const SendEmailRequestSchema = z
  .object({
    // Required fields
    from: z.string().email("Invalid 'from' email address"),
    to: z.union([
      z.string().email("Invalid 'to' email address"),
      z.array(z.string().email("Invalid 'to' email address")).min(1),
    ]),
    subject: z.string().min(1, "Subject cannot be empty"),

    // Content - at least one required
    text: z.string().optional(),
    html: z.string().optional(),

    // Optional recipients
    cc: z
      .union([
        z.string().email("Invalid 'cc' email address"),
        z.array(z.string().email("Invalid 'cc' email address")),
      ])
      .optional(),
    bcc: z
      .union([
        z.string().email("Invalid 'bcc' email address"),
        z.array(z.string().email("Invalid 'bcc' email address")),
      ])
      .optional(),

    // Optional metadata
    reply_to: z
      .union([
        z.string().email("Invalid 'reply_to' email address"),
        z.array(z.string().email("Invalid 'reply_to' email address")),
      ])
      .optional(),
    headers: z.record(z.string()).optional(),
    tags: z.array(EmailTagSchema).optional(),

    // Optional scheduling (ISO 8601 datetime)
    scheduled_at: z.string().datetime().optional(),

    // Optional attachments
    attachments: z.array(AttachmentSchema).optional(),
  })
  .refine((data) => data.text || data.html, {
    message: "At least one of 'text' or 'html' must be provided",
    path: ["text"],
  });

export type SendEmailRequest = z.infer<typeof SendEmailRequestSchema>;

// ============================================
// RESPONSE SCHEMAS
// ============================================

/**
 * Successful send response from Resend
 */
export const SendEmailResponseSchema = z.object({
  id: z.string(),
});

export type SendEmailResponse = z.infer<typeof SendEmailResponseSchema>;

/**
 * Error response from Resend
 */
export const ResendErrorResponseSchema = z.object({
  statusCode: z.number().optional(),
  message: z.string(),
  name: z.string().optional(),
});

export type ResendErrorResponse = z.infer<typeof ResendErrorResponseSchema>;

// ============================================
// SHAPED REQUEST (Internal)
// Normalized for execution with arrays
// ============================================

export interface ShapedSendEmailRequest {
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

// ============================================
// ENFORCEMENT FIELDS
// ============================================

/**
 * Enforcement fields for email validation.
 * These are extracted during validateAndShape for policy enforcement.
 */
export interface ResendEnforcementFields {
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

// ============================================
// PLUGIN CONSTANTS
// ============================================

export const PLUGIN_ID = "mail:resend" as const;
export const RESOURCE_TYPE = "mail" as const;
export const PROVIDER = "resend" as const;
export const VERSION = "0.1.0";
export const PLUGIN_NAME = "Resend Email";

/** Supported actions */
export const ACTIONS = ["emails.send"] as const;
export type ResendAction = (typeof ACTIONS)[number];

/** Enforcement knobs this plugin supports */
export const ENFORCEMENT_SUPPORT = [
  "fromDomain",
  "toDomains",
  "recipientCount",
  "hasHtml",
] as const;

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Extract domain from email address
 */
export function extractDomain(email: string): string {
  const parts = email.split("@");
  return parts[parts.length - 1]?.toLowerCase() || "";
}

/**
 * Normalize email field to array
 */
export function normalizeToArray(
  value: string | string[] | undefined,
): string[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

/**
 * Extract unique domains from email list
 */
export function extractUniqueDomains(emails: string[]): string[] {
  const domains = new Set<string>();
  for (const email of emails) {
    domains.add(extractDomain(email));
  }
  return Array.from(domains).sort();
}
