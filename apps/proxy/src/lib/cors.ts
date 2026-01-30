/**
 * Shared CORS Headers
 * Centralized CORS configuration used across API routes.
 * Note: The main middleware.ts already handles CORS for all /api/* and /r/* routes,
 * but some routes may need these headers for explicit response construction.
 */

/**
 * Standard CORS headers for all API responses.
 * Used when constructing JSON responses that need CORS headers.
 */
export const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
} as const;

/**
 * Extended CORS headers for preflight responses.
 * Includes all allowed methods and headers for the gateway API.
 */
export const CORS_PREFLIGHT_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, x-app-id, x-ts, x-nonce, x-sig, x-gateway-resource, x-pop-v",
  "Access-Control-Max-Age": "86400",
} as const;

/**
 * Create a preflight OPTIONS response.
 * Use this for routes that need explicit OPTIONS handling.
 */
export function createPreflightResponse(): Response {
  return new Response(null, {
    status: 204,
    headers: CORS_PREFLIGHT_HEADERS,
  });
}
