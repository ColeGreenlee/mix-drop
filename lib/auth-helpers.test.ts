import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock next-auth - MUST be hoisted
vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

// Mock next/navigation - MUST be hoisted
vi.mock("next/navigation", () => ({
  redirect: vi.fn((path: string) => {
    throw new Error(`REDIRECT: ${path}`);
  }),
}));

// Mock auth options - MUST be hoisted
vi.mock("@/lib/auth", () => ({
  authOptions: {},
}));

import { requireAuth, getSession, isAdmin, requireAdmin } from "./auth-helpers";
import { createMockUserSession, createMockAdminSession } from "@/tests/utils/mock-session";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

const mockGetServerSession = getServerSession as any;
const mockRedirect = redirect as any;

describe("auth-helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getSession", () => {
    it("should return session when user is authenticated", async () => {
      const mockSession = createMockUserSession();
      mockGetServerSession.mockResolvedValueOnce(mockSession);

      const session = await getSession();

      expect(session).toEqual(mockSession);
      expect(mockGetServerSession).toHaveBeenCalledWith({});
    });

    it("should return null when user is not authenticated", async () => {
      mockGetServerSession.mockResolvedValueOnce(null);

      const session = await getSession();

      expect(session).toBeNull();
    });
  });

  describe("requireAuth", () => {
    it("should return session when user is authenticated", async () => {
      const mockSession = createMockUserSession();
      mockGetServerSession.mockResolvedValueOnce(mockSession);

      const session = await requireAuth();

      expect(session).toEqual(mockSession);
    });

    it("should redirect to sign-in when user is not authenticated", async () => {
      mockGetServerSession.mockResolvedValueOnce(null);

      await expect(requireAuth()).rejects.toThrow("REDIRECT: /auth/signin");
      expect(mockRedirect).toHaveBeenCalledWith("/auth/signin");
    });

    it("should redirect when session exists but user is missing", async () => {
      mockGetServerSession.mockResolvedValueOnce({ user: null });

      await expect(requireAuth()).rejects.toThrow("REDIRECT: /auth/signin");
    });
  });

  describe("isAdmin", () => {
    it("should return true when user is admin", async () => {
      const adminSession = createMockAdminSession();
      mockGetServerSession.mockResolvedValueOnce(adminSession);

      const result = await isAdmin();

      expect(result).toBe(true);
    });

    it("should return false when user is not admin", async () => {
      const userSession = createMockUserSession();
      mockGetServerSession.mockResolvedValueOnce(userSession);

      const result = await isAdmin();

      expect(result).toBe(false);
    });

    it("should return false when user is not authenticated", async () => {
      mockGetServerSession.mockResolvedValueOnce(null);

      const result = await isAdmin();

      expect(result).toBe(false);
    });

    it("should return false when session exists but user is missing", async () => {
      mockGetServerSession.mockResolvedValueOnce({ user: null });

      const result = await isAdmin();

      expect(result).toBe(false);
    });

    it("should return false when role is missing", async () => {
      const session = createMockUserSession();
      delete (session.user as any).role;
      mockGetServerSession.mockResolvedValueOnce(session);

      const result = await isAdmin();

      expect(result).toBe(false);
    });
  });

  describe("requireAdmin", () => {
    it("should return session when user is admin", async () => {
      const adminSession = createMockAdminSession();
      mockGetServerSession.mockResolvedValueOnce(adminSession);

      const session = await requireAdmin();

      expect(session).toEqual(adminSession);
    });

    it("should redirect to home when user is not admin", async () => {
      const userSession = createMockUserSession();
      mockGetServerSession.mockResolvedValueOnce(userSession);

      await expect(requireAdmin()).rejects.toThrow("REDIRECT: /");
      expect(mockRedirect).toHaveBeenCalledWith("/");
    });

    it("should redirect to sign-in when user is not authenticated", async () => {
      mockGetServerSession.mockResolvedValueOnce(null);

      await expect(requireAdmin()).rejects.toThrow("REDIRECT: /auth/signin");
      expect(mockRedirect).toHaveBeenCalledWith("/auth/signin");
    });

    it("should redirect to home when role is user", async () => {
      const userSession = createMockUserSession({ role: "user" });
      mockGetServerSession.mockResolvedValueOnce(userSession);

      await expect(requireAdmin()).rejects.toThrow("REDIRECT: /");
    });
  });

  describe("authentication flow", () => {
    it("should handle full authentication flow", async () => {
      // First check - not authenticated
      mockGetServerSession.mockResolvedValueOnce(null);
      expect(await isAdmin()).toBe(false);

      // After sign in - regular user
      const userSession = createMockUserSession();
      mockGetServerSession.mockResolvedValueOnce(userSession);
      expect(await getSession()).toEqual(userSession);
      expect(await isAdmin()).toBe(false);

      // Admin user
      const adminSession = createMockAdminSession();
      mockGetServerSession.mockResolvedValueOnce(adminSession);
      expect(await isAdmin()).toBe(true);

      mockGetServerSession.mockResolvedValueOnce(adminSession);
      expect(await requireAdmin()).toEqual(adminSession);
    });
  });
});
