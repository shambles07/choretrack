import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildApp } from "./app.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");

const port = Number(process.env.PORT ?? 3030);
const host = process.env.HOST ?? "0.0.0.0";
const dataDir = path.resolve(process.env.DATA_DIR ?? path.join(root, "data"));

const app = await buildApp({
    dbPath: path.join(dataDir, "choretrack.db"),
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

await app.listen({ port, host });
app.log.info(`ChoreTrack is running on http://${host === "0.0.0.0" ? "localhost" : host}:${port}`);
