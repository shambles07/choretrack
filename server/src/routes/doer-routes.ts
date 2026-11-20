import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { HttpError } from "../errors.js";
import { addDays, nowIso, today } from "../dates.js";
import { INSTANCE_SELECT, ensureInstances, toInstance, type InstanceRow } from "../chores.js";
import { acknowledgeCelebration, computeStats, pendingCelebration } from "../gamification.js";
import type { DoerDashboard, Redemption, Reward } from "../../../shared/types.js";

const idParam = z.object({ id: z.coerce.number().int().positive() });

async function requireDoer(req: FastifyRequest, reply: FastifyReply): Promise<void> {
    if (!req.user) {
        return reply.code(401).send({ error: "Please log in." });
    }
    if (req.user.role !== "doer") {
        return reply.code(403).send({ error: "This page is for chore doers." });
    }
}

export const REDEMPTION_SELECT = `
    SELECT r.id, r.reward_id, r.user_id, r.cost, r.status, r.requested_at, r.reviewed_at,
           w.title AS reward_title, w.icon AS reward_icon, u.name AS user_name
    FROM redemptions r
    JOIN rewards w ON w.id = r.reward_id
    JOIN users u ON u.id = r.user_id
`;

export interface RedemptionRow {
    id: number;
    reward_id: number;
    user_id: number;
    cost: number;
    status: Redemption["status"];
    requested_at: string;
    reviewed_at: string | null;
    reward_title: string;
    reward_icon: string;
    user_name: string;
}

export function toRedemption(r: RedemptionRow): Redemption {
    return {
        id: r.id,
        rewardId: r.reward_id,
        userId: r.user_id,
        cost: r.cost,
        status: r.status,
        requestedAt: r.requested_at,
        reviewedAt: r.reviewed_at,
        rewardTitle: r.reward_title,
        rewardIcon: r.reward_icon,
        userName: r.user_name,
    };
}

export interface RewardRow {
    id: number;
    title: string;
    description: string;
    cost: number;
    icon: string;
    active: number;
}

export function toReward(r: RewardRow): Reward {
    return { id: r.id, title: r.title, description: r.description, cost: r.cost, icon: r.icon, active: r.active === 1 };
}

export async function doerRoutes(app: FastifyInstance): Promise<void> {
    const db = app.db;
    app.addHook("preHandler", requireDoer);

    function ownInstance(id: number, userId: number): InstanceRow {
        const row = db.prepare(`${INSTANCE_SELECT} WHERE i.id = ? AND i.user_id = ?`).get(id, userId) as
            | InstanceRow
            | undefined;
        if (!row) {
            throw new HttpError(404, "Chore not found.");
        }
        return row;
    }

    app.get("/dashboard", async (req): Promise<DoerDashboard> => {
        const userId = req.user!.id;
        const now = today();
        ensureInstances(db, addDays(now, -14), addDays(now, 6), userId);
        const list = (where: string, ...params: unknown[]) =>
            (
                db
                    .prepare(`${INSTANCE_SELECT} WHERE i.user_id = ? AND c.archived = 0 AND ${where}`)
                    .all(userId, ...params) as InstanceRow[]
            ).map(toInstance);
        const stats = computeStats(db, userId);
        return {
            today: now,
            stats,
            todayChores: list("i.date = ? ORDER BY c.due_time IS NULL, c.due_time, c.title", now),
            overdue: list(
                `i.date < ? AND (i.status = 'rejected' OR (i.status = 'todo' AND c.recurrence = 'once' AND c.active = 1))
                 ORDER BY i.date`,
                now,
            ),
            upcoming: list(
                "i.date > ? AND i.date <= ? AND i.status = 'todo' AND c.active = 1 ORDER BY i.date, c.title",
                now,
                addDays(now, 6),
            ),
            celebration: pendingCelebration(db, userId, stats),
        };
    });

    app.post("/instances/:id/complete", async (req) => {
        const { id } = idParam.parse(req.params);
        const row = ownInstance(id, req.user!.id);
        if (row.date > today()) {
            throw new HttpError(400, "That chore isn't due yet.");
        }
        if (row.status !== "todo" && row.status !== "rejected") {
            throw new HttpError(409, "That chore is already done.");
        }
        db.prepare("UPDATE chore_instances SET status = 'submitted', submitted_at = ?, note = NULL WHERE id = ?").run(
            nowIso(),
            id,
        );
        return { instance: toInstance(ownInstance(id, req.user!.id)), stats: computeStats(db, req.user!.id) };
    });

    app.post("/instances/:id/undo", async (req) => {
        const { id } = idParam.parse(req.params);
        const row = ownInstance(id, req.user!.id);
        if (row.status !== "submitted") {
            throw new HttpError(409, "Only chores waiting for approval can be undone.");
        }
        db.prepare("UPDATE chore_instances SET status = 'todo', submitted_at = NULL WHERE id = ?").run(id);
        return { instance: toInstance(ownInstance(id, req.user!.id)), stats: computeStats(db, req.user!.id) };
    });

    app.post("/celebration/ack", async (req) => {
        acknowledgeCelebration(db, req.user!.id);
        return { ok: true };
    });

    app.get("/rewards", async (req) => {
        const rewards = (db.prepare("SELECT * FROM rewards WHERE active = 1 ORDER BY cost").all() as RewardRow[]).map(
            toReward,
        );
        const redemptions = (
            db
                .prepare(`${REDEMPTION_SELECT} WHERE r.user_id = ? ORDER BY r.requested_at DESC LIMIT 30`)
                .all(req.user!.id) as RedemptionRow[]
        ).map(toRedemption);
        return { rewards, redemptions, stats: computeStats(db, req.user!.id) };
    });

    app.post("/rewards/:id/redeem", async (req) => {
        const { id } = idParam.parse(req.params);
        const userId = req.user!.id;
        const reward = db.prepare("SELECT * FROM rewards WHERE id = ? AND active = 1").get(id) as RewardRow | undefined;
        if (!reward) {
            throw new HttpError(404, "Reward not found.");
        }
        db.transaction(() => {
            if (computeStats(db, userId).balance < reward.cost) {
                throw new HttpError(400, "Not enough points yet. Keep going!");
            }
            db.prepare("INSERT INTO redemptions (reward_id, user_id, cost) VALUES (?, ?, ?)").run(id, userId, reward.cost);
        })();
        return { stats: computeStats(db, userId) };
    });

    app.post("/redemptions/:id/cancel", async (req) => {
        const { id } = idParam.parse(req.params);
        const result = db
            .prepare("DELETE FROM redemptions WHERE id = ? AND user_id = ? AND status = 'pending'")
            .run(id, req.user!.id);
        if (result.changes === 0) {
            throw new HttpError(409, "That request can't be cancelled.");
        }
        return { stats: computeStats(db, req.user!.id) };
    });
}
