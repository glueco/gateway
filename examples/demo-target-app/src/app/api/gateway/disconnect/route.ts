import { NextResponse } from "next/server";
import { GatewayClient, FileKeyStorage, FileConfigStorage } from "@glueco/sdk";
import path from "path";

const STORAGE_DIR = path.join(process.cwd(), ".gateway");

function getClient() {
  return new GatewayClient({
    keyStorage: new FileKeyStorage(path.join(STORAGE_DIR, "keys.json")),
    configStorage: new FileConfigStorage(path.join(STORAGE_DIR, "config.json")),
  });
}

export async function POST() {
  const client = getClient();

  try {
    await client.disconnect();
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
