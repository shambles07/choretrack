# Deployment

## Default port 3030

**Id:** 00c5d441-8aeb-4748-8d33-bc47af375ae5
**Type:** decision
**Status:** active
**Evidence:** confirmed
**Source:** maintainer report, development conversation, 2026-11-21; commit a205042

The server listens on 3030 unless `PORT` or `--port` says otherwise, and
every deployment file (Compose, systemd, launchd) uses it.

**Reason:** port 3000 clashed with Grafana on the home server ChoreTrack runs
on; 3000 is a common default for home-server tools.

**Rejected alternative:** 3000, the original default.

## Docker Compose sets PORT beside the port mapping

**Id:** 85c7985b-34df-4e7c-b608-ab2bde031ce6
**Type:** incident
**Type:** decision
**Status:** active
**Evidence:** confirmed
**Source:** maintainer report of an empty browser response, development conversation, 2026-11-21; commit b46d21a
**See:** deployment.md#default-port-3030 — 00c5d441-8aeb-4748-8d33-bc47af375ae5 — as of 2026-11-22

`docker-compose.yml` sets `PORT=3030` right next to the `3030:3030` mapping.

**Reason:** after the port change, a container built from an older image
still listened on 3000 while Compose forwarded 3030. The forwarder accepted
the connection and closed it, and the browser showed an empty response.
Defining both numbers in one file keeps them in step even with a stale
image. The rebuild steps are in `docs/installation.md`.

**Rejected alternative:** relying on the Dockerfile's `ENV PORT` alone. An
image built before a change keeps the old value.

## Node.js 22 or newer

**Id:** 4bb5c721-92a0-41ba-ae0b-30c0381316ed
**Type:** decision
**Status:** active
**Evidence:** confirmed
**Source:** maintainer question about Node 26, development conversation, 2026-11-21; commit a205042
**Revisit when:** ChoreTrack is run on Node 26, or a dependency drops Node 22

`package.json` requires Node 22 or newer; the SQLite driver is
`better-sqlite3` 13.x. The tests run on Node 22. Node 26 has not been
verified, because the build environment could not download it.

**Reason:** the earlier `better-sqlite3` release did not support current
Node versions; 13.x supports Node 22 and later.

**Rejected alternative:** requiring exactly Node 22, which would exclude the
Node 26 the maintainer runs.

## Plain SQL on SQLite, no ORM

**Id:** b0f1c663-c018-4d62-b24a-8bc88432b87e
**Type:** decision
**Status:** active
**Evidence:** confirmed
**Source:** build plan and delivered build, 2026-11-20; commit afa2852 (`server/src/db.ts`)

Data lives in one SQLite file through `better-sqlite3`, with hand-written SQL
and numbered migrations.

**Reason:** a small, single-household app gains little from an ORM, and one
fewer dependency is one fewer thing to break on a Raspberry Pi.

**Rejected alternative:** Drizzle ORM, named in the build plan and dropped
during the build.

## Updates follow release tags

**Id:** 5f285db6-861d-489b-89a4-6b72cf912523
**Type:** decision
**Status:** active
**Evidence:** inferred
**Source:** commit 1603078 (`Makefile`); no stated reason found

`make update` and `make docker-update` check out the newest release tag (a
plain `vMAJOR.MINOR.PATCH`; the old `v1.0.0-rc.1` tag is ignored);
`CHANNEL=main` follows `main` instead.

**Reason (inferred):** a home server should run versions that have been
released and tested, not whatever was last merged.

**Rejected alternative:** always tracking `main`, still available as
`CHANNEL=main`.
