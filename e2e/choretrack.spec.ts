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

test("typing a PIN keeps focus and the fields show red/green validation", async ({ page, request }) => {
    await ensureFamily(request);
    await loginParent(page);
    await page.goto("/admin/people");
    await page.getByRole("button", { name: "Add" }).first().click();
    const dialog = page.getByRole("dialog", { name: "Add chore doer" });
    const name = dialog.getByLabel("Name", { exact: true });
    const pin = dialog.getByLabel("4-digit PIN");

    // A blank name that has focus is flagged straight away, with a tooltip.
    await expect(name).toBeFocused();
    await expect(name).toHaveAttribute("data-state", "invalid");
    await expect(dialog.getByRole("tooltip")).toHaveText("Name cannot be blank!");

    await name.pressSequentially("Sam");
    await expect(name).toHaveAttribute("data-state", "valid");
    await expect(dialog.getByRole("tooltip")).toHaveCount(0);

    // Regression: each keystroke used to send focus back to the Name field.
    await pin.click();
    await pin.pressSequentially("1");
    await expect(pin).toBeFocused();
    await expect(pin).toHaveValue("1");
    await expect(name).toHaveValue("Sam");
    await expect(pin).toHaveAttribute("data-state", "invalid");
    await expect(dialog.getByRole("button", { name: "Save" })).toBeDisabled();

    await pin.pressSequentially("234");
    await expect(pin).toHaveValue("1234");
    await expect(pin).toHaveAttribute("data-state", "valid");
    await expect(dialog.getByRole("button", { name: "Save" })).toBeEnabled();
    await dialog.getByRole("button", { name: "Cancel" }).click();
});

test("number keys switch pages and Ctrl shows the numbers", async ({ page, request }) => {
    await ensureFamily(request);
    await loginParent(page);
    await expect(page.locator("kbd.kbd-hint")).toHaveCount(0);
    await page.keyboard.down("Control");
    await expect(page.locator("kbd.kbd-hint").filter({ visible: true }).first()).toBeVisible();
    await page.keyboard.up("Control");
    await expect(page.locator("kbd.kbd-hint")).toHaveCount(0);

    await page.keyboard.press("2");
    await expect(page).toHaveURL(/\/admin\/chores$/);
    await page.keyboard.press("4");
    await expect(page).toHaveURL(/\/admin\/rewards$/);
    await page.keyboard.press("Alt+3");
    await expect(page).toHaveURL(/\/admin\/history$/);
    await page.keyboard.press("7");
    await expect(page).toHaveURL(/\/admin\/account$/);
    await page.keyboard.press("1");
    await expect(page).toHaveURL(/\/admin$/);

    // Typing a number into a field must not navigate away.
    await page.goto("/admin/chores");
    await page.getByLabel("Search chores").fill("5");
    await expect(page).toHaveURL(/\/admin\/chores$/);
});

test("clicking your avatar edits your profile and sets the accent colour", async ({ page, request }) => {
    await ensureFamily(request);
    await loginParent(page);
    await page.getByTitle("Edit my profile").filter({ visible: true }).click();
    const dialog = page.getByRole("dialog", { name: "My profile" });
    const name = dialog.getByLabel("Name", { exact: true });
    await expect(name).toHaveValue(ADMIN.name);

    await name.fill("");
    await expect(dialog.getByRole("button", { name: "Save" })).toBeDisabled();
    await name.fill(ADMIN.name);
    await dialog.getByRole("button", { name: "Colour #22c55e" }).click();
    await dialog.getByRole("button", { name: "Save" }).click();
    await expect(page.getByText("Profile updated")).toBeVisible();
    const accent = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--accent").trim());
    expect(accent).toBe("#22c55e");

    // Put the default colour back for the other tests.
    await request.patch("/api/me", { data: { color: "#6366f1" } });
});

test("the parent login form works from the keyboard alone", async ({ page, request }) => {
    await ensureFamily(request);
    await page.goto("/login");
    await page.getByRole("button", { name: "Parent login" }).click();

    // The cursor starts in Username, Tab moves to Password, and Enter submits.
    await expect(page.getByLabel("Username")).toBeFocused();
    await page.keyboard.type(ADMIN.username);
    await page.keyboard.press("Tab");
    await expect(page.getByLabel("Password")).toBeFocused();
    await page.keyboard.type(ADMIN.password);
    await expect(page.getByLabel("Username")).toHaveValue(ADMIN.username);
    await page.keyboard.press("Shift+Tab");
    await expect(page.getByLabel("Username")).toBeFocused();
    await page.keyboard.press("Tab");
    await page.keyboard.press("Enter");
    await expect(page.getByRole("heading", { name: "Overview" })).toBeVisible();
});
