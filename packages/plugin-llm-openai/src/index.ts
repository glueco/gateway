// ============================================
// OPENAI PLUGIN - MAIN ENTRYPOINT
// Re-exports for backward compatibility
// ============================================

// Re-export proxy plugin as default for backward compatibility
export { default } from "./proxy";
export { openaiPlugin } from "./proxy";

// Re-export contracts
export * from "./contracts";
