import { redirect } from "next/navigation";
import { getInstallSession, getResourceAvailability } from "@/server/pairing";
import AdvancedApprovalForm from "./AdvancedApprovalForm";

interface PageProps {
  searchParams: { session?: string };
}

interface RequestedPermission {
  resourceId: string;
  actions: string[];
}

export default async function ApprovePage({ searchParams }: PageProps) {
  const sessionToken = searchParams.session;

  if (!sessionToken) {
    return (
      <main className="min-h-screen flex items-center justify-center p-8">
        <div className="text-center card p-8 max-w-md animate-scale-in">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
            <svg
              className="w-8 h-8 text-red-600 dark:text-red-400"
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
          </div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
            Invalid Request
          </h1>
          <p className="text-slate-500 dark:text-slate-400">
            No session token provided.
          </p>
        </div>
      </main>
    );
  }

  const session = await getInstallSession(sessionToken);

  if (!session) {
    return (
      <main className="min-h-screen flex items-center justify-center p-8">
        <div className="text-center card p-8 max-w-md animate-scale-in">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
            <svg
              className="w-8 h-8 text-amber-600 dark:text-amber-400"
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
          </div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
            Session Expired
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mb-4">
            This approval session has expired or has already been processed.
          </p>
          <p className="text-sm text-slate-400 dark:text-slate-500">
            Please request a new pairing string from the app.
          </p>
        </div>
      </main>
    );
  }

  const requestedPermissions =
    session.requestedPermissions as unknown as RequestedPermission[];

  // Check which resources are actually configured on this proxy
  const resourceIds = requestedPermissions.map((p) => p.resourceId);
  const resourceAvailability = await getResourceAvailability(resourceIds);

  return (
    <main className="min-h-screen flex items-center justify-center p-4 sm:p-8 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 pattern-dots opacity-30 pointer-events-none" />

      {/* Gradient Orbs */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-primary-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-2xl w-full relative z-10 animate-fade-in-up">
        <div className="card glass overflow-hidden">
          {/* App Info Header */}
          <div className="p-6 bg-gradient-to-br from-primary-500/10 via-primary-500/5 to-transparent border-b border-slate-200 dark:border-slate-700">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-primary-500/25 flex-shrink-0">
                {session.app.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="font-semibold text-lg text-slate-900 dark:text-white">
                  {session.app.name}
                </h2>
                {session.app.description && (
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                    {session.app.description}
                  </p>
                )}
                {session.app.homepage && (
                  <a
                    href={session.app.homepage}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 mt-2"
                  >
                    <span className="truncate max-w-[200px]">
                      {session.app.homepage}
                    </span>
                    <svg
                      className="w-3.5 h-3.5 flex-shrink-0"
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
                )}
              </div>
            </div>
          </div>

          {/* Approval Form */}
          <div className="p-6">
            <AdvancedApprovalForm
              sessionToken={sessionToken}
              requestedPermissions={requestedPermissions}
              appName={session.app.name}
              resourceAvailability={resourceAvailability}
            />
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700">
            <p className="text-xs text-slate-500 dark:text-slate-400 text-center flex items-center justify-center gap-2">
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
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              Session expires: {new Date(session.expiresAt).toLocaleString()}
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
