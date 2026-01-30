// ============================================
// OPENAI LLM INTEGRATION
// Typed client wrapper for OpenAI via @glueco/plugin-llm-openai
// ============================================
//
// This module demonstrates the canonical way to use the OpenAI plugin
// with the gateway SDK. Import this in your components to get type-safe
// access to the OpenAI API through the Personal Resource Gateway.
//
// Example:
//   const transport = await gateway.getTransport();
//   const openai = createOpenAIClient(transport);
//   const response = await openai.chatCompletions({ model: "gpt-4o", messages: [...] });
// ============================================

import { openai, type OpenAIClient } from "@glueco/plugin-llm-openai/client";
import type { GatewayTransport } from "@glueco/sdk";

// Re-export types for consumers
export type {
  ChatCompletionRequest,
  ChatCompletionResponse,
  ChatMessage,
  OpenAIClient,
} from "@glueco/plugin-llm-openai/client";

// Re-export constants
export {
  PLUGIN_ID,
  DEFAULT_OPENAI_MODELS,
} from "@glueco/plugin-llm-openai/contracts";

/**
 * Create a typed OpenAI client from a gateway transport.
 *
 * @param transport - Gateway transport from GatewayClient.getTransport()
 * @returns Typed OpenAI client with chatCompletions method
 */
export function createOpenAIClient(transport: GatewayTransport): OpenAIClient {
  return openai(transport);
}

export default createOpenAIClient;
