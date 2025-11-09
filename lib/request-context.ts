import { NextRequest, NextResponse } from 'next/server';
import { AsyncLocalStorage } from 'async_hooks';
import { randomUUID } from 'crypto';

// Request context for storing request-scoped data
export interface RequestContext {
  requestId: string;
  userId?: string;
  startTime: number;
}

// AsyncLocalStorage for request context (works in Node.js runtime)
export const requestContext = new AsyncLocalStorage<RequestContext>();

// Get current request context
export function getRequestContext(): RequestContext | undefined {
  return requestContext.getStore();
}

// Get request ID from current context
export function getRequestId(): string | undefined {
  return requestContext.getStore()?.requestId;
}

// Get user ID from current context
export function getUserId(): string | undefined {
  return requestContext.getStore()?.userId;
}

// Middleware to add request ID and timing
export function withRequestContext<T extends unknown[]>(
  handler: (req: Request | NextRequest, ...args: T) => Promise<Response | NextResponse>
) {
  return async (req: Request | NextRequest, ...args: T) => {
    const requestId =
      (req.headers.get('x-request-id') as string) || randomUUID();
    const startTime = Date.now();

    const context: RequestContext = {
      requestId,
      startTime,
    };

    // Run handler within context
    return requestContext.run(context, async () => {
      const response = await handler(req, ...args);

      // Add request ID to response headers
      if (response instanceof NextResponse || response instanceof Response) {
        response.headers.set('x-request-id', requestId);
        response.headers.set(
          'x-response-time',
          `${Date.now() - startTime}ms`
        );
      }

      return response;
    });
  };
}

// Update user ID in current context
export function setUserId(userId: string) {
  const context = requestContext.getStore();
  if (context) {
    context.userId = userId;
  }
}
