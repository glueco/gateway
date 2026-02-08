import { NextResponse } from "next/server";
import { CORS_HEADERS } from "@/lib/cors";
import { listPlugins } from "@/server/plugins";

// ============================================
// GET /api/admin/models
// Returns available models for all registered plugins
// ============================================

export async function GET() {
  try {
    const plugins = listPlugins();
    
    // Build models map from plugins
    const models: Record<string, string[]> = {};
    
    for (const plugin of plugins) {
      if (plugin.defaultModels && plugin.defaultModels.length > 0) {
        models[plugin.id] = [...plugin.defaultModels];
      }
    }
    
    return NextResponse.json(models, { headers: CORS_HEADERS });
  } catch (error) {
    console.error("Failed to fetch models:", error);
    return NextResponse.json(
      { error: "Failed to fetch models" },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
