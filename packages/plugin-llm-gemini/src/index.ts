// ============================================
// GEMINI PLUGIN - MAIN ENTRYPOINT
// ============================================
//
// This file provides backward compatibility for existing imports.
// For new code, prefer using the specific entrypoints:
//
// Proxy (server-side):
//   import geminiPlugin from "@glueco/plugin-llm-gemini/proxy"
//
// Client (target apps):
//   import { gemini } from "@glueco/plugin-llm-gemini/client"
//
// ============================================

// Re-export proxy plugin as default for backward compatibility
export { default } from "./proxy";
export { geminiPlugin } from "./proxy";

// Re-export contracts
export * from "./contracts";
