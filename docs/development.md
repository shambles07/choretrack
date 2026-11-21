# 🧑‍💻 Development

[← Back to README](../README.md)

```bash
make install
make dev        # API on :3030, web app on :5173 with hot reload
make check      # typecheck + unit and API tests
make e2e        # browser tests at phone, tablet and desktop sizes
```

> [!NOTE]
> Record anything users would notice with `make change` in the same pull request. See [releasing.md](releasing.md).

## 🗺️ Where things live

| Path | Contents |
| --- | --- |
| `server/src` | Fastify API. `cli.ts` handles flags, `export.ts` builds exports, `db.ts` holds the schema and migrations, `chores.ts` handles scheduling, and `gamification.ts` covers points, levels, streaks and badges |
| `web/src` | React app. `pages/admin` and `pages/doer` are the two portals. `lib/sound.ts` synthesises the jingles, and `lib/platform.ts` detects the OS for shortcut hints |
| `shared/types.ts` | Types and game rules shared by both sides |
| `e2e` | Playwright tests |
| `deploy` | systemd unit and macOS launchd agent |
| `.changes` | changie entries and per-version release notes |

## 🧱 Stack

React 19, TypeScript, Vite, Tailwind CSS 4, Framer Motion, canvas-confetti and Lucide on the front end. Fastify 5, better-sqlite3 and Zod on the server. Vitest and Playwright for tests.

> [!TIP]
> Code is indented with 4 spaces. The `Makefile` is the exception, because Make requires tabs.
