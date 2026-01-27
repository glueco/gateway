// ============================================
// RESEND PLUGIN - MAIN ENTRYPOINT
// ============================================
//
// This file provides backward compatibility for existing imports.
// For new code, prefer using the specific entrypoints:
//
// Proxy (server-side):
//   import resendPlugin from "@glueco/plugin-mail-resend/proxy"
//
// Client (target apps):
//   import { resend } from "@glueco/plugin-mail-resend/client"
//
// ============================================

// Re-export proxy plugin as default for backward compatibility
export { default } from "./proxy";
export { resendPlugin } from "./proxy";

// Re-export contracts
export * from "./contracts";
