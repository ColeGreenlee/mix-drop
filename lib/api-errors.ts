import { NextResponse } from "next/server";
import { ERROR_MESSAGES } from "./constants";
import { logError, getRequestId } from "./logger";

/**
 * Centralized API error handling
 * Logs errors and returns sanitized responses to clients
 */

export function handleApiError(
  error: unknown,
  context: string,
  statusCode: number = 500
): NextResponse {
  // Log error with context and request ID
  logError(error, {
    context,
    statusCode,
    requestId: getRequestId?.()
  });

  // Return generic error to client (never expose internals)
  return NextResponse.json(
    { error: ERROR_MESSAGES.SERVER_ERROR },
    { status: statusCode }
  );
}

export function unauthorized(message?: string): NextResponse {
  return NextResponse.json(
    { error: message || ERROR_MESSAGES.UNAUTHORIZED },
    { status: 401 }
  );
}

export function forbidden(message?: string): NextResponse {
  return NextResponse.json(
    { error: message || ERROR_MESSAGES.FORBIDDEN },
    { status: 403 }
  );
}

export function notFound(message?: string): NextResponse {
  return NextResponse.json(
    { error: message || ERROR_MESSAGES.NOT_FOUND },
    { status: 404 }
  );
}

export function badRequest(message: string): NextResponse {
  return NextResponse.json({ error: message }, { status: 400 });
}

export function rateLimitExceeded(retryAfter: number): NextResponse {
  return NextResponse.json(
    {
      error: ERROR_MESSAGES.RATE_LIMIT_EXCEEDED,
      retryAfter,
    },
    {
      status: 429,
      headers: {
        "Retry-After": String(retryAfter),
      },
    }
  );
}
