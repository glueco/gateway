import { NextRequest, NextResponse } from "next/server";
import { generatePairingString } from "@/server/pairing";
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
    // If no admin secret configured, allow in development only
    return process.env.NODE_ENV === "development";
  }

  const authHeader = request.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return false;
  }

  const token = authHeader.slice(7);
  return token === adminSecret;
}

// ============================================
// POST /api/admin/pairing/generate
// Generate a new pairing string
// ============================================

export async function POST(request: NextRequest) {
  if (!(await checkAdminAuth(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await generatePairingString();

    return NextResponse.json({
      pairingString: result.pairingString,
      expiresAt: result.expiresAt.toISOString(),
    });
  } catch (error) {
    console.error("Failed to generate pairing string:", error);
    return NextResponse.json(
      { error: "Failed to generate pairing string" },
      { status: 500 },
    );
  }
}
