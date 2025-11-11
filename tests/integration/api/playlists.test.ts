import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock auth - MUST be hoisted
vi.mock("@/lib/auth-helpers", () => ({
  getSession: vi.fn(),
}));

import { NextRequest } from "next/server";
import { GET, POST } from "@/app/api/playlists/route";
import { clearTestDatabase } from "../setup";
import { createMockUser, createMockPlaylist, createMockMix } from "@/tests/utils/test-factories";
import { createMockUserSession } from "@/tests/utils/mock-session";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth-helpers";

const mockGetSession = getSession as any;

describe("Playlist API Integration Tests", () => {
  let testUser: any;
  let testSession: any;

  beforeEach(async () => {
    await clearTestDatabase();

    // Create test user
    testUser = createMockUser();
    await prisma.user.create({ data: testUser });

    testSession = createMockUserSession({ id: testUser.id });
    mockGetSession.mockResolvedValue(testSession);
  });

  describe("GET /api/playlists", () => {
    it("should return empty array when no playlists exist", async () => {
      const request = new NextRequest("http://localhost:3000/api/playlists");
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.playlists).toEqual([]);
    });

    it("should return user's own playlists", async () => {
      // Create playlists for test user
      const playlist1 = createMockPlaylist({
        userId: testUser.id,
        name: "My Playlist 1",
        isPublic: false
      });
      const playlist2 = createMockPlaylist({
        userId: testUser.id,
        name: "My Playlist 2",
        isPublic: true
      });

      await prisma.playlist.createMany({ data: [playlist1, playlist2] });

      const request = new NextRequest("http://localhost:3000/api/playlists");
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.playlists).toHaveLength(2);
      expect(data.playlists.every((p: any) => p.userId === testUser.id)).toBe(true);
    });

    it("should return public playlists from other users", async () => {
      // Create another user
      const otherUser = createMockUser({ email: "other@test.com" });
      await prisma.user.create({ data: otherUser });

      // Create public playlist from other user
      const publicPlaylist = createMockPlaylist({
        userId: otherUser.id,
        name: "Public Playlist",
        isPublic: true,
      });

      // Create private playlist from other user
      const privatePlaylist = createMockPlaylist({
        userId: otherUser.id,
        name: "Private Playlist",
        isPublic: false,
      });

      await prisma.playlist.createMany({ data: [publicPlaylist, privatePlaylist] });

      const request = new NextRequest("http://localhost:3000/api/playlists");
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();

      // Should see public playlist but not private
      expect(data.playlists).toHaveLength(1);
      expect(data.playlists[0].name).toBe("Public Playlist");
    });

    it("should require authentication", async () => {
      mockGetSession.mockResolvedValue(null);

      const request = new NextRequest("http://localhost:3000/api/playlists");
      const response = await GET(request);

      expect(response.status).toBe(401);
    });

    it("should include user information in response", async () => {
      const playlist = createMockPlaylist({
        userId: testUser.id,
        name: "Test Playlist"
      });
      await prisma.playlist.create({ data: playlist });

      const request = new NextRequest("http://localhost:3000/api/playlists");
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.playlists[0].user).toBeDefined();
      expect(data.playlists[0].user.id).toBe(testUser.id);
    });
  });

  describe("POST /api/playlists", () => {
    it("should create a new playlist", async () => {
      const request = new NextRequest("http://localhost:3000/api/playlists", {
        method: "POST",
        body: JSON.stringify({
          name: "New Playlist",
          description: "A test playlist",
          isPublic: true,
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.playlist.name).toBe("New Playlist");
      expect(data.playlist.description).toBe("A test playlist");
      expect(data.playlist.isPublic).toBe(true);
      expect(data.playlist.userId).toBe(testUser.id);
    });

    it("should create private playlist by default", async () => {
      const request = new NextRequest("http://localhost:3000/api/playlists", {
        method: "POST",
        body: JSON.stringify({
          name: "Private Playlist",
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.playlist.isPublic).toBe(false);
    });

    it("should require name", async () => {
      const request = new NextRequest("http://localhost:3000/api/playlists", {
        method: "POST",
        body: JSON.stringify({
          description: "No name provided",
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(400);
    });

    it("should sanitize input", async () => {
      const request = new NextRequest("http://localhost:3000/api/playlists", {
        method: "POST",
        body: JSON.stringify({
          name: "  Playlist with spaces  ",
          description: "  Description with spaces  ",
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.playlist.name).toBe("Playlist with spaces");
      expect(data.playlist.description).toBe("Description with spaces");
    });

    it("should enforce max length for name", async () => {
      const longName = "a".repeat(200);

      const request = new NextRequest("http://localhost:3000/api/playlists", {
        method: "POST",
        body: JSON.stringify({
          name: longName,
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.playlist.name.length).toBeLessThanOrEqual(100);
    });

    it("should require authentication", async () => {
      mockGetSession.mockResolvedValue(null);

      const request = new NextRequest("http://localhost:3000/api/playlists", {
        method: "POST",
        body: JSON.stringify({
          name: "New Playlist",
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(401);
    });
  });

  describe("Playlist with mixes", () => {
    it("should show mix count in playlist listing", async () => {
      // Create playlist
      const playlist = createMockPlaylist({
        userId: testUser.id,
        name: "Test Playlist"
      });
      await prisma.playlist.create({ data: playlist });

      // Add mixes to playlist
      const mix1 = createMockMix({ uploaderId: testUser.id });
      const mix2 = createMockMix({ uploaderId: testUser.id });
      await prisma.mix.createMany({ data: [mix1, mix2] });

      await prisma.playlistMix.createMany({
        data: [
          { playlistId: playlist.id, mixId: mix1.id, order: 0 },
          { playlistId: playlist.id, mixId: mix2.id, order: 1 },
        ],
      });

      const request = new NextRequest("http://localhost:3000/api/playlists");
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.playlists[0]._count?.mixes).toBe(2);
    });
  });

  describe("Playlist ownership", () => {
    it("should only show user's own private playlists", async () => {
      // Create another user
      const otherUser = createMockUser({ email: "other@test.com" });
      await prisma.user.create({ data: otherUser });

      // Create private playlists
      const myPrivatePlaylist = createMockPlaylist({
        userId: testUser.id,
        name: "My Private",
        isPublic: false,
      });

      const otherPrivatePlaylist = createMockPlaylist({
        userId: otherUser.id,
        name: "Other Private",
        isPublic: false,
      });

      await prisma.playlist.createMany({
        data: [myPrivatePlaylist, otherPrivatePlaylist]
      });

      const request = new NextRequest("http://localhost:3000/api/playlists");
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();

      // Should only see own private playlist
      expect(data.playlists).toHaveLength(1);
      expect(data.playlists[0].name).toBe("My Private");
      expect(data.playlists[0].userId).toBe(testUser.id);
    });
  });

  describe("Playlist ordering", () => {
    it("should return playlists ordered by creation date", async () => {
      const playlist1 = createMockPlaylist({
        userId: testUser.id,
        name: "Old Playlist",
        createdAt: new Date("2024-01-01"),
      });

      const playlist2 = createMockPlaylist({
        userId: testUser.id,
        name: "New Playlist",
        createdAt: new Date("2024-12-01"),
      });

      await prisma.playlist.create({ data: playlist1 });
      await prisma.playlist.create({ data: playlist2 });

      const request = new NextRequest("http://localhost:3000/api/playlists");
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();

      // Newer should be first
      expect(data.playlists[0].name).toBe("New Playlist");
      expect(data.playlists[1].name).toBe("Old Playlist");
    });
  });
});
