import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "../db/index.js";

const isProd = process.env.NODE_ENV === "production" || !(process.env.BETTER_AUTH_URL ?? "").includes("localhost");

export const auth = betterAuth({
    database: drizzleAdapter(db, { provider: "pg" }),
    emailAndPassword: { enabled: true },
    socialProviders: {
        github: {
            clientId: process.env.GITHUB_CLIENT_ID!,
            clientSecret: process.env.GITHUB_CLIENT_SECRET!,
            redirectURI: `${process.env.BETTER_AUTH_URL ?? "https://trace-fqbp.onrender.com"}/api/auth/callback/github`,
        },
        google: {
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
            redirectURI: `${process.env.BETTER_AUTH_URL ?? "https://trace-fqbp.onrender.com"}/api/auth/callback/google`,
        },
    },
    trustedOrigins: [
        "http://localhost:3000",
        "http://localhost:3001",
        "https://traceanalytics.vercel.app",
        "https://cloud.trace.app",
        "https://trace-fqbp.onrender.com",
        "trace://",
    ],
    session: {
        expiresIn: 60 * 60 * 24 * 30,
        updateAge: 60 * 60 * 24,
    },
    advanced: {
        defaultCookieAttributes: {
            sameSite: isProd ? "none" : "lax",
            secure: isProd,
        },
    },
});
