import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock auth - MUST be hoisted
vi.mock("@/lib/auth-helpers", () => ({
  getSession: vi.fn(),
}));

import { NextRequest } from "next/server";
import { GET as getUsers } from "@/app/api/admin/users/route";
import { GET as getStats } from "@/app/api/admin/stats/route";
import { clearTestDatabase } from "../setup";
import { createMockUser, createMockAdmin, createMockMix } from "@/tests/utils/test-factories";
import { createMockAdminSession, createMockUserSession } from "@/tests/utils/mock-session";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth-helpers";

const mockGetSession = getSession as any;

describe("Admin API Integration Tests", () => {
  let adminUser: any;
  let adminSession: any;
  let regularUser: any;
  let regularSession: any;

  beforeEach(async () => {
    await clearTestDatabase();

    // Create admin user
    adminUser = createMockAdmin();
    await prisma.user.create({ data: adminUser });
    adminSession = createMockAdminSession({ id: adminUser.id });

    // Create regular user
    regularUser = createMockUser({ email: "user@test.com" });
    await prisma.user.create({ data: regularUser });
    regularSession = createMockUserSession({ id: regularUser.id });
  });

  describe("GET /api/admin/users", () => {
    it("should return all users for admin", async () => {
      mockGetSession.mockResolvedValue(adminSession);

      const request = new NextRequest("http://localhost:3000/api/admin/users");
      const response = await getUsers(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.users).toHaveLength(2); // admin + regular user
    });

    it("should deny access for non-admin users", async () => {
      mockGetSession.mockResolvedValue(regularSession);

      const request = new NextRequest("http://localhost:3000/api/admin/users");
      const response = await getUsers(request);

      expect(response.status).toBe(403);
    });

    it("should require authentication", async () => {
      mockGetSession.mockResolvedValue(null);

      const request = new NextRequest("http://localhost:3000/api/admin/users");
      const response = await getUsers(request);

      expect(response.status).toBe(401);
    });

    it("should include user statistics", async () => {
      mockGetSession.mockResolvedValue(adminSession);

      // Create mixes for regular user
      const mix1 = createMockMix({ uploaderId: regularUser.id });
      const mix2 = createMockMix({ uploaderId: regularUser.id });
      await prisma.mix.createMany({ data: [mix1, mix2] });

      const request = new NextRequest("http://localhost:3000/api/admin/users");
      const response = await getUsers(request);

      expect(response.status).toBe(200);
      const data = await response.json();

      const userWithMixes = data.users.find((u: any) => u.id === regularUser.id);
      expect(userWithMixes._count?.mixes).toBe(2);
    });

    it("should support pagination", async () => {
      mockGetSession.mockResolvedValue(adminSession);

      // Create more users
      const users = Array.from({ length: 25 }, (_, i) =>
        createMockUser({ email: `user${i}@test.com` })
      );
      await prisma.user.createMany({ data: users });

      const request = new NextRequest("http://localhost:3000/api/admin/users?page=1&limit=10");
      const response = await getUsers(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.users.length).toBeLessThanOrEqual(10);
      expect(data.pagination).toBeDefined();
    });

    it("should filter by status", async () => {
      mockGetSession.mockResolvedValue(adminSession);

      // Create suspended user
      const suspendedUser = createMockUser({
        email: "suspended@test.com",
        status: "suspended",
      });
      await prisma.user.create({ data: suspendedUser });

      const request = new NextRequest("http://localhost:3000/api/admin/users?status=suspended");
      const response = await getUsers(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.users.every((u: any) => u.status === "suspended")).toBe(true);
    });

    it("should filter by role", async () => {
      mockGetSession.mockResolvedValue(adminSession);

      const request = new NextRequest("http://localhost:3000/api/admin/users?role=admin");
      const response = await getUsers(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.users.every((u: any) => u.role === "admin")).toBe(true);
      expect(data.users).toHaveLength(1); // Only the admin user
    });
  });

  describe("GET /api/admin/stats", () => {
    it("should return platform statistics", async () => {
      mockGetSession.mockResolvedValue(adminSession);

      // Create test data
      const mix1 = createMockMix({ uploaderId: regularUser.id, isPublic: true });
      const mix2 = createMockMix({ uploaderId: adminUser.id, isPublic: true });
      const privateMix = createMockMix({ uploaderId: regularUser.id, isPublic: false });
      await prisma.mix.createMany({ data: [mix1, mix2, privateMix] });

      const request = new NextRequest("http://localhost:3000/api/admin/stats");
      const response = await getStats(request);

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data.stats).toBeDefined();
      expect(data.stats.totalUsers).toBe(2);
      expect(data.stats.totalMixes).toBe(3);
      expect(data.stats.publicMixes).toBe(2);
      expect(data.stats.privateMixes).toBe(1);
    });

    it("should include storage statistics", async () => {
      mockGetSession.mockResolvedValue(adminSession);

      // Create mixes with file sizes
      const mix1 = createMockMix({
        uploaderId: regularUser.id,
        fileSize: 10 * 1024 * 1024, // 10MB
      });
      const mix2 = createMockMix({
        uploaderId: regularUser.id,
        fileSize: 20 * 1024 * 1024, // 20MB
      });
      await prisma.mix.createMany({ data: [mix1, mix2] });

      const request = new NextRequest("http://localhost:3000/api/admin/stats");
      const response = await getStats(request);

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data.stats.totalStorageBytes).toBe(30 * 1024 * 1024);
    });

    it("should deny access for non-admin users", async () => {
      mockGetSession.mockResolvedValue(regularSession);

      const request = new NextRequest("http://localhost:3000/api/admin/stats");
      const response = await getStats(request);

      expect(response.status).toBe(403);
    });

    it("should require authentication", async () => {
      mockGetSession.mockResolvedValue(null);

      const request = new NextRequest("http://localhost:3000/api/admin/stats");
      const response = await getStats(request);

      expect(response.status).toBe(401);
    });

    it("should include user role breakdown", async () => {
      mockGetSession.mockResolvedValue(adminSession);

      const request = new NextRequest("http://localhost:3000/api/admin/stats");
      const response = await getStats(request);

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data.stats.usersByRole).toBeDefined();
      expect(data.stats.usersByRole.admin).toBe(1);
      expect(data.stats.usersByRole.user).toBe(1);
    });

    it("should include user status breakdown", async () => {
      mockGetSession.mockResolvedValue(adminSession);

      // Create suspended user
      const suspendedUser = createMockUser({
        email: "suspended@test.com",
        status: "suspended",
      });
      await prisma.user.create({ data: suspendedUser });

      const request = new NextRequest("http://localhost:3000/api/admin/stats");
      const response = await getStats(request);

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data.stats.usersByStatus).toBeDefined();
      expect(data.stats.usersByStatus.active).toBe(2);
      expect(data.stats.usersByStatus.suspended).toBe(1);
    });
  });

  describe("Admin authorization", () => {
    it("should prevent regular users from accessing admin endpoints", async () => {
      mockGetSession.mockResolvedValue(regularSession);

      const endpoints = [
        "http://localhost:3000/api/admin/users",
        "http://localhost:3000/api/admin/stats",
      ];

      for (const url of endpoints) {
        const request = new NextRequest(url);
        let response;

        if (url.includes("/users")) {
          response = await getUsers(request);
        } else if (url.includes("/stats")) {
          response = await getStats(request);
        }

        expect(response?.status).toBe(403);
      }
    });

    it("should allow admin users to access all admin endpoints", async () => {
      mockGetSession.mockResolvedValue(adminSession);

      const usersRequest = new NextRequest("http://localhost:3000/api/admin/users");
      const usersResponse = await getUsers(usersRequest);
      expect(usersResponse.status).toBe(200);

      const statsRequest = new NextRequest("http://localhost:3000/api/admin/stats");
      const statsResponse = await getStats(statsRequest);
      expect(statsResponse.status).toBe(200);
    });
  });

  describe("Admin data aggregation", () => {
    it("should calculate total duration of all mixes", async () => {
      mockGetSession.mockResolvedValue(adminSession);

      const mix1 = createMockMix({
        uploaderId: regularUser.id,
        duration: 3600, // 1 hour
      });
      const mix2 = createMockMix({
        uploaderId: regularUser.id,
        duration: 1800, // 30 minutes
      });
      await prisma.mix.createMany({ data: [mix1, mix2] });

      const request = new NextRequest("http://localhost:3000/api/admin/stats");
      const response = await getStats(request);

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data.stats.totalDurationSeconds).toBe(5400); // 1.5 hours
    });

    it("should show recent activity metrics", async () => {
      mockGetSession.mockResolvedValue(adminSession);

      // Create recent mixes
      const recentMix = createMockMix({
        uploaderId: regularUser.id,
        createdAt: new Date(),
      });
      await prisma.mix.create({ data: recentMix });

      const request = new NextRequest("http://localhost:3000/api/admin/stats");
      const response = await getStats(request);

      expect(response.status).toBe(200);
      const data = await response.json();

      // Stats should include recent activity
      expect(data.stats).toBeDefined();
    });
  });
});
