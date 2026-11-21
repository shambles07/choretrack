# 💻 Command line

[← Back to README](../README.md)

The server is a single command, `node dist/server/index.js`. It's also installed as `choretrack` via `npm link`, and runs as `./dist/server/index.js`.

```text
Usage:
  choretrack [options]

Options:
  -p, --port <number>    Port to listen on (default: $PORT or 3030)
  -x, --export <what>    Print data as JSON to stdout and exit. <what>: chores, users, scores, all
  -v, --version          Print the version and exit
  -h, --usage, --help    Print this help and exit
```

Values can follow a space or an equals sign: `-p 8080`, `-p=8080`, `--port=8080`, `-x all`, `--export=scores`.

## 📤 Exporting

| `<what>` | Contains |
| --- | --- |
| `chores` | Every active chore, with its schedule, points, category and assignee |
| `users` | Parents and chore doers (names, roles, avatars, colours) |
| `scores` | Each chore doer's level, XP, points balance, streaks and trophies |
| `all` | All of the above, plus categories, rewards, chore history and reward requests |

```bash
choretrack --export=all > backup.json          # native
make export WHAT=scores                        # native, via make
make docker-export WHAT=all > backup.json      # from the running container
```

> [!NOTE]
> Exports never include password or PIN hashes, or session tokens. Export reads the database in `DATA_DIR` and is safe to run while the server is up.

## 🚦 Exit codes

| Code | Meaning |
| --- | --- |
| `0` | Success |
| `1` | No database found in `DATA_DIR` (export only) |
| `2` | Bad flag or value. The message says which, and `--usage` shows help |
