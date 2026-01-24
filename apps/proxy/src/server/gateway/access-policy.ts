import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";

// ============================================
// ACCESS POLICY ENFORCEMENT
// Validates permissions against their policies
// ============================================

export interface PolicyCheckResult {
  allowed: boolean;
  reason?: string;
  code?: string;
  details?: Record<string, unknown>;
}

type PermissionWithUsage = Prisma.ResourcePermissionGetPayload<{
  include: { usageRecords: true };
}>;

/**
 * Check if a permission is valid based on its access policy.
 * Returns { allowed: true } if the request should proceed.
 */
export async function checkAccessPolicy(
  permission: PermissionWithUsage,
  requestContext?: {
    inputTokens?: number;
    model?: string;
    streaming?: boolean;
  },
): Promise<PolicyCheckResult> {
  const now = new Date();

  // ============================================
  // 1. Check Time Controls
  // ============================================

  // Check validFrom (not yet active)
  if (permission.validFrom && now < permission.validFrom) {
    return {
      allowed: false,
      code: "NOT_YET_VALID",
      reason: `Permission not yet valid. Starts at ${permission.validFrom.toISOString()}`,
      details: { validFrom: permission.validFrom.toISOString() },
    };
  }

  // Check expiresAt (expired)
  if (permission.expiresAt && now > permission.expiresAt) {
    // Mark permission as expired in DB (async, don't wait)
    markPermissionExpired(permission.id).catch(console.error);

    return {
      allowed: false,
      code: "EXPIRED",
      reason: `Permission expired at ${permission.expiresAt.toISOString()}`,
      details: { expiresAt: permission.expiresAt.toISOString() },
    };
  }

  // Check time window (restricted hours)
  if (permission.timeWindow) {
    const windowResult = checkTimeWindow(
      permission.timeWindow as unknown as TimeWindowConfig,
    );
    if (!windowResult.allowed) {
      return windowResult;
    }
  }

  // ============================================
  // 2. Check Rate Limits
  // ============================================

  if (permission.rateLimitRequests && permission.rateLimitWindowSecs) {
    const rateLimitResult = await checkRateLimit(
      permission.id,
      permission.rateLimitRequests,
      permission.rateLimitWindowSecs,
    );
    if (!rateLimitResult.allowed) {
      return rateLimitResult;
    }
  }

  // ============================================
  // 3. Check Quotas
  // ============================================

  // Daily quota
  if (permission.dailyQuota) {
    const dailyUsage = await getDailyUsage(permission.id);
    if (dailyUsage >= permission.dailyQuota) {
      return {
        allowed: false,
        code: "DAILY_QUOTA_EXCEEDED",
        reason: `Daily quota exceeded. Used ${dailyUsage}/${permission.dailyQuota}`,
        details: { used: dailyUsage, limit: permission.dailyQuota },
      };
    }
  }

  // Monthly quota
  if (permission.monthlyQuota) {
    const monthlyUsage = await getMonthlyUsage(permission.id);
    if (monthlyUsage >= permission.monthlyQuota) {
      return {
        allowed: false,
        code: "MONTHLY_QUOTA_EXCEEDED",
        reason: `Monthly quota exceeded. Used ${monthlyUsage}/${permission.monthlyQuota}`,
        details: { used: monthlyUsage, limit: permission.monthlyQuota },
      };
    }
  }

  // Daily token budget (LLM)
  if (permission.dailyTokenBudget && requestContext?.inputTokens) {
    const dailyTokens = await getDailyTokenUsage(permission.id);
    if (
      dailyTokens + requestContext.inputTokens >
      permission.dailyTokenBudget
    ) {
      return {
        allowed: false,
        code: "DAILY_TOKEN_BUDGET_EXCEEDED",
        reason: `Daily token budget would be exceeded. Used ${dailyTokens}/${permission.dailyTokenBudget}`,
        details: {
          used: dailyTokens,
          limit: permission.dailyTokenBudget,
          requested: requestContext.inputTokens,
        },
      };
    }
  }

  // ============================================
  // 4. Check Constraints
  // ============================================

  if (permission.constraints && requestContext) {
    const constraintResult = checkConstraints(
      permission.constraints as ConstraintsConfig,
      requestContext,
    );
    if (!constraintResult.allowed) {
      return constraintResult;
    }
  }

  return { allowed: true };
}

// ============================================
// TIME WINDOW CHECK
// ============================================

interface TimeWindowConfig {
  startHour: number;
  endHour: number;
  timezone: string;
  allowedDays?: number[];
}

function checkTimeWindow(window: TimeWindowConfig): PolicyCheckResult {
  const now = new Date();

  // Get current time in the specified timezone
  const formatter = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    hour12: false,
    timeZone: window.timezone,
  });
  const currentHour = parseInt(formatter.format(now), 10);

  // Get current day (0 = Sunday)
  const dayFormatter = new Intl.DateTimeFormat("en-US", {
    weekday: "narrow",
    timeZone: window.timezone,
  });
  const dayMap: Record<string, number> = { S: 0, M: 1, T: 2, W: 3, F: 5 };
  // This is simplified - a full implementation would handle Tu vs Th properly
  const currentDay = now.getDay();

  // Check allowed days
  if (window.allowedDays && window.allowedDays.length > 0) {
    if (!window.allowedDays.includes(currentDay)) {
      const dayNames = [
        "Sunday",
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
      ];
      return {
        allowed: false,
        code: "DAY_NOT_ALLOWED",
        reason: `Access not allowed on ${dayNames[currentDay]}`,
        details: { currentDay, allowedDays: window.allowedDays },
      };
    }
  }

  // Check time window
  let inWindow: boolean;
  if (window.startHour <= window.endHour) {
    // Normal window (e.g., 9:00-17:00)
    inWindow = currentHour >= window.startHour && currentHour < window.endHour;
  } else {
    // Overnight window (e.g., 22:00-06:00)
    inWindow = currentHour >= window.startHour || currentHour < window.endHour;
  }

  if (!inWindow) {
    return {
      allowed: false,
      code: "OUTSIDE_TIME_WINDOW",
      reason: `Access only allowed between ${window.startHour}:00-${window.endHour}:00 ${window.timezone}`,
      details: {
        currentHour,
        startHour: window.startHour,
        endHour: window.endHour,
        timezone: window.timezone,
      },
    };
  }

  return { allowed: true };
}

// ============================================
// RATE LIMIT CHECK (using sliding window)
// ============================================

async function checkRateLimit(
  permissionId: string,
  maxRequests: number,
  windowSeconds: number,
): Promise<PolicyCheckResult> {
  const windowStart = new Date(Date.now() - windowSeconds * 1000);

  // Count recent requests from RequestLog
  const recentRequests = await prisma.requestLog.count({
    where: {
      // We need to link RequestLog to permission somehow
      // For now, we'll use a Redis-based approach or in-memory cache
      // This is a simplified version
      timestamp: { gte: windowStart },
    },
  });

  // For now, return allowed - proper implementation needs Redis
  // The existing rate limiter in the pipeline handles this
  return { allowed: true };
}

// ============================================
// QUOTA TRACKING
// ============================================

async function getDailyUsage(permissionId: string): Promise<number> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const usage = await prisma.permissionUsage.findUnique({
    where: {
      permissionId_periodType_periodStart: {
        permissionId,
        periodType: "DAILY",
        periodStart: today,
      },
    },
  });

  return usage?.requestCount || 0;
}

async function getMonthlyUsage(permissionId: string): Promise<number> {
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const usage = await prisma.permissionUsage.findUnique({
    where: {
      permissionId_periodType_periodStart: {
        permissionId,
        periodType: "MONTHLY",
        periodStart: monthStart,
      },
    },
  });

  return usage?.requestCount || 0;
}

async function getDailyTokenUsage(permissionId: string): Promise<number> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const usage = await prisma.permissionUsage.findUnique({
    where: {
      permissionId_periodType_periodStart: {
        permissionId,
        periodType: "DAILY",
        periodStart: today,
      },
    },
  });

  return usage?.tokenCount || 0;
}

/**
 * Increment usage counters after a successful request.
 */
export async function recordUsage(
  permissionId: string,
  tokens?: number,
): Promise<void> {
  const now = new Date();

  // Get period starts
  const dayStart = new Date(now);
  dayStart.setHours(0, 0, 0, 0);

  const monthStart = new Date(now);
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  // Upsert daily usage
  await prisma.permissionUsage.upsert({
    where: {
      permissionId_periodType_periodStart: {
        permissionId,
        periodType: "DAILY",
        periodStart: dayStart,
      },
    },
    create: {
      permissionId,
      periodType: "DAILY",
      periodStart: dayStart,
      requestCount: 1,
      tokenCount: tokens || 0,
    },
    update: {
      requestCount: { increment: 1 },
      tokenCount: { increment: tokens || 0 },
    },
  });

  // Upsert monthly usage
  await prisma.permissionUsage.upsert({
    where: {
      permissionId_periodType_periodStart: {
        permissionId,
        periodType: "MONTHLY",
        periodStart: monthStart,
      },
    },
    create: {
      permissionId,
      periodType: "MONTHLY",
      periodStart: monthStart,
      requestCount: 1,
      tokenCount: tokens || 0,
    },
    update: {
      requestCount: { increment: 1 },
      tokenCount: { increment: tokens || 0 },
    },
  });
}

// ============================================
// CONSTRAINTS CHECK
// ============================================

interface ConstraintsConfig {
  allowedModels?: string[];
  maxOutputTokens?: number;
  maxInputTokens?: number;
  allowStreaming?: boolean;
}

function checkConstraints(
  constraints: ConstraintsConfig,
  context: { model?: string; streaming?: boolean; inputTokens?: number },
): PolicyCheckResult {
  // Check allowed models
  if (constraints.allowedModels && constraints.allowedModels.length > 0) {
    if (context.model && !constraints.allowedModels.includes(context.model)) {
      return {
        allowed: false,
        code: "MODEL_NOT_ALLOWED",
        reason: `Model "${context.model}" is not allowed. Allowed: ${constraints.allowedModels.join(", ")}`,
        details: {
          requestedModel: context.model,
          allowedModels: constraints.allowedModels,
        },
      };
    }
  }

  // Check streaming
  if (constraints.allowStreaming === false && context.streaming) {
    return {
      allowed: false,
      code: "STREAMING_NOT_ALLOWED",
      reason: "Streaming responses are not allowed for this permission",
    };
  }

  // Check max input tokens
  if (constraints.maxInputTokens && context.inputTokens) {
    if (context.inputTokens > constraints.maxInputTokens) {
      return {
        allowed: false,
        code: "INPUT_TOKENS_EXCEEDED",
        reason: `Input tokens (${context.inputTokens}) exceed limit (${constraints.maxInputTokens})`,
        details: {
          inputTokens: context.inputTokens,
          limit: constraints.maxInputTokens,
        },
      };
    }
  }

  return { allowed: true };
}

// ============================================
// HELPERS
// ============================================

async function markPermissionExpired(permissionId: string): Promise<void> {
  try {
    await prisma.resourcePermission.update({
      where: { id: permissionId },
      data: { status: "EXPIRED" },
    });
  } catch (error) {
    console.error("Failed to mark permission as expired:", error);
  }
}

/**
 * Get a permission with its usage records for policy checking.
 */
export async function getPermissionWithUsage(
  appId: string,
  resourceId: string,
  action: string,
): Promise<PermissionWithUsage | null> {
  return prisma.resourcePermission.findUnique({
    where: {
      appId_resourceId_action: {
        appId,
        resourceId,
        action,
      },
    },
    include: {
      usageRecords: {
        where: {
          OR: [
            {
              periodType: "DAILY",
              periodStart: {
                gte: new Date(new Date().setHours(0, 0, 0, 0)),
              },
            },
            {
              periodType: "MONTHLY",
              periodStart: {
                gte: new Date(new Date().setDate(1)),
              },
            },
          ],
        },
      },
    },
  });
}
