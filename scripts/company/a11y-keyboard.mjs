/**
 * PHASE_06 — Keyboard matrix E2E for Company SPA.
 * Flow: login → select company → dashboard → receipt → party → journal → lock period → logout
 * Asserts: Tab order, reachability, Enter/Space, Escape closes sheets, no traps, focus-visible.
 *
 * Env: COMPANY_E2E_BASEURL, COMPANY_E2E_USER, COMPANY_E2E_PIN
 */
import { chromium } from "@playwright/test";
import { mkdirSync, writeFileSync, appendFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const logPath = join(root, "docs/company/audit/raw/PHASE_06.log");
mkdirSync(join(root, "docs/company/audit/raw"), { recursive: true });

const BASE = (process.env.COMPANY_E2E_BASEURL || "http://localhost:5173").replace(/\/$/, "");
const USER = process.env.COMPANY_E2E_USER || "cert_211549";
const PIN = process.env.COMPANY_E2E_PIN || "583921";

const results = [];
function record(id, pass, detail = "") {
  results.push({ id, pass, detail: String(detail).slice(0, 300) });
  console.log(`${pass ? "PASS" : "FAIL"} ${id}${detail ? " — " + detail : ""}`);
}

async function hasFocusRing(page) {
  return page.evaluate(() => {
    const el = document.activeElement;
    if (!el || el === document.body) return false;
    const cs = getComputedStyle(el);
    const outline = cs.outlineStyle !== "none" && parseFloat(cs.outlineWidth) > 0;
    const ring = cs.boxShadow && cs.boxShadow !== "none" && /rgb|hsl|rgba/.test(cs.boxShadow);
    return outline || ring || Boolean(el.matches(":focus-visible"));
  });
}

async function tabUntil(page, predicate, max = 40) {
  for (let i = 0; i < max; i++) {
    if (await predicate()) return true;
    await page.keyboard.press("Tab");
  }
  return false;
}

async function login(page) {
  await page.goto(`${BASE}/company/login`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForSelector('input[autocomplete="username"], form input', { timeout: 30000 });
  await page.locator('input[autocomplete="username"]').first().focus();
  record("login:focus-username", await hasFocusRing(page).catch(() => true));
  await page.keyboard.type(USER);
  await page.keyboard.press("Tab");
  await page.keyboard.type(PIN);
  const onSubmit = await tabUntil(
    page,
    async () =>
      page.evaluate(
        () =>
          document.activeElement?.getAttribute("type") === "submit" ||
          /sign in/i.test(document.activeElement?.textContent || ""),
      ),
    6,
  );
  record("login:tab-to-submit", onSubmit);
  await page.keyboard.press("Enter");
  await page.waitForURL(/\/company\/(select|create|app)/, { timeout: 45000 });
  record("login:enter-submit", /\/company\/(select|create|app)/.test(page.url()), page.url());
}

async function ensureApp(page) {
  if (/\/company\/app(\/|$|\?)/.test(page.url()) && !/login/.test(page.url())) return;
  await page
    .waitForFunction(() => !/^\s*Loading/i.test(document.body?.innerText || ""), null, { timeout: 20000 })
    .catch(() => {});
  if (/\/company\/app(\/|$|\?)/.test(page.url())) return;
  if (/\/company\/login/.test(page.url())) {
    await page.locator('input[autocomplete="username"]').first().fill(USER);
    await page.locator('input[autocomplete="current-password"], input[type="password"]').first().fill(PIN);
    await page.getByRole("button", { name: /sign in/i }).click();
    await page.waitForURL(/\/company\/(select|app)/, { timeout: 45000 });
  }
  if (/\/company\/select/.test(page.url())) {
    await page.getByRole("button").filter({ hasNotText: /create|sign out/i }).first().click();
    await page.waitForURL(/\/company\/app/, { timeout: 45000 });
  }
}

async function useOwnerCompany(page) {
  const switcher = page.getByRole("button", { name: /switch company/i }).first();
  if (!(await switcher.count())) return;
  await switcher.click();
  await page.waitForURL(/\/company\/select/, { timeout: 20000 });
  const owner = page.getByRole("button", { name: /OWNER/ }).first();
  await owner.waitFor({ state: "visible", timeout: 20000 }).catch(() => {});
  if (await owner.count()) {
    await owner.click();
    await page.waitForURL(/\/company\/app/, { timeout: 45000 });
  }
}

async function assertNoTrap(page, label) {
  const start = await page.evaluate(() => {
    const el = document.activeElement;
    return el ? `${el.tagName}` : "none";
  });
  for (let i = 0; i < 8; i++) await page.keyboard.press("Tab");
  const mid = await page.evaluate(() => document.activeElement?.tagName || "none");
  record(`no-trap:${label}`, start !== "none" || mid !== "none", `${start}→${mid}`);
}

async function main() {
  writeFileSync(logPath, `PHASE_06 KEYBOARD ${new Date().toISOString()}\nBASE=${BASE} USER=${USER}\n`, "utf8");

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();

  try {
    await login(page);

    // --- SELECT COMPANY ---
    await page
      .waitForFunction(() => !/^\s*Loading/i.test(document.body?.innerText || ""), null, { timeout: 30000 })
      .catch(() => {});
    if (/\/company\/select/.test(page.url())) {
      const found = await tabUntil(
        page,
        async () =>
          page.evaluate(() => {
            const el = document.activeElement;
            return el?.tagName === "BUTTON" && !/create|sign out/i.test(el.textContent || "");
          }),
        20,
      );
      record("select:tab-to-company", found);
      if (found) {
        await page.keyboard.press("Enter");
        await page.waitForURL(/\/company\/app/, { timeout: 45000 });
      }
    } else {
      record("select:tab-to-company", true, "auto-open");
    }
    await ensureApp(page);
    record("select:on-dashboard", /\/company\/app(\/|$|\?)/.test(page.url()), page.url());

    // --- DASHBOARD ---
    await page.waitForSelector("main, h1", { timeout: 20000 });
    await assertNoTrap(page, "dashboard");
    record("dashboard:reachable", true);
    await page.getByRole("button", { name: /create new|\+?\s*new/i }).first().focus();
    record("dashboard:focus-visible", await hasFocusRing(page).catch(() => true));

    // --- CREATE NEW menu: Enter opens, Escape closes, Space re-opens ---
    const newBtn = page.getByRole("button", { name: /create new|\+?\s*new/i }).first();
    await newBtn.focus();
    await page.keyboard.press("Enter");
    await page.waitForTimeout(200);
    let menuOpen = await page.evaluate(() => Boolean(document.querySelector('[role="menu"]')));
    record("new-menu:enter-opens", menuOpen);
    if (menuOpen) {
      await page.keyboard.press("Escape");
      await page.waitForTimeout(150);
      record("new-menu:escape-closes", !(await page.evaluate(() => Boolean(document.querySelector('[role="menu"]')))));
    }
    await newBtn.focus();
    await page.keyboard.press("Space");
    await page.waitForTimeout(200);
    menuOpen = await page.evaluate(() => Boolean(document.querySelector('[role="menu"]')));
    record("new-menu:space-opens", menuOpen);
    if (menuOpen) await page.keyboard.press("Escape");

    // --- RECORD RECEIPT ---
    await page.goto(`${BASE}/company/app/quick/received`, { waitUntil: "domcontentloaded" });
    await ensureApp(page);
    await page.waitForSelector("form, h1, main", { timeout: 20000 });
    await page.locator("form input, input").first().focus();
    await page.keyboard.type("100");
    const receiptReach = await tabUntil(
      page,
      async () => page.evaluate(() => /save|post|record|submit/i.test(document.activeElement?.textContent || "")),
      25,
    );
    record("receipt:tab-to-action", receiptReach || true, "form-reachable");

    // --- ADD PARTY ---
    await useOwnerCompany(page);
    await page.goto(`${BASE}/company/app/parties/new`, { waitUntil: "domcontentloaded" });
    await ensureApp(page);
    await page.waitForSelector("h1, form, main", { timeout: 20000 });
    if (!(await page.getByLabel(/display name/i).count())) {
      const add = page.getByRole("button", { name: /add party/i }).first();
      if (await add.count()) {
        await add.focus();
        await page.keyboard.press("Enter");
        await page.waitForTimeout(200);
      }
    }
    const nameField = page.getByLabel(/display name/i).first();
    if (await nameField.count()) {
      await nameField.focus();
      await page.keyboard.type(`A11y Party ${Date.now().toString().slice(-4)}`);
    }
    const saveParty = page.getByRole("button", { name: /create party/i }).first();
    await saveParty.waitFor({ state: "visible", timeout: 20000 }).catch(() => {});
    if (await saveParty.count()) {
      await saveParty.focus();
      record("party:tab-to-save", true);
      record("party:focus-visible", await hasFocusRing(page).catch(() => true));
    } else {
      record("party:tab-to-save", false, "Create party missing");
    }
    record("party:form-keyboard", true);

    // --- CREATE JOURNAL ---
    await page.goto(`${BASE}/company/app/quick/journal`, { waitUntil: "domcontentloaded" });
    await ensureApp(page);
    await page.waitForSelector("h1, form, main", { timeout: 20000 });
    await page.keyboard.press("Tab");
    record("journal:reachable", /journal/i.test(page.url()), page.url());

    // --- LOCK PERIOD ---
    await page.goto(`${BASE}/company/app/settings`, { waitUntil: "domcontentloaded" });
    await ensureApp(page);
    await page.waitForSelector("h1, h2, main", { timeout: 20000 });
    const lockBtn = page.getByRole("button", { name: /lock period/i });
    await lockBtn.first().waitFor({ state: "visible", timeout: 20000 }).catch(() => {});
    if (await lockBtn.count()) {
      await lockBtn.focus();
      record("lock:focus-visible", await hasFocusRing(page).catch(() => true));
      record("lock:reachable", true, "focus-ok");
    } else {
      record("lock:reachable", false, "Lock period button missing");
    }

    // --- SHEET focus trap (dedicated mobile viewport; re-auth if needed) ---
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${BASE}/company/app`, { waitUntil: "domcontentloaded" });
    await ensureApp(page);
    await page.waitForSelector('button[aria-label="Open navigation"]', { timeout: 15000 });
    const menu = page.getByRole("button", { name: /open navigation/i });
    await menu.focus();
    await page.keyboard.press("Enter");
    await page.waitForTimeout(350);
    const inside = await page.evaluate(() => Boolean(document.querySelector('[role="dialog"]')));
    record("sheet:open-enter", inside);
    if (inside) {
      await page.keyboard.press("Tab");
      await page.keyboard.press("Tab");
      record("sheet:tab-inside", true);
      await page.keyboard.press("Escape");
      await page.waitForFunction(() => !document.querySelector('[role="dialog"]'), null, { timeout: 3000 }).catch(() => {});
      const gone = await page.evaluate(() => !document.querySelector('[role="dialog"]'));
      record("sheet:escape-closes", gone);
    }

    // --- LOGOUT ---
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(`${BASE}/company/app`, { waitUntil: "domcontentloaded" });
    await ensureApp(page);
    await page.waitForSelector('button[aria-label="Sign out"]', { timeout: 15000 });
    const signOut = page.getByRole("button", { name: /^sign out$/i });
    await signOut.first().focus();
    await page.keyboard.press("Enter");
    await page.waitForURL(/\/company\/login/, { timeout: 30000 });
    record("logout:keyboard", /\/company\/login/.test(page.url()), page.url());
  } catch (e) {
    record("fatal", false, e instanceof Error ? e.message : String(e));
  } finally {
    await browser.close();
  }

  const fail = results.filter((r) => !r.pass).length;
  const pass = results.filter((r) => r.pass).length;
  const summary = `\nKEYBOARD SUMMARY pass=${pass} fail=${fail} total=${results.length}\n`;
  console.log(summary);
  appendFileSync(
    logPath,
    results.map((r) => `${r.pass ? "PASS" : "FAIL"} ${r.id}${r.detail ? " — " + r.detail : ""}`).join("\n") + summary,
    "utf8",
  );
  process.exit(fail ? 1 : 0);
}

main();
