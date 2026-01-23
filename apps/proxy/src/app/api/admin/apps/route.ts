import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { getBudgetUsage } from "@/lib/redis";

// ============================================
// Admin authentication helper
// ============================================

function checkAdminAuth(request: NextRequest): boolean {
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
// List all apps
// ============================================

export async function GET(request: NextRequest) {
  if (!checkAdminAuth(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apps = await prisma.app.findMany({
    include: {
      permissions: {
        where: { status: "ACTIVE" },
        select: {
          resourceId: true,
          action: true,
          constraints: true,
        },
      },
      limits: true,
      _count: {
        select: { requestLogs: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Enrich with usage data
  const enrichedApps = await Promise.all(
    apps.map(async (app) => {
      const dailyUsage = await getBudgetUsage(`app:${app.id}`, "DAILY");
      return {
        ...app,
        dailyUsage,
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
  if (!checkAdminAuth(request)) {
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
// DELETE /api/admin/apps
// Delete an app
// ============================================

export async function DELETE(request: NextRequest) {
  if (!checkAdminAuth(request)) {
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
