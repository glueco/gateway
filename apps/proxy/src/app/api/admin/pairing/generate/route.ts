import { NextRequest, NextResponse } from "next/server";
import { generatePairingString } from "@/server/pairing";

// ============================================
// Admin authentication helper
// ============================================

function checkAdminAuth(request: NextRequest): boolean {
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
  if (!checkAdminAuth(request)) {
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
