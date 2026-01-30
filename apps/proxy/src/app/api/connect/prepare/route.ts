import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prepareInstallSession } from "@/server/pairing";
import {
  InstallRequestSchema,
  createErrorResponse,
  ErrorCode,
} from "@glueco/shared";
import { CORS_PREFLIGHT_HEADERS } from "@/lib/cors";

// ============================================
// POST /api/connect/prepare
// Prepare an install session
// ============================================

/**
 * Legacy request schema (flat app fields at top level).
 * @deprecated Use InstallRequestSchema from shared
 */
const LegacyPrepareRequestSchema = z.object({
  connectCode: z.string().min(1),
  name: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
  homepage: z.string().url().optional(),
  publicKey: z.string().min(1),
  requestedPermissions: z.array(
    z.object({
      resourceId: z.string().min(1),
      actions: z.array(z.string().min(1)),
    }),
  ),
  redirectUri: z.string().url(),
});

/**
 * Normalize request to canonical format.
 * Supports both legacy (flat) and new (nested app) formats.
 */
function normalizeRequest(
  body: unknown,
): z.infer<typeof InstallRequestSchema> | null {
  // Try new format first (nested app object)
  const newFormat = InstallRequestSchema.safeParse(body);
  if (newFormat.success) {
    return newFormat.data;
  }

  // Try legacy format (flat app fields)
  const legacyFormat = LegacyPrepareRequestSchema.safeParse(body);
  if (legacyFormat.success) {
    const { name, description, homepage, ...rest } = legacyFormat.data;
    return {
      ...rest,
      app: { name, description, homepage },
    };
  }

  return null;
}

export async function POST(request: NextRequest) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      createErrorResponse(ErrorCode.ERR_INVALID_JSON, "Invalid JSON body"),
      { status: 400 },
    );
  }

  const normalized = normalizeRequest(body);

  if (!normalized) {
    // Get validation errors from both schemas for helpful message
    const newErrors = InstallRequestSchema.safeParse(body);
    const errors = newErrors.error?.errors.map((e) => ({
      path: e.path.join("."),
      message: e.message,
    })) || [{ path: "", message: "Invalid request format" }];

    return NextResponse.json(
      createErrorResponse(ErrorCode.ERR_INVALID_REQUEST, "Invalid request", {
        details: errors,
      }),
      { status: 400 },
    );
  }

  // Validate resource ID format
  for (const perm of normalized.requestedPermissions) {
    if (!perm.resourceId.includes(":")) {
      return NextResponse.json(
        createErrorResponse(
          ErrorCode.ERR_INVALID_REQUEST,
          `Invalid resourceId format: ${perm.resourceId}. Expected format: resourceType:provider (e.g., llm:groq)`,
        ),
        { status: 400 },
      );
    }
  }

  try {
    const result = await prepareInstallSession(normalized.connectCode, {
      name: normalized.app.name,
      description: normalized.app.description,
      homepage: normalized.app.homepage,
      publicKey: normalized.publicKey,
      requestedPermissions: normalized.requestedPermissions,
      redirectUri: normalized.redirectUri,
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
        createErrorResponse(
          ErrorCode.ERR_INVALID_CONNECT_CODE,
          "Invalid or expired connect code",
        ),
        { status: 400 },
      );
    }

    console.error("Prepare error:", error);
    return NextResponse.json(
      createErrorResponse(
        ErrorCode.ERR_INTERNAL,
        "Failed to prepare install session",
      ),
      { status: 500 },
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
