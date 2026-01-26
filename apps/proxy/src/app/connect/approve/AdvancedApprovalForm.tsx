"use client";

import { useState, useCallback } from "react";

// ============================================
// TYPES (inline to avoid import issues with client components)
// ============================================

interface RateLimitConfig {
  maxRequests: number;
  windowSeconds: number;
}

interface QuotaConfig {
  daily?: number;
  monthly?: number;
}

interface TokenBudget {
  daily?: number;
  monthly?: number;
}

interface TimeWindow {
  startHour: number;
  endHour: number;
  timezone: string;
  allowedDays?: number[];
}

interface LLMConstraints {
  allowedModels?: string[];
  maxOutputTokens?: number;
  allowStreaming?: boolean;
}

interface AccessPolicy {
  validFrom?: string | null;
  expiresAt?: string | null;
  timeWindow?: TimeWindow | null;
  rateLimit?: RateLimitConfig;
  quota?: QuotaConfig;
  tokenBudget?: TokenBudget;
  constraints?: LLMConstraints;
}

/**
 * Requested duration from the app.
 */
type RequestedDuration =
  | { type: "preset"; preset: string }
  | { type: "duration"; durationMs: number }
  | { type: "until"; expiresAt: string };

interface RequestedPermission {
  resourceId: string;
  actions: string[];
  /** App's requested/preferred duration */
  requestedDuration?: RequestedDuration;
}

// ============================================
// PRESETS
// ============================================

type ExpiryPreset =
  | "1_hour"
  | "4_hours"
  | "today"
  | "24_hours"
  | "this_week"
  | "1_week"
  | "1_month"
  | "3_months"
  | "1_year"
  | "never"
  | "custom";

const EXPIRY_PRESETS: {
  value: ExpiryPreset;
  label: string;
  description: string;
}[] = [
  { value: "1_hour", label: "1 hour", description: "Quick test" },
  { value: "4_hours", label: "4 hours", description: "Extended test" },
  { value: "today", label: "End of today", description: "Until midnight" },
  { value: "24_hours", label: "24 hours", description: "One day" },
  { value: "this_week", label: "This week", description: "Until Sunday" },
  { value: "1_week", label: "1 week", description: "7 days" },
  { value: "1_month", label: "1 month", description: "30 days" },
  { value: "3_months", label: "3 months", description: "90 days" },
  { value: "1_year", label: "1 year", description: "365 days" },
  { value: "never", label: "Never", description: "No expiration" },
  { value: "custom", label: "Custom", description: "Set date/time" },
];

function getExpiryFromPreset(preset: ExpiryPreset): Date | null {
  const now = new Date();
  switch (preset) {
    case "1_hour":
      return new Date(now.getTime() + 60 * 60 * 1000);
    case "4_hours":
      return new Date(now.getTime() + 4 * 60 * 60 * 1000);
    case "today":
      const end = new Date(now);
      end.setHours(23, 59, 59, 999);
      return end;
    case "24_hours":
      return new Date(now.getTime() + 24 * 60 * 60 * 1000);
    case "this_week":
      const week = new Date(now);
      week.setDate(week.getDate() + (7 - week.getDay()));
      week.setHours(23, 59, 59, 999);
      return week;
    case "1_week":
      return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    case "1_month":
      return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    case "3_months":
      return new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
    case "1_year":
      return new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
    case "never":
      return null;
    case "custom":
      return null;
  }
}

/**
 * Map app's requested preset to our ExpiryPreset.
 */
function mapRequestedPreset(requestedPreset: string): ExpiryPreset {
  // Direct mapping for known presets
  const mapping: Record<string, ExpiryPreset> = {
    "1_hour": "1_hour",
    "4_hours": "4_hours",
    "24_hours": "24_hours",
    "1_week": "1_week",
    "1_month": "1_month",
    "3_months": "3_months",
    "1_year": "1_year",
    forever: "never",
  };
  return mapping[requestedPreset] || "never";
}

/**
 * Resolve requested duration to an ExpiryPreset.
 */
function resolveRequestedDuration(
  duration: RequestedDuration | undefined,
): ExpiryPreset {
  if (!duration) return "never";

  switch (duration.type) {
    case "preset":
      return mapRequestedPreset(duration.preset);
    case "duration":
      // Map duration to closest preset
      const hours = duration.durationMs / (60 * 60 * 1000);
      if (hours <= 1) return "1_hour";
      if (hours <= 4) return "4_hours";
      if (hours <= 24) return "24_hours";
      if (hours <= 168) return "1_week"; // 7 days
      if (hours <= 720) return "1_month"; // 30 days
      if (hours <= 2160) return "3_months"; // 90 days
      return "1_year";
    case "until":
      return "custom";
  }
}

/**
 * Format requested duration for display.
 */
function formatRequestedDuration(
  duration: RequestedDuration | undefined,
): string {
  if (!duration) return "No preference";

  switch (duration.type) {
    case "preset":
      const preset = EXPIRY_PRESETS.find(
        (p) => p.value === mapRequestedPreset(duration.preset),
      );
      return preset?.label || duration.preset;
    case "duration":
      const hours = duration.durationMs / (60 * 60 * 1000);
      if (hours < 24)
        return `${Math.round(hours)} hour${hours !== 1 ? "s" : ""}`;
      const days = hours / 24;
      if (days < 7) return `${Math.round(days)} day${days !== 1 ? "s" : ""}`;
      const weeks = days / 7;
      if (weeks < 4)
        return `${Math.round(weeks)} week${weeks !== 1 ? "s" : ""}`;
      const months = days / 30;
      return `${Math.round(months)} month${months !== 1 ? "s" : ""}`;
    case "until":
      return new Date(duration.expiresAt).toLocaleDateString();
  }
}

const RATE_LIMIT_PRESETS = [
  { label: "5/min (testing)", value: { maxRequests: 5, windowSeconds: 60 } },
  { label: "10/min", value: { maxRequests: 10, windowSeconds: 60 } },
  { label: "30/min", value: { maxRequests: 30, windowSeconds: 60 } },
  { label: "60/min (standard)", value: { maxRequests: 60, windowSeconds: 60 } },
  { label: "100/hour", value: { maxRequests: 100, windowSeconds: 3600 } },
  { label: "500/hour", value: { maxRequests: 500, windowSeconds: 3600 } },
  { label: "1000/day", value: { maxRequests: 1000, windowSeconds: 86400 } },
  { label: "Custom", value: { maxRequests: 0, windowSeconds: 0 } },
];

// Model options per provider
const PROVIDER_MODELS: Record<string, string[]> = {
  groq: [
    "llama-3.1-8b-instant",
    "llama-3.1-70b-versatile",
    "mixtral-8x7b-32768",
    "gemma2-9b-it",
  ],
  gemini: ["gemini-1.5-flash", "gemini-1.5-pro", "gemini-pro"],
  openai: ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-3.5-turbo"],
};

// ============================================
// COMPONENT
// ============================================

interface ResourceAvailability {
  available: boolean;
  name?: string;
}

interface Props {
  sessionToken: string;
  requestedPermissions: RequestedPermission[];
  appName: string;
  resourceAvailability: Record<string, ResourceAvailability>;
}

export default function AdvancedApprovalForm({
  sessionToken,
  requestedPermissions,
  appName,
  resourceAvailability,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"quick" | "advanced">("quick");

  // Check if all requested resources are available
  const unavailableResources = requestedPermissions.filter(
    (perm) => !resourceAvailability[perm.resourceId]?.available,
  );
  const hasUnavailableResources = unavailableResources.length > 0;
  const allResourcesUnavailable =
    unavailableResources.length === requestedPermissions.length;

  // Check if app has requested a specific duration
  const appRequestedDuration = requestedPermissions[0]?.requestedDuration;
  const hasRequestedDuration = !!appRequestedDuration;

  // Per-permission policies - initialize with app's requested duration
  const [policies, setPolicies] = useState<Record<string, AccessPolicy>>(() => {
    const initial: Record<string, AccessPolicy> = {};
    requestedPermissions.forEach((perm) => {
      const resolvedPreset = resolveRequestedDuration(perm.requestedDuration);
      const expiryDate = getExpiryFromPreset(resolvedPreset);
      initial[perm.resourceId] = {
        expiresAt: expiryDate?.toISOString() || null,
        rateLimit: { maxRequests: 60, windowSeconds: 60 },
      };
    });
    return initial;
  });

  // UI state for each permission - initialize from app's requested duration
  const [expiryPresets, setExpiryPresets] = useState<
    Record<string, ExpiryPreset>
  >(() => {
    const initial: Record<string, ExpiryPreset> = {};
    requestedPermissions.forEach((perm) => {
      initial[perm.resourceId] = resolveRequestedDuration(
        perm.requestedDuration,
      );
    });
    return initial;
  });

  const [rateLimitPresets, setRateLimitPresets] = useState<
    Record<string, number>
  >(() => {
    const initial: Record<string, number> = {};
    requestedPermissions.forEach((perm) => {
      initial[perm.resourceId] = 3; // Default to 60/min
    });
    return initial;
  });

  const [showAdvanced, setShowAdvanced] = useState<Record<string, boolean>>({});

  // Update policy for a permission
  const updatePolicy = useCallback(
    (resourceId: string, updates: Partial<AccessPolicy>) => {
      setPolicies((prev) => ({
        ...prev,
        [resourceId]: { ...prev[resourceId], ...updates },
      }));
    },
    [],
  );

  // Handle expiry preset change
  const handleExpiryChange = useCallback(
    (resourceId: string, preset: ExpiryPreset) => {
      setExpiryPresets((prev) => ({ ...prev, [resourceId]: preset }));
      const expiryDate = getExpiryFromPreset(preset);
      updatePolicy(resourceId, {
        expiresAt: expiryDate?.toISOString() || null,
      });
    },
    [updatePolicy],
  );

  // Handle rate limit preset change
  const handleRateLimitChange = useCallback(
    (resourceId: string, presetIndex: number) => {
      setRateLimitPresets((prev) => ({ ...prev, [resourceId]: presetIndex }));
      const preset = RATE_LIMIT_PRESETS[presetIndex];
      if (preset.label !== "Custom") {
        updatePolicy(resourceId, { rateLimit: preset.value });
      }
    },
    [updatePolicy],
  );

  // Toggle model in constraints
  const toggleModel = useCallback((resourceId: string, model: string) => {
    setPolicies((prev) => {
      const current = prev[resourceId];
      const currentModels = current.constraints?.allowedModels || [];
      const newModels = currentModels.includes(model)
        ? currentModels.filter((m) => m !== model)
        : [...currentModels, model];

      return {
        ...prev,
        [resourceId]: {
          ...current,
          constraints: {
            ...current.constraints,
            allowedModels: newModels.length > 0 ? newModels : undefined,
          },
        },
      };
    });
  }, []);

  // Submit approval
  const handleApprove = async () => {
    // Only approve available resources
    const availablePermissions = requestedPermissions.filter(
      (perm) => resourceAvailability[perm.resourceId]?.available,
    );

    if (availablePermissions.length === 0) {
      setError(
        "No resources are available to approve. Please configure at least one requested resource first.",
      );
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const grantedPermissions = availablePermissions.map((perm) => ({
        resourceId: perm.resourceId,
        actions: perm.actions,
        policy: policies[perm.resourceId],
      }));

      const res = await fetch("/api/connect/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionToken,
          decision: "approve",
          grantedPermissions,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Approval failed");

      window.location.href = data.redirectUri;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setLoading(false);
    }
  };

  const handleDeny = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/connect/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionToken, decision: "deny" }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Denial failed");

      window.location.href = data.redirectUri;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setLoading(false);
    }
  };

  // Get provider from resourceId
  const getProvider = (resourceId: string) => resourceId.split(":")[1];

  // Format policy summary
  const getPolicySummary = (policy: AccessPolicy): string => {
    const parts: string[] = [];

    if (policy.expiresAt) {
      const date = new Date(policy.expiresAt);
      const now = new Date();
      const diffMs = date.getTime() - now.getTime();
      const diffHours = Math.round(diffMs / (1000 * 60 * 60));

      if (diffHours < 24) {
        parts.push(`${diffHours}h`);
      } else {
        parts.push(date.toLocaleDateString());
      }
    } else {
      parts.push("∞");
    }

    if (policy.rateLimit) {
      const { maxRequests, windowSeconds } = policy.rateLimit;
      if (windowSeconds === 60) parts.push(`${maxRequests}/min`);
      else if (windowSeconds === 3600) parts.push(`${maxRequests}/hr`);
      else if (windowSeconds === 86400) parts.push(`${maxRequests}/day`);
    }

    if (policy.quota?.daily) parts.push(`${policy.quota.daily}/day quota`);

    return parts.join(" • ");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center pb-4 border-b">
        <h2 className="text-lg font-semibold">
          Configure Access for {appName}
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          Set limits and expiration for each resource
        </p>
      </div>

      {/* App's requested duration banner */}
      {hasRequestedDuration && (
        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <div className="flex items-center gap-2">
            <svg
              className="w-5 h-5 text-blue-600 dark:text-blue-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div className="flex-1">
              <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                App requested:{" "}
                <span className="font-bold">
                  {formatRequestedDuration(appRequestedDuration)}
                </span>{" "}
                access
              </p>
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">
                This is pre-selected below. You can adjust as needed.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tab switcher */}
      <div className="flex rounded-lg bg-gray-100 dark:bg-gray-800 p-1">
        <button
          onClick={() => setActiveTab("quick")}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            activeTab === "quick"
              ? "bg-white dark:bg-gray-700 shadow-sm"
              : "text-gray-600 dark:text-gray-400"
          }`}
        >
          Quick Setup
        </button>
        <button
          onClick={() => setActiveTab("advanced")}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            activeTab === "advanced"
              ? "bg-white dark:bg-gray-700 shadow-sm"
              : "text-gray-600 dark:text-gray-400"
          }`}
        >
          Advanced
        </button>
      </div>

      {/* Permissions */}
      <div className="space-y-4">
        {requestedPermissions.map((perm) => {
          const policy = policies[perm.resourceId];
          const provider = getProvider(perm.resourceId);
          const models = PROVIDER_MODELS[provider] || [];
          const isAdvancedOpen = showAdvanced[perm.resourceId];
          const isAvailable = resourceAvailability[perm.resourceId]?.available;
          const configuredName = resourceAvailability[perm.resourceId]?.name;

          return (
            <div
              key={perm.resourceId}
              className={`border rounded-lg overflow-hidden ${
                isAvailable
                  ? "dark:border-gray-700"
                  : "border-red-300 dark:border-red-800 bg-red-50/50 dark:bg-red-900/10"
              }`}
            >
              {/* Resource header */}
              <div
                className={`px-4 py-3 flex items-center justify-between ${
                  isAvailable
                    ? "bg-gray-50 dark:bg-gray-800"
                    : "bg-red-100 dark:bg-red-900/30"
                }`}
              >
                <div className="flex items-center gap-2">
                  {!isAvailable && (
                    <svg
                      className="w-5 h-5 text-red-500"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                      />
                    </svg>
                  )}
                  <div>
                    <span
                      className={`font-mono text-sm font-medium ${!isAvailable ? "text-red-700 dark:text-red-400" : ""}`}
                    >
                      {perm.resourceId}
                    </span>
                    <span
                      className={`ml-2 text-xs ${!isAvailable ? "text-red-500 dark:text-red-400" : "text-gray-500"}`}
                    >
                      {perm.actions.join(", ")}
                    </span>
                  </div>
                </div>
                {isAvailable ? (
                  <span className="text-xs text-gray-500 bg-white dark:bg-gray-700 px-2 py-1 rounded">
                    {getPolicySummary(policy)}
                  </span>
                ) : (
                  <span className="text-xs text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/50 px-2 py-1 rounded font-medium">
                    Not Configured
                  </span>
                )}
              </div>

              {/* Unavailable resource warning */}
              {!isAvailable && (
                <div className="px-4 py-3 bg-red-50 dark:bg-red-900/20 border-t border-red-200 dark:border-red-800">
                  <p className="text-sm text-red-700 dark:text-red-400">
                    <strong>This resource is not set up on your proxy.</strong>{" "}
                    You need to configure the API key for{" "}
                    <code className="bg-red-100 dark:bg-red-900/50 px-1 rounded">
                      {perm.resourceId}
                    </code>{" "}
                    in your proxy settings before you can approve access to it.
                  </p>
                  <a
                    href="/resources"
                    target="_blank"
                    className="inline-flex items-center gap-1 mt-2 text-sm text-red-600 dark:text-red-400 hover:underline"
                  >
                    Configure resources
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                      />
                    </svg>
                  </a>
                </div>
              )}

              {/* Only show configuration options for available resources */}
              {isAvailable && (
                <div className="p-4 space-y-4">
                  {/* Expiry */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium">
                        Access Duration
                      </label>
                      {perm.requestedDuration && (
                        <span className="text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded-full">
                          App requested:{" "}
                          {formatRequestedDuration(perm.requestedDuration)}
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                      {EXPIRY_PRESETS.slice(
                        0,
                        activeTab === "quick" ? 5 : undefined,
                      ).map((preset) => {
                        const isRequested =
                          perm.requestedDuration?.type === "preset" &&
                          mapRequestedPreset(perm.requestedDuration.preset) ===
                            preset.value;
                        return (
                          <button
                            key={preset.value}
                            onClick={() =>
                              handleExpiryChange(perm.resourceId, preset.value)
                            }
                            className={`px-3 py-2 text-xs rounded-md border transition-colors relative ${
                              expiryPresets[perm.resourceId] === preset.value
                                ? "border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300"
                                : isRequested
                                  ? "border-blue-300 dark:border-blue-700 bg-blue-50/50 dark:bg-blue-900/10"
                                  : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                            }`}
                          >
                            {preset.label}
                            {isRequested &&
                              expiryPresets[perm.resourceId] !==
                                preset.value && (
                                <span className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full" />
                              )}
                          </button>
                        );
                      })}
                    </div>

                    {/* Custom date picker */}
                    {expiryPresets[perm.resourceId] === "custom" && (
                      <input
                        type="datetime-local"
                        className="mt-2 w-full px-3 py-2 border rounded-md text-sm dark:bg-gray-800 dark:border-gray-700"
                        onChange={(e) => {
                          const date = e.target.value
                            ? new Date(e.target.value)
                            : null;
                          updatePolicy(perm.resourceId, {
                            expiresAt: date?.toISOString() || null,
                          });
                        }}
                      />
                    )}
                  </div>

                  {/* Rate Limit */}
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Rate Limit
                    </label>
                    <select
                      value={rateLimitPresets[perm.resourceId]}
                      onChange={(e) =>
                        handleRateLimitChange(
                          perm.resourceId,
                          parseInt(e.target.value),
                        )
                      }
                      className="w-full px-3 py-2 border rounded-md text-sm dark:bg-gray-800 dark:border-gray-700"
                    >
                      {RATE_LIMIT_PRESETS.map((preset, idx) => (
                        <option key={idx} value={idx}>
                          {preset.label}
                        </option>
                      ))}
                    </select>

                    {/* Custom rate limit */}
                    {RATE_LIMIT_PRESETS[rateLimitPresets[perm.resourceId]]
                      ?.label === "Custom" && (
                      <div className="mt-2 grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">
                            Requests
                          </label>
                          <input
                            type="number"
                            min={1}
                            value={policy.rateLimit?.maxRequests || 60}
                            onChange={(e) =>
                              updatePolicy(perm.resourceId, {
                                rateLimit: {
                                  ...policy.rateLimit!,
                                  maxRequests: parseInt(e.target.value) || 1,
                                },
                              })
                            }
                            className="w-full px-2 py-1 border rounded text-sm dark:bg-gray-800 dark:border-gray-700"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">
                            Window (seconds)
                          </label>
                          <input
                            type="number"
                            min={1}
                            value={policy.rateLimit?.windowSeconds || 60}
                            onChange={(e) =>
                              updatePolicy(perm.resourceId, {
                                rateLimit: {
                                  ...policy.rateLimit!,
                                  windowSeconds: parseInt(e.target.value) || 60,
                                },
                              })
                            }
                            className="w-full px-2 py-1 border rounded text-sm dark:bg-gray-800 dark:border-gray-700"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Advanced toggle */}
                  {activeTab === "advanced" && (
                    <>
                      <button
                        onClick={() =>
                          setShowAdvanced((prev) => ({
                            ...prev,
                            [perm.resourceId]: !prev[perm.resourceId],
                          }))
                        }
                        className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
                      >
                        {isAdvancedOpen ? "▼" : "▶"} Advanced Options
                      </button>

                      {isAdvancedOpen && (
                        <div className="space-y-4 pl-4 border-l-2 border-gray-200 dark:border-gray-700">
                          {/* Daily Quota */}
                          <div>
                            <label className="block text-sm font-medium mb-1">
                              Daily Quota
                            </label>
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                placeholder="Unlimited"
                                value={policy.quota?.daily || ""}
                                onChange={(e) =>
                                  updatePolicy(perm.resourceId, {
                                    quota: {
                                      ...policy.quota,
                                      daily: e.target.value
                                        ? parseInt(e.target.value)
                                        : undefined,
                                    },
                                  })
                                }
                                className="w-32 px-2 py-1 border rounded text-sm dark:bg-gray-800 dark:border-gray-700"
                              />
                              <span className="text-xs text-gray-500">
                                requests per day
                              </span>
                            </div>
                          </div>

                          {/* Monthly Quota */}
                          <div>
                            <label className="block text-sm font-medium mb-1">
                              Monthly Quota
                            </label>
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                placeholder="Unlimited"
                                value={policy.quota?.monthly || ""}
                                onChange={(e) =>
                                  updatePolicy(perm.resourceId, {
                                    quota: {
                                      ...policy.quota,
                                      monthly: e.target.value
                                        ? parseInt(e.target.value)
                                        : undefined,
                                    },
                                  })
                                }
                                className="w-32 px-2 py-1 border rounded text-sm dark:bg-gray-800 dark:border-gray-700"
                              />
                              <span className="text-xs text-gray-500">
                                requests per month
                              </span>
                            </div>
                          </div>

                          {/* Token Budget (for LLM) */}
                          {perm.resourceId.startsWith("llm:") && (
                            <div>
                              <label className="block text-sm font-medium mb-1">
                                Daily Token Budget
                              </label>
                              <div className="flex items-center gap-2">
                                <input
                                  type="number"
                                  placeholder="Unlimited"
                                  value={policy.tokenBudget?.daily || ""}
                                  onChange={(e) =>
                                    updatePolicy(perm.resourceId, {
                                      tokenBudget: {
                                        ...policy.tokenBudget,
                                        daily: e.target.value
                                          ? parseInt(e.target.value)
                                          : undefined,
                                      },
                                    })
                                  }
                                  className="w-32 px-2 py-1 border rounded text-sm dark:bg-gray-800 dark:border-gray-700"
                                />
                                <span className="text-xs text-gray-500">
                                  tokens per day
                                </span>
                              </div>
                            </div>
                          )}

                          {/* Time Window */}
                          <div>
                            <label className="block text-sm font-medium mb-1">
                              Time Restriction
                            </label>
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                id={`timeWindow-${perm.resourceId}`}
                                checked={!!policy.timeWindow}
                                onChange={(e) =>
                                  updatePolicy(perm.resourceId, {
                                    timeWindow: e.target.checked
                                      ? {
                                          startHour: 9,
                                          endHour: 17,
                                          timezone: "UTC",
                                        }
                                      : null,
                                  })
                                }
                                className="w-4 h-4"
                              />
                              <label
                                htmlFor={`timeWindow-${perm.resourceId}`}
                                className="text-sm"
                              >
                                Restrict to specific hours
                              </label>
                            </div>

                            {policy.timeWindow && (
                              <div className="mt-2 grid grid-cols-3 gap-2">
                                <div>
                                  <label className="block text-xs text-gray-500 mb-1">
                                    Start Hour
                                  </label>
                                  <select
                                    value={policy.timeWindow.startHour}
                                    onChange={(e) =>
                                      updatePolicy(perm.resourceId, {
                                        timeWindow: {
                                          ...policy.timeWindow!,
                                          startHour: parseInt(e.target.value),
                                        },
                                      })
                                    }
                                    className="w-full px-2 py-1 border rounded text-sm dark:bg-gray-800 dark:border-gray-700"
                                  >
                                    {Array.from({ length: 24 }, (_, i) => (
                                      <option key={i} value={i}>
                                        {i.toString().padStart(2, "0")}:00
                                      </option>
                                    ))}
                                  </select>
                                </div>
                                <div>
                                  <label className="block text-xs text-gray-500 mb-1">
                                    End Hour
                                  </label>
                                  <select
                                    value={policy.timeWindow.endHour}
                                    onChange={(e) =>
                                      updatePolicy(perm.resourceId, {
                                        timeWindow: {
                                          ...policy.timeWindow!,
                                          endHour: parseInt(e.target.value),
                                        },
                                      })
                                    }
                                    className="w-full px-2 py-1 border rounded text-sm dark:bg-gray-800 dark:border-gray-700"
                                  >
                                    {Array.from({ length: 24 }, (_, i) => (
                                      <option key={i} value={i}>
                                        {i.toString().padStart(2, "0")}:00
                                      </option>
                                    ))}
                                  </select>
                                </div>
                                <div>
                                  <label className="block text-xs text-gray-500 mb-1">
                                    Timezone
                                  </label>
                                  <select
                                    value={policy.timeWindow.timezone}
                                    onChange={(e) =>
                                      updatePolicy(perm.resourceId, {
                                        timeWindow: {
                                          ...policy.timeWindow!,
                                          timezone: e.target.value,
                                        },
                                      })
                                    }
                                    className="w-full px-2 py-1 border rounded text-sm dark:bg-gray-800 dark:border-gray-700"
                                  >
                                    <option value="UTC">UTC</option>
                                    <option value="America/New_York">
                                      Eastern
                                    </option>
                                    <option value="America/Los_Angeles">
                                      Pacific
                                    </option>
                                    <option value="Europe/London">
                                      London
                                    </option>
                                    <option value="Asia/Tokyo">Tokyo</option>
                                  </select>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Model Restrictions (for LLM) */}
                          {perm.resourceId.startsWith("llm:") &&
                            models.length > 0 && (
                              <div>
                                <label className="block text-sm font-medium mb-2">
                                  Allowed Models
                                </label>
                                <p className="text-xs text-gray-500 mb-2">
                                  Leave all unchecked to allow any model
                                </p>
                                <div className="flex flex-wrap gap-2">
                                  {models.map((model) => (
                                    <button
                                      key={model}
                                      onClick={() =>
                                        toggleModel(perm.resourceId, model)
                                      }
                                      className={`px-2 py-1 text-xs rounded-full border transition-colors ${
                                        policy.constraints?.allowedModels?.includes(
                                          model,
                                        )
                                          ? "border-primary-500 bg-primary-50 dark:bg-primary-900/20"
                                          : "border-gray-200 dark:border-gray-700"
                                      }`}
                                    >
                                      {model}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}

                          {/* Max Output Tokens */}
                          {perm.resourceId.startsWith("llm:") && (
                            <div>
                              <label className="block text-sm font-medium mb-1">
                                Max Output Tokens
                              </label>
                              <div className="flex items-center gap-2">
                                <input
                                  type="number"
                                  placeholder="4096"
                                  value={
                                    policy.constraints?.maxOutputTokens || ""
                                  }
                                  onChange={(e) =>
                                    updatePolicy(perm.resourceId, {
                                      constraints: {
                                        ...policy.constraints,
                                        maxOutputTokens: e.target.value
                                          ? parseInt(e.target.value)
                                          : undefined,
                                      },
                                    })
                                  }
                                  className="w-32 px-2 py-1 border rounded text-sm dark:bg-gray-800 dark:border-gray-700"
                                />
                                <span className="text-xs text-gray-500">
                                  per request
                                </span>
                              </div>
                            </div>
                          )}

                          {/* Streaming */}
                          {perm.resourceId.startsWith("llm:") && (
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                id={`streaming-${perm.resourceId}`}
                                checked={
                                  policy.constraints?.allowStreaming !== false
                                }
                                onChange={(e) =>
                                  updatePolicy(perm.resourceId, {
                                    constraints: {
                                      ...policy.constraints,
                                      allowStreaming: e.target.checked,
                                    },
                                  })
                                }
                                className="w-4 h-4"
                              />
                              <label
                                htmlFor={`streaming-${perm.resourceId}`}
                                className="text-sm"
                              >
                                Allow streaming responses
                              </label>
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Error */}
      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Warning about unavailable resources */}
      {hasUnavailableResources && !allResourcesUnavailable && (
        <div className="p-3 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 rounded-lg text-sm">
          <strong>Note:</strong> {unavailableResources.length} resource(s) not
          configured and will not be granted:{" "}
          {unavailableResources.map((r) => r.resourceId).join(", ")}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 pt-4 border-t">
        <button
          onClick={handleDeny}
          disabled={loading}
          className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 transition-colors"
        >
          Deny
        </button>
        <button
          onClick={handleApprove}
          disabled={loading || allResourcesUnavailable}
          title={
            allResourcesUnavailable
              ? "No resources are configured. Please set up at least one resource first."
              : undefined
          }
          className={`flex-1 px-4 py-3 rounded-lg font-medium transition-colors ${
            allResourcesUnavailable
              ? "bg-gray-400 text-gray-200 cursor-not-allowed"
              : "bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50"
          }`}
        >
          {loading
            ? "Processing..."
            : allResourcesUnavailable
              ? "Cannot Approve (No Resources)"
              : hasUnavailableResources
                ? `Approve ${requestedPermissions.length - unavailableResources.length} Resource(s)`
                : "Approve Access"}
        </button>
      </div>
    </div>
  );
}
