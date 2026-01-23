import { NextResponse } from "next/server";
import { GatewayClient, FileKeyStorage, FileConfigStorage } from "@glueco/sdk";
import path from "path";

// Store credentials in .gateway directory
const STORAGE_DIR = path.join(process.cwd(), ".gateway");

function getClient() {
  return new GatewayClient({
    keyStorage: new FileKeyStorage(path.join(STORAGE_DIR, "keys.json")),
    configStorage: new FileConfigStorage(path.join(STORAGE_DIR, "config.json")),
  });
}

export async function GET() {
  const client = getClient();

  // Check if fully connected (has keys, config, and valid appId)
  const isConnected = await client.isConnected();
  if (isConnected) {
    return NextResponse.json({
      status: "connected",
      isConnected: true,
      appId: await client.getAppId(),
      proxyUrl: await client.getProxyUrl(),
    });
  }

  // Check if pending approval (has keys and config, but no appId yet)
  const isPending = await client.isPendingApproval();
  if (isPending) {
    return NextResponse.json({
      status: "pending",
      isConnected: false,
      message: "Connection pending - waiting for user approval",
    });
  }

  // Not connected at all
  return NextResponse.json({
    status: "disconnected",
    isConnected: false,
    message: "Not connected - call /api/gateway/connect to start",
  });
}
