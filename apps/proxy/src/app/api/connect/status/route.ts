import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { CORS_PREFLIGHT_HEADERS } from "@/lib/cors";

// ============================================
// GET /api/connect/status
// Poll for install session status
// ============================================

export async function GET(request: NextRequest) {
  const sessionToken = request.nextUrl.searchParams.get("session");

  if (!sessionToken) {
    return NextResponse.json(
      { error: "Missing session parameter" },
      { status: 400 }
    );
  }

  try {
    // Find session by token
    const session = await prisma.installSession.findUnique({
      where: { sessionToken },
      include: {
        app: true,
      },
    });

    if (!session) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 }
      );
    }

    // Check expiry for pending sessions
    if (session.status === "PENDING" && session.expiresAt < new Date()) {
      return NextResponse.json({
        status: "expired",
      });
    }

    // Return status based on session state
    switch (session.status) {
      case "PENDING":
        return NextResponse.json({
          status: "pending",
        });

      case "APPROVED":
        const gatewayUrl = process.env.GATEWAY_URL;
        return NextResponse.json({
          status: "approved",
          appId: session.appId,
          gatewayUrl,
        });

      case "DENIED":
        return NextResponse.json({
          status: "rejected",
          reason: "Connection was denied by the gateway owner",
        });

      case "EXPIRED":
        return NextResponse.json({
          status: "expired",
        });

      default:
        return NextResponse.json({
          status: "unknown",
        });
    }
  } catch (error) {
    console.error("Status check error:", error);
    return NextResponse.json(
      { error: "Failed to check status" },
      { status: 500 }
    );
  }
}

// Handle OPTIONS for CORS
export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: CORS_PREFLIGHT_HEADERS,
  });
}
