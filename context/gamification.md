# Gamification

## Points count only after a parent approves

**Id:** 4c342f29-a7dc-46b0-b490-ac5c16dbaac1
**Type:** decision
**Status:** active
**Evidence:** confirmed
**Source:** maintainer answer to the build plan, development conversation, 2026-11-20

Marking a chore done only submits it. Points, XP, levels, streaks, trophies
and the reward balance change when a parent approves it.

**Reason:** a maintainer requirement: chores are accounted, and rewards
given, only once a parent has checked the work.

**Rejected alternative:** credit points immediately, with approval as an
opt-in per chore (off by default). It was proposed in the build plan and
the maintainer chose approval for everything.

**Consequence:** a day that is only waiting on approval neither counts
toward nor breaks a streak (`server/src/gamification.ts`).

## No leaderboard

**Id:** b6468a85-b9de-48df-a2e0-45a66da59286
**Type:** decision
**Status:** active
**Evidence:** confirmed
**Source:** maintainer answer to the build plan, development conversation, 2026-11-20
**Revisit when:** a second chore doer starts using the app

There is no family leaderboard.

**Reason:** one child uses the app, so she would be the only entrant.

**Rejected alternative:** a leaderboard that a parent can switch off,
proposed in the build plan.

## Jingles are synthesised in the browser

**Id:** 2a778050-9a8f-4448-a0ad-04b356b0d126
**Type:** decision
**Status:** active
**Evidence:** confirmed
**Source:** build plan, 2026-11-20; commit 7cb67bc (`web/src/lib/sound.ts`)

The chore-done jingle and the approval fanfare are generated at runtime with
the Web Audio API; the app ships no audio files.

**Reason:** original sounds with no licensing question, nothing extra to
download, and it works offline.

**Rejected alternative:** bundled audio files, which bring licensing
questions and asset weight.
