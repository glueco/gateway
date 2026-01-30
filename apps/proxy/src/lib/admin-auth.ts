/**
 * Shared Admin Authentication
 * Centralized admin authentication helper used across admin API routes.
 * Supports cookie-based session auth with fallback to bearer token.
 */

import { NextRequest } from "next/server";
import { validateAdminSession } from "./auth-cookie";

/**
 * Check if the request has valid admin authentication.
 * Uses cookie-based session auth with fallback to bearer token for API clients.
 *
 * @param request - The incoming Next.js request
 * @returns true if authenticated, false otherwise
 */
export async function checkAdminAuth(request: NextRequest): Promise<boolean> {
  // First, check cookie-based session
  const sessionValid = await validateAdminSession();
  if (sessionValid) {
    return true;
  }

  // Fallback to bearer token for API clients
  const adminSecret = process.env.ADMIN_SECRET;

  if (!adminSecret) {
    // If no admin secret configured, allow in development only
    return process.env.NODE_ENV === "development";
  }

  const authHeader = request.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return false;
  }

  const token = authHeader.slice(7);
  return token === adminSecret;
}
