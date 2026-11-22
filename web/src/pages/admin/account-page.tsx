import { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronRight, Tags, UserRound, Users } from "lucide-react";
import { api } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { PageHeader, ThemeToggle } from "../../components/app-shell";
import { useToast } from "../../components/toast";
import { FormHint, SubmitButton, useFormFlow } from "../../components/form-kit";
import { TextField } from "../../components/text-field";
import { confirmError, passwordError } from "../../lib/validation";

export function AdminAccountPage() {
    const { user } = useAuth();
    return (
        <div className="max-w-xl space-y-6">
            <PageHeader title="My account" subtitle={`Logged in as @${user?.username}`} />
            <div className="card flex items-center justify-between p-5">
                <div>
                    <div className="font-semibold">Appearance</div>
                    <div className="text-sm text-muted">Follow your device, or pick light or dark.</div>
                </div>
                <ThemeToggle />
            </div>
            <ChangePasswordForm />
        </div>
    );
}

function ChangePasswordForm() {
    const notify = useToast();
    const [current, setCurrent] = useState("");
    const [next, setNext] = useState("");
    const [confirm, setConfirm] = useState("");
    const [busy, setBusy] = useState(false);
    // Bumped after a successful change to reset the fields' green/red state too.
    const [round, setRound] = useState(0);

    const errors = {
        current: current === "" ? "Enter your current password" : null,
        next: passwordError(next) ?? (next === current ? "Pick a different password" : null),
        confirm: confirmError(next, confirm),
    };
    const ready = Object.values(errors).every((e) => e === null);

    const { formId, tried, formProps } = useFormFlow({
        ready,
        onEscape: () => (document.activeElement as HTMLElement | null)?.blur(),
        onSubmit: async () => {
            setBusy(true);
            try {
                await api.post("/admin/me/password", { current, next });
                notify("Password changed", { tone: "success" });
                setCurrent("");
                setNext("");
                setConfirm("");
                setRound((r) => r + 1);
            } catch (err) {
                notify((err as Error).message, { tone: "error" });
            } finally {
                setBusy(false);
            }
        },
    });

    return (
        <form key={round} className="card space-y-4 p-5" {...formProps}>
            <h2 className="font-bold">Change password</h2>
            <TextField
                id="current"
                label="Current password"
                type="password"
                autoComplete="current-password"
                value={current}
                onChange={setCurrent}
                error={errors.current}
                showErrors={tried}
            />
            <div className="grid gap-4 sm:grid-cols-2">
                <TextField
                    id="next"
                    label="New password"
                    type="password"
                    autoComplete="new-password"
                    value={next}
                    onChange={setNext}
                    error={errors.next}
                    showErrors={tried}
                />
                <TextField
                    id="confirm"
                    label="Confirm"
                    type="password"
                    autoComplete="new-password"
                    value={confirm}
                    onChange={setConfirm}
                    error={errors.confirm}
                    showErrors={tried}
                />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3">
                <FormHint ready={ready} action="update your password" escape="leaves the form" />
                <SubmitButton formId={formId} ready={ready} busy={busy}>
                    Update password
                </SubmitButton>
            </div>
        </form>
    );
}

// The phone-sized "More" tab: links to pages that live in the sidebar on bigger screens.
export function AdminMorePage() {
    const links = [
        { to: "/admin/people", label: "People", hint: "Chore doers and parents", icon: <Users size={20} /> },
        { to: "/admin/categories", label: "Categories", hint: "Icons and colours for chores", icon: <Tags size={20} /> },
        { to: "/admin/account", label: "My account", hint: "Password and appearance", icon: <UserRound size={20} /> },
    ];
    return (
        <div>
            <PageHeader title="More" />
            <div className="card divide-y divide-line">
                {links.map((l) => (
                    <Link key={l.to} to={l.to} className="flex min-h-16 items-center gap-3 px-4 hover:bg-surface-2">
                        <span className="text-accent-ink">{l.icon}</span>
                        <span className="flex-1">
                            <span className="block font-semibold">{l.label}</span>
                            <span className="block text-xs text-muted">{l.hint}</span>
                        </span>
                        <ChevronRight size={18} className="text-muted" />
                    </Link>
                ))}
            </div>
        </div>
    );
}
