// Works out which operating system the browser is running on, so shortcut hints can show
// the right key names (⌃ ⌥ on a Mac, Ctrl Alt elsewhere).

export type Platform = "macos" | "ios" | "windows" | "linux" | "chromeos" | "android" | "freebsd" | "openbsd" | "unknown";

interface UADataLike {
    platform?: string;
}

export function detectPlatform(nav: Pick<Navigator, "userAgent"> & { userAgentData?: UADataLike } = navigator): Platform {
    // Chromium browsers expose a cleaner value through User-Agent Client Hints.
    const hint = nav.userAgentData?.platform?.toLowerCase() ?? "";
    const ua = nav.userAgent.toLowerCase();
    const has = (s: string) => hint.includes(s) || ua.includes(s);

    if (has("android")) return "android";
    if (has("cros") || hint === "chrome os" || hint === "chromeos") return "chromeos";
    if (/iphone|ipad|ipod/.test(ua)) return "ios";
    // iPadOS reports itself as a Mac; a touch screen gives it away.
    if (has("mac")) return typeof document !== "undefined" && "ontouchend" in document ? "ios" : "macos";
    if (has("win")) return "windows";
    if (has("freebsd")) return "freebsd";
    if (has("openbsd")) return "openbsd";
    if (has("linux") || has("x11")) return "linux";
    return "unknown";
}

export interface ModifierLabels {
    ctrl: string;
    alt: string;
    // Spoken/readable names for screen readers and tooltips.
    ctrlName: string;
    altName: string;
}

export function modifierLabels(platform: Platform = detectPlatform()): ModifierLabels {
    if (platform === "macos" || platform === "ios") {
        return { ctrl: "⌃", alt: "⌥", ctrlName: "Control", altName: "Option" };
    }
    return { ctrl: "Ctrl", alt: "Alt", ctrlName: "Ctrl", altName: "Alt" };
}
