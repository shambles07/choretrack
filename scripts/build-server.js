// Bundles the server into dist/server so production runs on plain Node.
import { build } from "esbuild";

const shared = {
    bundle: true,
    platform: "node",
    format: "esm",
    target: "node20",
    packages: "external",
    sourcemap: true,
    banner: { js: "#!/usr/bin/env node" },
    logLevel: "info",
};

await build({
    ...shared,
    entryPoints: {
        index: "server/src/index.ts",
        "reset-password": "server/src/reset-password.ts",
    },
    outdir: "dist/server",
});

// Lets the bundle run directly as ./dist/server/index.js (and as the `choretrack` bin).
const { chmodSync } = await import("node:fs");
chmodSync("dist/server/index.js", 0o755);
