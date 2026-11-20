import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Gift, PartyPopper, RotateCcw, Star } from "lucide-react";
import { IconTile } from "../lib/icons";
import { bigCelebration } from "../lib/celebrate";
import { playFanfare } from "../lib/sound";
import type { Celebration } from "../../../shared/types";

export function hasCelebration(c: Celebration): boolean {
    return c.approved.length + c.rejected.length + c.newBadges.length + c.redemptions.length > 0 || c.levelUp !== null;
}

// Shown when a child opens the app after a parent has reviewed their chores.
// The child taps "Collect" so the fanfare plays from a real tap (browsers block autoplay).
export function CelebrationOverlay({
    celebration,
    color,
    onDone,
}: {
    celebration: Celebration;
    color: string;
    onDone: () => void;
}) {
    const [collected, setCollected] = useState(false);
    const points = celebration.approved.reduce((sum, a) => sum + a.points, 0);
    const goodNews =
        celebration.approved.length > 0 ||
        celebration.newBadges.length > 0 ||
        celebration.levelUp !== null ||
        celebration.redemptions.some((r) => r.status === "approved");

    const collect = () => {
        if (goodNews && !collected) {
            setCollected(true);
            bigCelebration(color);
            playFanfare();
            window.setTimeout(onDone, 1600);
        } else {
            onDone();
        }
    };

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <motion.div
                    className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                />
                <motion.div
                    role="dialog"
                    aria-modal="true"
                    aria-label="Good news"
                    className="card relative w-full max-w-md p-6 text-center"
                    initial={{ scale: 0.8, opacity: 0, y: 30 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    transition={{ type: "spring", damping: 16, stiffness: 200 }}
                >
                    <motion.div
                        className="mx-auto mb-3 inline-flex h-20 w-20 items-center justify-center rounded-3xl text-white"
                        style={{ background: color }}
                        animate={collected ? { rotate: [0, -12, 12, -6, 0], scale: [1, 1.2, 1] } : { y: [0, -6, 0] }}
                        transition={collected ? { duration: 0.8 } : { repeat: Infinity, duration: 1.6 }}
                    >
                        {goodNews ? <PartyPopper size={40} /> : <RotateCcw size={36} />}
                    </motion.div>

                    {celebration.levelUp && (
                        <div className="mb-2">
                            <div className="text-sm font-bold uppercase tracking-widest text-accent">Level up!</div>
                            <div className="text-2xl font-extrabold">
                                Level {celebration.levelUp.level}: {celebration.levelUp.name}
                            </div>
                        </div>
                    )}

                    {celebration.approved.length > 0 && (
                        <>
                            <h2 className="text-2xl font-extrabold">
                                {celebration.approved.length === 1
                                    ? "Your chore was approved!"
                                    : `${celebration.approved.length} chores approved!`}
                            </h2>
                            <motion.div
                                className="my-3 inline-flex items-center gap-2 rounded-2xl bg-yellow-400/15 px-5 py-2 text-3xl font-extrabold text-yellow-600 tabular-nums dark:text-yellow-300"
                                animate={collected ? { scale: [1, 1.3, 1] } : {}}
                            >
                                <Star size={28} fill="currentColor" />+{points}
                            </motion.div>
                            <ul className="mb-2 space-y-1 text-sm text-muted">
                                {celebration.approved.map((a, i) => (
                                    <li key={i}>
                                        {a.title} · +{a.points}
                                    </li>
                                ))}
                            </ul>
                        </>
                    )}

                    {celebration.newBadges.length > 0 && (
                        <div className="my-4">
                            <div className="mb-2 text-sm font-bold">New trophies</div>
                            <div className="flex flex-wrap justify-center gap-3">
                                {celebration.newBadges.map((b) => (
                                    <div key={b.key} className="flex w-24 flex-col items-center gap-1">
                                        <IconTile name={b.icon} color={color} size={52} solid />
                                        <span className="text-xs font-bold">{b.name}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {celebration.redemptions.map((r, i) => (
                        <p
                            key={i}
                            className={`my-2 flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold ${
                                r.status === "approved"
                                    ? "bg-green-500/10 text-green-700 dark:text-green-300"
                                    : "bg-surface-2 text-muted"
                            }`}
                        >
                            <Gift size={16} />
                            {r.status === "approved" ? `Reward unlocked: ${r.title}!` : `${r.title} wasn't approved this time. Your points are back.`}
                        </p>
                    ))}

                    {celebration.rejected.length > 0 && (
                        <div className="my-3 space-y-2 text-left">
                            {!goodNews && <h2 className="text-center text-xl font-extrabold">Almost there!</h2>}
                            {celebration.rejected.map((r, i) => (
                                <p key={i} className="rounded-xl bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300">
                                    <strong>{r.title}</strong> needs another go{r.note ? `: ${r.note}` : "."}
                                </p>
                            ))}
                        </div>
                    )}

                    <button className="btn btn-primary mt-3 h-14 w-full text-lg" onClick={collect} disabled={collected}>
                        {goodNews ? (collected ? "Woohoo!" : "Collect!") : "OK, I'm on it"}
                    </button>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
