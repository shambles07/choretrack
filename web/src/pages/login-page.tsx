import { useEffect, useMemo, useState, type FormEvent } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Delete, KeyRound } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { IconTile } from "../lib/icons";
import { ThemeToggle } from "../components/app-shell";
import { TextField } from "../components/text-field";
import { modifierLabels } from "../lib/platform";
import type { DoerProfile, PublicUser } from "../../../shared/types";

export function AuthLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex min-h-dvh flex-col">
            <header className="flex items-center justify-between px-4 py-3 sm:px-6">
                <div className="flex items-center gap-2 font-extrabold tracking-tight">
                    <img src="/icon.svg" alt="" className="h-8 w-8" />
                    ChoreTrack
                </div>
                <ThemeToggle />
            </header>
            <main className="flex flex-1 items-center justify-center px-4 pb-12">{children}</main>
        </div>
    );
}

export function LoginPage() {
    const [doers, setDoers] = useState<DoerProfile[] | null>(null);
    const [picked, setPicked] = useState<DoerProfile | null>(null);
    const [parentMode, setParentMode] = useState(false);

    useEffect(() => {
        api.get<{ doers: DoerProfile[] }>("/auth/doers")
            .then((r) => {
                setDoers(r.doers);
                if (r.doers.length === 0) setParentMode(true);
            })
            .catch(() => setDoers([]));
    }, []);

    if (!doers) return <AuthLayout>{null}</AuthLayout>;

    return (
        <AuthLayout>
            {parentMode ? (
                <ParentLogin onBack={doers.length > 0 ? () => setParentMode(false) : undefined} />
            ) : picked ? (
                <PinPad doer={picked} onBack={() => setPicked(null)} />
            ) : (
                <div className="w-full max-w-2xl text-center">
                    <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Who's doing chores?</h1>
                    <p className="mt-2 text-muted">Tap your picture to get started.</p>
                    <div className="mt-8 flex flex-wrap justify-center gap-4">
                        {doers.map((d, i) => (
                            <motion.button
                                key={d.id}
                                className="card flex w-36 flex-col items-center gap-3 p-5 transition-transform hover:-translate-y-1"
                                onClick={() => setPicked(d)}
                                initial={{ opacity: 0, y: 16 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.05 }}
                                whileTap={{ scale: 0.95 }}
                            >
                                <IconTile name={d.avatar} color={d.color} size={80} rounded="rounded-3xl" solid />
                                <span className="text-lg font-bold">{d.name}</span>
                            </motion.button>
                        ))}
                    </div>
                    <button className="btn btn-ghost mt-10 text-muted" onClick={() => setParentMode(true)}>
                        <KeyRound size={18} />
                        Parent login
                    </button>
                </div>
            )}
        </AuthLayout>
    );
}

function useLoggedIn() {
    const { setUser } = useAuth();
    const navigate = useNavigate();
    return (user: PublicUser) => {
        setUser(user);
        navigate(user.role === "admin" ? "/admin" : "/me", { replace: true });
    };
}

function PinPad({ doer, onBack }: { doer: DoerProfile; onBack: () => void }) {
    const [pin, setPin] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [shake, setShake] = useState(0);
    const loggedIn = useLoggedIn();

    const submit = async (value: string) => {
        try {
            const res = await api.post<{ user: PublicUser }>("/auth/pin", { userId: doer.id, pin: value });
            loggedIn(res.user);
        } catch (e) {
            setError((e as Error).message);
            setShake((s) => s + 1);
            setPin("");
        }
    };

    const press = (digit: string) => {
        if (pin.length >= 4) return;
        const next = pin + digit;
        setPin(next);
        setError(null);
        if (next.length === 4) void submit(next);
    };

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (/^\d$/.test(e.key)) press(e.key);
            else if (e.key === "Backspace") setPin((p) => p.slice(0, -1));
            else if (e.key === "Escape") onBack();
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    });

    return (
        <div className="w-full max-w-xs text-center" style={{ "--accent": doer.color } as React.CSSProperties}>
            <div className="mb-4 text-left">
                <button className="btn btn-ghost -ml-2 text-muted" onClick={onBack}>
                    <ArrowLeft size={18} /> Back
                </button>
            </div>
            <IconTile name={doer.avatar} color={doer.color} size={88} rounded="rounded-3xl" solid />
            <h1 className="mt-3 text-2xl font-extrabold">Hi, {doer.name}!</h1>
            <p className="text-muted">Enter your secret PIN</p>
            <motion.div
                key={shake}
                className="my-6 flex justify-center gap-3"
                animate={shake ? { x: [0, -10, 10, -6, 6, 0] } : {}}
                transition={{ duration: 0.4 }}
                aria-label={`${pin.length} of 4 digits entered`}
            >
                {[0, 1, 2, 3].map((i) => (
                    <span
                        key={i}
                        className="h-4 w-4 rounded-full border-2 transition-colors"
                        style={{ borderColor: doer.color, background: i < pin.length ? doer.color : "transparent" }}
                    />
                ))}
            </motion.div>
            <p className="mb-3 min-h-6 text-sm font-semibold text-danger" role="alert">
                {error}
            </p>
            <div className="grid grid-cols-3 gap-3">
                {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
                    <button key={d} className="btn btn-soft h-16 text-2xl" onClick={() => press(d)}>
                        {d}
                    </button>
                ))}
                <span />
                <button className="btn btn-soft h-16 text-2xl" onClick={() => press("0")}>
                    0
                </button>
                <button className="btn btn-ghost h-16" onClick={() => setPin((p) => p.slice(0, -1))} aria-label="Delete">
                    <Delete size={24} />
                </button>
            </div>
        </div>
    );
}

function ParentLogin({ onBack }: { onBack?: () => void }) {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const [triedSubmit, setTriedSubmit] = useState(false);
    const loggedIn = useLoggedIn();
    const keys = useMemo(() => modifierLabels(), []);

    const usernameError = username.trim() === "" ? "Enter your username" : null;
    // Every parent password is at least 8 characters (setup, People and the reset script all require it).
    const passwordError =
        password === "" ? "Enter your password" : password.length < 8 ? "Passwords are at least 8 characters" : null;
    const ready = !usernameError && !passwordError;

    const submit = async (e: FormEvent) => {
        e.preventDefault();
        if (!ready) {
            setTriedSubmit(true);
            document.getElementById(usernameError ? "username" : "password")?.focus();
            return;
        }
        setBusy(true);
        try {
            const res = await api.post<{ user: PublicUser }>("/auth/login", { username: username.trim(), password });
            loggedIn(res.user);
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setBusy(false);
        }
    };

    // Tab and Shift+Tab cycle between the two fields; Enter submits; Esc leaves the form.
    const onKeyDown = (e: React.KeyboardEvent<HTMLFormElement>) => {
        const id = (e.target as HTMLElement).id;
        if (e.key === "Tab" && ((id === "password" && !e.shiftKey) || (id === "username" && e.shiftKey))) {
            e.preventDefault();
            document.getElementById(id === "password" ? "username" : "password")?.focus();
        } else if (e.key === "Escape" && (id === "username" || id === "password")) {
            e.preventDefault();
            if (onBack) onBack();
            else (e.target as HTMLElement).blur();
        }
    };

    return (
        <form className="card w-full max-w-sm space-y-4 p-6" onSubmit={submit} onKeyDown={onKeyDown} noValidate>
            {onBack && (
                <button type="button" className="btn btn-ghost -ml-2 -mt-2 text-muted" onClick={onBack}>
                    <ArrowLeft size={18} /> Back
                </button>
            )}
            <div>
                <h1 className="text-2xl font-extrabold">Parent login</h1>
                <p className="text-muted">Manage chores, approvals and rewards.</p>
            </div>
            <TextField
                id="username"
                label="Username"
                quiet
                showErrors={triedSubmit}
                // The "Parent login" button that opened this form is gone, so without this
                // nothing has focus and the first Tab lands in the page header, not the form.
                autoFocus
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                value={username}
                onChange={(v) => {
                    setUsername(v);
                    setError(null);
                }}
                error={usernameError}
            />
            <TextField
                id="password"
                label="Password"
                type="password"
                quiet
                showErrors={triedSubmit}
                autoComplete="current-password"
                value={password}
                onChange={(v) => {
                    setPassword(v);
                    setError(null);
                }}
                error={passwordError}
            />
            {error && (
                <p className="text-sm font-semibold text-danger" role="alert">
                    {error}
                </p>
            )}
            {/* The default action: always drawn as selected, because Enter submits from either field. */}
            <button
                type="submit"
                className={`btn btn-primary btn-default-action w-full ${ready ? "is-ready" : ""}`}
                disabled={busy}
                aria-disabled={!ready}
                aria-keyshortcuts="Enter"
            >
                Log in
                <kbd className="enter-key" aria-hidden="true">
                    {keys.enter} ⏎
                </kbd>
            </button>
            <p className={`min-h-5 text-center text-xs ${ready ? "font-semibold text-success" : "text-muted"}`} aria-live="polite">
                {ready ? (
                    <>
                        All set. Press <kbd className="kbd-inline">{keys.enter} ⏎</kbd> to log in.
                    </>
                ) : (
                    <>
                        <kbd className="kbd-inline">Tab ⇥</kbd> switches fields · <kbd className="kbd-inline">Esc</kbd>{" "}
                        {onBack ? "goes back" : "leaves the form"}
                    </>
                )}
            </p>
        </form>
    );
}
