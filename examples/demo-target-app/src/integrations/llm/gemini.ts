// ============================================
// GEMINI LLM INTEGRATION
// Typed client wrapper for Gemini via @glueco/plugin-llm-gemini
// ============================================
//
// This module demonstrates the canonical way to use the Gemini plugin
// with the gateway SDK. Import this in your components to get type-safe
// access to the Gemini API through the Personal Resource Gateway.
//
// Example:
//   const transport = await gateway.getTransport();
//   const gemini = createGeminiClient(transport);
//   const response = await gemini.chatCompletions({ model: "gemini-1.5-flash", messages: [...] });
// ============================================

import { gemini, type GeminiClient } from "@glueco/plugin-llm-gemini/client";
import type { GatewayTransport } from "@glueco/sdk";

// Re-export types for consumers
export type {
  ChatCompletionRequest,
  ChatCompletionResponse,
  ChatMessage,
  GeminiClient,
} from "@glueco/plugin-llm-gemini/client";

// Re-export constants
export {
  PLUGIN_ID,
  DEFAULT_GEMINI_MODELS,
} from "@glueco/plugin-llm-gemini/contracts";

/**
 * Create a typed Gemini client from a gateway transport.
 *
 * @param transport - Gateway transport from GatewayClient.getTransport()
 * @returns Typed Gemini client with chatCompletions method
 */
export function createGeminiClient(transport: GatewayTransport): GeminiClient {
  return gemini(transport);
}

export default createGeminiClient;
