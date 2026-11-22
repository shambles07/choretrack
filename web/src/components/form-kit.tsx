import { useId, useMemo, useState, type FormEvent, type KeyboardEvent, type ReactNode } from "react";
import { modifierLabels } from "../lib/platform";

// One set of keyboard and validation rules for every form in the app:
//   • Tab / Shift+Tab cycle through the form's controls and wrap around at the ends.
//     Elements marked data-skip-tab (Back links, the submit button) are left out: Enter submits.
//   • Enter submits from any single-line field. In a multi-line field, ⌘/Ctrl+Enter does.
//   • Submitting before the form is valid shows every error and moves to the first one.
//   • Esc runs onEscape (go back, close, or just leave the field).

const FOCUSABLE =
    'input:not([type="hidden"]):not(:disabled), select:not(:disabled), textarea:not(:disabled), ' +
    'button:not(:disabled), a[href], [tabindex]:not([tabindex="-1"])';

function focusables(form: HTMLElement): HTMLElement[] {
    return Array.from(form.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => !el.closest("[data-skip-tab]") && el.getClientRects().length > 0 && el.tabIndex !== -1,
    );
}

export function focusFirstError(form: HTMLElement | null): void {
    // Errors render on the next paint, after `tried` flips.
    requestAnimationFrame(() => form?.querySelector<HTMLElement>('[data-error="true"]')?.focus());
}

export function useFormFlow({
    ready,
    onSubmit,
    onEscape,
}: {
    ready: boolean;
    onSubmit: () => void | Promise<void>;
    onEscape?: () => void;
}) {
    const id = useId();
    const [tried, setTried] = useState(false);

    const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!ready) {
            setTried(true);
            focusFirstError(e.currentTarget);
            return;
        }
        void onSubmit();
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLFormElement>) => {
        const target = e.target as HTMLElement;
        if (e.key === "Tab") {
            const items = focusables(e.currentTarget);
            const index = items.indexOf(target);
            if (index === -1 || items.length < 2) return;
            const atEdge = e.shiftKey ? index === 0 : index === items.length - 1;
            if (atEdge) {
                e.preventDefault();
                items[e.shiftKey ? items.length - 1 : 0].focus();
            }
        } else if (e.key === "Enter" && target.tagName === "TEXTAREA" && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            e.currentTarget.requestSubmit();
        } else if (e.key === "Escape" && onEscape) {
            e.preventDefault();
            onEscape();
        }
    };

    return {
        formId: id,
        tried,
        formProps: { id, onSubmit: handleSubmit, onKeyDown: handleKeyDown, noValidate: true },
    };
}

// The form's default action. Always drawn as selected, because Enter submits it from any field.
// It stays clickable while the form is incomplete (aria-disabled, not disabled): a click then
// points at what's missing instead of silently doing nothing.
export function SubmitButton({
    formId,
    ready,
    busy = false,
    children,
    className = "",
}: {
    formId: string;
    ready: boolean;
    busy?: boolean;
    children: ReactNode;
    className?: string;
}) {
    const keys = useMemo(() => modifierLabels(), []);
    return (
        <button
            type="submit"
            form={formId}
            data-skip-tab
            className={`btn btn-primary btn-default-action ${ready ? "is-ready" : ""} ${className}`}
            disabled={busy}
            aria-disabled={!ready}
            aria-keyshortcuts="Enter"
        >
            {children}
            <kbd className="enter-key" aria-hidden="true">
                {keys.enter} ⏎
            </kbd>
        </button>
    );
}

// One line under (or beside) the form saying what the keyboard does right now.
export function FormHint({
    ready,
    action,
    escape,
    className = "",
}: {
    ready: boolean;
    action: string;
    escape?: string;
    className?: string;
}) {
    const keys = useMemo(() => modifierLabels(), []);
    return (
        <p className={`text-xs ${ready ? "font-semibold text-success" : "text-muted"} ${className}`} aria-live="polite">
            {ready ? (
                <>
                    All set. Press <kbd className="kbd-inline">{keys.enter} ⏎</kbd> to {action}.
                </>
            ) : (
                <>
                    <kbd className="kbd-inline">Tab ⇥</kbd> moves between fields
                    {escape && (
                        <>
                            {" "}
                            · <kbd className="kbd-inline">Esc</kbd> {escape}
                        </>
                    )}
                </>
            )}
        </p>
    );
}
