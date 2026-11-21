import { Check } from "lucide-react";
import { COLORS, IconTile } from "../lib/icons";

export function IconPicker({
    icons,
    value,
    color,
    onChange,
    label,
}: {
    icons: string[];
    value: string;
    color: string;
    onChange: (v: string) => void;
    label: string;
}) {
    return (
        <fieldset>
            <legend className="label">{label}</legend>
            <div className="flex flex-wrap gap-2">
                {icons.map((name) => (
                    <button
                        type="button"
                        key={name}
                        onClick={() => onChange(name)}
                        aria-pressed={value === name}
                        aria-label={name.replace(/-/g, " ")}
                        className={`rounded-2xl p-0.5 ring-2 transition ${value === name ? "ring-accent" : "ring-transparent hover:ring-line"}`}
                    >
                        <IconTile name={name} color={color} size={44} solid={value === name} />
                    </button>
                ))}
            </div>
        </fieldset>
    );
}

export function ColorPicker({ value, onChange, label = "Colour" }: { value: string; onChange: (v: string) => void; label?: string }) {
    return (
        <fieldset>
            <legend className="label">{label}</legend>
            <div className="flex flex-wrap gap-2">
                {COLORS.map((c) => (
                    <button
                        type="button"
                        key={c}
                        onClick={() => onChange(c)}
                        aria-pressed={value === c}
                        aria-label={`Colour ${c}`}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-full text-white ring-offset-2 ring-offset-surface transition"
                        style={{ background: c, boxShadow: value === c ? `0 0 0 3px var(--surface), 0 0 0 5px ${c}` : undefined }}
                    >
                        {value === c && <Check size={18} strokeWidth={3} />}
                    </button>
                ))}
            </div>
        </fieldset>
    );
}
