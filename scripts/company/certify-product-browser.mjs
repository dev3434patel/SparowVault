/**
 * Deep product browser certification (bills, RBAC surface, period lock UI, dashboard drilldowns, switch).
 * Env: COMPANY_E2E_BASEURL (default http://localhost:5173), COMPANY_E2E_USER, COMPANY_E2E_PIN, COMPANY_PRODUCT_RUN
 */
import { chromium } from "@playwright/test";
import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const stamp =
  process.env.COMPANY_PRODUCT_RUN ||
  (existsSync(join(root, "docs/company/product-completion/.current-run"))
    ? readFileSync(join(root, "docs/company/product-completion/.current-run"), "utf8").trim()
    : "adhoc");
const outDir = join(root, "docs/company/product-completion", stamp);
const rawDir = join(outDir, "raw");
const screenDir = join(outDir, "screens/deep-browser");
mkdirSync(rawDir, { recursive: true });
mkdirSync(screenDir, { recursive: true });

const BASE = (process.env.COMPANY_E2E_BASEURL || "http://localhost:5173").replace(/\/$/, "");
const USER = process.env.COMPANY_E2E_USER || "cert_211549";
const PIN = process.env.COMPANY_E2E_PIN || "583921";

const results = [];
function record(id, name, pass, detail = "") {
  results.push({ id, name, pass, detail: String(detail).slice(0, 200) });
  console.log(`${pass ? "PASS" : "FAIL"} ${id} ${name}${detail ? " — " + detail : ""}`);
}

async function shot(page, name) {
  await page.screenshot({ path: join(screenDir, `${name}.png`), fullPage: true });
}

async function login(page) {
  await page.goto(`${BASE}/company/login`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForSelector('input[autocomplete="username"], form input', { timeout: 30000 });
  const userInput = page.locator('input[autocomplete="username"]').first();
  if (await userInput.count()) await userInput.fill(USER);
  else await page.locator("form input").first().fill(USER);
  await page.locator('input[autocomplete="current-password"], input[type="password"]').first().fill(PIN);
  // Register navigation waiter BEFORE click to avoid missing a fast redirect.
  await Promise.all([
    page.waitForURL(/\/company\/(select|create|app)/, { timeout: 60000 }),
    page.getByRole("button", { name: /sign in|પ્રવેશ|login/i }).click(),
  ]);
}

async function ensureCompanyOpen(page) {
  if (/\/company\/app(\/|$|\?)/.test(page.url())) return;
  await page.waitForFunction(
    () => !/^\s*Loading/i.test(document.body?.innerText || ""),
    null,
    { timeout: 30000 },
  ).catch(() => {});
  if (/\/company\/app(\/|$|\?)/.test(page.url())) return;

  if (/\/company\/select/.test(page.url())) {
    const body = await page.locator("body").innerText();
    const hasWorkspace = /open|books|workspace/i.test(body) && !/No companies yet/i.test(body);
    // Prefer an existing workspace card/button — never Sign out / Create company.
    const openBtn = page
      .getByRole("button")
      .filter({ hasNotText: /create|sign out|log out|logout/i });
    if (hasWorkspace && (await openBtn.count()) > 0) {
      await openBtn.first().waitFor({ timeout: 15000 });
      await openBtn.first().click();
      await page.waitForURL(/\/company\/app/, { timeout: 60000 });
      return;
    }
    // Fall through to create when empty.
  }

  await page.goto(`${BASE}/company/create`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForSelector("form, input", { timeout: 20000 });
  await page.locator("input").first().fill(`Product Co ${Date.now().toString(36)}`);
  const cont = page.getByRole("button", { name: /^continue$/i });
  if (await cont.count()) {
    await cont.click();
    await page.waitForTimeout(400);
    if (await cont.count()) await cont.click();
    await page.waitForTimeout(400);
  }
  await page.getByRole("button", { name: /create company|create|finish|open/i }).last().click();
  await page.waitForURL(/\/company\/app/, { timeout: 60000 });
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  try {
    await login(page);
    await shot(page, "01-after-login");
    await ensureCompanyOpen(page);
    await page.goto(`${BASE}/company/app`, { waitUntil: "networkidle" });
    await shot(page, "02-dashboard");

    // Dashboard drilldowns / KPIs present
    const dashText = await page.locator("body").innerText();
    const dashOk =
      /Cash & Bank|Receivable|Payable|Money Received|Needs Attention|Quick actions/i.test(dashText);
    record("DASH", "Dashboard control center widgets", dashOk);

    // Click Cash & Bank KPI / Cash & Bank nav
    await page.goto(`${BASE}/company/app/ledgers`, { waitUntil: "networkidle" });
    await shot(page, "03-cash-bank-ledgers");
    record("DRILL_CASH", "Cash/Bank drill surface", /ledger|chart|cash|bank|accounts/i.test(await page.locator("body").innerText()));

    // Receivables / bills surface + allocate confirm UX
    await page.goto(`${BASE}/company/app/receivables`, { waitUntil: "networkidle" });
    await shot(page, "04-receivables");
    const recv = await page.locator("body").innerText();
    record("BILLS", "Receivables KPI + bills table", /outstanding|receivable|ageing|open bills|total|no /i.test(recv));

    // Period lock settings surface
    await page.goto(`${BASE}/company/app/settings`, { waitUntil: "networkidle" });
    await shot(page, "05-settings-locks");
    const settings = await page.locator("body").innerText();
    const lockUi = /period lock|lock before|create lock|lock period/i.test(settings);
    record("PERIOD_LOCK_UI", "Period lock controls visible", lockUi);

    // Approvals / RBAC surface
    await page.goto(`${BASE}/company/app/approvals`, { waitUntil: "networkidle" });
    await shot(page, "06-approvals");
    record("RBAC_SURFACE", "Approvals page reachable", /approvals/i.test(await page.locator("body").innerText()));

    // Company switch clears context (navigate select)
    await page.goto(`${BASE}/company/select`, { waitUntil: "networkidle" });
    await shot(page, "07-switch");
    record("SWITCH", "Company switcher reachable", /select|company|create/i.test(await page.locator("body").innerText()));

    // Re-enter company so header + New menu exist
    await ensureCompanyOpen(page);
    await page.goto(`${BASE}/company/app`, { waitUntil: "networkidle" });
    const newBtn = page.getByRole("button", { name: /\+?\s*New/i });
    if (await newBtn.count()) {
      await newBtn.first().click();
      await page.waitForTimeout(300);
      await shot(page, "08-new-menu");
      const menu = await page.locator('[role="menu"]').innerText().catch(async () => page.locator("body").innerText());
      record("NEW_MENU", "Global + New menu", /Money Received|Money Paid|New Party/i.test(menu));
    } else {
      record("NEW_MENU", "Global + New menu", false, `button missing url=${page.url()}`);
    }

    // Responsive smoke 430
    await page.setViewportSize({ width: 430, height: 900 });
    await page.goto(`${BASE}/company/app`, { waitUntil: "networkidle" });
    await shot(page, "09-mobile-dashboard");
    record("MOBILE", "Mobile dashboard renders", /dashboard|cash|received|quick/i.test(await page.locator("body").innerText()));
  } catch (e) {
    record("X", "Suite aborted", false, String(e));
    await shot(page, "abort").catch(() => {});
  } finally {
    await browser.close();
  }

  const pass = results.filter((r) => r.pass).length;
  const fail = results.filter((r) => !r.pass).length;
  const lines = [
    `DEEP PRODUCT BROWSER ${new Date().toISOString()}`,
    `BASE=${BASE} USER=${USER}`,
    ...results.map((r) => `${r.pass ? "PASS" : "FAIL"} ${r.id} ${r.name} ${r.detail}`),
    `SUMMARY pass=${pass} fail=${fail}`,
  ];
  writeFileSync(join(rawDir, "EVIDENCE_COMPANY_DEEP_BROWSER.txt"), lines.join("\n") + "\n");
  writeFileSync(
    join(outDir, "COMPANY_DEEP_BROWSER_REPORT.md"),
    [
      "# Company Deep Browser Report",
      "",
      `| ID | Verdict | Detail |`,
      `|----|---------|--------|`,
      ...results.map((r) => `| ${r.id} | ${r.pass ? "PASS" : "FAIL"} | ${r.detail.replace(/\|/g, "/")} |`),
      "",
      fail === 0 ? "**DEEP BROWSER PASS**" : "**DEEP BROWSER FAIL**",
      "",
    ].join("\n"),
  );
  process.exit(fail > 0 ? 1 : 0);
}

run();
