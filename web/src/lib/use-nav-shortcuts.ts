import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

function isTyping(target: EventTarget | null): boolean {
    return (
        target instanceof HTMLElement &&
        (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))
    );
}

// Number keys 1–9 jump to the matching navigation entry. Holding Ctrl or Option/Alt shows
// the numbers. Shortcuts are ignored while typing in a field or when a dialog is open.
// Ctrl+number is left alone because browsers use it to switch tabs; Option/Alt+number works.
export function useNavShortcuts(paths: string[]): boolean {
    const navigate = useNavigate();
    const [showHints, setShowHints] = useState(false);

    useEffect(() => {
        const onDown = (e: KeyboardEvent) => {
            if (e.key === "Control" || e.key === "Alt") {
                setShowHints(true);
                return;
            }
            if (e.ctrlKey || e.metaKey || e.shiftKey || e.repeat) return;
            // e.code, not e.key: Option+1 on a Mac types "¡", but the code is still Digit1.
            const match = /^(?:Digit|Numpad)([1-9])$/.exec(e.code);
            if (!match || isTyping(e.target) || document.querySelector('[role="dialog"]')) return;
            const path = paths[Number(match[1]) - 1];
            if (!path) return;
            e.preventDefault();
            setShowHints(false);
            navigate(path);
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
    }, [paths, navigate]);

    return showHints;
}
