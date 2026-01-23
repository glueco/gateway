import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { checkAndSetNonce } from "@/lib/redis";
import {
  PoPHeaders,
  SignaturePayload,
  hashBody,
  validateTimestamp,
  verifySignature,
} from "@/lib/crypto";
import { ErrorCode } from "@glueco/shared";

// ============================================
// PoP AUTHENTICATION
// ============================================

export interface AuthResult {
  success: boolean;
  appId?: string;
  error?: string;
  errorCode?: ErrorCode;
}

/**
 * Extract PoP headers from request.
 */
export function extractPoPHeaders(request: NextRequest): PoPHeaders | null {
  const appId = request.headers.get("x-app-id");
  const timestamp = request.headers.get("x-ts");
  const nonce = request.headers.get("x-nonce");
  const signature = request.headers.get("x-sig");

  if (!appId || !timestamp || !nonce || !signature) {
    return null;
  }

  return { appId, timestamp, nonce, signature };
}

/**
 * Authenticate a request using PoP.
 */
export async function authenticateRequest(
  request: NextRequest,
  body: string | Uint8Array,
): Promise<AuthResult> {
  try {
    // 1. Extract headers
    const headers = extractPoPHeaders(request);
    if (!headers) {
      return {
        success: false,
        error: "Missing required PoP headers (x-app-id, x-ts, x-nonce, x-sig)",
        errorCode: ErrorCode.ERR_MISSING_AUTH,
      };
    }

    // 2. Validate timestamp (±90 seconds)
    if (!validateTimestamp(headers.timestamp)) {
      return {
        success: false,
        error: "Request timestamp outside acceptable window (±90 seconds)",
        errorCode: ErrorCode.ERR_EXPIRED_TIMESTAMP,
      };
    }

    // 3. Check nonce for replay protection
    const nonceValid = await checkAndSetNonce(headers.nonce);
    if (!nonceValid) {
      return {
        success: false,
        error: "Replay detected: nonce already used",
        errorCode: ErrorCode.ERR_INVALID_NONCE,
      };
    }

    // 4. Lookup app and verify status
    const app = await prisma.app.findUnique({
      where: { id: headers.appId },
      include: {
        credentials: {
          where: { status: "ACTIVE" },
        },
      },
    });

    if (!app) {
      return {
        success: false,
        error: "App not found",
        errorCode: ErrorCode.ERR_APP_NOT_FOUND,
      };
    }

    if (app.status !== "ACTIVE") {
      return {
        success: false,
        error: `App is ${app.status.toLowerCase()}`,
        errorCode: ErrorCode.ERR_APP_DISABLED,
      };
    }

    if (app.credentials.length === 0) {
      return {
        success: false,
        error: "No active credentials for app",
        errorCode: ErrorCode.ERR_APP_NOT_FOUND,
      };
    }

    // 5. Construct signature payload
    const url = new URL(request.url);
    const payload: SignaturePayload = {
      method: request.method,
      path: url.pathname,
      appId: headers.appId,
      timestamp: headers.timestamp,
      nonce: headers.nonce,
      bodyHash: hashBody(body),
    };

    // 6. Verify signature against any active credential
    for (const credential of app.credentials) {
      const valid = await verifySignature(
        credential.publicKey,
        headers.signature,
        payload,
      );

      if (valid) {
        return {
          success: true,
          appId: headers.appId,
        };
      }
    }

    return {
      success: false,
      error: "Invalid signature",
      errorCode: ErrorCode.ERR_INVALID_SIGNATURE,
    };
  } catch (error) {
    console.error("Authentication error:", error);
    return {
      success: false,
      error: "Internal authentication error",
      errorCode: ErrorCode.ERR_INTERNAL,
    };
  }
}

/**
 * Get HTTP status code for auth error.
 */
export function getAuthErrorStatus(errorCode: ErrorCode): number {
  switch (errorCode) {
    case ErrorCode.ERR_MISSING_AUTH:
    case ErrorCode.ERR_EXPIRED_TIMESTAMP:
    case ErrorCode.ERR_INVALID_NONCE:
    case ErrorCode.ERR_INVALID_SIGNATURE:
    case ErrorCode.ERR_APP_NOT_FOUND:
      return 401;
    case ErrorCode.ERR_APP_DISABLED:
      return 403;
    case ErrorCode.ERR_INTERNAL:
    default:
      return 500;
  }
}
