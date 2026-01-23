"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface RequestedPermission {
  resourceId: string;
  actions: string[];
}

interface RateLimitConfig {
  maxRequests: number;
  windowSeconds: number;
}

interface PermissionWithLimits extends RequestedPermission {
  rateLimit: RateLimitConfig;
}

// Preset rate limit options
const RATE_LIMIT_PRESETS: { label: string; value: RateLimitConfig }[] = [
  { label: "5 per minute", value: { maxRequests: 5, windowSeconds: 60 } },
  { label: "10 per minute", value: { maxRequests: 10, windowSeconds: 60 } },
  { label: "30 per minute", value: { maxRequests: 30, windowSeconds: 60 } },
  { label: "60 per minute", value: { maxRequests: 60, windowSeconds: 60 } },
  { label: "100 per hour", value: { maxRequests: 100, windowSeconds: 3600 } },
  { label: "500 per hour", value: { maxRequests: 500, windowSeconds: 3600 } },
  { label: "1000 per day", value: { maxRequests: 1000, windowSeconds: 86400 } },
  { label: "Custom", value: { maxRequests: 0, windowSeconds: 0 } },
];

interface ApprovalFormProps {
  sessionToken: string;
  requestedPermissions: RequestedPermission[];
}

export default function ApprovalForm({
  sessionToken,
  requestedPermissions,
}: ApprovalFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Constraints form state
  const [maxTokens, setMaxTokens] = useState(4096);
  const [allowStreaming, setAllowStreaming] = useState(true);

  // Per-permission rate limits
  const [permissionLimits, setPermissionLimits] = useState<
    Record<string, RateLimitConfig>
  >(() => {
    // Initialize with default rate limits
    const initial: Record<string, RateLimitConfig> = {};
    requestedPermissions.forEach((perm) => {
      initial[perm.resourceId] = { maxRequests: 60, windowSeconds: 60 }; // Default: 60/min
    });
    return initial;
  });

  // Track if custom mode is active per permission
  const [customMode, setCustomMode] = useState<Record<string, boolean>>({});

  const handlePresetChange = (resourceId: string, presetIndex: number) => {
    const preset = RATE_LIMIT_PRESETS[presetIndex];
    if (preset.label === "Custom") {
      setCustomMode((prev) => ({ ...prev, [resourceId]: true }));
    } else {
      setCustomMode((prev) => ({ ...prev, [resourceId]: false }));
      setPermissionLimits((prev) => ({
        ...prev,
        [resourceId]: preset.value,
      }));
    }
  };

  const handleCustomLimitChange = (
    resourceId: string,
    field: "maxRequests" | "windowSeconds",
    value: number,
  ) => {
    setPermissionLimits((prev) => ({
      ...prev,
      [resourceId]: {
        ...prev[resourceId],
        [field]: value,
      },
    }));
  };

  const formatRateLimit = (limit: RateLimitConfig): string => {
    if (limit.windowSeconds === 60) return `${limit.maxRequests}/min`;
    if (limit.windowSeconds === 3600) return `${limit.maxRequests}/hour`;
    if (limit.windowSeconds === 86400) return `${limit.maxRequests}/day`;
    return `${limit.maxRequests} per ${limit.windowSeconds}s`;
  };

  const handleApprove = async () => {
    setLoading(true);
    setError(null);

    try {
      // Build permissions with rate limits
      const permissionsWithLimits = requestedPermissions.map((perm) => ({
        ...perm,
        rateLimit: permissionLimits[perm.resourceId],
      }));

      const res = await fetch("/api/connect/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionToken,
          decision: "approve",
          grantedPermissions: permissionsWithLimits,
          constraints: {
            maxOutputTokens: maxTokens,
            allowStreaming,
          },
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Approval failed");
      }

      // Redirect back to the app
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
        body: JSON.stringify({
          sessionToken,
          decision: "deny",
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Denial failed");
      }

      // Redirect back to the app
      window.location.href = data.redirectUri;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setLoading(false);
    }
  };

  // Helper to get current preset index
  const getCurrentPresetIndex = (resourceId: string): number => {
    if (customMode[resourceId]) return RATE_LIMIT_PRESETS.length - 1; // Custom
    const limit = permissionLimits[resourceId];
    const idx = RATE_LIMIT_PRESETS.findIndex(
      (p) =>
        p.value.maxRequests === limit.maxRequests &&
        p.value.windowSeconds === limit.windowSeconds,
    );
    return idx >= 0 ? idx : RATE_LIMIT_PRESETS.length - 1; // Default to Custom if not found
  };

  return (
    <div>
      {/* Per-Permission Rate Limits */}
      <div className="mb-6 p-4 border rounded-lg">
        <h3 className="font-medium mb-3">Rate Limits per Resource</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Configure how many requests this app can make to each resource.
        </p>

        <div className="space-y-4">
          {requestedPermissions.map((perm) => (
            <div
              key={perm.resourceId}
              className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-sm">{perm.resourceId}</span>
                <span className="text-xs text-gray-500">
                  {formatRateLimit(permissionLimits[perm.resourceId])}
                </span>
              </div>

              <select
                value={getCurrentPresetIndex(perm.resourceId)}
                onChange={(e) =>
                  handlePresetChange(perm.resourceId, parseInt(e.target.value))
                }
                className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 text-sm"
              >
                {RATE_LIMIT_PRESETS.map((preset, idx) => (
                  <option key={idx} value={idx}>
                    {preset.label}
                  </option>
                ))}
              </select>

              {/* Custom fields */}
              {customMode[perm.resourceId] && (
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">
                      Max Requests
                    </label>
                    <input
                      type="number"
                      value={permissionLimits[perm.resourceId].maxRequests}
                      onChange={(e) =>
                        handleCustomLimitChange(
                          perm.resourceId,
                          "maxRequests",
                          parseInt(e.target.value) || 1,
                        )
                      }
                      min={1}
                      className="w-full px-2 py-1 border rounded text-sm dark:bg-gray-700 dark:border-gray-600"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">
                      Window (seconds)
                    </label>
                    <input
                      type="number"
                      value={permissionLimits[perm.resourceId].windowSeconds}
                      onChange={(e) =>
                        handleCustomLimitChange(
                          perm.resourceId,
                          "windowSeconds",
                          parseInt(e.target.value) || 60,
                        )
                      }
                      min={1}
                      className="w-full px-2 py-1 border rounded text-sm dark:bg-gray-700 dark:border-gray-600"
                    />
                  </div>
                </div>
              )}

              <div className="mt-1 text-xs text-gray-500">
                Actions: {perm.actions.join(", ")}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Constraints configuration */}
      <div className="mb-6 p-4 border rounded-lg">
        <h3 className="font-medium mb-3">Output Constraints</h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Max Output Tokens
            </label>
            <input
              type="number"
              value={maxTokens}
              onChange={(e) => setMaxTokens(parseInt(e.target.value) || 4096)}
              min={1}
              max={32768}
              className="w-full px-3 py-2 border rounded-md dark:bg-gray-800 dark:border-gray-700"
            />
            <p className="text-xs text-gray-500 mt-1">
              Maximum tokens per response (1-32768)
            </p>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="allowStreaming"
              checked={allowStreaming}
              onChange={(e) => setAllowStreaming(e.target.checked)}
              className="w-4 h-4 text-primary-600 rounded"
            />
            <label htmlFor="allowStreaming" className="ml-2 text-sm">
              Allow streaming responses
            </label>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={handleDeny}
          disabled={loading}
          className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 transition-colors"
        >
          Deny
        </button>
        <button
          onClick={handleApprove}
          disabled={loading}
          className="flex-1 px-4 py-3 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 disabled:opacity-50 transition-colors"
        >
          {loading ? "Processing..." : "Approve"}
        </button>
      </div>
    </div>
  );
}
