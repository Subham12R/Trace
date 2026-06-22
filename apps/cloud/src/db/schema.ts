import {
    pgTable,
    text,
    integer,
    real,
    boolean,
    timestamp,
    uuid,
    index,
    uniqueIndex,
} from "drizzle-orm/pg-core";

// ── Better Auth required tables ───────────────────────────────────────────────
export const user = pgTable("user", {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull().unique(),
    emailVerified: boolean("email_verified").notNull().default(false),
    image: text("image"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const session = pgTable("session", {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at").notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
});

export const account = pgTable("account", {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const verification = pgTable("verification", {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
});

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
