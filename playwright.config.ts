import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;

export default defineConfig({
    testDir: "e2e",
    fullyParallel: false,
    workers: 1,
    reporter: "list",
    use: {
        baseURL: `http://localhost:${PORT}`,
        trace: "off",
    },
    projects: [
        { name: "phone", use: { ...devices["Pixel 7"] } },
        { name: "tablet", use: { viewport: { width: 820, height: 1180 }, hasTouch: true } },
        { name: "desktop", use: { viewport: { width: 1440, height: 900 } } },
    ],
    webServer: {
        // Run `npm run build` first. Each run starts from an empty database.
        command: "rm -rf .e2e-data && node dist/server/index.js",
        url: `http://localhost:${PORT}/api/health`,
        env: { PORT: String(PORT), DATA_DIR: ".e2e-data", LOGIN_RATE_LIMIT: "1000" },
        reuseExistingServer: false,
    },
});
