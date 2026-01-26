"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface App {
  id: string;
  name: string;
  description: string | null;
  homepage: string | null;
  status: string;
  createdAt: string;
  permissions: Array<{
    id: string;
    resourceId: string;
    action: string;
    constraints: Record<string, unknown> | null;
    validFrom: string | null;
    expiresAt: string | null;
    timeWindow: Record<string, unknown> | null;
    rateLimitRequests: number | null;
    rateLimitWindowSecs: number | null;
    burstLimit: number | null;
    burstWindowSecs: number | null;
    dailyQuota: number | null;
    monthlyQuota: number | null;
    dailyTokenBudget: number | null;
    monthlyTokenBudget: number | null;
    status: string;
    createdAt: string;
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
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<
    "apps" | "resources" | "pairing" | "usage"
  >("apps");
  const [apps, setApps] = useState<App[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAuthed, setIsAuthed] = useState(false);

  // Cookie-based auth - no need for token in headers
  const authHeaders = {
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

      if (appsRes.status === 401 || resourcesRes.status === 401) {
        // Not authenticated, redirect to login
        router.push("/");
        return;
      }

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

  // Check auth on mount
  useEffect(() => {
    fetchData();
  }, []);

  const handleLogout = async () => {
    await fetch("/api/admin/login", { method: "DELETE" });
    router.push("/");
  };

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-gray-500">Loading dashboard...</div>
      </main>
    );
  }

  if (!isAuthed) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 mb-4">
            Session expired or not authenticated
          </p>
          <button
            onClick={() => router.push("/")}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Go to Login
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Gateway Dashboard</h1>
          <button
            onClick={handleLogout}
            className="px-4 py-2 text-sm text-gray-600 hover:text-red-600 border rounded-md hover:border-red-300 transition-colors"
          >
            Logout
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg">
            {error}
          </div>
        )}

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
          <button
            onClick={() => setActiveTab("usage")}
            className={`px-4 py-2 font-medium border-b-2 transition-colors ${
              activeTab === "usage"
                ? "border-primary-600 text-primary-600"
                : "border-transparent hover:text-primary-600"
            }`}
          >
            Usage Reports
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

        {/* Usage Tab */}
        {activeTab === "usage" && <UsageTab authHeaders={authHeaders} />}
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
  const [selectedApp, setSelectedApp] = useState<App | null>(null);

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
    setSelectedApp(null);
    onRefresh();
  };

  if (apps.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        No apps connected yet. Generate a pairing string to get started.
      </div>
    );
  }

  // Show details panel if an app is selected
  if (selectedApp) {
    return (
      <AppDetailsPanel
        app={selectedApp}
        authHeaders={authHeaders}
        onBack={() => setSelectedApp(null)}
        onRefresh={() => {
          onRefresh();
          // Update selected app with refreshed data
          const updated = apps.find((a) => a.id === selectedApp.id);
          if (updated) setSelectedApp(updated);
        }}
        onStatusChange={handleStatusChange}
        onDelete={handleDelete}
      />
    );
  }

  return (
    <div className="space-y-4">
      {apps.map((app) => (
        <div
          key={app.id}
          onClick={() => setSelectedApp(app)}
          className="p-4 border rounded-lg hover:border-primary-300 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer"
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
              <span className="text-xs text-gray-400">Click to view →</span>
            </div>
          </div>

          <div className="mt-3 flex gap-4 text-sm">
            <div>
              <span className="text-gray-500">Permissions:</span>{" "}
              <span className="font-mono text-xs">
                {app.permissions.length} resource(s)
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
// APP DETAILS PANEL
// ============================================

function AppDetailsPanel({
  app,
  authHeaders,
  onBack,
  onRefresh,
  onStatusChange,
  onDelete,
}: {
  app: App;
  authHeaders: Record<string, string>;
  onBack: () => void;
  onRefresh: () => void;
  onStatusChange: (appId: string, status: string) => Promise<void>;
  onDelete: (appId: string) => Promise<void>;
}) {
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [appName, setAppName] = useState(app.name);
  const [appDescription, setAppDescription] = useState(app.description || "");
  const [editedPermissions, setEditedPermissions] = useState(app.permissions);

  // Reset form when app changes
  useEffect(() => {
    setAppName(app.name);
    setAppDescription(app.description || "");
    setEditedPermissions(app.permissions);
  }, [app]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const changedPermissions = editedPermissions.filter((ep, idx) => {
        const original = app.permissions[idx];
        return (
          ep.expiresAt !== original.expiresAt ||
          ep.rateLimitRequests !== original.rateLimitRequests ||
          ep.rateLimitWindowSecs !== original.rateLimitWindowSecs ||
          ep.dailyQuota !== original.dailyQuota ||
          ep.monthlyQuota !== original.monthlyQuota ||
          ep.dailyTokenBudget !== original.dailyTokenBudget ||
          ep.monthlyTokenBudget !== original.monthlyTokenBudget
        );
      });

      await fetch("/api/admin/apps", {
        method: "PUT",
        headers: authHeaders,
        body: JSON.stringify({
          appId: app.id,
          name: appName !== app.name ? appName : undefined,
          description:
            appDescription !== (app.description || "")
              ? appDescription
              : undefined,
          permissions:
            changedPermissions.length > 0
              ? changedPermissions.map((p) => ({
                  id: p.id,
                  expiresAt: p.expiresAt,
                  rateLimitRequests: p.rateLimitRequests,
                  rateLimitWindowSecs: p.rateLimitWindowSecs,
                  dailyQuota: p.dailyQuota,
                  monthlyQuota: p.monthlyQuota,
                  dailyTokenBudget: p.dailyTokenBudget,
                  monthlyTokenBudget: p.monthlyTokenBudget,
                }))
              : undefined,
        }),
      });

      setEditMode(false);
      onRefresh();
    } catch (err) {
      console.error("Failed to save:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleRevokePermission = async (permissionId: string) => {
    if (!confirm("Revoke this permission? This cannot be undone.")) return;

    await fetch("/api/admin/apps", {
      method: "PUT",
      headers: authHeaders,
      body: JSON.stringify({
        appId: app.id,
        permissions: [{ id: permissionId, status: "REVOKED" }],
      }),
    });
    onRefresh();
  };

  const updatePermission = (idx: number, field: string, value: unknown) => {
    setEditedPermissions((prev) => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], [field]: value };
      return updated;
    });
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "Never";
    return new Date(dateStr).toLocaleString();
  };

  const formatExpiry = (dateStr: string | null) => {
    if (!dateStr) return "Never expires";
    const date = new Date(dateStr);
    const now = new Date();
    if (date < now) return "Expired";
    const diff = date.getTime() - now.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days > 0) return `${days} day(s) remaining`;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    return `${hours} hour(s) remaining`;
  };

  return (
    <div className="space-y-6">
      {/* Header with Back Button */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
        >
          <span>←</span>
          <span>Back to Apps</span>
        </button>
        <div className="flex items-center gap-2">
          {!editMode ? (
            <button
              onClick={() => setEditMode(true)}
              className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Edit
            </button>
          ) : (
            <>
              <button
                onClick={() => {
                  setEditMode(false);
                  setAppName(app.name);
                  setAppDescription(app.description || "");
                  setEditedPermissions(app.permissions);
                }}
                className="px-3 py-1.5 text-sm border rounded-md hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-3 py-1.5 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </>
          )}
        </div>
      </div>

      {/* App Info Card */}
      <div className="p-6 border rounded-lg bg-white dark:bg-gray-900">
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1">
            {editMode ? (
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    App Name
                  </label>
                  <input
                    type="text"
                    value={appName}
                    onChange={(e) => setAppName(e.target.value)}
                    className="w-full px-3 py-2 border rounded-md dark:bg-gray-800"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Description
                  </label>
                  <textarea
                    value={appDescription}
                    onChange={(e) => setAppDescription(e.target.value)}
                    className="w-full px-3 py-2 border rounded-md dark:bg-gray-800"
                    rows={2}
                  />
                </div>
              </div>
            ) : (
              <>
                <h2 className="text-xl font-bold">{app.name}</h2>
                {app.description && (
                  <p className="text-gray-600 dark:text-gray-400 mt-1">
                    {app.description}
                  </p>
                )}
              </>
            )}
          </div>
          <div className="flex items-center gap-3 ml-4">
            <span
              className={`px-3 py-1 text-sm rounded-full ${
                app.status === "ACTIVE"
                  ? "bg-green-100 text-green-800"
                  : app.status === "SUSPENDED"
                    ? "bg-yellow-100 text-yellow-800"
                    : "bg-red-100 text-red-800"
              }`}
            >
              {app.status}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm border-t pt-4">
          <div>
            <span className="text-gray-500 block">App ID</span>
            <code className="text-xs">{app.id}</code>
          </div>
          <div>
            <span className="text-gray-500 block">Created</span>
            <span>{new Date(app.createdAt).toLocaleDateString()}</span>
          </div>
          <div>
            <span className="text-gray-500 block">Daily Usage</span>
            <span>{app.dailyUsage} requests</span>
          </div>
          {app.homepage && (
            <div>
              <span className="text-gray-500 block">Homepage</span>
              <a
                href={app.homepage}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline text-xs truncate block"
              >
                {app.homepage}
              </a>
            </div>
          )}
        </div>

        {/* Status Controls */}
        <div className="mt-4 pt-4 border-t flex items-center gap-3">
          <span className="text-sm text-gray-500">Change Status:</span>
          <select
            value={app.status}
            onChange={(e) => onStatusChange(app.id, e.target.value)}
            className="text-sm border rounded px-2 py-1 dark:bg-gray-800"
          >
            <option value="ACTIVE">Active</option>
            <option value="SUSPENDED">Suspended</option>
            <option value="REVOKED">Revoked</option>
          </select>
          <button
            onClick={() => onDelete(app.id)}
            className="ml-auto text-sm text-red-600 hover:text-red-800"
          >
            Delete App
          </button>
        </div>
      </div>

      {/* Permissions Section */}
      <div className="p-6 border rounded-lg bg-white dark:bg-gray-900">
        <h3 className="font-semibold mb-4">
          Permissions ({app.permissions.length})
        </h3>

        {app.permissions.length === 0 ? (
          <p className="text-gray-500 text-sm">No active permissions.</p>
        ) : (
          <div className="space-y-4">
            {editedPermissions.map((perm, idx) => (
              <div
                key={perm.id}
                className="p-4 border rounded-lg bg-gray-50 dark:bg-gray-800"
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h4 className="font-medium">
                      <span className="font-mono text-blue-600 dark:text-blue-400">
                        {perm.resourceId}
                      </span>
                      <span className="mx-2 text-gray-400">→</span>
                      <span className="font-mono">{perm.action}</span>
                    </h4>
                    <p className="text-xs text-gray-500 mt-1">
                      Created: {formatDate(perm.createdAt)} •{" "}
                      {formatExpiry(perm.expiresAt)}
                    </p>
                  </div>
                  {!editMode && (
                    <button
                      onClick={() => handleRevokePermission(perm.id)}
                      className="text-xs text-red-600 hover:text-red-800"
                    >
                      Revoke
                    </button>
                  )}
                </div>

                {editMode ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
                    <div>
                      <label className="block text-xs font-medium mb-1">
                        Expires At
                      </label>
                      <input
                        type="datetime-local"
                        value={
                          perm.expiresAt
                            ? new Date(perm.expiresAt)
                                .toISOString()
                                .slice(0, 16)
                            : ""
                        }
                        onChange={(e) =>
                          updatePermission(
                            idx,
                            "expiresAt",
                            e.target.value
                              ? new Date(e.target.value).toISOString()
                              : null,
                          )
                        }
                        className="w-full px-2 py-1 text-sm border rounded dark:bg-gray-700"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1">
                        Rate Limit (req/window)
                      </label>
                      <div className="flex gap-1">
                        <input
                          type="number"
                          placeholder="Requests"
                          value={perm.rateLimitRequests || ""}
                          onChange={(e) =>
                            updatePermission(
                              idx,
                              "rateLimitRequests",
                              e.target.value ? parseInt(e.target.value) : null,
                            )
                          }
                          className="w-1/2 px-2 py-1 text-sm border rounded dark:bg-gray-700"
                        />
                        <input
                          type="number"
                          placeholder="Seconds"
                          value={perm.rateLimitWindowSecs || ""}
                          onChange={(e) =>
                            updatePermission(
                              idx,
                              "rateLimitWindowSecs",
                              e.target.value ? parseInt(e.target.value) : null,
                            )
                          }
                          className="w-1/2 px-2 py-1 text-sm border rounded dark:bg-gray-700"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1">
                        Daily Quota
                      </label>
                      <input
                        type="number"
                        placeholder="Unlimited"
                        value={perm.dailyQuota || ""}
                        onChange={(e) =>
                          updatePermission(
                            idx,
                            "dailyQuota",
                            e.target.value ? parseInt(e.target.value) : null,
                          )
                        }
                        className="w-full px-2 py-1 text-sm border rounded dark:bg-gray-700"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1">
                        Monthly Quota
                      </label>
                      <input
                        type="number"
                        placeholder="Unlimited"
                        value={perm.monthlyQuota || ""}
                        onChange={(e) =>
                          updatePermission(
                            idx,
                            "monthlyQuota",
                            e.target.value ? parseInt(e.target.value) : null,
                          )
                        }
                        className="w-full px-2 py-1 text-sm border rounded dark:bg-gray-700"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1">
                        Daily Token Budget
                      </label>
                      <input
                        type="number"
                        placeholder="Unlimited"
                        value={perm.dailyTokenBudget || ""}
                        onChange={(e) =>
                          updatePermission(
                            idx,
                            "dailyTokenBudget",
                            e.target.value ? parseInt(e.target.value) : null,
                          )
                        }
                        className="w-full px-2 py-1 text-sm border rounded dark:bg-gray-700"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1">
                        Monthly Token Budget
                      </label>
                      <input
                        type="number"
                        placeholder="Unlimited"
                        value={perm.monthlyTokenBudget || ""}
                        onChange={(e) =>
                          updatePermission(
                            idx,
                            "monthlyTokenBudget",
                            e.target.value ? parseInt(e.target.value) : null,
                          )
                        }
                        className="w-full px-2 py-1 text-sm border rounded dark:bg-gray-700"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    <div>
                      <span className="text-gray-500 text-xs block">
                        Rate Limit
                      </span>
                      <span>
                        {perm.rateLimitRequests
                          ? `${perm.rateLimitRequests} / ${perm.rateLimitWindowSecs}s`
                          : "Unlimited"}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500 text-xs block">
                        Daily Quota
                      </span>
                      <span>{perm.dailyQuota || "Unlimited"}</span>
                    </div>
                    <div>
                      <span className="text-gray-500 text-xs block">
                        Monthly Quota
                      </span>
                      <span>{perm.monthlyQuota || "Unlimited"}</span>
                    </div>
                    <div>
                      <span className="text-gray-500 text-xs block">
                        Token Budget
                      </span>
                      <span>
                        {perm.dailyTokenBudget || perm.monthlyTokenBudget
                          ? `${perm.dailyTokenBudget || "∞"}/day, ${perm.monthlyTokenBudget || "∞"}/mo`
                          : "Unlimited"}
                      </span>
                    </div>
                    {perm.constraints &&
                      Object.keys(perm.constraints).length > 0 && (
                        <div className="col-span-full">
                          <span className="text-gray-500 text-xs block mb-1">
                            Constraints
                          </span>
                          <pre className="text-xs bg-gray-100 dark:bg-gray-700 p-2 rounded overflow-x-auto">
                            {JSON.stringify(perm.constraints, null, 2)}
                          </pre>
                        </div>
                      )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
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
  const [deleting, setDeleting] = useState<string | null>(null);
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

  const handleDelete = async (resourceId: string) => {
    if (
      !confirm(
        `Are you sure you want to delete resource '${resourceId}'? This action cannot be undone.`,
      )
    ) {
      return;
    }

    setDeleting(resourceId);
    try {
      const res = await fetch(
        `/api/admin/resources?resourceId=${encodeURIComponent(resourceId)}`,
        {
          method: "DELETE",
          headers: authHeaders,
        },
      );

      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Failed to delete resource");
        return;
      }

      onRefresh();
    } catch (err) {
      alert("Failed to delete resource");
    } finally {
      setDeleting(null);
    }
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
              <div className="flex items-center gap-3">
                <span
                  className={`px-2 py-1 text-xs rounded-full ${
                    resource.status === "ACTIVE"
                      ? "bg-green-100 text-green-800"
                      : "bg-red-100 text-red-800"
                  }`}
                >
                  {resource.status}
                </span>
                <button
                  onClick={() => handleDelete(resource.resourceId)}
                  disabled={deleting === resource.resourceId}
                  className="text-red-600 hover:text-red-800 text-sm disabled:opacity-50"
                >
                  {deleting === resource.resourceId ? "Deleting..." : "Delete"}
                </button>
              </div>
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

// ============================================
// USAGE TAB
// ============================================

interface ModelUsageReport {
  model: string;
  requestCount: number;
  totalTokens: number;
  inputTokens: number;
  outputTokens: number;
}

interface DailyUsageReport {
  date: string;
  totalRequests: number;
  models: ModelUsageReport[];
}

interface AppUsageReport {
  appId: string;
  appName: string;
  resourceId: string;
  dailyUsage: DailyUsageReport[];
  summary: {
    totalRequests: number;
    totalTokens: number;
    totalInputTokens: number;
    totalOutputTokens: number;
    modelBreakdown: ModelUsageReport[];
  };
}

function UsageTab({ authHeaders }: { authHeaders: Record<string, string> }) {
  const [loading, setLoading] = useState(false);
  const [reports, setReports] = useState<AppUsageReport[]>([]);
  const [days, setDays] = useState(7);
  const [selectedApp, setSelectedApp] = useState<string>("");
  const [expandedApp, setExpandedApp] = useState<string | null>(null);

  const fetchUsage = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ days: days.toString() });
      if (selectedApp) params.set("appId", selectedApp);

      const res = await fetch(`/api/admin/usage?${params}`, {
        headers: authHeaders,
      });
      const data = await res.json();
      setReports(data.reports || []);
    } catch (err) {
      console.error("Failed to fetch usage:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsage();
  }, [days, selectedApp]);

  const formatNumber = (n: number) => n.toLocaleString();

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex gap-4 items-center">
        <div>
          <label className="block text-sm font-medium mb-1">Time Range</label>
          <select
            value={days}
            onChange={(e) => setDays(parseInt(e.target.value))}
            className="px-3 py-2 border rounded-md dark:bg-gray-800"
          >
            <option value="1">Last 24 hours</option>
            <option value="7">Last 7 days</option>
            <option value="14">Last 14 days</option>
            <option value="30">Last 30 days</option>
          </select>
        </div>
        <button
          onClick={fetchUsage}
          disabled={loading}
          className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 self-end"
        >
          {loading ? "Loading..." : "Refresh"}
        </button>
      </div>

      {/* Summary Cards */}
      {reports.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">
              {formatNumber(
                reports.reduce((sum, r) => sum + r.summary.totalRequests, 0),
              )}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Total Requests
            </div>
          </div>
          <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <div className="text-2xl font-bold text-green-600">
              {formatNumber(
                reports.reduce((sum, r) => sum + r.summary.totalTokens, 0),
              )}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Total Tokens
            </div>
          </div>
          <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
            <div className="text-2xl font-bold text-purple-600">
              {reports.length}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Active Apps
            </div>
          </div>
          <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
            <div className="text-2xl font-bold text-orange-600">
              {
                new Set(
                  reports.flatMap((r) =>
                    r.summary.modelBreakdown.map((m) => m.model),
                  ),
                ).size
              }
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Models Used
            </div>
          </div>
        </div>
      )}

      {/* Per-App Reports */}
      {reports.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          {loading
            ? "Loading usage data..."
            : "No usage data for the selected period."}
        </div>
      ) : (
        <div className="space-y-4">
          <h3 className="font-semibold">Usage by App</h3>
          {reports.map((report) => (
            <div
              key={report.appId}
              className="border rounded-lg overflow-hidden"
            >
              {/* App Header */}
              <div
                onClick={() =>
                  setExpandedApp(
                    expandedApp === report.appId ? null : report.appId,
                  )
                }
                className="p-4 bg-gray-50 dark:bg-gray-800 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 flex justify-between items-center"
              >
                <div>
                  <h4 className="font-semibold">{report.appName}</h4>
                  <p className="text-xs text-gray-500">
                    {report.resourceId} • {report.summary.totalRequests}{" "}
                    requests
                  </p>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <div className="text-right">
                    <div className="font-medium">
                      {formatNumber(report.summary.totalTokens)}
                    </div>
                    <div className="text-xs text-gray-500">tokens</div>
                  </div>
                  <span className="text-gray-400">
                    {expandedApp === report.appId ? "▼" : "▶"}
                  </span>
                </div>
              </div>

              {/* Expanded Details */}
              {expandedApp === report.appId && (
                <div className="p-4 border-t space-y-4">
                  {/* Model Breakdown */}
                  <div>
                    <h5 className="text-sm font-medium mb-2">
                      Model Breakdown
                    </h5>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-100 dark:bg-gray-800">
                          <tr>
                            <th className="px-3 py-2 text-left">Model</th>
                            <th className="px-3 py-2 text-right">Requests</th>
                            <th className="px-3 py-2 text-right">
                              Input Tokens
                            </th>
                            <th className="px-3 py-2 text-right">
                              Output Tokens
                            </th>
                            <th className="px-3 py-2 text-right">
                              Total Tokens
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {report.summary.modelBreakdown.map((model) => (
                            <tr key={model.model} className="border-t">
                              <td className="px-3 py-2 font-mono text-xs">
                                {model.model}
                              </td>
                              <td className="px-3 py-2 text-right">
                                {formatNumber(model.requestCount)}
                              </td>
                              <td className="px-3 py-2 text-right">
                                {formatNumber(model.inputTokens)}
                              </td>
                              <td className="px-3 py-2 text-right">
                                {formatNumber(model.outputTokens)}
                              </td>
                              <td className="px-3 py-2 text-right font-medium">
                                {formatNumber(model.totalTokens)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Daily Usage */}
                  <div>
                    <h5 className="text-sm font-medium mb-2">Daily Usage</h5>
                    <div className="space-y-2">
                      {report.dailyUsage.slice(0, 7).map((day) => (
                        <div
                          key={day.date}
                          className="flex justify-between items-center text-sm p-2 bg-gray-50 dark:bg-gray-800 rounded"
                        >
                          <span className="font-mono">{day.date}</span>
                          <div className="flex gap-4">
                            <span>{day.totalRequests} requests</span>
                            <span className="text-gray-500">
                              {day.models.length} model(s)
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
