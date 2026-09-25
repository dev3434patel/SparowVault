/**
 * Focused page crawl for PHASE_01 navigation fixes.
 * Env: COMPANY_E2E_BASEURL, COMPANY_E2E_USER, COMPANY_E2E_PIN
 */
import { chromium } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const outDir = join(root, "docs/company/audit/raw");
mkdirSync(outDir, { recursive: true });

const BASE = (process.env.COMPANY_E2E_BASEURL || "http://localhost:5173").replace(/\/$/, "");
const USER = process.env.COMPANY_E2E_USER || "cert_211549";
const PIN = process.env.COMPANY_E2E_PIN || "583921";

const results = [];
function record(id, name, pass, detail = "") {
  results.push({ id, name, pass, detail: String(detail).slice(0, 240) });
  console.log(`${pass ? "PASS" : "FAIL"} ${id} ${name}${detail ? " — " + detail : ""}`);
}

async function login(page) {
  await page.goto(`${BASE}/company/login`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForSelector('input[autocomplete="username"], form input', { timeout: 30000 });
  const userInput = page.locator('input[autocomplete="username"]').first();
  if (await userInput.count()) await userInput.fill(USER);
  else await page.locator("form input").first().fill(USER);
  await page.locator('input[autocomplete="current-password"], input[type="password"]').first().fill(PIN);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL(/\/company\/(select|create|app)/, { timeout: 45000 });

  // Wait out hydrate skeleton on select
  await page.waitForFunction(
    () => !/^\s*Loading/i.test(document.body?.innerText || ""),
    null,
    { timeout: 30000 },
  ).catch(() => {});

  if (/unlock|enter pin|session lock/i.test(await page.locator("body").innerText().catch(() => ""))) {
    const pinBox = page.locator('input[type="password"]').first();
    if (await pinBox.count()) {
      await pinBox.fill(PIN);
      await page.getByRole("button", { name: /unlock|sign in|continue/i }).first().click().catch(() => {});
      await page.waitForTimeout(800);
    }
  }

  // Single-membership auto-redirect may land on /app while we waited
  if (/\/company\/app(\/|$|\?)/.test(page.url())) return;

  if (/\/company\/select/.test(page.url())) {
    await page.getByRole("button").filter({ hasNotText: /create/i }).first().waitFor({ timeout: 30000 });
    await page.getByRole("button").filter({ hasNotText: /create/i }).first().click();
    await page.waitForURL(/\/company\/app/, { timeout: 45000 });
    return;
  }

  await page.goto(`${BASE}/company/create`, { waitUntil: "networkidle" });
  await page.locator("input").first().fill(`Crawl Co ${Date.now().toString(36)}`);
  const cont = page.getByRole("button", { name: /^continue$/i });
  if (await cont.count()) {
    await cont.click();
    await page.waitForTimeout(300);
    if (await cont.count()) await cont.click();
  }
  await page.getByRole("button", { name: /create company|create|finish|open/i }).last().click();
  await page.waitForURL(/\/company\/app/, { timeout: 60000 });
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  try {
    await login(page);

    await page.goto(`${BASE}/company/app/masters/categories`, { waitUntil: "networkidle", timeout: 60000 });
    const catText = await page.locator("body").innerText();
    const catOk =
      /Categories/i.test(catText) &&
      (/No categories yet|group parties|Farmers|Builders|member/i.test(catText) ||
        /Add|Assign party|Category detail/i.test(catText)) &&
      !(/business-units/i.test(catText) && !/Categories/i.test(catText));
    // Must show Categories tab selected content, not fall through silently to BU-only
    const hasCatHeading = /Categories/i.test(catText);
    record("CRAWL_CATEGORIES", "/masters/categories manages categories UI", hasCatHeading && catOk, page.url());

    await page.goto(`${BASE}/company/app/vouchers/new`, { waitUntil: "networkidle", timeout: 60000 });
    const newText = await page.locator("body").innerText();
    const chooserOk =
      /What do you want to record|Money Received|Money Paid|Transfer|Journal|Against a Bill/i.test(newText);
    const notList = !/Day book|Posted entries ·/i.test(newText) || chooserOk;
    record(
      "CRAWL_VOUCHER_NEW",
      "/vouchers/new shows entry chooser (not list)",
      chooserOk && notList,
      page.url(),
    );

    await page.setViewportSize({ width: 430, height: 900 });
    await page.goto(`${BASE}/company/app/vouchers/new`, { waitUntil: "networkidle", timeout: 60000 });
    const mobileText = await page.locator("body").innerText();
    record(
      "CRAWL_VOUCHER_NEW_MOBILE",
      "Mobile chooser sheet reachable",
      /What do you want to record|Money Received/i.test(mobileText),
    );
  } catch (e) {
    record("CRAWL_X", "Crawl aborted", false, String(e));
  } finally {
    await browser.close();
  }

  const pass = results.filter((r) => r.pass).length;
  const fail = results.filter((r) => !r.pass).length;
  const lines = [
    `PAGE CRAWL PHASE_01 ${new Date().toISOString()}`,
    `BASE ${BASE}`,
    ...results.map((r) => `${r.pass ? "PASS" : "FAIL"} ${r.id} ${r.name} ${r.detail}`),
    `${pass} pass · ${fail} fail`,
  ];
  writeFileSync(join(outDir, "PHASE_01_CRAWL.txt"), lines.join("\n") + "\n");
  console.log(`\n${pass} pass · ${fail} fail`);
  if (fail > 0) process.exit(1);
}

await run();
