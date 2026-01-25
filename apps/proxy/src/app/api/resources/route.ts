import { NextRequest, NextResponse } from "next/server";
import {
  getDiscoveryEntries,
  getPluginCount,
  isInitialized,
} from "@/server/plugins";
import type { ResourcesDiscoveryResponse } from "@glueco/shared";

// ============================================
// GET /api/resources
// Public discovery endpoint for available resources
// Returns list of installed plugins and their capabilities
// ============================================

const GATEWAY_VERSION = "1.0.0";
const GATEWAY_NAME = "Personal Resource Gateway";

// CORS headers
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function GET(request: NextRequest) {
  // Ensure plugins are initialized
  if (!isInitialized()) {
    return NextResponse.json(
      {
        error: {
          code: "NOT_READY",
          message: "Plugin registry not initialized",
        },
      },
      { status: 503, headers: CORS_HEADERS },
    );
  }

  // Build discovery response from plugin registry
  const resources = getDiscoveryEntries();

  const response: ResourcesDiscoveryResponse = {
    gateway: {
      version: GATEWAY_VERSION,
      name: GATEWAY_NAME,
    },
    resources,
  };

  return NextResponse.json(response, {
    headers: {
      ...CORS_HEADERS,
      "Cache-Control": "public, max-age=60", // Cache for 1 minute
    },
  });
}

// Handle OPTIONS for CORS preflight
export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      ...CORS_HEADERS,
      "Access-Control-Max-Age": "86400",
    },
  });
}
