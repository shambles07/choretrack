// Bundles the server into dist/server so production runs on plain Node.
import { build } from "esbuild";

const shared = {
    bundle: true,
    platform: "node",
    format: "esm",
    target: "node20",
    packages: "external",
    sourcemap: true,
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
