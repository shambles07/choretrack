import { useMemo, type ReactNode } from "react";
import { Modal } from "./modal";
import { detectPlatform, modifierLabels } from "../lib/platform";
import { shortcutsFor } from "../lib/shortcuts";
import type { Role } from "../../../shared/types";

function Keys({ children }: { children: ReactNode }) {
    return <span className="flex shrink-0 items-center gap-1">{children}</span>;
}

function Key({ children, title }: { children: ReactNode; title?: string }) {
    return (
        <kbd className="kbd-key" title={title}>
            {children}
        </kbd>
    );
}

function Row({ label, keys }: { label: string; keys: ReactNode }) {
    return (
        <li className="flex items-center justify-between gap-4 py-2">
            <span>{label}</span>
            {keys}
        </li>
    );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
    return (
        <section>
            <h3 className="mb-1 text-xs font-bold uppercase tracking-wide text-muted">{title}</h3>
            <ul className="divide-y divide-line">{children}</ul>
        </section>
    );
}

// Opened with "?" from anywhere in the app. Lists only what the signed-in person can use.
export function ShortcutsDialog({
    open,
    onClose,
    role,
    nav,
}: {
    open: boolean;
    onClose: () => void;
    role: Role;
    nav: { label: string }[];
}) {
    const keys = useMemo(() => modifierLabels(), []);
    const mac = useMemo(() => ["macos", "ios"].includes(detectPlatform()), []);

    return (
        <Modal
            open={open}
            onClose={onClose}
            title="Keyboard shortcuts"
            footer={
                <p className="mr-auto text-xs text-muted">
                    Press <kbd className="kbd-inline">Esc</kbd>
                    {mac && (
                        <>
                            {" "}
                            or <kbd className="kbd-inline">⌘ .</kbd>
                        </>
                    )}{" "}
                    to close. Shortcuts pause while you type in a field.
                </p>
            }
        >
            <div className="space-y-5 text-sm">
                <Section title="Go to">
                    {nav.map((item, i) => (
                        <Row key={item.label} label={item.label} keys={<Keys><Key>{i + 1}</Key></Keys>} />
                    ))}
                    <Row
                        label="Show the page numbers"
                        keys={
                            <Keys>
                                hold <Key title={keys.ctrlName}>{keys.ctrl}</Key> or <Key title={keys.altName}>{keys.alt}</Key>
                            </Keys>
                        }
                    />
                </Section>

                <Section title="Actions">
                    {shortcutsFor(role).map((s) => (
                        <Row key={s.key} label={s.label} keys={<Keys><Key>{s.key === "?" ? "?" : s.key.toUpperCase()}</Key></Keys>} />
                    ))}
                </Section>

                <Section title="In forms">
                    <Row label="Next field (wraps around)" keys={<Keys><Key>{mac ? "⇥" : "Tab"}</Key></Keys>} />
                    <Row
                        label="Previous field"
                        keys={
                            <Keys>
                                <Key>{mac ? "⇧" : "Shift"}</Key>
                                <Key>{mac ? "⇥" : "Tab"}</Key>
                            </Keys>
                        }
                    />
                    <Row label="Submit" keys={<Keys><Key>{keys.enter} ⏎</Key></Keys>} />
                    <Row
                        label="Close a dialog"
                        keys={
                            <Keys>
                                <Key>Esc</Key>
                                {mac && (
                                    <>
                                        or <Key>⌘ .</Key>
                                    </>
                                )}
                            </Keys>
                        }
                    />
                </Section>
            </div>
        </Modal>
    );
}
