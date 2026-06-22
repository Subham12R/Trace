import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../lib/middleware.js";
import { RegisterDeviceSchema } from "../lib/validators.js";
import { db } from "../db/index.js";
import { devices } from "../db/schema.js";

const app = new Hono<{
    Variables: { userId: string; user: { id: string; email: string; name: string } };
}>();

app.post(
    "/register",
    requireAuth,
    zValidator("json", RegisterDeviceSchema),
    async (c) => {
        const userId = c.get("userId");
        const { name, platform, version } = c.req.valid("json");

        const existing = await db.query.devices.findFirst({
            where: and(eq(devices.userId, userId), eq(devices.name, name)),
        });

        if (existing) {
            await db
                .update(devices)
                .set({ lastSeenAt: new Date(), version })
                .where(eq(devices.id, existing.id));
            return c.json({ id: existing.id, registered: false, updated: true });
        }

        const [device] = await db
            .insert(devices)
            .values({ userId, name, platform, version })
            .returning({ id: devices.id });

        return c.json({ id: device.id, registered: true }, 201);
    }
);

app.get("/", requireAuth, async (c) => {
    const userId = c.get("userId");
    const rows = await db.query.devices.findMany({
        where: eq(devices.userId, userId),
        orderBy: (d, { desc }) => [desc(d.lastSeenAt)],
    });
    return c.json(rows);
});

app.delete("/:id", requireAuth, async (c) => {
    const userId = c.get("userId");
    const id = c.req.param("id");
    const existing = await db.query.devices.findFirst({
        where: and(eq(devices.id, id), eq(devices.userId, userId)),
    });
    if (!existing) return c.json({ error: "not found" }, 404);
    await db.delete(devices).where(eq(devices.id, id));
    return c.json({ deleted: true });
});

export default app;
