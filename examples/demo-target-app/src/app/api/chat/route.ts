import { NextRequest, NextResponse } from "next/server";
import { GatewayClient, FileKeyStorage, FileConfigStorage } from "@glueco/sdk";
import OpenAI from "openai";
import path from "path";

const STORAGE_DIR = path.join(process.cwd(), ".gateway");

function getClient() {
  return new GatewayClient({
    keyStorage: new FileKeyStorage(path.join(STORAGE_DIR, "keys.json")),
    configStorage: new FileConfigStorage(path.join(STORAGE_DIR, "config.json")),
  });
}

// Model configuration per provider
const PROVIDER_MODELS: Record<string, string> = {
  groq: "llama-3.1-8b-instant",
  gemini: "gemini-1.5-flash",
};

export async function POST(request: NextRequest) {
  const client = getClient();

  // Check if connected
  if (!(await client.isConnected())) {
    return NextResponse.json(
      { error: "Not connected to gateway. Please connect first." },
      { status: 401 },
    );
  }

  let body: {
    messages?: Array<{ role: string; content: string }>;
    provider?: string;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.messages || body.messages.length === 0) {
    return NextResponse.json(
      { error: "messages array is required" },
      { status: 400 },
    );
  }

  const provider = body.provider || "groq";
  const model = PROVIDER_MODELS[provider] || PROVIDER_MODELS.groq;

  try {
    // Get the gateway fetch function
    const gatewayFetch = await client.getFetch();

    // Get the resource-scoped base URL
    // This uses the new /r/<resourceType>/<provider> routing
    const baseURL = await client.getResourceBaseUrl("llm", provider);

    // Create OpenAI client with explicit resource in baseURL
    const openai = new OpenAI({
      apiKey: "unused", // Not used - gateway provides the key
      baseURL, // e.g., https://gateway.example.com/r/llm/groq
      fetch: gatewayFetch,
    });

    // Make the chat completion request
    const completion = await openai.chat.completions.create({
      model,
      messages: body.messages.map((m) => ({
        role: m.role as "user" | "assistant" | "system",
        content: m.content,
      })),
    });

    const content = completion.choices[0]?.message?.content || "";

    return NextResponse.json({
      content,
      model: completion.model,
      provider,
      usage: completion.usage,
    });
  } catch (error) {
    console.error("Chat error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";

    // Check for specific gateway errors
    if (message.includes("RESOURCE_REQUIRED")) {
      return NextResponse.json(
        {
          error:
            "Resource selection required. The gateway requires explicit resource routing.",
        },
        { status: 400 },
      );
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
