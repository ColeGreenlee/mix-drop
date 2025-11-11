import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock cache - MUST be hoisted
vi.mock("./cache", () => ({
  cacheGet: vi.fn(),
  cacheSet: vi.fn(),
}));

// Mock logger - MUST be hoisted
vi.mock("./logger", () => ({
  logError: vi.fn(),
  logRateLimit: vi.fn(),
}));

import { checkRateLimit } from "./rate-limit";
import { RATE_LIMITS } from "./constants";
import { cacheGet, cacheSet } from "./cache";
import { logError, logRateLimit } from "./logger";

const mockCacheGet = cacheGet as any;
const mockCacheSet = cacheSet as any;
const mockLogError = logError as any;
const mockLogRateLimit = logRateLimit as any;

describe("rate-limit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("checkRateLimit", () => {
    it("should allow first request in a new window", async () => {
      const now = Date.now();
      mockCacheGet.mockResolvedValueOnce(null); // No existing rate limit

      const result = await checkRateLimit("user-1", "upload");

      expect(result.success).toBe(true);
      expect(result.remaining).toBe(RATE_LIMITS.UPLOAD.MAX_REQUESTS - 1);
      expect(result.reset).toBeGreaterThan(now);

      expect(mockCacheSet).toHaveBeenCalledWith(
        "ratelimit:upload:user-1",
        { count: 1, resetAt: expect.any(Number) },
        RATE_LIMITS.UPLOAD.WINDOW_SECONDS
      );
    });

    it("should increment count for subsequent requests", async () => {
      const now = Date.now();
      const resetAt = now + RATE_LIMITS.UPLOAD.WINDOW_SECONDS * 1000;

      mockCacheGet.mockResolvedValueOnce({
        count: 2,
        resetAt,
      });

      const result = await checkRateLimit("user-1", "upload");

      expect(result.success).toBe(true);
      expect(result.remaining).toBe(RATE_LIMITS.UPLOAD.MAX_REQUESTS - 3);
      expect(result.reset).toBe(resetAt);

      expect(mockCacheSet).toHaveBeenCalledWith(
        "ratelimit:upload:user-1",
        { count: 3, resetAt },
        expect.any(Number)
      );
    });

    it("should block request when limit is reached", async () => {
      const now = Date.now();
      const resetAt = now + RATE_LIMITS.UPLOAD.WINDOW_SECONDS * 1000;

      mockCacheGet.mockResolvedValueOnce({
        count: RATE_LIMITS.UPLOAD.MAX_REQUESTS, // Already at limit
        resetAt,
      });

      const result = await checkRateLimit("user-1", "upload");

      expect(result.success).toBe(false);
      expect(result.remaining).toBe(0);
      expect(result.reset).toBe(resetAt);

      expect(mockLogRateLimit).toHaveBeenCalledWith("upload", false, 0, {
        userId: "user-1",
      });
    });

    it("should block request when limit is exceeded", async () => {
      const now = Date.now();
      const resetAt = now + RATE_LIMITS.UPLOAD.WINDOW_SECONDS * 1000;

      mockCacheGet.mockResolvedValueOnce({
        count: RATE_LIMITS.UPLOAD.MAX_REQUESTS + 1, // Over limit
        resetAt,
      });

      const result = await checkRateLimit("user-1", "upload");

      expect(result.success).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it("should start new window when previous window expired", async () => {
      const now = Date.now();
      const expiredResetAt = now - 1000; // Window expired 1 second ago

      mockCacheGet.mockResolvedValueOnce({
        count: RATE_LIMITS.UPLOAD.MAX_REQUESTS,
        resetAt: expiredResetAt,
      });

      const result = await checkRateLimit("user-1", "upload");

      expect(result.success).toBe(true);
      expect(result.remaining).toBe(RATE_LIMITS.UPLOAD.MAX_REQUESTS - 1);

      expect(mockCacheSet).toHaveBeenCalledWith(
        "ratelimit:upload:user-1",
        { count: 1, resetAt: expect.any(Number) },
        RATE_LIMITS.UPLOAD.WINDOW_SECONDS
      );
    });

    it("should handle API rate limits", async () => {
      mockCacheGet.mockResolvedValueOnce(null);

      const result = await checkRateLimit("user-1", "api");

      expect(result.success).toBe(true);
      expect(result.remaining).toBe(RATE_LIMITS.API.MAX_REQUESTS - 1);

      expect(mockCacheSet).toHaveBeenCalledWith(
        "ratelimit:api:user-1",
        { count: 1, resetAt: expect.any(Number) },
        RATE_LIMITS.API.WINDOW_SECONDS
      );
    });

    it("should use upload as default action", async () => {
      mockCacheGet.mockResolvedValueOnce(null);

      await checkRateLimit("user-1");

      expect(mockCacheGet).toHaveBeenCalledWith("ratelimit:upload:user-1");
    });

    it("should track different users separately", async () => {
      mockCacheGet.mockResolvedValueOnce(null);
      await checkRateLimit("user-1", "upload");

      mockCacheGet.mockResolvedValueOnce(null);
      await checkRateLimit("user-2", "upload");

      expect(mockCacheGet).toHaveBeenCalledWith("ratelimit:upload:user-1");
      expect(mockCacheGet).toHaveBeenCalledWith("ratelimit:upload:user-2");
    });

    it("should track different actions separately for same user", async () => {
      mockCacheGet.mockResolvedValueOnce(null);
      await checkRateLimit("user-1", "upload");

      mockCacheGet.mockResolvedValueOnce(null);
      await checkRateLimit("user-1", "api");

      expect(mockCacheGet).toHaveBeenCalledWith("ratelimit:upload:user-1");
      expect(mockCacheGet).toHaveBeenCalledWith("ratelimit:api:user-1");
    });

    it("should calculate correct TTL for subsequent requests", async () => {
      const now = Date.now();
      const resetAt = now + 3600000; // 1 hour from now
      const ttlSeconds = Math.floor((resetAt - now) / 1000);

      mockCacheGet.mockResolvedValueOnce({
        count: 1,
        resetAt,
      });

      await checkRateLimit("user-1", "upload");

      expect(mockCacheSet).toHaveBeenCalledWith(
        "ratelimit:upload:user-1",
        { count: 2, resetAt },
        ttlSeconds
      );
    });

    it("should fail open on cache error", async () => {
      const error = new Error("Cache error");
      mockCacheGet.mockRejectedValueOnce(error);

      const result = await checkRateLimit("user-1", "upload");

      expect(result.success).toBe(true); // Fail open
      expect(result.remaining).toBe(RATE_LIMITS.UPLOAD.MAX_REQUESTS);
      expect(mockLogError).toHaveBeenCalledWith(error, {
        rateLimit: { action: "upload", userId: "user-1" },
      });
    });

    it("should fail open on cacheSet error", async () => {
      mockCacheGet.mockResolvedValueOnce(null);
      const error = new Error("Cache set error");
      mockCacheSet.mockRejectedValueOnce(error);

      const result = await checkRateLimit("user-1", "upload");

      expect(result.success).toBe(true); // Fail open
      expect(mockLogError).toHaveBeenCalled();
    });

    it("should allow exactly MAX_REQUESTS requests", async () => {
      const now = Date.now();
      const resetAt = now + RATE_LIMITS.UPLOAD.WINDOW_SECONDS * 1000;

      // First request
      mockCacheGet.mockResolvedValueOnce(null);
      const result1 = await checkRateLimit("user-1", "upload");
      expect(result1.success).toBe(true);

      // Requests 2-4
      for (let i = 2; i <= RATE_LIMITS.UPLOAD.MAX_REQUESTS; i++) {
        mockCacheGet.mockResolvedValueOnce({
          count: i - 1,
          resetAt,
        });
        const result = await checkRateLimit("user-1", "upload");
        expect(result.success).toBe(true);
        expect(result.remaining).toBe(RATE_LIMITS.UPLOAD.MAX_REQUESTS - i);
      }

      // Request beyond limit (6th request when limit is 5)
      mockCacheGet.mockResolvedValueOnce({
        count: RATE_LIMITS.UPLOAD.MAX_REQUESTS,
        resetAt,
      });
      const finalResult = await checkRateLimit("user-1", "upload");
      expect(finalResult.success).toBe(false);
      expect(finalResult.remaining).toBe(0);
    });

    it("should set correct reset time for new window", async () => {
      const now = 1000000;
      vi.setSystemTime(now);

      mockCacheGet.mockResolvedValueOnce(null);

      const result = await checkRateLimit("user-1", "upload");

      const expectedReset = now + RATE_LIMITS.UPLOAD.WINDOW_SECONDS * 1000;
      expect(result.reset).toBe(expectedReset);
    });

    it("should preserve reset time within window", async () => {
      const now = 1000000;
      vi.setSystemTime(now);

      const resetAt = now + RATE_LIMITS.UPLOAD.WINDOW_SECONDS * 1000;

      mockCacheGet.mockResolvedValueOnce({
        count: 1,
        resetAt,
      });

      const result = await checkRateLimit("user-1", "upload");

      expect(result.reset).toBe(resetAt); // Should not change
    });
  });
});
