import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { AuthLayout } from "./login-page";
import type { PublicUser } from "../../../shared/types";

export function SetupPage() {
    const { setUser } = useAuth();
    const navigate = useNavigate();
    const [form, setForm] = useState({ name: "", username: "", password: "", confirm: "" });
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    const update = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
        setForm((f) => ({ ...f, [key]: e.target.value }));

    const submit = async (e: FormEvent) => {
        e.preventDefault();
        if (form.password !== form.confirm) {
            setError("The passwords don't match.");
            return;
        }
        setBusy(true);
        try {
            const res = await api.post<{ user: PublicUser }>("/setup", {
                name: form.name,
                username: form.username,
                password: form.password,
            });
            setUser(res.user);
            navigate("/admin/people?welcome=1", { replace: true });
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setBusy(false);
        }
    };

    return (
        <AuthLayout>
            <form className="card w-full max-w-md space-y-4 p-6" onSubmit={submit}>
                <div>
                    <h1 className="text-2xl font-extrabold">Welcome to ChoreTrack</h1>
                    <p className="text-muted">Create the parent account that manages everything.</p>
                </div>
                <div>
                    <label className="label" htmlFor="name">
                        Your name
                    </label>
                    <input id="name" className="input" autoFocus value={form.name} onChange={update("name")} placeholder="Mom" required />
                </div>
                <div>
                    <label className="label" htmlFor="username">
                        Username
                    </label>
                    <input
                        id="username"
                        className="input"
                        autoCapitalize="none"
                        autoComplete="username"
                        value={form.username}
                        onChange={update("username")}
                        required
                    />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                        <label className="label" htmlFor="password">
                            Password
                        </label>
                        <input
                            id="password"
                            type="password"
                            className="input"
                            autoComplete="new-password"
                            minLength={8}
                            value={form.password}
                            onChange={update("password")}
                            required
                        />
                    </div>
                    <div>
                        <label className="label" htmlFor="confirm">
                            Confirm
                        </label>
                        <input
                            id="confirm"
                            type="password"
                            className="input"
                            autoComplete="new-password"
                            value={form.confirm}
                            onChange={update("confirm")}
                            required
                        />
                    </div>
                </div>
                <p className="text-xs text-muted">At least 8 characters.</p>
                {error && (
                    <p className="text-sm font-semibold text-danger" role="alert">
                        {error}
                    </p>
                )}
                <button className="btn btn-primary w-full" disabled={busy}>
                    Create account
                </button>
            </form>
        </AuthLayout>
    );
}
