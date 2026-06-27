import { z } from "zod";

export const RegisterDeviceSchema = z.object({
    name: z.string().min(1).max(200),
    platform: z.enum(["win32", "darwin", "linux"]),
    version: z.string().min(1),
});

export const RequestRowSchema = z.object({
    // source must be a known tool name — capped at 100 chars to prevent junk storage
    source: z.string().min(1).max(100),
    session_id: z.string().max(128).nullable().optional(),
    // timestamp must be a valid ISO 8601 datetime with offset
    timestamp: z.string().datetime({ offset: true }),
    model: z.string().max(200).nullable().optional(),
    input_tokens: z.number().int().min(0).max(10_000_000),
    output_tokens: z.number().int().min(0).max(10_000_000),
    cache_read_tokens: z.number().int().min(0).max(10_000_000),
    cache_write_tokens: z.number().int().min(0).max(10_000_000),
    // $100 per request is a safe upper bound — anything above is almost certainly bogus
    cost: z.number().min(0).max(100),
    project: z.string().max(500).nullable().optional(),
    branch: z.string().max(500).nullable().optional(),
    latency_ms: z.number().int().min(0).max(3_600_000).nullable().optional(),
});

export const SyncPushSchema = z.array(RequestRowSchema).max(500);

export const TimeRangeSchema = z
    .enum(["today", "week", "month", "all"])
    .default("today");
