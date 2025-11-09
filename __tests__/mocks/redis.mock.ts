import { vi } from "vitest";

/**
 * Mock Redis client for testing
 * Provides in-memory storage for cache operations
 */
export class MockRedisClient {
  private store: Map<string, string> = new Map();
  private ttls: Map<string, number> = new Map();

  get = vi.fn(async (key: string) => {
    // Check if key has expired
    const ttl = this.ttls.get(key);
    if (ttl && Date.now() > ttl) {
      this.store.delete(key);
      this.ttls.delete(key);
      return null;
    }
    return this.store.get(key) || null;
  });

  set = vi.fn(async (key: string, value: string) => {
    this.store.set(key, value);
    return "OK";
  });

  setex = vi.fn(async (key: string, seconds: number, value: string) => {
    this.store.set(key, value);
    this.ttls.set(key, Date.now() + seconds * 1000);
    return "OK";
  });

  del = vi.fn(async (...keys: string[]) => {
    let deleted = 0;
    for (const key of keys) {
      if (this.store.delete(key)) {
        deleted++;
        this.ttls.delete(key);
      }
    }
    return deleted;
  });

  keys = vi.fn(async (pattern: string) => {
    const regex = new RegExp(
      "^" + pattern.replace(/\*/g, ".*").replace(/\?/g, ".") + "$"
    );
    return Array.from(this.store.keys()).filter((key) => regex.test(key));
  });

  on = vi.fn(() => this);

  // Helper method to clear all data (useful between tests)
  clear() {
    this.store.clear();
    this.ttls.clear();
  }

  // Helper to check store contents in tests
  _getStore() {
    return this.store;
  }
}

/**
 * Create a mock Redis client instance
 */
export function createMockRedis() {
  return new MockRedisClient();
}
