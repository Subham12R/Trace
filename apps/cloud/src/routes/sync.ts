import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { eq } from "drizzle-orm";
import { requireAuth } from "../lib/middleware.js";
import { syncRateLimit } from "../lib/rate-limit.js";
import { SyncPushSchema } from "../lib/validators.js";
import { db } from "../db/index.js";
import { requests, devices, syncCursors } from "../db/schema.js";

const app = new Hono<{
    Variables: { userId: string; user: { id: string; email: string; name: string } };
}>();

app.post("/push", requireAuth, syncRateLimit, zValidator("json", SyncPushSchema), async (c) => {
    const userId = c.get("userId");
    const rows = c.req.valid("json");

    // Resolve device from header or fall back to user's first device
    const deviceHeader = c.req.header("X-Device-Id");
    let deviceId = deviceHeader ?? null;

    if (!deviceId) {
        const firstDevice = await db.query.devices.findFirst({
            where: eq(devices.userId, userId),
        });
        if (!firstDevice) {
            return c.json({ error: "no device registered" }, 400);
        }
        deviceId = firstDevice.id;
    }

    if (rows.length > 0) {
        await db
            .insert(requests)
            .values(
                rows.map((r) => ({
                    userId,
                    deviceId: deviceId!,
                    source: r.source,
                    sessionId: r.session_id ?? null,
                    timestamp: new Date(r.timestamp),
                    model: r.model ?? null,
                    inputTokens: r.input_tokens,
                    outputTokens: r.output_tokens,
                    cacheReadTokens: r.cache_read_tokens,
                    cacheWriteTokens: r.cache_write_tokens,
                    cost: r.cost,
                    project: r.project ?? null,
                    branch: r.branch ?? null,
                    latencyMs: r.latency_ms ?? null,
                }))
            )
            .onConflictDoNothing();
    }

    await db
        .insert(syncCursors)
        .values({ deviceId: deviceId!, lastSyncedAt: new Date() })
        .onConflictDoUpdate({
            target: syncCursors.deviceId,
            set: { lastSyncedAt: new Date() },
        });

    return c.json({ inserted: rows.length });
});

export default app;
