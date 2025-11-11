import { NextRequest, NextResponse } from "next/server";
import { expect } from "vitest";

/**
 * Common test helpers and custom assertions
 */

/**
 * Create a mock Next.js request
 */
export const createMockRequest = (
  url: string,
  options?: {
    method?: string;
    headers?: Record<string, string>;
    body?: any;
  }
): NextRequest => {
  const request = new NextRequest(url, {
    method: options?.method || "GET",
    headers: options?.headers,
    body: options?.body ? JSON.stringify(options.body) : undefined,
  });

  return request;
};

/**
 * Parse JSON response from NextResponse
 */
export const parseJsonResponse = async (
  response: NextResponse
): Promise<any> => {
  const text = await response.text();
  return JSON.parse(text);
};

/**
 * Assert response has expected status code
 */
export const expectStatus = (response: NextResponse, status: number) => {
  expect(response.status).toBe(status);
};

/**
 * Assert response is successful (2xx)
 */
export const expectSuccess = (response: NextResponse) => {
  expect(response.status).toBeGreaterThanOrEqual(200);
  expect(response.status).toBeLessThan(300);
};

/**
 * Assert response is error (4xx or 5xx)
 */
export const expectError = (response: NextResponse) => {
  expect(response.status).toBeGreaterThanOrEqual(400);
};

/**
 * Assert response has expected JSON structure
 */
export const expectJsonResponse = async (
  response: NextResponse,
  expectedData: any
) => {
  const data = await parseJsonResponse(response);
  expect(data).toMatchObject(expectedData);
};

/**
 * Assert error response has expected message
 */
export const expectErrorMessage = async (
  response: NextResponse,
  message: string
) => {
  const data = await parseJsonResponse(response);
  expect(data.error).toBe(message);
};

/**
 * Wait for a condition to be true
 */
export const waitFor = async (
  condition: () => boolean | Promise<boolean>,
  options: { timeout?: number; interval?: number } = {}
): Promise<void> => {
  const timeout = options.timeout || 5000;
  const interval = options.interval || 100;
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    if (await condition()) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, interval));
  }

  throw new Error(`Timeout waiting for condition after ${timeout}ms`);
};

/**
 * Sleep for a specified duration
 */
export const sleep = (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

/**
 * Generate a random string
 */
export const randomString = (length = 10): string => {
  return Math.random()
    .toString(36)
    .substring(2, 2 + length);
};

/**
 * Generate a random email
 */
export const randomEmail = (): string => {
  return `test-${randomString()}@example.com`;
};

/**
 * Create FormData from object
 */
export const createFormData = (data: Record<string, any>): FormData => {
  const formData = new FormData();
  Object.entries(data).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      formData.append(key, value);
    }
  });
  return formData;
};

/**
 * Mock console methods to suppress logs during tests
 * Note: Import vi, beforeEach, afterEach from vitest in your test file before using this
 */
export const mockConsole = (beforeEach: any, afterEach: any, vi: any) => {
  const originalConsole = { ...console };

  beforeEach(() => {
    global.console = {
      ...console,
      log: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      info: vi.fn(),
      debug: vi.fn(),
    } as any;
  });

  afterEach(() => {
    global.console = originalConsole;
  });
};
