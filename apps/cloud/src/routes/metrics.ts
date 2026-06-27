import { Hono } from "hono";
import { sql, eq, and, gte, count, sum } from "drizzle-orm";
import { requireAuth } from "../lib/middleware.js";
import { readRateLimit } from "../lib/rate-limit.js";
import { TimeRangeSchema } from "../lib/validators.js";
import { db } from "../db/index.js";
import { requests } from "../db/schema.js";

const app = new Hono<{
    Variables: { userId: string; user: { id: string; email: string; name: string } };
}>();

function rangeStart(range: string): Date | null {
    const now = new Date();
    if (range === "today") return new Date(now.getFullYear(), now.getMonth(), now.getDate());
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
    if (start) return and(eq(requests.userId, userId), gte(requests.timestamp, start));
    return eq(requests.userId, userId);
}

const round4 = (v: unknown) => Math.round((Number(v) || 0) * 10000) / 10000;
const num = (v: unknown) => Number(v ?? 0);

// GET /api/metrics/summary
app.get("/summary", requireAuth, readRateLimit, async (c) => {
    const range = TimeRangeSchema.parse(c.req.query("range") ?? "today");
    const userId = c.get("userId");
    const where = buildWhere(userId, rangeStart(range));

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

    const cacheRead = num(row.cacheReadTokens);
    const cacheWrite = num(row.cacheWriteTokens);
    const cacheTotal = cacheRead + cacheWrite;
    const cacheHitRate = cacheTotal > 0 ? (cacheRead / cacheTotal) * 100 : 0;

    return c.json({
        total_cost: round4(row.totalCost),
        total_requests: num(row.totalRequests),
        input_tokens: num(row.inputTokens),
        output_tokens: num(row.outputTokens),
        cache_read_tokens: cacheRead,
        cache_write_tokens: cacheWrite,
        cache_hit_rate: Math.round(cacheHitRate * 10) / 10,
        session_count: num(row.sessionCount),
    });
});

// GET /api/metrics/trends — grouped by time bucket AND source
app.get("/trends", requireAuth, readRateLimit, async (c) => {
    const range = TimeRangeSchema.parse(c.req.query("range") ?? "today");
    const userId = c.get("userId");
    const unit = dateTruncUnit(range);
    const where = buildWhere(userId, rangeStart(range));

    const bucketSql = sql<string>`date_trunc(${sql.raw(`'${unit}'`)}, ${requests.timestamp})`;

    const rows = await db
        .select({
            bucket: bucketSql,
            source: requests.source,
            totalCost: sum(requests.cost),
            inputTokens: sum(requests.inputTokens),
            outputTokens: sum(requests.outputTokens),
            requestCount: count(),
        })
        .from(requests)
        .where(where)
        .groupBy(bucketSql, requests.source)
        .orderBy(bucketSql);

    return c.json({
        buckets: rows.map((r) => ({
            bucket: r.bucket ? new Date(r.bucket).toISOString() : "",
            source: r.source,
            cost: round4(r.totalCost),
            input_tokens: num(r.inputTokens),
            output_tokens: num(r.outputTokens),
            requests: num(r.requestCount),
        })),
    });
});

// GET /api/metrics/models
app.get("/models", requireAuth, readRateLimit, async (c) => {
    const range = TimeRangeSchema.parse(c.req.query("range") ?? "today");
    const userId = c.get("userId");
    const where = buildWhere(userId, rangeStart(range));

    const rows = await db
        .select({
            model: requests.model,
            source: requests.source,
            totalCost: sum(requests.cost),
            inputTokens: sum(requests.inputTokens),
            outputTokens: sum(requests.outputTokens),
            requestCount: count(),
        })
        .from(requests)
        .where(where)
        .groupBy(requests.model, requests.source)
        .orderBy(sql`SUM(${requests.cost}) DESC`);

    return c.json({
        models: rows.map((r) => ({
            model: r.model ?? "unknown",
            source: r.source,
            requests: num(r.requestCount),
            input_tokens: num(r.inputTokens),
            output_tokens: num(r.outputTokens),
            cost: round4(r.totalCost),
        })),
    });
});

// GET /api/metrics/sessions
app.get("/sessions", requireAuth, readRateLimit, async (c) => {
    const range = TimeRangeSchema.parse(c.req.query("range") ?? "today");
    const userId = c.get("userId");
    const where = buildWhere(userId, rangeStart(range));

    const rows = await db
        .select({
            sessionId: requests.sessionId,
            source: requests.source,
            totalCost: sum(requests.cost),
            inputTokens: sum(requests.inputTokens),
            outputTokens: sum(requests.outputTokens),
            requestCount: count(),
            startedAt: sql<string>`MIN(${requests.timestamp})`,
            endedAt: sql<string>`MAX(${requests.timestamp})`,
        })
        .from(requests)
        .where(where)
        .groupBy(requests.sessionId, requests.source)
        .orderBy(sql`MAX(${requests.timestamp}) DESC`)
        .limit(100);

    return c.json({
        sessions: rows.map((r) => ({
            session_id: r.sessionId,
            source: r.source,
            started_at: r.startedAt,
            ended_at: r.endedAt,
            requests: num(r.requestCount),
            input_tokens: num(r.inputTokens),
            output_tokens: num(r.outputTokens),
            cost: round4(r.totalCost),
        })),
    });
});

// GET /api/metrics/sources
app.get("/sources", requireAuth, readRateLimit, async (c) => {
    const range = TimeRangeSchema.parse(c.req.query("range") ?? "today");
    const userId = c.get("userId");
    const where = buildWhere(userId, rangeStart(range));

    const rows = await db
        .select({
            source: requests.source,
            totalCost: sum(requests.cost),
            inputTokens: sum(requests.inputTokens),
            outputTokens: sum(requests.outputTokens),
            cacheReadTokens: sum(requests.cacheReadTokens),
            cacheWriteTokens: sum(requests.cacheWriteTokens),
            requestCount: count(),
        })
        .from(requests)
        .where(where)
        .groupBy(requests.source)
        .orderBy(sql`SUM(${requests.cost}) DESC`);

    return c.json({
        sources: rows.map((r) => ({
            source: r.source,
            requests: num(r.requestCount),
            input_tokens: num(r.inputTokens),
            output_tokens: num(r.outputTokens),
            cache_read_tokens: num(r.cacheReadTokens),
            cache_write_tokens: num(r.cacheWriteTokens),
            cost: round4(r.totalCost),
        })),
    });
});

export default app;
