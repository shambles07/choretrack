import { useState } from "react";
import { motion } from "framer-motion";
import { CalendarDays, PartyPopper, Sparkles } from "lucide-react";
import { useAuth } from "../../lib/auth";
import { api } from "../../lib/api";
import { useLoad } from "../../lib/use-load";
import { useLocalPref } from "../../lib/theme";
import { burstFrom } from "../../lib/celebrate";
import { playDoneJingle, playUndo } from "../../lib/sound";
import { greeting } from "../../lib/format";
import { EmptyState } from "../../components/app-shell";
import { useToast } from "../../components/toast";
import { ProgressRing, StatRow, XpBar } from "../../components/game-widgets";
import { ChoreGrid, ChoreTable, UpcomingList, ViewToggle, type ViewMode } from "../../components/chore-views";
import { CelebrationOverlay, hasCelebration } from "../../components/celebration-overlay";
import type { ChoreInstance, DoerDashboard, DoerStats } from "../../../../shared/types";

const CHEERS = ["Awesome job!", "You rock!", "Nailed it!", "Super star!", "High five!", "Way to go!"];

export function DoerHomePage() {
    const { user } = useAuth();
    const notify = useToast();
    const { data, setData, error, reload } = useLoad<DoerDashboard>("/doer/dashboard");
    const [view, setView] = useLocalPref<ViewMode>("choretrack-view", "cards", ["cards", "table"]);
    const [busyId, setBusyId] = useState<number | null>(null);
    const [celebrationDone, setCelebrationDone] = useState(false);
    const [showWeek, setShowWeek] = useState(false);

    if (error) return <p className="text-danger">{error}</p>;
    if (!data || !user) return <DashboardSkeleton />;

    const replace = (instance: ChoreInstance, stats: DoerStats) => {
        setData((d) => {
            if (!d) return d;
            const swap = (list: ChoreInstance[]) => list.map((i) => (i.id === instance.id ? instance : i));
            return { ...d, stats, todayChores: swap(d.todayChores), overdue: swap(d.overdue) };
        });
    };

    const undo = async (instance: ChoreInstance) => {
        try {
            const res = await api.post<{ instance: ChoreInstance; stats: DoerStats }>(`/doer/instances/${instance.id}/undo`);
            replace(res.instance, res.stats);
            playUndo();
        } catch (e) {
            notify((e as Error).message, { tone: "error" });
        }
    };

    const complete = async (instance: ChoreInstance, el: HTMLElement | null) => {
        setBusyId(instance.id);
        // Celebrate straight away: the tap is what lets the browser play sound.
        burstFrom(el, user.color);
        playDoneJingle();
        try {
            const res = await api.post<{ instance: ChoreInstance; stats: DoerStats }>(`/doer/instances/${instance.id}/complete`);
            replace(res.instance, res.stats);
            notify(`${CHEERS[Math.floor(Math.random() * CHEERS.length)]} +${instance.points} points once it's approved`, {
                tone: "success",
                action: { label: "Undo", onClick: () => void undo(res.instance) },
                duration: 5000,
            });
        } catch (e) {
            notify((e as Error).message, { tone: "error" });
            void reload();
        } finally {
            setBusyId(null);
        }
    };

    const { stats, todayChores, overdue, upcoming, today } = data;
    const doneToday = todayChores.filter((i) => i.status === "submitted" || i.status === "approved").length;
    const allDone = todayChores.length > 0 && doneToday === todayChores.length;
    const List = view === "cards" ? ChoreGrid : ChoreTable;
    const listProps = { today, onComplete: complete, onUndo: undo, busyId };

    return (
        <div className="space-y-8">
            {!celebrationDone && hasCelebration(data.celebration) && (
                <CelebrationOverlay
                    celebration={data.celebration}
                    color={user.color}
                    onDone={() => {
                        setCelebrationDone(true);
                        void api.post("/doer/celebration/ack");
                    }}
                />
            )}

            <section className="card grid gap-6 p-5 sm:p-6 md:grid-cols-[auto_1fr] md:items-center">
                <div className="flex items-center gap-5">
                    <ProgressRing value={doneToday} total={todayChores.length} label={`${doneToday} of ${todayChores.length} chores done today`} />
                    <div className="md:hidden">
                        <Hello name={user.name} allDone={allDone} remaining={todayChores.length - doneToday} />
                    </div>
                </div>
                <div className="space-y-4">
                    <div className="hidden md:block">
                        <Hello name={user.name} allDone={allDone} remaining={todayChores.length - doneToday} />
                    </div>
                    <XpBar level={stats.level} />
                    <StatRow balance={stats.balance} pending={stats.pendingPoints} streak={stats.streak} />
                </div>
            </section>

            {overdue.length > 0 && (
                <section>
                    <h2 className="mb-3 text-lg font-bold">Still to finish</h2>
                    <List instances={overdue} {...listProps} />
                </section>
            )}

            <section>
                <div className="mb-3 flex items-center justify-between gap-2">
                    <h2 className="text-lg font-bold">Today's chores</h2>
                    <ViewToggle value={view} onChange={setView} />
                </div>
                {todayChores.length === 0 ? (
                    <EmptyState icon={<Sparkles size={40} />} title="No chores today!">
                        Enjoy your free time.
                    </EmptyState>
                ) : (
                    <>
                        {allDone && (
                            <motion.div
                                initial={{ opacity: 0, y: -8 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="mb-4 flex items-center gap-3 rounded-2xl bg-accent/10 px-4 py-3 font-semibold text-accent"
                            >
                                <PartyPopper size={22} />
                                All done for today! You're amazing.
                            </motion.div>
                        )}
                        <List instances={todayChores} {...listProps} />
                    </>
                )}
            </section>

            {upcoming.length > 0 && (
                <section>
                    <div className="mb-3 flex items-center justify-between gap-2">
                        <h2 className="flex items-center gap-2 text-lg font-bold">
                            <CalendarDays size={20} className="text-muted" />
                            Coming up
                        </h2>
                        <button className="btn btn-ghost min-h-10 text-sm text-accent" onClick={() => setShowWeek((v) => !v)}>
                            {showWeek ? "Show less" : "Whole week"}
                        </button>
                    </div>
                    <UpcomingList
                        instances={showWeek ? upcoming : upcoming.filter((i) => i.date === upcoming[0].date)}
                        today={today}
                    />
                </section>
            )}
        </div>
    );
}

function Hello({ name, allDone, remaining }: { name: string; allDone: boolean; remaining: number }) {
    return (
        <div>
            <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
                {greeting()}, {name}!
            </h1>
            <p className="mt-1 text-muted">
                {allDone
                    ? "Every chore is done. Legend!"
                    : remaining === 1
                      ? "Just 1 chore left today."
                      : remaining > 0
                        ? `${remaining} chores to go today.`
                        : "Nothing on the list today."}
            </p>
        </div>
    );
}

function DashboardSkeleton() {
    return (
        <div className="space-y-6" aria-busy="true" aria-label="Loading">
            <div className="card h-48 animate-pulse" />
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {[0, 1, 2].map((i) => (
                    <div key={i} className="card h-44 animate-pulse" />
                ))}
            </div>
        </div>
    );
}
