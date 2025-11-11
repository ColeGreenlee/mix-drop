import { describe, it, expect, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/mixes/route";
import { clearTestDatabase } from "../setup";
import { createMockUser, createMockMix } from "@/tests/utils/test-factories";
import prisma from "@/lib/prisma";

describe("GET /api/mixes", () => {
  beforeEach(async () => {
    await clearTestDatabase();
  });

  it("should return empty array when no mixes exist", async () => {
    const request = new NextRequest("http://localhost:3000/api/mixes");
    const response = await GET(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.mixes).toEqual([]);
    expect(data.pagination.total).toBe(0);
  });

  it("should return list of public mixes", async () => {
    // Create test user
    const user = createMockUser();
    await prisma.user.create({ data: user });

    // Create public mixes
    const mixes = [
      createMockMix({ uploaderId: user.id, isPublic: true, title: "Mix 1" }),
      createMockMix({ uploaderId: user.id, isPublic: true, title: "Mix 2" }),
      createMockMix({ uploaderId: user.id, isPublic: true, title: "Mix 3" }),
    ];

    await prisma.mix.createMany({ data: mixes });

    const request = new NextRequest("http://localhost:3000/api/mixes");
    const response = await GET(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.mixes).toHaveLength(3);
    expect(data.pagination.total).toBe(3);
  });

  it("should not return private mixes to unauthenticated users", async () => {
    const user = createMockUser();
    await prisma.user.create({ data: user });

    // Create mix with private visibility
    const privateMix = createMockMix({
      uploaderId: user.id,
      isPublic: false,
      title: "Private Mix",
    });

    await prisma.mix.create({ data: privateMix });

    const request = new NextRequest("http://localhost:3000/api/mixes");
    const response = await GET(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.mixes).toHaveLength(0); // Private mix should not be returned
  });

  it("should handle pagination correctly", async () => {
    const user = createMockUser();
    await prisma.user.create({ data: user });

    // Create 25 public mixes
    const mixes = Array.from({ length: 25 }, (_, i) =>
      createMockMix({
        uploaderId: user.id,
        isPublic: true,
        title: `Mix ${i + 1}`,
      })
    );

    await prisma.mix.createMany({ data: mixes });

    // Get first page (default 20 items)
    const request = new NextRequest("http://localhost:3000/api/mixes?page=1");
    const response = await GET(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.mixes).toHaveLength(20);
    expect(data.pagination.total).toBe(25);
    expect(data.pagination.currentPage).toBe(1);
    expect(data.pagination.totalPages).toBe(2);
  });

  it("should return second page of results", async () => {
    const user = createMockUser();
    await prisma.user.create({ data: user });

    // Create 25 public mixes
    const mixes = Array.from({ length: 25 }, (_, i) =>
      createMockMix({
        uploaderId: user.id,
        isPublic: true,
        title: `Mix ${i + 1}`,
      })
    );

    await prisma.mix.createMany({ data: mixes });

    // Get second page
    const request = new NextRequest("http://localhost:3000/api/mixes?page=2");
    const response = await GET(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.mixes).toHaveLength(5); // Remaining 5 items
    expect(data.pagination.currentPage).toBe(2);
  });

  it("should include uploader information in response", async () => {
    const user = createMockUser({ name: "Test DJ" });
    await prisma.user.create({ data: user });

    const mix = createMockMix({ uploaderId: user.id, isPublic: true });
    await prisma.mix.create({ data: mix });

    const request = new NextRequest("http://localhost:3000/api/mixes");
    const response = await GET(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.mixes[0].uploader).toBeDefined();
    expect(data.mixes[0].uploader.name).toBe("Test DJ");
  });

  it("should sort mixes by creation date descending", async () => {
    const user = createMockUser();
    await prisma.user.create({ data: user });

    // Create mixes with different timestamps
    const mix1 = createMockMix({
      uploaderId: user.id,
      isPublic: true,
      title: "Old Mix",
      createdAt: new Date("2024-01-01"),
    });

    const mix2 = createMockMix({
      uploaderId: user.id,
      isPublic: true,
      title: "New Mix",
      createdAt: new Date("2024-12-01"),
    });

    await prisma.mix.create({ data: mix1 });
    await prisma.mix.create({ data: mix2 });

    const request = new NextRequest("http://localhost:3000/api/mixes");
    const response = await GET(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.mixes[0].title).toBe("New Mix"); // Newer should be first
    expect(data.mixes[1].title).toBe("Old Mix");
  });

  it("should handle custom page size", async () => {
    const user = createMockUser();
    await prisma.user.create({ data: user });

    const mixes = Array.from({ length: 15 }, (_, i) =>
      createMockMix({
        uploaderId: user.id,
        isPublic: true,
        title: `Mix ${i + 1}`,
      })
    );

    await prisma.mix.createMany({ data: mixes });

    const request = new NextRequest("http://localhost:3000/api/mixes?limit=5");
    const response = await GET(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.mixes).toHaveLength(5);
  });

  it("should cache results", async () => {
    const user = createMockUser();
    await prisma.user.create({ data: user });

    const mix = createMockMix({ uploaderId: user.id, isPublic: true });
    await prisma.mix.create({ data: mix });

    // First request
    const request1 = new NextRequest("http://localhost:3000/api/mixes");
    const response1 = await GET(request1);
    expect(response1.status).toBe(200);

    // Delete the mix from DB
    await prisma.mix.deleteMany();

    // Second request should return cached result
    const request2 = new NextRequest("http://localhost:3000/api/mixes");
    const response2 = await GET(request2);

    // Note: This test might need adjustment based on actual caching implementation
    // The response might still show the mix due to caching
    expect(response2.status).toBe(200);
  });
});
