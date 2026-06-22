import { Hono } from "hono";
import { requireAuth } from "../lib/middleware.js";
import { db } from "../db/index.js";
import { account } from "../db/schema.js";
import { eq } from "drizzle-orm";

const app = new Hono<{
    Variables: { userId: string; user: { id: string; email: string; name: string } };
}>();

app.get("/", requireAuth, async (c) => {
    const user = c.get("user");
    const userAccounts = await db
        .select({ providerId: account.providerId })
        .from(account)
        .where(eq(account.userId, user.id));
    const providers = userAccounts.map((a) => a.providerId);
    return c.json({
        id: user.id,
        email: user.email,
        name: user.name,
        providers,
    });
});

export default app;
