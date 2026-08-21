import { chromium } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const BASE = process.env.BASE_URL ?? "http://localhost:5173";
const ADMIN_PIN = process.env.ADMIN_PIN ?? "12345678";
const ARTIFACT_DIR = join(process.cwd(), "tests", "artifacts", "phase-00");
mkdirSync(ARTIFACT_DIR, { recursive: true });

const results = [];
const consoleRows = [];

function record(name, status, detail = "") {
  results.push({ name, status, detail });
  console.log(`${status === "PASS" ? "PASS" : status === "SKIP" ? "SKIP" : "FAIL"} ${name}${detail ? ` -- ${detail}` : ""}`);
}

function actionableConsoleErrors(rows) {
  return rows.filter((row) => {
    if (row.type !== "error") return false;
    if (/401 \(Unauthorized\)/i.test(row.text)) return false;
    if (/Download the React DevTools/i.test(row.text)) return false;
    return true;
  });
}

async function clearBrowserStorage(page) {
  await page.evaluate(async () => {
    localStorage.clear();
    sessionStorage.clear();
    const dbs = await indexedDB.databases?.() ?? [];
    await Promise.all(dbs.map((db) => db.name ? indexedDB.deleteDatabase(db.name) : undefined));
  });
}

async function signUp(page) {
  const stamp = Date.now().toString(36);
  await page.goto(BASE, { waitUntil: "networkidle" });
  await clearBrowserStorage(page);
  await page.reload({ waitUntil: "networkidle" });
  await page.screenshot({ path: join(ARTIFACT_DIR, "01-cloudauth.png"), fullPage: true });

  const authHeading = page.getByRole("heading", { name: /sign in to your account|create your account/i }).first();
  if (!(await authHeading.isVisible({ timeout: 8000 }).catch(() => false))) {
    throw new Error("CloudAuth did not render");
  }
  record("CloudAuth renders", "PASS");

  await page.getByRole("button", { name: /^create account$/i }).first().click();
  const inputs = page.locator("form input");
  await inputs.nth(0).fill("Phase Zero Tester");
  await inputs.nth(1).fill(`phase0_${stamp}`);
  await inputs.nth(2).fill("583921");
  await inputs.nth(3).fill("583921");
  await page.locator("form button[type='submit']").first().click();
  await page.waitForSelector("aside", { timeout: 15000 });
  await page.screenshot({ path: join(ARTIFACT_DIR, "02-user-dashboard.png"), fullPage: true });
  record("User signup reaches dashboard", "PASS");
}

async function clickSidebar(page, label, options = {}) {
  const exact = options.exact ?? label;
  const button = page.locator("aside button").filter({ hasText: new RegExp(`^\\s*${exact}\\s*$`, "i") }).first();
  if (!(await button.isVisible({ timeout: 2000 }).catch(() => false))) {
    return false;
  }
  await button.click();
  await page.waitForTimeout(350);
  return true;
}

async function verifyUserPages(page) {
  const pages = [
    ["Dashboard", "Dashboard"],
    ["Transactions", "Transactions"],
    ["Accounts", "Accounts"],
    ["Cards", "Cards"],
    ["Loans", "Loans & EMI"],
    ["Udhari", "Udhari & Advances"],
    ["Goals", "Goals"],
    ["Budgets", "Budgets"],
    ["Reports", "Reports"],
    ["Suggestions", "Suggestions"],
    ["Export", "Export Center"],
    ["Import", "Import Center"],
    ["Settings", "Settings"],
    ["Profile", "Profile & Security"],
    ["Audit", "Audit & Backup"],
  ];

  for (const [name, label] of pages) {
    const opened = await clickSidebar(page, name, { exact: label });
    if (!opened) {
      record(`${name} page`, "FAIL", `sidebar item ${label} not visible`);
      continue;
    }
    const h1Count = await page.locator("h1").count();
    if (h1Count > 0) record(`${name} page`, "PASS");
    else record(`${name} page`, "FAIL", "no h1 rendered");
  }

  const subscriptionVisible = await page.locator("aside button").filter({ hasText: /^\s*Subscription\s*$/i }).first().isVisible({ timeout: 1000 }).catch(() => false);
  if (subscriptionVisible) {
    await clickSidebar(page, "Subscription");
    record("Subscription page", (await page.locator("h1").count()) > 0 ? "PASS" : "FAIL");
  } else {
    record("Subscription page", "SKIP", "VITE_ENABLE_RAZORPAY=false hides billing nav");
  }

  await page.screenshot({ path: join(ARTIFACT_DIR, "03-user-pages-final.png"), fullPage: true });
}

async function verifyAdminPages(browser) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  page.on("console", (msg) => consoleRows.push({ area: "admin", type: msg.type(), text: msg.text() }));
  page.on("pageerror", (err) => consoleRows.push({ area: "admin", type: "pageerror", text: err.message }));

  await page.goto(`${BASE}/admin`, { waitUntil: "networkidle" });
  const heading = page.getByRole("heading", { name: /admin login/i }).first();
  if (!(await heading.isVisible({ timeout: 8000 }).catch(() => false))) {
    record("Admin login screen", "FAIL", "not visible");
    await context.close();
    return;
  }
  record("Admin login screen", "PASS");
  const inputs = page.locator("form input");
  await inputs.nth(0).fill("admin");
  await inputs.nth(1).fill(ADMIN_PIN);
  await page.getByRole("button", { name: /sign in to admin/i }).click();
  await page.waitForSelector("aside", { timeout: 15000 });
  await page.screenshot({ path: join(ARTIFACT_DIR, "04-admin-dashboard.png"), fullPage: true });
  record("Admin login", "PASS");

  const adminPages = ["Dashboard", "Users", "Plans", "Feature Flags", "Branding"];
  for (const label of adminPages) {
    const opened = await clickSidebar(page, label);
    if (!opened) {
      record(`Admin ${label}`, "FAIL", "nav item not visible");
      continue;
    }
    record(`Admin ${label}`, (await page.locator("h1").count()) > 0 ? "PASS" : "FAIL");
  }
  const subVisible = await page.locator("aside button").filter({ hasText: /^\s*Subscriptions\s*$/i }).first().isVisible({ timeout: 1000 }).catch(() => false);
  if (subVisible) {
    await clickSidebar(page, "Subscriptions");
    record("Admin Subscriptions", (await page.locator("h1").count()) > 0 ? "PASS" : "FAIL");
  } else {
    record("Admin Subscriptions", "SKIP", "VITE_ENABLE_RAZORPAY=false hides billing nav");
  }
  await context.close();
}

const browser = await chromium.launch({ headless: true });
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  page.on("console", (msg) => consoleRows.push({ area: "user", type: msg.type(), text: msg.text() }));
  page.on("pageerror", (err) => consoleRows.push({ area: "user", type: "pageerror", text: err.message }));
  await signUp(page);
  await verifyUserPages(page);
  await context.close();
  await verifyAdminPages(browser);
} finally {
  await browser.close();
}

const errors = actionableConsoleErrors(consoleRows);
if (errors.length === 0) record("Browser console fatal errors", "PASS", "none");
else record("Browser console fatal errors", "FAIL", errors.map((e) => `[${e.area}] ${e.text}`).slice(0, 5).join(" | "));

writeFileSync(join(ARTIFACT_DIR, "browser-console.log"), consoleRows.map((row) => `[${row.area}] ${row.type}: ${row.text}`).join("\n"), "utf8");
writeFileSync(join(ARTIFACT_DIR, "browser-results.json"), JSON.stringify({ results, consoleRows, errors }, null, 2), "utf8");

const failed = results.filter((r) => r.status === "FAIL");
console.log(`PHASE00_BROWSER_RESULTS ${results.length - failed.length}/${results.length} non-failing, ${failed.length} failed`);
process.exit(failed.length === 0 ? 0 : 1);
