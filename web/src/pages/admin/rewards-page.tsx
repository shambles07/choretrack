import { useState } from "react";
import { Gift, Pencil, Plus, Trash2 } from "lucide-react";
import { api } from "../../lib/api";
import { useLoad } from "../../lib/use-load";
import { IconTile, REWARD_ICON_KEYS } from "../../lib/icons";
import { EmptyState, PageHeader } from "../../components/app-shell";
import { useToast } from "../../components/toast";
import { Modal } from "../../components/modal";
import { IconPicker } from "../../components/pickers";
import { PointsPill } from "../../components/game-widgets";
import { Switch } from "./chores-page";
import type { Redemption, Reward } from "../../../../shared/types";

type Draft = Omit<Reward, "id"> & { id?: number };

export function AdminRewardsPage() {
    const notify = useToast();
    const { data, reload } = useLoad<{ rewards: Reward[]; redemptions: Redemption[] }>("/admin/rewards");
    const [draft, setDraft] = useState<Draft | null>(null);

    if (!data) return <div className="card h-48 animate-pulse" />;

    const save = async (d: Draft) => {
        const { id, ...body } = d;
        try {
            if (id) await api.put(`/admin/rewards/${id}`, body);
            else await api.post("/admin/rewards", body);
            setDraft(null);
            await reload();
        } catch (e) {
            notify((e as Error).message, { tone: "error" });
        }
    };

    const remove = async (r: Reward) => {
        try {
            await api.del(`/admin/rewards/${r.id}`);
            notify("Reward removed");
            await reload();
        } catch (e) {
            notify((e as Error).message, { tone: "error" });
        }
    };

    return (
        <div className="space-y-8">
            <PageHeader
                title="Rewards"
                subtitle="What approved points can be spent on. Requests appear on the Overview."
                actions={
                    <button
                        className="btn btn-primary"
                        onClick={() => setDraft({ title: "", description: "", cost: 50, icon: "gift", active: true })}
                    >
                        <Plus size={18} /> New reward
                    </button>
                }
            />

            {data.rewards.length === 0 ? (
                <EmptyState icon={<Gift size={40} />} title="No rewards yet" />
            ) : (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {data.rewards.map((r) => (
                        <article key={r.id} className={`card flex flex-col gap-3 p-5 ${r.active ? "" : "opacity-60"}`}>
                            <div className="flex items-start gap-3">
                                <IconTile name={r.icon} color="#eab308" size={48} />
                                <div className="min-w-0 flex-1">
                                    <h3 className="font-bold">{r.title}</h3>
                                    {r.description && <p className="text-sm text-muted">{r.description}</p>}
                                </div>
                                <PointsPill points={r.cost} />
                            </div>
                            <div className="mt-auto flex items-center justify-between">
                                <Switch checked={r.active} onChange={(active) => save({ ...r, active })} label={`${r.title} available`} />
                                <div className="flex gap-1">
                                    <button className="btn btn-ghost btn-icon min-h-9" onClick={() => setDraft({ ...r })} aria-label={`Edit ${r.title}`}>
                                        <Pencil size={16} />
                                    </button>
                                    <button className="btn btn-ghost btn-icon min-h-9 text-danger" onClick={() => remove(r)} aria-label={`Delete ${r.title}`}>
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        </article>
                    ))}
                </div>
            )}

            {data.redemptions.length > 0 && (
                <section>
                    <h2 className="mb-3 text-lg font-bold">Recent requests</h2>
                    <div className="card divide-y divide-line">
                        {data.redemptions.map((r) => (
                            <div key={r.id} className="flex items-center gap-3 px-4 py-3 text-sm">
                                <IconTile name={r.rewardIcon} color="#eab308" size={32} rounded="rounded-lg" />
                                <div className="min-w-0 flex-1">
                                    <div className="font-semibold">{r.rewardTitle}</div>
                                    <div className="text-xs text-muted">
                                        {r.userName} · {new Date(r.requestedAt.replace(" ", "T") + "Z").toLocaleDateString()}
                                    </div>
                                </div>
                                <span
                                    className={`chip ${
                                        r.status === "approved"
                                            ? "bg-green-500/12 text-green-700 dark:text-green-300"
                                            : r.status === "pending"
                                              ? "bg-sky-500/12 text-sky-700 dark:text-sky-300"
                                              : ""
                                    }`}
                                >
                                    {r.status === "pending" ? "Waiting" : r.status === "approved" ? "Approved" : "Declined"}
                                </span>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {draft && (
                <Modal
                    open
                    onClose={() => setDraft(null)}
                    title={draft.id ? "Edit reward" : "New reward"}
                    footer={
                        <>
                            <button className="btn btn-ghost" onClick={() => setDraft(null)}>
                                Cancel
                            </button>
                            <button className="btn btn-primary" onClick={() => save(draft)} disabled={!draft.title.trim()}>
                                Save
                            </button>
                        </>
                    }
                >
                    <div className="space-y-5">
                        <div>
                            <label className="label" htmlFor="reward-title">
                                Reward
                            </label>
                            <input
                                id="reward-title"
                                className="input"
                                maxLength={80}
                                value={draft.title}
                                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                                placeholder="Movie night pick"
                            />
                        </div>
                        <div>
                            <label className="label" htmlFor="reward-desc">
                                Details (optional)
                            </label>
                            <input
                                id="reward-desc"
                                className="input"
                                maxLength={300}
                                value={draft.description}
                                onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="label" htmlFor="reward-cost">
                                Cost in points
                            </label>
                            <input
                                id="reward-cost"
                                type="number"
                                min={1}
                                className="input w-32"
                                value={draft.cost}
                                onChange={(e) => setDraft({ ...draft, cost: Math.max(1, Number(e.target.value) || 1) })}
                            />
                        </div>
                        <IconPicker label="Icon" icons={REWARD_ICON_KEYS} value={draft.icon} color="#eab308" onChange={(icon) => setDraft({ ...draft, icon })} />
                    </div>
                </Modal>
            )}
        </div>
    );
}
