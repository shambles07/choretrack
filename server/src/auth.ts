import crypto from "node:crypto";
import { promisify } from "node:util";
import type { FastifyReply, FastifyRequest } from "fastify";
import type { DB } from "./db.js";
import type { PublicUser, Role } from "../../shared/types.js";

const scrypt = promisify(crypto.scrypt) as (
    password: crypto.BinaryLike,
    salt: crypto.BinaryLike,
    keylen: number,
    options: crypto.ScryptOptions,
) => Promise<Buffer>;

// scrypt is built into Node, so there is no native add-on to compile on a Raspberry Pi.
const SCRYPT = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };
const KEY_LEN = 32;

export const SESSION_COOKIE = "ct_session";
const SESSION_DAYS = 30;

export async function hashSecret(secret: string): Promise<string> {
    const salt = crypto.randomBytes(16);
    const key = await scrypt(secret, salt, KEY_LEN, SCRYPT);
    return `scrypt$${salt.toString("base64")}$${key.toString("base64")}`;
}

export async function verifySecret(secret: string, stored: string | null): Promise<boolean> {
    if (!stored) {
        return false;
    }
    const [scheme, saltB64, keyB64] = stored.split("$");
    if (scheme !== "scrypt" || !saltB64 || !keyB64) {
        return false;
    }
    const expected = Buffer.from(keyB64, "base64");
    const actual = await scrypt(secret, Buffer.from(saltB64, "base64"), expected.length, SCRYPT);
    return crypto.timingSafeEqual(actual, expected);
}

function hashToken(token: string): string {
    return crypto.createHash("sha256").update(token).digest("hex");
}

export function createSession(db: DB, userId: number): { token: string; maxAge: number } {
    const token = crypto.randomBytes(32).toString("base64url");
    const maxAge = SESSION_DAYS * 24 * 60 * 60;
    db.prepare("INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)").run(
        hashToken(token),
        userId,
        Date.now() + maxAge * 1000,
    );
    db.prepare("DELETE FROM sessions WHERE expires_at < ?").run(Date.now());
    return { token, maxAge };
}

export function destroySession(db: DB, token: string | undefined): void {
    if (token) {
        db.prepare("DELETE FROM sessions WHERE token_hash = ?").run(hashToken(token));
    }
}

export function destroyUserSessions(db: DB, userId: number): void {
    db.prepare("DELETE FROM sessions WHERE user_id = ?").run(userId);
}

interface UserRow {
    id: number;
    role: Role;
    name: string;
    username: string | null;
    avatar: string;
    color: string;
    sound_enabled: number;
    active: number;
}

export function toPublicUser(row: UserRow): PublicUser {
    return {
        id: row.id,
        role: row.role,
        name: row.name,
        username: row.username,
        avatar: row.avatar,
        color: row.color,
        soundEnabled: row.sound_enabled === 1,
        active: row.active === 1,
    };
}

export function userFromToken(db: DB, token: string | undefined): PublicUser | null {
    if (!token) {
        return null;
    }
    const row = db
        .prepare(
            `SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id
             WHERE s.token_hash = ? AND s.expires_at > ? AND u.active = 1`,
        )
        .get(hashToken(token), Date.now()) as UserRow | undefined;
    return row ? toPublicUser(row) : null;
}

declare module "fastify" {
    interface FastifyRequest {
        user: PublicUser | null;
    }
}

export async function requireUser(req: FastifyRequest, reply: FastifyReply): Promise<void> {
    if (!req.user) {
        return reply.code(401).send({ error: "Please log in." });
    }
}

export async function requireAdmin(req: FastifyRequest, reply: FastifyReply): Promise<void> {
    if (!req.user) {
        return reply.code(401).send({ error: "Please log in." });
    }
    if (req.user.role !== "admin") {
        return reply.code(403).send({ error: "Only parents can do that." });
    }
}
