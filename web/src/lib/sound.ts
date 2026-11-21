// Original jingles synthesised with the Web Audio API, so no audio files are shipped.

let ctx: AudioContext | null = null;
let enabled = true;

export function setSoundEnabled(on: boolean): void {
    enabled = on;
}

function audio(): AudioContext | null {
    if (!enabled) return null;
    try {
        ctx ??= new AudioContext();
        if (ctx.state === "suspended") {
            void ctx.resume();
        }
        return ctx;
    } catch {
        return null;
    }
}

const NOTE: Record<string, number> = {
    C5: 523.25,
    D5: 587.33,
    E5: 659.25,
    F5: 698.46,
    G5: 783.99,
    A5: 880.0,
    B5: 987.77,
    C6: 1046.5,
    E6: 1318.51,
    G6: 1567.98,
};

function tone(ac: AudioContext, freq: number, start: number, length: number, volume = 0.18, type: OscillatorType = "triangle") {
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + length);
    osc.connect(gain).connect(ac.destination);
    osc.start(start);
    osc.stop(start + length + 0.05);
}

function play(notes: [string, number, number][], sparkle = false): void {
    const ac = audio();
    if (!ac) return;
    const t0 = ac.currentTime + 0.02;
    for (const [note, at, length] of notes) {
        tone(ac, NOTE[note], t0 + at, length);
        // A soft octave-up sine gives the bell-like shimmer.
        tone(ac, NOTE[note] * 2, t0 + at, length * 0.6, 0.05, "sine");
    }
    if (sparkle) {
        const end = notes.reduce((m, [, at, len]) => Math.max(m, at + len), 0);
        for (let i = 0; i < 6; i += 1) {
            tone(ac, 2000 + Math.random() * 1500, t0 + end - 0.3 + i * 0.05, 0.12, 0.03, "sine");
        }
    }
}

// "Chore done!": a quick rising arpeggio.
export function playDoneJingle(): void {
    play([
        ["C5", 0, 0.16],
        ["E5", 0.1, 0.16],
        ["G5", 0.2, 0.16],
        ["C6", 0.3, 0.5],
    ]);
}

// Points approved, badge or level-up: a longer fanfare with sparkle.
export function playFanfare(): void {
    play(
        [
            ["G5", 0, 0.14],
            ["G5", 0.12, 0.14],
            ["C6", 0.24, 0.3],
            ["A5", 0.48, 0.14],
            ["C6", 0.6, 0.14],
            ["E6", 0.72, 0.7],
            ["G5", 0.72, 0.7],
        ],
        true,
    );
}

export function playUndo(): void {
    play([
        ["E5", 0, 0.12],
        ["C5", 0.1, 0.2],
    ]);
}
