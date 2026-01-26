"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  loadSession,
  clearSession,
  getSessionTimeRemaining,
  formatTimeRemaining,
  extendSession,
  type SessionData,
} from "@/lib/session";
import { generatePopHeaders } from "@/lib/crypto";
import { PRESETS, type Preset } from "@/lib/presets";
import {
  fetchDiscovery,
  getResourceTypes as getDiscoveredResourceTypes,
  getProvidersForType as getDiscoveredProvidersForType,
  getActionsForResource,
  type DiscoveryResponse,
} from "@/lib/discovery";
import { requestLogger } from "@/lib/logger";

// ============================================
// TYPES
// ============================================

interface RequestPreview {
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: string;
}

interface ResponseData {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
  duration: number;
}

// ============================================
// ICONS
// ============================================

const HomeIcon = () => (
  <svg
    className="w-4 h-4"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
    />
  </svg>
);

const PlayIcon = () => (
  <svg
    className="w-4 h-4"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
    />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);

const CopyIcon = () => (
  <svg
    className="w-4 h-4"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
    />
  </svg>
);

const CheckIcon = () => (
  <svg
    className="w-4 h-4"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  </svg>
);

const ChevronDownIcon = () => (
  <svg
    className="w-4 h-4"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
  </svg>
);

const ChevronUpIcon = () => (
  <svg
    className="w-4 h-4"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
  </svg>
);

const LogoutIcon = () => (
  <svg
    className="w-4 h-4"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
    />
  </svg>
);

const LoadingSpinner = ({ className = "h-5 w-5" }: { className?: string }) => (
  <svg className={`animate-spin ${className}`} fill="none" viewBox="0 0 24 24">
    <circle
      className="opacity-25"
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="4"
    />
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
    />
  </svg>
);

// ============================================
// MAIN COMPONENT
// ============================================

export default function DashboardPage() {
  const router = useRouter();

  // Session state
  const [session, setSession] = useState<SessionData | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [initialized, setInitialized] = useState(false);

  // Discovery state
  const [discovery, setDiscovery] = useState<DiscoveryResponse | null>(null);
  const [discoveryLoading, setDiscoveryLoading] = useState(false);
  const [discoveryError, setDiscoveryError] = useState<string | null>(null);

  // Request builder state
  const [method, setMethod] = useState<"GET" | "POST">("GET");
  const [resourceType, setResourceType] = useState("llm");
  const [provider, setProvider] = useState("groq");
  const [path, setPath] = useState("/v1/models");
  const [queryString, setQueryString] = useState("");
  const [requestBody, setRequestBody] = useState("");

  // Request/Response state
  const [requestPreview, setRequestPreview] = useState<RequestPreview | null>(
    null,
  );
  const [response, setResponse] = useState<ResponseData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // UI state
  const [activeTab, setActiveTab] = useState<"presets" | "custom">("presets");
  const [showHeaders, setShowHeaders] = useState(false);
  const [copied, setCopied] = useState(false);

  // Load session on mount
  useEffect(() => {
    const currentSession = loadSession();
    if (!currentSession) {
      router.push("/");
      return;
    }
    setSession(currentSession);
    setInitialized(true);

    // Fetch discovery
    setDiscoveryLoading(true);
    fetchDiscovery(currentSession.proxyUrl)
      .then((data) => {
        setDiscovery(data);
        if (data.resources.length > 0) {
          const types = getDiscoveredResourceTypes(data);
          if (types.length > 0) {
            setResourceType(types[0]);
            const providers = getDiscoveredProvidersForType(data, types[0]);
            if (providers.length > 0) {
              setProvider(providers[0]);
            }
          }
        }
      })
      .catch((err) => {
        console.error("Discovery failed:", err);
        setDiscoveryError(err.message);
      })
      .finally(() => {
        setDiscoveryLoading(false);
      });
  }, [router]);

  // Update time remaining
  useEffect(() => {
    if (!session) return;

    const updateTime = () => {
      const remaining = getSessionTimeRemaining();
      if (remaining === null || remaining <= 0) {
        clearSession();
        router.push("/");
      } else {
        setTimeRemaining(remaining);
      }
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [session, router]);

  // Update providers when resource type changes
  useEffect(() => {
    if (!discovery) return;
    const providers = getDiscoveredProvidersForType(discovery, resourceType);
    if (providers.length > 0 && !providers.includes(provider)) {
      setProvider(providers[0]);
    }
  }, [resourceType, provider, discovery]);

  // Generate request preview
  const generatePreview =
    useCallback(async (): Promise<RequestPreview | null> => {
      if (!session) return null;

      const normalizedPath = path.startsWith("/") ? path : `/${path}`;
      const fullPath = `/r/${resourceType}/${provider}${normalizedPath}`;
      const pathWithQuery = queryString
        ? `${fullPath}?${queryString}`
        : fullPath;
      const url = `${session.proxyUrl}${pathWithQuery}`;

      const popHeaders = await generatePopHeaders({
        method,
        pathWithQuery,
        appId: session.appId,
        keyPair: session.keyPair,
        body: method === "POST" ? requestBody : undefined,
      });

      const headers: Record<string, string> = { ...popHeaders };
      if (method === "POST" && requestBody) {
        headers["Content-Type"] = "application/json";
      }

      return {
        url,
        method,
        headers,
        body: method === "POST" ? requestBody : undefined,
      };
    }, [
      session,
      method,
      resourceType,
      provider,
      path,
      queryString,
      requestBody,
    ]);

  // Update preview when inputs change
  useEffect(() => {
    let cancelled = false;
    generatePreview().then((preview) => {
      if (!cancelled) setRequestPreview(preview);
    });
    return () => {
      cancelled = true;
    };
  }, [generatePreview]);

  // Execute request
  const executeRequest = useCallback(async () => {
    if (!session) return;

    setLoading(true);
    setError(null);
    setResponse(null);

    try {
      const normalizedPath = path.startsWith("/") ? path : `/${path}`;
      const fullPath = `/r/${resourceType}/${provider}${normalizedPath}`;
      const pathWithQuery = queryString
        ? `${fullPath}?${queryString}`
        : fullPath;
      const url = `${session.proxyUrl}${pathWithQuery}`;

      requestLogger.debug("Generating PoP headers", {
        method,
        pathWithQuery,
        appId: session.appId,
      });

      const popHeaders = await generatePopHeaders({
        method,
        pathWithQuery,
        appId: session.appId,
        keyPair: session.keyPair,
        body: method === "POST" ? requestBody : undefined,
      });

      const headers: Record<string, string> = { ...popHeaders };
      if (method === "POST" && requestBody) {
        headers["Content-Type"] = "application/json";
      }

      setRequestPreview({
        url,
        method,
        headers,
        body: method === "POST" ? requestBody : undefined,
      });

      requestLogger.info("Executing request", {
        url,
        method,
        resourceType,
        provider,
      });

      const startTime = performance.now();
      const res = await fetch(url, {
        method,
        headers,
        body: method === "POST" ? requestBody : undefined,
      });

      const duration = Math.round(performance.now() - startTime);
      const responseHeaders: Record<string, string> = {};
      res.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });

      const responseBody = await res.text();

      requestLogger.info("Request completed", {
        status: res.status,
        duration,
        contentLength: responseBody.length,
      });

      setResponse({
        status: res.status,
        statusText: res.statusText,
        headers: responseHeaders,
        body: responseBody,
        duration,
      });

      extendSession();
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Request failed";
      requestLogger.error("Request failed", {
        error: errorMessage,
        resourceType,
        provider,
      });
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [session, method, resourceType, provider, path, queryString, requestBody]);

  // Run a preset
  const runPreset = useCallback((preset: Preset) => {
    setResourceType(preset.resourceType);
    setProvider(preset.provider);
    setMethod(preset.method);
    setPath(preset.path);
    setQueryString("");
    setRequestBody(preset.body || "");
    setActiveTab("custom");
  }, []);

  // Generate and copy curl
  const copyCurl = useCallback(async () => {
    if (!requestPreview) return;

    const parts = ["curl"];
    if (requestPreview.method !== "GET")
      parts.push(`-X ${requestPreview.method}`);
    for (const [key, value] of Object.entries(requestPreview.headers)) {
      parts.push(`-H '${key}: ${value}'`);
    }
    if (requestPreview.body) {
      parts.push(`-d '${requestPreview.body.replace(/'/g, "'\\''")}'`);
    }
    parts.push(`'${requestPreview.url}'`);

    await navigator.clipboard.writeText(parts.join(" \\\n  "));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [requestPreview]);

  const handleDisconnect = useCallback(() => {
    clearSession();
    router.push("/");
  }, [router]);

  if (!initialized || !session) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <LoadingSpinner className="h-8 w-8" />
      </main>
    );
  }

  const resourceTypes = discovery
    ? getDiscoveredResourceTypes(discovery)
    : ["llm", "mail", "storage"];
  const providers = discovery
    ? getDiscoveredProvidersForType(discovery, resourceType)
    : [];
  const availablePresets = discovery
    ? PRESETS.filter((preset) =>
        discovery.resources.some(
          (r) => r.resourceId === `${preset.resourceType}:${preset.provider}`,
        ),
      )
    : PRESETS;

  const isExpiringSoon = timeRemaining !== null && timeRemaining < 300;

  return (
    <main className="min-h-screen">
      {/* Header */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="font-bold text-lg text-gray-900 dark:text-gray-50">
              System Check
            </h1>
            <div className="hidden sm:flex items-center gap-2 text-sm">
              <span className="status-dot-success" />
              <code className="code-inline text-xs">{session.proxyUrl}</code>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {timeRemaining !== null && (
              <span
                className={`text-sm font-mono ${isExpiringSoon ? "text-amber-600 dark:text-amber-400" : "text-gray-500"}`}
              >
                {formatTimeRemaining(timeRemaining)}
              </span>
            )}
            <button
              onClick={() => router.push("/")}
              className="btn-ghost py-1.5"
            >
              <HomeIcon />
              <span className="hidden sm:inline">Home</span>
            </button>
            <button onClick={handleDisconnect} className="btn-secondary py-1.5">
              <LogoutIcon />
              <span className="hidden sm:inline">Disconnect</span>
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Left Column: Request Builder */}
          <div className="space-y-4">
            {/* Tabs & Builder */}
            <div className="card p-5">
              {/* Tab buttons */}
              <div className="flex gap-2 mb-5">
                <button
                  onClick={() => setActiveTab("presets")}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    activeTab === "presets"
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                  }`}
                >
                  📋 Presets
                </button>
                <button
                  onClick={() => setActiveTab("custom")}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    activeTab === "custom"
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                  }`}
                >
                  ⚙️ Custom
                </button>
              </div>

              {activeTab === "presets" ? (
                <div className="space-y-3">
                  {discoveryLoading ? (
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <LoadingSpinner className="h-4 w-4" />
                      Loading resources...
                    </div>
                  ) : discoveryError ? (
                    <div className="alert-warning">
                      <p className="text-sm">
                        Could not fetch discovery. Showing all presets.
                      </p>
                    </div>
                  ) : discovery ? (
                    <div className="alert-success mb-3">
                      <p className="text-sm">
                        <strong>{discovery.gateway.name}</strong> v
                        {discovery.gateway.version} •{" "}
                        {discovery.resources.length} resource(s)
                      </p>
                    </div>
                  ) : null}

                  {availablePresets.length === 0 && discovery ? (
                    <p className="text-sm text-gray-500">
                      No matching presets. Use Custom Request.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {availablePresets.map((preset) => (
                        <button
                          key={preset.id}
                          onClick={() => runPreset(preset)}
                          className="card-hover w-full p-4 text-left flex items-start gap-3 group"
                        >
                          <span
                            className={
                              preset.method === "GET"
                                ? "method-get"
                                : "method-post"
                            }
                          >
                            {preset.method}
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm text-gray-900 dark:text-gray-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                              {preset.name}
                            </div>
                            <div className="text-xs text-gray-500 truncate mt-0.5">
                              /r/{preset.resourceType}/{preset.provider}
                              {preset.path}
                            </div>
                            <div className="text-xs text-gray-400 mt-1">
                              {preset.description}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Method selector */}
                  <div className="flex gap-2">
                    {(["GET", "POST"] as const).map((m) => (
                      <button
                        key={m}
                        onClick={() => setMethod(m)}
                        className={`px-4 py-2 rounded-lg text-sm font-mono transition-all ${
                          method === m
                            ? m === "GET"
                              ? "bg-emerald-600 text-white"
                              : "bg-blue-600 text-white"
                            : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>

                  {/* Route builder */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="label">Resource Type</label>
                      <select
                        value={resourceType}
                        onChange={(e) => setResourceType(e.target.value)}
                        className="input"
                      >
                        {resourceTypes.map((type) => (
                          <option key={type} value={type}>
                            {type}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="label">Provider</label>
                      <select
                        value={provider}
                        onChange={(e) => setProvider(e.target.value)}
                        className="input"
                      >
                        {providers.map((p) => (
                          <option key={p} value={p}>
                            {p}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="label">Path</label>
                    <input
                      type="text"
                      value={path}
                      onChange={(e) => setPath(e.target.value)}
                      placeholder="/v1/chat/completions"
                      className="input-mono"
                    />
                  </div>

                  <div>
                    <label className="label">Query String (optional)</label>
                    <input
                      type="text"
                      value={queryString}
                      onChange={(e) => setQueryString(e.target.value)}
                      placeholder="stream=true"
                      className="input-mono"
                    />
                  </div>

                  {method === "POST" && (
                    <div>
                      <label className="label">Request Body (JSON)</label>
                      <textarea
                        value={requestBody}
                        onChange={(e) => setRequestBody(e.target.value)}
                        placeholder='{"model": "llama-3.1-8b-instant", "messages": [...]}'
                        rows={8}
                        className="input-mono resize-none"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Run button */}
              <button
                onClick={executeRequest}
                disabled={loading}
                className="btn-primary w-full mt-5"
              >
                {loading ? (
                  <>
                    <LoadingSpinner />
                    Sending...
                  </>
                ) : (
                  <>
                    <PlayIcon />
                    Run Request
                  </>
                )}
              </button>
            </div>

            {/* Request Preview */}
            {requestPreview && (
              <div className="card p-5 animate-fade-in">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="section-title mb-0">Request Preview</h3>
                  <button
                    onClick={copyCurl}
                    className="btn-ghost py-1 px-2 text-xs"
                  >
                    {copied ? <CheckIcon /> : <CopyIcon />}
                    {copied ? "Copied!" : "Copy curl"}
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <p className="text-xs text-gray-500 mb-1.5">URL</p>
                    <div className="code-block text-xs break-all">
                      <span
                        className={
                          requestPreview.method === "GET"
                            ? "text-emerald-600"
                            : "text-blue-600"
                        }
                      >
                        {requestPreview.method}
                      </span>{" "}
                      {requestPreview.url}
                    </div>
                  </div>

                  <div>
                    <p className="text-xs text-gray-500 mb-1.5">Headers</p>
                    <div className="code-block text-xs space-y-1">
                      {Object.entries(requestPreview.headers).map(
                        ([key, value]) => (
                          <div key={key} className="flex gap-2">
                            <span className="text-purple-600 dark:text-purple-400">
                              {key}:
                            </span>
                            <span className="text-gray-600 dark:text-gray-400 break-all">
                              {value}
                            </span>
                          </div>
                        ),
                      )}
                    </div>
                  </div>

                  {requestPreview.body && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1.5">Body</p>
                      <pre className="code-block text-xs overflow-x-auto max-h-32">
                        {(() => {
                          try {
                            return JSON.stringify(
                              JSON.parse(requestPreview.body),
                              null,
                              2,
                            );
                          } catch {
                            return requestPreview.body;
                          }
                        })()}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Response */}
          <div className="space-y-4">
            <div className="card p-5 min-h-[400px]">
              <h3 className="section-title">Response</h3>

              {error && (
                <div className="alert-error animate-fade-in">
                  <p className="text-sm">{error}</p>
                </div>
              )}

              {loading && (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <LoadingSpinner className="h-8 w-8 text-indigo-600" />
                  <p className="text-sm text-gray-500">Sending request...</p>
                </div>
              )}

              {!loading && !error && !response && (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-3">
                    <PlayIcon />
                  </div>
                  <p className="text-gray-500">
                    Run a request to see the response
                  </p>
                </div>
              )}

              {response && (
                <div className="space-y-4 animate-fade-in">
                  {/* Status */}
                  <div className="flex items-center gap-3">
                    <span
                      className={`badge ${
                        response.status >= 200 && response.status < 300
                          ? "badge-success"
                          : response.status >= 400
                            ? "badge-error"
                            : "badge-warning"
                      }`}
                    >
                      {response.status} {response.statusText}
                    </span>
                    <span className="text-sm text-gray-500">
                      {response.duration}ms
                    </span>
                  </div>

                  {/* Headers toggle */}
                  <button
                    onClick={() => setShowHeaders(!showHeaders)}
                    className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                  >
                    {showHeaders ? <ChevronUpIcon /> : <ChevronDownIcon />}
                    Headers ({Object.keys(response.headers).length})
                  </button>

                  {showHeaders && (
                    <div className="code-block text-xs space-y-1 animate-fade-in">
                      {Object.entries(response.headers).map(([key, value]) => (
                        <div key={key} className="flex gap-2">
                          <span className="text-purple-600 dark:text-purple-400">
                            {key}:
                          </span>
                          <span className="text-gray-600 dark:text-gray-400">
                            {value}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Body */}
                  <div>
                    <p className="text-xs text-gray-500 mb-1.5">Body</p>
                    <pre className="code-block text-xs overflow-auto max-h-[500px]">
                      {(() => {
                        try {
                          return JSON.stringify(
                            JSON.parse(response.body),
                            null,
                            2,
                          );
                        } catch {
                          return response.body;
                        }
                      })()}
                    </pre>
                  </div>
                </div>
              )}
            </div>

            {/* Info card */}
            <div className="alert-info">
              <h4 className="font-medium mb-1">ℹ️ About PoP Headers</h4>
              <p className="text-sm opacity-90">
                Each request is signed with your temporary keypair. The{" "}
                <code className="code-inline text-xs">x-sig</code> header
                contains a unique signature including timestamp and nonce,
                making each request valid only once.
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
