# 🚀 Installation

[← Back to README](../README.md)

ChoreTrack is one Node.js process and one SQLite file. Pick **one** way to run it.

| | Best for | Needs |
| --- | --- | --- |
| [🐳 Docker](#-docker) | Any machine that runs Docker or OrbStack | Docker with Compose |
| [🍓 Raspberry Pi / Debian](#-raspberry-pi-os--debian) | A Pi that does nothing else | Node.js 22+ |
| [🍎 macOS](#-macos) | A Mac that's always on | Node.js 22+ |

> [!IMPORTANT]
> Set your time zone (`TZ`) first. It decides when "today" starts, so the wrong zone resets daily chores at the wrong hour.

## 🐳 Docker

```bash
git clone https://github.com/shambles07/choretrack.git && cd choretrack
make deploy
```

Edit `TZ` in `docker-compose.yml`, then open <http://localhost:3030>. The first visit creates the parent account. Data lives in the `choretrack-data` volume and survives rebuilds.

> [!NOTE]
> To change the port, edit **both** numbers in `ports` and the `PORT` line in `docker-compose.yml`, e.g. `"8080:8080"` and `PORT=8080`.

## 🍓 Raspberry Pi OS / Debian

```bash
# Node.js LTS (Debian's own package is too old)
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
sudo apt-get install -y nodejs git make build-essential python3

# App
sudo useradd --system --home /var/lib/choretrack --create-home choretrack
sudo git clone https://github.com/shambles07/choretrack.git /opt/choretrack
cd /opt/choretrack && sudo make install build

# Service: starts on boot, restarts on failure
sudo cp deploy/choretrack.service /etc/systemd/system/
sudo systemctl daemon-reload && sudo systemctl enable --now choretrack
```

Set `TZ` by adding `Environment=TZ=Europe/London` (your zone) to the service file.

> [!NOTE]
> `build-essential` and `python3` are only used if no prebuilt SQLite driver exists for your Pi. On 64-bit Raspberry Pi OS one usually does.

## 🍎 macOS

```bash
brew install node
git clone https://github.com/shambles07/choretrack.git ~/choretrack && cd ~/choretrack
make install build start
```

To start it at login, edit `deploy/com.choretrack.server.plist` (replace `YOUR_USER`; on an Intel Mac use `/usr/local/bin/node`), then:

```bash
cp deploy/com.choretrack.server.plist ~/Library/LaunchAgents/
launchctl load ~/Library/LaunchAgents/com.choretrack.server.plist
```

## 🔄 Updating

| Running with | Command | What it does |
| --- | --- | --- |
| Docker | `make docker-update` | Checks out the newest release tag, rebuilds the image, restarts the container |
| Pi / macOS | `make update` | Checks out the newest release tag, reinstalls, rebuilds, restarts the service |

Add `CHANNEL=main` to follow the latest `main` instead of tagged releases. Database changes apply automatically on start.

> [!IMPORTANT]
> With Docker, always rebuild (`make deploy` or `docker compose up -d --build`). A plain `docker compose up -d` keeps running the **old** image.

## ⚙️ Configuration

| Variable | Default | Purpose |
| --- | --- | --- |
| `PORT` | `3030` | Port to listen on (`--port` overrides it) |
| `HOST` | `0.0.0.0` | Interface to bind to |
| `DATA_DIR` | `./data` | Folder holding `choretrack.db` |
| `TZ` | system | Time zone that decides when "today" starts |
| `COOKIE_SECURE` | `false` | `true` when served over HTTPS |

## 💾 Backups

Run `make export WHAT=all > backup.json` (or `make docker-export`) for a readable JSON copy. For a full restore point, copy `DATA_DIR`, including the `-wal` and `-shm` files, or stop the server first.

## 🔑 Forgot the parent password?

```bash
npm run reset-admin-password -- <username> <new-password>
```
