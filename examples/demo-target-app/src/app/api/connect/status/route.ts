// ============================================
// GET /api/connect/status
// Poll for connection approval status
// ============================================

import { NextRequest, NextResponse } from "next/server";
import { createConnectionHandle } from "@/lib/handle.server";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const sessionToken = request.nextUrl.searchParams.get("session");
  const gatewayUrl = request.nextUrl.searchParams.get("gatewayUrl");

  if (!sessionToken || !gatewayUrl) {
    return NextResponse.json(
      { error: "session and gatewayUrl parameters are required" },
      { status: 400 }
    );
  }

  try {
    // Poll proxy status endpoint
    const response = await fetch(
      `${gatewayUrl}/api/connect/status?session=${encodeURIComponent(sessionToken)}`
    );

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      return NextResponse.json(
        { error: errorBody?.error || "Failed to check status" },
        { status: response.status }
      );
    }

    const data = await response.json();

    // If approved, create a signed handle for future requests
    if (data.status === "approved" && data.appId) {
      const handle = createConnectionHandle(gatewayUrl, data.appId);

      return NextResponse.json({
        status: "approved",
        appId: data.appId,
        gatewayUrl,
        handle,
      });
    }

    // Return status as-is for pending/rejected/expired
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
