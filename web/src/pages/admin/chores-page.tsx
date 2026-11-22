import { useMemo, useState } from "react";
import { ClipboardList, Copy, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { api } from "../../lib/api";
import { useLoad } from "../../lib/use-load";
import { useLocalPref } from "../../lib/theme";
import { IconTile } from "../../lib/icons";
import { describeSchedule, friendlyTime, toDateString } from "../../lib/format";
import { EmptyState, PageHeader } from "../../components/app-shell";
import { useToast } from "../../components/toast";
import { Modal } from "../../components/modal";
import { PointsPill } from "../../components/game-widgets";
import { ViewToggle, type ViewMode } from "../../components/chore-views";
import { FormHint, SubmitButton, useFormFlow } from "../../components/form-kit";
import { GroupError, TextField } from "../../components/text-field";
import { requiredError, wholeNumberError } from "../../lib/validation";
import { DAY_NAMES, type Category, type Chore, type PublicUser, type Recurrence } from "../../../../shared/types";

type Draft = Omit<Chore, "id"> & { id?: number };

type SortKey = "title" | "points" | "category";

export function AdminChoresPage() {
    const notify = useToast();
    const chores = useLoad<{ chores: Chore[] }>("/admin/chores");
    const cats = useLoad<{ categories: Category[] }>("/categories");
    const users = useLoad<{ users: PublicUser[] }>("/admin/users");
    const [view, setView] = useLocalPref<ViewMode>("choretrack-admin-view", "table", ["cards", "table"]);
    const [draft, setDraft] = useState<Draft | null>(null);
    const [deleting, setDeleting] = useState<Chore | null>(null);
    const [query, setQuery] = useState("");
    const [doerFilter, setDoerFilter] = useState<number | "all">("all");
    const [categoryFilter, setCategoryFilter] = useState<number | "all">("all");
    const [sort, setSort] = useState<SortKey>("title");

    const doers = useMemo(() => (users.data?.users ?? []).filter((u) => u.role === "doer" && u.active), [users.data]);
    const categories = cats.data?.categories ?? [];
    const catById = new Map(categories.map((c) => [c.id, c]));
    const userById = new Map((users.data?.users ?? []).map((u) => [u.id, u]));

    const list = useMemo(() => {
        const q = query.trim().toLowerCase();
        const items = (chores.data?.chores ?? []).filter(
            (c) =>
                (!q || c.title.toLowerCase().includes(q) || c.description.toLowerCase().includes(q)) &&
                (doerFilter === "all" || c.assigneeId === doerFilter) &&
                (categoryFilter === "all" || c.categoryId === categoryFilter),
        );
        const catName = (c: Chore) => catById.get(c.categoryId)?.name ?? "";
        return items.sort((a, b) =>
            sort === "points" ? b.points - a.points : sort === "category" ? catName(a).localeCompare(catName(b)) : a.title.localeCompare(b.title),
        );
    }, [chores.data, query, doerFilter, categoryFilter, sort, categories]);

    const newDraft = (): Draft => ({
        title: "",
        description: "",
        categoryId: categories[0]?.id ?? 0,
        points: 10,
        assigneeId: doers[0]?.id ?? 0,
        recurrence: "daily",
        daysOfWeek: [1, 2, 3, 4, 5],
        startDate: toDateString(new Date()),
        dueDate: toDateString(new Date()),
        dueTime: null,
        active: true,
    });

    const save = async () => {
        if (!draft) return;
        const { id, ...body } = { ...draft, title: draft.title.trim(), description: draft.description.trim() };
        try {
            if (id) await api.put(`/admin/chores/${id}`, body);
            else await api.post("/admin/chores", body);
            notify(id ? "Chore updated" : "Chore added", { tone: "success" });
            setDraft(null);
            await chores.reload();
        } catch (e) {
            notify((e as Error).message, { tone: "error" });
        }
    };

    const remove = async () => {
        if (!deleting) return;
        try {
            await api.del(`/admin/chores/${deleting.id}`);
            notify("Chore deleted. Points already earned are kept.");
            setDeleting(null);
            await chores.reload();
        } catch (e) {
            notify((e as Error).message, { tone: "error" });
        }
    };

    const toggleActive = async (c: Chore) => {
        try {
            const { id, ...body } = c;
            await api.put(`/admin/chores/${id}`, { ...body, active: !c.active });
            await chores.reload();
        } catch (e) {
            notify((e as Error).message, { tone: "error" });
        }
    };

    if (!chores.data || !cats.data || !users.data) return <div className="card h-48 animate-pulse" />;

    const actions = (c: Chore) => (
        <div className="flex justify-end gap-1">
            <button className="btn btn-ghost btn-icon min-h-9" onClick={() => setDraft({ ...c })} aria-label={`Edit ${c.title}`}>
                <Pencil size={16} />
            </button>
            <button
                className="btn btn-ghost btn-icon hidden min-h-9 sm:inline-flex"
                onClick={() => setDraft({ ...c, id: undefined, title: `${c.title} (copy)` })}
                aria-label={`Duplicate ${c.title}`}
            >
                <Copy size={16} />
            </button>
            <button className="btn btn-ghost btn-icon min-h-9 text-danger" onClick={() => setDeleting(c)} aria-label={`Delete ${c.title}`}>
                <Trash2 size={16} />
            </button>
        </div>
    );

    return (
        <div>
            <PageHeader
                title="Chores"
                subtitle={`${chores.data.chores.length} chores set up`}
                actions={
                    <button className="btn btn-primary" onClick={() => setDraft(newDraft())} disabled={doers.length === 0}>
                        <Plus size={18} /> New chore
                    </button>
                }
            />

            {doers.length === 0 && (
                <p className="mb-4 rounded-xl bg-amber-500/10 px-4 py-3 text-sm font-medium text-amber-700 dark:text-amber-300">
                    Add a chore doer on the People page before creating chores.
                </p>
            )}

            <div className="mb-4 flex flex-wrap items-center gap-2">
                <div className="relative min-w-48 flex-1">
                    <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                    <input
                        className="input pl-9"
                        placeholder="Search chores"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        aria-label="Search chores"
                    />
                </div>
                {doers.length > 1 && (
                    <select
                        className="input w-auto"
                        value={doerFilter}
                        onChange={(e) => setDoerFilter(e.target.value === "all" ? "all" : Number(e.target.value))}
                        aria-label="Filter by person"
                    >
                        <option value="all">Everyone</option>
                        {doers.map((d) => (
                            <option key={d.id} value={d.id}>
                                {d.name}
                            </option>
                        ))}
                    </select>
                )}
                <select
                    className="input w-auto"
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value === "all" ? "all" : Number(e.target.value))}
                    aria-label="Filter by category"
                >
                    <option value="all">All categories</option>
                    {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                            {c.name}
                        </option>
                    ))}
                </select>
                <select className="input w-auto" value={sort} onChange={(e) => setSort(e.target.value as SortKey)} aria-label="Sort by">
                    <option value="title">Sort: name</option>
                    <option value="points">Sort: points</option>
                    <option value="category">Sort: category</option>
                </select>
                <ViewToggle value={view} onChange={setView} />
            </div>

            {list.length === 0 ? (
                <EmptyState icon={<ClipboardList size={40} />} title={chores.data.chores.length ? "No matching chores" : "No chores yet"}>
                    {chores.data.chores.length ? "Try a different search or filter." : "Create the first chore to get started."}
                </EmptyState>
            ) : view === "table" ? (
                <div className="card overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="border-b border-line text-xs uppercase tracking-wide text-muted">
                                <tr>
                                    <th className="px-4 py-3 font-semibold">Chore</th>
                                    <th className="hidden px-4 py-3 font-semibold md:table-cell">Schedule</th>
                                    {doers.length > 1 && <th className="hidden px-4 py-3 font-semibold lg:table-cell">Assigned to</th>}
                                    <th className="px-4 py-3 font-semibold">Points</th>
                                    <th className="hidden px-4 py-3 font-semibold sm:table-cell">Active</th>
                                    <th className="px-4 py-3">
                                        <span className="sr-only">Actions</span>
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {list.map((c) => {
                                    const cat = catById.get(c.categoryId);
                                    return (
                                        <tr key={c.id} className={`border-b border-line last:border-0 ${c.active ? "" : "opacity-60"}`}>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-3">
                                                    {cat && <IconTile name={cat.icon} color={cat.color} size={36} rounded="rounded-xl" />}
                                                    <div className="min-w-0">
                                                        <div className="font-semibold">{c.title}</div>
                                                        <div className="text-xs text-muted">
                                                            {cat?.name}
                                                            <span className="md:hidden"> · {describeSchedule(c)}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="hidden px-4 py-3 text-muted md:table-cell">
                                                {describeSchedule(c)}
                                                {c.dueTime && ` · by ${friendlyTime(c.dueTime)}`}
                                            </td>
                                            {doers.length > 1 && (
                                                <td className="hidden px-4 py-3 lg:table-cell">{userById.get(c.assigneeId)?.name}</td>
                                            )}
                                            <td className="px-4 py-3">
                                                <PointsPill points={c.points} />
                                            </td>
                                            <td className="hidden px-4 py-3 sm:table-cell">
                                                <Switch checked={c.active} onChange={() => toggleActive(c)} label={`${c.title} active`} />
                                            </td>
                                            <td className="px-2 py-3">{actions(c)}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {list.map((c) => {
                        const cat = catById.get(c.categoryId);
                        return (
                            <article key={c.id} className={`card flex flex-col gap-3 p-5 ${c.active ? "" : "opacity-60"}`}>
                                <div className="flex items-start gap-3">
                                    {cat && <IconTile name={cat.icon} color={cat.color} size={48} />}
                                    <div className="min-w-0 flex-1">
                                        <h3 className="font-bold">{c.title}</h3>
                                        <p className="text-sm text-muted">{describeSchedule(c)}</p>
                                    </div>
                                    <PointsPill points={c.points} />
                                </div>
                                {c.description && <p className="text-sm text-muted">{c.description}</p>}
                                <div className="mt-auto flex items-center justify-between">
                                    <Switch checked={c.active} onChange={() => toggleActive(c)} label={`${c.title} active`} />
                                    {actions(c)}
                                </div>
                            </article>
                        );
                    })}
                </div>
            )}

            {draft && (
                <ChoreForm
                    draft={draft}
                    setDraft={setDraft}
                    categories={categories}
                    doers={doers}
                    onSave={save}
                    onClose={() => setDraft(null)}
                />
            )}

            <Modal
                open={deleting !== null}
                onClose={() => setDeleting(null)}
                title="Delete chore?"
                footer={
                    <>
                        <button className="btn btn-ghost" onClick={() => setDeleting(null)}>
                            Cancel
                        </button>
                        <button className="btn btn-danger" onClick={remove}>
                            <Trash2 size={16} /> Delete
                        </button>
                    </>
                }
            >
                <p>
                    <strong>{deleting?.title}</strong> will be removed from the schedule. Points already approved for it are
                    kept. To pause it instead, switch it off.
                </p>
            </Modal>
        </div>
    );
}

export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
    return (
        <button
            role="switch"
            aria-checked={checked}
            aria-label={label}
            onClick={() => onChange(!checked)}
            className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors ${
                checked ? "bg-accent" : "bg-surface-2 ring-1 ring-line ring-inset"
            }`}
        >
            <span
                className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${checked ? "translate-x-6" : "translate-x-1"}`}
            />
        </button>
    );
}

function ChoreForm({
    draft,
    setDraft,
    categories,
    doers,
    onSave,
    onClose,
}: {
    draft: Draft;
    setDraft: (d: Draft) => void;
    categories: Category[];
    doers: PublicUser[];
    onSave: () => Promise<void>;
    onClose: () => void;
}) {
    const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft({ ...draft, [key]: value });
    const toggleDay = (d: number) =>
        set("daysOfWeek", draft.daysOfWeek.includes(d) ? draft.daysOfWeek.filter((x) => x !== d) : [...draft.daysOfWeek, d].sort());
    // Points are typed as text so a half-typed or wrong value can be shown as such.
    const [pointsText, setPointsText] = useState(String(draft.points));
    const [busy, setBusy] = useState(false);

    const errors = {
        title: requiredError(draft.title, "The chore"),
        points: wholeNumberError(pointsText, 0, 1000, "points"),
        days: draft.recurrence === "weekly" && draft.daysOfWeek.length === 0 ? "Pick at least one day" : null,
    };
    const ready = Object.values(errors).every((e) => e === null);

    const { formId, tried, formProps } = useFormFlow({
        ready,
        onSubmit: async () => {
            setBusy(true);
            await onSave();
            setBusy(false);
        },
    });

    const setPoints = (text: string) => {
        setPointsText(text);
        if (wholeNumberError(text, 0, 1000, "points") === null) set("points", Number(text));
    };

    return (
        <Modal
            open
            onClose={onClose}
            title={draft.id ? "Edit chore" : "New chore"}
            footer={
                <>
                    <FormHint ready={ready} action="save" escape="closes" className="mr-auto hidden sm:block" />
                    <button className="btn btn-ghost" onClick={onClose}>
                        Cancel
                    </button>
                    <SubmitButton formId={formId} ready={ready} busy={busy}>
                        {draft.id ? "Save changes" : "Add chore"}
                    </SubmitButton>
                </>
            }
        >
            <form className="space-y-5" {...formProps}>
                <TextField
                    id="chore-title"
                    label="Chore"
                    maxLength={80}
                    placeholder="Feed the cat"
                    value={draft.title}
                    onChange={(title) => set("title", title)}
                    error={errors.title}
                    showErrors={tried}
                />
                <TextField
                    id="chore-desc"
                    label="Details"
                    optional
                    maxLength={500}
                    placeholder="One scoop in the morning"
                    value={draft.description}
                    onChange={(description) => set("description", description)}
                    error={null}
                />

                <fieldset>
                    <legend className="label">Category</legend>
                    <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
                        {categories.map((c) => (
                            <button
                                type="button"
                                key={c.id}
                                onClick={() => set("categoryId", c.id)}
                                aria-pressed={draft.categoryId === c.id}
                                className={`flex flex-col items-center gap-1 rounded-xl border p-2 text-[11px] font-semibold transition-colors ${
                                    draft.categoryId === c.id ? "border-accent bg-accent/8" : "border-line hover:bg-surface-2"
                                }`}
                            >
                                <IconTile name={c.icon} color={c.color} size={32} rounded="rounded-lg" />
                                <span className="line-clamp-1">{c.name}</span>
                            </button>
                        ))}
                    </div>
                </fieldset>

                <fieldset>
                    <legend className="label">Points</legend>
                    <div className="flex flex-wrap items-start gap-2">
                        {[5, 10, 20, 50].map((p) => (
                            <button
                                type="button"
                                key={p}
                                className={`btn min-h-11 px-3 ${pointsText === String(p) ? "btn-primary" : "btn-soft"}`}
                                onClick={() => setPoints(String(p))}
                                aria-label={`${p} points`}
                            >
                                {p}
                            </button>
                        ))}
                        <div className="w-32">
                            <TextField
                                id="chore-points"
                                label="Custom points"
                                hideLabel
                                inputMode="numeric"
                                maxLength={4}
                                value={pointsText}
                                onChange={setPoints}
                                error={errors.points}
                                showErrors={tried}
                            />
                        </div>
                    </div>
                </fieldset>

                {doers.length > 1 && (
                    <div>
                        <label className="label" htmlFor="chore-assignee">
                            Assigned to
                        </label>
                        <select
                            id="chore-assignee"
                            className="input"
                            value={draft.assigneeId}
                            onChange={(e) => set("assigneeId", Number(e.target.value))}
                        >
                            {doers.map((d) => (
                                <option key={d.id} value={d.id}>
                                    {d.name}
                                </option>
                            ))}
                        </select>
                    </div>
                )}

                <fieldset>
                    <legend className="label">Repeats</legend>
                    <div className="inline-flex rounded-xl bg-surface-2 p-1">
                        {(
                            [
                                ["once", "Once"],
                                ["daily", "Every day"],
                                ["weekly", "Some days"],
                            ] as [Recurrence, string][]
                        ).map(([value, label]) => (
                            <button
                                type="button"
                                key={value}
                                className={`min-h-10 rounded-lg px-3 text-sm font-semibold ${
                                    draft.recurrence === value ? "bg-surface shadow-sm" : "text-muted"
                                }`}
                                onClick={() => set("recurrence", value)}
                                aria-pressed={draft.recurrence === value}
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                    {draft.recurrence === "weekly" && (
                        <>
                            <div className="mt-3 flex flex-wrap gap-1.5">
                                {DAY_NAMES.map((name, d) => (
                                    <button
                                        type="button"
                                        key={name}
                                        // An early submit focuses the first [data-error]; it has to be focusable.
                                        data-error={errors.days && d === 0 ? "true" : undefined}
                                        onClick={() => toggleDay(d)}
                                        aria-pressed={draft.daysOfWeek.includes(d)}
                                        className={`h-10 w-12 rounded-xl text-sm font-bold ${
                                            draft.daysOfWeek.includes(d)
                                                ? "bg-accent text-accent-fg"
                                                : `bg-surface-2 text-muted ${errors.days && tried ? "ring-2 ring-danger" : ""}`
                                        }`}
                                    >
                                        {name}
                                    </button>
                                ))}
                            </div>
                            <GroupError error={errors.days} show={tried} />
                        </>
                    )}
                </fieldset>

                <div className="grid gap-4 sm:grid-cols-2">
                    {draft.recurrence === "once" ? (
                        <div>
                            <label className="label" htmlFor="chore-due-date">
                                Due date
                            </label>
                            <input
                                id="chore-due-date"
                                type="date"
                                className="input"
                                value={draft.dueDate ?? draft.startDate}
                                onChange={(e) => e.target.value && setDraft({ ...draft, dueDate: e.target.value, startDate: e.target.value })}
                            />
                        </div>
                    ) : (
                        <div>
                            <label className="label" htmlFor="chore-start">
                                Starting
                            </label>
                            <input
                                id="chore-start"
                                type="date"
                                className="input"
                                value={draft.startDate}
                                onChange={(e) => e.target.value && set("startDate", e.target.value)}
                            />
                        </div>
                    )}
                    <div>
                        <label className="label" htmlFor="chore-time">
                            Done by <span className="font-normal">(optional)</span>
                        </label>
                        <input
                            id="chore-time"
                            type="time"
                            className="input"
                            value={draft.dueTime ?? ""}
                            onChange={(e) => set("dueTime", e.target.value || null)}
                        />
                    </div>
                </div>

                <div className="flex items-center justify-between rounded-xl bg-surface-2 px-4 py-3">
                    <span className="text-sm font-semibold">Active</span>
                    <Switch checked={draft.active} onChange={(v) => set("active", v)} label="Chore active" />
                </div>
            </form>
        </Modal>
    );
}
