import { Session } from "next-auth";
import { vi } from "vitest";
import type { User } from "@prisma/client";
import { createMockUser, createMockAdmin } from "./test-factories";

/**
 * Mock NextAuth session utilities
 */

export interface MockSessionUser {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  role: "user" | "admin";
}

export const createMockSession = (user?: Partial<MockSessionUser>): Session => {
  const mockUser = user || createMockUser();

  return {
    user: {
      id: mockUser.id,
      name: mockUser.name || null,
      email: mockUser.email || null,
      image: mockUser.image || null,
      role: (mockUser.role as "user" | "admin") || "user",
    },
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
  };
};

export const createMockAdminSession = (
  user?: Partial<MockSessionUser>
): Session => {
  const admin = user || createMockAdmin();
  return createMockSession({ ...admin, role: "admin" });
};

export const createMockUserSession = (
  user?: Partial<MockSessionUser>
): Session => {
  const regularUser = user || createMockUser();
  return createMockSession({ ...regularUser, role: "user" });
};

/**
 * Mock auth helper functions from lib/auth-helpers.ts
 */
export const mockGetSession = (session: Session | null) => {
  return vi.fn(async () => session);
};

export const mockRequireAuth = (session: Session) => {
  return vi.fn(async () => session);
};

export const mockRequireAdmin = (session: Session) => {
  return vi.fn(async () => session);
};

export const mockIsAdmin = (isAdmin: boolean) => {
  return vi.fn(async () => isAdmin);
};

/**
 * Mock auth module
 * Usage: vi.mock('@/lib/auth-helpers', () => mockAuthHelpers(session))
 */
export const mockAuthHelpers = (session: Session | null = null) => ({
  getSession: mockGetSession(session),
  requireAuth: mockRequireAuth(session || createMockUserSession()),
  requireAdmin: mockRequireAdmin(session || createMockAdminSession()),
  isAdmin: mockIsAdmin(session?.user?.role === "admin"),
});

/**
 * Mock NextAuth getServerSession
 * Usage: vi.mock('next-auth', () => mockNextAuth(session))
 */
export const mockNextAuth = (session: Session | null = null) => ({
  default: vi.fn(),
  getServerSession: vi.fn(async () => session),
});
