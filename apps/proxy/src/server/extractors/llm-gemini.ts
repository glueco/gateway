import { ExtractedRequest } from "@glueco/shared";
import { ExtractionContext, registerExtractor } from "./types";

// ============================================
// GEMINI EXTRACTOR
// Handles Google Gemini generateContent format
// ============================================

/**
 * Extract enforceable fields from Gemini generateContent request.
 *
 * Gemini native format differs from OpenAI:
 * - model is in the URL path, not the body
 * - generationConfig.maxOutputTokens for token limits
 * - tools array for function calling
 *
 * This extractor also handles OpenAI-format requests that get
 * translated by the proxy (for backward compatibility).
 */
function extractGeminiChat(ctx: ExtractionContext): ExtractedRequest {
  const body = ctx.body as Record<string, unknown> | null;
  const extracted: ExtractedRequest = {};

  // Try to extract model from URL path
  // Gemini URLs look like: /models/gemini-1.5-flash:generateContent
  const modelMatch = ctx.url.pathname.match(/\/models\/([^:\/]+)/);
  if (modelMatch) {
    extracted.model = modelMatch[1];
  }

  if (!body || typeof body !== "object") {
    return extracted;
  }

  // Check if this is OpenAI-format (has "model" and "messages")
  // The proxy may receive OpenAI-format requests and translate them
  if (typeof body.model === "string") {
    // OpenAI format - extract like OpenAI
    extracted.model = body.model.replace(/^models\//, "");

    const maxTokens = body.max_tokens ?? body.max_completion_tokens;
    if (typeof maxTokens === "number" && maxTokens > 0) {
      extracted.maxOutputTokens = maxTokens;
    }

    if (typeof body.stream === "boolean") {
      extracted.stream = body.stream;
    }

    if (Array.isArray(body.tools) && body.tools.length > 0) {
      extracted.usesTools = true;
    }

    return extracted;
  }

  // Native Gemini format
  const generationConfig = body.generationConfig as
    | Record<string, unknown>
    | undefined;
  if (generationConfig && typeof generationConfig === "object") {
    if (
      typeof generationConfig.maxOutputTokens === "number" &&
      generationConfig.maxOutputTokens > 0
    ) {
      extracted.maxOutputTokens = generationConfig.maxOutputTokens;
    }
  }

  // Check for tools in native Gemini format
  if (Array.isArray(body.tools) && body.tools.length > 0) {
    extracted.usesTools = true;
  }

  // Check URL for streaming (alt=sse or streamGenerateContent)
  if (
    ctx.url.searchParams.get("alt") === "sse" ||
    ctx.url.pathname.includes("streamGenerateContent")
  ) {
    extracted.stream = true;
  }

  return extracted;
}

// Register for Gemini
registerExtractor({
  resourceId: "llm:gemini",
  actions: ["chat.completions", "generateContent"],
  extract: extractGeminiChat,
});

export { extractGeminiChat };
