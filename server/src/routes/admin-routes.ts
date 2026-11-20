import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { HttpError } from "../errors.js";
import { destroyUserSessions, hashSecret, requireAdmin, toPublicUser, verifySecret } from "../auth.js";
import { addDays, nowIso, today } from "../dates.js";
import {
    INSTANCE_SELECT,
    clearFutureInstances,
    ensureInstances,
    toChore,
    toInstance,
    type ChoreRow,
    type InstanceRow,
} from "../chores.js";
import { awardBadges, computeStats } from "../gamification.js";
import { colorSchema, iconSchema, passwordSchema, pinSchema } from "./public-routes.js";
import { REDEMPTION_SELECT, toRedemption, toReward, type RedemptionRow, type RewardRow } from "./doer-routes.js";
import type { PublicUser } from "../../../shared/types.js";

const idParam = z.object({ id: z.coerce.number().int().positive() });
const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "must be a date (YYYY-MM-DD)");
const timeSchema = z.string().regex(/^\d{2}:\d{2}$/, "must be a time (HH:MM)");

const userSchema = z.object({
    role: z.enum(["admin", "doer"]),
    name: z.string().trim().min(1).max(60),
    username: z
        .string()
        .trim()
        .min(2)
        .max(40)
        .regex(/^[a-zA-Z0-9._-]+$/, "may only use letters, numbers, . _ -")
        .optional(),
    password: passwordSchema.optional(),
    pin: pinSchema.optional(),
    avatar: iconSchema.default("star"),
    color: colorSchema.default("#6366f1"),
});

const userUpdateSchema = z.object({
    name: z.string().trim().min(1).max(60).optional(),
    username: z
        .string()
        .trim()
        .min(2)
        .max(40)
        .regex(/^[a-zA-Z0-9._-]+$/)
        .optional(),
    password: passwordSchema.optional(),
    pin: pinSchema.optional(),
    avatar: iconSchema.optional(),
    color: colorSchema.optional(),
    active: z.boolean().optional(),
});

const choreSchema = z
    .object({
        title: z.string().trim().min(1).max(80),
        description: z.string().trim().max(500).default(""),
        categoryId: z.number().int().positive(),
        points: z.number().int().min(0).max(1000),
        assigneeId: z.number().int().positive(),
        recurrence: z.enum(["once", "daily", "weekly"]),
        daysOfWeek: z.array(z.number().int().min(0).max(6)).max(7).default([]),
        startDate: dateSchema.optional(),
        dueDate: dateSchema.nullable().optional(),
        dueTime: timeSchema.nullable().optional(),
        active: z.boolean().default(true),
    })
    .refine((c) => c.recurrence !== "weekly" || c.daysOfWeek.length > 0, {
        message: "pick at least one day",
        path: ["daysOfWeek"],
    });

const categorySchema = z.object({
    name: z.string().trim().min(1).max(40),
    icon: iconSchema,
    color: colorSchema,
});

const rewardSchema = z.object({
    title: z.string().trim().min(1).max(80),
    description: z.string().trim().max(300).default(""),
    cost: z.number().int().min(1).max(100000),
    icon: iconSchema.default("gift"),
    active: z.boolean().default(true),
});

export async function adminRoutes(app: FastifyInstance): Promise<void> {
    const db = app.db;
    app.addHook("preHandler", requireAdmin);

    function getUser(id: number): PublicUser {
        const row = db.prepare("SELECT * FROM users WHERE id = ?").get(id);
        if (!row) {
            throw new HttpError(404, "Person not found.");
        }
        return toPublicUser(row as never);
    }

    function assertDoer(id: number): void {
        const row = db.prepare("SELECT role FROM users WHERE id = ?").get(id) as { role: string } | undefined;
        if (!row || row.role !== "doer") {
            throw new HttpError(400, "Chores can only be assigned to chore doers.");
        }
    }

    function assertCategory(id: number): void {
        if (!db.prepare("SELECT 1 FROM categories WHERE id = ?").get(id)) {
            throw new HttpError(400, "That category doesn't exist.");
        }
    }

    function activeAdminCount(): number {
        return (db.prepare("SELECT COUNT(*) AS n FROM users WHERE role = 'admin' AND active = 1").get() as { n: number })
            .n;
    }

    function getInstance(id: number): InstanceRow {
        const row = db.prepare(`${INSTANCE_SELECT} WHERE i.id = ?`).get(id) as InstanceRow | undefined;
        if (!row) {
            throw new HttpError(404, "Chore not found.");
        }
        return row;
    }

    // ---------------------------------------------------------------- overview

    app.get("/overview", async () => {
        const now = today();
        ensureInstances(db, addDays(now, -14), addDays(now, 6));
        const doers = (
            db.prepare("SELECT * FROM users WHERE role = 'doer' AND active = 1 ORDER BY name").all() as never[]
        ).map(toPublicUser);
        const summaries = doers.map((user) => {
            const counts = db
                .prepare(
                    `SELECT COUNT(*) AS total,
                            COALESCE(SUM(i.status = 'approved'), 0) AS approved,
                            COALESCE(SUM(i.status = 'submitted'), 0) AS submitted
                     FROM chore_instances i JOIN chores c ON c.id = i.chore_id
                     WHERE i.user_id = ? AND i.date = ? AND c.archived = 0`,
                )
                .get(user.id, now) as { total: number; approved: number; submitted: number };
            return { user, stats: computeStats(db, user.id), today: counts };
        });
        const approvals = (
            db
                .prepare(`${INSTANCE_SELECT} WHERE i.status = 'submitted' ORDER BY i.submitted_at`)
                .all() as InstanceRow[]
        ).map(toInstance);
        const redemptions = (
            db
                .prepare(`${REDEMPTION_SELECT} WHERE r.status = 'pending' ORDER BY r.requested_at`)
                .all() as RedemptionRow[]
        ).map(toRedemption);
        return { today: now, doers: summaries, approvals, redemptions };
    });

    // -------------------------------------------------------------- approvals

    app.post("/instances/:id/approve", async (req) => {
        const { id } = idParam.parse(req.params);
        const body = z.object({ points: z.number().int().min(0).max(1000).optional() }).parse(req.body ?? {});
        const row = getInstance(id);
        if (row.status === "approved") {
            throw new HttpError(409, "Already approved.");
        }
        if (row.date > today()) {
            throw new HttpError(400, "That chore isn't due yet.");
        }
        db.transaction(() => {
            db.prepare(
                `UPDATE chore_instances
                 SET status = 'approved', points_awarded = ?, reviewed_at = ?, reviewed_by = ?, note = NULL, seen = 0,
                     submitted_at = COALESCE(submitted_at, ?)
                 WHERE id = ?`,
            ).run(body.points ?? row.points, nowIso(), req.user!.id, nowIso(), id);
            awardBadges(db, row.user_id);
        })();
        return { instance: toInstance(getInstance(id)) };
    });

    app.post("/instances/:id/reject", async (req) => {
        const { id } = idParam.parse(req.params);
        const body = z.object({ note: z.string().trim().max(200).optional() }).parse(req.body ?? {});
        const row = getInstance(id);
        if (row.status !== "submitted") {
            throw new HttpError(409, "Only chores waiting for approval can be sent back.");
        }
        db.prepare(
            `UPDATE chore_instances
             SET status = 'rejected', note = ?, reviewed_at = ?, reviewed_by = ?, seen = 0
             WHERE id = ?`,
        ).run(body.note || null, nowIso(), req.user!.id, id);
        return { instance: toInstance(getInstance(id)) };
    });

    // Puts a reviewed chore back in the approval queue (the parent's "Undo").
    app.post("/instances/:id/unreview", async (req) => {
        const { id } = idParam.parse(req.params);
        const row = getInstance(id);
        if (row.status !== "approved" && row.status !== "rejected") {
            throw new HttpError(409, "That chore hasn't been reviewed.");
        }
        db.prepare(
            `UPDATE chore_instances
             SET status = 'submitted', points_awarded = 0, reviewed_at = NULL, reviewed_by = NULL,
                 note = NULL, seen = 1, submitted_at = COALESCE(submitted_at, ?)
             WHERE id = ?`,
        ).run(nowIso(), id);
        return { instance: toInstance(getInstance(id)) };
    });

    // Undo an approval or rejection made by mistake.
    app.post("/instances/:id/reset", async (req) => {
        const { id } = idParam.parse(req.params);
        getInstance(id);
        db.prepare(
            `UPDATE chore_instances
             SET status = 'todo', points_awarded = 0, reviewed_at = NULL, reviewed_by = NULL,
                 submitted_at = NULL, note = NULL, seen = 1
             WHERE id = ?`,
        ).run(id);
        return { instance: toInstance(getInstance(id)) };
    });

    app.get("/instances", async (req) => {
        const query = z
            .object({
                from: dateSchema.optional(),
                to: dateSchema.optional(),
                userId: z.coerce.number().int().positive().optional(),
            })
            .parse(req.query);
        const now = today();
        const from = query.from ?? addDays(now, -6);
        const to = query.to ?? now;
        if (to < from || addDays(from, 92) < to) {
            throw new HttpError(400, "Pick a date range of up to three months.");
        }
        ensureInstances(db, from, to < addDays(now, 30) ? to : addDays(now, 30));
        const rows = (
            query.userId
                ? db
                      .prepare(
                          `${INSTANCE_SELECT} WHERE i.date BETWEEN ? AND ? AND i.user_id = ? ORDER BY i.date DESC, c.title`,
                      )
                      .all(from, to, query.userId)
                : db
                      .prepare(`${INSTANCE_SELECT} WHERE i.date BETWEEN ? AND ? ORDER BY i.date DESC, c.title`)
                      .all(from, to)
        ) as InstanceRow[];
        return { instances: rows.map(toInstance) };
    });

    // ------------------------------------------------------------------ people

    app.get("/users", async () => {
        const users = (db.prepare("SELECT * FROM users ORDER BY role, name").all() as never[]).map(toPublicUser);
        return { users };
    });

    app.post("/users", async (req) => {
        const body = userSchema.parse(req.body);
        if (body.role === "admin" && (!body.username || !body.password)) {
            throw new HttpError(400, "Parents need a username and password.");
        }
        if (body.role === "doer" && !body.pin) {
            throw new HttpError(400, "Chore doers need a 4-digit PIN.");
        }
        if (body.username && db.prepare("SELECT 1 FROM users WHERE username = ?").get(body.username)) {
            throw new HttpError(409, "That username is taken.");
        }
        const result = db
            .prepare(
                `INSERT INTO users (role, name, username, password_hash, pin_hash, avatar, color)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
            )
            .run(
                body.role,
                body.name,
                body.role === "admin" ? body.username : null,
                body.role === "admin" ? await hashSecret(body.password!) : null,
                body.role === "doer" ? await hashSecret(body.pin!) : null,
                body.avatar,
                body.color,
            );
        return { user: getUser(Number(result.lastInsertRowid)) };
    });

    app.patch("/users/:id", async (req) => {
        const { id } = idParam.parse(req.params);
        const body = userUpdateSchema.parse(req.body);
        const user = getUser(id);
        if (body.active === false && user.role === "admin" && user.active && activeAdminCount() <= 1) {
            throw new HttpError(400, "You need at least one active parent account.");
        }
        if (body.active === false && id === req.user!.id) {
            throw new HttpError(400, "You can't deactivate yourself.");
        }
        if (body.username && user.role === "admin") {
            const clash = db.prepare("SELECT id FROM users WHERE username = ? AND id != ?").get(body.username, id);
            if (clash) {
                throw new HttpError(409, "That username is taken.");
            }
        }
        const sets: string[] = [];
        const values: unknown[] = [];
        const set = (column: string, value: unknown) => {
            sets.push(`${column} = ?`);
            values.push(value);
        };
        if (body.name !== undefined) set("name", body.name);
        if (body.avatar !== undefined) set("avatar", body.avatar);
        if (body.color !== undefined) set("color", body.color);
        if (body.active !== undefined) set("active", body.active ? 1 : 0);
        if (user.role === "admin" && body.username !== undefined) set("username", body.username);
        if (user.role === "admin" && body.password) set("password_hash", await hashSecret(body.password));
        if (user.role === "doer" && body.pin) set("pin_hash", await hashSecret(body.pin));
        if (sets.length > 0) {
            db.prepare(`UPDATE users SET ${sets.join(", ")} WHERE id = ?`).run(...values, id);
        }
        const secretChanged = Boolean(body.password || body.pin);
        if (body.active === false || (secretChanged && id !== req.user!.id)) {
            destroyUserSessions(db, id);
        }
        return { user: getUser(id) };
    });

    app.delete("/users/:id", async (req) => {
        const { id } = idParam.parse(req.params);
        const user = getUser(id);
        if (id === req.user!.id) {
            throw new HttpError(400, "You can't delete your own account.");
        }
        if (user.role === "admin" && user.active && activeAdminCount() <= 1) {
            throw new HttpError(400, "You need at least one active parent account.");
        }
        db.prepare("DELETE FROM users WHERE id = ?").run(id);
        return { ok: true };
    });

    app.post("/me/password", async (req) => {
        const body = z.object({ current: z.string().min(1), next: passwordSchema }).parse(req.body);
        const row = db.prepare("SELECT password_hash FROM users WHERE id = ?").get(req.user!.id) as {
            password_hash: string;
        };
        if (!(await verifySecret(body.current, row.password_hash))) {
            throw new HttpError(400, "Your current password isn't right.");
        }
        db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(await hashSecret(body.next), req.user!.id);
        return { ok: true };
    });

    // ------------------------------------------------------------------ chores

    app.get("/chores", async () => {
        const chores = (
            db.prepare("SELECT * FROM chores WHERE archived = 0 ORDER BY active DESC, title").all() as ChoreRow[]
        ).map(toChore);
        return { chores };
    });

    app.post("/chores", async (req) => {
        const body = choreSchema.parse(req.body);
        assertDoer(body.assigneeId);
        assertCategory(body.categoryId);
        const start = body.startDate ?? today();
        const result = db
            .prepare(
                `INSERT INTO chores (title, description, category_id, points, assignee_id, recurrence,
                                     days_of_week, start_date, due_date, due_time, active)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            )
            .run(
                body.title,
                body.description,
                body.categoryId,
                body.points,
                body.assigneeId,
                body.recurrence,
                body.recurrence === "weekly" ? [...new Set(body.daysOfWeek)].sort().join(",") : "",
                start,
                body.recurrence === "once" ? (body.dueDate ?? start) : null,
                body.dueTime ?? null,
                body.active ? 1 : 0,
            );
        const chore = db.prepare("SELECT * FROM chores WHERE id = ?").get(result.lastInsertRowid) as ChoreRow;
        return { chore: toChore(chore) };
    });

    app.put("/chores/:id", async (req) => {
        const { id } = idParam.parse(req.params);
        const body = choreSchema.parse(req.body);
        const existing = db.prepare("SELECT * FROM chores WHERE id = ? AND archived = 0").get(id) as
            | ChoreRow
            | undefined;
        if (!existing) {
            throw new HttpError(404, "Chore not found.");
        }
        assertDoer(body.assigneeId);
        assertCategory(body.categoryId);
        const start = body.startDate ?? existing.start_date;
        db.transaction(() => {
            db.prepare(
                `UPDATE chores SET title = ?, description = ?, category_id = ?, points = ?, assignee_id = ?,
                        recurrence = ?, days_of_week = ?, start_date = ?, due_date = ?, due_time = ?, active = ?
                 WHERE id = ?`,
            ).run(
                body.title,
                body.description,
                body.categoryId,
                body.points,
                body.assigneeId,
                body.recurrence,
                body.recurrence === "weekly" ? [...new Set(body.daysOfWeek)].sort().join(",") : "",
                start,
                body.recurrence === "once" ? (body.dueDate ?? start) : null,
                body.dueTime ?? null,
                body.active ? 1 : 0,
                id,
            );
            // Regenerate not-yet-started occurrences from today on with the new schedule.
            clearFutureInstances(db, id, today());
            if (body.recurrence === "once") {
                // A one-off chore moved to a new date shouldn't linger on its old one.
                db.prepare("DELETE FROM chore_instances WHERE chore_id = ? AND status = 'todo'").run(id);
            }
            if (existing.assignee_id !== body.assigneeId) {
                db.prepare("UPDATE chore_instances SET user_id = ? WHERE chore_id = ? AND status = 'todo'").run(
                    body.assigneeId,
                    id,
                );
            }
        })();
        return { chore: toChore(db.prepare("SELECT * FROM chores WHERE id = ?").get(id) as ChoreRow) };
    });

    // Chores with approved history are archived rather than deleted, so earned points stay.
    app.delete("/chores/:id", async (req) => {
        const { id } = idParam.parse(req.params);
        db.transaction(() => {
            db.prepare("DELETE FROM chore_instances WHERE chore_id = ? AND status != 'approved'").run(id);
            const history = db.prepare("SELECT 1 FROM chore_instances WHERE chore_id = ? LIMIT 1").get(id);
            if (history) {
                db.prepare("UPDATE chores SET archived = 1, active = 0 WHERE id = ?").run(id);
            } else {
                db.prepare("DELETE FROM chores WHERE id = ?").run(id);
            }
        })();
        return { ok: true };
    });

    // -------------------------------------------------------------- categories

    app.post("/categories", async (req) => {
        const body = categorySchema.parse(req.body);
        const result = db
            .prepare("INSERT INTO categories (name, icon, color) VALUES (?, ?, ?)")
            .run(body.name, body.icon, body.color);
        return { category: { id: Number(result.lastInsertRowid), ...body } };
    });

    app.put("/categories/:id", async (req) => {
        const { id } = idParam.parse(req.params);
        const body = categorySchema.parse(req.body);
        const result = db
            .prepare("UPDATE categories SET name = ?, icon = ?, color = ? WHERE id = ?")
            .run(body.name, body.icon, body.color, id);
        if (result.changes === 0) {
            throw new HttpError(404, "Category not found.");
        }
        return { category: { id, ...body } };
    });

    app.delete("/categories/:id", async (req) => {
        const { id } = idParam.parse(req.params);
        if (db.prepare("SELECT 1 FROM chores WHERE category_id = ? LIMIT 1").get(id)) {
            throw new HttpError(409, "Move this category's chores to another category first.");
        }
        db.prepare("DELETE FROM categories WHERE id = ?").run(id);
        return { ok: true };
    });

    // ----------------------------------------------------------------- rewards

    app.get("/rewards", async () => {
        const rewards = (db.prepare("SELECT * FROM rewards ORDER BY active DESC, cost").all() as RewardRow[]).map(
            toReward,
        );
        const redemptions = (
            db.prepare(`${REDEMPTION_SELECT} ORDER BY r.requested_at DESC LIMIT 50`).all() as RedemptionRow[]
        ).map(toRedemption);
        return { rewards, redemptions };
    });

    app.post("/rewards", async (req) => {
        const body = rewardSchema.parse(req.body);
        const result = db
            .prepare("INSERT INTO rewards (title, description, cost, icon, active) VALUES (?, ?, ?, ?, ?)")
            .run(body.title, body.description, body.cost, body.icon, body.active ? 1 : 0);
        return { reward: toReward(db.prepare("SELECT * FROM rewards WHERE id = ?").get(result.lastInsertRowid) as RewardRow) };
    });

    app.put("/rewards/:id", async (req) => {
        const { id } = idParam.parse(req.params);
        const body = rewardSchema.parse(req.body);
        const result = db
            .prepare("UPDATE rewards SET title = ?, description = ?, cost = ?, icon = ?, active = ? WHERE id = ?")
            .run(body.title, body.description, body.cost, body.icon, body.active ? 1 : 0, id);
        if (result.changes === 0) {
            throw new HttpError(404, "Reward not found.");
        }
        return { reward: toReward(db.prepare("SELECT * FROM rewards WHERE id = ?").get(id) as RewardRow) };
    });

    app.delete("/rewards/:id", async (req) => {
        const { id } = idParam.parse(req.params);
        if (db.prepare("SELECT 1 FROM redemptions WHERE reward_id = ? LIMIT 1").get(id)) {
            // Keep it for the history; just hide it from the shop.
            db.prepare("UPDATE rewards SET active = 0 WHERE id = ?").run(id);
        } else {
            db.prepare("DELETE FROM rewards WHERE id = ?").run(id);
        }
        return { ok: true };
    });

    app.post("/redemptions/:id/:decision", async (req) => {
        const { id, decision } = z
            .object({ id: z.coerce.number().int().positive(), decision: z.enum(["approve", "deny"]) })
            .parse(req.params);
        const result = db
            .prepare(
                `UPDATE redemptions SET status = ?, reviewed_at = ?, reviewed_by = ?, seen = 0
                 WHERE id = ? AND status = 'pending'`,
            )
            .run(decision === "approve" ? "approved" : "denied", nowIso(), req.user!.id, id);
        if (result.changes === 0) {
            throw new HttpError(409, "That request was already handled.");
        }
        return { ok: true };
    });
}
