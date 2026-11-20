import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

const ADMIN = { name: "Mom", username: "mom", password: "password123" };
const KID = { name: "Ava", pin: "2468" };

// Creates the parent and child the first time; later projects reuse them.
async function ensureFamily(request: APIRequestContext): Promise<number> {
    const { needsSetup } = await (await request.get("/api/setup")).json();
    if (needsSetup) {
        await request.post("/api/setup", { data: ADMIN });
        await request.post("/api/admin/users", {
            data: { role: "doer", name: KID.name, pin: KID.pin, avatar: "cat", color: "#ec4899" },
        });
    } else {
        await request.post("/api/auth/login", { data: { username: ADMIN.username, password: ADMIN.password } });
    }
    const { users } = await (await request.get("/api/admin/users")).json();
    return users.find((u: { name: string }) => u.name === KID.name).id;
}

async function loginKid(page: Page) {
    await page.goto("/login");
    await page.getByRole("button", { name: KID.name }).click();
    for (const digit of KID.pin) {
        await page.getByRole("button", { name: digit, exact: true }).click();
    }
    await expect(page.getByRole("heading", { name: new RegExp(`${KID.name}!`) })).toBeVisible();
}

async function loginParent(page: Page) {
    await page.goto("/login");
    await page.getByRole("button", { name: "Parent login" }).click();
    await page.getByLabel("Username").fill(ADMIN.username);
    await page.getByLabel("Password").fill(ADMIN.password);
    await page.getByRole("button", { name: "Log in" }).click();
    await expect(page.getByRole("heading", { name: "Overview" })).toBeVisible();
}

async function logout(page: Page) {
    await page.getByRole("button", { name: "Log out" }).first().click();
    await expect(page).toHaveURL(/\/login/);
}

test("kid completes a chore, parent approves, kid collects points", async ({ page, request }, info) => {
    const kidId = await ensureFamily(request);
    const title = `Feed the cat (${info.project.name})`;
    const { categories } = await (await request.get("/api/categories")).json();
    const pets = categories.find((c: { name: string }) => c.name === "Pets");
    await request.post("/api/admin/chores", {
        data: { title, categoryId: pets.id, points: 15, assigneeId: kidId, recurrence: "once" },
    });

    // The kid marks it done.
    await loginKid(page);
    const card = page.getByRole("article", { name: title });
    await expect(card).toBeVisible();
    await card.getByRole("button", { name: "I did it!" }).click();
    await expect(card.getByText("Waiting for a parent to check")).toBeVisible();
    await logout(page);

    // The parent approves it.
    await loginParent(page);
    const row = page.locator("div").filter({ hasText: title }).filter({ has: page.getByRole("button", { name: "Approve" }) }).last();
    await row.getByRole("button", { name: "Approve" }).click();
    await expect(page.getByText(`Approved "${title}"`)).toBeVisible();
    await logout(page);

    // The kid sees the celebration and collects.
    await loginKid(page);
    await expect(page.getByRole("dialog", { name: "Good news" })).toBeVisible();
    await expect(page.getByText("+15").first()).toBeVisible();
    await page.getByRole("button", { name: "Collect!" }).click();
    await expect(page.getByRole("dialog", { name: "Good news" })).toBeHidden({ timeout: 5000 });
    await expect(page.getByRole("article", { name: title }).getByText("Approved! +15 points")).toBeVisible();
});

test("table view and dark mode work", async ({ page, request }) => {
    await ensureFamily(request);
    await loginKid(page);
    await page.getByRole("button", { name: "Table" }).click();
    await expect(page.getByRole("table").first()).toBeVisible();
    await page.getByRole("button", { name: /^Theme:/ }).click(); // system -> light
    await page.getByRole("button", { name: /^Theme:/ }).click(); // light -> dark
    await expect(page.locator("html")).toHaveClass(/dark/);
});

test("parent creates a chore from the form", async ({ page, request }, info) => {
    await ensureFamily(request);
    await loginParent(page);
    await page.goto("/admin/chores");
    await page.getByRole("button", { name: "New chore" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Chore", { exact: true }).fill(`Water plants (${info.project.name})`);
    await dialog.getByRole("button", { name: "Yard & Garden" }).click();
    await dialog.getByRole("button", { name: "20", exact: true }).click();
    await dialog.getByRole("button", { name: "Some days" }).click();
    await dialog.getByRole("button", { name: "Sat" }).click();
    await dialog.getByRole("button", { name: "Add chore" }).click();
    await expect(page.getByText("Chore added")).toBeVisible();
    await expect(page.getByText(`Water plants (${info.project.name})`)).toBeVisible();
});
