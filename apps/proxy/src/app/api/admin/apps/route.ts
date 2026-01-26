import { NextRequest, NextResponse } from "next/server";
import { prisma, Prisma } from "@/lib/db";
import { z } from "zod";
import { getBudgetUsage, getModelUsageStats } from "@/lib/redis";
import { validateAdminSession } from "@/lib/auth-cookie";

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
// GET /api/admin/apps
// List all apps with full permission details
// ============================================

export async function GET(request: NextRequest) {
  if (!(await checkAdminAuth(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apps = await prisma.app.findMany({
    include: {
      permissions: {
        where: { status: "ACTIVE" },
        select: {
          id: true,
          resourceId: true,
          action: true,
          constraints: true,
          validFrom: true,
          expiresAt: true,
          timeWindow: true,
          rateLimitRequests: true,
          rateLimitWindowSecs: true,
          burstLimit: true,
          burstWindowSecs: true,
          dailyQuota: true,
          monthlyQuota: true,
          dailyTokenBudget: true,
          monthlyTokenBudget: true,
          status: true,
          createdAt: true,
        },
      },
      limits: true,
      _count: {
        select: { requestLogs: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Enrich with usage data including model stats
  const enrichedApps = await Promise.all(
    apps.map(async (app) => {
      const dailyUsage = await getBudgetUsage(`app:${app.id}`, "DAILY");

      // Get unique resource IDs from permissions
      const resourceIds = [
        ...new Set(app.permissions.map((p) => p.resourceId)),
      ];

      // Get model usage stats for each resource (last 7 days)
      const usageStats: Array<{
        resourceId: string;
        date: string;
        models: Array<{
          model: string;
          requestCount: number;
          totalTokens: number;
          inputTokens: number;
          outputTokens: number;
        }>;
      }> = [];

      for (const resourceId of resourceIds) {
        // Get stats for last 7 days
        for (let i = 0; i < 7; i++) {
          const date = new Date();
          date.setDate(date.getDate() - i);
          const dateStr = date.toISOString().split("T")[0];
          const models = await getModelUsageStats(app.id, resourceId, dateStr);
          if (models.length > 0) {
            usageStats.push({ resourceId, date: dateStr, models });
          }
        }
      }

      // Calculate totals
      const usageSummary = {
        totalRequests: usageStats.reduce(
          (sum, day) =>
            sum + day.models.reduce((s, m) => s + m.requestCount, 0),
          0,
        ),
        totalTokens: usageStats.reduce(
          (sum, day) => sum + day.models.reduce((s, m) => s + m.totalTokens, 0),
          0,
        ),
        modelBreakdown: Array.from(
          usageStats
            .flatMap((d) => d.models)
            .reduce((acc, m) => {
              const existing = acc.get(m.model);
              if (existing) {
                existing.requestCount += m.requestCount;
                existing.totalTokens += m.totalTokens;
                existing.inputTokens += m.inputTokens;
                existing.outputTokens += m.outputTokens;
              } else {
                acc.set(m.model, { ...m });
              }
              return acc;
            }, new Map<string, (typeof usageStats)[0]["models"][0]>())
            .values(),
        ).sort((a, b) => b.requestCount - a.requestCount),
      };

      return {
        ...app,
        dailyUsage,
        usageStats,
        usageSummary,
      };
    }),
  );

  return NextResponse.json({ apps: enrichedApps });
}

// ============================================
// PATCH /api/admin/apps
// Update app status
// ============================================

const UpdateAppSchema = z.object({
  appId: z.string().min(1),
  status: z.enum(["ACTIVE", "SUSPENDED", "REVOKED"]),
});

export async function PATCH(request: NextRequest) {
  if (!(await checkAdminAuth(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = UpdateAppSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.errors },
      { status: 400 },
    );
  }

  const app = await prisma.app.update({
    where: { id: parsed.data.appId },
    data: { status: parsed.data.status },
  });

  return NextResponse.json({ app });
}

// ============================================
// PUT /api/admin/apps
// Update app details and permissions
// ============================================

const UpdatePermissionSchema = z.object({
  id: z.string(),
  expiresAt: z.string().datetime().nullable().optional(),
  rateLimitRequests: z.number().int().positive().nullable().optional(),
  rateLimitWindowSecs: z.number().int().positive().nullable().optional(),
  dailyQuota: z.number().int().positive().nullable().optional(),
  monthlyQuota: z.number().int().positive().nullable().optional(),
  dailyTokenBudget: z.number().int().positive().nullable().optional(),
  monthlyTokenBudget: z.number().int().positive().nullable().optional(),
  constraints: z.record(z.unknown()).nullable().optional(),
  status: z.enum(["ACTIVE", "REVOKED"]).optional(),
});

const UpdateAppDetailsSchema = z.object({
  appId: z.string().min(1),
  name: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  permissions: z.array(UpdatePermissionSchema).optional(),
});

export async function PUT(request: NextRequest) {
  if (!(await checkAdminAuth(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = UpdateAppDetailsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.errors },
      { status: 400 },
    );
  }

  const { appId, name, description, permissions } = parsed.data;

  // Update app details if provided
  if (name !== undefined || description !== undefined) {
    await prisma.app.update({
      where: { id: appId },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
      },
    });
  }

  // Update permissions if provided
  if (permissions && permissions.length > 0) {
    for (const perm of permissions) {
      await prisma.resourcePermission.update({
        where: { id: perm.id },
        data: {
          ...(perm.expiresAt !== undefined && {
            expiresAt: perm.expiresAt ? new Date(perm.expiresAt) : null,
          }),
          ...(perm.rateLimitRequests !== undefined && {
            rateLimitRequests: perm.rateLimitRequests,
          }),
          ...(perm.rateLimitWindowSecs !== undefined && {
            rateLimitWindowSecs: perm.rateLimitWindowSecs,
          }),
          ...(perm.dailyQuota !== undefined && { dailyQuota: perm.dailyQuota }),
          ...(perm.monthlyQuota !== undefined && {
            monthlyQuota: perm.monthlyQuota,
          }),
          ...(perm.dailyTokenBudget !== undefined && {
            dailyTokenBudget: perm.dailyTokenBudget,
          }),
          ...(perm.monthlyTokenBudget !== undefined && {
            monthlyTokenBudget: perm.monthlyTokenBudget,
          }),
          ...(perm.constraints !== undefined && {
            constraints:
              perm.constraints === null
                ? Prisma.JsonNull
                : (perm.constraints as Prisma.InputJsonValue),
          }),
          ...(perm.status !== undefined && { status: perm.status }),
        },
      });
    }
  }

  // Return updated app
  const updatedApp = await prisma.app.findUnique({
    where: { id: appId },
    include: {
      permissions: {
        where: { status: "ACTIVE" },
        select: {
          id: true,
          resourceId: true,
          action: true,
          constraints: true,
          validFrom: true,
          expiresAt: true,
          timeWindow: true,
          rateLimitRequests: true,
          rateLimitWindowSecs: true,
          burstLimit: true,
          burstWindowSecs: true,
          dailyQuota: true,
          monthlyQuota: true,
          dailyTokenBudget: true,
          monthlyTokenBudget: true,
          status: true,
          createdAt: true,
        },
      },
      limits: true,
    },
  });

  return NextResponse.json({ app: updatedApp });
}

// ============================================
// DELETE /api/admin/apps
// Delete an app
// ============================================

export async function DELETE(request: NextRequest) {
  if (!(await checkAdminAuth(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const appId = url.searchParams.get("appId");

  if (!appId) {
    return NextResponse.json({ error: "appId required" }, { status: 400 });
  }

  await prisma.app.delete({
    where: { id: appId },
  });

  return NextResponse.json({ success: true });
}
