import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../src/app.js";
import { setClock } from "../src/dates.js";

let app: FastifyInstance;

function cookieFrom(res: { headers: Record<string, unknown> }): string {
    const raw = res.headers["set-cookie"];
    const first = Array.isArray(raw) ? raw[0] : String(raw);
    return first.split(";")[0];
}

async function call(method: string, url: string, cookie?: string, body?: unknown) {
    const res = await app.inject({
        method: method as "GET",
        url,
        headers: { ...(cookie ? { cookie } : {}), ...(method === "GET" ? {} : { "content-type": "application/json" }) },
        payload: method === "GET" ? undefined : JSON.stringify(body ?? {}),
    });
    return { status: res.statusCode, body: res.json(), res };
}

function setToday(date: string, hour = 12): void {
    const [y, m, d] = date.split("-").map(Number);
    setClock(() => new Date(y, m - 1, d, hour));
}

async function setupFamily() {
    const setup = await call("POST", "/api/setup", undefined, { name: "Mom", username: "mom", password: "password123" });
    expect(setup.status).toBe(200);
    const admin = cookieFrom(setup.res);
    const kid = await call("POST", "/api/admin/users", admin, {
        role: "doer",
        name: "Ava",
        pin: "1234",
        avatar: "cat",
        color: "#ec4899",
    });
    expect(kid.status).toBe(200);
    const login = await call("POST", "/api/auth/pin", undefined, { userId: kid.body.user.id, pin: "1234" });
    expect(login.status).toBe(200);
    const { categories } = (await call("GET", "/api/categories", admin)).body;
    return { admin, kidCookie: cookieFrom(login.res), kidId: kid.body.user.id as number, categoryId: categories[0].id };
}

beforeEach(async () => {
    setToday("2026-03-02");
    app = await buildApp({ dbPath: ":memory:" });
});

afterEach(async () => {
    await app.close();
});

describe("setup and auth", () => {
    it("only allows setup once", async () => {
        expect((await call("GET", "/api/setup")).body.needsSetup).toBe(true);
        await setupFamily();
        expect((await call("GET", "/api/setup")).body.needsSetup).toBe(false);
        const again = await call("POST", "/api/setup", undefined, { name: "X", username: "x", password: "password123" });
        expect(again.status).toBe(409);
    });

    it("rejects a wrong password and a wrong PIN", async () => {
        const { kidId } = await setupFamily();
        expect((await call("POST", "/api/auth/login", undefined, { username: "mom", password: "nope" })).status).toBe(401);
        expect((await call("POST", "/api/auth/pin", undefined, { userId: kidId, pin: "0000" })).status).toBe(401);
        expect((await call("POST", "/api/auth/login", undefined, { username: "MOM", password: "password123" })).status).toBe(
            200,
        );
    });

    it("keeps chore doers out of admin routes", async () => {
        const { kidCookie } = await setupFamily();
        expect((await call("GET", "/api/admin/overview", kidCookie)).status).toBe(403);
        expect((await call("GET", "/api/admin/overview")).status).toBe(401);
    });

    it("requires JSON for mutating requests", async () => {
        const res = await app.inject({
            method: "POST",
            url: "/api/auth/logout",
            headers: { "content-type": "application/x-www-form-urlencoded" },
            payload: "a=b",
        });
        expect(res.statusCode).toBe(415);
    });
});

describe("chore approval flow", () => {
    it("only counts points once a parent approves", async () => {
        const { admin, kidCookie, kidId, categoryId } = await setupFamily();
        const chore = await call("POST", "/api/admin/chores", admin, {
            title: "Feed the cat",
            categoryId,
            points: 10,
            assigneeId: kidId,
            recurrence: "daily",
        });
        expect(chore.status).toBe(200);

        let dash = (await call("GET", "/api/doer/dashboard", kidCookie)).body;
        expect(dash.todayChores).toHaveLength(1);
        expect(dash.upcoming).toHaveLength(6);
        const instanceId = dash.todayChores[0].id;

        const done = await call("POST", `/api/doer/instances/${instanceId}/complete`, kidCookie);
        expect(done.body.instance.status).toBe("submitted");
        expect(done.body.stats.xp).toBe(0);
        expect(done.body.stats.pendingPoints).toBe(10);

        const overview = (await call("GET", "/api/admin/overview", admin)).body;
        expect(overview.approvals).toHaveLength(1);

        await call("POST", `/api/admin/instances/${instanceId}/approve`, admin);
        dash = (await call("GET", "/api/doer/dashboard", kidCookie)).body;
        expect(dash.stats.xp).toBe(10);
        expect(dash.stats.balance).toBe(10);
        expect(dash.celebration.approved).toEqual([{ title: "Feed the cat", points: 10 }]);
        expect(dash.celebration.newBadges.map((b: { key: string }) => b.key)).toContain("first-chore");

        await call("POST", "/api/doer/celebration/ack", kidCookie);
        dash = (await call("GET", "/api/doer/dashboard", kidCookie)).body;
        expect(dash.celebration.approved).toHaveLength(0);
        expect(dash.celebration.newBadges).toHaveLength(0);
    });

    it("lets a parent send a chore back with a note", async () => {
        const { admin, kidCookie, kidId, categoryId } = await setupFamily();
        await call("POST", "/api/admin/chores", admin, {
            title: "Make bed",
            categoryId,
            points: 5,
            assigneeId: kidId,
            recurrence: "once",
        });
        const id = (await call("GET", "/api/doer/dashboard", kidCookie)).body.todayChores[0].id;
        await call("POST", `/api/doer/instances/${id}/complete`, kidCookie);
        const rejected = await call("POST", `/api/admin/instances/${id}/reject`, admin, { note: "Pillows too!" });
        expect(rejected.body.instance.status).toBe("rejected");

        const dash = (await call("GET", "/api/doer/dashboard", kidCookie)).body;
        expect(dash.celebration.rejected).toEqual([{ title: "Make bed", note: "Pillows too!" }]);
        expect((await call("POST", `/api/doer/instances/${id}/complete`, kidCookie)).body.instance.status).toBe(
            "submitted",
        );
    });

    it("won't let a kid complete a future chore or someone else's", async () => {
        const { admin, kidCookie, kidId, categoryId } = await setupFamily();
        await call("POST", "/api/admin/chores", admin, {
            title: "Water plants",
            categoryId,
            points: 5,
            assigneeId: kidId,
            recurrence: "daily",
        });
        const dash = (await call("GET", "/api/doer/dashboard", kidCookie)).body;
        expect((await call("POST", `/api/doer/instances/${dash.upcoming[0].id}/complete`, kidCookie)).status).toBe(400);

        const other = await call("POST", "/api/admin/users", admin, { role: "doer", name: "Sam", pin: "4321" });
        const otherLogin = await call("POST", "/api/auth/pin", undefined, { userId: other.body.user.id, pin: "4321" });
        const res = await call("POST", `/api/doer/instances/${dash.todayChores[0].id}/complete`, cookieFrom(otherLogin.res));
        expect(res.status).toBe(404);
    });

    it("only schedules weekly chores on chosen days", async () => {
        const { admin, kidCookie, kidId, categoryId } = await setupFamily();
        // 2026-03-02 is a Monday.
        await call("POST", "/api/admin/chores", admin, {
            title: "Take out trash",
            categoryId,
            points: 5,
            assigneeId: kidId,
            recurrence: "weekly",
            daysOfWeek: [1, 4],
        });
        const dash = (await call("GET", "/api/doer/dashboard", kidCookie)).body;
        expect(dash.todayChores).toHaveLength(1);
        expect(dash.upcoming.map((i: { date: string }) => i.date)).toEqual(["2026-03-05"]);
    });
});

describe("streaks and rewards", () => {
    it("counts consecutive fully approved days", async () => {
        const { admin, kidCookie, kidId, categoryId } = await setupFamily();
        await call("POST", "/api/admin/chores", admin, {
            title: "Brush teeth",
            categoryId,
            points: 20,
            assigneeId: kidId,
            recurrence: "daily",
            startDate: "2026-03-02",
        });
        for (const day of ["2026-03-02", "2026-03-03", "2026-03-04"]) {
            setToday(day);
            const id = (await call("GET", "/api/doer/dashboard", kidCookie)).body.todayChores[0].id;
            await call("POST", `/api/doer/instances/${id}/complete`, kidCookie);
            await call("POST", `/api/admin/instances/${id}/approve`, admin);
        }
        let stats = (await call("GET", "/api/doer/dashboard", kidCookie)).body.stats;
        expect(stats.streak).toBe(3);
        expect(stats.badges.map((b: { key: string }) => b.key)).toContain("streak-3");

        // Missing a day breaks the streak once that day is over.
        setToday("2026-03-06");
        stats = (await call("GET", "/api/doer/dashboard", kidCookie)).body.stats;
        expect(stats.streak).toBe(0);
        expect(stats.bestStreak).toBe(3);
    });

    it("spends points on rewards and refuses when short", async () => {
        const { admin, kidCookie, kidId, categoryId } = await setupFamily();
        await call("POST", "/api/admin/chores", admin, {
            title: "Vacuum",
            categoryId,
            points: 60,
            assigneeId: kidId,
            recurrence: "once",
        });
        const id = (await call("GET", "/api/doer/dashboard", kidCookie)).body.todayChores[0].id;
        await call("POST", `/api/admin/instances/${id}/approve`, admin);

        const { rewards } = (await call("GET", "/api/doer/rewards", kidCookie)).body;
        const cheap = rewards.find((r: { cost: number }) => r.cost === 50);
        const pricey = rewards.find((r: { cost: number }) => r.cost === 100);
        expect((await call("POST", `/api/doer/rewards/${pricey.id}/redeem`, kidCookie)).status).toBe(400);
        const redeemed = await call("POST", `/api/doer/rewards/${cheap.id}/redeem`, kidCookie);
        expect(redeemed.body.stats.balance).toBe(10);
        expect(redeemed.body.stats.xp).toBe(60);

        const pending = (await call("GET", "/api/admin/overview", admin)).body.redemptions;
        expect(pending).toHaveLength(1);
        await call("POST", `/api/admin/redemptions/${pending[0].id}/deny`, admin);
        expect((await call("GET", "/api/doer/dashboard", kidCookie)).body.stats.balance).toBe(60);
    });

    it("keeps earned points when a chore is deleted", async () => {
        const { admin, kidCookie, kidId, categoryId } = await setupFamily();
        const chore = await call("POST", "/api/admin/chores", admin, {
            title: "Dishes",
            categoryId,
            points: 15,
            assigneeId: kidId,
            recurrence: "daily",
        });
        const id = (await call("GET", "/api/doer/dashboard", kidCookie)).body.todayChores[0].id;
        await call("POST", `/api/admin/instances/${id}/approve`, admin);
        await call("DELETE", `/api/admin/chores/${chore.body.chore.id}`, admin);
        const dash = (await call("GET", "/api/doer/dashboard", kidCookie)).body;
        expect(dash.stats.xp).toBe(15);
        expect(dash.upcoming).toHaveLength(0);
        expect((await call("GET", "/api/admin/chores", admin)).body.chores).toHaveLength(0);
    });
});
