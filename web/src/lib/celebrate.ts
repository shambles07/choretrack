import confetti from "canvas-confetti";
import { prefersReducedMotion } from "./theme";

const PALETTE = ["#6366f1", "#ec4899", "#f59e0b", "#22c55e", "#0ea5e9", "#fde047"];

// Bursts confetti from an element (or the centre of the screen).
export function burstFrom(el: Element | null, color?: string): void {
    if (prefersReducedMotion()) return;
    let origin = { x: 0.5, y: 0.5 };
    if (el) {
        const r = el.getBoundingClientRect();
        origin = { x: (r.left + r.width / 2) / window.innerWidth, y: (r.top + r.height / 2) / window.innerHeight };
    }
    void confetti({
        particleCount: 70,
        spread: 75,
        startVelocity: 38,
        origin,
        colors: color ? [color, ...PALETTE] : PALETTE,
        scalar: 0.9,
        disableForReducedMotion: true,
    });
}

// The big show for approvals, badges and level-ups.
export function bigCelebration(color?: string): void {
    if (prefersReducedMotion()) return;
    const colors = color ? [color, ...PALETTE] : PALETTE;
    const end = Date.now() + 1200;
    const frame = () => {
        void confetti({ particleCount: 5, angle: 60, spread: 60, origin: { x: 0, y: 0.7 }, colors });
        void confetti({ particleCount: 5, angle: 120, spread: 60, origin: { x: 1, y: 0.7 }, colors });
        if (Date.now() < end) requestAnimationFrame(frame);
    };
    frame();
    void confetti({ particleCount: 120, spread: 100, startVelocity: 45, origin: { y: 0.45 }, colors, shapes: ["star", "circle"] });
}
