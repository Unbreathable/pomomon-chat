import { createMiddleware } from "hono/factory";
import { redis } from "bun";
import type { Context } from "hono";
import type { AuthContext } from "./auth";
import { env } from "@/shared/env";
import type { MessageResponse } from "@/shared/schemas";

// ==========================
// Types
// ==========================

type RateLimitResult = {
  limited: boolean;
  remaining: number;
  resetIn: number;
};

// ==========================
// Rate Limit Check
// ==========================

/**
 * Sliding window rate limiter using Redis.
 * Approximates a sliding window by weighting current and previous fixed windows.
 */
const check = async (
  identifier: string,
  limit = env.RATE_LIMIT_PER_SECOND,
  windowSecs = 1,
): Promise<RateLimitResult> => {
  const now = Date.now();
  const windowMs = windowSecs * 1000;
  const currentWindow = Math.floor(now / windowMs);
  const previousWindow = currentWindow - 1;
  const elapsedInWindow = now % windowMs;
  const elapsedRatio = elapsedInWindow / windowMs;

  const currentKey = `ratelimit:${identifier}:${currentWindow}`;
  const previousKey = `ratelimit:${identifier}:${previousWindow}`;

  // Get previous window count and increment current window
  const [previousCount, currentCount] = await Promise.all([
    redis.get(previousKey).then((v) => parseInt(v ?? "0", 10)),
    redis.incr(currentKey),
  ]);

  // Set expiry on current key (2 windows to ensure previous data is available)
  if (currentCount === 1) {
    await redis.expire(currentKey, windowSecs * 2);
  }

  // Calculate weighted count using sliding window approximation
  const weightedCount = previousCount * (1 - elapsedRatio) + currentCount;

  const limited = weightedCount > limit;
  const remaining = Math.max(0, Math.floor(limit - weightedCount));
  const resetIn = windowMs - elapsedInWindow;

  return { limited, remaining, resetIn };
};

// ==========================
// Helpers
// ==========================

/** Extracts client IP from proxy headers or falls back to "unknown". */
const getClientIp = (c: Context): string =>
  c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ?? c.req.header("x-real-ip") ?? "unknown";

// ==========================
// Middleware
// ==========================

/** Rate limiting middleware. Uses user ID if authenticated, otherwise client IP. */
const middleware = createMiddleware<AuthContext>(async (c, next) => {
  const user = c.get("user");
  const identifier = user?.id ?? `ip:${getClientIp(c)}`;
  const { limited, remaining, resetIn } = await check(identifier);

  c.header("X-RateLimit-Limit", String(env.RATE_LIMIT_PER_SECOND));
  c.header("X-RateLimit-Remaining", String(remaining));
  c.header("X-RateLimit-Reset", String(Math.ceil(resetIn / 1000)));

  if (limited) {
    c.header("Retry-After", String(Math.ceil(resetIn / 1000)));
    return c.json({ message: "Rate limit exceeded" } as MessageResponse, 429);
  }

  await next();
});

// ==========================
// Export
// ==========================

export const rateLimit = { middleware, check };
