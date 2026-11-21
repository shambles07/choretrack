import type { DB } from "./db.js";
import { today } from "./dates.js";
import { BADGES, levelFor, type Celebration, type DoerStats, type EarnedBadge } from "../../shared/types.js";

interface DayRow {
    date: string;
    total: number;
    approved: number;
    submitted: number;
}

// A day counts toward the streak when every chore that day is approved.
// Days that are only waiting on a parent's approval neither count nor break it,
// and today never breaks it because there's still time left.
export function computeStreaks(db: DB, userId: number): { current: number; best: number } {
    const days = db
        .prepare(
            `SELECT date,
                    COUNT(*) AS total,
                    SUM(status = 'approved') AS approved,
                    SUM(status = 'submitted') AS submitted
             FROM chore_instances
             WHERE user_id = ? AND date <= ?
             GROUP BY date ORDER BY date`,
        )
        .all(userId, today()) as DayRow[];
    const now = today();
    let run = 0;
    let best = 0;
    for (const day of days) {
        if (day.approved === day.total) {
            run += 1;
            best = Math.max(best, run);
        } else if (day.approved + day.submitted === day.total || day.date === now) {
            continue;
        } else {
            run = 0;
        }
    }
    return { current: run, best };
}

export function computeStats(db: DB, userId: number): DoerStats {
    const earned = db
        .prepare(
            `SELECT COALESCE(SUM(points_awarded), 0) AS xp, COUNT(*) AS count
             FROM chore_instances WHERE user_id = ? AND status = 'approved'`,
        )
        .get(userId) as { xp: number; count: number };
    const pending = db
        .prepare(
            `SELECT COALESCE(SUM(c.points), 0) AS points
             FROM chore_instances i JOIN chores c ON c.id = i.chore_id
             WHERE i.user_id = ? AND i.status = 'submitted'`,
        )
        .get(userId) as { points: number };
    const spent = db
        .prepare(
            `SELECT COALESCE(SUM(cost), 0) AS spent FROM redemptions
             WHERE user_id = ? AND status IN ('pending', 'approved')`,
        )
        .get(userId) as { spent: number };
    const streaks = computeStreaks(db, userId);
    const badgeRows = db
        .prepare("SELECT badge_key, earned_at FROM user_badges WHERE user_id = ? ORDER BY earned_at")
        .all(userId) as { badge_key: string; earned_at: string }[];
    const badges: EarnedBadge[] = [];
    for (const row of badgeRows) {
        const def = BADGES.find((b) => b.key === row.badge_key);
        if (def) {
            badges.push({ ...def, earnedAt: row.earned_at });
        }
    }
    return {
        userId,
        xp: earned.xp,
        balance: earned.xp - spent.spent,
        pendingPoints: pending.points,
        level: levelFor(earned.xp),
        streak: streaks.current,
        bestStreak: streaks.best,
        approvedCount: earned.count,
        badges,
    };
}

// Checks every badge rule and records any newly earned ones as unseen.
export function awardBadges(db: DB, userId: number): string[] {
    const stats = computeStats(db, userId);
    const owned = new Set(stats.badges.map((b) => b.key));
    const topCategory = db
        .prepare(
            `SELECT COUNT(*) AS n FROM chore_instances i JOIN chores c ON c.id = i.chore_id
             WHERE i.user_id = ? AND i.status = 'approved'
             GROUP BY c.category_id ORDER BY n DESC LIMIT 1`,
        )
        .get(userId) as { n: number } | undefined;
    const submittedTimes = db
        .prepare(
            "SELECT submitted_at FROM chore_instances WHERE user_id = ? AND status = 'approved' AND submitted_at IS NOT NULL",
        )
        .all(userId) as { submitted_at: string }[];
    const earlyBird = submittedTimes.some((r) => new Date(r.submitted_at).getHours() < 8);

    const rules: Record<string, boolean> = {
        "first-chore": stats.approvedCount >= 1,
        "chores-10": stats.approvedCount >= 10,
        "chores-50": stats.approvedCount >= 50,
        "chores-100": stats.approvedCount >= 100,
        "points-100": stats.xp >= 100,
        "points-500": stats.xp >= 500,
        "points-1000": stats.xp >= 1000,
        "streak-3": stats.bestStreak >= 3,
        "streak-7": stats.bestStreak >= 7,
        "streak-30": stats.bestStreak >= 30,
        "category-10": (topCategory?.n ?? 0) >= 10,
        "early-bird": earlyBird,
    };
    const insert = db.prepare("INSERT OR IGNORE INTO user_badges (user_id, badge_key) VALUES (?, ?)");
    const awarded: string[] = [];
    for (const [key, met] of Object.entries(rules)) {
        if (met && !owned.has(key)) {
            insert.run(userId, key);
            awarded.push(key);
        }
    }
    return awarded;
}

// Things that happened since the child last looked: approvals, new badges, level-ups.
export function pendingCelebration(db: DB, userId: number, stats: DoerStats): Celebration {
    const reviewed = db
        .prepare(
            `SELECT i.status, i.points_awarded, i.note, c.title
             FROM chore_instances i JOIN chores c ON c.id = i.chore_id
             WHERE i.user_id = ? AND i.seen = 0 ORDER BY i.reviewed_at`,
        )
        .all(userId) as { status: string; points_awarded: number; note: string | null; title: string }[];
    const badgeKeys = db
        .prepare("SELECT badge_key FROM user_badges WHERE user_id = ? AND seen = 0")
        .all(userId) as { badge_key: string }[];
    const redemptions = db
        .prepare(
            `SELECT r.status, w.title FROM redemptions r JOIN rewards w ON w.id = r.reward_id
             WHERE r.user_id = ? AND r.seen = 0`,
        )
        .all(userId) as { status: "approved" | "denied"; title: string }[];
    const seenLevel = (db.prepare("SELECT seen_level FROM users WHERE id = ?").get(userId) as { seen_level: number })
        .seen_level;
    return {
        approved: reviewed
            .filter((r) => r.status === "approved")
            .map((r) => ({ title: r.title, points: r.points_awarded })),
        rejected: reviewed.filter((r) => r.status === "rejected").map((r) => ({ title: r.title, note: r.note })),
        newBadges: BADGES.filter((b) => badgeKeys.some((k) => k.badge_key === b.key)),
        levelUp: stats.level.level > seenLevel ? stats.level : null,
        redemptions,
    };
}

export function acknowledgeCelebration(db: DB, userId: number): void {
    const stats = computeStats(db, userId);
    db.transaction(() => {
        db.prepare("UPDATE chore_instances SET seen = 1 WHERE user_id = ? AND seen = 0").run(userId);
        db.prepare("UPDATE user_badges SET seen = 1 WHERE user_id = ? AND seen = 0").run(userId);
        db.prepare("UPDATE redemptions SET seen = 1 WHERE user_id = ? AND seen = 0").run(userId);
        db.prepare("UPDATE users SET seen_level = ? WHERE id = ?").run(stats.level.level, userId);
    })();
}
