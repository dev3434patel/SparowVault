import assert from "node:assert/strict";
import { chromium, expect } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";

export async function testModuleWorkflows({ frontend, base, auth, db, check: recordCheck, directory }) {
  await mkdir(`${directory}/screenshots`, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, timezoneId: "Asia/Kolkata" });
  await context.route("**/*", route => [new URL(frontend).origin, new URL(base).origin].includes(new URL(route.request().url()).origin) ? route.continue() : route.abort());
  const page = await context.newPage(); page.setDefaultTimeout(12000);
  const outcomes = [], errors = [];
  page.on("pageerror", error => errors.push(error.message));
  async function navigate(path) {
    await page.goto(frontend + path, { waitUntil: "networkidle" });
    await expect(page.getByRole("button", { name: "Upload bank statement", exact: true })).toBeVisible();
    await expect(page.locator("main h1")).toBeVisible();
  }
  const field = (scope, prefix) => scope.locator("label").filter({ hasText: new RegExp(`^${prefix}`) }).first().locator("..");
  const input = (scope, prefix) => field(scope, prefix).locator("input");
  const dialog = () => page.getByRole("dialog");
  async function stored(collection) {
    const [rows] = await db.query("SELECT payload FROM cloud_collection_rows WHERE user_id=? AND collection_name=? AND deleted_at IS NULL", [auth.user.id, collection]);
    return rows.map(row => JSON.parse(row.payload));
  }
  const check = (name, run) => recordCheck(`module workflow: ${name}`, async () => {
    const before = errors.length;
    try { await run(); assert.equal(errors.length, before, errors.slice(before).join("; ")); outcomes.push({ name, pass: true }); }
    catch (error) {
      outcomes.push({ name, pass: false, error: error.message, dialogText: await dialog().innerText().catch(() => "") });
      await page.screenshot({ path: `${directory}/screenshots/failed-${name.replace(/[^a-z0-9]+/gi, "-")}.png` }).catch(() => undefined);
      throw error;
    }
  });
  async function saveDialog(path) {
    await dialog().getByRole("button", { name: "Save", exact: true }).click();
    await expect(dialog()).toHaveCount(0); await navigate(path);
  }
  try {
    await page.goto(frontend, { waitUntil: "networkidle" });
    await page.locator("input").first().fill(auth.user.username); await page.locator('input[type="password"]').fill("583921");
    await page.locator('form button[type="submit"]').click();
    await expect(page.getByRole("button", { name: "Upload bank statement", exact: true })).toBeVisible();
    await check("category creation survives reload", async () => {
      await navigate("/categories"); await page.getByRole("button", { name: "New Category", exact: true }).click();
      await input(dialog(), "Name").fill("UI groceries"); await saveDialog("/categories");
      assert.ok((await stored("categories")).some(row => row.name === "UI groceries"));
      await expect(page.getByText("UI groceries", { exact: true })).toBeVisible();
    });
    await check("monthly budget persists amount and category", async () => {
      await navigate("/budgets"); await page.getByRole("button", { name: "New Budget", exact: true }).click();
      await field(dialog(), "Category").getByRole("combobox").click(); await page.getByRole("option", { name: /Test category/ }).click();
      await input(dialog(), "Amount").fill("3000.25"); await saveDialog("/budgets");
      const row = (await stored("budgets")).find(row => row.categoryId === "category"); assert.ok(row); assert.equal(row.amount, 3000.25);
    });
    await check("goal creation and a contribution persist together", async () => {
      await navigate("/goals"); await page.getByRole("button", { name: "New Goal", exact: true }).first().click();
      await input(dialog(), "Title").fill("UI reserve"); await input(dialog(), "Target amount").fill("10000");
      await input(dialog(), "Target date").fill("2027-09-01"); await saveDialog("/goals");
      await page.getByRole("button", { name: "Contribute", exact: true }).click(); await dialog().locator('input[type="number"]').fill("200.50");
      await dialog().getByRole("button", { name: /Add contribution/i }).click();
      await expect(dialog()).toHaveCount(0); await navigate("/goals");
      const goal = (await stored("goals")).find(row => row.title === "UI reserve"); assert.ok(goal);
      assert.equal(goal.currentSaved, 200.5); assert.equal((await stored("goalContribs")).filter(row => row.goalId === goal.id).length, 1);
    });
    await check("credit card creation retains limit and statement/due days", async () => {
      await navigate("/cards"); await page.getByRole("button", { name: "New Card", exact: true }).click();
      await input(dialog(), "Nickname").fill("UI test card"); await input(dialog(), "Last 4").fill("1234");
      await input(dialog(), "Credit limit").fill("50000"); await input(dialog(), "Statement day").fill("10"); await input(dialog(), "Due day").fill("25");
      await saveDialog("/cards"); const card = (await stored("cards")).find(row => row.nickname === "UI test card");
      assert.equal(card.creditLimitPaise, 5000000); assert.equal(card.statementDay, 10); assert.equal(card.dueDay, 25);
    });
    await check("new loan creates durable principal and twelve EMI rows", async () => {
      await navigate("/loans"); await page.getByRole("button", { name: "New Loan", exact: true }).click();
      await input(dialog(), "Lender").fill("UI loan lender"); await input(dialog(), "Principal").fill("12000");
      await input(dialog(), "Disbursed amount").fill("12000"); await input(dialog(), "Tenure").fill("12"); await input(dialog(), "Interest %").fill("12");
      await saveDialog("/loans"); const loan = (await stored("loans")).find(row => row.lender === "UI loan lender"); assert.ok(loan);
      assert.equal(loan.principalPaise, 1200000); assert.equal((await stored("emis")).filter(row => row.loanId === loan.id).length, 12);
    });
    await check("Udhari receivable creation and partial settlement persist", async () => {
      await navigate("/udhari"); await page.getByRole("button", { name: "New Entry", exact: true }).click();
      await input(dialog(), "Person").fill("UI friend"); await input(dialog(), "Amount").fill("400");
      await saveDialog("/udhari"); await page.getByTitle("Settle with cash", { exact: true }).click();
      await field(dialog(), "Account").getByRole("combobox").click(); await page.getByRole("option", { name: /Test cash/ }).click();
      await input(dialog(), "Amount to settle").fill("200"); await dialog().getByRole("button", { name: /Record settlement|Settle/i }).last().click();
      await expect(dialog()).toHaveCount(0); await navigate("/udhari");
      const row = (await stored("udhari")).find(row => row.personName === "UI friend"); assert.equal(row.amountSettled, 200);
      assert.equal((await stored("udhariSettlements")).filter(s => s.udhariId === row.id).length, 1);
    });
    await check("FD creation persists principal and dates", async () => {
      await navigate("/savings"); await page.getByRole("tab", { name: "FD / RD", exact: true }).click(); const section = page.locator("div.rounded-xl").filter({ has: page.getByText("Add FD/RD", { exact: false }) }).last();
      await input(section, "Name").fill("UI fixed deposit"); await input(section, "Principal").fill("25000"); await input(section, "Maturity date").fill("2027-09-11");
      await section.getByRole("button", { name: "Save", exact: true }).click();
      await expect.poll(async () => (await stored("fixedIncomeAssets")).some(row => row.name === "UI fixed deposit")).toBe(true);
      await navigate("/savings"); await page.getByRole("tab", { name: "FD / RD", exact: true }).click(); await expect(page.getByText("UI fixed deposit", { exact: false }).first()).toBeVisible();
    });
    await check("insurance policy creation persists premium and coverage", async () => {
      await navigate("/savings"); await page.getByRole("tab", { name: "Insurance", exact: true }).click(); const section = page.locator("div.rounded-xl").filter({ has: page.getByText("Add insurance policy", { exact: true }) }).last();
      await input(section, "Policy name").fill("UI policy"); await input(section, "Insurer").fill("Audit insurer"); await input(section, "Premium").fill("1000"); await input(section, "Coverage").fill("100000");
      await section.getByRole("button", { name: "Save", exact: true }).click();
      await expect.poll(async () => (await stored("insurancePolicies")).length).toBe(1); await navigate("/savings");
    });
    await check("asset valuation persists as a valuation rather than income", async () => {
      await navigate("/savings"); await page.getByRole("tab", { name: "Valuations", exact: true }).click(); const section = page.getByPlaceholder("Gold jewellery").locator("xpath=ancestor::div[contains(@class,'rounded-xl')][1]");
      await input(section, "Label").fill("UI valuation"); await input(section, "Value").fill("30000"); const before = (await stored("transactions")).length;
      await section.getByRole("button", { name: "Save", exact: true }).click();
      await expect.poll(async () => (await stored("assetValuations")).length).toBe(1); assert.equal((await stored("transactions")).length, before);
    });
    await check("household and named partner survive reload", async () => {
      await navigate("/household"); await page.getByPlaceholder("Home", { exact: true }).fill("UI household"); await page.getByRole("button", { name: "Create", exact: true }).click();
      await expect(page.getByRole("button", { name: "Add member", exact: true })).toBeVisible();
      await input(page.locator("main"), "Add partner").fill("UI partner"); await page.getByRole("button", { name: "Add member", exact: true }).click();
      await expect(page.getByText("UI partner", { exact: true })).toBeVisible(); await navigate("/household");
      assert.equal((await stored("households")).length, 1); assert.equal((await stored("householdMembers")).length, 2);
    });
    await check("settings save persists without page error", async () => {
      await navigate("/settings"); await page.getByRole("button", { name: "Save changes", exact: true }).click();
      await expect(page.getByText("Settings saved", { exact: true }).first()).toBeVisible(); assert.equal((await stored("settings")).length, 1);
    });
    for (const route of ["/cards", "/loans", "/udhari", "/goals", "/savings", "/household"]) await check(`populated mobile ${route} renders at 390px`, async () => {
      await page.setViewportSize({ width: 390, height: 844 }); await navigate(route);
      await page.screenshot({ path: `${directory}/screenshots/populated-${route.slice(1)}-390.png` });
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    });
    await check("clean profile wipe handles existing transaction references", async () => {
      await page.setViewportSize({ width: 1440, height: 1000 }); await navigate("/settings");
      await page.getByRole("button", { name: "Wipe all profile data", exact: true }).click();
      await page.getByPlaceholder(`DELETE ${auth.user.username}`).fill(`DELETE ${auth.user.username}`);
      const response = page.waitForResponse(r => r.request().method() === "DELETE" && r.url().includes("/api/data/"));
      await page.getByRole("button", { name: "Delete all data", exact: true }).click();
      const result = await response;
      const [rows] = await db.query("SELECT COUNT(*) n FROM cloud_collection_rows WHERE user_id=? AND deleted_at IS NULL", [auth.user.id]);
      outcomes.push({ name: "clean-wipe-response", status: result.status(), remainingRows: Number(rows[0].n) });
      assert.equal(result.status(), 200, "Profile wipe fails while deleting accounts before referenced transactions");
    });
  } finally {
    await writeFile(`${directory}/module-workflows.json`, JSON.stringify({ date: new Date().toISOString(), outcomes, errors }, null, 2));
    await browser.close();
  }
}
