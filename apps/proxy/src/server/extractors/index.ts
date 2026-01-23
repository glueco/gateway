// ============================================
// EXTRACTORS MODULE
// Thin extraction layer for policy enforcement
// ============================================

// Core types and registry
export {
  type ExtractionContext,
  type ExtractorFn,
  type ExtractorEntry,
  registerExtractor,
  getExtractor,
  extractRequest,
} from "./types";

// Load extractors (side-effect: registers them)
import "./llm-openai";
import "./llm-gemini";

// Re-export types from shared
export type { ExtractedRequest } from "@glueco/shared";
