import { NextRequest, NextResponse } from "next/server";
import {
  getDiscoveryEntries,
  getPluginCount,
  isInitialized,
} from "@/server/plugins";
import { prisma } from "@/lib/db";
import type { ResourcesDiscoveryResponse } from "@glueco/shared";
import { CORS_HEADERS, CORS_PREFLIGHT_HEADERS } from "@/lib/cors";

// ============================================
// GET /api/resources
// Public discovery endpoint for available resources
// Returns list of CONFIGURED resources (with API keys)
// ============================================

const GATEWAY_VERSION = "1.0.0";
const GATEWAY_NAME = "Personal Resource Gateway";

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

  // Get all registered plugins
  const allResources = getDiscoveryEntries();

  // Get configured resources (those with API keys in database)
  const configuredSecrets = await prisma.resourceSecret.findMany({
    where: { status: "ACTIVE" },
    select: { resourceId: true },
  });
  const configuredIds = new Set(configuredSecrets.map((s) => s.resourceId));

  // Filter to only include resources that have been configured
  const resources = allResources.filter((r) => configuredIds.has(r.resourceId));

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
    headers: CORS_PREFLIGHT_HEADERS,
  });
}
