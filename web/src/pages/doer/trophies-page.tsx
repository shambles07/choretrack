import { motion } from "framer-motion";
import { CheckCircle2, Flame, Lock, Star, Trophy } from "lucide-react";
import { useLoad } from "../../lib/use-load";
import { useAuth } from "../../lib/auth";
import { IconTile } from "../../lib/icons";
import { PageHeader } from "../../components/app-shell";
import { Stat, XpBar } from "../../components/game-widgets";
import { BADGES, LEVEL_NAMES, levelThreshold, type DoerDashboard } from "../../../../shared/types";

export function DoerTrophiesPage() {
    const { user } = useAuth();
    const { data } = useLoad<DoerDashboard>("/doer/dashboard");
    if (!data || !user) return <div className="card h-48 animate-pulse" />;
    const { stats } = data;
    const earned = new Map(stats.badges.map((b) => [b.key, b]));

    return (
        <div className="space-y-8">
            <PageHeader title="Trophies" subtitle={`${earned.size} of ${BADGES.length} trophies collected`} />

            <section className="card space-y-5 p-5 sm:p-6">
                <XpBar level={stats.level} />
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    <Stat icon={<Star size={18} fill="currentColor" />} value={stats.xp} label="Total XP" tone="#eab308" />
                    <Stat icon={<CheckCircle2 size={18} />} value={stats.approvedCount} label="Chores done" tone="#22c55e" />
                    <Stat icon={<Flame size={18} fill="currentColor" />} value={stats.streak} label="Day streak" tone="#f97316" />
                    <Stat icon={<Trophy size={18} />} value={stats.bestStreak} label="Best streak" tone="#8b5cf6" />
                </div>
            </section>

            <section>
                <h2 className="mb-3 text-lg font-bold">Trophy case</h2>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                    {BADGES.map((b, i) => {
                        const got = earned.get(b.key);
                        return (
                            <motion.div
                                key={b.key}
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: i * 0.03 }}
                                className={`card flex flex-col items-center gap-2 p-4 text-center ${got ? "" : "opacity-60"}`}
                            >
                                {got ? (
                                    <IconTile name={b.icon} color={user.color} size={60} solid rounded="rounded-full" />
                                ) : (
                                    <span className="inline-flex h-[60px] w-[60px] items-center justify-center rounded-full bg-surface-2 text-muted">
                                        <Lock size={24} />
                                    </span>
                                )}
                                <div className="font-bold">{b.name}</div>
                                <div className="text-xs text-muted">{b.description}</div>
                                {got && (
                                    <div className="text-[11px] font-semibold text-accent">
                                        {new Date(got.earnedAt.replace(" ", "T") + "Z").toLocaleDateString()}
                                    </div>
                                )}
                            </motion.div>
                        );
                    })}
                </div>
            </section>

            <section>
                <h2 className="mb-3 text-lg font-bold">Levels</h2>
                <div className="card divide-y divide-line">
                    {LEVEL_NAMES.map((name, i) => {
                        const level = i + 1;
                        const reached = stats.level.level >= level;
                        return (
                            <div key={name} className="flex items-center gap-3 px-4 py-3">
                                <span
                                    className={`inline-flex h-9 w-9 items-center justify-center rounded-xl text-sm font-extrabold ${
                                        reached ? "bg-accent text-accent-fg" : "bg-surface-2 text-muted"
                                    }`}
                                >
                                    {level}
                                </span>
                                <span className={`flex-1 font-semibold ${reached ? "" : "text-muted"}`}>{name}</span>
                                <span className="text-sm text-muted tabular-nums">{levelThreshold(level)} XP</span>
                            </div>
                        );
                    })}
                </div>
            </section>
        </div>
    );
}
