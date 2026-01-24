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
import { generatePopHeaders, type PopHeaders } from "@/lib/crypto";
import {
  PRESETS,
  RESOURCE_TYPES,
  getProvidersForType,
  type Preset,
} from "@/lib/presets";
import { requestLogger } from "@/lib/logger";

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

export default function DashboardPage() {
  const router = useRouter();

  // Session state
  const [session, setSession] = useState<SessionData | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [initialized, setInitialized] = useState(false);

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

  // Active tab
  const [activeTab, setActiveTab] = useState<"presets" | "custom">("presets");

  // Load session on mount
  useEffect(() => {
    const currentSession = loadSession();
    if (!currentSession) {
      router.push("/");
      return;
    }
    setSession(currentSession);
    setInitialized(true);
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
    const providers = getProvidersForType(resourceType);
    if (providers.length > 0 && !providers.includes(provider)) {
      setProvider(providers[0]);
    }
  }, [resourceType, provider]);

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

      const headers: Record<string, string> = {
        ...popHeaders,
      };

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
      if (!cancelled) {
        setRequestPreview(preview);
      }
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
      // Generate fresh PoP headers (they're time-sensitive)
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

      const headers: Record<string, string> = {
        ...popHeaders,
      };

      if (method === "POST" && requestBody) {
        headers["Content-Type"] = "application/json";
      }

      // Update preview with actual headers used
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

      // Get response headers
      const responseHeaders: Record<string, string> = {};
      res.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });

      // Get response body
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

      // Extend session on successful request
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
    setActiveTab("custom"); // Switch to custom to show the filled form
  }, []);

  // Generate curl command
  const generateCurl = useCallback((): string => {
    if (!requestPreview) return "";

    const parts = ["curl"];

    if (requestPreview.method !== "GET") {
      parts.push(`-X ${requestPreview.method}`);
    }

    for (const [key, value] of Object.entries(requestPreview.headers)) {
      parts.push(`-H '${key}: ${value}'`);
    }

    if (requestPreview.body) {
      parts.push(`-d '${requestPreview.body.replace(/'/g, "'\\''")}'`);
    }

    parts.push(`'${requestPreview.url}'`);

    return parts.join(" \\\n  ");
  }, [requestPreview]);

  // Copy curl to clipboard
  const copyCurl = useCallback(async () => {
    const curl = generateCurl();
    await navigator.clipboard.writeText(curl);
  }, [generateCurl]);

  const handleDisconnect = useCallback(() => {
    clearSession();
    router.push("/");
  }, [router]);

  if (!initialized || !session) {
    return (
      <main className="min-h-screen p-8 flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </main>
    );
  }

  const providers = getProvidersForType(resourceType);

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <header className="bg-white dark:bg-gray-900 border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="font-bold text-lg">🔍 Proxy System Check</h1>
            <div className="flex items-center gap-2 text-sm">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              <span className="text-gray-600 dark:text-gray-400">
                Connected to
              </span>
              <code className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-xs">
                {session.proxyUrl}
              </code>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {timeRemaining !== null && (
              <span
                className={`text-sm font-mono ${
                  timeRemaining < 300
                    ? "text-orange-600 dark:text-orange-400"
                    : "text-gray-500"
                }`}
              >
                {formatTimeRemaining(timeRemaining)}
              </span>
            )}
            <button
              onClick={() => router.push("/")}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              ← Home
            </button>
            <button
              onClick={handleDisconnect}
              className="px-3 py-1 text-sm border rounded hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              Disconnect
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Left column: Request Builder */}
          <div className="space-y-4">
            {/* Tab selector */}
            <div className="bg-white dark:bg-gray-900 rounded-lg border p-4">
              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => setActiveTab("presets")}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeTab === "presets"
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700"
                  }`}
                >
                  📋 Presets
                </button>
                <button
                  onClick={() => setActiveTab("custom")}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeTab === "custom"
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700"
                  }`}
                >
                  ⚙️ Custom Request
                </button>
              </div>

              {activeTab === "presets" ? (
                <div className="space-y-3">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Quick tests for common endpoints. Click to load into the
                    request builder.
                  </p>
                  <div className="grid gap-2">
                    {PRESETS.map((preset) => (
                      <button
                        key={preset.id}
                        onClick={() => runPreset(preset)}
                        className="flex items-start gap-3 p-3 text-left border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                      >
                        <span
                          className={`px-2 py-0.5 text-xs font-mono rounded ${
                            preset.method === "GET"
                              ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                              : "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
                          }`}
                        >
                          {preset.method}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm">
                            {preset.name}
                          </div>
                          <div className="text-xs text-gray-500 truncate">
                            /r/{preset.resourceType}/{preset.provider}
                            {preset.path}
                          </div>
                          <div className="text-xs text-gray-400 mt-1">
                            {preset.description}
                          </div>
                        </div>
                        <span className="text-gray-400">→</span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Method selector */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => setMethod("GET")}
                      className={`px-4 py-2 rounded-md text-sm font-mono ${
                        method === "GET"
                          ? "bg-green-600 text-white"
                          : "bg-gray-100 dark:bg-gray-800"
                      }`}
                    >
                      GET
                    </button>
                    <button
                      onClick={() => setMethod("POST")}
                      className={`px-4 py-2 rounded-md text-sm font-mono ${
                        method === "POST"
                          ? "bg-blue-600 text-white"
                          : "bg-gray-100 dark:bg-gray-800"
                      }`}
                    >
                      POST
                    </button>
                  </div>

                  {/* Route builder */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Resource Type
                      </label>
                      <select
                        value={resourceType}
                        onChange={(e) => setResourceType(e.target.value)}
                        className="w-full px-3 py-2 border rounded-md dark:bg-gray-800 dark:border-gray-700"
                      >
                        {RESOURCE_TYPES.map((type) => (
                          <option key={type} value={type}>
                            {type}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Provider
                      </label>
                      <select
                        value={provider}
                        onChange={(e) => setProvider(e.target.value)}
                        className="w-full px-3 py-2 border rounded-md dark:bg-gray-800 dark:border-gray-700"
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
                    <label className="block text-sm font-medium mb-1">
                      Path
                    </label>
                    <input
                      type="text"
                      value={path}
                      onChange={(e) => setPath(e.target.value)}
                      placeholder="/v1/chat/completions"
                      className="w-full px-3 py-2 border rounded-md dark:bg-gray-800 dark:border-gray-700 font-mono text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Query String (optional)
                    </label>
                    <input
                      type="text"
                      value={queryString}
                      onChange={(e) => setQueryString(e.target.value)}
                      placeholder="stream=true"
                      className="w-full px-3 py-2 border rounded-md dark:bg-gray-800 dark:border-gray-700 font-mono text-sm"
                    />
                  </div>

                  {method === "POST" && (
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Request Body (JSON)
                      </label>
                      <textarea
                        value={requestBody}
                        onChange={(e) => setRequestBody(e.target.value)}
                        placeholder='{"model": "llama-3.1-8b-instant", "messages": [...]}'
                        rows={8}
                        className="w-full px-3 py-2 border rounded-md dark:bg-gray-800 dark:border-gray-700 font-mono text-sm"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Run button */}
              <button
                onClick={executeRequest}
                disabled={loading}
                className="mt-4 w-full px-4 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
              >
                {loading ? "Sending Request..." : "▶ Run Request"}
              </button>
            </div>

            {/* Request Preview */}
            {requestPreview && (
              <div className="bg-white dark:bg-gray-900 rounded-lg border p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold">Request Preview</h3>
                  <button
                    onClick={copyCurl}
                    className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-800 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
                  >
                    Copy as curl
                  </button>
                </div>

                <div className="space-y-3 text-sm">
                  <div>
                    <span className="text-gray-500">URL:</span>
                    <div className="mt-1 p-2 bg-gray-50 dark:bg-gray-800 rounded font-mono text-xs break-all">
                      <span
                        className={`mr-2 ${
                          requestPreview.method === "GET"
                            ? "text-green-600"
                            : "text-blue-600"
                        }`}
                      >
                        {requestPreview.method}
                      </span>
                      {requestPreview.url}
                    </div>
                  </div>

                  <div>
                    <span className="text-gray-500">Headers:</span>
                    <div className="mt-1 p-2 bg-gray-50 dark:bg-gray-800 rounded font-mono text-xs space-y-1">
                      {Object.entries(requestPreview.headers).map(
                        ([key, value]) => (
                          <div key={key} className="flex gap-2">
                            <span className="text-purple-600 dark:text-purple-400">
                              {key}:
                            </span>
                            <span className="text-gray-700 dark:text-gray-300 break-all">
                              {value}
                            </span>
                          </div>
                        ),
                      )}
                    </div>
                  </div>

                  {requestPreview.body && (
                    <div>
                      <span className="text-gray-500">Body:</span>
                      <pre className="mt-1 p-2 bg-gray-50 dark:bg-gray-800 rounded font-mono text-xs overflow-x-auto max-h-32">
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

          {/* Right column: Response Viewer */}
          <div className="space-y-4">
            <div className="bg-white dark:bg-gray-900 rounded-lg border p-4 min-h-[400px]">
              <h3 className="font-semibold mb-3">Response</h3>

              {error && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
                  <p className="text-sm text-red-600 dark:text-red-400">
                    {error}
                  </p>
                </div>
              )}

              {loading && (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              )}

              {!loading && !error && !response && (
                <div className="text-center py-12 text-gray-500">
                  <p>Run a request to see the response here</p>
                </div>
              )}

              {response && (
                <div className="space-y-4">
                  {/* Status */}
                  <div className="flex items-center gap-3">
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-medium ${
                        response.status >= 200 && response.status < 300
                          ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                          : response.status >= 400
                            ? "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"
                            : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300"
                      }`}
                    >
                      {response.status} {response.statusText}
                    </span>
                    <span className="text-sm text-gray-500">
                      {response.duration}ms
                    </span>
                  </div>

                  {/* Response Headers */}
                  <div>
                    <button
                      onClick={() => {
                        const el = document.getElementById("response-headers");
                        if (el) el.classList.toggle("hidden");
                      }}
                      className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
                    >
                      <span>Headers</span>
                      <span className="text-xs">▼</span>
                    </button>
                    <div
                      id="response-headers"
                      className="hidden mt-2 p-2 bg-gray-50 dark:bg-gray-800 rounded font-mono text-xs space-y-1"
                    >
                      {Object.entries(response.headers).map(([key, value]) => (
                        <div key={key} className="flex gap-2">
                          <span className="text-purple-600 dark:text-purple-400">
                            {key}:
                          </span>
                          <span className="text-gray-700 dark:text-gray-300">
                            {value}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Response Body */}
                  <div>
                    <span className="text-sm text-gray-500">Body:</span>
                    <pre className="mt-2 p-3 bg-gray-50 dark:bg-gray-800 rounded font-mono text-xs overflow-auto max-h-[500px]">
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
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2">
                ℹ️ About PoP Headers
              </h4>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                Each request is signed with your temporary keypair. The{" "}
                <code className="px-1 bg-blue-100 dark:bg-blue-800 rounded">
                  x-sig
                </code>{" "}
                header contains a unique signature that includes the timestamp
                and a random nonce, making each request valid only once and for
                a short time window.
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
