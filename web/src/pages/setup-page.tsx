import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { confirmError, passwordError, requiredError, usernameError } from "../lib/validation";
import { FormHint, SubmitButton, useFormFlow } from "../components/form-kit";
import { TextField } from "../components/text-field";
import { AuthLayout } from "./login-page";
import type { PublicUser } from "../../../shared/types";

export function SetupPage() {
    const { setUser } = useAuth();
    const navigate = useNavigate();
    const [form, setForm] = useState({ name: "", username: "", password: "", confirm: "" });
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    const set = (key: keyof typeof form) => (value: string) => {
        setForm((f) => ({ ...f, [key]: value }));
        setError(null);
    };

    const errors = {
        name: requiredError(form.name, "Your name"),
        username: usernameError(form.username),
        password: passwordError(form.password),
        confirm: confirmError(form.password, form.confirm),
    };
    const ready = Object.values(errors).every((e) => e === null);

    const { formId, tried, formProps } = useFormFlow({
        ready,
        onEscape: () => (document.activeElement as HTMLElement | null)?.blur(),
        onSubmit: async () => {
            setBusy(true);
            try {
                const res = await api.post<{ user: PublicUser }>("/setup", {
                    name: form.name.trim(),
                    username: form.username.trim(),
                    password: form.password,
                });
                setUser(res.user);
                navigate("/admin/people?welcome=1", { replace: true });
            } catch (err) {
                setError((err as Error).message);
            } finally {
                setBusy(false);
            }
        },
    });

    return (
        <AuthLayout>
            <form className="card w-full max-w-md space-y-4 p-6" {...formProps}>
                <div>
                    <h1 className="text-2xl font-extrabold">Welcome to ChoreTrack</h1>
                    <p className="text-muted">Create the parent account that manages everything.</p>
                </div>
                <TextField
                    id="name"
                    label="Your name"
                    autoFocus
                    maxLength={60}
                    placeholder="Mom"
                    value={form.name}
                    onChange={set("name")}
                    error={errors.name}
                    showErrors={tried}
                />
                <TextField
                    id="username"
                    label="Username"
                    autoCapitalize="none"
                    autoComplete="username"
                    spellCheck={false}
                    maxLength={40}
                    value={form.username}
                    onChange={set("username")}
                    error={errors.username}
                    showErrors={tried}
                />
                <div className="grid gap-4 sm:grid-cols-2">
                    <TextField
                        id="password"
                        label="Password"
                        type="password"
                        autoComplete="new-password"
                        value={form.password}
                        onChange={set("password")}
                        error={errors.password}
                        showErrors={tried}
                    />
                    <TextField
                        id="confirm"
                        label="Confirm"
                        type="password"
                        autoComplete="new-password"
                        value={form.confirm}
                        onChange={set("confirm")}
                        error={errors.confirm}
                        showErrors={tried}
                    />
                </div>
                {error && (
                    <p className="text-sm font-semibold text-danger" role="alert">
                        {error}
                    </p>
                )}
                <SubmitButton formId={formId} ready={ready} busy={busy} className="w-full">
                    Create account
                </SubmitButton>
                <FormHint ready={ready} action="create your account" className="min-h-5 text-center" />
            </form>
        </AuthLayout>
    );
}
