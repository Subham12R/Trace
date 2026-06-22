import { createMiddleware } from "hono/factory";
import { auth } from "./auth.js";

export const requireAuth = createMiddleware(async (c, next) => {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!session) return c.json({ error: "unauthorized" }, 401);
    c.set("userId", session.user.id);
    c.set("user", session.user);
    await next();
});
