#!/usr/bin/env node
/**
 * Generate Enabled Plugins
 *
 * This script reads the proxy.plugins.ts config file and generates
 * a static imports file for the proxy to consume.
 *
 * Usage: node scripts/generate-enabled-plugins.mjs
 * Run automatically via `npm run prebuild`
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { dirname, join, resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = resolve(__dirname, "..");

const CONFIG_FILE = join(ROOT_DIR, "proxy.plugins.ts");
const OUTPUT_DIR = join(ROOT_DIR, "apps/proxy/src/server/plugins");
const OUTPUT_FILE = join(OUTPUT_DIR, "enabled.generated.ts");

/**
 * Parse plugin names from proxy.plugins.ts
 */
function parsePluginConfig(content) {
  // Extract array content from the file
  // Match: const enabledPlugins = [ ... ] as const;
  const arrayMatch = content.match(
    /const\s+enabledPlugins\s*=\s*\[([\s\S]*?)\]\s*as\s*const/,
  );

  if (!arrayMatch) {
    console.error("Could not find enabledPlugins array in config file");
    return [];
  }

  const arrayContent = arrayMatch[1];
  const plugins = [];

  // Process line by line to properly handle comments
  const lines = arrayContent.split("\n");
  for (const line of lines) {
    // Skip lines that are entirely comments
    const trimmedLine = line.trim();
    if (trimmedLine.startsWith("//") || trimmedLine === "") {
      continue;
    }

    // Remove inline comments and extract string literals
    const withoutComments = trimmedLine.split("//")[0];
    const stringMatches = withoutComments.matchAll(/["'`]([^"'`]+)["'`]/g);

    for (const match of stringMatches) {
      const pluginName = match[1].trim();
      if (pluginName) {
        plugins.push(pluginName);
      }
    }
  }

  return plugins;
}

/**
 * Generate import name from package name
 * @glueco/plugin-llm-groq -> pluginLlmGroq
 */
function generateImportName(packageName) {
  // Remove scope if present
  const name = packageName.replace(/^@[^/]+\//, "");

  // Convert kebab-case to camelCase and prefix
  const camelCase = name
    .split("-")
    .map((part, i) =>
      i === 0 ? part : part.charAt(0).toUpperCase() + part.slice(1),
    )
    .join("");

  return camelCase;
}

/**
 * Generate the enabled.generated.ts file
 */
function generateEnabledFile(plugins) {
  const timestamp = new Date().toISOString();

  const imports = plugins
    .map((pkg) => {
      const importName = generateImportName(pkg);
      // Import from /proxy entrypoint for server-side only
      return `import ${importName} from "${pkg}/proxy";`;
    })
    .join("\n");

  const pluginArray = plugins.map((pkg) => generateImportName(pkg)).join(", ");

  const content = `// ============================================
// AUTO-GENERATED FILE - DO NOT EDIT MANUALLY
// Generated at: ${timestamp}
// Source: proxy.plugins.ts
// ============================================

import type { PluginContract } from "@glueco/shared";

// Import from /proxy entrypoint - server-side only
${imports}

/**
 * All enabled plugins imported from proxy.plugins.ts
 */
export const ENABLED_PLUGINS: PluginContract[] = [${pluginArray}];

/**
 * Get enabled plugin count
 */
export const ENABLED_PLUGINS_COUNT = ${plugins.length};

/**
 * Plugin package names (for reference)
 */
export const ENABLED_PLUGIN_PACKAGES = [
${plugins.map((p) => `  "${p}",`).join("\n")}
] as const;
`;

  return content;
}

/**
 * Main
 */
function main() {
  console.log("🔌 Generating enabled plugins file...\n");

  // Check if config file exists
  if (!existsSync(CONFIG_FILE)) {
    console.error(`❌ Config file not found: ${CONFIG_FILE}`);
    console.log("   Creating empty enabled.generated.ts...");

    // Ensure output directory exists
    mkdirSync(OUTPUT_DIR, { recursive: true });

    // Write empty file
    const emptyContent = `// AUTO-GENERATED - NO PLUGINS CONFIGURED
import type { PluginContract } from "@glueco/shared";
export const ENABLED_PLUGINS: PluginContract[] = [];
export const ENABLED_PLUGINS_COUNT = 0;
export const ENABLED_PLUGIN_PACKAGES = [] as const;
`;
    writeFileSync(OUTPUT_FILE, emptyContent, "utf-8");
    console.log(`   Created: ${OUTPUT_FILE}`);
    return;
  }

  // Read config file
  const configContent = readFileSync(CONFIG_FILE, "utf-8");
  const plugins = parsePluginConfig(configContent);

  console.log(`📦 Found ${plugins.length} enabled plugin(s):`);
  plugins.forEach((p) => console.log(`   - ${p}`));
  console.log();

  // Ensure output directory exists
  mkdirSync(OUTPUT_DIR, { recursive: true });

  // Generate and write file
  const generatedContent = generateEnabledFile(plugins);
  writeFileSync(OUTPUT_FILE, generatedContent, "utf-8");

  console.log(`✅ Generated: ${OUTPUT_FILE}`);
}

main();
