import { redirect } from "next/navigation";
import { GatewayClient, FileKeyStorage, FileConfigStorage } from "@glueco/sdk";
import path from "path";

const STORAGE_DIR = path.join(process.cwd(), ".gateway");

function getClient() {
  return new GatewayClient({
    keyStorage: new FileKeyStorage(path.join(STORAGE_DIR, "keys.json")),
    configStorage: new FileConfigStorage(path.join(STORAGE_DIR, "config.json")),
  });
}

interface PageProps {
  searchParams: Promise<{ status?: string; app_id?: string }>;
}

export default async function CallbackPage({ searchParams }: PageProps) {
  const resolvedParams = await searchParams;
  const client = getClient();

  // Convert searchParams to URLSearchParams
  const params = new URLSearchParams();
  if (resolvedParams.status) params.set("status", resolvedParams.status);
  if (resolvedParams.app_id) params.set("app_id", resolvedParams.app_id);

  // Handle the callback - this loads stored config and updates appId
  const result = await client.handleCallback(params);

  if (result.approved && result.appId) {
    console.log("[Callback] Successfully connected with appId:", result.appId);
    redirect("/?connected=true");
  } else {
    console.log("[Callback] Connection denied or no appId");
    redirect("/?connected=false&error=denied");
  }
}
