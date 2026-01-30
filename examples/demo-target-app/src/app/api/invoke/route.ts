// ============================================
// POST /api/invoke
// Execute integration request via gateway
// ============================================

import { NextRequest, NextResponse } from "next/server";
import { verifyConnectionHandle } from "@/lib/handle.server";
import { createServerTransport } from "@/lib/gateway.server";

// Import typed plugin clients
import { groq } from "@glueco/plugin-llm-groq/client";
import { gemini } from "@glueco/plugin-llm-gemini/client";
import { openai } from "@glueco/plugin-llm-openai/client";
import { resend } from "@glueco/plugin-mail-resend/client";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { handle, resourceId, action, payload } = body;

    if (!handle) {
      return NextResponse.json(
        { error: "handle is required" },
        { status: 400 }
      );
    }

    if (!resourceId || !action) {
      return NextResponse.json(
        { error: "resourceId and action are required" },
        { status: 400 }
      );
    }

    // Verify connection handle
    const handlePayload = verifyConnectionHandle(handle);
    if (!handlePayload) {
      return NextResponse.json(
        { error: "Invalid or expired connection handle" },
        { status: 401 }
      );
    }

    const { gatewayUrl, appId } = handlePayload;

    // Create server-side transport
    const transport = createServerTransport(gatewayUrl, appId);

    // Parse resourceId (format: type:provider, e.g., "llm:groq")
    const [resourceType, provider] = resourceId.split(":");

    let result: { data: unknown; status: number; headers: Record<string, string> };

    // Use typed clients for known providers
    if (resourceType === "llm" && provider === "groq") {
      const client = groq(transport);
      if (action === "chat.completions") {
        result = await client.chatCompletions(payload);
      } else {
        result = await transport.request(resourceId, action, payload);
      }
    } else if (resourceType === "llm" && provider === "gemini") {
      const client = gemini(transport);
      if (action === "chat.completions") {
        result = await client.chatCompletions(payload);
      } else {
        result = await transport.request(resourceId, action, payload);
      }
    } else if (resourceType === "llm" && provider === "openai") {
      const client = openai(transport);
      if (action === "chat.completions") {
        result = await client.chatCompletions(payload);
      } else {
        result = await transport.request(resourceId, action, payload);
      }
    } else if (resourceType === "mail" && provider === "resend") {
      const client = resend(transport);
      if (action === "emails.send") {
        result = await client.emails.send(payload);
      } else {
        result = await transport.request(resourceId, action, payload);
      }
    } else {
      // Fallback to raw transport for unknown providers
      result = await transport.request(resourceId, action, payload);
    }

    return NextResponse.json({
      data: result.data,
      status: result.status,
      headers: result.headers,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Invoke error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
