import "dotenv/config";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "../db/index.js";
import { bearer } from "better-auth/plugins";

// isProd drives SameSite/Secure cookie attributes.
// Only use NODE_ENV so local dev over HTTP keeps SameSite=Lax / Secure=false.
const isProd = process.env.NODE_ENV === "production";

export const auth = betterAuth({
    database: drizzleAdapter(db, { provider: "pg" }),
    baseURL: process.env.BETTER_AUTH_URL ?? "https://trace-fqbp.onrender.com",
    plugins: [bearer()],
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
            // Disable PKCE — the code_verifier cookie is stored on the backend
            // domain but can be lost between the Google redirect chain in cross-origin
            // setups, causing state_mismatch. GitHub doesn't use PKCE so it works fine.
            disablePkce: true,
        },
    },
    trustedOrigins: [
        "http://localhost:3000",
        "http://localhost:3001",
        "https://traceanalytics.vercel.app",
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
    account: {
        skipStateCookieCheck: true,
        accountLinking: {
            enabled: true,
            trustedProviders: ["google", "github"],
        },
    },
});

