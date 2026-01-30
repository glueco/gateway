// ============================================
// GROQ LLM INTEGRATION
// Typed client wrapper for Groq via @glueco/plugin-llm-groq
// ============================================
//
// This module demonstrates the canonical way to use the Groq plugin
// with the gateway SDK. Import this in your components to get type-safe
// access to the Groq API through the Personal Resource Gateway.
//
// Example:
//   const transport = await gateway.getTransport();
//   const groq = createGroqClient(transport);
//   const response = await groq.chatCompletions({ model: "llama-3.3-70b-versatile", messages: [...] });
// ============================================

import { groq, type GroqClient } from "@glueco/plugin-llm-groq/client";
import type { GatewayTransport } from "@glueco/sdk";

// Re-export types for consumers
export type {
  ChatCompletionRequest,
  ChatCompletionResponse,
  ChatMessage,
  GroqClient,
} from "@glueco/plugin-llm-groq/client";

// Re-export constants
export {
  PLUGIN_ID,
  DEFAULT_GROQ_MODELS,
} from "@glueco/plugin-llm-groq/contracts";

/**
 * Create a typed Groq client from a gateway transport.
 *
 * @param transport - Gateway transport from GatewayClient.getTransport()
 * @returns Typed Groq client with chatCompletions method
 */
export function createGroqClient(transport: GatewayTransport): GroqClient {
  return groq(transport);
}

export default createGroqClient;
