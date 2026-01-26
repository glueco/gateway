import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import {
  checkRateLimit,
  checkAndIncrementBudget,
  checkModelRateLimit,
  recordModelUsage,
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
  type PluginContract,
  type PluginResourceConstraints,
  type PluginExecuteResult,
} from "@/server/plugins";
import { extractRequest, ExtractionContext } from "@/server/extractors";
import {
  enforcePolicy,
  constraintsToPolicy,
  hasEnforceableConstraints,
} from "./enforce";
import { RequestDecision } from "@prisma/client";
import { ErrorCode, getErrorStatus } from "@glueco/shared";
import { logger, generateRequestId, createRequestLogger } from "@/lib/logger";

// ============================================
// GATEWAY PIPELINE
// Orchestrates auth → permission → limits → execute → audit
// ============================================

export interface GatewayRequest {
  resourceId: string;
  action: string;
  input: unknown;
  stream: boolean;
  /** Raw body bytes for forwarding - avoids re-reading consumed stream */
  rawBody?: Uint8Array;
}

export interface GatewayResult {
  success: boolean;
  decision: RequestDecision;
  decisionReason?: string;

  // On success
  result?: PluginExecuteResult;

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
 *
 * Stage order optimized for minimal proxy load:
 * 1. Auth → 2. Status → 3. Permission → 4. Rate Limit → 5. Budget
 * → 6. Policy Enforcement (only if constraints exist) → 7. Plugin → 8. Execute → 9. Audit
 */
export async function processGatewayRequest(
  request: NextRequest,
  body: string,
  gatewayRequest: GatewayRequest,
): Promise<GatewayResult> {
  const startTime = Date.now();
  const requestId = generateRequestId();
  const log = createRequestLogger(requestId);
  let appId: string | undefined;

  log.debug("Processing gateway request", {
    resourceId: gatewayRequest.resourceId,
    action: gatewayRequest.action,
    stream: gatewayRequest.stream,
  });

  try {
    // ============================================
    // STAGE 1: PoP Authentication
    // ============================================
    const authResult = await authenticateRequest(request, body);

    if (!authResult.success) {
      log.warn("Authentication failed", {
        errorCode: authResult.errorCode,
        reason: authResult.error,
      });
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
    log.debug("Authentication successful", { appId });

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
    // STAGE 4: Rate Limit Check (early reject - no body parse)
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
    // STAGE 5: Budget Check (early reject - no body parse)
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
    // STAGE 6: Policy Enforcement (only when constraints exist)
    // Skip extraction entirely if no enforceable constraints
    // ============================================
    const constraints = permission.constraints as Record<
      string,
      unknown
    > | null;

    let extractedModel: string | undefined;

    if (hasEnforceableConstraints(constraints)) {
      const extractionCtx: ExtractionContext = {
        method: request.method,
        url: new URL(request.url),
        headers: request.headers,
        body: gatewayRequest.input,
      };

      const extracted = extractRequest(
        gatewayRequest.resourceId,
        gatewayRequest.action,
        extractionCtx,
      );

      extractedModel = extracted.model;

      const policy = constraintsToPolicy(constraints);
      const enforcement = enforcePolicy(policy, extracted);

      if (!enforcement.allowed) {
        return {
          success: false,
          decision: RequestDecision.DENIED_CONSTRAINT,
          decisionReason: enforcement.violation?.message,
          error: {
            status: 403,
            code: enforcement.violation?.code || ErrorCode.ERR_POLICY_VIOLATION,
            message: enforcement.violation?.message || "Policy violation",
          },
          metadata: { appId, model: extracted.model },
        };
      }

      // ============================================
      // STAGE 6.5: Model-specific rate limiting
      // If modelRateLimits are defined, check them
      // ============================================
      if (extracted.model && constraints?.modelRateLimits) {
        const modelRateLimits = constraints.modelRateLimits as Array<{
          model: string;
          maxRequests: number;
          windowSeconds: number;
        }>;

        const modelLimit = modelRateLimits.find(
          (m) =>
            m.model === extracted.model ||
            m.model === extracted.model?.replace(/^models\//, ""),
        );

        if (modelLimit) {
          const modelRateLimitResult = await checkModelRateLimit(
            appId,
            gatewayRequest.resourceId,
            gatewayRequest.action,
            extracted.model,
            modelLimit.maxRequests,
            modelLimit.windowSeconds,
          );

          if (!modelRateLimitResult.allowed) {
            return {
              success: false,
              decision: RequestDecision.DENIED_RATE_LIMIT,
              decisionReason: `Model rate limit exceeded for '${extracted.model}'. Retry after ${new Date(modelRateLimitResult.resetAt * 1000).toISOString()}`,
              error: {
                status: 429,
                code: ErrorCode.ERR_RATE_LIMIT_EXCEEDED,
                message: `Rate limit exceeded for model '${extracted.model}'. Remaining: ${modelRateLimitResult.remaining}`,
              },
              metadata: { appId, model: extracted.model },
            };
          }
        }
      }
    }

    // ============================================
    // STAGE 7: Get Plugin & Validate/Shape Input
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

    // Use constraints already loaded in permission check
    const pluginConstraints = (constraints as PluginResourceConstraints) || {};
    const validation = plugin.validateAndShape(
      gatewayRequest.action,
      gatewayRequest.input,
      pluginConstraints,
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
    // STAGE 8: Get Resource Secret & Execute
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

    // Execute the plugin with new context-based signature
    try {
      const result = await plugin.execute(
        gatewayRequest.action,
        validation.shapedInput,
        {
          secret,
          config: resourceSecret.config as Record<string, unknown> | null,
        },
        { stream: gatewayRequest.stream },
      );

      const latencyMs = Date.now() - startTime;
      const modelUsed = result.usage?.model || extractedModel;

      // Record model usage statistics (async, don't await)
      if (modelUsed && result.usage) {
        recordModelUsage(
          appId,
          gatewayRequest.resourceId,
          modelUsed,
          result.usage.inputTokens || 0,
          result.usage.outputTokens || 0,
        ).catch((err) => {
          log.warn("Failed to record model usage", { error: err });
        });
      }

      log.info("Request completed successfully", {
        appId,
        resourceId: gatewayRequest.resourceId,
        action: gatewayRequest.action,
        durationMs: latencyMs,
        model: modelUsed,
        tokens: result.usage?.totalTokens,
      });

      return {
        success: true,
        decision: RequestDecision.ALLOWED,
        result,
        metadata: {
          appId,
          model: modelUsed,
          latencyMs,
        },
      };
    } catch (error) {
      const mapped = plugin.mapError(error);
      const latencyMs = Date.now() - startTime;

      log.error("Plugin execution failed", {
        appId,
        resourceId: gatewayRequest.resourceId,
        action: gatewayRequest.action,
        errorCode: mapped.code,
        durationMs: latencyMs,
        errorMessage: mapped.message,
      });

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
          latencyMs,
        },
      };
    }
  } catch (error) {
    const latencyMs = Date.now() - startTime;
    log.errorWithStack(
      "Gateway pipeline error",
      error instanceof Error ? error : new Error(String(error)),
      {
        appId,
        resourceId: gatewayRequest.resourceId,
        action: gatewayRequest.action,
        durationMs: latencyMs,
      },
    );

    return {
      success: false,
      decision: RequestDecision.ERROR,
      decisionReason: error instanceof Error ? error.message : "Unknown error",
      error: {
        status: 500,
        code: ErrorCode.ERR_INTERNAL,
        message: "An internal error occurred",
      },
      metadata: { appId, latencyMs },
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
