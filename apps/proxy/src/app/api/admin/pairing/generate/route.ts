import { NextRequest, NextResponse } from "next/server";
import { generatePairingString } from "@/server/pairing";
import { checkAdminAuth } from "@/lib/admin-auth";

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
