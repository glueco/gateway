import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { approveInstallSession, denyInstallSession } from "@/server/pairing";

// ============================================
// POST /api/connect/approve
// Complete the install session (approve or deny)
// ============================================

const TimeWindowSchema = z.object({
  startHour: z.number().int().min(0).max(23),
  endHour: z.number().int().min(0).max(23),
  timezone: z.string(),
  allowedDays: z.array(z.number().int().min(0).max(6)).optional(),
});

const RateLimitSchema = z.object({
  maxRequests: z.number().int().positive(),
  windowSeconds: z.number().int().positive(),
});

const QuotaSchema = z.object({
  daily: z.number().int().positive().optional(),
  monthly: z.number().int().positive().optional(),
});

const TokenBudgetSchema = z.object({
  daily: z.number().int().positive().optional(),
  monthly: z.number().int().positive().optional(),
});

const ConstraintsSchema = z
  .object({
    allowedModels: z.array(z.string()).optional(),
    maxOutputTokens: z.number().int().positive().optional(),
    maxInputTokens: z.number().int().positive().optional(),
    allowStreaming: z.boolean().optional(),
  })
  .passthrough(); // Allow additional fields

const AccessPolicySchema = z.object({
  validFrom: z.string().datetime().nullable().optional(),
  expiresAt: z.string().datetime().nullable().optional(),
  timeWindow: TimeWindowSchema.nullable().optional(),
  rateLimit: RateLimitSchema.optional(),
  quota: QuotaSchema.optional(),
  tokenBudget: TokenBudgetSchema.optional(),
  constraints: ConstraintsSchema.optional(),
});

const ApproveRequestSchema = z.object({
  sessionToken: z.string().min(1),
  decision: z.enum(["approve", "deny"]),
  grantedPermissions: z
    .array(
      z.object({
        resourceId: z.string().min(1), // Format: resourceType:provider
        actions: z.array(z.string().min(1)),
        policy: AccessPolicySchema.optional(), // Full access policy
      }),
    )
    .optional(),
});

export async function POST(request: NextRequest) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = ApproveRequestSchema.safeParse(body);

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

  try {
    if (parsed.data.decision === "approve") {
      if (
        !parsed.data.grantedPermissions ||
        parsed.data.grantedPermissions.length === 0
      ) {
        return NextResponse.json(
          { error: "grantedPermissions required for approval" },
          { status: 400 },
        );
      }

      const result = await approveInstallSession(
        parsed.data.sessionToken,
        parsed.data.grantedPermissions,
      );

      return NextResponse.json({
        status: "approved",
        appId: result.appId,
        redirectUri: result.redirectUri,
      });
    } else {
      const result = await denyInstallSession(parsed.data.sessionToken);

      return NextResponse.json({
        status: "denied",
        redirectUri: result.redirectUri,
      });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    if (message.includes("Invalid or expired session")) {
      return NextResponse.json(
        { error: "Invalid or expired session" },
        { status: 400 },
      );
    }

    console.error("Approve error:", error);
    return NextResponse.json(
      { error: "Failed to process approval" },
      { status: 500 },
    );
  }
}
