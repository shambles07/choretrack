import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Pencil, Plus, Trash2, UserPlus } from "lucide-react";
import { api } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { useLoad } from "../../lib/use-load";
import { IconTile } from "../../lib/icons";
import { nameError, passwordError, pinError, usernameError } from "../../lib/validation";
import { FormHint, SubmitButton, useFormFlow } from "../../components/form-kit";
import { PageHeader } from "../../components/app-shell";
import { useToast } from "../../components/toast";
import { Modal } from "../../components/modal";
import { ProfileFields } from "../../components/profile-fields";
import { TextField } from "../../components/text-field";
import { Switch } from "./chores-page";
import type { PublicUser, Role } from "../../../../shared/types";

interface Draft {
    id?: number;
    role: Role;
    name: string;
    username: string;
    password: string;
    pin: string;
    avatar: string;
    color: string;
}

const blank = (role: Role): Draft => ({
    role,
    name: "",
    username: "",
    password: "",
    pin: "",
    avatar: role === "doer" ? "cat" : "crown",
    color: role === "doer" ? "#ec4899" : "#6366f1",
});

export function AdminPeoplePage() {
    const { user: me, setUser } = useAuth();
    const notify = useToast();
    const [params, setParams] = useSearchParams();
    const { data, reload } = useLoad<{ users: PublicUser[] }>("/admin/users");
    const [draft, setDraft] = useState<Draft | null>(null);
    const [deleting, setDeleting] = useState<PublicUser | null>(null);

    if (!data) return <div className="card h-48 animate-pulse" />;
    const doers = data.users.filter((u) => u.role === "doer");
    const admins = data.users.filter((u) => u.role === "admin");
    const welcome = params.get("welcome") === "1" && doers.length === 0;

    const save = async () => {
        if (!draft) return;
        const body: Record<string, unknown> = { name: draft.name.trim(), avatar: draft.avatar, color: draft.color };
        if (draft.role === "admin") {
            body.username = draft.username.trim();
            if (draft.password) body.password = draft.password;
        } else if (draft.pin) {
            body.pin = draft.pin;
        }
        try {
            if (draft.id) {
                const res = await api.patch<{ user: PublicUser }>(`/admin/users/${draft.id}`, body);
                // Editing yourself here should update the sidebar and accent colour right away.
                if (draft.id === me?.id) setUser(res.user);
            }
            else await api.post("/admin/users", { ...body, role: draft.role });
            notify(draft.id ? "Saved" : `${draft.name} added`, { tone: "success" });
            setDraft(null);
            if (welcome) setParams({});
            await reload();
        } catch (e) {
            notify((e as Error).message, { tone: "error" });
        }
    };

    const setActive = async (u: PublicUser, active: boolean) => {
        try {
            await api.patch(`/admin/users/${u.id}`, { active });
            await reload();
        } catch (e) {
            notify((e as Error).message, { tone: "error" });
        }
    };

    const remove = async () => {
        if (!deleting) return;
        try {
            await api.del(`/admin/users/${deleting.id}`);
            notify(`${deleting.name} removed`);
            setDeleting(null);
            await reload();
        } catch (e) {
            notify((e as Error).message, { tone: "error" });
        }
    };

    const row = (u: PublicUser) => (
        <div key={u.id} className={`flex items-center gap-3 px-4 py-3 ${u.active ? "" : "opacity-60"}`}>
            <IconTile name={u.avatar} color={u.color} size={44} solid />
            <div className="min-w-0 flex-1">
                <div className="font-semibold">
                    {u.name} {u.id === me?.id && <span className="chip ml-1">You</span>}
                </div>
                <div className="text-xs text-muted">{u.role === "admin" ? `@${u.username}` : "Logs in with a PIN"}</div>
            </div>
            {u.id !== me?.id && <Switch checked={u.active} onChange={(v) => setActive(u, v)} label={`${u.name} active`} />}
            <button
                className="btn btn-ghost btn-icon min-h-9"
                onClick={() => setDraft({ ...blank(u.role), id: u.id, name: u.name, username: u.username ?? "", avatar: u.avatar, color: u.color })}
                aria-label={`Edit ${u.name}`}
            >
                <Pencil size={16} />
            </button>
            {u.id !== me?.id && (
                <button className="btn btn-ghost btn-icon min-h-9 text-danger" onClick={() => setDeleting(u)} aria-label={`Delete ${u.name}`}>
                    <Trash2 size={16} />
                </button>
            )}
        </div>
    );

    return (
        <div className="space-y-8">
            <PageHeader title="People" subtitle="Parents manage everything. Chore doers see only their own chores." />

            {welcome && (
                <div className="card flex flex-wrap items-center gap-4 p-5" style={{ borderColor: "var(--accent)" }}>
                    <UserPlus className="text-accent-ink" size={32} />
                    <div className="flex-1">
                        <h2 className="font-bold">You're all set up!</h2>
                        <p className="text-sm text-muted">Next, add your child so you can start assigning chores.</p>
                    </div>
                    <button className="btn btn-primary" onClick={() => setDraft(blank("doer"))}>
                        Add chore doer
                    </button>
                </div>
            )}

            <section>
                <div className="mb-3 flex items-center justify-between">
                    <h2 className="text-lg font-bold">Chore doers</h2>
                    <button className="btn btn-soft" onClick={() => setDraft(blank("doer"))}>
                        <Plus size={18} /> Add
                    </button>
                </div>
                <div className="card divide-y divide-line">
                    {doers.length ? doers.map(row) : <p className="px-4 py-6 text-center text-muted">No chore doers yet.</p>}
                </div>
            </section>

            <section>
                <div className="mb-3 flex items-center justify-between">
                    <h2 className="text-lg font-bold">Parents</h2>
                    <button className="btn btn-soft" onClick={() => setDraft(blank("admin"))}>
                        <Plus size={18} /> Add
                    </button>
                </div>
                <div className="card divide-y divide-line">{admins.map(row)}</div>
            </section>

            {draft && <PersonDialog draft={draft} setDraft={setDraft} onSave={save} onClose={() => setDraft(null)} />}

            <Modal
                open={deleting !== null}
                onClose={() => setDeleting(null)}
                title={`Remove ${deleting?.name}?`}
                footer={
                    <>
                        <button className="btn btn-ghost" onClick={() => setDeleting(null)}>
                            Cancel
                        </button>
                        <button className="btn btn-danger" onClick={remove}>
                            <Trash2 size={16} /> Remove forever
                        </button>
                    </>
                }
            >
                <p>
                    This permanently deletes {deleting?.name}
                    {deleting?.role === "doer" ? ", their chores, points and trophies" : ""}. To keep their history, switch them
                    off instead.
                </p>
            </Modal>
        </div>
    );
}

function personErrors(draft: Draft) {
    return {
        name: nameError(draft.name),
        pin: draft.role === "doer" ? pinError(draft.pin, !draft.id) : null,
        username: draft.role === "admin" ? usernameError(draft.username) : null,
        password: draft.role === "admin" ? passwordError(draft.password, !draft.id) : null,
    };
}

function PersonDialog({
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
    const [busy, setBusy] = useState(false);
    const errors = personErrors(draft);
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
            title={draft.id ? `Edit ${draft.name || "person"}` : draft.role === "doer" ? "Add chore doer" : "Add parent"}
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
                <ProfileFields
                    idPrefix="person"
                    values={draft}
                    onChange={(values) => setDraft({ ...draft, ...values })}
                    showErrors={tried}
                />
                {draft.role === "doer" ? (
                    <div className="w-48">
                        <TextField
                            id="person-pin"
                            label={draft.id ? "New PIN" : "4-digit PIN"}
                            optional={Boolean(draft.id)}
                            quiet={false}
                            showErrors={tried}
                            inputClassName="text-center text-xl tracking-[0.5em]"
                            inputMode="numeric"
                            maxLength={4}
                            autoComplete="off"
                            value={draft.pin}
                            onChange={(pin) => setDraft({ ...draft, pin: pin.replace(/\D/g, "").slice(0, 4) })}
                            error={errors.pin}
                        />
                    </div>
                ) : (
                    <div className="grid gap-4 sm:grid-cols-2">
                        <TextField
                            id="person-username"
                            label="Username"
                            autoCapitalize="none"
                            autoComplete="off"
                            spellCheck={false}
                            maxLength={40}
                            value={draft.username}
                            onChange={(username) => setDraft({ ...draft, username })}
                            error={errors.username}
                            showErrors={tried}
                        />
                        <TextField
                            id="person-password"
                            label={draft.id ? "New password" : "Password"}
                            optional={Boolean(draft.id)}
                            type="password"
                            autoComplete="new-password"
                            value={draft.password}
                            onChange={(password) => setDraft({ ...draft, password })}
                            error={errors.password}
                            showErrors={tried}
                        />
                    </div>
                )}
            </form>
        </Modal>
    );
}
