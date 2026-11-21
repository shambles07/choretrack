import { useState } from "react";
import { motion } from "framer-motion";
import { Gift, Lock, Star } from "lucide-react";
import { api } from "../../lib/api";
import { useLoad } from "../../lib/use-load";
import { useAuth } from "../../lib/auth";
import { IconTile } from "../../lib/icons";
import { burstFrom } from "../../lib/celebrate";
import { playDoneJingle } from "../../lib/sound";
import { EmptyState, PageHeader } from "../../components/app-shell";
import { useToast } from "../../components/toast";
import { Modal } from "../../components/modal";
import type { DoerStats, Redemption, Reward } from "../../../../shared/types";

interface RewardsData {
    rewards: Reward[];
    redemptions: Redemption[];
    stats: DoerStats;
}

export function DoerRewardsPage() {
    const { user } = useAuth();
    const notify = useToast();
    const { data, reload } = useLoad<RewardsData>("/doer/rewards");
    const [confirming, setConfirming] = useState<Reward | null>(null);

    if (!data || !user) return <div className="card h-48 animate-pulse" />;
    const balance = data.stats.balance;

    const redeem = async (reward: Reward) => {
        try {
            await api.post(`/doer/rewards/${reward.id}/redeem`);
            setConfirming(null);
            burstFrom(null, user.color);
            playDoneJingle();
            notify("Request sent! A parent will check it soon.", { tone: "success" });
            await reload();
        } catch (e) {
            notify((e as Error).message, { tone: "error" });
        }
    };

    const cancel = async (r: Redemption) => {
        try {
            await api.post(`/doer/redemptions/${r.id}/cancel`);
            notify("Request cancelled. Your points are back.");
            await reload();
        } catch (e) {
            notify((e as Error).message, { tone: "error" });
        }
    };

    const pending = data.redemptions.filter((r) => r.status === "pending");
    const past = data.redemptions.filter((r) => r.status !== "pending");

    return (
        <div>
            <PageHeader
                title="Rewards"
                subtitle="Spend the points you've earned."
                actions={
                    <div className="inline-flex items-center gap-2 rounded-2xl bg-yellow-400/15 px-4 py-2 text-xl font-extrabold text-yellow-700 tabular-nums dark:text-yellow-300">
                        <Star size={20} fill="currentColor" />
                        {balance}
                    </div>
                }
            />

            {data.rewards.length === 0 ? (
                <EmptyState icon={<Gift size={40} />} title="No rewards yet">
                    Ask a parent to add some rewards.
                </EmptyState>
            ) : (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {data.rewards.map((r) => {
                        const affordable = balance >= r.cost;
                        const progress = Math.min(1, balance / r.cost);
                        return (
                            <motion.article key={r.id} layout className="card flex flex-col gap-4 p-5">
                                <div className="flex items-start gap-4">
                                    <IconTile name={r.icon} color={user.color} size={56} />
                                    <div className="min-w-0 flex-1">
                                        <h3 className="text-lg font-bold leading-snug">{r.title}</h3>
                                        {r.description && <p className="text-sm text-muted">{r.description}</p>}
                                    </div>
                                </div>
                                <div>
                                    <div className="mb-1 flex justify-between text-xs font-semibold text-muted">
                                        <span>
                                            {affordable ? "You can get this!" : `${r.cost - balance} more points`}
                                        </span>
                                        <span className="tabular-nums">{r.cost} pts</span>
                                    </div>
                                    <div className="h-2 overflow-hidden rounded-full bg-surface-2">
                                        <div className="h-full rounded-full bg-accent" style={{ width: `${progress * 100}%` }} />
                                    </div>
                                </div>
                                <button
                                    className={`btn mt-auto h-12 w-full ${affordable ? "btn-primary" : "btn-soft"}`}
                                    disabled={!affordable}
                                    onClick={() => setConfirming(r)}
                                >
                                    {affordable ? <Gift size={18} /> : <Lock size={18} />}
                                    {affordable ? "Get it" : "Keep saving"}
                                </button>
                            </motion.article>
                        );
                    })}
                </div>
            )}

            {(pending.length > 0 || past.length > 0) && (
                <section className="mt-8">
                    <h2 className="mb-3 text-lg font-bold">My requests</h2>
                    <div className="card divide-y divide-line">
                        {[...pending, ...past].map((r) => (
                            <div key={r.id} className="flex items-center gap-3 px-4 py-3">
                                <IconTile name={r.rewardIcon} color={user.color} size={36} rounded="rounded-xl" />
                                <div className="min-w-0 flex-1">
                                    <div className="font-semibold">{r.rewardTitle}</div>
                                    <div className="text-xs text-muted">{r.cost} points</div>
                                </div>
                                {r.status === "pending" ? (
                                    <>
                                        <span className="chip bg-sky-500/12 text-sky-700 dark:text-sky-300">Waiting</span>
                                        <button className="btn btn-ghost min-h-9 px-2 text-sm" onClick={() => cancel(r)}>
                                            Cancel
                                        </button>
                                    </>
                                ) : r.status === "approved" ? (
                                    <span className="chip bg-green-500/12 text-green-700 dark:text-green-300">Enjoy!</span>
                                ) : (
                                    <span className="chip">Not this time</span>
                                )}
                            </div>
                        ))}
                    </div>
                </section>
            )}

            <Modal
                open={confirming !== null}
                onClose={() => setConfirming(null)}
                title="Get this reward?"
                footer={
                    <>
                        <button className="btn btn-ghost" onClick={() => setConfirming(null)}>
                            Not yet
                        </button>
                        <button className="btn btn-primary" onClick={() => confirming && redeem(confirming)}>
                            Yes, spend {confirming?.cost} points
                        </button>
                    </>
                }
            >
                <p>
                    <strong>{confirming?.title}</strong> costs {confirming?.cost} points. A parent will need to say yes.
                </p>
            </Modal>
        </div>
    );
}
