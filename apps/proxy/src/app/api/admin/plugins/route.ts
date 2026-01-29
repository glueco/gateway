import { NextRequest, NextResponse } from "next/server";
import { validateAdminSession } from "@/lib/auth-cookie";
import { listPlugins } from "@/server/plugins";

// ============================================
// Admin authentication helper
// Uses cookie-based auth with fallback to bearer token
// ============================================

async function checkAdminAuth(request: NextRequest): Promise<boolean> {
  // First, check cookie-based session
  const sessionValid = await validateAdminSession();
  if (sessionValid) {
    return true;
  }

  // Fallback to bearer token for API clients
  const adminSecret = process.env.ADMIN_SECRET;

  if (!adminSecret) {
    return process.env.NODE_ENV === "development";
  }

  const authHeader = request.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return false;
  }

  return authHeader.slice(7) === adminSecret;
}

// ============================================
// GET /api/admin/plugins
// List all installed plugins
// ============================================

export async function GET(request: NextRequest) {
  if (!(await checkAdminAuth(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const plugins = listPlugins();

  // Return plugin IDs and names for the frontend dropdown
  const pluginList = plugins.map((plugin) => ({
    id: plugin.id, // e.g., "llm:groq"
    name: plugin.name, // e.g., "Groq LLM"
    resourceType: plugin.resourceType,
    provider: plugin.provider,
  }));

  return NextResponse.json({ plugins: pluginList });
}
