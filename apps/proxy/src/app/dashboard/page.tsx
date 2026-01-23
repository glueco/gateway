"use client";

import { useState, useEffect } from "react";

interface App {
  id: string;
  name: string;
  description: string | null;
  homepage: string | null;
  status: string;
  createdAt: string;
  permissions: Array<{
    resourceId: string;
    action: string;
  }>;
  dailyUsage: number;
}

interface Resource {
  id: string;
  resourceId: string;
  name: string;
  resourceType: string;
  status: string;
}

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<"apps" | "resources" | "pairing">(
    "apps",
  );
  const [apps, setApps] = useState<App[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Auth token state (in production, use proper auth)
  const [authToken, setAuthToken] = useState("");
  const [isAuthed, setIsAuthed] = useState(false);

  const authHeaders = {
    Authorization: `Bearer ${authToken}`,
    "Content-Type": "application/json",
  };

  const fetchData = async () => {
    setLoading(true);
    setError(null);

    try {
      const [appsRes, resourcesRes] = await Promise.all([
        fetch("/api/admin/apps", { headers: authHeaders }),
        fetch("/api/admin/resources", { headers: authHeaders }),
      ]);

      if (!appsRes.ok || !resourcesRes.ok) {
        throw new Error("Failed to fetch data");
      }

      const appsData = await appsRes.json();
      const resourcesData = await resourcesRes.json();

      setApps(appsData.apps);
      setResources(resourcesData.resources);
      setIsAuthed(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const handleAuth = async () => {
    await fetchData();
  };

  if (!isAuthed) {
    return (
      <main className="min-h-screen p-8">
        <div className="max-w-md mx-auto">
          <h1 className="text-2xl font-bold mb-6">Dashboard Login</h1>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Admin Secret
              </label>
              <input
                type="password"
                value={authToken}
                onChange={(e) => setAuthToken(e.target.value)}
                placeholder="Enter ADMIN_SECRET"
                className="w-full px-3 py-2 border rounded-md dark:bg-gray-800 dark:border-gray-700"
              />
            </div>
            {error && <p className="text-red-600 text-sm">{error}</p>}
            <button
              onClick={handleAuth}
              className="w-full px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
            >
              Login
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Gateway Dashboard</h1>

        {/* Tabs */}
        <div className="flex border-b mb-6">
          <button
            onClick={() => setActiveTab("apps")}
            className={`px-4 py-2 font-medium border-b-2 transition-colors ${
              activeTab === "apps"
                ? "border-primary-600 text-primary-600"
                : "border-transparent hover:text-primary-600"
            }`}
          >
            Apps ({apps.length})
          </button>
          <button
            onClick={() => setActiveTab("resources")}
            className={`px-4 py-2 font-medium border-b-2 transition-colors ${
              activeTab === "resources"
                ? "border-primary-600 text-primary-600"
                : "border-transparent hover:text-primary-600"
            }`}
          >
            Resources ({resources.length})
          </button>
          <button
            onClick={() => setActiveTab("pairing")}
            className={`px-4 py-2 font-medium border-b-2 transition-colors ${
              activeTab === "pairing"
                ? "border-primary-600 text-primary-600"
                : "border-transparent hover:text-primary-600"
            }`}
          >
            Generate Pairing
          </button>
        </div>

        {/* Apps Tab */}
        {activeTab === "apps" && (
          <AppsTab
            apps={apps}
            authHeaders={authHeaders}
            onRefresh={fetchData}
          />
        )}

        {/* Resources Tab */}
        {activeTab === "resources" && (
          <ResourcesTab
            resources={resources}
            authHeaders={authHeaders}
            onRefresh={fetchData}
          />
        )}

        {/* Pairing Tab */}
        {activeTab === "pairing" && <PairingTab authHeaders={authHeaders} />}
      </div>
    </main>
  );
}

// ============================================
// APPS TAB
// ============================================

function AppsTab({
  apps,
  authHeaders,
  onRefresh,
}: {
  apps: App[];
  authHeaders: Record<string, string>;
  onRefresh: () => void;
}) {
  const handleStatusChange = async (appId: string, status: string) => {
    await fetch("/api/admin/apps", {
      method: "PATCH",
      headers: authHeaders,
      body: JSON.stringify({ appId, status }),
    });
    onRefresh();
  };

  const handleDelete = async (appId: string) => {
    if (!confirm("Are you sure you want to delete this app?")) return;
    await fetch(`/api/admin/apps?appId=${appId}`, {
      method: "DELETE",
      headers: authHeaders,
    });
    onRefresh();
  };

  if (apps.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        No apps connected yet. Generate a pairing string to get started.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {apps.map((app) => (
        <div
          key={app.id}
          className="p-4 border rounded-lg hover:border-primary-200 transition-colors"
        >
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-semibold">{app.name}</h3>
              {app.description && (
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {app.description}
                </p>
              )}
              <p className="text-xs text-gray-500 mt-1">
                ID: {app.id} • Created:{" "}
                {new Date(app.createdAt).toLocaleDateString()}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`px-2 py-1 text-xs rounded-full ${
                  app.status === "ACTIVE"
                    ? "bg-green-100 text-green-800"
                    : app.status === "SUSPENDED"
                      ? "bg-yellow-100 text-yellow-800"
                      : "bg-red-100 text-red-800"
                }`}
              >
                {app.status}
              </span>
              <select
                value={app.status}
                onChange={(e) => handleStatusChange(app.id, e.target.value)}
                className="text-sm border rounded px-2 py-1 dark:bg-gray-800"
              >
                <option value="ACTIVE">Active</option>
                <option value="SUSPENDED">Suspended</option>
                <option value="REVOKED">Revoked</option>
              </select>
              <button
                onClick={() => handleDelete(app.id)}
                className="text-red-600 hover:text-red-800 text-sm"
              >
                Delete
              </button>
            </div>
          </div>

          <div className="mt-3 flex gap-4 text-sm">
            <div>
              <span className="text-gray-500">Permissions:</span>{" "}
              <span className="font-mono text-xs">
                {app.permissions
                  .map((p) => `${p.resourceId}:${p.action}`)
                  .join(", ") || "None"}
              </span>
            </div>
            <div>
              <span className="text-gray-500">Daily Usage:</span>{" "}
              {app.dailyUsage} requests
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================
// RESOURCES TAB
// ============================================

function ResourcesTab({
  resources,
  authHeaders,
  onRefresh,
}: {
  resources: Resource[];
  authHeaders: Record<string, string>;
  onRefresh: () => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    resourceId: "llm:groq",
    name: "Groq LLM",
    resourceType: "llm",
    secret: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    await fetch("/api/admin/resources", {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify(formData),
    });

    setShowForm(false);
    setFormData({
      resourceId: "llm:groq",
      name: "Groq LLM",
      resourceType: "llm",
      secret: "",
    });
    onRefresh();
  };

  return (
    <div>
      <button
        onClick={() => setShowForm(!showForm)}
        className="mb-4 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
      >
        {showForm ? "Cancel" : "Add Resource"}
      </button>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="mb-6 p-4 border rounded-lg space-y-4"
        >
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium mb-1">
                Resource ID
              </label>
              <select
                value={formData.resourceId}
                onChange={(e) => {
                  const id = e.target.value;
                  const [type, provider] = id.split(":");
                  setFormData({
                    ...formData,
                    resourceId: id,
                    name: id === "llm:groq" ? "Groq LLM" : "Google Gemini",
                    resourceType: type,
                  });
                }}
                className="w-full px-3 py-2 border rounded-md dark:bg-gray-800"
              >
                <option value="llm:groq">llm:groq</option>
                <option value="llm:gemini">llm:gemini</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Format: resourceType:provider
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className="w-full px-3 py-2 border rounded-md dark:bg-gray-800"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              API Key (Secret)
            </label>
            <input
              type="password"
              value={formData.secret}
              onChange={(e) =>
                setFormData({ ...formData, secret: e.target.value })
              }
              placeholder="Enter your API key"
              className="w-full px-3 py-2 border rounded-md dark:bg-gray-800"
              required
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
          >
            Save Resource
          </button>
        </form>
      )}

      {resources.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          No resources configured. Add a resource to get started.
        </div>
      ) : (
        <div className="space-y-4">
          {resources.map((resource) => (
            <div
              key={resource.id}
              className="p-4 border rounded-lg flex justify-between items-center"
            >
              <div>
                <h3 className="font-semibold">{resource.name}</h3>
                <p className="text-sm text-gray-500">
                  <span className="font-mono">{resource.resourceId}</span> •
                  Type: {resource.resourceType}
                </p>
              </div>
              <span
                className={`px-2 py-1 text-xs rounded-full ${
                  resource.status === "ACTIVE"
                    ? "bg-green-100 text-green-800"
                    : "bg-red-100 text-red-800"
                }`}
              >
                {resource.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================
// PAIRING TAB
// ============================================

function PairingTab({ authHeaders }: { authHeaders: Record<string, string> }) {
  const [pairingString, setPairingString] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const generatePairing = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/pairing/generate", {
        method: "POST",
        headers: authHeaders,
      });
      const data = await res.json();
      setPairingString(data.pairingString);
      setExpiresAt(data.expiresAt);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (pairingString) {
      navigator.clipboard.writeText(pairingString);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="max-w-xl">
      <p className="text-gray-600 dark:text-gray-400 mb-6">
        Generate a pairing string to share with apps you want to grant access.
        The string is valid for 10 minutes and can only be used once.
      </p>

      <button
        onClick={generatePairing}
        disabled={loading}
        className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50"
      >
        {loading ? "Generating..." : "Generate Pairing String"}
      </button>

      {pairingString && (
        <div className="mt-6 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium">Pairing String</span>
            <button
              onClick={copyToClipboard}
              className="text-sm text-primary-600 hover:text-primary-800"
            >
              {copied ? "✓ Copied!" : "Copy"}
            </button>
          </div>
          <code className="block text-sm break-all bg-white dark:bg-gray-900 p-3 rounded border font-mono">
            {pairingString}
          </code>
          {expiresAt && (
            <p className="text-xs text-gray-500 mt-2">
              Expires: {new Date(expiresAt).toLocaleString()}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
