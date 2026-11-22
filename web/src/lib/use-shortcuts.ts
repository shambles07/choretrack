import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { ActionShortcut, ShortcutAction } from "./shortcuts";
import { isAnyDialogOpen } from "../components/modal";

function isTyping(target: EventTarget | null): boolean {
    return (
        target instanceof HTMLElement &&
        (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))
    );
}

// App-wide keyboard shortcuts:
//   • 1–9 jump to the matching navigation entry (Option/Alt+number too). Holding Ctrl or
//     Option/Alt shows the numbers. Ctrl+number is left alone: browsers use it to switch tabs.
//   • Single letters and "?" run the actions in `shortcuts` (see lib/shortcuts.ts).
// Nothing fires while typing in a field or while a dialog is open.
export function useShortcuts(
    paths: string[],
    shortcuts: ActionShortcut[],
    run: (action: ShortcutAction) => void,
): boolean {
    const navigate = useNavigate();
    const [showHints, setShowHints] = useState(false);

    useEffect(() => {
        const onDown = (e: KeyboardEvent) => {
            if (e.key === "Control" || e.key === "Alt") {
                setShowHints(true);
                return;
            }
            if (e.ctrlKey || e.metaKey || e.repeat) return;
            if (isTyping(e.target) || isAnyDialogOpen()) return;

            // e.code, not e.key: Option+1 on a Mac types "¡", but the code is still Digit1.
            const digit = /^(?:Digit|Numpad)([1-9])$/.exec(e.code);
            if (digit && !e.shiftKey) {
                const path = paths[Number(digit[1]) - 1];
                if (!path) return;
                e.preventDefault();
                setShowHints(false);
                navigate(path);
                return;
            }

            // "?" needs Shift on most layouts; letters must be pressed on their own.
            if (e.altKey || (e.shiftKey && e.key !== "?")) return;
            const shortcut = shortcuts.find((s) => s.key === e.key.toLowerCase());
            if (!shortcut) return;
            e.preventDefault();
            run(shortcut.action);
        };
        const onUp = (e: KeyboardEvent) => setShowHints(e.ctrlKey || e.altKey);
        const hide = () => setShowHints(false);
        window.addEventListener("keydown", onDown);
        window.addEventListener("keyup", onUp);
        window.addEventListener("blur", hide);
        return () => {
            window.removeEventListener("keydown", onDown);
            window.removeEventListener("keyup", onUp);
            window.removeEventListener("blur", hide);
        };
    }, [paths, shortcuts, run, navigate]);

    return showHints;
}
