import { NextRequest, NextResponse } from "next/server";
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

// App configuration
const APP_NAME = "Demo Target App";
const APP_DESCRIPTION =
  "Demo app showing PRG SDK integration with explicit resource selection";

// Permissions to request - explicit resourceType:provider format
const REQUESTED_PERMISSIONS = [
  { resourceId: "llm:groq", actions: ["chat.completions"] },
  { resourceId: "llm:gemini", actions: ["chat.completions"] },
];

export async function POST(request: NextRequest) {
  let body: { pairingString?: string };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.pairingString) {
    return NextResponse.json(
      { error: "pairingString is required" },
      { status: 400 },
    );
  }

  const client = getClient();

  // Get the callback URL for this app
  const origin = request.headers.get("origin") || "http://localhost:3001";
  const redirectUri = `${origin}/callback`;

  try {
    const result = await client.connect({
      pairingString: body.pairingString,
      app: {
        name: APP_NAME,
        description: APP_DESCRIPTION,
      },
      requestedPermissions: REQUESTED_PERMISSIONS,
      redirectUri,
    });

    return NextResponse.json({
      approvalUrl: result.approvalUrl,
      sessionToken: result.sessionToken,
      expiresAt: result.expiresAt.toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Connect error:", error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
