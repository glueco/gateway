import { ExtractedRequest } from "@glueco/shared";

// ============================================
// REQUEST EXTRACTOR INTERFACE
// Thin extraction layer for policy enforcement
// ============================================

/**
 * Context provided to extractors.
 */
export interface ExtractionContext {
  method: string;
  url: URL;
  headers: Headers;
  body: unknown;
}

/**
 * Extractor function signature.
 * Extractors are pure, deterministic functions that:
 * - Accept provider-native request context
 * - Return normalized enforceable fields
 * - Fail gracefully (return {} if extraction fails)
 */
export type ExtractorFn = (ctx: ExtractionContext) => ExtractedRequest;

/**
 * Extractor registry entry.
 */
export interface ExtractorEntry {
  resourceId: string;
  actions: string[];
  extract: ExtractorFn;
}

// Registry of extractors
const extractors: ExtractorEntry[] = [];

/**
 * Register an extractor for a resource and actions.
 */
export function registerExtractor(entry: ExtractorEntry): void {
  extractors.push(entry);
}

/**
 * Get extractor for a resource and action.
 * Returns undefined if no extractor is registered.
 */
export function getExtractor(
  resourceId: string,
  action: string,
): ExtractorFn | undefined {
  const entry = extractors.find(
    (e) => e.resourceId === resourceId && e.actions.includes(action),
  );
  return entry?.extract;
}

/**
 * Extract enforceable fields from a request.
 * Returns empty object if no extractor exists or extraction fails.
 */
export function extractRequest(
  resourceId: string,
  action: string,
  ctx: ExtractionContext,
): ExtractedRequest {
  const extractor = getExtractor(resourceId, action);

  if (!extractor) {
    // No extractor registered - continue with empty extraction
    return {};
  }

  try {
    return extractor(ctx);
  } catch (error) {
    // Extraction failed - fail gracefully
    console.warn(
      `Extraction failed for ${resourceId}:${action}:`,
      error instanceof Error ? error.message : "unknown error",
    );
    return {};
  }
}

// Re-export for convenience
export type { ExtractedRequest };
