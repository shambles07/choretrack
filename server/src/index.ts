import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseCli, usageText } from "./cli.js";

const here = path.dirname(fileURLToPath(import.meta.url));
// Works both from source (server/src) and from the bundle (dist/server).
const root = path.resolve(here, "../..");

function readVersion(): string {
    try {
        const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8")) as { version?: string };
        return pkg.version ? `v${pkg.version}` : "unknown";
    } catch {
        return "unknown";
    }
}

const version = readVersion();
const command = parseCli(process.argv.slice(2));
const dataDir = path.resolve(process.env.DATA_DIR ?? path.join(root, "data"));
const dbPath = path.join(dataDir, "choretrack.db");

switch (command.kind) {
    case "usage":
        process.stdout.write(usageText(version));
        break;

    case "version":
        process.stdout.write(`${version}\n`);
        break;

    case "error":
        process.stderr.write(`choretrack: ${command.message}\nRun with --usage for help.\n`);
        process.exit(2);
        break;

    case "export": {
        if (!fs.existsSync(dbPath)) {
            process.stderr.write(`choretrack: no database at ${dbPath}. Set DATA_DIR to the folder holding choretrack.db.\n`);
            process.exit(1);
        }
        const { openDatabase } = await import("./db.js");
        const { exportData } = await import("./export.js");
        const db = openDatabase(dbPath);
        process.stdout.write(`${JSON.stringify(exportData(db, command.scope, version), null, 4)}\n`);
        db.close();
        break;
    }

    case "serve": {
        const { buildApp } = await import("./app.js");
        const host = process.env.HOST ?? "0.0.0.0";
        const app = await buildApp({
            dbPath,
            webDir: path.join(root, "dist/web"),
            secureCookies: process.env.COOKIE_SECURE === "true",
            logger: true,
        });
        const shutdown = async () => {
            await app.close();
            process.exit(0);
        };
        process.on("SIGINT", shutdown);
        process.on("SIGTERM", shutdown);
        await app.listen({ port: command.port, host });
        app.log.info(
            `ChoreTrack ${version} is running on http://${host === "0.0.0.0" ? "localhost" : host}:${command.port}`,
        );
        break;
    }
}
