import "dotenv/config";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { auth } from "./lib/auth.js";
import accountRoutes from "./routes/account.js";
import deviceRoutes from "./routes/devices.js";
import syncRoutes from "./routes/sync.js";
import metricsRoutes from "./routes/metrics.js";

type Variables = {
    userId: string;
    user: { id: string; email: string; name: string };
};

const app = new Hono<{ Variables: Variables }>();

app.use("*", logger());
app.use(
    "*",
    cors({
        origin: [
            "http://localhost:3000",
            "http://localhost:3001",
            "https://traceanalytics.vercel.app",
            "https://trace-fqbp.onrender.com",
        ],
        allowHeaders: ["Content-Type", "Authorization", "X-Device-Id"],
        allowMethods: ["GET", "POST", "DELETE", "OPTIONS"],
        credentials: true,
    })
);

app.get("/health", (c) => c.json({ status: "ok", ts: new Date().toISOString() }));

// Better Auth handles all /api/auth/** routes automatically
app.on(["GET", "POST"], "/api/auth/**", (c) => auth.handler(c.req.raw));

app.route("/account", accountRoutes);
app.route("/devices", deviceRoutes);
app.route("/sync", syncRoutes);
app.route("/api/metrics", metricsRoutes);

const port = Number(process.env.PORT ?? 3001);

serve({ fetch: app.fetch, port }, (info) => {
    console.log(`Trace Cloud running on http://localhost:${info.port}`);
});
