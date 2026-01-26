// ============================================
// TEMPLATE PLUGIN - MAIN ENTRYPOINT
// ============================================
//
// This file provides backward compatibility for existing imports.
// For new code, prefer using the specific entrypoints:
//
// Proxy (server-side):
//   import templatePlugin from "@glueco/plugin-template/proxy"
//
// Client (target apps):
//   import { template } from "@glueco/plugin-template/client"
//
// ============================================

// Re-export proxy plugin as default for backward compatibility
export { default } from "./proxy";
export { templatePlugin } from "./proxy";

// Re-export contracts
export * from "./contracts";
