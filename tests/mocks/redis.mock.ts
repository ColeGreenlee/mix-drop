import { vi } from "vitest";
import type Redis from "ioredis";

/**
 * Mock Redis client for unit testing
 * Use this to avoid connecting to a real Redis instance during unit tests
 * For integration tests, use a real Redis container via Testcontainers
 */

// In-memory storage for mock Redis
const mockRedisStorage = new Map<string, string>();
const mockRedisExpiry = new Map<string, number>();

/**
 * Mock Redis client implementation
 */
export const createMockRedisClient = () => {
  return {
    // Get
    get: vi.fn(async (key: string) => {
      // Check if key has expired
      const expiry = mockRedisExpiry.get(key);
      if (expiry && Date.now() > expiry) {
        mockRedisStorage.delete(key);
        mockRedisExpiry.delete(key);
        return null;
      }
      return mockRedisStorage.get(key) || null;
    }),

    // Set with optional expiry
    set: vi.fn(async (key: string, value: string) => {
      mockRedisStorage.set(key, value);
      return "OK";
    }),

    // Set with EX (seconds)
    setex: vi.fn(async (key: string, seconds: number, value: string) => {
      mockRedisStorage.set(key, value);
      mockRedisExpiry.set(key, Date.now() + seconds * 1000);
      return "OK";
    }),

    // Delete
    del: vi.fn(async (...keys: string[]) => {
      let count = 0;
      keys.forEach((key) => {
        if (mockRedisStorage.delete(key)) {
          count++;
        }
        mockRedisExpiry.delete(key);
      });
      return count;
    }),

    // Delete by pattern (simplified implementation)
    keys: vi.fn(async (pattern: string) => {
      const regex = new RegExp(
        "^" + pattern.replace(/\*/g, ".*").replace(/\?/g, ".") + "$"
      );
      return Array.from(mockRedisStorage.keys()).filter((key) =>
        regex.test(key)
      );
    }),

    // Increment
    incr: vi.fn(async (key: string) => {
      const current = parseInt(mockRedisStorage.get(key) || "0", 10);
      const newValue = current + 1;
      mockRedisStorage.set(key, newValue.toString());
      return newValue;
    }),

    // Expire
    expire: vi.fn(async (key: string, seconds: number) => {
      if (!mockRedisStorage.has(key)) {
        return 0;
      }
      mockRedisExpiry.set(key, Date.now() + seconds * 1000);
      return 1;
    }),

    // TTL (time to live)
    ttl: vi.fn(async (key: string) => {
      const expiry = mockRedisExpiry.get(key);
      if (!expiry) {
        return -1; // No expiry set
      }
      const remaining = Math.floor((expiry - Date.now()) / 1000);
      return remaining > 0 ? remaining : -2; // -2 means key doesn't exist
    }),

    // Exists
    exists: vi.fn(async (...keys: string[]) => {
      return keys.filter((key) => mockRedisStorage.has(key)).length;
    }),

    // Ping
    ping: vi.fn(async () => "PONG"),

    // Disconnect
    disconnect: vi.fn(async () => undefined),

    // Quit
    quit: vi.fn(async () => "OK"),

    // Status
    status: "ready",

    // Event emitter methods
    on: vi.fn(),
    once: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
  } as unknown as Redis;
};

/**
 * Clear mock Redis storage
 */
export const clearMockRedisStorage = () => {
  mockRedisStorage.clear();
  mockRedisExpiry.clear();
};

/**
 * Get mock Redis storage for assertions
 */
export const getMockRedisStorage = () => {
  return new Map(mockRedisStorage);
};

/**
 * Check if a key exists in mock storage
 */
export const mockRedisHas = (key: string): boolean => {
  return mockRedisStorage.has(key);
};

/**
 * Get value from mock storage
 */
export const mockRedisGet = (key: string): string | undefined => {
  return mockRedisStorage.get(key);
};

/**
 * Set value in mock storage (for test setup)
 */
export const mockRedisSet = (key: string, value: string, ttl?: number) => {
  mockRedisStorage.set(key, value);
  if (ttl) {
    mockRedisExpiry.set(key, Date.now() + ttl * 1000);
  }
};

/**
 * Mock the ioredis module
 * Usage: vi.mock('ioredis', () => mockRedisModule())
 */
export const mockRedisModule = () => {
  return {
    default: vi.fn(() => createMockRedisClient()),
    Redis: vi.fn(() => createMockRedisClient()),
  };
};
