import { cacheGet, cacheSet } from "./cache";
import { RATE_LIMITS } from "./constants";

interface RateLimitResult {
  success: boolean;
  remaining: number;
  reset: number;
}

/**
 * Check if a user has exceeded their rate limit
 * @param userId - User ID to check
 * @param action - Action being rate limited (e.g., 'upload')
 * @returns RateLimitResult with success status
 */
export async function checkRateLimit(
  userId: string,
  action: "upload" | "api" = "upload"
): Promise<RateLimitResult> {
  const key = `ratelimit:${action}:${userId}`;
  const limit = RATE_LIMITS[action.toUpperCase() as keyof typeof RATE_LIMITS];

  try {
    const current = await cacheGet<{ count: number; resetAt: number }>(key);
    const now = Date.now();

    if (!current || now > current.resetAt) {
      // No existing limit or expired - start new window
      const resetAt = now + limit.WINDOW_SECONDS * 1000;
      await cacheSet(
        key,
        { count: 1, resetAt },
        limit.WINDOW_SECONDS
      );

      return {
        success: true,
        remaining: limit.MAX_REQUESTS - 1,
        reset: resetAt,
      };
    }

    // Check if limit exceeded
    if (current.count >= limit.MAX_REQUESTS) {
      return {
        success: false,
        remaining: 0,
        reset: current.resetAt,
      };
    }

    // Increment count
    const newCount = current.count + 1;
    await cacheSet(
      key,
      { count: newCount, resetAt: current.resetAt },
      Math.floor((current.resetAt - now) / 1000)
    );

    return {
      success: true,
      remaining: limit.MAX_REQUESTS - newCount,
      reset: current.resetAt,
    };
  } catch (error) {
    console.error("Rate limit check failed:", error);
    // On error, allow the request (fail open)
    return {
      success: true,
      remaining: limit.MAX_REQUESTS,
      reset: Date.now() + limit.WINDOW_SECONDS * 1000,
    };
  }
}
