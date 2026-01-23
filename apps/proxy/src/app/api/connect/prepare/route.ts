import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prepareInstallSession } from "@/server/pairing";

// ============================================
// POST /api/connect/prepare
// Prepare an install session
// ============================================

const PrepareRequestSchema = z.object({
  connectCode: z.string().min(1),
  name: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
  homepage: z.string().url().optional(),
  publicKey: z.string().min(1), // Base64 encoded Ed25519 public key
  requestedPermissions: z.array(
    z.object({
      resourceId: z.string().min(1), // Format: resourceType:provider (e.g., llm:groq)
      actions: z.array(z.string().min(1)),
    }),
  ),
  redirectUri: z.string().url(),
});

export async function POST(request: NextRequest) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = PrepareRequestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid request",
        details: parsed.error.errors.map((e) => ({
          path: e.path.join("."),
          message: e.message,
        })),
      },
      { status: 400 },
    );
  }

  // Validate resource ID format
  for (const perm of parsed.data.requestedPermissions) {
    if (!perm.resourceId.includes(":")) {
      return NextResponse.json(
        {
          error: `Invalid resourceId format: ${perm.resourceId}. Expected format: resourceType:provider (e.g., llm:groq)`,
        },
        { status: 400 },
      );
    }
  }

  try {
    const result = await prepareInstallSession(parsed.data.connectCode, {
      name: parsed.data.name,
      description: parsed.data.description,
      homepage: parsed.data.homepage,
      publicKey: parsed.data.publicKey,
      requestedPermissions: parsed.data.requestedPermissions,
      redirectUri: parsed.data.redirectUri,
    });

    return NextResponse.json({
      sessionToken: result.sessionToken,
      approvalUrl: result.approvalUrl,
      expiresAt: result.expiresAt.toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    if (message.includes("Invalid or expired connect code")) {
      return NextResponse.json(
        { error: "Invalid or expired connect code" },
        { status: 400 },
      );
    }

    console.error("Prepare error:", error);
    return NextResponse.json(
      { error: "Failed to prepare install session" },
      { status: 500 },
    );
  }
}

// Handle OPTIONS for CORS
export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Max-Age": "86400",
    },
  });
}
