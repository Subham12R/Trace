import { z } from "zod";

export const RegisterDeviceSchema = z.object({
    name: z.string().min(1).max(200),
    platform: z.enum(["win32", "darwin", "linux"]),
    version: z.string().min(1),
});

export const RequestRowSchema = z.object({
    source: z.string().min(1),
    session_id: z.string().nullable().optional(),
    timestamp: z.string().datetime({ offset: true }),
    model: z.string().nullable().optional(),
    input_tokens: z.number().int().min(0),
    output_tokens: z.number().int().min(0),
    cache_read_tokens: z.number().int().min(0),
    cache_write_tokens: z.number().int().min(0),
    cost: z.number().min(0),
    project: z.string().nullable().optional(),
    branch: z.string().nullable().optional(),
    latency_ms: z.number().int().nullable().optional(),
});

export const SyncPushSchema = z.array(RequestRowSchema).max(500);

export const TimeRangeSchema = z
    .enum(["today", "week", "month", "all"])
    .default("today");
