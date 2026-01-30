// ============================================
// ENVIRONMENT VARIABLE HELPER
// Handles demo branch environment switching
// ============================================

/**
 * Check if running on demo branch (Vercel sets VERCEL_GIT_COMMIT_REF automatically)
 */
function isDemo(): boolean {
  const branch = process.env.VERCEL_GIT_COMMIT_REF;
  return branch === "demo";
}

// Database URL - uses DEMO_ prefix on demo branch
export const DATABASE_URL =
  (isDemo() ? process.env.DEMO_DATABASE_URL : undefined) ??
  process.env.DATABASE_URL;

// Redis/KV URLs - uses DEMO_ prefix on demo branch
export const KV_REST_API_URL =
  (isDemo() ? process.env.DEMO_KV_REST_API_URL : undefined) ??
  process.env.KV_REST_API_URL;

export const KV_REST_API_TOKEN =
  (isDemo() ? process.env.DEMO_KV_REST_API_TOKEN : undefined) ??
  process.env.KV_REST_API_TOKEN;

// ============================================
// CRITICAL: Override process.env for libraries that read directly
// Prisma, Redis clients etc. read from process.env, not our exports
// ============================================
if (isDemo()) {
  console.log("[ENV] Demo branch detected - overriding process.env for Prisma/Redis");
  if (DATABASE_URL) {
    process.env.DATABASE_URL = DATABASE_URL;
  }
  if (KV_REST_API_URL) {
    process.env.KV_REST_API_URL = KV_REST_API_URL;
  }
  if (KV_REST_API_TOKEN) {
    process.env.KV_REST_API_TOKEN = KV_REST_API_TOKEN;
  }
}

// Validation
if (!DATABASE_URL) {
  throw new Error(
    "Missing DATABASE_URL (or DEMO_DATABASE_URL on demo branch)"
  );
}

if (!KV_REST_API_URL) {
  throw new Error(
    "Missing KV_REST_API_URL (or DEMO_KV_REST_API_URL on demo branch)"
  );
}

if (!KV_REST_API_TOKEN) {
  throw new Error(
    "Missing KV_REST_API_TOKEN (or DEMO_KV_REST_API_TOKEN on demo branch)"
  );
}

// ============================================
// STARTUP LOGGING
// Log which environment is being used
// ============================================

const demoMode = isDemo();
const branch = process.env.VERCEL_GIT_COMMIT_REF || "local";

// Mask sensitive parts of URLs for logging
function maskUrl(url: string): string {
  try {
    const parsed = new URL(url);
    // Mask password if present
    if (parsed.password) {
      parsed.password = "***";
    }
    // For connection strings, show host and database name
    return `${parsed.protocol}//${parsed.username ? parsed.username + "@" : ""}${parsed.host}${parsed.pathname}`;
  } catch {
    // If not a valid URL, just show first 30 chars
    return url.slice(0, 30) + "...";
  }
}

console.log("╔════════════════════════════════════════════════════════════╗");
console.log("║               GATEWAY PROXY ENVIRONMENT                    ║");
console.log("╠════════════════════════════════════════════════════════════╣");
console.log(`║ Branch:      ${branch.padEnd(46)}║`);
console.log(`║ Demo Mode:   ${(demoMode ? "YES" : "NO").padEnd(46)}║`);
console.log(`║ Database:    ${maskUrl(DATABASE_URL).slice(0, 46).padEnd(46)}║`);
console.log(`║ KV Store:    ${maskUrl(KV_REST_API_URL).slice(0, 46).padEnd(46)}║`);
console.log(`║ MASTER_KEY:  ${(process.env.MASTER_KEY ? "SET (" + process.env.MASTER_KEY.slice(0, 10) + "...)" : "NOT SET").padEnd(46)}║`);
console.log("╚════════════════════════════════════════════════════════════╝");
