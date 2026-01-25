import { NextRequest, NextResponse } from "next/server";
import { processGatewayRequest, logRequest } from "@/server/gateway/pipeline";
import { getPluginByTypeAndProvider } from "@/server/plugins";
import { ChatCompletionRequestSchema } from "@glueco/shared";
import { ErrorCode, getErrorStatus, createResourceId } from "@glueco/shared";

// ============================================
// Resource Router: /r/[resourceType]/[provider]/[...path]
// Handles all resource-scoped requests with explicit routing
// ============================================

// CORS headers for all responses
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
};

interface RouteParams {
  params: Promise<{
    resourceType: string;
    provider: string;
    path?: string[];
  }>;
}

/**
 * Extract action from path segments.
 * Examples:
 *   /r/llm/groq/chat.completions -> action: chat.completions
 *   /r/llm/groq/v1/chat/completions -> action: chat.completions (OpenAI compat)
 *   /r/mail/resend/send -> action: send
 */
function extractAction(resourceType: string, pathSegments?: string[]): string {
  if (!pathSegments || pathSegments.length === 0) {
    throw new Error("Action not specified in path");
  }

  // Handle OpenAI-compatible path: v1/chat/completions
  if (pathSegments[0] === "v1") {
    // Remove 'v1' prefix and join remaining segments
    const remaining = pathSegments.slice(1);
    if (remaining.length === 0) {
      throw new Error("Action not specified after v1/");
    }
    // Convert path segments to action: chat/completions -> chat.completions
    return remaining.join(".");
  }

  // Direct action: chat.completions or send
  return pathSegments.join(".");
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { resourceType, provider, path } = await params;

  // Construct resource ID
  const resourceId = createResourceId(resourceType, provider);

  // Check if plugin exists
  const plugin = getPluginByTypeAndProvider(resourceType, provider);
  if (!plugin) {
    return NextResponse.json(
      {
        error: {
          code: ErrorCode.ERR_UNKNOWN_RESOURCE,
          message: `Resource '${resourceId}' is not supported. Available ${resourceType} providers: check /api/admin/resources`,
        },
      },
      {
        status: getErrorStatus(ErrorCode.ERR_UNKNOWN_RESOURCE),
        headers: CORS_HEADERS,
      },
    );
  }

  // Extract action from path
  let action: string;
  try {
    action = extractAction(resourceType, path);
  } catch {
    return NextResponse.json(
      {
        error: {
          code: ErrorCode.ERR_INVALID_REQUEST,
          message: "Action not specified in path",
        },
      },
      { status: 400, headers: CORS_HEADERS },
    );
  }

  // Check if action is supported
  if (!plugin.actions.includes(action)) {
    return NextResponse.json(
      {
        error: {
          code: ErrorCode.ERR_UNSUPPORTED_ACTION,
          message: `Action '${action}' not supported by ${resourceId}. Supported actions: ${plugin.actions.join(", ")}`,
        },
      },
      { status: 404, headers: CORS_HEADERS },
    );
  }

  // ============================================
  // Buffer-based body handling (read once, use everywhere)
  // Raw bytes are preserved for forwarding; JSON is parsed once for extraction/validation
  // ============================================
  let rawBody: Uint8Array;
  try {
    rawBody = new Uint8Array(await request.arrayBuffer());
  } catch {
    return NextResponse.json(
      {
        error: {
          code: ErrorCode.ERR_INVALID_REQUEST,
          message: "Failed to read request body",
        },
      },
      { status: 400, headers: CORS_HEADERS },
    );
  }

  // Convert to string for auth signature (PoP) and JSON parsing
  const body = new TextDecoder().decode(rawBody);

  // Parse JSON if content-type indicates JSON
  // Non-JSON bodies (multipart, etc.) will have input = undefined and extraction returns {}
  const contentType = request.headers.get("content-type") || "";
  const isJsonRequest = contentType.includes("application/json");

  let input: unknown;
  if (isJsonRequest && body) {
    try {
      input = JSON.parse(body);
    } catch {
      return NextResponse.json(
        {
          error: {
            code: ErrorCode.ERR_INVALID_JSON,
            message: "Invalid JSON in request body",
          },
        },
        { status: 400, headers: CORS_HEADERS },
      );
    }
  } else {
    // Non-JSON request - extraction will gracefully return {}
    input = undefined;
  }

  // For LLM chat completions, validate and extract stream flag
  let stream = false;
  if (resourceType === "llm" && action === "chat.completions" && input) {
    const parsed = ChatCompletionRequestSchema.safeParse(input);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: ErrorCode.ERR_INVALID_REQUEST,
            message: `Invalid request: ${parsed.error.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join(", ")}`,
          },
        },
        { status: 400, headers: CORS_HEADERS },
      );
    }
    stream = parsed.data.stream ?? false;
  }

  // Build endpoint path for logging
  const endpointPath = `/r/${resourceType}/${provider}/${path?.join("/") || ""}`;

  // Process through gateway pipeline
  // Pass rawBody for potential forwarding (avoids re-reading consumed stream)
  const result = await processGatewayRequest(request, body, {
    resourceId,
    action,
    input,
    stream,
    rawBody,
  });

  // Log request asynchronously
  logRequest(result, resourceId, action, endpointPath, "POST").catch(
    console.error,
  );

  // Handle error
  if (!result.success) {
    return NextResponse.json(
      {
        error: {
          message: result.error!.message,
          type: result.error!.code,
          code: result.error!.code,
        },
      },
      { status: result.error!.status, headers: CORS_HEADERS },
    );
  }

  // Handle streaming response
  if (result.result!.stream) {
    return new Response(result.result!.stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        ...CORS_HEADERS,
      },
    });
  }

  // Handle JSON response
  return NextResponse.json(result.result!.response, {
    headers: {
      "Content-Type": "application/json",
      ...CORS_HEADERS,
    },
  });
}

// Handle OPTIONS for CORS
export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers":
        "Content-Type, Authorization, x-app-id, x-pop-v, x-ts, x-nonce, x-sig, x-gateway-resource",
      "Access-Control-Max-Age": "86400",
    },
  });
}
