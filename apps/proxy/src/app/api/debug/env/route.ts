// ============================================
// TEMPORARY DEBUG ROUTE - REMOVE AFTER TESTING
// GET /api/debug/env
// Returns current environment configuration
// ============================================

import { NextResponse } from "next/server";

export const runtime = "nodejs";

// Mask sensitive parts of URLs for logging
function maskUrl(url: string | undefined): string {
  if (!url) return "NOT SET";
  try {
    const parsed = new URL(url);
    if (parsed.password) {
      parsed.password = "***";
    }
    return `${parsed.protocol}//${parsed.username ? parsed.username + "@" : ""}${parsed.host}${parsed.pathname}`;
  } catch {
    return url.slice(0, 30) + "...";
  }
}

export async function GET() {
  const branch = process.env.VERCEL_GIT_COMMIT_REF || "local";
  const isDemo = branch === "demo";

  const envInfo = {
    timestamp: new Date().toISOString(),
    branch,
    isDemo,
    database: {
      using: isDemo ? "DEMO_DATABASE_URL" : "DATABASE_URL",
      url: maskUrl(
        isDemo
          ? process.env.DEMO_DATABASE_URL || process.env.DATABASE_URL
          : process.env.DATABASE_URL
      ),
    },
    kv: {
      using: isDemo ? "DEMO_KV_REST_API_URL" : "KV_REST_API_URL",
      url: maskUrl(
        isDemo
          ? process.env.DEMO_KV_REST_API_URL || process.env.KV_REST_API_URL
          : process.env.KV_REST_API_URL
      ),
    },
    masterKey: {
      isSet: !!process.env.MASTER_KEY,
      preview: process.env.MASTER_KEY
        ? process.env.MASTER_KEY.slice(0, 15) + "..."
        : null,
    },
    gatewayUrl: process.env.GATEWAY_URL || "NOT SET",
    nodeEnv: process.env.NODE_ENV,
  };

  return NextResponse.json(envInfo, {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
