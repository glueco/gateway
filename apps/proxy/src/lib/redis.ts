import { Redis } from "@upstash/redis";

// Singleton Redis client
const globalForRedis = globalThis as unknown as {
  redis: Redis | undefined;
};

function createRedisClient(): Redis {
  // Vercel's Upstash KV integration env variable names
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;

  if (!url || !token) {
    throw new Error(
      "Missing KV_REST_API_URL or KV_REST_API_TOKEN",
    );
  }

  return new Redis({ url, token });
}

export const redis = globalForRedis.redis ?? createRedisClient();

if (process.env.NODE_ENV !== "production") {
  globalForRedis.redis = redis;
}

// ============================================
// NONCE MANAGEMENT (Replay Protection)
// ============================================

const NONCE_TTL_SECONDS = 300; // 5 minutes
const NONCE_PREFIX = "nonce:";

/**
 * Check if a nonce has been used. If not, mark it as used.
 * Returns true if nonce is valid (not seen before), false if replay detected.
 */
export async function checkAndSetNonce(nonce: string): Promise<boolean> {
  const key = `${NONCE_PREFIX}${nonce}`;

  // SETNX: Set if Not eXists, returns 1 if set, 0 if already exists
  const result = await redis.setnx(key, "1");

  if (result === 1) {
    // New nonce, set expiry
    await redis.expire(key, NONCE_TTL_SECONDS);
    return true;
  }

  // Nonce already seen - replay attack
  return false;
}

// ============================================
// RATE LIMITING (Fixed Window)
// ============================================

const RATE_LIMIT_PREFIX = "rate:";

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number; // Unix timestamp
}

/**
 * Check rate limit for a given key.
 * Uses fixed-window algorithm.
 */
export async function checkRateLimit(
  key: string,
  maxRequests: number,
  windowSeconds: number,
): Promise<RateLimitResult> {
  const now = Math.floor(Date.now() / 1000);
  const windowStart = Math.floor(now / windowSeconds) * windowSeconds;
  const windowKey = `${RATE_LIMIT_PREFIX}${key}:${windowStart}`;

  // Increment counter
  const count = await redis.incr(windowKey);

  // Set expiry on first request in window
  if (count === 1) {
    await redis.expire(windowKey, windowSeconds);
  }

  const resetAt = windowStart + windowSeconds;
  const remaining = Math.max(0, maxRequests - count);

  return {
    allowed: count <= maxRequests,
    remaining,
    resetAt,
  };
}

// ============================================
// BUDGET TRACKING (Daily/Monthly Quotas)
// ============================================

const BUDGET_PREFIX = "budget:";

export interface BudgetResult {
  allowed: boolean;
  used: number;
  limit: number;
  periodEnd: number; // Unix timestamp
}

/**
 * Check and increment budget for a given key and period.
 */
export async function checkAndIncrementBudget(
  key: string,
  limit: number,
  periodType: "DAILY" | "MONTHLY",
): Promise<BudgetResult> {
  const now = new Date();
  let periodKey: string;
  let periodEnd: number;

  if (periodType === "DAILY") {
    // Daily: reset at midnight UTC
    const dateStr = now.toISOString().split("T")[0];
    periodKey = `${BUDGET_PREFIX}${key}:daily:${dateStr}`;

    const tomorrow = new Date(now);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    tomorrow.setUTCHours(0, 0, 0, 0);
    periodEnd = Math.floor(tomorrow.getTime() / 1000);

    // TTL: 25 hours to ensure cleanup
    const ttl = 25 * 60 * 60;

    const used = await redis.incr(periodKey);
    if (used === 1) {
      await redis.expire(periodKey, ttl);
    }

    return {
      allowed: used <= limit,
      used,
      limit,
      periodEnd,
    };
  } else {
    // Monthly: reset on 1st of month UTC
    const monthStr = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
    periodKey = `${BUDGET_PREFIX}${key}:monthly:${monthStr}`;

    const nextMonth = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1),
    );
    periodEnd = Math.floor(nextMonth.getTime() / 1000);

    // TTL: 32 days to ensure cleanup
    const ttl = 32 * 24 * 60 * 60;

    const used = await redis.incr(periodKey);
    if (used === 1) {
      await redis.expire(periodKey, ttl);
    }

    return {
      allowed: used <= limit,
      used,
      limit,
      periodEnd,
    };
  }
}

/**
 * Get current budget usage without incrementing.
 */
export async function getBudgetUsage(
  key: string,
  periodType: "DAILY" | "MONTHLY",
): Promise<number> {
  const now = new Date();
  let periodKey: string;

  if (periodType === "DAILY") {
    const dateStr = now.toISOString().split("T")[0];
    periodKey = `${BUDGET_PREFIX}${key}:daily:${dateStr}`;
  } else {
    const monthStr = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
    periodKey = `${BUDGET_PREFIX}${key}:monthly:${monthStr}`;
  }

  const used = await redis.get<number>(periodKey);
  return used ?? 0;
}

export default redis;
