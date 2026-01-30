// ============================================
// LLM INTEGRATIONS BARREL EXPORT
// ============================================

export {
  createGeminiClient,
  PLUGIN_ID as GEMINI_PLUGIN_ID,
  DEFAULT_GEMINI_MODELS,
} from "./gemini";
export type {
  ChatCompletionRequest as GeminiChatRequest,
  ChatCompletionResponse as GeminiChatResponse,
  GeminiClient,
} from "./gemini";

export {
  createGroqClient,
  PLUGIN_ID as GROQ_PLUGIN_ID,
  DEFAULT_GROQ_MODELS,
} from "./groq";
export type {
  ChatCompletionRequest as GroqChatRequest,
  ChatCompletionResponse as GroqChatResponse,
  GroqClient,
} from "./groq";

export {
  createOpenAIClient,
  PLUGIN_ID as OPENAI_PLUGIN_ID,
  DEFAULT_OPENAI_MODELS,
} from "./openai";
export type {
  ChatCompletionRequest as OpenAIChatRequest,
  ChatCompletionResponse as OpenAIChatResponse,
  OpenAIClient,
} from "./openai";
