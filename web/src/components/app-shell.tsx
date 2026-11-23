import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
    ClipboardList,
    Gift,
    History,
    House,
    LayoutGrid,
    LogOut,
    Monitor,
    Moon,
    Sun,
    Tags,
    Trophy,
    UserRound,
    Users,
    Volume2,
    VolumeX,
} from "lucide-react";
import { useAuth } from "../lib/auth";
import { toggleLightDark, useTheme, type ThemePref } from "../lib/theme";
import { api } from "../lib/api";
import { setSoundEnabled } from "../lib/sound";
import { IconTile } from "../lib/icons";
import { applyAccent } from "../lib/accent";
import { useShortcuts } from "../lib/use-shortcuts";
import { shortcutsFor, type ShortcutAction } from "../lib/shortcuts";
import { ShortcutsDialog } from "./shortcuts-dialog";
import { useToast } from "./toast";
import { ProfileDialog } from "./profile-dialog";
import type { PublicUser } from "../../../shared/types";

interface NavItem {
    to: string;
    label: string;
    icon: ReactNode;
    end?: boolean;
    mobile?: boolean;
}

const ADMIN_NAV: NavItem[] = [
    { to: "/admin", label: "Overview", icon: <LayoutGrid size={20} />, end: true, mobile: true },
    { to: "/admin/chores", label: "Chores", icon: <ClipboardList size={20} />, mobile: true },
    { to: "/admin/history", label: "History", icon: <History size={20} />, mobile: true },
    { to: "/admin/rewards", label: "Rewards", icon: <Gift size={20} />, mobile: true },
    { to: "/admin/people", label: "People", icon: <Users size={20} /> },
    { to: "/admin/categories", label: "Categories", icon: <Tags size={20} /> },
    { to: "/admin/account", label: "My account", icon: <UserRound size={20} /> },
];

const DOER_NAV: NavItem[] = [
    { to: "/me", label: "My chores", icon: <House size={20} />, end: true, mobile: true },
    { to: "/me/rewards", label: "Rewards", icon: <Gift size={20} />, mobile: true },
    { to: "/me/trophies", label: "Trophies", icon: <Trophy size={20} />, mobile: true },
];

export function ThemeToggle() {
    const [pref, setPref] = useTheme();
    const order: ThemePref[] = ["system", "light", "dark"];
    const next = order[(order.indexOf(pref) + 1) % order.length];
    const icon = pref === "dark" ? <Moon size={20} /> : pref === "light" ? <Sun size={20} /> : <Monitor size={20} />;
    return (
        <button
            className="btn btn-ghost btn-icon"
            onClick={() => setPref(next)}
            aria-label={`Theme: ${pref}. Switch to ${next}.`}
            title={`Theme: ${pref}`}
        >
            {icon}
        </button>
    );
}

function SoundToggle({ user }: { user: PublicUser }) {
    const { setUser } = useAuth();
    const toggle = async () => {
        const res = await api.patch<{ user: PublicUser }>("/me", { soundEnabled: !user.soundEnabled });
        setUser(res.user);
        setSoundEnabled(res.user.soundEnabled);
    };
    return (
        <button
            className="btn btn-ghost btn-icon"
            onClick={toggle}
            aria-label={user.soundEnabled ? "Mute sounds" : "Turn sounds on"}
            title={user.soundEnabled ? "Sounds on" : "Sounds off"}
        >
            {user.soundEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
        </button>
    );
}

function KeyHint({ n, className }: { n: number; className: string }) {
    return (
        <kbd className={`kbd-hint ${className}`} aria-hidden="true">
            {n}
        </kbd>
    );
}

export function AppShell() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const nav = user?.role === "admin" ? ADMIN_NAV : DOER_NAV;
    const paths = useMemo(() => nav.map((n) => n.to), [nav]);
    const [editingProfile, setEditingProfile] = useState(false);
    const [helpOpen, setHelpOpen] = useState(false);
    const notify = useToast();
    const shortcuts = useMemo(() => shortcutsFor(user?.role ?? "doer"), [user?.role]);

    // "New …" shortcuts work from any page: go to the right page and ask it to open its form.
    const run = useCallback(
        (action: ShortcutAction) => {
            switch (action) {
                case "profile":
                    setEditingProfile(true);
                    break;
                case "new-chore":
                    navigate("/admin/chores?new=1");
                    break;
                case "new-reward":
                    navigate("/admin/rewards?new=1");
                    break;
                case "new-category":
                    navigate("/admin/categories?new=1");
                    break;
                case "theme":
                    notify(toggleLightDark() === "dark" ? "Dark theme" : "Light theme", { duration: 1500 });
                    break;
                case "help":
                    setHelpOpen(true);
                    break;
            }
        },
        [navigate, notify],
    );
    const showHints = useShortcuts(paths, shortcuts, run);

    // Everyone's favourite colour becomes the accent colour for buttons and highlights.
    useEffect(() => {
        applyAccent(user?.color ?? null);
        return () => applyAccent(null);
    }, [user?.color]);

    if (!user) return null;

    const signOut = async () => {
        await logout();
        navigate("/login");
    };

    const shortcutFor = (to: string) => paths.indexOf(to) + 1;

    return (
        <div className="min-h-dvh lg:flex">
            {/* Sidebar: tablets in landscape and desktops */}
            <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-line bg-surface px-4 py-6 lg:flex">
                <div className="mb-8 flex items-center gap-2 px-2 text-lg font-extrabold tracking-tight">
                    <img src="/icon.svg" alt="" className="h-8 w-8" />
                    ChoreTrack
                </div>
                <nav className="flex flex-1 flex-col gap-1" aria-label="Main">
                    {nav.map((item) => (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            end={item.end}
                            aria-keyshortcuts={String(shortcutFor(item.to))}
                            className={({ isActive }) =>
                                `relative flex min-h-11 items-center gap-3 rounded-xl px-3 font-semibold transition-colors ${
                                    isActive ? "bg-accent/12 text-accent-ink" : "text-muted hover:bg-surface-2 hover:text-fg"
                                }`
                            }
                        >
                            {showHints && <KeyHint n={shortcutFor(item.to)} className="-top-1.5 left-0.5" />}
                            {item.icon}
                            {item.label}
                        </NavLink>
                    ))}
                    <button
                        className="mt-3 flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-left text-xs text-muted hover:bg-surface-2 hover:text-fg"
                        onClick={() => setHelpOpen(true)}
                    >
                        Press <kbd className="kbd-inline">?</kbd> for keyboard shortcuts
                    </button>
                </nav>
                <div className="flex items-center gap-1 rounded-2xl bg-surface-2 p-1.5">
                    <button
                        className="group flex min-w-0 flex-1 items-center gap-3 rounded-xl p-1.5 text-left transition-colors hover:bg-surface"
                        onClick={() => setEditingProfile(true)}
                        title="Edit my profile"
                        aria-label={`Edit my profile (${user.name})`}
                    >
                        <IconTile name={user.avatar} color={user.color} size={36} rounded="rounded-xl" solid />
                        <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-bold">{user.name}</span>
                            <span className="block text-xs text-muted">
                                <span className="group-hover:hidden">{user.role === "admin" ? "Parent" : "Chore doer"}</span>
                                <span className="hidden group-hover:inline">Edit profile</span>
                            </span>
                        </span>
                    </button>
                    <button className="btn btn-ghost btn-icon" onClick={signOut} aria-label="Log out" title="Log out">
                        <LogOut size={18} />
                    </button>
                </div>
            </aside>

            <div className="min-w-0 flex-1">
                <header className="sticky top-0 z-30 border-b border-line bg-bg/85 backdrop-blur-md">
                    <div className="mx-auto flex h-16 max-w-6xl items-center gap-2 px-4 sm:px-6">
                        <div className="flex items-center gap-2 font-extrabold tracking-tight lg:hidden">
                            <img src="/icon.svg" alt="" className="h-7 w-7" />
                            ChoreTrack
                        </div>
                        <div className="flex-1" />
                        {user.role === "doer" && <SoundToggle user={user} />}
                        <ThemeToggle />
                        <button
                            className="btn btn-ghost btn-icon lg:hidden"
                            onClick={() => setEditingProfile(true)}
                            aria-label={`Edit my profile (${user.name})`}
                            title="Edit my profile"
                        >
                            <IconTile name={user.avatar} color={user.color} size={32} rounded="rounded-lg" solid />
                        </button>
                        <button className="btn btn-ghost btn-icon lg:hidden" onClick={signOut} aria-label="Log out">
                            <LogOut size={20} />
                        </button>
                    </div>
                </header>

                <main className="mx-auto max-w-6xl px-4 pb-28 pt-6 sm:px-6 lg:pb-12">
                    <Outlet />
                </main>
            </div>

            {/* Bottom tab bar: phones and portrait tablets */}
            <nav
                className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden"
                aria-label="Main"
            >
                <div className="mx-auto flex max-w-xl justify-around">
                    {nav
                        .filter((n) => n.mobile)
                        .map((item) => (
                            <NavLink
                                key={item.to}
                                to={item.to}
                                end={item.end}
                                aria-keyshortcuts={String(shortcutFor(item.to))}
                                className={({ isActive }) =>
                                    `relative flex min-h-16 flex-1 flex-col items-center justify-center gap-1 text-[11px] font-semibold ${
                                        isActive ? "text-accent-ink" : "text-muted"
                                    }`
                                }
                            >
                                {showHints && <KeyHint n={shortcutFor(item.to)} className="left-1/2 top-0.5 ml-3" />}
                                {item.icon}
                                {item.label}
                            </NavLink>
                        ))}
                    {user.role === "admin" && (
                        <NavLink
                            to="/admin/more"
                            className={({ isActive }) =>
                                `flex min-h-16 flex-1 flex-col items-center justify-center gap-1 text-[11px] font-semibold ${
                                    isActive ? "text-accent-ink" : "text-muted"
                                }`
                            }
                        >
                            <UserRound size={20} />
                            More
                        </NavLink>
                    )}
                </div>
            </nav>

            {editingProfile && <ProfileDialog open onClose={() => setEditingProfile(false)} />}
            <ShortcutsDialog open={helpOpen} onClose={() => setHelpOpen(false)} role={user.role} nav={nav} />
        </div>
    );
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: ReactNode; actions?: ReactNode }) {
    return (
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
            <div>
                <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{title}</h1>
                {subtitle && <p className="mt-1 text-muted">{subtitle}</p>}
            </div>
            {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
        </div>
    );
}

export function EmptyState({ icon, title, children }: { icon: ReactNode; title: string; children?: ReactNode }) {
    return (
        <div className="card flex flex-col items-center px-6 py-12 text-center">
            <div className="mb-3 text-muted">{icon}</div>
            <h3 className="text-lg font-bold">{title}</h3>
            {children && <div className="mt-1 max-w-sm text-muted">{children}</div>}
        </div>
    );
}
