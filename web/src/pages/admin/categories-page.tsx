import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { api } from "../../lib/api";
import { useLoad } from "../../lib/use-load";
import { CATEGORY_ICON_KEYS, IconTile } from "../../lib/icons";
import { PageHeader } from "../../components/app-shell";
import { useToast } from "../../components/toast";
import { Modal } from "../../components/modal";
import { ColorPicker, IconPicker } from "../../components/pickers";
import type { Category } from "../../../../shared/types";

type Draft = Omit<Category, "id"> & { id?: number };

export function AdminCategoriesPage() {
    const notify = useToast();
    const { data, reload } = useLoad<{ categories: Category[] }>("/categories");
    const [draft, setDraft] = useState<Draft | null>(null);

    if (!data) return <div className="card h-48 animate-pulse" />;

    const save = async () => {
        if (!draft) return;
        const { id, ...body } = draft;
        try {
            if (id) await api.put(`/admin/categories/${id}`, body);
            else await api.post("/admin/categories", body);
            setDraft(null);
            await reload();
        } catch (e) {
            notify((e as Error).message, { tone: "error" });
        }
    };

    const remove = async (c: Category) => {
        try {
            await api.del(`/admin/categories/${c.id}`);
            await reload();
        } catch (e) {
            notify((e as Error).message, { tone: "error" });
        }
    };

    return (
        <div>
            <PageHeader
                title="Categories"
                subtitle="Each category gives its chores an icon and colour."
                actions={
                    <button className="btn btn-primary" onClick={() => setDraft({ name: "", icon: "star", color: "#6366f1" })}>
                        <Plus size={18} /> New category
                    </button>
                }
            />
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {data.categories.map((c) => (
                    <div key={c.id} className="card flex items-center gap-3 p-4">
                        <IconTile name={c.icon} color={c.color} size={44} />
                        <span className="flex-1 font-semibold">{c.name}</span>
                        <button className="btn btn-ghost btn-icon min-h-9" onClick={() => setDraft({ ...c })} aria-label={`Edit ${c.name}`}>
                            <Pencil size={16} />
                        </button>
                        <button className="btn btn-ghost btn-icon min-h-9 text-danger" onClick={() => remove(c)} aria-label={`Delete ${c.name}`}>
                            <Trash2 size={16} />
                        </button>
                    </div>
                ))}
            </div>
            {draft && (
                <Modal
                    open
                    onClose={() => setDraft(null)}
                    title={draft.id ? "Edit category" : "New category"}
                    footer={
                        <>
                            <button className="btn btn-ghost" onClick={() => setDraft(null)}>
                                Cancel
                            </button>
                            <button className="btn btn-primary" onClick={save} disabled={!draft.name.trim()}>
                                Save
                            </button>
                        </>
                    }
                >
                    <div className="space-y-5">
                        <div>
                            <label className="label" htmlFor="cat-name">
                                Name
                            </label>
                            <input
                                id="cat-name"
                                className="input"
                                maxLength={40}
                                value={draft.name}
                                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                            />
                        </div>
                        <IconPicker label="Icon" icons={CATEGORY_ICON_KEYS} value={draft.icon} color={draft.color} onChange={(icon) => setDraft({ ...draft, icon })} />
                        <ColorPicker value={draft.color} onChange={(color) => setDraft({ ...draft, color })} />
                    </div>
                </Modal>
            )}
        </div>
    );
}
