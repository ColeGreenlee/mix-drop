import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Edge-compatible UUID generation
function generateRequestId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
}

export function middleware(request: NextRequest) {
  const startTime = Date.now();

  // Generate or use existing request ID
  const requestId = request.headers.get('x-request-id') || generateRequestId();

  // Clone request headers and add request ID
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-request-id', requestId);

  // Create response with request ID
  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  // Add request ID and timing to response headers
  response.headers.set('x-request-id', requestId);
  response.headers.set('x-response-time', `${Date.now() - startTime}ms`);

  return response;
}

// Apply middleware to all routes
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
