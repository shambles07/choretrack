import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { ChevronRight, Tags, UserRound, Users } from "lucide-react";
import { api } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { PageHeader, ThemeToggle } from "../../components/app-shell";
import { useToast } from "../../components/toast";

export function AdminAccountPage() {
    const { user } = useAuth();
    const notify = useToast();
    const [current, setCurrent] = useState("");
    const [next, setNext] = useState("");
    const [confirm, setConfirm] = useState("");

    const submit = async (e: FormEvent) => {
        e.preventDefault();
        if (next !== confirm) {
            notify("The new passwords don't match.", { tone: "error" });
            return;
        }
        try {
            await api.post("/admin/me/password", { current, next });
            notify("Password changed", { tone: "success" });
            setCurrent("");
            setNext("");
            setConfirm("");
        } catch (err) {
            notify((err as Error).message, { tone: "error" });
        }
    };

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
            <form className="card space-y-4 p-5" onSubmit={submit}>
                <h2 className="font-bold">Change password</h2>
                <div>
                    <label className="label" htmlFor="current">
                        Current password
                    </label>
                    <input id="current" type="password" className="input" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} required />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                        <label className="label" htmlFor="next">
                            New password
                        </label>
                        <input id="next" type="password" className="input" autoComplete="new-password" minLength={8} value={next} onChange={(e) => setNext(e.target.value)} required />
                    </div>
                    <div>
                        <label className="label" htmlFor="confirm">
                            Confirm
                        </label>
                        <input id="confirm" type="password" className="input" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
                    </div>
                </div>
                <button className="btn btn-primary">Update password</button>
            </form>
        </div>
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
