"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface GatewayState {
  isConnected: boolean;
  appId?: string;
  proxyUrl?: string;
}

export default function HomePage() {
  const [state, setState] = useState<GatewayState>({ isConnected: false });
  const [pairingString, setPairingString] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check connection status on load
  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    try {
      const res = await fetch("/api/gateway/status");
      const data = await res.json();
      setState(data);
    } catch (err) {
      console.error("Failed to check status:", err);
    }
  };

  const handleConnect = async () => {
    if (!pairingString.trim()) {
      setError("Please enter a pairing string");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/gateway/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pairingString }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Connection failed");
      }

      // Redirect to approval URL
      window.location.href = data.approvalUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      await fetch("/api/gateway/disconnect", { method: "POST" });
      setState({ isConnected: false });
    } catch (err) {
      console.error("Failed to disconnect:", err);
    }
  };

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Demo Target App</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-8">
          Example app demonstrating Personal Resource Gateway SDK integration
          with{" "}
          <span className="font-semibold">explicit resource selection</span>.
        </p>

        {/* Connection Status */}
        <div className="mb-8 p-4 rounded-lg border">
          <h2 className="font-semibold mb-2">Connection Status</h2>
          {state.isConnected ? (
            <div className="space-y-2">
              <p className="text-green-600 dark:text-green-400 flex items-center gap-2">
                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                Connected
              </p>
              <p className="text-sm text-gray-500">
                App ID:{" "}
                <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">
                  {state.appId}
                </code>
              </p>
              <p className="text-sm text-gray-500">
                Gateway:{" "}
                <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">
                  {state.proxyUrl}
                </code>
              </p>
              <div className="flex gap-2 mt-4">
                <Link
                  href="/chat"
                  className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
                >
                  Open Chat Demo
                </Link>
                <button
                  onClick={handleDisconnect}
                  className="px-4 py-2 border rounded-md hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  Disconnect
                </button>
              </div>
            </div>
          ) : (
            <p className="text-gray-500 flex items-center gap-2">
              <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
              Not connected
            </p>
          )}
        </div>

        {/* Connect Form */}
        {!state.isConnected && (
          <div className="p-6 border rounded-lg">
            <h2 className="font-semibold mb-4">Connect to Gateway</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Get a pairing string from your gateway's dashboard, then paste it
              below.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Pairing String
                </label>
                <textarea
                  value={pairingString}
                  onChange={(e) => setPairingString(e.target.value)}
                  placeholder="pair::https://your-gateway.vercel.app::abc123..."
                  className="w-full px-3 py-2 border rounded-md dark:bg-gray-800 dark:border-gray-700 font-mono text-sm"
                  rows={3}
                />
              </div>

              {error && <p className="text-red-600 text-sm">{error}</p>}

              <button
                onClick={handleConnect}
                disabled={loading}
                className="w-full px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50"
              >
                {loading ? "Connecting..." : "Connect to Gateway"}
              </button>
            </div>

            <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <h3 className="font-medium mb-2">Permissions Requested</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                This demo app will request:
              </p>
              <ul className="text-sm space-y-1">
                <li className="flex items-center gap-2">
                  <span className="text-primary-600">•</span>
                  <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">
                    llm:groq
                  </code>
                  <span className="text-gray-500">- chat.completions</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-primary-600">•</span>
                  <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">
                    llm:gemini
                  </code>
                  <span className="text-gray-500">- chat.completions</span>
                </li>
              </ul>
              <p className="text-xs text-gray-500 mt-2">
                Resource format: <code>resourceType:provider</code>
              </p>
            </div>
          </div>
        )}

        {/* How It Works */}
        <div className="mt-8 p-6 border rounded-lg">
          <h2 className="font-semibold mb-4">How It Works</h2>
          <ol className="space-y-3 text-sm">
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary-100 dark:bg-primary-900 text-primary-600 flex items-center justify-center text-xs font-bold">
                1
              </span>
              <div>
                <strong>Gateway generates pairing string</strong>
                <p className="text-gray-600 dark:text-gray-400">
                  Admin creates a one-time code in the gateway dashboard
                </p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary-100 dark:bg-primary-900 text-primary-600 flex items-center justify-center text-xs font-bold">
                2
              </span>
              <div>
                <strong>App requests permissions</strong>
                <p className="text-gray-600 dark:text-gray-400">
                  Specifies explicit resources like{" "}
                  <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">
                    llm:groq
                  </code>
                </p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary-100 dark:bg-primary-900 text-primary-600 flex items-center justify-center text-xs font-bold">
                3
              </span>
              <div>
                <strong>User approves access</strong>
                <p className="text-gray-600 dark:text-gray-400">
                  Reviews and approves the permission request
                </p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary-100 dark:bg-primary-900 text-primary-600 flex items-center justify-center text-xs font-bold">
                4
              </span>
              <div>
                <strong>App uses resources</strong>
                <p className="text-gray-600 dark:text-gray-400">
                  Calls{" "}
                  <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">
                    /r/llm/groq/v1/chat/completions
                  </code>{" "}
                  with PoP auth
                </p>
              </div>
            </li>
          </ol>
        </div>
      </div>
    </main>
  );
}
