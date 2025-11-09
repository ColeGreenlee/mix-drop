import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  cacheGet,
  cacheSet,
  cacheDelete,
  cacheDeletePattern,
  CacheKeys,
} from "@/lib/cache";
import RedisMock from "ioredis-mock";

// Mock the logger
vi.mock("@/lib/logger", () => ({
  logger: {
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
    error: vi.fn(),
  },
  logError: vi.fn(),
}));

// Mock ioredis to use ioredis-mock
vi.mock("ioredis", async () => {
  const RedisMock = (await import("ioredis-mock")).default;
  return {
    default: RedisMock,
  };
});

describe("Cache Module", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
  });

  describe("cacheGet", () => {
    it("should retrieve cached value", async () => {
      const testData = { id: "123", name: "Test" };
      await cacheSet("test-key", testData);

      const result = await cacheGet<typeof testData>("test-key");

      expect(result).toEqual(testData);
    });

    it("should return null for non-existent key", async () => {
      const result = await cacheGet("non-existent-key");

      expect(result).toBeNull();
    });

    it("should handle arrays", async () => {
      const testArray = [1, 2, 3, 4, 5];
      await cacheSet("array-key", testArray);

      const result = await cacheGet<number[]>("array-key");
      expect(result).toEqual(testArray);
    });

    it("should handle complex nested objects", async () => {
      const complexData = {
        user: {
          id: "123",
          meta: { visits: 10, lastLogin: "2024-01-01" },
        },
        settings: ["dark-mode", "notifications"],
      };

      await cacheSet("complex-key", complexData);
      const result = await cacheGet<typeof complexData>("complex-key");

      expect(result).toEqual(complexData);
    });
  });

  describe("cacheSet", () => {
    it("should store value without TTL", async () => {
      await cacheSet("persistent-key", { data: "test" });

      const result = await cacheGet<{ data: string }>("persistent-key");
      expect(result).toEqual({ data: "test" });
    });

    it("should store value with TTL", async () => {
      await cacheSet("ttl-key", { data: "test" }, 300);

      const result = await cacheGet<{ data: string }>("ttl-key");
      expect(result).toEqual({ data: "test" });
    });

    it("should stringify objects correctly", async () => {
      const data = { id: 1, name: "Test", active: true };
      await cacheSet("object-key", data);

      const result = await cacheGet<typeof data>("object-key");
      expect(result).toEqual(data);
    });
  });

  describe("cacheDelete", () => {
    it("should delete existing key", async () => {
      await cacheSet("delete-me", { data: "test" });

      await cacheDelete("delete-me");

      const result = await cacheGet("delete-me");
      expect(result).toBeNull();
    });

    it("should handle deletion of non-existent key", async () => {
      // Should not throw
      await expect(cacheDelete("non-existent")).resolves.toBeUndefined();
    });
  });

  describe("cacheDeletePattern", () => {
    it("should delete keys matching pattern", async () => {
      await cacheSet("mixes:list:page:1", [1, 2, 3]);
      await cacheSet("mixes:list:page:2", [4, 5, 6]);
      await cacheSet("mixes:detail:123", { id: 123 });

      await cacheDeletePattern("mixes:list:*");

      // List pages should be deleted
      expect(await cacheGet("mixes:list:page:1")).toBeNull();
      expect(await cacheGet("mixes:list:page:2")).toBeNull();

      // Detail should still exist
      expect(await cacheGet("mixes:detail:123")).toEqual({ id: 123 });
    });

    it("should handle patterns with no matches", async () => {
      // Should not throw
      await expect(cacheDeletePattern("non-matching-*")).resolves.toBeUndefined();
    });
  });

  describe("CacheKeys builders", () => {
    it("should build mixes list key", () => {
      expect(CacheKeys.mixes(1)).toBe("mixes:list:page:1");
      expect(CacheKeys.mixes(5)).toBe("mixes:list:page:5");
      expect(CacheKeys.mixes()).toBe("mixes:list:page:1"); // Default
    });

    it("should build mix detail key", () => {
      expect(CacheKeys.mix("abc-123")).toBe("mix:abc-123");
    });

    it("should build stream URL key", () => {
      expect(CacheKeys.streamUrl("mix-123", "audio")).toBe("stream:mix-123:audio");
      expect(CacheKeys.streamUrl("mix-456")).toBe("stream:mix-456:audio"); // Default type
    });

    it("should build waveform peaks key", () => {
      expect(CacheKeys.waveformPeaks("mix-789")).toBe("waveform:mix-789");
    });
  });

  describe("Graceful degradation", () => {
    it("should handle cache operations without throwing", async () => {
      // Cache operations should not throw even if they fail
      const result = await cacheGet("any-key");
      expect(result !== undefined).toBe(true);
    });
  });
});
