import assert from "node:assert/strict";
import { mkdtemp, rm, mkdir, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chromium, expect } from "@playwright/test";

export async function testDurableBrowser({ frontend, username, pin, check, evidenceDirectory = "docs/implementation-evidence/2026-09-10" }) {
  const directory = `${evidenceDirectory}/screenshots`;
  await mkdir(directory, { recursive: true });
  const profile = await mkdtemp(join(tmpdir(), "sparow-outbox-browser-"));
  let context;
  let page;
  const errors = [];
  const failures = [];
  const launch = async () => {
    context = await chromium.launchPersistentContext(profile, { headless: true, viewport: { width: 1440, height: 900 } });
    page = context.pages()[0] || await context.newPage();
    page.setDefaultTimeout(15000);
    page.on("pageerror", error => errors.push(error.message));
    page.on("response", async response => {
      if (response.url().includes("/api/") && response.status() >= 400) {
        failures.push({ path: new URL(response.url()).pathname, status: response.status(), body: (await response.text().catch(() => "")).slice(0, 300) });
      }
    });
  };
  const blockCreates = async () => context.route("**/api/data/entity.php?collection=accounts", async route => {
    if (route.request().method() === "POST") await route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ ok: false, error: "Simulated service outage" }) });
    else await route.continue();
  });
  try {
    await launch();
    await page.goto(frontend, { waitUntil: "networkidle" });
    await page.locator("input").first().fill(username);
    await page.locator('input[type="password"]').fill(pin);
    await page.locator('form button[type="submit"]').click();
    await page.locator("aside").waitFor();
    await page.waitForLoadState("networkidle");
    await page.goto(frontend + "/accounts", { waitUntil: "networkidle" });
    assert.ok(await page.evaluate(() => !!localStorage.getItem("sv:session")), JSON.stringify({ failures, cookies: (await context.cookies()).map(cookie => ({ name: cookie.name, secure: cookie.secure, domain: cookie.domain })), body: (await page.locator("body").innerText()).slice(0, 600) }));
    await check("browser: real account form creates a durable server record", async () => {
      await page.locator("main").getByRole("button", { name: "New Account", exact: true }).first().click();
      await page.getByPlaceholder("HDFC Savings").fill("Integrity UI Account");
      await page.getByRole("dialog").getByRole("button", { name: "Save", exact: true }).click();
      await expect(page.getByText("Integrity UI Account", { exact: true }).first()).toBeVisible();
      const found = await page.evaluate(async () => {
        const { accountRepo } = await import("/src/repositories/index.ts");
        const session = JSON.parse(localStorage.getItem("sv:session"));
        return (await accountRepo.list(session.userId)).some(row => row.name === "Integrity UI Account");
      });
      assert.ok(found);
    });
    await blockCreates();
    let entityId;
    await check("browser: a 503 create survives cloud refresh with a replayable payload", async () => {
      const result = await page.evaluate(async () => {
        const { accountRepo } = await import("/src/repositories/index.ts");
        const { getDB } = await import("/src/db/database.ts");
        const session = JSON.parse(localStorage.getItem("sv:session"));
        const entity = await accountRepo.create({ userId: session.userId, data: { name: "Pending Browser Account", type: "cash", openingBalance: 0, color: "#22c55e", icon: "wallet", isInactive: 0 } });
        await accountRepo.list(session.userId);
        const mutation = (await getDB().syncMutations.toArray()).find(row => row.entityId === entity.id);
        return { entityId: entity.id, local: !!await getDB().accounts.get(entity.id), payload: mutation?.payload, state: mutation?.state };
      });
      entityId = result.entityId;
      assert.ok(result.local); assert.equal(result.state, "pending"); assert.equal(result.payload.name, "Pending Browser Account");
    });
    await check("browser: sync review renders without overflow at desktop and mobile sizes", async () => {
      await page.getByRole("button", { name: /pending changes$/ }).first().click();
      await expect(page.getByRole("dialog").getByText("Pending Changes", { exact: true })).toBeVisible();
      for (const width of [1440, 768, 390, 360]) {
        await page.setViewportSize({ width, height: width <= 390 ? 844 : 900 });
        const metrics = await page.getByRole("dialog").evaluate(element => ({ client: element.clientWidth, scroll: element.scrollWidth, rect: element.getBoundingClientRect().toJSON() }));
        assert.ok(metrics.scroll <= metrics.client + 1, `Dialog overflows at ${width}`);
        assert.ok(metrics.rect.left >= 0 && metrics.rect.right <= width);
        await page.screenshot({ path: `${directory}/sync-pending-${width}.png` });
      }
      await page.keyboard.press("Escape");
    });
    await context.close();
    await launch();
    await blockCreates();
    await page.goto(frontend, { waitUntil: "networkidle" });
    await page.locator("aside").waitFor();
    await check("browser: actual browser process restart preserves IndexedDB payload", async () => {
      assert.ok(entityId, "The create test did not produce an entity");
      const result = await page.evaluate(async id => {
        const { getDB } = await import("/src/db/database.ts");
        return { local: !!await getDB().accounts.get(id), queued: (await getDB().syncMutations.toArray()).some(row => row.entityId === id && row.payload.name === "Pending Browser Account") };
      }, entityId);
      assert.deepEqual(result, { local: true, queued: true });
    });
    const secondTab = await context.newPage();
    secondTab.on("pageerror", error => errors.push(error.message));
    await secondTab.goto(frontend, { waitUntil: "networkidle" });
    await expect(secondTab.locator("aside")).toBeVisible();
    await context.unrouteAll({ behavior: "wait" });
    await page.evaluate(() => window.dispatchEvent(new Event("online")));
    await secondTab.evaluate(() => window.dispatchEvent(new Event("online")));
    await check("browser: two-tab reconnect drains queue and persists exactly one server row", async () => {
      await expect.poll(async () => page.evaluate(async id => {
        const { getDB } = await import("/src/db/database.ts");
        return (await getDB().syncMutations.toArray()).filter(row => row.entityId === id).length;
      }, entityId)).toBe(0);
      const matches = await page.evaluate(async id => {
        const { cloudRepoList } = await import("/src/lib/cloud/repoClient.ts");
        const session = JSON.parse(localStorage.getItem("sv:session"));
        return (await cloudRepoList("accounts", session.userId)).filter(row => row.id === id).length;
      }, entityId);
      assert.equal(matches, 1);
    });
    await secondTab.close();
    await check("browser: validation rejection opens actionable sync review", async () => {
      await context.route("**/api/data/entity.php?collection=accounts", async route => {
        if (route.request().method() === "POST") await route.fulfill({ status: 422, contentType: "application/json", body: JSON.stringify({ ok: false, error: "Fixture validation rejected", code: "VALIDATION_ERROR" }) });
        else await route.continue();
      });
      const result = await page.evaluate(async () => {
        const { accountRepo } = await import("/src/repositories/index.ts");
        const session = JSON.parse(localStorage.getItem("sv:session"));
        try { await accountRepo.create({ userId: session.userId, data: { name: "Rejected Browser Account", type: "cash", openingBalance: 0, color: "#22c55e", icon: "wallet", isInactive: 0 } }); return "accepted"; }
        catch (error) { return error.message; }
      });
      assert.equal(result, "Fixture validation rejected");
      await page.getByRole("button", { name: /pending changes$/ }).first().click();
      await expect(page.getByText("Fixture validation rejected", { exact: true })).toBeVisible();
      await expect(page.getByRole("button", { name: "Use server version", exact: true })).toBeVisible();
      await page.screenshot({ path: `${directory}/sync-rejected-desktop.png` });
    });
    await check("browser: pending-change download contains the recoverable rejected payload", async () => {
      const event = page.waitForEvent("download");
      await page.getByRole("button", { name: "Download pending changes", exact: true }).click();
      const download = await event;
      const file = await download.path();
      const artifact = JSON.parse(await readFile(file, "utf8"));
      assert.equal(artifact.version, 2);
      assert.ok(artifact.mutations.some(item => item.state === "rejected" && item.payload.name === "Rejected Browser Account"));
    });
    await check("browser: confirmed server-version resolution clears a rejected queue item", async () => {
      await page.getByRole("button", { name: "Use server version", exact: true }).click();
      const confirm = page.getByRole("dialog").filter({ hasText: "Discard local changes?" });
      await expect(confirm).toBeVisible();
      await confirm.getByRole("button", { name: "Use server version", exact: true }).click();
      await expect(page.getByText("No pending changes", { exact: true })).toBeVisible();
      assert.equal(await page.evaluate(async () => {
        const { getDB } = await import("/src/db/database.ts");
        return getDB().syncMutations.count();
      }), 0);
    });
    await check("browser: no uncaught application errors during durability workflows", async () => assert.deepEqual(errors, []));
  } finally {
    if (context) await context.close();
    await rm(profile, { recursive: true, force: true });
  }
}
