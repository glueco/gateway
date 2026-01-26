import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getModelUsageStats, getBudgetUsage } from "@/lib/redis";
import { validateAdminSession } from "@/lib/auth-cookie";

// ============================================
// Admin authentication helper
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
// GET /api/admin/usage
// Get usage statistics for apps
// Query params:
//   - appId: specific app ID (optional)
//   - resourceId: specific resource ID (optional)
//   - date: specific date (YYYY-MM-DD, defaults to today)
//   - days: number of days to fetch (default 7, max 30)
// ============================================

export interface ModelUsageReport {
  model: string;
  requestCount: number;
  totalTokens: number;
  inputTokens: number;
  outputTokens: number;
}

export interface DailyUsageReport {
  date: string;
  totalRequests: number;
  models: ModelUsageReport[];
}

export interface AppUsageReport {
  appId: string;
  appName: string;
  resourceId: string;
  dailyUsage: DailyUsageReport[];
  summary: {
    totalRequests: number;
    totalTokens: number;
    totalInputTokens: number;
    totalOutputTokens: number;
    modelBreakdown: ModelUsageReport[];
  };
}

export async function GET(request: NextRequest) {
  if (!(await checkAdminAuth(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const appId = url.searchParams.get("appId");
  const resourceId = url.searchParams.get("resourceId") || "llm:groq";
  const dateParam = url.searchParams.get("date");
  const daysParam = url.searchParams.get("days");

  const days = Math.min(parseInt(daysParam || "7"), 30);

  // Get apps to query
  const apps = appId
    ? await prisma.app.findMany({ where: { id: appId } })
    : await prisma.app.findMany({ where: { status: "ACTIVE" } });

  const reports: AppUsageReport[] = [];

  for (const app of apps) {
    const dailyUsage: DailyUsageReport[] = [];
    const summaryModels: Map<string, ModelUsageReport> = new Map();
    let totalRequests = 0;
    let totalTokens = 0;
    let totalInputTokens = 0;
    let totalOutputTokens = 0;

    // Fetch usage for each day
    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split("T")[0];

      // Skip if specific date requested and doesn't match
      if (dateParam && dateStr !== dateParam) continue;

      const modelStats = await getModelUsageStats(app.id, resourceId, dateStr);

      if (modelStats.length > 0) {
        const dayTotal = modelStats.reduce((sum, m) => sum + m.requestCount, 0);
        totalRequests += dayTotal;

        dailyUsage.push({
          date: dateStr,
          totalRequests: dayTotal,
          models: modelStats,
        });

        // Aggregate to summary
        for (const stat of modelStats) {
          const existing = summaryModels.get(stat.model);
          if (existing) {
            existing.requestCount += stat.requestCount;
            existing.totalTokens += stat.totalTokens;
            existing.inputTokens += stat.inputTokens;
            existing.outputTokens += stat.outputTokens;
          } else {
            summaryModels.set(stat.model, { ...stat });
          }
          totalTokens += stat.totalTokens;
          totalInputTokens += stat.inputTokens;
          totalOutputTokens += stat.outputTokens;
        }
      }
    }

    // Only include apps with usage
    if (dailyUsage.length > 0) {
      reports.push({
        appId: app.id,
        appName: app.name,
        resourceId,
        dailyUsage: dailyUsage.sort((a, b) => b.date.localeCompare(a.date)),
        summary: {
          totalRequests,
          totalTokens,
          totalInputTokens,
          totalOutputTokens,
          modelBreakdown: Array.from(summaryModels.values()).sort(
            (a, b) => b.requestCount - a.requestCount,
          ),
        },
      });
    }
  }

  // Also get request log summary from DB for more complete data
  const logSummary = await prisma.requestLog.groupBy({
    by: ["appId", "resourceId"],
    where: {
      decision: "ALLOWED",
      timestamp: {
        gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000),
      },
      ...(appId && { appId }),
      ...(resourceId && { resourceId }),
    },
    _count: {
      id: true,
    },
  });

  return NextResponse.json({
    reports,
    logSummary: logSummary.map((s) => ({
      appId: s.appId,
      resourceId: s.resourceId,
      requestCount: s._count.id,
    })),
    meta: {
      days,
      resourceId,
      generatedAt: new Date().toISOString(),
    },
  });
}
