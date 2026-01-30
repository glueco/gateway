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
// GATEWAY_URL - Public URL of this gateway
// Used for generating callback URLs and connection flows
// ============================================
const rawGatewayUrl =
  (isDemo() ? process.env.DEMO_GATEWAY_URL : undefined) ??
  process.env.GATEWAY_URL;

// Validate and normalize GATEWAY_URL (remove trailing slash if present)
export const GATEWAY_URL = rawGatewayUrl?.replace(/\/$/, "");

if (rawGatewayUrl && rawGatewayUrl.endsWith("/")) {
  console.warn(
    `⚠️  GATEWAY_URL should not end with a trailing slash. ` +
    `Got "${rawGatewayUrl}", using "${GATEWAY_URL}" instead. ` +
    `Please fix your environment variable to avoid potential CORS issues.`
  );
}

// Override process.env for libraries that read directly
if (GATEWAY_URL) {
  process.env.GATEWAY_URL = GATEWAY_URL;
}
