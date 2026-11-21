import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, CheckCheck, Flame, Gift, Inbox, Star, Undo2, UserPlus, X } from "lucide-react";
import { Link } from "react-router-dom";
import { api } from "../../lib/api";
import { useLoad } from "../../lib/use-load";
import { IconTile } from "../../lib/icons";
import { friendlyDate } from "../../lib/format";
import { EmptyState, PageHeader } from "../../components/app-shell";
import { useToast } from "../../components/toast";
import { Modal } from "../../components/modal";
import { ProgressRing, PointsPill } from "../../components/game-widgets";
import type { ChoreInstance, DoerStats, PublicUser, Redemption } from "../../../../shared/types";

interface Overview {
    today: string;
    doers: { user: PublicUser; stats: DoerStats; today: { total: number; approved: number; submitted: number } }[];
    approvals: ChoreInstance[];
    redemptions: Redemption[];
}

export function AdminOverviewPage() {
    const notify = useToast();
    const { data, reload } = useLoad<Overview>("/admin/overview");
    const [rejecting, setRejecting] = useState<ChoreInstance | null>(null);
    const [note, setNote] = useState("");
    const [busy, setBusy] = useState(false);

    if (!data) return <div className="card h-48 animate-pulse" />;
    const names = new Map(data.doers.map((d) => [d.user.id, d.user]));

    const act = async (fn: () => Promise<unknown>, message?: string, undo?: () => Promise<unknown>) => {
        setBusy(true);
        try {
            await fn();
            if (message) {
                notify(message, {
                    tone: "success",
                    action: undo ? { label: "Undo", onClick: () => void undo().then(reload) } : undefined,
                });
            }
            await reload();
        } catch (e) {
            notify((e as Error).message, { tone: "error" });
        } finally {
            setBusy(false);
        }
    };

    const approve = (i: ChoreInstance) =>
        act(
            () => api.post(`/admin/instances/${i.id}/approve`),
            `Approved "${i.title}" · +${i.points} points`,
            () => api.post(`/admin/instances/${i.id}/unreview`),
        );

    const approveAll = () =>
        act(async () => {
            for (const i of data.approvals) await api.post(`/admin/instances/${i.id}/approve`);
        }, `Approved ${data.approvals.length} chores`);

    const reject = () => {
        if (!rejecting) return;
        const target = rejecting;
        void act(() => api.post(`/admin/instances/${target.id}/reject`, { note: note.trim() || undefined }), `Sent "${target.title}" back`, () => api.post(`/admin/instances/${target.id}/unreview`)).then(
            () => {
                setRejecting(null);
                setNote("");
            },
        );
    };

    return (
        <div className="space-y-8">
            <PageHeader title="Overview" subtitle={new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })} />

            {data.doers.length === 0 ? (
                <EmptyState icon={<UserPlus size={40} />} title="Add your first chore doer">
                    <Link to="/admin/people" className="btn btn-primary mt-3">
                        Add a chore doer
                    </Link>
                </EmptyState>
            ) : (
                <section className="grid gap-4 md:grid-cols-2">
                    {data.doers.map(({ user, stats, today }) => (
                        <article key={user.id} className="card flex items-center gap-5 p-5">
                            <div style={{ "--accent": user.color } as React.CSSProperties}>
                                <ProgressRing value={today.approved + today.submitted} total={today.total} size={100} stroke={10} />
                            </div>
                            <div className="min-w-0 flex-1 space-y-2">
                                <div className="flex items-center gap-2">
                                    <IconTile name={user.avatar} color={user.color} size={32} rounded="rounded-xl" solid />
                                    <h2 className="truncate text-lg font-bold">{user.name}</h2>
                                </div>
                                <div className="text-sm text-muted">
                                    Level {stats.level.level} · {stats.level.name}
                                </div>
                                <div className="flex flex-wrap gap-1.5">
                                    <span className="chip">
                                        <Star size={12} /> {stats.balance} points
                                    </span>
                                    <span className="chip">
                                        <Flame size={12} /> {stats.streak}-day streak
                                    </span>
                                    {today.submitted > 0 && (
                                        <span className="chip bg-sky-500/12 text-sky-700 dark:text-sky-300">{today.submitted} to check</span>
                                    )}
                                </div>
                            </div>
                        </article>
                    ))}
                </section>
            )}

            <section>
                <div className="mb-3 flex items-center justify-between gap-2">
                    <h2 className="text-lg font-bold">
                        Waiting for approval{" "}
                        {data.approvals.length > 0 && <span className="text-muted">({data.approvals.length})</span>}
                    </h2>
                    {data.approvals.length > 1 && (
                        <button className="btn btn-soft" onClick={approveAll} disabled={busy}>
                            <CheckCheck size={18} /> Approve all
                        </button>
                    )}
                </div>
                {data.approvals.length === 0 ? (
                    <EmptyState icon={<Inbox size={36} />} title="All caught up">
                        Chores your kids finish will show up here for you to check.
                    </EmptyState>
                ) : (
                    <div className="card divide-y divide-line">
                        <AnimatePresence initial={false}>
                            {data.approvals.map((i) => {
                                const who = names.get(i.userId);
                                return (
                                    <motion.div
                                        key={i.id}
                                        layout
                                        exit={{ opacity: 0, height: 0 }}
                                        className="flex flex-wrap items-center gap-3 px-4 py-3 sm:flex-nowrap"
                                    >
                                        <IconTile name={i.category.icon} color={i.category.color} size={40} rounded="rounded-xl" />
                                        <div className="min-w-0 flex-1">
                                            <div className="font-semibold">{i.title}</div>
                                            <div className="text-xs text-muted">
                                                {who?.name} · {friendlyDate(i.date, data.today)}
                                                {i.submittedAt && ` · done ${new Date(i.submittedAt).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}`}
                                            </div>
                                        </div>
                                        <PointsPill points={i.points} />
                                        <div className="flex w-full gap-2 sm:w-auto">
                                            <button
                                                className="btn btn-soft flex-1 sm:flex-none"
                                                onClick={() => setRejecting(i)}
                                                disabled={busy}
                                                aria-label={`Send back ${i.title}`}
                                            >
                                                <Undo2 size={18} />
                                                <span className="sm:hidden">Send back</span>
                                            </button>
                                            <button
                                                className="btn btn-primary flex-1 sm:flex-none"
                                                onClick={() => approve(i)}
                                                disabled={busy}
                                            >
                                                <Check size={18} strokeWidth={3} /> Approve
                                            </button>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </AnimatePresence>
                    </div>
                )}
            </section>

            {data.redemptions.length > 0 && (
                <section>
                    <h2 className="mb-3 text-lg font-bold">Reward requests</h2>
                    <div className="card divide-y divide-line">
                        {data.redemptions.map((r) => (
                            <div key={r.id} className="flex flex-wrap items-center gap-3 px-4 py-3 sm:flex-nowrap">
                                <IconTile name={r.rewardIcon} color="#eab308" size={40} rounded="rounded-xl" />
                                <div className="min-w-0 flex-1">
                                    <div className="font-semibold">{r.rewardTitle}</div>
                                    <div className="text-xs text-muted">
                                        {r.userName} · {r.cost} points
                                    </div>
                                </div>
                                <div className="flex w-full gap-2 sm:w-auto">
                                    <button
                                        className="btn btn-soft flex-1 sm:flex-none"
                                        disabled={busy}
                                        onClick={() => act(() => api.post(`/admin/redemptions/${r.id}/deny`), "Request declined; points returned")}
                                    >
                                        <X size={18} /> Decline
                                    </button>
                                    <button
                                        className="btn btn-primary flex-1 sm:flex-none"
                                        disabled={busy}
                                        onClick={() => act(() => api.post(`/admin/redemptions/${r.id}/approve`), `Approved "${r.rewardTitle}"`)}
                                    >
                                        <Gift size={18} /> Approve
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            <Modal
                open={rejecting !== null}
                onClose={() => setRejecting(null)}
                title="Send back for another go"
                footer={
                    <>
                        <button className="btn btn-ghost" onClick={() => setRejecting(null)}>
                            Cancel
                        </button>
                        <button className="btn btn-primary" onClick={reject} disabled={busy}>
                            Send back
                        </button>
                    </>
                }
            >
                <p className="mb-3">
                    <strong>{rejecting?.title}</strong> will go back on the list. Add a friendly note about what's left to do.
                </p>
                <label className="label" htmlFor="note">
                    Note (optional)
                </label>
                <textarea
                    id="note"
                    className="input"
                    maxLength={200}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Don't forget the pillows!"
                />
            </Modal>
        </div>
    );
}
