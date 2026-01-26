// ============================================
// GROQ PLUGIN - MAIN ENTRYPOINT
// ============================================
//
// This file provides backward compatibility for existing imports.
// For new code, prefer using the specific entrypoints:
//
// Proxy (server-side):
//   import groqPlugin from "@glueco/plugin-llm-groq/proxy"
//
// Client (target apps):
//   import { groq } from "@glueco/plugin-llm-groq/client"
//
// ============================================

// Re-export proxy plugin as default for backward compatibility
export { default } from "./proxy";
export { groqPlugin } from "./proxy";

// Re-export contracts
export * from "./contracts";
