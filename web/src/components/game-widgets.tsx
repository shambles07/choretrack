import { motion } from "framer-motion";
import { Flame, Hourglass, Star } from "lucide-react";
import type { LevelInfo } from "../../../shared/types";

export function ProgressRing({
    value,
    total,
    size = 120,
    stroke = 12,
    label,
}: {
    value: number;
    total: number;
    size?: number;
    stroke?: number;
    label?: string;
}) {
    const radius = (size - stroke) / 2;
    const circumference = 2 * Math.PI * radius;
    const fraction = total === 0 ? 0 : Math.min(1, value / total);
    return (
        <div
            className="relative inline-flex items-center justify-center"
            style={{ width: size, height: size }}
            role="img"
            aria-label={label ?? `${value} of ${total} done`}
        >
            <svg width={size} height={size} className="-rotate-90">
                <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--surface-2)" strokeWidth={stroke} />
                <motion.circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke="var(--accent)"
                    strokeWidth={stroke}
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    initial={false}
                    animate={{ strokeDashoffset: circumference * (1 - fraction) }}
                    transition={{ type: "spring", damping: 20, stiffness: 80 }}
                />
            </svg>
            <div className="absolute flex flex-col items-center">
                <span className="text-2xl font-extrabold tabular-nums">
                    {value}/{total}
                </span>
                <span className="text-xs font-semibold text-muted">done</span>
            </div>
        </div>
    );
}

export function XpBar({ level }: { level: LevelInfo }) {
    const span = (level.nextLevelXp ?? level.xp) - level.currentLevelXp;
    const into = level.xp - level.currentLevelXp;
    const fraction = span <= 0 ? 1 : into / span;
    return (
        <div>
            <div className="mb-1.5 flex items-baseline justify-between gap-2 text-sm">
                <span className="font-bold">
                    Level {level.level} · <span className="text-accent">{level.name}</span>
                </span>
                {level.nextLevelXp !== null && (
                    <span className="text-xs font-semibold text-muted tabular-nums">
                        {level.nextLevelXp - level.xp} XP to level {level.level + 1}
                    </span>
                )}
            </div>
            <div
                className="h-3 overflow-hidden rounded-full bg-surface-2"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={span}
                aria-valuenow={into}
                aria-label="Progress to next level"
            >
                <motion.div
                    className="h-full rounded-full bg-accent"
                    initial={false}
                    animate={{ width: `${Math.max(4, fraction * 100)}%` }}
                    transition={{ type: "spring", damping: 20, stiffness: 80 }}
                />
            </div>
        </div>
    );
}

export function Stat({ icon, value, label, tone }: { icon: React.ReactNode; value: React.ReactNode; label: string; tone: string }) {
    return (
        <div className="flex flex-col items-start gap-2 rounded-2xl bg-surface-2 px-3 py-2.5 sm:flex-row sm:items-center sm:gap-3">
            <span
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl"
                style={{ color: tone, background: `color-mix(in srgb, ${tone} 16%, transparent)` }}
            >
                {icon}
            </span>
            <div className="min-w-0">
                <div className="text-lg font-extrabold leading-tight tabular-nums">{value}</div>
                <div className="truncate text-xs font-semibold text-muted">{label}</div>
            </div>
        </div>
    );
}

export function StatRow({ balance, pending, streak }: { balance: number; pending: number; streak: number }) {
    return (
        <div className="grid grid-cols-3 gap-2">
            <Stat icon={<Star size={18} fill="currentColor" />} value={balance} label="Points" tone="#eab308" />
            <Stat icon={<Hourglass size={18} />} value={pending} label="Waiting" tone="#0ea5e9" />
            <Stat icon={<Flame size={18} fill="currentColor" />} value={streak} label="Day streak" tone="#f97316" />
        </div>
    );
}

export function PointsPill({ points }: { points: number }) {
    return (
        <span className="inline-flex items-center gap-1 rounded-full bg-yellow-400/15 px-2.5 py-1 text-sm font-bold text-yellow-700 tabular-nums dark:text-yellow-300">
            <Star size={14} fill="currentColor" aria-hidden="true" />
            {points}
        </span>
    );
}
