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

// ============================================
// ICONS
// ============================================

const CheckCircleIcon = () => (
  <svg
    className="w-5 h-5"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);

const ArrowRightIcon = () => (
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
      d="M13 7l5 5m0 0l-5 5m5-5H6"
    />
  </svg>
);

const ClockIcon = () => (
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
      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);

const LinkIcon = () => (
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
      d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
    />
  </svg>
);

const ShieldCheckIcon = () => (
  <svg
    className="w-5 h-5"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
    />
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

const LoadingSpinner = () => (
  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
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
      if (!pairingString.trim()) {
        throw new Error("Please enter a pairing string");
      }

      parsePairingString(pairingString.trim());
      const keyPair: KeyPair = await generateKeyPair();
      const callbackUrl = `${window.location.origin}/`;

      const requestedDuration: RequestedDuration = {
        type: "preset",
        preset: DEFAULT_DURATION,
      };

      const result = await connect({
        pairingString: pairingString.trim(),
        app: {
          name: "Proxy System Check",
          description: "Diagnostic tool to test proxy functionality",
          homepage: window.location.origin,
        },
        requestedPermissions: [
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

      savePendingConnection({
        proxyUrl: result.proxyUrl,
        keyPair: result.keyPair,
      });

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
      <main className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </main>
    );
  }

  const isExpiringSoon = timeRemaining !== null && timeRemaining < 300;

  return (
    <main className="min-h-screen py-12 px-4">
      <div className="max-w-xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 mb-2">
            <ShieldCheckIcon />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-50">
            Proxy System Check
          </h1>
          <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto">
            Connect to your Personal Resource Gateway and test API endpoints
            with cryptographically signed requests.
          </p>
        </div>

        {/* Connection Status Card */}
        <div className="card p-6 animate-fade-in">
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-title mb-0">Connection Status</h2>
            {isConnected && (
              <span
                className={`badge ${isExpiringSoon ? "badge-warning" : "badge-success"}`}
              >
                {isExpiringSoon ? "Expiring Soon" : "Active"}
              </span>
            )}
          </div>

          {isConnected ? (
            <div className="space-y-5">
              {/* Status indicator */}
              <div className="flex items-center gap-3">
                <span
                  className={
                    isExpiringSoon ? "status-dot-warning" : "status-dot-success"
                  }
                />
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  Connected
                </span>
              </div>

              {/* Connection details */}
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <LinkIcon />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                      Proxy URL
                    </p>
                    <code className="code-inline text-xs break-all">
                      {proxyUrl}
                    </code>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <ShieldCheckIcon />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                      App ID
                    </p>
                    <code className="code-inline text-xs break-all">
                      {appId}
                    </code>
                  </div>
                </div>

                {timeRemaining !== null && (
                  <div className="flex items-start gap-3">
                    <ClockIcon />
                    <div className="flex-1">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                        Session Expires In
                      </p>
                      <span
                        className={`font-mono text-sm font-medium ${isExpiringSoon ? "text-amber-600 dark:text-amber-400" : "text-gray-900 dark:text-gray-100"}`}
                      >
                        {formatTimeRemaining(timeRemaining)}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleGoToDashboard}
                  className="btn-primary flex-1"
                >
                  Open Dashboard
                  <ArrowRightIcon />
                </button>
                <button onClick={handleDisconnect} className="btn-secondary">
                  <LogoutIcon />
                  <span className="sr-only sm:not-sr-only">Disconnect</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 text-gray-500 dark:text-gray-400">
              <span className="status-dot-neutral" />
              <span>Not connected</span>
            </div>
          )}
        </div>

        {/* Connect Form */}
        {!isConnected && (
          <div className="card p-6 animate-fade-in">
            <h2 className="section-title">Connect to Gateway</h2>

            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Get a pairing string from your proxy&apos;s admin dashboard and
              paste it below.
            </p>

            <div className="space-y-4">
              <div>
                <label htmlFor="pairing-string" className="label">
                  Pairing String
                </label>
                <textarea
                  id="pairing-string"
                  value={pairingString}
                  onChange={(e) => setPairingString(e.target.value)}
                  placeholder="pair::https://your-proxy.vercel.app::abc123..."
                  className="input-mono resize-none"
                  rows={3}
                />
              </div>

              {error && (
                <div className="alert-error animate-fade-in">
                  <p className="text-sm whitespace-pre-wrap">{error}</p>
                </div>
              )}

              <button
                onClick={handleConnect}
                disabled={loading || !pairingString.trim()}
                className="btn-primary w-full"
              >
                {loading ? (
                  <>
                    <LoadingSpinner />
                    Connecting...
                  </>
                ) : (
                  <>
                    Connect & Request Approval
                    <ArrowRightIcon />
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="card p-6">
          <h3 className="section-title">How it works</h3>

          <ol className="space-y-3">
            {[
              "Get a pairing string from your proxy's dashboard",
              'Paste it above and click "Connect"',
              "Approve the connection on your proxy",
              "Return here with a temporary session",
              "Test endpoints in the System Check Dashboard",
            ].map((step, index) => (
              <li key={index} className="flex items-start gap-3 text-sm">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-xs font-medium">
                  {index + 1}
                </span>
                <span className="text-gray-600 dark:text-gray-400 pt-0.5">
                  {step}
                </span>
              </li>
            ))}
          </ol>

          <div className="alert-warning mt-5">
            <p className="text-sm">
              <strong>Note:</strong> Credentials are stored temporarily in your
              browser and expire after 1 hour. No server-side storage is used.
            </p>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-gray-400 dark:text-gray-500">
          Personal Resource Gateway • System Check Tool
        </p>
      </div>
    </main>
  );
}

export default function HomePage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen flex items-center justify-center">
          <LoadingSpinner />
        </main>
      }
    >
      <HomePageContent />
    </Suspense>
  );
}
