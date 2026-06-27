import { rateLimiter } from "hono-rate-limiter";
import type { Context } from "hono";

/**
 * Extract a stable per-user key from the request.
 * Uses the Authorization bearer token (which is user-specific) so the
 * rate limit is per authenticated user, not per IP (IPs can be shared).
 * Falls back to x-forwarded-for → remote address for unauthenticated calls.
 */
function userKey(c: Context): string {
    const auth = c.req.header("authorization") ?? "";
    if (auth.startsWith("Bearer ")) return auth.slice(7, 60); // first 53 chars of token
    return c.req.header("x-forwarded-for") ?? "anon";
}

/**
 * Sync push: max 60 batches per minute per user.
 * Each batch can have up to 500 rows → 30 000 rows/min max.
 * Far more than any real client would produce.
 */
export const syncRateLimit = rateLimiter({
    windowMs: 60 * 1000,
    limit: 60,
    standardHeaders: "draft-6",
    keyGenerator: userKey,
});

/**
 * Device registration: max 10 per minute per user.
 * Prevents enumeration or rapid re-registration loops.
 */
export const deviceRateLimit = rateLimiter({
    windowMs: 60 * 1000,
    limit: 10,
    standardHeaders: "draft-6",
    keyGenerator: userKey,
});

/**
 * Metrics / account reads: max 120 per minute per user.
 * Generous enough for normal dashboard polling.
 */
export const readRateLimit = rateLimiter({
    windowMs: 60 * 1000,
    limit: 120,
    standardHeaders: "draft-6",
    keyGenerator: userKey,
});
