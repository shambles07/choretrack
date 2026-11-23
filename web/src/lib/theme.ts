import { useEffect, useState, useSyncExternalStore } from "react";

export type ThemePref = "system" | "light" | "dark";

const KEY = "choretrack-theme";

function readPref(): ThemePref {
    try {
        const v = localStorage.getItem(KEY);
        return v === "light" || v === "dark" ? v : "system";
    } catch {
        return "system";
    }
}

function apply(pref: ThemePref): void {
    const dark = pref === "dark" || (pref === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.classList.toggle("dark", dark);
}

// One shared theme setting, so every theme button and the "t" shortcut stay in step.
let current: ThemePref = readPref();
const listeners = new Set<() => void>();

export function setThemePref(pref: ThemePref): void {
    current = pref;
    apply(pref);
    try {
        localStorage.setItem(KEY, pref);
    } catch {
        // Storage may be unavailable (private browsing); the theme still applies for this visit.
    }
    listeners.forEach((l) => l());
}

// Flips between light and dark from whatever is showing now (including "system").
export function toggleLightDark(): ThemePref {
    const next = document.documentElement.classList.contains("dark") ? "light" : "dark";
    setThemePref(next);
    return next;
}

function subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
}

export function useTheme(): [ThemePref, (p: ThemePref) => void] {
    const pref = useSyncExternalStore(subscribe, () => current);

    // Follow the device while set to "system".
    useEffect(() => {
        apply(pref);
        if (pref !== "system") return;
        const media = window.matchMedia("(prefers-color-scheme: dark)");
        const onChange = () => apply("system");
        media.addEventListener("change", onChange);
        return () => media.removeEventListener("change", onChange);
    }, [pref]);

    return [pref, setThemePref];
}

// Remembers a small per-device preference such as card vs table view.
export function useLocalPref<T extends string>(key: string, fallback: T, allowed: readonly T[]): [T, (v: T) => void] {
    const [value, setValue] = useState<T>(() => {
        try {
            const v = localStorage.getItem(key) as T | null;
            return v && allowed.includes(v) ? v : fallback;
        } catch {
            return fallback;
        }
    });
    const update = (v: T) => {
        setValue(v);
        try {
            localStorage.setItem(key, v);
        } catch {
            // Ignore; the choice just won't be remembered.
        }
    };
    return [value, update];
}

export function prefersReducedMotion(): boolean {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
