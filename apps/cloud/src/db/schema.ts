import {
    pgTable,
    text,
    integer,
    real,
    timestamp,
    uuid,
    index,
    uniqueIndex,
} from "drizzle-orm/pg-core";

export const devices = pgTable("devices", {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id").notNull(),
    name: text("name").notNull(),
    platform: text("platform").notNull(),
    version: text("version").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    lastSeenAt: timestamp("last_seen_at").defaultNow().notNull(),
});

export const requests = pgTable(
    "requests",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        userId: text("user_id").notNull(),
        deviceId: uuid("device_id").notNull(),
        source: text("source").notNull(),
        sessionId: text("session_id"),
        timestamp: timestamp("timestamp").notNull(),
        model: text("model"),
        inputTokens: integer("input_tokens").notNull().default(0),
        outputTokens: integer("output_tokens").notNull().default(0),
        cacheReadTokens: integer("cache_read_tokens").notNull().default(0),
        cacheWriteTokens: integer("cache_write_tokens").notNull().default(0),
        cost: real("cost").notNull().default(0),
        project: text("project"),
        branch: text("branch"),
        latencyMs: integer("latency_ms"),
        createdAt: timestamp("created_at").defaultNow().notNull(),
    },
    (t) => [
        index("requests_user_timestamp_idx").on(t.userId, t.timestamp),
        index("requests_user_device_idx").on(t.userId, t.deviceId),
        uniqueIndex("requests_dedup_idx").on(
            t.userId,
            t.deviceId,
            t.source,
            t.sessionId,
            t.timestamp
        ),
    ]
);

export const syncCursors = pgTable("sync_cursors", {
    deviceId: uuid("device_id").primaryKey(),
    lastSyncedAt: timestamp("last_synced_at").notNull(),
});
