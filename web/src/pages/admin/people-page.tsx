import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Pencil, Plus, Trash2, UserPlus } from "lucide-react";
import { api } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { useLoad } from "../../lib/use-load";
import { IconTile } from "../../lib/icons";
import { nameError, pinError } from "../../lib/validation";
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

    const draftValid =
        draft !== null &&
        nameError(draft.name) === null &&
        (draft.role === "admin" || pinError(draft.pin, !draft.id) === null);

    const save = async () => {
        if (!draft || !draftValid) return;
        const body: Record<string, unknown> = { name: draft.name, avatar: draft.avatar, color: draft.color };
        if (draft.role === "admin") {
            body.username = draft.username;
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

            {draft && (
                <Modal
                    open
                    onClose={() => setDraft(null)}
                    title={draft.id ? `Edit ${draft.name}` : draft.role === "doer" ? "Add chore doer" : "Add parent"}
                    footer={
                        <>
                            <button className="btn btn-ghost" onClick={() => setDraft(null)}>
                                Cancel
                            </button>
                            <button className="btn btn-primary" onClick={save} disabled={!draftValid}>
                                Save
                            </button>
                        </>
                    }
                >
                    <form
                        className="space-y-5"
                        noValidate
                        onSubmit={(e) => {
                            e.preventDefault();
                            void save();
                        }}
                    >
                        <ProfileFields
                            idPrefix="person"
                            values={draft}
                            onChange={(values) => setDraft({ ...draft, ...values })}
                        />
                        {draft.role === "doer" ? (
                            <div className="w-48">
                                <TextField
                                    id="person-pin"
                                    label={draft.id ? "New PIN (blank keeps the old one)" : "4-digit PIN"}
                                    inputClassName="text-center text-xl tracking-[0.5em]"
                                    inputMode="numeric"
                                    maxLength={4}
                                    autoComplete="off"
                                    value={draft.pin}
                                    onChange={(pin) => setDraft({ ...draft, pin: pin.replace(/\D/g, "").slice(0, 4) })}
                                    error={pinError(draft.pin, !draft.id)}
                                />
                            </div>
                        ) : (
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div>
                                    <label className="label" htmlFor="person-username">
                                        Username
                                    </label>
                                    <input
                                        id="person-username"
                                        className="input"
                                        autoCapitalize="none"
                                        value={draft.username}
                                        onChange={(e) => setDraft({ ...draft, username: e.target.value })}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="label" htmlFor="person-password">
                                        {draft.id ? "New password (optional)" : "Password"}
                                    </label>
                                    <input
                                        id="person-password"
                                        type="password"
                                        className="input"
                                        autoComplete="new-password"
                                        minLength={8}
                                        value={draft.password}
                                        onChange={(e) => setDraft({ ...draft, password: e.target.value })}
                                        required={!draft.id}
                                    />
                                </div>
                            </div>
                        )}
                        <button type="submit" className="hidden" />
                    </form>
                </Modal>
            )}

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
