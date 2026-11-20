import Fastify, { type FastifyInstance } from "fastify";
import cookie from "@fastify/cookie";
import rateLimit from "@fastify/rate-limit";
import fastifyStatic from "@fastify/static";
import fs from "node:fs";
import path from "node:path";
import { ZodError } from "zod";
import { openDatabase, type DB } from "./db.js";
import { SESSION_COOKIE, userFromToken } from "./auth.js";
import { publicRoutes } from "./routes/public-routes.js";
import { doerRoutes } from "./routes/doer-routes.js";
import { adminRoutes } from "./routes/admin-routes.js";

export interface AppOptions {
    dbPath: string;
    webDir?: string;
    secureCookies?: boolean;
    logger?: boolean;
}

declare module "fastify" {
    interface FastifyInstance {
        db: DB;
        secureCookies: boolean;
    }
}

export async function buildApp(options: AppOptions): Promise<FastifyInstance> {
    const app = Fastify({ logger: options.logger ?? false, trustProxy: true });
    const db = openDatabase(options.dbPath);
    app.decorate("db", db);
    app.decorate("secureCookies", options.secureCookies ?? false);
    app.addHook("onClose", async () => db.close());

    await app.register(cookie);
    await app.register(rateLimit, { global: false });

    app.decorateRequest("user", null);
    app.addHook("onRequest", async (req) => {
        req.user = userFromToken(db, req.cookies[SESSION_COOKIE]);
    });

    // Basic hardening. Mutating API calls must be JSON, which browsers won't
    // send cross-site without a CORS preflight, so this also blocks CSRF.
    app.addHook("onRequest", async (req, reply) => {
        const mutating = !["GET", "HEAD", "OPTIONS"].includes(req.method);
        if (mutating && req.url.startsWith("/api/")) {
            const type = req.headers["content-type"] ?? "";
            if (!type.startsWith("application/json")) {
                return reply.code(415).send({ error: "Requests must be JSON." });
            }
        }
    });
    app.addHook("onSend", async (_req, reply) => {
        reply.header("X-Content-Type-Options", "nosniff");
        reply.header("X-Frame-Options", "DENY");
        reply.header("Referrer-Policy", "same-origin");
        reply.header(
            "Content-Security-Policy",
            "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; " +
                "connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
        );
    });

    app.setErrorHandler((err, _req, reply) => {
        if (err instanceof ZodError) {
            const first = err.issues[0];
            return reply.code(400).send({ error: `${first.path.join(".") || "input"}: ${first.message}` });
        }
        const status = (err as { statusCode?: number }).statusCode ?? 500;
        if (status >= 500) {
            app.log.error(err);
        }
        return reply.code(status).send({ error: status >= 500 ? "Something went wrong." : (err as Error).message });
    });

    await app.register(publicRoutes, { prefix: "/api" });
    await app.register(doerRoutes, { prefix: "/api/doer" });
    await app.register(adminRoutes, { prefix: "/api/admin" });

    const webDir = options.webDir;
    if (webDir && fs.existsSync(path.join(webDir, "index.html"))) {
        await app.register(fastifyStatic, { root: webDir, wildcard: false });
        // Single-page app: any non-API path serves index.html.
        app.setNotFoundHandler((req, reply) => {
            if (req.url.startsWith("/api/") || req.method !== "GET") {
                return reply.code(404).send({ error: "Not found." });
            }
            return reply.type("text/html").sendFile("index.html");
        });
    } else {
        app.setNotFoundHandler((_req, reply) => reply.code(404).send({ error: "Not found." }));
    }

    return app;
}
