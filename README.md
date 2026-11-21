# ChoreTrack

A family chore portal that turns chores into a game. Parents assign chores and approve them. Kids tick them off, earn points, level up, collect trophies and spend points on rewards.

- **Two kinds of accounts.** Parents (admins) log in with a username and password. Kids (chore doers) tap their avatar and enter a 4-digit PIN.
- **Points only count once a parent approves.** When a kid taps "I did it!", the chore goes into the parent's approval queue. Points, levels, streaks and trophies only update after approval. A parent can also send a chore back with a note.
- **Gamified.** XP levels, daily progress ring, streaks, 12 trophies and a reward shop. Finishing a chore triggers confetti and a short jingle. Approved points get a bigger "Collect!" celebration with a fanfare the next time the kid opens the app.
- **Card or table view.** Each chore shows an icon for its category, and you can switch between cards and a table.
- **Works on phones, tablets and desktops.** It can be installed to the home screen as an app (PWA).
- **Clean, minimal look** with light and dark modes. It follows your device's setting by default, and there's a toggle to override it.
- **Self-hosted.** One Node.js process and one SQLite file. No cloud services, accounts or tracking.

## Quick start

You need **Node.js 22 or newer**. The automated tests run on Node 22; newer releases such as Node 24 and 26 should work too, since the SQLite driver supports Node 22 and later.

```bash
npm install
npm run build
npm start
```

Open <http://localhost:3030> (or `http://<server-ip>:3030` from another device on your network). The first visit asks you to create the parent account, then to add your child.

### Day-to-day use

| Who | What they do |
| --- | --- |
| Parent | **Chores**: add chores (one-off, every day, or certain weekdays), set points, category and optional "done by" time. **Overview**: approve or send back finished chores and approve reward requests. **History**: see what got done and fix mistakes. **Rewards**: set what points can buy. |
| Kid | **My chores**: today's list, things still to finish, and what's coming up. Tap **I did it!** **Rewards**: spend approved points. **Trophies**: levels, streaks and badges. |

**Keyboard shortcuts:** press a number to jump to the matching page in the sidebar. For parents that's 1 Overview, 2 Chores, 3 History, 4 Rewards, 5 People, 6 Categories and 7 My account. Hold Ctrl or Option/Alt to see the numbers. Click your avatar or name (top right on phones) to change your name, avatar and favourite colour. Your favourite colour is also used for buttons and highlights throughout the app.

A **streak** counts days where every chore was approved. Days waiting on a parent's approval don't break it.

## Running it on a home server

The database lives in `DATA_DIR` (default `./data`) as `choretrack.db`. To back up, copy that folder (the `-wal`/`-shm` files too, or stop the server first).

| Variable | Default | Purpose |
| --- | --- | --- |
| `PORT` | `3030` | Port to listen on |
| `HOST` | `0.0.0.0` | Interface to bind to |
| `DATA_DIR` | `./data` | Where the SQLite database is stored |
| `TZ` | system | Time zone that decides when "today" starts |
| `COOKIE_SECURE` | `false` | Set to `true` if you serve it over HTTPS (e.g. behind a reverse proxy) |

### Raspberry Pi OS / Debian

```bash
# Current LTS Node.js (Debian's own package is too old)
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
sudo apt-get install -y nodejs git build-essential python3

# App
sudo useradd --system --home /var/lib/choretrack --create-home choretrack
sudo git clone https://github.com/shambles07/choretrack.git /opt/choretrack
cd /opt/choretrack
sudo npm ci
sudo npm run build

# Service (starts on boot, restarts on failure)
sudo cp deploy/choretrack.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now choretrack
sudo systemctl status choretrack
```

`build-essential` and `python3` are only needed if a prebuilt SQLite driver isn't available for your Pi. On 64-bit Raspberry Pi OS one usually is.

### macOS

```bash
brew install node
git clone https://github.com/shambles07/choretrack.git ~/choretrack
cd ~/choretrack
npm ci
npm run build
```

To start it automatically when you log in, edit `deploy/com.choretrack.server.plist`. Replace `YOUR_USER`, and on an Intel Mac change `/opt/homebrew/bin/node` to `/usr/local/bin/node`. Then:

```bash
cp deploy/com.choretrack.server.plist ~/Library/LaunchAgents/
launchctl load ~/Library/LaunchAgents/com.choretrack.server.plist
```

### Docker (either platform)

```bash
docker compose up -d --build
```

Edit `TZ` in `docker-compose.yml` first, then open <http://localhost:3030>. Data is kept in the `choretrack-data` volume.

### Updating

```bash
git pull
npm ci
npm run build
```

Then restart the service, e.g. `sudo systemctl restart choretrack`. Database changes are applied automatically on start.

With Docker, rebuild the image after pulling. A plain `docker compose up -d` keeps running the old image:

```bash
git pull
docker compose up -d --build
```

To use a different port, change both numbers in `ports` and the `PORT` line in `docker-compose.yml`, e.g. `"8080:8080"` and `PORT=8080`.

### Forgot the parent password?

On the server:

```bash
npm run reset-admin-password -- <username> <new-password>
```

## Security notes

- Passwords and PINs are hashed with scrypt. Sessions are random tokens in `HttpOnly`, `SameSite=Lax` cookies, and only a hash of each token is stored.
- Login attempts are limited to 10 per minute per IP address, which makes guessing a 4-digit PIN slow.
- All permission checks happen on the server. Kids can't reach parent pages or other kids' chores.
- The "Who's doing chores?" screen lists the kids' names and avatars to anyone who can reach the page. That's fine on a home network. **Don't expose the app directly to the internet.** For access away from home, use a VPN such as Tailscale or WireGuard, or a reverse proxy with HTTPS and `COOKIE_SECURE=true`.

## Development

```bash
npm run dev        # API on :3030 and Vite on :5173 with hot reload
npm run typecheck
npm test           # API tests (Vitest)
npm run build && npm run test:e2e   # browser tests at phone, tablet and desktop sizes (Playwright)
```

| Path | Contents |
| --- | --- |
| `server/src` | Fastify API, SQLite schema and migrations (`db.ts`), auth, chore scheduling (`chores.ts`), points, levels, streaks and badges (`gamification.ts`) |
| `web/src` | React app. `pages/admin` and `pages/doer` hold the two portals. `lib/sound.ts` synthesises the jingles with the Web Audio API, and `lib/celebrate.ts` does the confetti. |
| `shared/types.ts` | Types and game rules (level thresholds, badge list) used by both sides |
| `e2e` | Playwright tests |
| `deploy` | systemd unit and macOS launchd agent |

Stack: React 19, TypeScript, Vite, Tailwind CSS 4, Framer Motion, canvas-confetti and Lucide icons on the front end. Fastify 5, better-sqlite3 and Zod on the server.
