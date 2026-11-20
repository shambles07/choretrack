import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";

interface Toast {
    id: number;
    message: string;
    tone: "info" | "success" | "error";
    action?: { label: string; onClick: () => void };
}

type Notify = (message: string, opts?: { tone?: Toast["tone"]; action?: Toast["action"]; duration?: number }) => void;

const ToastContext = createContext<Notify>(() => undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);
    const nextId = useRef(1);

    const dismiss = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), []);

    const notify = useCallback<Notify>(
        (message, opts = {}) => {
            const id = nextId.current++;
            setToasts((t) => [...t.slice(-2), { id, message, tone: opts.tone ?? "info", action: opts.action }]);
            window.setTimeout(() => dismiss(id), opts.duration ?? 4000);
        },
        [dismiss],
    );

    return (
        <ToastContext.Provider value={notify}>
            {children}
            <div
                className="pointer-events-none fixed inset-x-0 bottom-24 z-50 flex flex-col items-center gap-2 px-4 lg:bottom-6"
                aria-live="polite"
            >
                <AnimatePresence>
                    {toasts.map((t) => (
                        <motion.div
                            key={t.id}
                            layout
                            initial={{ opacity: 0, y: 20, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                            className="pointer-events-auto flex max-w-md items-center gap-3 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white shadow-lg dark:bg-slate-100 dark:text-slate-900"
                            role={t.tone === "error" ? "alert" : "status"}
                        >
                            <span
                                className={`h-2 w-2 shrink-0 rounded-full ${
                                    t.tone === "error" ? "bg-red-400" : t.tone === "success" ? "bg-green-400" : "bg-indigo-400"
                                }`}
                            />
                            <span>{t.message}</span>
                            {t.action && (
                                <button
                                    className="ml-1 rounded-lg px-2 py-1 font-semibold text-indigo-300 hover:bg-white/10 dark:text-indigo-600 dark:hover:bg-black/5"
                                    onClick={() => {
                                        t.action!.onClick();
                                        dismiss(t.id);
                                    }}
                                >
                                    {t.action.label}
                                </button>
                            )}
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>
        </ToastContext.Provider>
    );
}

export function useToast(): Notify {
    return useContext(ToastContext);
}
