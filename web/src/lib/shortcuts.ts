// The single list of action shortcuts. The key handler and the "?" help dialog both read it.

export type ShortcutAction = "profile" | "new-chore" | "new-reward" | "new-category" | "theme" | "help";

export interface ActionShortcut {
    key: string;
    action: ShortcutAction;
    label: string;
    // Only parents can create chores, rewards and categories.
    adminOnly?: boolean;
}

export const ACTION_SHORTCUTS: ActionShortcut[] = [
    { key: "p", action: "profile", label: "Edit my profile" },
    { key: "c", action: "new-chore", label: "New chore", adminOnly: true },
    { key: "r", action: "new-reward", label: "New reward", adminOnly: true },
    { key: "a", action: "new-category", label: "New category", adminOnly: true },
    { key: "t", action: "theme", label: "Switch between light and dark" },
    { key: "?", action: "help", label: "Show these shortcuts" },
];

export function shortcutsFor(role: "admin" | "doer"): ActionShortcut[] {
    return ACTION_SHORTCUTS.filter((s) => role === "admin" || !s.adminOnly);
}
