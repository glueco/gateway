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
