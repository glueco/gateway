import { NextRequest, NextResponse } from "next/server";
import { processGatewayRequest, logRequest } from "@/server/gateway/pipeline";
import { ChatCompletionRequestSchema, hasPlugin } from "@/server/resources";
import {
  ErrorCode,
  resourceRequiredError,
  parseResourceId,
} from "@glueco/shared";

// ============================================
// POST /v1/chat/completions (LEGACY - Requires x-gateway-resource header)
// OpenAI-compatible chat completions endpoint
//
// DEPRECATED: Use /r/llm/<provider>/v1/chat/completions instead
// This endpoint is kept for backwards compatibility but requires explicit
// resource selection via the x-gateway-resource header.
// ============================================

// CORS headers for all responses
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
};

export async function POST(request: NextRequest) {
  // Check for x-gateway-resource header - NO DEFAULTS
  const resourceHeader = request.headers.get("x-gateway-resource");

  if (!resourceHeader) {
    const error = resourceRequiredError(
      "This legacy endpoint requires the x-gateway-resource header. " +
        "Prefer using /r/llm/<provider>/v1/chat/completions instead.",
    );
    return NextResponse.json(error.toJSON(), {
      status: error.status,
      headers: CORS_HEADERS,
    });
  }

  // Validate resource ID format
  let resourceId: string;
  try {
    const parsed = parseResourceId(resourceHeader);
    if (parsed.resourceType !== "llm") {
      return NextResponse.json(
        {
          error: {
            code: ErrorCode.ERR_INVALID_REQUEST,
            message: `This endpoint only supports LLM resources, got '${parsed.resourceType}'`,
          },
        },
        { status: 400, headers: CORS_HEADERS },
      );
    }
    resourceId = resourceHeader;
  } catch (e) {
    return NextResponse.json(
      {
        error: {
          code: ErrorCode.ERR_INVALID_REQUEST,
          message:
            e instanceof Error
              ? e.message
              : "Invalid x-gateway-resource header format",
        },
      },
      { status: 400, headers: CORS_HEADERS },
    );
  }

  // Check if plugin exists
  if (!hasPlugin(resourceId)) {
    return NextResponse.json(
      {
        error: {
          code: ErrorCode.ERR_UNKNOWN_RESOURCE,
          message: `Resource '${resourceId}' is not supported`,
        },
      },
      { status: 404, headers: CORS_HEADERS },
    );
  }

  // Read body
  let body: string;
  try {
    body = await request.text();
  } catch {
    return NextResponse.json(
      {
        error: {
          message: "Failed to read request body",
          type: "invalid_request_error",
        },
      },
      { status: 400, headers: CORS_HEADERS },
    );
  }

  // Parse JSON
  let input: unknown;
  try {
    input = JSON.parse(body);
  } catch {
    return NextResponse.json(
      {
        error: {
          message: "Invalid JSON in request body",
          type: "invalid_request_error",
        },
      },
      { status: 400, headers: CORS_HEADERS },
    );
  }

  // Validate request shape
  const parsed = ChatCompletionRequestSchema.safeParse(input);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: {
          message: `Invalid request: ${parsed.error.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join(", ")}`,
          type: "invalid_request_error",
        },
      },
      { status: 400, headers: CORS_HEADERS },
    );
  }

  // Process through gateway pipeline
  const result = await processGatewayRequest(request, body, {
    resourceId,
    action: "chat.completions",
    input: parsed.data,
    stream: parsed.data.stream ?? false,
  });

  // Log request asynchronously
  logRequest(
    result,
    resourceId,
    "chat.completions",
    "/v1/chat/completions",
    "POST",
  ).catch(console.error);

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
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers":
        "Content-Type, Authorization, x-app-id, x-pop-v, x-ts, x-nonce, x-sig, x-gateway-resource",
      "Access-Control-Max-Age": "86400",
    },
  });
}
