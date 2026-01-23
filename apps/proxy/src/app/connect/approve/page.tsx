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
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">
            Invalid Request
          </h1>
          <p className="text-gray-600">No session token provided.</p>
        </div>
      </main>
    );
  }

  const session = await getInstallSession(sessionToken);

  if (!session) {
    return (
      <main className="min-h-screen flex items-center justify-center p-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">
            Session Expired
          </h1>
          <p className="text-gray-600">
            This approval session has expired or already been processed.
          </p>
          <p className="text-sm text-gray-500 mt-4">
            Please request a new pairing string from the app.
          </p>
        </div>
      </main>
    );
  }

  const requestedPermissions =
    session.requestedPermissions as RequestedPermission[];

  // Check which resources are actually configured on this proxy
  const resourceIds = requestedPermissions.map((p) => p.resourceId);
  const resourceAvailability = await getResourceAvailability(resourceIds);

  return (
    <main className="min-h-screen flex items-center justify-center p-8">
      <div className="max-w-2xl w-full">
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg p-8">
          {/* App Info Header */}
          <div className="mb-6 p-4 bg-gradient-to-r from-primary-50 to-primary-100 dark:from-primary-900/20 dark:to-primary-800/20 rounded-lg border border-primary-200 dark:border-primary-800">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-primary-600 rounded-lg flex items-center justify-center text-white font-bold text-lg">
                {session.app.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1">
                <h2 className="font-semibold text-lg">{session.app.name}</h2>
                {session.app.description && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {session.app.description}
                  </p>
                )}
                {session.app.homepage && (
                  <a
                    href={session.app.homepage}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary-600 hover:underline mt-1 inline-block"
                  >
                    {session.app.homepage}
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Approval Form */}
          <AdvancedApprovalForm
            sessionToken={sessionToken}
            requestedPermissions={requestedPermissions}
            appName={session.app.name}
            resourceAvailability={resourceAvailability}
          />

          <p className="text-xs text-gray-500 mt-4 text-center">
            Session expires: {new Date(session.expiresAt).toLocaleString()}
          </p>
        </div>
      </div>
    </main>
  );
}
