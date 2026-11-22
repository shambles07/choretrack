import { useState } from "react";
import { Gift, Pencil, Plus, Trash2 } from "lucide-react";
import { api } from "../../lib/api";
import { useLoad } from "../../lib/use-load";
import { useNewParam } from "../../lib/use-new-param";
import { IconTile, REWARD_ICON_KEYS } from "../../lib/icons";
import { EmptyState, PageHeader } from "../../components/app-shell";
import { useToast } from "../../components/toast";
import { Modal } from "../../components/modal";
import { IconPicker } from "../../components/pickers";
import { PointsPill } from "../../components/game-widgets";
import { Switch } from "./chores-page";
import { FormHint, SubmitButton, useFormFlow } from "../../components/form-kit";
import { TextField } from "../../components/text-field";
import { requiredError, wholeNumberError } from "../../lib/validation";
import type { Redemption, Reward } from "../../../../shared/types";

type Draft = Omit<Reward, "id"> & { id?: number };

export function AdminRewardsPage() {
    const notify = useToast();
    const { data, reload } = useLoad<{ rewards: Reward[]; redemptions: Redemption[] }>("/admin/rewards");
    const [draft, setDraft] = useState<Draft | null>(null);

    useNewParam(Boolean(data), () => setDraft({ title: "", description: "", cost: 50, icon: "gift", active: true }));

    if (!data) return <div className="card h-48 animate-pulse" />;

    const save = async (d: Draft) => {
        const { id, ...body } = { ...d, title: d.title.trim(), description: d.description.trim() };
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

            {draft && <RewardDialog draft={draft} setDraft={setDraft} onSave={() => save(draft)} onClose={() => setDraft(null)} />}
        </div>
    );
}

function RewardDialog({
    draft,
    setDraft,
    onSave,
    onClose,
}: {
    draft: Draft;
    setDraft: (d: Draft) => void;
    onSave: () => Promise<void>;
    onClose: () => void;
}) {
    const [costText, setCostText] = useState(String(draft.cost));
    const [busy, setBusy] = useState(false);
    const errors = {
        title: requiredError(draft.title, "The reward"),
        cost: wholeNumberError(costText, 1, 100000, "a cost"),
    };
    const ready = Object.values(errors).every((e) => e === null);
    const { formId, tried, formProps } = useFormFlow({
        ready,
        onSubmit: async () => {
            setBusy(true);
            await onSave();
            setBusy(false);
        },
    });

    return (
        <Modal
            open
            onClose={onClose}
            title={draft.id ? "Edit reward" : "New reward"}
            footer={
                <>
                    <FormHint ready={ready} action="save" escape="closes" className="mr-auto hidden sm:block" />
                    <button className="btn btn-ghost" onClick={onClose}>
                        Cancel
                    </button>
                    <SubmitButton formId={formId} ready={ready} busy={busy}>
                        Save
                    </SubmitButton>
                </>
            }
        >
            <form className="space-y-5" {...formProps}>
                <TextField
                    id="reward-title"
                    label="Reward"
                    maxLength={80}
                    placeholder="Movie night pick"
                    value={draft.title}
                    onChange={(title) => setDraft({ ...draft, title })}
                    error={errors.title}
                    showErrors={tried}
                />
                <TextField
                    id="reward-desc"
                    label="Details"
                    optional
                    maxLength={300}
                    value={draft.description}
                    onChange={(description) => setDraft({ ...draft, description })}
                    error={null}
                />
                <div className="w-40">
                    <TextField
                        id="reward-cost"
                        label="Cost in points"
                        inputMode="numeric"
                        maxLength={6}
                        value={costText}
                        onChange={(text) => {
                            setCostText(text);
                            if (wholeNumberError(text, 1, 100000, "a cost") === null) setDraft({ ...draft, cost: Number(text) });
                        }}
                        error={errors.cost}
                        showErrors={tried}
                    />
                </div>
                <IconPicker label="Icon" icons={REWARD_ICON_KEYS} value={draft.icon} color="#eab308" onChange={(icon) => setDraft({ ...draft, icon })} />
            </form>
        </Modal>
    );
}
