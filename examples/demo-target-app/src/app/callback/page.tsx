import { redirect } from "next/navigation";

interface PageProps {
  searchParams: Promise<{
    status?: string;
    app_id?: string;
    expires_at?: string;
  }>;
}

/**
 * Callback page after proxy approval.
 * Since we're using client-side session storage, we just redirect
 * back to the home page with the query params - the home page
 * will handle completing the connection.
 */
export default async function CallbackPage({ searchParams }: PageProps) {
  const resolvedParams = await searchParams;

  // Build redirect URL with params
  const params = new URLSearchParams();
  if (resolvedParams.status) params.set("status", resolvedParams.status);
  if (resolvedParams.app_id) params.set("app_id", resolvedParams.app_id);
  if (resolvedParams.expires_at)
    params.set("expires_at", resolvedParams.expires_at);

  const redirectUrl = params.toString() ? `/?${params.toString()}` : "/";
  redirect(redirectUrl);
}
