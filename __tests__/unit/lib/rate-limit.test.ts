import { describe, it, expect, vi, beforeEach } from "vitest";
import { checkRateLimit } from "@/lib/rate-limit";
import { RATE_LIMITS } from "@/lib/constants";

// Mock the cache module
vi.mock("@/lib/cache", () => {
  let cache: Record<string, any> = {};

  return {
    cacheGet: vi.fn(async (key: string) => cache[key] || null),
    cacheSet: vi.fn(async (key: string, value: any) => {
      cache[key] = value;
    }),
    _resetCache: () => {
      cache = {};
    },
  };
});

// Mock the logger
vi.mock("@/lib/logger", () => ({
  logError: vi.fn(),
  logRateLimit: vi.fn(),
}));

const { cacheGet, cacheSet, _resetCache } = await import("@/lib/cache");

describe("Rate Limit Module", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (_resetCache as any)();
  });

  describe("checkRateLimit", () => {
    it("should allow first request", async () => {
      const result = await checkRateLimit("user-123", "upload");

      expect(result.success).toBe(true);
      expect(result.remaining).toBe(RATE_LIMITS.UPLOAD.MAX_REQUESTS - 1);
      expect(result.reset).toBeGreaterThan(Date.now());
    });

    it("should track multiple requests", async () => {
      const userId = "user-456";

      const result1 = await checkRateLimit(userId, "upload");
      expect(result1.success).toBe(true);
      expect(result1.remaining).toBe(4); // 5 max - 1

      const result2 = await checkRateLimit(userId, "upload");
      expect(result2.success).toBe(true);
      expect(result2.remaining).toBe(3); // 5 max - 2

      const result3 = await checkRateLimit(userId, "upload");
      expect(result3.success).toBe(true);
      expect(result3.remaining).toBe(2); // 5 max - 3
    });

    it("should block requests after limit exceeded", async () => {
      const userId = "user-789";

      // Make 5 requests (the limit)
      for (let i = 0; i < RATE_LIMITS.UPLOAD.MAX_REQUESTS; i++) {
        const result = await checkRateLimit(userId, "upload");
        expect(result.success).toBe(true);
      }

      // 6th request should fail
      const blockedResult = await checkRateLimit(userId, "upload");
      expect(blockedResult.success).toBe(false);
      expect(blockedResult.remaining).toBe(0);
    });

    it("should handle API rate limits separately", async () => {
      const userId = "user-api";

      const uploadResult = await checkRateLimit(userId, "upload");
      expect(uploadResult.success).toBe(true);

      const apiResult = await checkRateLimit(userId, "api");
      expect(apiResult.success).toBe(true);
      expect(apiResult.remaining).toBe(RATE_LIMITS.API.MAX_REQUESTS - 1);
    });

    it("should respect different limits for different actions", async () => {
      const userId = "user-diff";

      const uploadResult = await checkRateLimit(userId, "upload");
      expect(uploadResult.remaining).toBe(RATE_LIMITS.UPLOAD.MAX_REQUESTS - 1);

      const apiResult = await checkRateLimit(userId, "api");
      expect(apiResult.remaining).toBe(RATE_LIMITS.API.MAX_REQUESTS - 1);
    });

    it("should handle different users independently", async () => {
      const result1 = await checkRateLimit("user-1", "upload");
      const result2 = await checkRateLimit("user-2", "upload");

      expect(result1.remaining).toBe(4);
      expect(result2.remaining).toBe(4); // Should be independent
    });

    it("should create new window after expiration", async () => {
      const userId = "user-expired";

      // First request
      const result1 = await checkRateLimit(userId, "upload");
      expect(result1.success).toBe(true);

      // Simulate expired window by manually setting resetAt to the past
      const key = `ratelimit:upload:${userId}`;
      await (cacheSet as any)(key, { count: 3, resetAt: Date.now() - 1000 });

      // Next request should start new window
      const result2 = await checkRateLimit(userId, "upload");
      expect(result2.success).toBe(true);
      expect(result2.remaining).toBe(RATE_LIMITS.UPLOAD.MAX_REQUESTS - 1);
    });

    it("should preserve reset time within window", async () => {
      const userId = "user-reset";

      const result1 = await checkRateLimit(userId, "upload");
      const firstResetTime = result1.reset;

      const result2 = await checkRateLimit(userId, "upload");
      const secondResetTime = result2.reset;

      // Reset time should remain the same within window
      expect(secondResetTime).toBe(firstResetTime);
    });

    it("should fail open on cache errors", async () => {
      // Mock cache error
      (cacheGet as any).mockRejectedValueOnce(new Error("Cache error"));

      const result = await checkRateLimit("user-error", "upload");

      // Should allow request when cache fails
      expect(result.success).toBe(true);
      expect(result.remaining).toBe(RATE_LIMITS.UPLOAD.MAX_REQUESTS);
    });

    it("should calculate correct TTL for cache", async () => {
      const userId = "user-ttl";

      await checkRateLimit(userId, "upload");

      // Check that cacheSet was called with correct TTL
      expect(cacheSet).toHaveBeenCalledWith(
        expect.stringContaining(userId),
        expect.objectContaining({ count: 1 }),
        RATE_LIMITS.UPLOAD.WINDOW_SECONDS
      );
    });

    it("should handle rapid sequential requests", async () => {
      const userId = "user-rapid";
      const results = [];

      for (let i = 0; i < 7; i++) {
        results.push(await checkRateLimit(userId, "upload"));
      }

      // First 5 should succeed
      expect(results.slice(0, 5).every((r) => r.success)).toBe(true);

      // Last 2 should fail
      expect(results.slice(5).every((r) => !r.success)).toBe(true);
    });

    it("should return correct reset timestamp", async () => {
      const before = Date.now();
      const result = await checkRateLimit("user-timestamp", "upload");
      const after = Date.now();

      const expectedReset = before + RATE_LIMITS.UPLOAD.WINDOW_SECONDS * 1000;

      expect(result.reset).toBeGreaterThanOrEqual(expectedReset);
      expect(result.reset).toBeLessThanOrEqual(
        after + RATE_LIMITS.UPLOAD.WINDOW_SECONDS * 1000
      );
    });
  });
});
