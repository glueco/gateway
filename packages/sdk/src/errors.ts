import { GatewayErrorResponseSchema } from "@glueco/shared";

// ============================================
// SDK ERROR TYPES
// Client-side error handling for gateway responses
// ============================================

/**
 * Error thrown when the gateway returns an error response.
 * Contains structured error information from the gateway.
 */
export class GatewayError extends Error {
  public readonly code: string;
  public readonly status: number;
  public readonly requestId?: string;
  public readonly details?: unknown;

  constructor(
    code: string,
    message: string,
    status: number,
    options?: {
      requestId?: string;
      details?: unknown;
    },
  ) {
    super(message);
    this.name = "GatewayError";
    this.code = code;
    this.status = status;
    this.requestId = options?.requestId;
    this.details = options?.details;
  }

  /**
   * Check if this error matches a specific error code.
   */
  is(code: string): boolean {
    return this.code === code;
  }

  /**
   * Convert to a plain object for logging/serialization.
   */
  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      status: this.status,
      ...(this.requestId && { requestId: this.requestId }),
      ...(this.details !== undefined && { details: this.details }),
    };
  }
}

/**
 * Parse a gateway error response and create a GatewayError.
 * Returns null if the response doesn't match the expected schema.
 */
export function parseGatewayError(
  body: unknown,
  status: number,
): GatewayError | null {
  const parsed = GatewayErrorResponseSchema.safeParse(body);

  if (!parsed.success) {
    return null;
  }

  const { error } = parsed.data;

  return new GatewayError(error.code, error.message, status, {
    requestId: error.requestId,
    details: error.details,
  });
}

/**
 * Type guard to check if an error is a GatewayError.
 */
export function isGatewayError(error: unknown): error is GatewayError {
  return error instanceof GatewayError;
}
