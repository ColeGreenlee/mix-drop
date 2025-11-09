import { vi } from "vitest";
import { PrismaClient } from "@prisma/client";

/**
 * Mock Prisma client for testing
 * Provides basic CRUD operation mocks
 */
export function createMockPrismaClient() {
  const mockPrisma = {
    user: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    mix: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
      aggregate: vi.fn(),
    },
    playlist: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    playlistMix: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
      aggregate: vi.fn(),
      deleteMany: vi.fn(),
    },
    auditLog: {
      findMany: vi.fn(),
      create: vi.fn(),
      count: vi.fn(),
    },
    siteSetting: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      upsert: vi.fn(),
    },
    $connect: vi.fn(),
    $disconnect: vi.fn(),
    $transaction: vi.fn(),
    $on: vi.fn(),
  } as unknown as PrismaClient;

  return mockPrisma;
}

/**
 * Mock Prisma module
 */
export function mockPrismaModule() {
  vi.mock("@/lib/prisma", () => ({
    default: createMockPrismaClient(),
  }));
}
