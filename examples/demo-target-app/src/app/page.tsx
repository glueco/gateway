"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  loadSession,
  loadPendingConnection,
  savePendingConnection,
  saveSession,
  clearSession,
  getSessionTimeRemaining,
  formatTimeRemaining,
} from "@/lib/session";
import { generateKeyPair } from "@/lib/crypto";
import {
  parsePairingString,
  connect,
  type RequestedDuration,
} from "@/lib/connect";

// ============================================
// DURATION PRESETS
// ============================================

type DurationPresetId =
  | "1_hour"
  | "4_hours"
  | "24_hours"
  | "1_week"
  | "1_month"
  | "forever";

// Default duration for System Check app (1 hour for testing)
const DEFAULT_DURATION: DurationPresetId = "1_hour";

interface KeyPair {
  publicKey: string;
  privateKey: string;
}

function HomePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Connection state
  const [isConnected, setIsConnected] = useState(false);
  const [proxyUrl, setProxyUrl] = useState("");
  const [appId, setAppId] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);

  // Form state
  const [pairingString, setPairingString] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);

  // Check session and handle callback on mount
  useEffect(() => {
    // Handle callback from approval
    const status = searchParams.get("status");
    const returnedAppId = searchParams.get("app_id");

    if (status === "approved" && returnedAppId) {
      // Load pending connection and complete it
      const pending = loadPendingConnection();
      if (pending) {
        saveSession({
          proxyUrl: pending.proxyUrl,
          appId: returnedAppId,
          keyPair: pending.keyPair,
        });
        setIsConnected(true);
        setProxyUrl(pending.proxyUrl);
        setAppId(returnedAppId);

        // Clear URL params
        router.replace("/", { scroll: false });
      }
    } else if (status === "denied") {
      setError("Connection was denied by the proxy owner.");
      router.replace("/", { scroll: false });
    }

    // Load existing session
    const session = loadSession();
    if (session) {
      setIsConnected(true);
      setProxyUrl(session.proxyUrl);
      setAppId(session.appId);
    }

    setInitialized(true);
  }, [searchParams, router]);

  // Update time remaining
  useEffect(() => {
    if (!isConnected) return;

    const updateTime = () => {
      const remaining = getSessionTimeRemaining();
      if (remaining === null || remaining <= 0) {
        clearSession();
        setIsConnected(false);
        setAppId(null);
        setTimeRemaining(null);
      } else {
        setTimeRemaining(remaining);
      }
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [isConnected]);

  const handleConnect = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Validate pairing string
      if (!pairingString.trim()) {
        throw new Error("Please enter a pairing string");
      }

      // Validate pairing string format
      parsePairingString(pairingString.trim());

      // Generate keypair
      const keyPair: KeyPair = await generateKeyPair();

      // Get callback URL
      const callbackUrl = `${window.location.origin}/`;

      // Build requested duration (default to 1 hour for System Check)
      const requestedDuration: RequestedDuration = {
        type: "preset",
        preset: DEFAULT_DURATION,
      };

      // Use SDK connect function
      const result = await connect({
        pairingString: pairingString.trim(),
        app: {
          name: "Proxy System Check",
          description: "Diagnostic tool to test proxy functionality",
          homepage: window.location.origin,
        },
        requestedPermissions: [
          // Request common LLM providers with duration preference
          {
            resourceId: "llm:groq",
            actions: ["chat.completions"],
            requestedDuration,
          },
          {
            resourceId: "llm:gemini",
            actions: ["chat.completions"],
            requestedDuration,
          },
          {
            resourceId: "llm:openai",
            actions: ["chat.completions"],
            requestedDuration,
          },
          {
            resourceId: "llm:anthropic",
            actions: ["chat.completions"],
            requestedDuration,
          },
        ],
        redirectUri: callbackUrl,
        keyPair,
      });

      // Save pending connection
      savePendingConnection({
        proxyUrl: result.proxyUrl,
        keyPair: result.keyPair,
      });

      // Redirect to approval URL
      window.location.href = result.approvalUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connection failed");
      setLoading(false);
    }
  }, [pairingString]);

  const handleDisconnect = useCallback(() => {
    clearSession();
    setIsConnected(false);
    setProxyUrl("");
    setAppId(null);
    setTimeRemaining(null);
  }, []);

  const handleGoToDashboard = useCallback(() => {
    router.push("/dashboard");
  }, [router]);

  if (!initialized) {
    return (
      <main className="min-h-screen p-8 flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">🔍 Proxy System Check</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Connect to your Personal Resource Gateway and test all available
            endpoints with signed requests.
          </p>
        </div>

        {/* Connection Status Card */}
        <div className="mb-8 p-6 rounded-lg border bg-white dark:bg-gray-900">
          <h2 className="font-semibold mb-4">Connection Status</h2>

          {isConnected ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></span>
                <span className="text-green-600 dark:text-green-400 font-medium">
                  Connected
                </span>
              </div>

              <div className="grid gap-3 text-sm">
                <div>
                  <span className="text-gray-500">Proxy URL:</span>
                  <code className="ml-2 px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-xs">
                    {proxyUrl}
                  </code>
                </div>
                <div>
                  <span className="text-gray-500">App ID:</span>
                  <code className="ml-2 px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-xs">
                    {appId}
                  </code>
                </div>
                {timeRemaining !== null && (
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500">Session expires in:</span>
                    <span
                      className={`font-mono ${
                        timeRemaining < 300
                          ? "text-orange-600 dark:text-orange-400"
                          : "text-gray-700 dark:text-gray-300"
                      }`}
                    >
                      {formatTimeRemaining(timeRemaining)}
                    </span>
                    {timeRemaining < 300 && (
                      <span className="text-xs text-orange-600 dark:text-orange-400">
                        (expiring soon)
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleGoToDashboard}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  Open System Check Dashboard →
                </button>
                <button
                  onClick={handleDisconnect}
                  className="px-4 py-2 border rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  Disconnect
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-gray-500">
              <span className="w-3 h-3 bg-gray-400 rounded-full"></span>
              Not connected
            </div>
          )}
        </div>

        {/* Connect Form */}
        {!isConnected && (
          <div className="p-6 border rounded-lg bg-white dark:bg-gray-900">
            <h2 className="font-semibold mb-4">Connect to Proxy</h2>

            <div className="space-y-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Get a pairing string from your proxy's admin dashboard, then
                paste it below.
              </p>

              {/* Pairing String Input */}
              <div>
                <label className="block text-sm font-medium mb-1">
                  Pairing String
                </label>
                <textarea
                  value={pairingString}
                  onChange={(e) => setPairingString(e.target.value)}
                  placeholder="pair::https://your-proxy.vercel.app::abc123..."
                  className="w-full px-3 py-2 border rounded-md dark:bg-gray-800 dark:border-gray-700 font-mono text-sm"
                  rows={3}
                />
              </div>
            </div>

            {error && (
              <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
                <p className="text-sm text-red-600 dark:text-red-400 whitespace-pre-wrap">
                  {error}
                </p>
              </div>
            )}

            <button
              onClick={handleConnect}
              disabled={loading}
              className="mt-4 w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? "Connecting..." : "Connect & Request Approval"}
            </button>
          </div>
        )}

        {/* Instructions */}
        <div className="mt-8 p-6 border rounded-lg bg-gray-50 dark:bg-gray-900/50">
          <h3 className="font-semibold mb-3">How it works</h3>
          <ol className="list-decimal list-inside space-y-2 text-sm text-gray-600 dark:text-gray-400">
            <li>
              Get a pairing string from your proxy's dashboard (Admin → Apps →
              Generate Pairing String)
            </li>
            <li>Paste it above and click "Connect & Request Approval"</li>
            <li>You'll be redirected to the proxy to approve the connection</li>
            <li>
              After approval, you'll return here with a temporary session (30
              min)
            </li>
            <li>Use the System Check Dashboard to test endpoints</li>
          </ol>

          <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              <strong>Note:</strong> This is a diagnostic tool. Credentials are
              stored temporarily in your browser and expire after 30 minutes. No
              server-side storage is used.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function HomePage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen p-8 flex items-center justify-center">
          <div className="text-gray-500">Loading...</div>
        </main>
      }
    >
      <HomePageContent />
    </Suspense>
  );
}
