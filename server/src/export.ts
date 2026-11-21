import type { DB } from "./db.js";
import { toPublicUser } from "./auth.js";
import { toChore, type ChoreRow } from "./chores.js";
import { computeStats } from "./gamification.js";
import type { ExportScope } from "./cli.js";

// Builds a JSON-friendly snapshot of the household's data.
// Password and PIN hashes and session tokens are never included.
export function exportData(db: DB, scope: ExportScope, version: string): Record<string, unknown> {
    const users = (db.prepare("SELECT * FROM users ORDER BY role, name").all() as never[]).map(toPublicUser);
    const categories = db.prepare("SELECT id, name, icon, color FROM categories ORDER BY name").all() as {
        id: number;
        name: string;
    }[];
    const categoryName = new Map(categories.map((c) => [c.id, c.name]));
    const userName = new Map(users.map((u) => [u.id, u.name]));

    const out: Record<string, unknown> = {
        app: "choretrack",
        version,
        exportedAt: new Date().toISOString(),
        scope,
    };

    if (scope === "users" || scope === "all") {
        out.users = users.map(({ id, role, name, username, avatar, color, active }) => ({
            id,
            role,
            name,
            username,
            avatar,
            color,
            active,
        }));
    }

    if (scope === "chores" || scope === "all") {
        out.chores = (db.prepare("SELECT * FROM chores WHERE archived = 0 ORDER BY title").all() as ChoreRow[])
            .map(toChore)
            .map((c) => ({ ...c, category: categoryName.get(c.categoryId), assignee: userName.get(c.assigneeId) }));
    }

    if (scope === "scores" || scope === "all") {
        out.scores = users
            .filter((u) => u.role === "doer")
            .map((u) => {
                const s = computeStats(db, u.id);
                return {
                    userId: u.id,
                    name: u.name,
                    level: s.level.level,
                    levelName: s.level.name,
                    xp: s.xp,
                    balance: s.balance,
                    pendingPoints: s.pendingPoints,
                    approvedChores: s.approvedCount,
                    streak: s.streak,
                    bestStreak: s.bestStreak,
                    badges: s.badges.map((b) => ({ key: b.key, name: b.name, earnedAt: b.earnedAt })),
                };
            });
    }

    if (scope === "all") {
        out.categories = categories;
        out.rewards = db.prepare("SELECT id, title, description, cost, icon, active FROM rewards ORDER BY cost").all();
        out.history = db
            .prepare(
                `SELECT i.id, i.date, i.status, i.points_awarded AS pointsAwarded, i.submitted_at AS submittedAt,
                        i.reviewed_at AS reviewedAt, i.note, c.title AS chore, u.name AS doer
                 FROM chore_instances i JOIN chores c ON c.id = i.chore_id JOIN users u ON u.id = i.user_id
                 WHERE i.status != 'todo' ORDER BY i.date, i.id`,
            )
            .all();
        out.redemptions = db
            .prepare(
                `SELECT r.id, w.title AS reward, u.name AS doer, r.cost, r.status,
                        r.requested_at AS requestedAt, r.reviewed_at AS reviewedAt
                 FROM redemptions r JOIN rewards w ON w.id = r.reward_id JOIN users u ON u.id = r.user_id
                 ORDER BY r.requested_at`,
            )
            .all();
    }

    return out;
}
