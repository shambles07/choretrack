# 🔒 Security

[← Back to README](../README.md)

> [!IMPORTANT]
> ChoreTrack is deliberately simple and is built for **one household on a trusted home network**. Security has had less attention than features so far. Don't expose it to the internet, and don't store anything in it you'd mind a family member or houseguest seeing.

## What's in place

| | |
| --- | --- |
| 🔑 Credentials | Passwords and PINs are hashed with scrypt |
| 🍪 Sessions | Random tokens in `HttpOnly`, `SameSite=Lax` cookies; only a hash is stored; 30-day expiry |
| 🚦 Login limits | 10 attempts per minute per IP address, which slows PIN guessing |
| 🛂 Permissions | Checked on the server for every request. Kids can't reach parent pages or other kids' chores |
| 🧱 Headers | Content Security Policy, `X-Frame-Options`, `nosniff`. Write requests must be JSON, which blocks cross-site form posts |

## Known gaps

- **No HTTPS of its own.** Traffic on your network is plain HTTP unless you add a reverse proxy.
- **4-digit PINs** are easy to guess for anyone with time and access to the login screen.
- **The login screen lists every kid's name and avatar** to anyone who can open the page.
- **No encryption at rest and no automatic backups.** The SQLite file is readable by anyone with access to the server.
- **No audit log, two-factor sign-in or account lockout.**

## Using it away from home

Use a VPN such as [Tailscale](https://tailscale.com) or WireGuard. If you must publish it, put it behind a reverse proxy with HTTPS and authentication, and set `COOKIE_SECURE=true`.

## 🧭 Long-term goals

Better security and data handling is a **long-term goal** of the project:

- [ ] Built-in HTTPS, or first-class reverse-proxy guidance
- [ ] Longer PINs or passphrases, and lockout after repeated failures
- [ ] Optional hiding of the "Who's doing chores?" picker
- [ ] Scheduled, rotated backups and a one-command restore
- [ ] Encryption at rest
- [ ] An audit log of approvals and account changes
- [ ] Data retention settings and a full "delete my family's data" option

## Reporting a problem

Please [open an issue](https://github.com/shambles07/choretrack/issues). For anything sensitive, ask for a private contact in the issue first.
