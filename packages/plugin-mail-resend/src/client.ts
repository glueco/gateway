// ============================================
// RESEND PLUGIN CLIENT
// Typed client wrapper for target apps
// ============================================
//
// This module provides typed client wrappers for the Resend Email plugin.
// It depends only on the SDK transport interface and shared contracts.
//
// Usage:
// ```ts
// import { resend } from "@glueco/plugin-mail-resend/client";
// import { GatewayClient } from "@glueco/sdk";
//
// const client = new GatewayClient({ ... });
// const transport = await client.getTransport();
// const mailClient = resend(transport);
//
// const response = await mailClient.emails.send({
//   from: "hello@example.com",
//   to: "user@example.com",
//   subject: "Hello!",
//   text: "Hello from Resend!"
// });
// ```
// ============================================

import type {
  GatewayTransport,
  GatewayResponse,
  GatewayRequestOptions,
} from "@glueco/sdk";

import {
  type SendEmailRequest,
  type SendEmailResponse,
  PLUGIN_ID,
} from "./contracts";

// Re-export contracts for consumer convenience
export * from "./contracts";

// ============================================
// CLIENT TYPES
// ============================================

/**
 * Options for email requests.
 */
export interface EmailRequestOptions extends Omit<
  GatewayRequestOptions,
  "stream" | "method"
> {
  /**
   * Override for custom behavior (advanced usage).
   */
  raw?: boolean;
}

/**
 * Resend emails namespace interface.
 */
export interface ResendEmailsClient {
  /**
   * Send a transactional email.
   *
   * @param request - Email request payload
   * @param options - Optional request options
   * @returns Send email response with email ID
   *
   * @example
   * ```ts
   * const response = await mailClient.emails.send({
   *   from: "notifications@myapp.com",
   *   to: "user@example.com",
   *   subject: "Welcome!",
   *   html: "<h1>Welcome to our app!</h1>"
   * });
   *
   * console.log(`Email sent with ID: ${response.data.id}`);
   * ```
   */
  send(
    request: SendEmailRequest,
    options?: EmailRequestOptions,
  ): Promise<GatewayResponse<SendEmailResponse>>;
}

/**
 * Resend client interface.
 * Provides typed methods for all supported actions.
 */
export interface ResendClient {
  /**
   * Email operations.
   */
  emails: ResendEmailsClient;

  /**
   * Get the underlying transport for advanced usage.
   * Useful when you need direct access to the gateway.
   */
  readonly transport: GatewayTransport;
}

// ============================================
// CLIENT FACTORY
// ============================================

/**
 * Create a typed Resend client.
 *
 * @param transport - Gateway transport from SDK
 * @returns Typed Resend client
 *
 * @example
 * ```ts
 * import { resend } from "@glueco/plugin-mail-resend/client";
 * import { GatewayClient } from "@glueco/sdk";
 *
 * // Setup
 * const gatewayClient = new GatewayClient({
 *   keyStorage: new FileKeyStorage('./.gateway/keys.json'),
 *   configStorage: new FileConfigStorage('./.gateway/config.json'),
 * });
 *
 * // Get transport and create typed client
 * const transport = await gatewayClient.getTransport();
 * const mailClient = resend(transport);
 *
 * // Send email with full type safety
 * const response = await mailClient.emails.send({
 *   from: "hello@example.com",
 *   to: ["user1@example.com", "user2@example.com"],
 *   subject: "Important Update",
 *   html: "<p>This is an important update.</p>",
 *   text: "This is an important update.",
 *   tags: [{ name: "category", value: "updates" }]
 * });
 *
 * console.log(`Email sent! ID: ${response.data.id}`);
 * ```
 */
export function resend(transport: GatewayTransport): ResendClient {
  return {
    transport,

    emails: {
      async send(
        request: SendEmailRequest,
        options?: EmailRequestOptions,
      ): Promise<GatewayResponse<SendEmailResponse>> {
        return transport.request<SendEmailResponse, SendEmailRequest>(
          PLUGIN_ID,
          "emails.send",
          request,
          options,
        );
      },
    },
  };
}

// Default export for convenient importing
export default resend;
