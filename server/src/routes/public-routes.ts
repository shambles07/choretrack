import type { FastifyInstance, FastifyReply } from "fastify";
import { z } from "zod";
import {
    SESSION_COOKIE,
    createSession,
    destroySession,
    hashSecret,
    requireUser,
    toPublicUser,
    verifySecret,
} from "../auth.js";
import { HttpError } from "../errors.js";
import type { Category, DoerProfile } from "../../../shared/types.js";

export const passwordSchema = z.string().min(8, "must be at least 8 characters").max(200);
export const pinSchema = z.string().regex(/^\d{4}$/, "must be 4 digits");
export const colorSchema = z.string().regex(/^#[0-9a-fA-F]{6}$/, "must be a hex colour");
export const iconSchema = z.string().regex(/^[a-z0-9-]{1,40}$/, "is not a valid icon");

const setupSchema = z.object({
    name: z.string().trim().min(1).max(60),
    username: z.string().trim().min(2).max(40).regex(/^[a-zA-Z0-9._-]+$/, "may only use letters, numbers, . _ -"),
    password: passwordSchema,
});

const loginSchema = z.object({
    username: z.string().trim().min(1).max(40),
    password: z.string().min(1).max(200),
});

const pinLoginSchema = z.object({
    userId: z.number().int().positive(),
    pin: z.string().min(1).max(10),
});

// Slows down PIN and password guessing. LOGIN_RATE_LIMIT exists for automated tests.
const LOGIN_LIMIT = {
    config: { rateLimit: { max: Number(process.env.LOGIN_RATE_LIMIT ?? 10), timeWindow: "1 minute" } },
};

export async function publicRoutes(app: FastifyInstance): Promise<void> {
    const db = app.db;

    function startSession(reply: FastifyReply, userId: number): void {
        const { token, maxAge } = createSession(db, userId);
        reply.setCookie(SESSION_COOKIE, token, {
            path: "/",
            httpOnly: true,
            sameSite: "lax",
            secure: app.secureCookies,
            maxAge,
        });
    }

    function userCount(): number {
        return (db.prepare("SELECT COUNT(*) AS n FROM users").get() as { n: number }).n;
    }

    app.get("/health", async () => ({ ok: true }));

    app.get("/setup", async () => ({ needsSetup: userCount() === 0 }));

    app.post("/setup", LOGIN_LIMIT, async (req, reply) => {
        if (userCount() > 0) {
            throw new HttpError(409, "Setup has already been completed.");
        }
        const body = setupSchema.parse(req.body);
        const result = db
            .prepare(
                "INSERT INTO users (role, name, username, password_hash, avatar, color) VALUES ('admin', ?, ?, ?, 'crown', '#6366f1')",
            )
            .run(body.name, body.username, await hashSecret(body.password));
        const id = Number(result.lastInsertRowid);
        startSession(reply, id);
        return { user: toPublicUser(db.prepare("SELECT * FROM users WHERE id = ?").get(id) as never) };
    });

    // The "Who's doing chores?" picker on the login screen.
    app.get("/auth/doers", async (): Promise<{ doers: DoerProfile[] }> => {
        const doers = db
            .prepare("SELECT id, name, avatar, color FROM users WHERE role = 'doer' AND active = 1 ORDER BY name")
            .all() as DoerProfile[];
        return { doers };
    });

    app.post("/auth/login", LOGIN_LIMIT, async (req, reply) => {
        const body = loginSchema.parse(req.body);
        const row = db
            .prepare("SELECT * FROM users WHERE username = ? AND role = 'admin' AND active = 1")
            .get(body.username) as { id: number; password_hash: string } | undefined;
        // Hash even when the user doesn't exist so response time doesn't reveal usernames.
        const ok = await verifySecret(body.password, row?.password_hash ?? (await hashSecret("dummy-password")));
        if (!row || !ok) {
            throw new HttpError(401, "Wrong username or password.");
        }
        startSession(reply, row.id);
        return { user: toPublicUser(row as never) };
    });

    app.post("/auth/pin", LOGIN_LIMIT, async (req, reply) => {
        const body = pinLoginSchema.parse(req.body);
        const row = db
            .prepare("SELECT * FROM users WHERE id = ? AND role = 'doer' AND active = 1")
            .get(body.userId) as { id: number; pin_hash: string } | undefined;
        if (!row || !(await verifySecret(body.pin, row.pin_hash))) {
            throw new HttpError(401, "That PIN isn't right. Try again!");
        }
        startSession(reply, row.id);
        return { user: toPublicUser(row as never) };
    });

    app.post("/auth/logout", async (req, reply) => {
        destroySession(db, req.cookies[SESSION_COOKIE]);
        reply.clearCookie(SESSION_COOKIE, { path: "/" });
        return { ok: true };
    });

    app.get("/auth/me", async (req) => ({ user: req.user }));

    // Lets anyone signed in change their own sound setting, name, avatar and colour.
    app.patch("/me", { preHandler: requireUser }, async (req) => {
        const body = z
            .object({
                soundEnabled: z.boolean().optional(),
                name: z.string().trim().min(1, "cannot be blank").max(60).optional(),
                avatar: iconSchema.optional(),
                color: colorSchema.optional(),
            })
            .parse(req.body);
        const sets: string[] = [];
        const values: unknown[] = [];
        if (body.soundEnabled !== undefined) {
            sets.push("sound_enabled = ?");
            values.push(body.soundEnabled ? 1 : 0);
        }
        for (const key of ["name", "avatar", "color"] as const) {
            if (body[key] !== undefined) {
                sets.push(`${key} = ?`);
                values.push(body[key]);
            }
        }
        if (sets.length > 0) {
            db.prepare(`UPDATE users SET ${sets.join(", ")} WHERE id = ?`).run(...values, req.user!.id);
        }
        return { user: toPublicUser(db.prepare("SELECT * FROM users WHERE id = ?").get(req.user!.id) as never) };
    });

    app.get("/categories", { preHandler: requireUser }, async (): Promise<{ categories: Category[] }> => {
        const categories = db.prepare("SELECT id, name, icon, color FROM categories ORDER BY name").all() as Category[];
        return { categories };
    });
}
