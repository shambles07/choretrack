// Applies a user's favourite colour as the app's accent colour, and picks a readable text
// colour to sit on top of it (white where it's clear enough, otherwise near-black).

function luminance(hex: string): number {
    const [r, g, b] = [1, 3, 5].map((i) => {
        const c = parseInt(hex.slice(i, i + 2), 16) / 255;
        return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastText(hex: string): string {
    const whiteContrast = 1.05 / (luminance(hex) + 0.05);
    // 3:1 is the WCAG minimum for bold button text and UI parts.
    return whiteContrast >= 3 ? "#ffffff" : "#0f172a";
}

export function applyAccent(color: string | null): void {
    const root = document.documentElement;
    if (color && /^#[0-9a-fA-F]{6}$/.test(color)) {
        root.style.setProperty("--accent", color);
        root.style.setProperty("--accent-contrast", contrastText(color));
    } else {
        root.style.removeProperty("--accent");
        root.style.removeProperty("--accent-contrast");
    }
}
