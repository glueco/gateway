import { NextRequest, NextResponse } from "next/server";
import { checkAdminAuth } from "@/lib/admin-auth";
import { listPlugins } from "@/server/plugins";

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
