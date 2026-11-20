import { useMemo, useState } from "react";
import { Check, History, RotateCcw } from "lucide-react";
import { api } from "../../lib/api";
import { useLoad } from "../../lib/use-load";
import { IconTile } from "../../lib/icons";
import { addDays, friendlyDate, toDateString } from "../../lib/format";
import { EmptyState, PageHeader } from "../../components/app-shell";
import { useToast } from "../../components/toast";
import { PointsPill } from "../../components/game-widgets";
import { StatusChip } from "../../components/chore-views";
import type { ChoreInstance, InstanceStatus, PublicUser } from "../../../../shared/types";

const RANGES = [
    { label: "Last 7 days", days: 7 },
    { label: "Last 30 days", days: 30 },
    { label: "Last 90 days", days: 90 },
];

export function AdminHistoryPage() {
    const notify = useToast();
    const today = toDateString(new Date());
    const [days, setDays] = useState(7);
    const [status, setStatus] = useState<InstanceStatus | "all">("all");
    const { data, reload } = useLoad<{ instances: ChoreInstance[] }>(`/admin/instances?from=${addDays(today, -(days - 1))}&to=${today}`);
    const users = useLoad<{ users: PublicUser[] }>("/admin/users");
    const names = new Map((users.data?.users ?? []).map((u) => [u.id, u.name]));
    const multipleDoers = (users.data?.users ?? []).filter((u) => u.role === "doer").length > 1;

    const rows = useMemo(
        () => (data?.instances ?? []).filter((i) => status === "all" || i.status === status),
        [data, status],
    );
    const totals = useMemo(() => {
        const all = data?.instances ?? [];
        const approved = all.filter((i) => i.status === "approved");
        return {
            approved: approved.length,
            points: approved.reduce((s, i) => s + i.pointsAwarded, 0),
            rate: all.length ? Math.round((approved.length / all.length) * 100) : 0,
        };
    }, [data]);

    const run = async (fn: () => Promise<unknown>, message: string) => {
        try {
            await fn();
            notify(message, { tone: "success" });
            await reload();
        } catch (e) {
            notify((e as Error).message, { tone: "error" });
        }
    };

    return (
        <div>
            <PageHeader title="History" subtitle="Every scheduled chore and what happened to it." />

            <div className="mb-4 grid grid-cols-3 gap-2">
                <Summary value={totals.approved} label="Approved" />
                <Summary value={totals.points} label="Points earned" />
                <Summary value={`${totals.rate}%`} label="Completion" />
            </div>

            <div className="mb-4 flex flex-wrap gap-2">
                <select className="input w-auto" value={days} onChange={(e) => setDays(Number(e.target.value))} aria-label="Date range">
                    {RANGES.map((r) => (
                        <option key={r.days} value={r.days}>
                            {r.label}
                        </option>
                    ))}
                </select>
                <select
                    className="input w-auto"
                    value={status}
                    onChange={(e) => setStatus(e.target.value as InstanceStatus | "all")}
                    aria-label="Status"
                >
                    <option value="all">Any status</option>
                    <option value="todo">Not done</option>
                    <option value="submitted">Waiting for approval</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Sent back</option>
                </select>
            </div>

            {!data ? (
                <div className="card h-48 animate-pulse" />
            ) : rows.length === 0 ? (
                <EmptyState icon={<History size={40} />} title="Nothing here yet" />
            ) : (
                <div className="card overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="border-b border-line text-xs uppercase tracking-wide text-muted">
                                <tr>
                                    <th className="px-4 py-3 font-semibold">Chore</th>
                                    <th className="hidden px-4 py-3 font-semibold sm:table-cell">Date</th>
                                    <th className="px-4 py-3 font-semibold">Status</th>
                                    <th className="hidden px-4 py-3 font-semibold md:table-cell">Points</th>
                                    <th className="px-4 py-3">
                                        <span className="sr-only">Actions</span>
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map((i) => (
                                    <tr key={i.id} className="border-b border-line last:border-0">
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-3">
                                                <IconTile name={i.category.icon} color={i.category.color} size={32} rounded="rounded-lg" />
                                                <div className="min-w-0">
                                                    <div className="font-semibold">{i.title}</div>
                                                    <div className="text-xs text-muted">
                                                        {multipleDoers && `${names.get(i.userId)} · `}
                                                        <span className="sm:hidden">{friendlyDate(i.date, today)}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="hidden px-4 py-3 text-muted sm:table-cell">{friendlyDate(i.date, today)}</td>
                                        <td className="px-4 py-3">
                                            <StatusChip status={i.status} />
                                        </td>
                                        <td className="hidden px-4 py-3 md:table-cell">
                                            <PointsPill points={i.status === "approved" ? i.pointsAwarded : i.points} />
                                        </td>
                                        <td className="px-2 py-3 text-right">
                                            {i.status !== "approved" && i.date <= today && (
                                                <button
                                                    className="btn btn-ghost min-h-9 px-2 text-sm"
                                                    onClick={() => run(() => api.post(`/admin/instances/${i.id}/approve`), `Approved "${i.title}"`)}
                                                    title={i.status === "todo" ? "Mark as done and approve" : "Approve"}
                                                >
                                                    <Check size={16} /> <span className="hidden sm:inline">Approve</span>
                                                </button>
                                            )}
                                            {(i.status === "approved" || i.status === "rejected") && (
                                                <button
                                                    className="btn btn-ghost min-h-9 px-2 text-sm"
                                                    onClick={() => run(() => api.post(`/admin/instances/${i.id}/reset`), `Reset "${i.title}"`)}
                                                    title="Reset to not done"
                                                >
                                                    <RotateCcw size={16} /> <span className="hidden sm:inline">Reset</span>
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}

function Summary({ value, label }: { value: React.ReactNode; label: string }) {
    return (
        <div className="card px-4 py-3">
            <div className="text-xl font-extrabold tabular-nums sm:text-2xl">{value}</div>
            <div className="text-xs font-semibold text-muted">{label}</div>
        </div>
    );
}
