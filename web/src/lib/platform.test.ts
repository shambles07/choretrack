import { describe, expect, it } from "vitest";
import { detectPlatform, modifierLabels } from "./platform";

const UA = {
    macos: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    windows: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    linux: "Mozilla/5.0 (X11; Linux x86_64; rv:133.0) Gecko/20100101 Firefox/133.0",
    freebsd: "Mozilla/5.0 (X11; FreeBSD amd64; rv:133.0) Gecko/20100101 Firefox/133.0",
    openbsd: "Mozilla/5.0 (X11; OpenBSD amd64; rv:133.0) Gecko/20100101 Firefox/133.0",
    chromeos: "Mozilla/5.0 (X11; CrOS x86_64 14541.0.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    android: "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
    ios: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1",
};

describe("detectPlatform", () => {
    for (const [expected, userAgent] of Object.entries(UA)) {
        it(`recognises ${expected}`, () => {
            expect(detectPlatform({ userAgent })).toBe(expected);
        });
    }

    it("prefers User-Agent Client Hints when available", () => {
        expect(detectPlatform({ userAgent: UA.linux, userAgentData: { platform: "macOS" } })).toBe("macos");
    });

    it("falls back to unknown", () => {
        expect(detectPlatform({ userAgent: "curl/8.0" })).toBe("unknown");
    });
});

describe("modifierLabels", () => {
    it("uses Mac symbols on Apple platforms and words elsewhere", () => {
        expect(modifierLabels("macos")).toMatchObject({ ctrl: "⌃", alt: "⌥" });
        expect(modifierLabels("windows")).toMatchObject({ ctrl: "Ctrl", alt: "Alt" });
        expect(modifierLabels("freebsd")).toMatchObject({ ctrl: "Ctrl", alt: "Alt" });
        expect(modifierLabels("macos").enter).toBe("Return");
        expect(modifierLabels("linux").enter).toBe("Enter");
    });
});
