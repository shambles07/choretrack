import { useEffect, useId, useRef, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";

// Dialogs currently open. A closing dialog stays in the page while it animates out, so
// shortcuts ask this instead of looking for [role="dialog"] elements.
let openDialogs = 0;
export function isAnyDialogOpen(): boolean {
    return openDialogs > 0;
}

// Counts a dialog as open while `active` is true. Modal uses it; so does any other overlay.
export function useCountAsOpenDialog(active: boolean): void {
    useEffect(() => {
        if (!active) return;
        openDialogs += 1;
        return () => {
            openDialogs -= 1;
        };
    }, [active]);
}

// Bottom sheet on phones, centred dialog on larger screens.
export function Modal({
    open,
    onClose,
    title,
    children,
    footer,
}: {
    open: boolean;
    onClose: () => void;
    title: string;
    children: ReactNode;
    footer?: ReactNode;
}) {
    const titleId = useId();
    const panel = useRef<HTMLDivElement>(null);
    // Callers usually pass a new onClose on every render. Reading it through a ref keeps the
    // effect below from re-running (and re-focusing the first field) on every keystroke.
    useCountAsOpenDialog(open);
    const onCloseRef = useRef(onClose);
    useEffect(() => {
        onCloseRef.current = onClose;
    });

    useEffect(() => {
        if (!open) return;
        const previous = document.activeElement as HTMLElement | null;
        // Esc closes, and so does ⌘. (the macOS "cancel" shortcut).
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape" || (e.metaKey && e.key === ".")) {
                e.preventDefault();
                onCloseRef.current();
            }
        };
        document.addEventListener("keydown", onKey);
        document.body.style.overflow = "hidden";
        // Focus straight away (the panel is already rendered) so fast typists don't lose keys.
        const el = panel.current;
        (el?.querySelector<HTMLElement>("input, select, textarea") ?? el?.querySelector<HTMLElement>("button"))?.focus();
        return () => {
            document.removeEventListener("keydown", onKey);
            document.body.style.overflow = "";
            previous?.focus();
        };
    }, [open]);

    return (
        <AnimatePresence>
            {open && (
                <div className="fixed inset-0 z-40 flex items-end justify-center sm:items-center sm:p-4">
                    <motion.div
                        className="absolute inset-0 bg-slate-950/40 backdrop-blur-[2px]"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                    />
                    <motion.div
                        ref={panel}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby={titleId}
                        className="card relative flex max-h-[92dvh] w-full flex-col rounded-b-none sm:max-w-lg sm:rounded-b-[1.25rem]"
                        initial={{ y: 40, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 40, opacity: 0 }}
                        transition={{ type: "spring", damping: 28, stiffness: 320 }}
                    >
                        <div className="flex items-center justify-between border-b border-line px-5 py-4">
                            <h2 id={titleId} className="text-lg font-bold">
                                {title}
                            </h2>
                            <button className="btn btn-ghost btn-icon -mr-2" onClick={onClose} aria-label="Close">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="overflow-y-auto px-5 py-4">{children}</div>
                        {footer && (
                            <div className="flex justify-end gap-2 border-t border-line px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
                                {footer}
                            </div>
                        )}
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
