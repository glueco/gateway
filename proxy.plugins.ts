/**
 * Enabled Plugins Configuration
 *
 * Add plugin package names to this array to enable them in the proxy.
 *
 * How to enable a plugin:
 * 1. Install the plugin package: `npm install @glueco/plugin-llm-groq`
 * 2. Add the package name to the array below
 * 3. Run `npm run build` or redeploy
 *
 * The plugin will automatically appear in the /api/resources discovery endpoint.
 */
const enabledPlugins = [
  "@glueco/plugin-llm-groq",
  "@glueco/plugin-llm-gemini",
  // Add more plugins here:
  // "@glueco/plugin-mail-resend",
  // "@someone/plugin-storage-s3",
] as const;

export default enabledPlugins;
export type EnabledPlugin = (typeof enabledPlugins)[number];
