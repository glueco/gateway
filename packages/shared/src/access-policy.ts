// ============================================
// ACCESS POLICY TYPES
// Comprehensive access control configuration
// ============================================

/**
 * Time window restriction.
 * Allows access only during specific hours of the day.
 */
export interface TimeWindow {
  /** Start hour (0-23) in the specified timezone */
  startHour: number;
  /** End hour (0-23) in the specified timezone */
  endHour: number;
  /** Timezone for the time window (e.g., "UTC", "America/New_York") */
  timezone: string;
  /** Days of week allowed (0=Sunday, 6=Saturday). Empty = all days */
  allowedDays?: number[];
}

/**
 * Rate limit configuration.
 */
export interface RateLimitConfig {
  /** Maximum requests allowed in the window */
  maxRequests: number;
  /** Window duration in seconds */
  windowSeconds: number;
}

/**
 * Burst limit configuration.
 * Allows short-term spikes above the sustained rate limit.
 */
export interface BurstConfig {
  /** Maximum requests allowed in burst window */
  limit: number;
  /** Burst window duration in seconds (typically short, e.g., 10s) */
  windowSeconds: number;
}

/**
 * Quota configuration for daily/monthly limits.
 */
export interface QuotaConfig {
  /** Daily request quota (null = unlimited) */
  daily?: number;
  /** Monthly request quota (null = unlimited) */
  monthly?: number;
}

/**
 * Token budget for LLM resources.
 */
export interface TokenBudget {
  /** Daily token budget (null = unlimited) */
  daily?: number;
  /** Monthly token budget (null = unlimited) */
  monthly?: number;
}

/**
 * LLM-specific constraints.
 */
export interface LLMConstraints {
  /** Allowed model IDs (empty = all models allowed) */
  allowedModels?: string[];
  /** Maximum output tokens per request */
  maxOutputTokens?: number;
  /** Maximum input tokens per request */
  maxInputTokens?: number;
  /** Allow streaming responses */
  allowStreaming?: boolean;
  /** Maximum context window */
  maxContextWindow?: number;
}

/**
 * Email-specific constraints.
 */
export interface EmailConstraints {
  /** Allowed from domains */
  allowedFromDomains?: string[];
  /** Maximum recipients per email */
  maxRecipients?: number;
  /** Allow HTML content */
  allowHtml?: boolean;
  /** Maximum attachment size in bytes */
  maxAttachmentSize?: number;
}

/**
 * Generic HTTP constraints.
 */
export interface HTTPConstraints {
  /** Maximum request body size in bytes */
  maxRequestBodySize?: number;
  /** Allowed HTTP methods */
  allowedMethods?: string[];
  /** Custom constraints */
  custom?: Record<string, unknown>;
}

/**
 * Union type for all constraint types.
 */
export type ResourceConstraints =
  | LLMConstraints
  | EmailConstraints
  | HTTPConstraints
  | Record<string, unknown>;

/**
 * Complete access policy for a permission.
 * This is what the proxy owner configures during approval.
 */
export interface AccessPolicy {
  // ============================================
  // Time Controls
  // ============================================

  /** When the permission becomes valid (ISO string, null = immediately) */
  validFrom?: string | null;

  /** When the permission expires (ISO string, null = never) */
  expiresAt?: string | null;

  /** Time-of-day restrictions */
  timeWindow?: TimeWindow | null;

  // ============================================
  // Rate Limiting
  // ============================================

  /** Sustained rate limit */
  rateLimit?: RateLimitConfig;

  /** Burst allowance */
  burst?: BurstConfig;

  // ============================================
  // Quotas
  // ============================================

  /** Request quotas */
  quota?: QuotaConfig;

  /** Token budget (LLM resources) */
  tokenBudget?: TokenBudget;

  // ============================================
  // Scope Constraints
  // ============================================

  /** Resource-specific constraints */
  constraints?: ResourceConstraints;
}

// ============================================
// EXPIRY PRESETS
// Quick options for common expiry scenarios
// ============================================

export type ExpiryPreset =
  | "1_hour"
  | "4_hours"
  | "today"
  | "24_hours"
  | "this_week"
  | "1_month"
  | "3_months"
  | "1_year"
  | "never"
  | "custom";

export interface ExpiryPresetOption {
  value: ExpiryPreset;
  label: string;
  description: string;
  getDate: () => Date | null;
}

/**
 * Get expiry date from preset.
 */
export function getExpiryFromPreset(preset: ExpiryPreset): Date | null {
  const now = new Date();

  switch (preset) {
    case "1_hour":
      return new Date(now.getTime() + 60 * 60 * 1000);
    case "4_hours":
      return new Date(now.getTime() + 4 * 60 * 60 * 1000);
    case "today":
      // End of today in local timezone
      const endOfDay = new Date(now);
      endOfDay.setHours(23, 59, 59, 999);
      return endOfDay;
    case "24_hours":
      return new Date(now.getTime() + 24 * 60 * 60 * 1000);
    case "this_week":
      // End of this week (Sunday)
      const endOfWeek = new Date(now);
      const daysUntilSunday = 7 - endOfWeek.getDay();
      endOfWeek.setDate(endOfWeek.getDate() + daysUntilSunday);
      endOfWeek.setHours(23, 59, 59, 999);
      return endOfWeek;
    case "1_month":
      return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    case "3_months":
      return new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
    case "1_year":
      return new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
    case "never":
      return null;
    case "custom":
      return null; // Custom requires manual date input
    default:
      return null;
  }
}

/**
 * All available expiry presets with labels.
 */
export const EXPIRY_PRESETS: ExpiryPresetOption[] = [
  {
    value: "1_hour",
    label: "1 hour",
    description: "Expires in 1 hour",
    getDate: () => getExpiryFromPreset("1_hour"),
  },
  {
    value: "4_hours",
    label: "4 hours",
    description: "Expires in 4 hours",
    getDate: () => getExpiryFromPreset("4_hours"),
  },
  {
    value: "today",
    label: "End of today",
    description: "Expires at midnight",
    getDate: () => getExpiryFromPreset("today"),
  },
  {
    value: "24_hours",
    label: "24 hours",
    description: "Expires in 24 hours",
    getDate: () => getExpiryFromPreset("24_hours"),
  },
  {
    value: "this_week",
    label: "This week",
    description: "Expires end of week",
    getDate: () => getExpiryFromPreset("this_week"),
  },
  {
    value: "1_month",
    label: "1 month",
    description: "Expires in 30 days",
    getDate: () => getExpiryFromPreset("1_month"),
  },
  {
    value: "3_months",
    label: "3 months",
    description: "Expires in 90 days",
    getDate: () => getExpiryFromPreset("3_months"),
  },
  {
    value: "1_year",
    label: "1 year",
    description: "Expires in 1 year",
    getDate: () => getExpiryFromPreset("1_year"),
  },
  {
    value: "never",
    label: "Never",
    description: "No expiration",
    getDate: () => null,
  },
  {
    value: "custom",
    label: "Custom",
    description: "Set custom date",
    getDate: () => null,
  },
];

// ============================================
// RATE LIMIT PRESETS
// ============================================

export interface RateLimitPreset {
  label: string;
  value: RateLimitConfig;
}

export const RATE_LIMIT_PRESETS: RateLimitPreset[] = [
  {
    label: "5 per minute (very restricted)",
    value: { maxRequests: 5, windowSeconds: 60 },
  },
  { label: "10 per minute", value: { maxRequests: 10, windowSeconds: 60 } },
  { label: "30 per minute", value: { maxRequests: 30, windowSeconds: 60 } },
  {
    label: "60 per minute (standard)",
    value: { maxRequests: 60, windowSeconds: 60 },
  },
  { label: "100 per hour", value: { maxRequests: 100, windowSeconds: 3600 } },
  { label: "500 per hour", value: { maxRequests: 500, windowSeconds: 3600 } },
  { label: "1000 per day", value: { maxRequests: 1000, windowSeconds: 86400 } },
];

// ============================================
// VALIDATION HELPERS
// ============================================

/**
 * Check if a permission is currently valid based on time controls.
 */
export function isPermissionValidNow(policy: AccessPolicy): {
  valid: boolean;
  reason?: string;
} {
  const now = new Date();

  // Check validFrom
  if (policy.validFrom) {
    const validFromDate = new Date(policy.validFrom);
    if (now < validFromDate) {
      return {
        valid: false,
        reason: `Permission not yet valid. Starts at ${validFromDate.toISOString()}`,
      };
    }
  }

  // Check expiresAt
  if (policy.expiresAt) {
    const expiresAtDate = new Date(policy.expiresAt);
    if (now > expiresAtDate) {
      return {
        valid: false,
        reason: `Permission expired at ${expiresAtDate.toISOString()}`,
      };
    }
  }

  // Check time window
  if (policy.timeWindow) {
    const { startHour, endHour, timezone, allowedDays } = policy.timeWindow;

    // Get current time in the specified timezone
    const formatter = new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      hour12: false,
      timeZone: timezone,
    });
    const currentHour = parseInt(formatter.format(now), 10);

    // Get current day (0 = Sunday)
    const dayFormatter = new Intl.DateTimeFormat("en-US", {
      weekday: "short",
      timeZone: timezone,
    });
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const currentDayName = dayFormatter.format(now);
    const currentDay = dayNames.indexOf(currentDayName.slice(0, 3));

    // Check allowed days
    if (
      allowedDays &&
      allowedDays.length > 0 &&
      !allowedDays.includes(currentDay)
    ) {
      return {
        valid: false,
        reason: `Access not allowed on this day (${currentDayName})`,
      };
    }

    // Check time window (handles overnight windows like 22:00-06:00)
    let inWindow: boolean;
    if (startHour <= endHour) {
      // Normal window (e.g., 9:00-17:00)
      inWindow = currentHour >= startHour && currentHour < endHour;
    } else {
      // Overnight window (e.g., 22:00-06:00)
      inWindow = currentHour >= startHour || currentHour < endHour;
    }

    if (!inWindow) {
      return {
        valid: false,
        reason: `Access only allowed between ${startHour}:00-${endHour}:00 ${timezone}`,
      };
    }
  }

  return { valid: true };
}

/**
 * Format an access policy for display.
 */
export function formatAccessPolicySummary(policy: AccessPolicy): string[] {
  const summary: string[] = [];

  if (policy.expiresAt) {
    const date = new Date(policy.expiresAt);
    summary.push(
      `Expires: ${date.toLocaleDateString()} ${date.toLocaleTimeString()}`,
    );
  }

  if (policy.validFrom) {
    const date = new Date(policy.validFrom);
    summary.push(
      `Starts: ${date.toLocaleDateString()} ${date.toLocaleTimeString()}`,
    );
  }

  if (policy.timeWindow) {
    const { startHour, endHour, timezone } = policy.timeWindow;
    summary.push(`Hours: ${startHour}:00-${endHour}:00 ${timezone}`);
  }

  if (policy.rateLimit) {
    const { maxRequests, windowSeconds } = policy.rateLimit;
    if (windowSeconds === 60) summary.push(`Rate: ${maxRequests}/min`);
    else if (windowSeconds === 3600) summary.push(`Rate: ${maxRequests}/hour`);
    else if (windowSeconds === 86400) summary.push(`Rate: ${maxRequests}/day`);
    else summary.push(`Rate: ${maxRequests}/${windowSeconds}s`);
  }

  if (policy.quota?.daily) {
    summary.push(`Daily quota: ${policy.quota.daily}`);
  }

  if (policy.quota?.monthly) {
    summary.push(`Monthly quota: ${policy.quota.monthly}`);
  }

  if (policy.tokenBudget?.daily) {
    summary.push(`Daily tokens: ${policy.tokenBudget.daily.toLocaleString()}`);
  }

  return summary;
}
