// Types and constants shared by the server and the web app.

export type Role = "admin" | "doer";

export type Recurrence = "once" | "daily" | "weekly";

export type InstanceStatus = "todo" | "submitted" | "approved" | "rejected";

export type RedemptionStatus = "pending" | "approved" | "denied";

export interface PublicUser {
    id: number;
    role: Role;
    name: string;
    username: string | null;
    avatar: string;
    color: string;
    soundEnabled: boolean;
    active: boolean;
}

export interface DoerProfile {
    id: number;
    name: string;
    avatar: string;
    color: string;
}

export interface Category {
    id: number;
    name: string;
    icon: string;
    color: string;
}

export interface Chore {
    id: number;
    title: string;
    description: string;
    categoryId: number;
    points: number;
    assigneeId: number;
    recurrence: Recurrence;
    // 0 = Sunday ... 6 = Saturday. Used when recurrence is "weekly".
    daysOfWeek: number[];
    startDate: string;
    dueDate: string | null;
    dueTime: string | null;
    active: boolean;
}

export interface ChoreInstance {
    id: number;
    choreId: number;
    userId: number;
    date: string;
    status: InstanceStatus;
    submittedAt: string | null;
    reviewedAt: string | null;
    pointsAwarded: number;
    note: string | null;
    title: string;
    description: string;
    points: number;
    dueTime: string | null;
    recurrence: Recurrence;
    category: Category;
}

export interface Reward {
    id: number;
    title: string;
    description: string;
    cost: number;
    icon: string;
    active: boolean;
}

export interface Redemption {
    id: number;
    rewardId: number;
    userId: number;
    cost: number;
    status: RedemptionStatus;
    requestedAt: string;
    reviewedAt: string | null;
    rewardTitle: string;
    rewardIcon: string;
    userName: string;
}

export interface Badge {
    key: string;
    name: string;
    description: string;
    icon: string;
}

export interface EarnedBadge extends Badge {
    earnedAt: string;
}

export interface LevelInfo {
    level: number;
    name: string;
    xp: number;
    currentLevelXp: number;
    nextLevelXp: number | null;
}

export interface DoerStats {
    userId: number;
    xp: number;
    balance: number;
    pendingPoints: number;
    level: LevelInfo;
    streak: number;
    bestStreak: number;
    approvedCount: number;
    badges: EarnedBadge[];
}

export interface Celebration {
    approved: { title: string; points: number }[];
    rejected: { title: string; note: string | null }[];
    newBadges: Badge[];
    levelUp: LevelInfo | null;
    redemptions: { title: string; status: RedemptionStatus }[];
}

export interface DoerDashboard {
    today: string;
    stats: DoerStats;
    todayChores: ChoreInstance[];
    overdue: ChoreInstance[];
    upcoming: ChoreInstance[];
    celebration: Celebration;
}

// ---------------------------------------------------------------------------
// Game rules
// ---------------------------------------------------------------------------

export const LEVEL_NAMES = [
    "Rookie Helper",
    "Tidy Trainee",
    "Busy Bee",
    "Super Sweeper",
    "Task Tamer",
    "Chore Champion",
    "Household Hero",
    "Legend of the House",
];

// XP needed to reach each level. Index 0 is level 1. Gaps grow by 50 each level.
export function levelThreshold(level: number): number {
    const n = level - 1;
    return 25 * n * (n + 1);
}

export function levelFor(xp: number): LevelInfo {
    let level = 1;
    while (levelThreshold(level + 1) <= xp) {
        level += 1;
    }
    const name = LEVEL_NAMES[Math.min(level, LEVEL_NAMES.length) - 1];
    return {
        level,
        name: level > LEVEL_NAMES.length ? `${name} ${level - LEVEL_NAMES.length + 1}` : name,
        xp,
        currentLevelXp: levelThreshold(level),
        nextLevelXp: levelThreshold(level + 1),
    };
}

export const BADGES: Badge[] = [
    { key: "first-chore", name: "First Step", description: "Get your first chore approved", icon: "footprints" },
    { key: "chores-10", name: "Getting Busy", description: "10 chores approved", icon: "zap" },
    { key: "chores-50", name: "Workhorse", description: "50 chores approved", icon: "medal" },
    { key: "chores-100", name: "Centurion", description: "100 chores approved", icon: "trophy" },
    { key: "points-100", name: "Point Collector", description: "Earn 100 points", icon: "star" },
    { key: "points-500", name: "Point Hoarder", description: "Earn 500 points", icon: "gem" },
    { key: "points-1000", name: "Point Royalty", description: "Earn 1,000 points", icon: "crown" },
    { key: "streak-3", name: "On a Roll", description: "3-day streak", icon: "flame" },
    { key: "streak-7", name: "Week Warrior", description: "7-day streak", icon: "calendar-check" },
    { key: "streak-30", name: "Unstoppable", description: "30-day streak", icon: "rocket" },
    { key: "category-10", name: "Specialist", description: "10 approved chores in one category", icon: "target" },
    { key: "early-bird", name: "Early Bird", description: "Finish a chore before 8 am", icon: "sunrise" },
];

export const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
