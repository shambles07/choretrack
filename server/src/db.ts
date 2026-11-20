import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

export type DB = Database.Database;

// Each entry runs once, in order. Never edit a shipped migration; add a new one.
const MIGRATIONS: string[] = [
    `
    CREATE TABLE users (
        id INTEGER PRIMARY KEY,
        role TEXT NOT NULL CHECK (role IN ('admin', 'doer')),
        name TEXT NOT NULL,
        username TEXT UNIQUE COLLATE NOCASE,
        password_hash TEXT,
        pin_hash TEXT,
        avatar TEXT NOT NULL DEFAULT 'star',
        color TEXT NOT NULL DEFAULT '#6366f1',
        sound_enabled INTEGER NOT NULL DEFAULT 1,
        active INTEGER NOT NULL DEFAULT 1,
        seen_level INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE sessions (
        token_hash TEXT PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        expires_at INTEGER NOT NULL
    );

    CREATE TABLE categories (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        icon TEXT NOT NULL,
        color TEXT NOT NULL
    );

    CREATE TABLE chores (
        id INTEGER PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        category_id INTEGER NOT NULL REFERENCES categories(id),
        points INTEGER NOT NULL,
        assignee_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        recurrence TEXT NOT NULL CHECK (recurrence IN ('once', 'daily', 'weekly')),
        days_of_week TEXT NOT NULL DEFAULT '',
        start_date TEXT NOT NULL,
        due_date TEXT,
        due_time TEXT,
        active INTEGER NOT NULL DEFAULT 1,
        archived INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE chore_instances (
        id INTEGER PRIMARY KEY,
        chore_id INTEGER NOT NULL REFERENCES chores(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        date TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'todo'
            CHECK (status IN ('todo', 'submitted', 'approved', 'rejected')),
        submitted_at TEXT,
        reviewed_at TEXT,
        reviewed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        points_awarded INTEGER NOT NULL DEFAULT 0,
        note TEXT,
        seen INTEGER NOT NULL DEFAULT 1,
        UNIQUE (chore_id, date)
    );
    CREATE INDEX idx_instances_user_date ON chore_instances(user_id, date);
    CREATE INDEX idx_instances_status ON chore_instances(status);

    CREATE TABLE rewards (
        id INTEGER PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        cost INTEGER NOT NULL,
        icon TEXT NOT NULL DEFAULT 'gift',
        active INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE redemptions (
        id INTEGER PRIMARY KEY,
        reward_id INTEGER NOT NULL REFERENCES rewards(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        cost INTEGER NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending'
            CHECK (status IN ('pending', 'approved', 'denied')),
        requested_at TEXT NOT NULL DEFAULT (datetime('now')),
        reviewed_at TEXT,
        reviewed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        seen INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE user_badges (
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        badge_key TEXT NOT NULL,
        earned_at TEXT NOT NULL DEFAULT (datetime('now')),
        seen INTEGER NOT NULL DEFAULT 0,
        PRIMARY KEY (user_id, badge_key)
    );
    `,
];

const DEFAULT_CATEGORIES: [string, string, string][] = [
    ["Cleaning", "sparkles", "#0ea5e9"],
    ["Kitchen", "utensils", "#f97316"],
    ["Dishes", "glass-water", "#06b6d4"],
    ["Laundry", "shirt", "#8b5cf6"],
    ["Bedroom", "bed", "#ec4899"],
    ["Bathroom", "bath", "#14b8a6"],
    ["Trash & Recycling", "trash", "#64748b"],
    ["Pets", "paw-print", "#d97706"],
    ["Yard & Garden", "leaf", "#22c55e"],
    ["Homework", "book-open", "#3b82f6"],
    ["Practice", "music", "#a855f7"],
    ["Errands", "shopping-cart", "#ef4444"],
    ["Other", "star", "#eab308"],
];

const DEFAULT_REWARDS: [string, string, number, string][] = [
    ["30 minutes of screen time", "Extra tablet, TV or game time", 50, "tv"],
    ["Pick dinner", "Choose what the family eats tonight", 100, "pizza"],
    ["Ice cream treat", "A scoop of your favourite flavour", 75, "ice-cream"],
    ["Stay up 30 minutes late", "On a weekend night", 120, "moon"],
];

export function openDatabase(file: string): DB {
    if (file !== ":memory:") {
        fs.mkdirSync(path.dirname(file), { recursive: true });
    }
    const db = new Database(file);
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
    db.pragma("busy_timeout = 5000");
    migrate(db);
    return db;
}

function migrate(db: DB): void {
    const version = db.pragma("user_version", { simple: true }) as number;
    for (let i = version; i < MIGRATIONS.length; i += 1) {
        db.transaction(() => {
            db.exec(MIGRATIONS[i]);
            if (i === 0) {
                seed(db);
            }
            db.pragma(`user_version = ${i + 1}`);
        })();
    }
}

function seed(db: DB): void {
    const cat = db.prepare("INSERT INTO categories (name, icon, color) VALUES (?, ?, ?)");
    for (const row of DEFAULT_CATEGORIES) {
        cat.run(...row);
    }
    const reward = db.prepare("INSERT INTO rewards (title, description, cost, icon) VALUES (?, ?, ?, ?)");
    for (const row of DEFAULT_REWARDS) {
        reward.run(...row);
    }
}
