import { useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, CheckCircle2, Clock, Hourglass, LayoutGrid, RotateCcw, Rows3, Undo2 } from "lucide-react";
import { IconTile } from "../lib/icons";
import { friendlyDate, friendlyTime } from "../lib/format";
import { PointsPill } from "./game-widgets";
import type { ChoreInstance, InstanceStatus } from "../../../shared/types";

export type ViewMode = "cards" | "table";

export function ViewToggle({ value, onChange }: { value: ViewMode; onChange: (v: ViewMode) => void }) {
    const option = (mode: ViewMode, label: string, icon: React.ReactNode) => (
        <button
            className={`inline-flex min-h-10 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold transition-colors ${
                value === mode ? "bg-surface text-fg shadow-sm" : "text-muted hover:text-fg"
            }`}
            onClick={() => onChange(mode)}
            aria-pressed={value === mode}
        >
            {icon}
            <span className="hidden sm:inline">{label}</span>
            <span className="sr-only sm:hidden">{label}</span>
        </button>
    );
    return (
        <div className="inline-flex rounded-xl bg-surface-2 p-1" role="group" aria-label="View">
            {option("cards", "Cards", <LayoutGrid size={16} />)}
            {option("table", "Table", <Rows3 size={16} />)}
        </div>
    );
}

const STATUS_LABEL: Record<InstanceStatus, string> = {
    todo: "To do",
    submitted: "Waiting for approval",
    approved: "Approved",
    rejected: "Try again",
};

export function StatusChip({ status }: { status: InstanceStatus }) {
    const style: Record<InstanceStatus, string> = {
        todo: "bg-surface-2 text-muted",
        submitted: "bg-sky-500/12 text-sky-700 dark:text-sky-300",
        approved: "bg-green-500/12 text-green-700 dark:text-green-300",
        rejected: "bg-red-500/12 text-red-700 dark:text-red-300",
    };
    const icon: Record<InstanceStatus, React.ReactNode> = {
        todo: null,
        submitted: <Hourglass size={12} />,
        approved: <CheckCircle2 size={12} />,
        rejected: <RotateCcw size={12} />,
    };
    return (
        <span className={`chip ${style[status]}`}>
            {icon[status]}
            {STATUS_LABEL[status]}
        </span>
    );
}

interface ActionProps {
    today: string;
    onComplete?: (instance: ChoreInstance, el: HTMLElement | null) => void;
    onUndo?: (instance: ChoreInstance) => void;
    busyId?: number | null;
}

function canComplete(i: ChoreInstance, today: string): boolean {
    return (i.status === "todo" || i.status === "rejected") && i.date <= today;
}

export function ChoreCard({ instance, today, onComplete, onUndo, busyId }: ActionProps & { instance: ChoreInstance }) {
    const button = useRef<HTMLButtonElement>(null);
    const done = instance.status === "submitted" || instance.status === "approved";
    const future = instance.date > today;
    const time = friendlyTime(instance.dueTime);
    return (
        <motion.article
            layout
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={`card relative flex flex-col gap-4 overflow-hidden p-5 ${done ? "opacity-80" : ""}`}
            aria-label={instance.title}
        >
            <div
                className="absolute inset-x-0 top-0 h-1"
                style={{ background: instance.category.color, opacity: done ? 0.4 : 1 }}
                aria-hidden="true"
            />
            <div className="flex items-start gap-4">
                <IconTile name={instance.category.icon} color={instance.category.color} size={56} />
                <div className="min-w-0 flex-1">
                    <h3 className={`text-lg font-bold leading-snug ${done ? "text-muted line-through decoration-2" : ""}`}>
                        {instance.title}
                    </h3>
                    {instance.description && <p className="mt-0.5 text-sm text-muted">{instance.description}</p>}
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        <span className="chip">{instance.category.name}</span>
                        {(time || future || instance.date < today) && (
                            <span className="chip">
                                <Clock size={12} />
                                {instance.date !== today ? friendlyDate(instance.date, today) : ""}
                                {instance.date !== today && time ? " · " : ""}
                                {time ? `by ${time}` : ""}
                            </span>
                        )}
                    </div>
                </div>
                <PointsPill points={instance.status === "approved" ? instance.pointsAwarded : instance.points} />
            </div>

            {instance.status === "rejected" && (
                <p className="rounded-xl bg-red-500/10 px-3 py-2 text-sm font-medium text-red-700 dark:text-red-300">
                    Almost! {instance.note ?? "Have another go at this one."}
                </p>
            )}

            <div className="mt-auto">
                <AnimatePresence mode="wait" initial={false}>
                    {canComplete(instance, today) && onComplete ? (
                        <motion.button
                            key="do"
                            ref={button}
                            className="btn btn-primary h-14 w-full text-lg"
                            onClick={() => onComplete(instance, button.current)}
                            disabled={busyId === instance.id}
                            whileTap={{ scale: 0.96 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                        >
                            <Check size={22} strokeWidth={3} />
                            {instance.status === "rejected" ? "Done again!" : "I did it!"}
                        </motion.button>
                    ) : instance.status === "submitted" ? (
                        <motion.div
                            key="waiting"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="flex items-center justify-between gap-2 rounded-2xl bg-sky-500/10 px-4 py-3"
                        >
                            <span className="flex items-center gap-2 text-sm font-semibold text-sky-700 dark:text-sky-300">
                                <motion.span
                                    initial={{ rotate: -30, scale: 0 }}
                                    animate={{ rotate: 0, scale: 1 }}
                                    transition={{ type: "spring", damping: 10 }}
                                >
                                    <CheckCircle2 size={20} />
                                </motion.span>
                                Nice! Waiting for a parent to check
                            </span>
                            {onUndo && (
                                <button
                                    className="btn btn-ghost min-h-9 px-2 text-sm"
                                    onClick={() => onUndo(instance)}
                                    aria-label={`Undo ${instance.title}`}
                                >
                                    <Undo2 size={16} />
                                </button>
                            )}
                        </motion.div>
                    ) : instance.status === "approved" ? (
                        <div className="flex items-center gap-2 rounded-2xl bg-green-500/10 px-4 py-3 text-sm font-semibold text-green-700 dark:text-green-300">
                            <CheckCircle2 size={20} />
                            Approved! +{instance.pointsAwarded} points
                        </div>
                    ) : future ? (
                        <div className="rounded-2xl bg-surface-2 px-4 py-3 text-center text-sm font-semibold text-muted">
                            Coming up {friendlyDate(instance.date, today).toLowerCase()}
                        </div>
                    ) : null}
                </AnimatePresence>
            </div>
        </motion.article>
    );
}

export function ChoreGrid(props: ActionProps & { instances: ChoreInstance[] }) {
    return (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <AnimatePresence>
                {props.instances.map((i) => (
                    <ChoreCard key={i.id} instance={i} {...props} />
                ))}
            </AnimatePresence>
        </div>
    );
}

export function ChoreTable({ instances, today, onComplete, onUndo, busyId }: ActionProps & { instances: ChoreInstance[] }) {
    return (
        <div className="card overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead className="border-b border-line text-xs uppercase tracking-wide text-muted">
                        <tr>
                            <th className="px-4 py-3 font-semibold">Chore</th>
                            <th className="hidden px-4 py-3 font-semibold sm:table-cell">When</th>
                            <th className="px-4 py-3 font-semibold">Points</th>
                            <th className="px-4 py-3 text-right font-semibold">
                                <span className="sr-only">Action</span>
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {instances.map((i) => (
                            <tr key={i.id} className="border-b border-line last:border-0">
                                <td className="px-4 py-3">
                                    <div className="flex items-center gap-3">
                                        <IconTile name={i.category.icon} color={i.category.color} size={36} rounded="rounded-xl" />
                                        <div className="min-w-0">
                                            <div className="font-semibold">{i.title}</div>
                                            <div className="text-xs text-muted">{i.category.name}</div>
                                            {i.status === "rejected" && i.note && (
                                                <div className="text-xs font-medium text-danger">{i.note}</div>
                                            )}
                                        </div>
                                    </div>
                                </td>
                                <td className="hidden px-4 py-3 text-muted sm:table-cell">
                                    {friendlyDate(i.date, today)}
                                    {i.dueTime ? ` · ${friendlyTime(i.dueTime)}` : ""}
                                </td>
                                <td className="px-4 py-3">
                                    <PointsPill points={i.status === "approved" ? i.pointsAwarded : i.points} />
                                </td>
                                <td className="px-4 py-3 text-right">
                                    {canComplete(i, today) && onComplete ? (
                                        <button
                                            className="btn btn-primary min-h-10 px-3"
                                            onClick={(e) => onComplete(i, e.currentTarget)}
                                            disabled={busyId === i.id}
                                        >
                                            <Check size={18} strokeWidth={3} />
                                            <span className="hidden sm:inline">Done</span>
                                        </button>
                                    ) : (
                                        <div className="flex items-center justify-end gap-1">
                                            <StatusChip status={i.status} />
                                            {i.status === "submitted" && onUndo && (
                                                <button
                                                    className="btn btn-ghost btn-icon min-h-9"
                                                    onClick={() => onUndo(i)}
                                                    aria-label={`Undo ${i.title}`}
                                                >
                                                    <Undo2 size={16} />
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

// A compact, day-grouped list for future chores, so a week of daily chores doesn't flood the page.
export function UpcomingList({ instances, today }: { instances: ChoreInstance[]; today: string }) {
    const days = new Map<string, ChoreInstance[]>();
    for (const i of instances) {
        days.set(i.date, [...(days.get(i.date) ?? []), i]);
    }
    return (
        <div className="space-y-4">
            {[...days.entries()].map(([date, items]) => (
                <div key={date}>
                    <h3 className="mb-2 text-sm font-bold text-muted">{friendlyDate(date, today)}</h3>
                    <div className="card divide-y divide-line">
                        {items.map((i) => (
                            <div key={i.id} className="flex items-center gap-3 px-4 py-2.5">
                                <IconTile name={i.category.icon} color={i.category.color} size={32} rounded="rounded-lg" />
                                <span className="min-w-0 flex-1 truncate font-semibold">{i.title}</span>
                                {i.dueTime && <span className="hidden text-xs text-muted sm:inline">by {friendlyTime(i.dueTime)}</span>}
                                <PointsPill points={i.points} />
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}
