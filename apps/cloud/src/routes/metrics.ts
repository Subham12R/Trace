import { Hono } from "hono";
import { sql, eq, and, gte, count, sum } from "drizzle-orm";
import { requireAuth } from "../lib/middleware.js";
import { TimeRangeSchema } from "../lib/validators.js";
import { db } from "../db/index.js";
import { requests } from "../db/schema.js";

const app = new Hono<{
    Variables: { userId: string; user: { id: string; email: string; name: string } };
}>();

function rangeStart(range: string): Date | null {
    const now = new Date();
    if (range === "today") {
        return new Date(now.getFullYear(), now.getMonth(), now.getDate());
    }
    if (range === "week") return new Date(Date.now() - 7 * 86_400_000);
    if (range === "month") return new Date(Date.now() - 30 * 86_400_000);
    return null;
}

function dateTruncUnit(range: string): string {
    if (range === "today") return "hour";
    if (range === "all") return "month";
    return "day";
}

function buildWhere(userId: string, start: Date | null) {
    if (start) {
        return and(eq(requests.userId, userId), gte(requests.timestamp, start));
    }
    return eq(requests.userId, userId);
}

// GET /api/metrics/summary?range=today|week|month|all
app.get("/summary", requireAuth, async (c) => {
    const range = TimeRangeSchema.parse(c.req.query("range") ?? "today");
    const userId = c.get("userId");
    const start = rangeStart(range);
    const where = buildWhere(userId, start);

    const [row] = await db
        .select({
            totalRequests: count(),
            totalCost: sum(requests.cost),
            inputTokens: sum(requests.inputTokens),
            outputTokens: sum(requests.outputTokens),
            cacheReadTokens: sum(requests.cacheReadTokens),
            cacheWriteTokens: sum(requests.cacheWriteTokens),
            sessionCount: sql<number>`COUNT(DISTINCT ${requests.sessionId})`,
        })
        .from(requests)
        .where(where);

    const cacheRead = Number(row.cacheReadTokens ?? 0);
    const cacheWrite = Number(row.cacheWriteTokens ?? 0);
    const cacheTotal = cacheRead + cacheWrite;
    const cacheHitRate = cacheTotal > 0 ? (cacheRead / cacheTotal) * 100 : 0;

    return c.json({
        total_cost: Math.round((Number(row.totalCost) || 0) * 10000) / 10000,
        total_requests: Number(row.totalRequests),
        input_tokens: Number(row.inputTokens ?? 0),
        output_tokens: Number(row.outputTokens ?? 0),
        cache_read_tokens: cacheRead,
        cache_write_tokens: cacheWrite,
        cache_hit_rate: Math.round(cacheHitRate * 10) / 10,
        session_count: Number(row.sessionCount),
    });
});

// GET /api/metrics/trends?range=today|week|month|all
app.get("/trends", requireAuth, async (c) => {
    const range = TimeRangeSchema.parse(c.req.query("range") ?? "today");
    const userId = c.get("userId");
    const start = rangeStart(range);
    const unit = dateTruncUnit(range);
    const where = buildWhere(userId, start);

    const rows = await db
        .select({
            bucket: sql<string>`date_trunc(${unit}, ${requests.timestamp})`,
            totalCost: sum(requests.cost),
            inputTokens: sum(requests.inputTokens),
            outputTokens: sum(requests.outputTokens),
            requestCount: count(),
        })
        .from(requests)
        .where(where)
        .groupBy(sql`date_trunc(${unit}, ${requests.timestamp})`)
        .orderBy(sql`date_trunc(${unit}, ${requests.timestamp})`);

    return c.json(
        rows.map((r) => ({
            bucket: r.bucket,
            cost: Math.round((Number(r.totalCost) || 0) * 10000) / 10000,
            input_tokens: Number(r.inputTokens ?? 0),
            output_tokens: Number(r.outputTokens ?? 0),
            request_count: Number(r.requestCount),
        }))
    );
});

// GET /api/metrics/models?range=today|week|month|all
app.get("/models", requireAuth, async (c) => {
    const range = TimeRangeSchema.parse(c.req.query("range") ?? "today");
    const userId = c.get("userId");
    const start = rangeStart(range);
    const where = buildWhere(userId, start);

    const rows = await db
        .select({
            model: requests.model,
            totalCost: sum(requests.cost),
            inputTokens: sum(requests.inputTokens),
            outputTokens: sum(requests.outputTokens),
            requestCount: count(),
        })
        .from(requests)
        .where(where)
        .groupBy(requests.model)
        .orderBy(sql`SUM(${requests.cost}) DESC`);

    return c.json(
        rows.map((r) => ({
            model: r.model ?? "unknown",
            cost: Math.round((Number(r.totalCost) || 0) * 10000) / 10000,
            input_tokens: Number(r.inputTokens ?? 0),
            output_tokens: Number(r.outputTokens ?? 0),
            request_count: Number(r.requestCount),
        }))
    );
});

// GET /api/metrics/sessions?range=today|week|month|all
app.get("/sessions", requireAuth, async (c) => {
    const range = TimeRangeSchema.parse(c.req.query("range") ?? "today");
    const userId = c.get("userId");
    const start = rangeStart(range);
    const where = buildWhere(userId, start);

    const rows = await db
        .select({
            sessionId: requests.sessionId,
            source: requests.source,
            model: requests.model,
            totalCost: sum(requests.cost),
            inputTokens: sum(requests.inputTokens),
            outputTokens: sum(requests.outputTokens),
            requestCount: count(),
            firstSeen: sql<string>`MIN(${requests.timestamp})`,
            lastSeen: sql<string>`MAX(${requests.timestamp})`,
        })
        .from(requests)
        .where(where)
        .groupBy(requests.sessionId, requests.source, requests.model)
        .orderBy(sql`MAX(${requests.timestamp}) DESC`)
        .limit(100);

    return c.json(
        rows.map((r) => ({
            session_id: r.sessionId,
            source: r.source,
            model: r.model ?? "unknown",
            cost: Math.round((Number(r.totalCost) || 0) * 10000) / 10000,
            input_tokens: Number(r.inputTokens ?? 0),
            output_tokens: Number(r.outputTokens ?? 0),
            request_count: Number(r.requestCount),
            first_seen: r.firstSeen,
            last_seen: r.lastSeen,
        }))
    );
});

// GET /api/metrics/sources?range=today|week|month|all
app.get("/sources", requireAuth, async (c) => {
    const range = TimeRangeSchema.parse(c.req.query("range") ?? "today");
    const userId = c.get("userId");
    const start = rangeStart(range);
    const where = buildWhere(userId, start);

    const rows = await db
        .select({
            source: requests.source,
            totalCost: sum(requests.cost),
            requestCount: count(),
        })
        .from(requests)
        .where(where)
        .groupBy(requests.source)
        .orderBy(sql`SUM(${requests.cost}) DESC`);

    return c.json(
        rows.map((r) => ({
            source: r.source,
            cost: Math.round((Number(r.totalCost) || 0) * 10000) / 10000,
            request_count: Number(r.requestCount),
        }))
    );
});

export default app;
