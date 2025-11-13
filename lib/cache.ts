import Redis from "ioredis";
import { logger, logError } from "./logger";

let redis: Redis | null = null;

// Initialize Redis client
function getRedisClient(): Redis | null {
  if (!process.env.REDIS_URL) {
    logger.warn("REDIS_URL not configured, caching disabled");
    return null;
  }

  if (!redis) {
    try {
      redis = new Redis(process.env.REDIS_URL, {
        maxRetriesPerRequest: 3,
        retryStrategy(times) {
          if (times > 3) {
            logger.error("Redis connection failed after 3 retries");
            return null; // Stop retrying
          }
          return Math.min(times * 100, 3000);
        },
      });

      redis.on("error", (err) => {
        logError(err, { component: "redis", event: "error" });
      });

      redis.on("connect", () => {
        logger.info({ component: "redis", event: "connect" }, "Redis connected");
      });
    } catch (error) {
      logError(error, { component: "redis", event: "init_failed" });
      return null;
    }
  }

  return redis;
}

/**
 * Get a value from cache
 */
export async function cacheGet<T>(key: string): Promise<T | null> {
  const client = getRedisClient();
  if (!client) return null;

  try {
    const value = await client.get(key);
    const hit = value !== null;
    logger.debug({ cache: { operation: "get", key, hit } }, `Cache get: ${key} (${hit ? "HIT" : "MISS"})`);
    return value ? JSON.parse(value) : null;
  } catch (error) {
    logError(error, { cache: { operation: "get", key } });
    return null;
  }
}

/**
 * Set a value in cache with optional TTL (in seconds)
 */
export async function cacheSet(
  key: string,
  value: unknown,
  ttl?: number
): Promise<void> {
  const client = getRedisClient();
  if (!client) return;

  try {
    const stringValue = JSON.stringify(value);
    if (ttl) {
      await client.setex(key, ttl, stringValue);
    } else {
      await client.set(key, stringValue);
    }
    logger.debug({ cache: { operation: "set", key, ttl } }, `Cache set: ${key}${ttl ? ` (TTL: ${ttl}s)` : ""}`);
  } catch (error) {
    logError(error, { cache: { operation: "set", key, ttl } });
  }
}

/**
 * Delete a value from cache
 */
export async function cacheDelete(key: string): Promise<void> {
  const client = getRedisClient();
  if (!client) return;

  try {
    await client.del(key);
    logger.debug({ cache: { operation: "delete", key } }, `Cache delete: ${key}`);
  } catch (error) {
    logError(error, { cache: { operation: "delete", key } });
  }
}

/**
 * Delete multiple cache keys matching a pattern
 */
export async function cacheDeletePattern(pattern: string): Promise<void> {
  const client = getRedisClient();
  if (!client) return;

  try {
    const keys = await client.keys(pattern);
    if (keys.length > 0) {
      await client.del(...keys);
      logger.debug({ cache: { operation: "delete_pattern", pattern, count: keys.length } }, `Cache delete pattern: ${pattern} (${keys.length} keys)`);
    }
  } catch (error) {
    logError(error, { cache: { operation: "delete_pattern", pattern } });
  }
}

// Cache key builders
export const CacheKeys = {
  mixes: (page: number = 1) => `mixes:list:page:${page}`,
  mix: (id: string) => `mix:${id}`,
  streamUrl: (mixId: string, type: string = "audio") => `stream:${mixId}:${type}`,
  waveformPeaks: (mixId: string) => `waveform:${mixId}`,
  publicSettings: () => "settings:public",
};
