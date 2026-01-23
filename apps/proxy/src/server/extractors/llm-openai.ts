import { ExtractedRequest } from "@glueco/shared";
import { ExtractionContext, registerExtractor } from "./types";

// ============================================
// OPENAI-COMPATIBLE EXTRACTOR
// Covers: Groq, OpenAI, and other OpenAI-compatible providers
// ============================================

/**
 * Extract enforceable fields from OpenAI-compatible chat/completions request.
 *
 * This extractor handles:
 * - model: string
 * - max_tokens / max_completion_tokens: number
 * - stream: boolean
 * - tools: array (presence indicates tools usage)
 *
 * It does NOT:
 * - Validate the full request schema
 * - Transform or rebuild the request
 * - Import provider SDKs
 */
function extractOpenAIChat(ctx: ExtractionContext): ExtractedRequest {
  const body = ctx.body as Record<string, unknown> | null;

  if (!body || typeof body !== "object") {
    return {};
  }

  const extracted: ExtractedRequest = {};

  // Extract model
  if (typeof body.model === "string") {
    extracted.model = body.model;
  }

  // Extract max output tokens (OpenAI uses both max_tokens and max_completion_tokens)
  const maxTokens = body.max_tokens ?? body.max_completion_tokens;
  if (typeof maxTokens === "number" && maxTokens > 0) {
    extracted.maxOutputTokens = maxTokens;
  }

  // Extract stream flag
  if (typeof body.stream === "boolean") {
    extracted.stream = body.stream;
  }

  // Extract tools usage (presence of non-empty tools array)
  if (Array.isArray(body.tools) && body.tools.length > 0) {
    extracted.usesTools = true;
  } else if (body.tool_choice !== undefined && body.tool_choice !== "none") {
    // Even without tools array, tool_choice might indicate intent
    extracted.usesTools = true;
  }

  return extracted;
}

// Register for all OpenAI-compatible providers
const OPENAI_COMPATIBLE_RESOURCES = ["llm:groq", "llm:openai", "llm:together"];

for (const resourceId of OPENAI_COMPATIBLE_RESOURCES) {
  registerExtractor({
    resourceId,
    actions: ["chat.completions"],
    extract: extractOpenAIChat,
  });
}

export { extractOpenAIChat };
