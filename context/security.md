# Security

## Password and PIN hashing with Node's scrypt

**Id:** 9127f857-7bec-42e3-89dc-84679fa8f162
**Type:** decision
**Status:** active
**Evidence:** confirmed
**Source:** initial build plan, 2026-11-20; commit afa2852 (comment in `server/src/auth.ts`)
**Revisit when:** Raspberry Pi stops being a target host, or Node ships a built-in Argon2

Parent passwords and kids' 4-digit PINs are hashed with Node's built-in
`crypto.scrypt`.

**Reason:** scrypt is part of Node, so nothing native has to be compiled
on a Raspberry Pi, one of the two hosts the app is meant to run on.

**Rejected alternative:** argon2 (the `argon2` npm package). It was the
choice in the original build plan, dropped because it is a native add-on
that can need a compiler toolchain on Raspberry Pi OS.

## Kids sign in with an avatar and a 4-digit PIN

**Id:** 07ea19ee-30ad-4d6b-b870-97f852acfde6
**Type:** decision
**Status:** active
**Evidence:** confirmed
**Source:** build plan approved by the maintainer, 2026-11-20; commit afa2852
**See:** security.md#built-for-a-trusted-home-network-security-kept-basic — 3767adeb-e123-42d8-9f79-cff112c0e8cd — as of 2026-11-22

Chore doers tap their avatar and enter a 4-digit PIN; parents sign in with
a username and password. Logins are limited to 10 attempts per minute per
IP address.

**Reason:** a young child can't be expected to manage a password, and an
avatar picker suits a shared family tablet. A 4-digit PIN is weak, so it is
paired with the login rate limit and the home-network-only posture.

**Rejected alternative:** passwords for chore doers, too hard for the
intended users.

**Consequence:** the login screen lists every chore doer's name and avatar
to anyone who can open it; this gap is listed in `docs/security.md`.

## Built for a trusted home network, security kept basic

**Id:** 3767adeb-e123-42d8-9f79-cff112c0e8cd
**Type:** constraint
**Type:** decision
**Status:** active
**Evidence:** confirmed
**Source:** maintainer requirement for the README, development conversation, 2026-11-21; `docs/security.md`
**Revisit when:** the app is reachable from outside the home network, or one instance serves more than one household

ChoreTrack targets one household on a trusted network: no built-in HTTPS,
short PINs, chore doers' names visible on the login screen, no encryption at
rest. The protections it does have, the known gaps and the roadmap are in
`docs/security.md`.

**Reason:** the project is deliberately an all-in-one, simple tool for one
specific use. Simplicity was chosen over hardening, and better security and
data handling are a stated long-term goal rather than a launch requirement.

**Rejected alternative:** hardening up front (built-in TLS, longer secrets,
account lockout). Deferred to the roadmap, not ruled out.
