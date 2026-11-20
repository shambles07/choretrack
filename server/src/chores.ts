import type { DB } from "./db.js";
import { addDays, dayOfWeek } from "./dates.js";
import type { Category, Chore, ChoreInstance, Recurrence } from "../../shared/types.js";

export interface ChoreRow {
    id: number;
    title: string;
    description: string;
    category_id: number;
    points: number;
    assignee_id: number;
    recurrence: Recurrence;
    days_of_week: string;
    start_date: string;
    due_date: string | null;
    due_time: string | null;
    active: number;
}

export function toChore(row: ChoreRow): Chore {
    return {
        id: row.id,
        title: row.title,
        description: row.description,
        categoryId: row.category_id,
        points: row.points,
        assigneeId: row.assignee_id,
        recurrence: row.recurrence,
        daysOfWeek: row.days_of_week ? row.days_of_week.split(",").map(Number) : [],
        startDate: row.start_date,
        dueDate: row.due_date,
        dueTime: row.due_time,
        active: row.active === 1,
    };
}

function occursOn(chore: ChoreRow, date: string): boolean {
    if (date < chore.start_date) {
        return false;
    }
    switch (chore.recurrence) {
        case "once":
            return date === (chore.due_date ?? chore.start_date);
        case "daily":
            return true;
        case "weekly":
            return chore.days_of_week.split(",").map(Number).includes(dayOfWeek(date));
    }
}

// Creates the dated occurrences of every active chore between two dates
// (inclusive). Existing occurrences are left untouched.
export function ensureInstances(db: DB, from: string, to: string, userId?: number): void {
    const chores = (
        userId === undefined
            ? db.prepare("SELECT * FROM chores WHERE active = 1").all()
            : db.prepare("SELECT * FROM chores WHERE active = 1 AND assignee_id = ?").all(userId)
    ) as ChoreRow[];
    const insert = db.prepare(
        "INSERT OR IGNORE INTO chore_instances (chore_id, user_id, date) VALUES (?, ?, ?)",
    );
    db.transaction(() => {
        for (const chore of chores) {
            for (let d = from; d <= to; d = addDays(d, 1)) {
                if (occursOn(chore, d)) {
                    insert.run(chore.id, chore.assignee_id, d);
                }
            }
        }
    })();
}

// Removes future occurrences that haven't been started, so an edited chore's
// schedule is regenerated from its new settings.
export function clearFutureInstances(db: DB, choreId: number, fromDate: string): void {
    db.prepare(
        "DELETE FROM chore_instances WHERE chore_id = ? AND date >= ? AND status = 'todo'",
    ).run(choreId, fromDate);
}

export const INSTANCE_SELECT = `
    SELECT i.id, i.chore_id, i.user_id, i.date, i.status, i.submitted_at, i.reviewed_at,
           i.points_awarded, i.note,
           c.title, c.description, c.points, c.due_time, c.recurrence,
           cat.id AS cat_id, cat.name AS cat_name, cat.icon AS cat_icon, cat.color AS cat_color
    FROM chore_instances i
    JOIN chores c ON c.id = i.chore_id
    JOIN categories cat ON cat.id = c.category_id
`;

export interface InstanceRow {
    id: number;
    chore_id: number;
    user_id: number;
    date: string;
    status: ChoreInstance["status"];
    submitted_at: string | null;
    reviewed_at: string | null;
    points_awarded: number;
    note: string | null;
    title: string;
    description: string;
    points: number;
    due_time: string | null;
    recurrence: Recurrence;
    cat_id: number;
    cat_name: string;
    cat_icon: string;
    cat_color: string;
}

export function toInstance(row: InstanceRow): ChoreInstance {
    const category: Category = {
        id: row.cat_id,
        name: row.cat_name,
        icon: row.cat_icon,
        color: row.cat_color,
    };
    return {
        id: row.id,
        choreId: row.chore_id,
        userId: row.user_id,
        date: row.date,
        status: row.status,
        submittedAt: row.submitted_at,
        reviewedAt: row.reviewed_at,
        pointsAwarded: row.points_awarded,
        note: row.note,
        title: row.title,
        description: row.description,
        points: row.points,
        dueTime: row.due_time,
        recurrence: row.recurrence,
        category,
    };
}
