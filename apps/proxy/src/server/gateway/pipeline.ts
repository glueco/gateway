import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import {
  checkRateLimit,
  checkAndIncrementBudget,
  RateLimitResult,
  BudgetResult,
} from "@/lib/redis";
import { decryptSecret } from "@/lib/vault";
import {
  authenticateRequest,
  AuthResult,
  getAuthErrorStatus,
} from "@/server/auth/pop";
import {
  getPlugin,
  ResourcePlugin,
  ResourceConstraints,
  ExecuteResult,
} from "@/server/resources";
import { RequestDecision } from "@prisma/client";
import { ErrorCode, getErrorStatus } from "@glueco/shared";

// ============================================
// GATEWAY PIPELINE
// Orchestrates auth → permission → limits → execute → audit
// ============================================

export interface GatewayRequest {
  resourceId: string;
  action: string;
  input: unknown;
  stream: boolean;
}

export interface GatewayResult {
  success: boolean;
  decision: RequestDecision;
  decisionReason?: string;

  // On success
  result?: ExecuteResult;

  // On error
  error?: GatewayError;

  // Metadata for audit
  metadata?: {
    appId?: string;
    model?: string;
    latencyMs?: number;
  };
}

export interface GatewayError {
  status: number;
  code: string;
  message: string;
}

/**
 * Main gateway pipeline.
 * Processes a request through all stages in strict order.
 */
export async function processGatewayRequest(
  request: NextRequest,
  body: string,
  gatewayRequest: GatewayRequest,
): Promise<GatewayResult> {
  const startTime = Date.now();
  let appId: string | undefined;

  try {
    // ============================================
    // STAGE 1: PoP Authentication
    // ============================================
    const authResult = await authenticateRequest(request, body);

    if (!authResult.success) {
      return {
        success: false,
        decision: RequestDecision.DENIED_AUTH,
        decisionReason: authResult.error,
        error: {
          status: getAuthErrorStatus(authResult.errorCode!),
          code: authResult.errorCode!,
          message: authResult.error!,
        },
      };
    }

    appId = authResult.appId!;

    // ============================================
    // STAGE 2: App Status Check (already done in auth)
    // ============================================
    // The authenticateRequest already verifies app status

    // ============================================
    // STAGE 3: Permission Check
    // ============================================
    const permission = await prisma.resourcePermission.findUnique({
      where: {
        appId_resourceId_action: {
          appId,
          resourceId: gatewayRequest.resourceId,
          action: gatewayRequest.action,
        },
      },
    });

    if (!permission || permission.status !== "ACTIVE") {
      return {
        success: false,
        decision: RequestDecision.DENIED_PERMISSION,
        decisionReason: `No permission for ${gatewayRequest.resourceId}:${gatewayRequest.action}`,
        error: {
          status: 403,
          code: ErrorCode.ERR_PERMISSION_DENIED,
          message: `App does not have permission for ${gatewayRequest.resourceId}:${gatewayRequest.action}`,
        },
        metadata: { appId },
      };
    }

    // ============================================
    // STAGE 4: Get Plugin & Validate/Shape Input
    // ============================================
    const plugin = getPlugin(gatewayRequest.resourceId);

    if (!plugin) {
      return {
        success: false,
        decision: RequestDecision.ERROR,
        decisionReason: `Unknown resource: ${gatewayRequest.resourceId}`,
        error: {
          status: getErrorStatus(ErrorCode.ERR_UNKNOWN_RESOURCE),
          code: ErrorCode.ERR_UNKNOWN_RESOURCE,
          message: `Resource '${gatewayRequest.resourceId}' is not supported`,
        },
        metadata: { appId },
      };
    }

    const constraints = (permission.constraints as ResourceConstraints) || {};
    const validation = plugin.validateAndShape(
      gatewayRequest.action,
      gatewayRequest.input,
      constraints,
    );

    if (!validation.valid) {
      return {
        success: false,
        decision: RequestDecision.DENIED_CONSTRAINT,
        decisionReason: validation.error,
        error: {
          status: 400,
          code: ErrorCode.ERR_CONSTRAINT_VIOLATION,
          message: validation.error!,
        },
        metadata: { appId },
      };
    }

    // ============================================
    // STAGE 5: Rate Limit Check
    // ============================================
    const rateLimitResult = await checkAppRateLimit(
      appId,
      gatewayRequest.resourceId,
      gatewayRequest.action,
    );

    if (!rateLimitResult.allowed) {
      return {
        success: false,
        decision: RequestDecision.DENIED_RATE_LIMIT,
        decisionReason: `Rate limit exceeded. Retry after ${new Date(rateLimitResult.resetAt * 1000).toISOString()}`,
        error: {
          status: 429,
          code: ErrorCode.ERR_RATE_LIMIT_EXCEEDED,
          message: `Rate limit exceeded. Remaining: ${rateLimitResult.remaining}`,
        },
        metadata: { appId },
      };
    }

    // ============================================
    // STAGE 6: Budget Check
    // ============================================
    const budgetResult = await checkAppBudget(appId);

    if (!budgetResult.allowed) {
      return {
        success: false,
        decision: RequestDecision.DENIED_BUDGET,
        decisionReason: `Daily quota exceeded (${budgetResult.used}/${budgetResult.limit})`,
        error: {
          status: 429,
          code: ErrorCode.ERR_BUDGET_EXCEEDED,
          message: `Daily request quota exceeded. Used: ${budgetResult.used}/${budgetResult.limit}`,
        },
        metadata: { appId },
      };
    }

    // ============================================
    // STAGE 7: Get Resource Secret & Execute
    // ============================================
    const resourceSecret = await prisma.resourceSecret.findUnique({
      where: { resourceId: gatewayRequest.resourceId },
    });

    if (!resourceSecret || resourceSecret.status !== "ACTIVE") {
      return {
        success: false,
        decision: RequestDecision.ERROR,
        decisionReason: `Resource ${gatewayRequest.resourceId} not configured`,
        error: {
          status: 500,
          code: ErrorCode.ERR_RESOURCE_NOT_CONFIGURED,
          message: `Resource '${gatewayRequest.resourceId}' is not configured`,
        },
        metadata: { appId },
      };
    }

    // Decrypt the secret
    const secret = decryptSecret({
      encryptedKey: resourceSecret.encryptedKey,
      keyIv: resourceSecret.keyIv,
    });

    // Execute the plugin
    try {
      const result = await plugin.execute(
        gatewayRequest.action,
        validation.shapedInput,
        secret,
        resourceSecret.config as Record<string, unknown> | null,
        { stream: gatewayRequest.stream },
      );

      const latencyMs = Date.now() - startTime;

      return {
        success: true,
        decision: RequestDecision.ALLOWED,
        result,
        metadata: {
          appId,
          model: result.usage?.model,
          latencyMs,
        },
      };
    } catch (error) {
      const mapped = plugin.mapError(error);

      return {
        success: false,
        decision: RequestDecision.ERROR,
        decisionReason: mapped.message,
        error: {
          status: mapped.status,
          code: mapped.code,
          message: mapped.message,
        },
        metadata: {
          appId,
          latencyMs: Date.now() - startTime,
        },
      };
    }
  } catch (error) {
    console.error("Gateway pipeline error:", error);

    return {
      success: false,
      decision: RequestDecision.ERROR,
      decisionReason: error instanceof Error ? error.message : "Unknown error",
      error: {
        status: 500,
        code: ErrorCode.ERR_INTERNAL,
        message: "An internal error occurred",
      },
      metadata: { appId, latencyMs: Date.now() - startTime },
    };
  }
}

// ============================================
// RATE LIMIT & BUDGET HELPERS
// ============================================

async function checkAppRateLimit(
  appId: string,
  resourceId: string,
  action: string,
): Promise<RateLimitResult> {
  // Get limit config from DB
  const limit = await prisma.appLimit.findFirst({
    where: {
      appId,
      limitType: "RATE_LIMIT",
      OR: [
        { resourceId, action }, // Specific limit
        { resourceId, action: null }, // Resource-wide limit
        { resourceId: null, action: null }, // Global limit
      ],
    },
    orderBy: [
      { resourceId: "desc" }, // Prefer specific limits
      { action: "desc" },
    ],
  });

  if (!limit) {
    // Default: 60 requests per minute
    return checkRateLimit(`app:${appId}`, 60, 60);
  }

  const key = limit.resourceId
    ? `app:${appId}:${limit.resourceId}:${limit.action || "*"}`
    : `app:${appId}`;

  return checkRateLimit(key, limit.maxRequests, limit.windowSeconds);
}

async function checkAppBudget(appId: string): Promise<BudgetResult> {
  // Get budget config from DB
  const budget = await prisma.appLimit.findFirst({
    where: {
      appId,
      limitType: "BUDGET",
    },
  });

  if (!budget) {
    // Default: 1000 requests per day
    return checkAndIncrementBudget(`app:${appId}`, 1000, "DAILY");
  }

  return checkAndIncrementBudget(
    `app:${appId}`,
    budget.maxRequests,
    budget.periodType || "DAILY",
  );
}

// ============================================
// AUDIT LOGGING (Async)
// ============================================

export async function logRequest(
  result: GatewayResult,
  resourceId: string,
  action: string,
  endpoint: string,
  method: string,
): Promise<void> {
  try {
    await prisma.requestLog.create({
      data: {
        appId: result.metadata?.appId,
        resourceId,
        action,
        endpoint,
        method,
        decision: result.decision,
        decisionReason: result.decisionReason,
        latencyMs: result.metadata?.latencyMs,
        metadata: result.metadata?.model
          ? { model: result.metadata.model }
          : undefined,
      },
    });
  } catch (error) {
    // Don't fail the request if logging fails
    console.error("Failed to log request:", error);
  }
}
