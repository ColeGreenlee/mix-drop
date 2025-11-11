import { mockDeep, mockReset, DeepMockProxy } from "vitest-mock-extended";
import { PrismaClient } from "@prisma/client";

/**
 * Mock Prisma client for unit testing
 * Use vitest-mock-extended for deep mocking of Prisma models
 *
 * For integration tests, use the real Prisma client with a test database
 */

/**
 * Create a deep mock of PrismaClient
 */
export const createMockPrismaClient = ():
 DeepMockProxy<PrismaClient> => {
  return mockDeep<PrismaClient>();
};

// Singleton mock instance
let mockPrismaInstance: DeepMockProxy<PrismaClient> | undefined;

/**
 * Get or create singleton mock Prisma instance
 */
export const getMockPrismaClient = (): DeepMockProxy<PrismaClient> => {
  if (!mockPrismaInstance) {
    mockPrismaInstance = createMockPrismaClient();
  }
  return mockPrismaInstance;
};

/**
 * Reset the mock Prisma client
 * Call this in beforeEach or afterEach to clear mock state
 */
export const resetMockPrismaClient = () => {
  if (mockPrismaInstance) {
    mockReset(mockPrismaInstance);
  }
};

/**
 * Clear the singleton instance
 */
export const clearMockPrismaClient = () => {
  mockPrismaInstance = undefined;
};

/**
 * Mock Prisma module
 * Usage: vi.mock('@/lib/prisma', () => ({ default: getMockPrismaClient() }))
 */
export const mockPrismaModule = () => ({
  default: getMockPrismaClient(),
  __esModule: true,
});

/**
 * Helper to create mock query results
 */
export const createMockQueryResult = <T>(data: T) => {
  return Promise.resolve(data);
};

/**
 * Helper to create mock error
 */
export const createMockPrismaError = (
  code: string,
  message: string
) => {
  const error = new Error(message) as any;
  error.code = code;
  return error;
};

/**
 * Common Prisma error codes for testing
 */
export const PrismaErrorCodes = {
  UNIQUE_CONSTRAINT: "P2002",
  FOREIGN_KEY_CONSTRAINT: "P2003",
  RECORD_NOT_FOUND: "P2025",
  DISCONNECT_ERROR: "P1001",
  CONNECTION_ERROR: "P1002",
} as const;
