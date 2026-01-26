import { NextRequest, NextResponse } from "next/server";
import {
  loginAdmin,
  clearAdminSession,
  getAdminSessionInfo,
} from "@/lib/auth-cookie";

// ============================================
// POST /api/admin/login
// Login with admin secret
// ============================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { secret } = body;

    if (!secret || typeof secret !== "string") {
      return NextResponse.json(
        { error: "Admin secret is required" },
        { status: 400 },
      );
    }

    const success = await loginAdmin(secret);

    if (!success) {
      return NextResponse.json(
        { error: "Invalid admin secret" },
        { status: 401 },
      );
    }

    const sessionInfo = await getAdminSessionInfo();

    return NextResponse.json({
      success: true,
      message: "Login successful",
      expiresAt: sessionInfo.expiresAt?.toISOString(),
    });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}

// ============================================
// DELETE /api/admin/login
// Logout (clear session)
// ============================================

export async function DELETE() {
  await clearAdminSession();
  return NextResponse.json({ success: true, message: "Logged out" });
}

// ============================================
// GET /api/admin/login
// Check current session status
// ============================================

export async function GET() {
  const sessionInfo = await getAdminSessionInfo();

  return NextResponse.json({
    authenticated: sessionInfo.valid,
    expiresAt: sessionInfo.expiresAt?.toISOString(),
  });
}
