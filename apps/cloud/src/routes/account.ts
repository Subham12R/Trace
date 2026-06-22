import { Hono } from "hono";
import { requireAuth } from "../lib/middleware.js";

const app = new Hono<{
    Variables: { userId: string; user: { id: string; email: string; name: string } };
}>();

app.get("/", requireAuth, (c) => {
    const user = c.get("user");
    return c.json({ id: user.id, email: user.email, name: user.name });
});

export default app;
