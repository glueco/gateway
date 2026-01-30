// ============================================
// RESEND EMAIL INTEGRATION
// Typed client wrapper for Resend via @glueco/plugin-mail-resend
// ============================================
//
// This module demonstrates the canonical way to use the Resend plugin
// with the gateway SDK. Import this in your components to get type-safe
// access to the Resend API through the Personal Resource Gateway.
//
// Example:
//   const transport = await gateway.getTransport();
//   const resend = createResendClient(transport);
//   const response = await resend.emails.send({ from: "...", to: "...", subject: "...", text: "..." });
// ============================================

import { resend, type ResendClient } from "@glueco/plugin-mail-resend/client";
import type { GatewayTransport } from "@glueco/sdk";

// Re-export types for consumers
export type {
  SendEmailRequest,
  SendEmailResponse,
  ResendClient,
} from "@glueco/plugin-mail-resend/client";

// Re-export constants
export { PLUGIN_ID } from "@glueco/plugin-mail-resend/contracts";

/**
 * Create a typed Resend client from a gateway transport.
 *
 * @param transport - Gateway transport from GatewayClient.getTransport()
 * @returns Typed Resend client with emails.send method
 */
export function createResendClient(transport: GatewayTransport): ResendClient {
  return resend(transport);
}

export default createResendClient;
