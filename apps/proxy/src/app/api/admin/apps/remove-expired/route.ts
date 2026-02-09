import { NextRequest, NextResponse } from "next/server";
import { checkAdminAuth } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";

// ============================================
// POST /api/admin/apps/remove-expired
// Remove all apps that have only expired permissions
// ============================================

export async function POST(request: NextRequest) {
  const isAuthed = await checkAdminAuth(request);
  if (!isAuthed) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now = new Date();

    // Find all apps where ALL permissions are expired
    // An app is considered expired if all its permissions have expiresAt < now
    const apps = await prisma.app.findMany({
      where: {
        status: "ACTIVE",
      },
      include: {
        permissions: {
          select: {
            id: true,
            expiresAt: true,
          },
        },
      },
    });

    // Filter apps where ALL permissions are expired
    const expiredAppIds: string[] = [];
    for (const app of apps) {
      if (app.permissions.length === 0) {
        // Apps with no permissions are considered expired
        expiredAppIds.push(app.id);
        continue;
      }

      const allExpired = app.permissions.every((perm) => {
        if (!perm.expiresAt) return false; // Permissions without expiry are not expired
        return perm.expiresAt < now;
      });

      if (allExpired) {
        expiredAppIds.push(app.id);
      }
    }

    if (expiredAppIds.length === 0) {
      return NextResponse.json({
        message: "No expired apps found",
        removedCount: 0,
      });
    }

    // Delete expired apps (cascades to permissions and credentials)
    const result = await prisma.app.deleteMany({
      where: {
        id: { in: expiredAppIds },
      },
    });

    return NextResponse.json({
      message: `Removed ${result.count} expired app(s)`,
      removedCount: result.count,
      removedAppIds: expiredAppIds,
    });
  } catch (error) {
    console.error("Error removing expired apps:", error);
    return NextResponse.json(
      { error: "Failed to remove expired apps" },
      { status: 500 }
    );
  }
}
