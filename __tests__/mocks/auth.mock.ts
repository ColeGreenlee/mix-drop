import { vi } from "vitest";
import { Session } from "next-auth";

/**
 * Mock session data for testing
 */
export interface MockSession extends Session {
  user: {
    id: string;
    email: string;
    name: string;
    role: "admin" | "user";
    image?: string | null;
  };
}

/**
 * Create a mock user session
 */
export function createMockSession(overrides?: Partial<MockSession>): MockSession {
  return {
    user: {
      id: "test-user-id",
      email: "test@example.com",
      name: "Test User",
      role: "user",
      image: null,
    },
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    ...overrides,
  };
}

/**
 * Create a mock admin session
 */
export function createMockAdminSession(overrides?: Partial<MockSession>): MockSession {
  return createMockSession({
    user: {
      id: "admin-user-id",
      email: "admin@example.com",
      name: "Admin User",
      role: "admin",
      image: null,
    },
    ...overrides,
  });
}

/**
 * Mock getServerSession function
 */
export const mockGetServerSession = vi.fn<any, any>();

/**
 * Mock NextAuth module
 */
export function mockNextAuthModule(sessionData: MockSession | null = null) {
  vi.mock("next-auth", () => ({
    default: vi.fn(),
  }));

  vi.mock("next-auth/next", () => ({
    getServerSession: mockGetServerSession.mockResolvedValue(sessionData),
  }));
}

/**
 * Mock auth helpers
 */
export function mockAuthHelpers(sessionData: MockSession | null = null) {
  vi.mock("@/lib/auth-helpers", () => ({
    getSession: vi.fn().mockResolvedValue(sessionData),
    requireAuth: vi.fn().mockResolvedValue(sessionData),
    requireAdmin: vi.fn().mockResolvedValue(
      sessionData?.user.role === "admin" ? sessionData : null
    ),
  }));
}
