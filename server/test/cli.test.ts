import { describe, expect, it } from "vitest";
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { parseCli } from "../src/cli.js";
import { openDatabase } from "../src/db.js";
import { exportData } from "../src/export.js";
import { hashSecret } from "../src/auth.js";

describe("parseCli", () => {
    const noEnv = {};

    it("prints usage for -h, --usage and --help", () => {
        for (const flag of ["-h", "--usage", "--help"]) {
            expect(parseCli([flag], noEnv)).toEqual({ kind: "usage" });
        }
    });

    it("accepts the port with a space or an equals sign", () => {
        for (const args of [["-p", "8080"], ["-p=8080"], ["-p8080"], ["--port", "8080"], ["--port=8080"]]) {
            expect(parseCli(args, noEnv)).toEqual({ kind: "serve", port: 8080 });
        }
    });

    it("defaults to 3030, falls back to $PORT, and lets --port win", () => {
        expect(parseCli([], noEnv)).toEqual({ kind: "serve", port: 3030 });
        expect(parseCli([], { PORT: "4000" })).toEqual({ kind: "serve", port: 4000 });
        expect(parseCli(["--port", "5000"], { PORT: "4000" })).toEqual({ kind: "serve", port: 5000 });
    });

    it("rejects bad ports", () => {
        for (const args of [["-p", "0"], ["-p", "70000"], ["--port=abc"], ["-p", "80.5"]]) {
            expect(parseCli(args, noEnv).kind).toBe("error");
        }
        expect(parseCli(["--port"], noEnv)).toMatchObject({ kind: "error", message: expect.stringContaining("needs a value") });
    });

    it("accepts export scopes with a space or an equals sign", () => {
        expect(parseCli(["-x", "all"], noEnv)).toEqual({ kind: "export", scope: "all" });
        expect(parseCli(["-x=chores"], noEnv)).toEqual({ kind: "export", scope: "chores" });
        expect(parseCli(["--export", "users"], noEnv)).toEqual({ kind: "export", scope: "users" });
        expect(parseCli(["--export=score"], noEnv)).toEqual({ kind: "export", scope: "scores" });
        expect(parseCli(["--export=SCORES"], noEnv)).toEqual({ kind: "export", scope: "scores" });
    });

    it("rejects unknown export scopes and unknown flags", () => {
        expect(parseCli(["-x", "pets"], noEnv)).toMatchObject({ kind: "error", message: expect.stringContaining("Unknown export") });
        expect(parseCli(["--frobnicate"], noEnv).kind).toBe("error");
        expect(parseCli(["serve"], noEnv).kind).toBe("error");
    });
});

describe("exportData", () => {
    async function seeded() {
        const db = openDatabase(":memory:");
        db.prepare("INSERT INTO users (role, name, username, password_hash) VALUES ('admin', 'Mom', 'mom', ?)").run(
            await hashSecret("password123"),
        );
        db.prepare("INSERT INTO users (role, name, pin_hash, color) VALUES ('doer', 'Ava', ?, '#ec4899')").run(
            await hashSecret("1234"),
        );
        db.prepare(
            `INSERT INTO chores (title, category_id, points, assignee_id, recurrence, start_date)
             VALUES ('Feed the cat', 1, 10, 2, 'daily', '2026-01-01')`,
        ).run();
        db.prepare(
            "INSERT INTO chore_instances (chore_id, user_id, date, status, points_awarded) VALUES (1, 2, '2026-01-01', 'approved', 10)",
        ).run();
        return db;
    }

    it("never includes password or PIN hashes", async () => {
        const db = await seeded();
        const json = JSON.stringify(exportData(db, "all", "v1.0.0"));
        expect(json).not.toContain("scrypt$");
        expect(json).not.toMatch(/password|pin_hash|token/i);
        db.close();
    });

    it("includes only the requested scope", async () => {
        const db = await seeded();
        const scores = exportData(db, "scores", "v1.0.0");
        expect(Object.keys(scores)).toEqual(["app", "version", "exportedAt", "scope", "scores"]);
        expect(scores.scores).toEqual([expect.objectContaining({ name: "Ava", xp: 10, balance: 10, approvedChores: 1 })]);

        const chores = exportData(db, "chores", "v1.0.0");
        expect(chores.chores).toEqual([expect.objectContaining({ title: "Feed the cat", assignee: "Ava", category: "Cleaning" })]);

        const all = exportData(db, "all", "v1.0.0");
        for (const key of ["users", "chores", "scores", "categories", "rewards", "history", "redemptions"]) {
            expect(all).toHaveProperty(key);
        }
        db.close();
    });
});

describe("the choretrack command", () => {
    const entry = path.resolve("server/src/index.ts");
    const tsx = path.resolve("node_modules/.bin/tsx");

    it("prints help and exits", () => {
        const out = execFileSync(tsx, [entry, "--usage"], { encoding: "utf8" });
        expect(out).toContain("-x, --export <what>");
        expect(out).toContain("-p, --port <number>");
    });

    it("exits with status 2 and a hint on a bad flag", () => {
        const res = spawnSync(tsx, [entry, "--port=nope"], { encoding: "utf8" });
        expect(res.status).toBe(2);
        expect(res.stderr).toContain("Run with --usage for help.");
    });

    it("exports from the database in DATA_DIR", () => {
        const dir = fs.mkdtempSync(path.join(os.tmpdir(), "choretrack-cli-"));
        openDatabase(path.join(dir, "choretrack.db")).close();
        const out = execFileSync(tsx, [entry, "-x=users"], { encoding: "utf8", env: { ...process.env, DATA_DIR: dir } });
        expect(JSON.parse(out)).toMatchObject({ app: "choretrack", scope: "users", users: [] });
        fs.rmSync(dir, { recursive: true, force: true });
    });
});
