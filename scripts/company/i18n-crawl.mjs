/**
 * Crawl company pages in en + gu. Uses cert user with an existing company.
 * Env: COMPANY_E2E_BASEURL, COMPANY_E2E_USER, COMPANY_E2E_PIN
 */
import { chromium } from "@playwright/test";
import { mkdirSync, appendFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const logPath = join(root, "docs/company/audit/raw/PHASE_07.log");
mkdirSync(join(root, "docs/company/audit/raw"), { recursive: true });

const BASE = (process.env.COMPANY_E2E_BASEURL || "http://localhost:5173").replace(/\/$/, "");
const USER = process.env.COMPANY_E2E_USER || "cert_211549";
const PIN = process.env.COMPANY_E2E_PIN || "583921";

const PAGES = [
  "/company/app",
  "/company/app/parties",
  "/company/app/parties/new",
  "/company/app/vouchers",
  "/company/app/vouchers/new",
  "/company/app/quick/received",
  "/company/app/quick/paid",
  "/company/app/quick/transfer",
  "/company/app/quick/journal",
  "/company/app/receivables",
  "/company/app/payables",
  "/company/app/reports",
  "/company/app/reports/trial-balance",
  "/company/app/masters/business-units",
  "/company/app/users",
  "/company/app/approvals",
  "/company/app/settings",
  "/company/app/audit",
  "/company/app/export",
  "/company/app/search",
  "/company/select",
];

const results = [];
function record(id, pass, detail = "") {
  results.push({ id, pass, detail: String(detail).slice(0, 200) });
  console.log(`${pass ? "PASS" : "FAIL"} ${id}${detail ? " — " + detail : ""}`);
}

async function login(page) {
  await page.goto(`${BASE}/company/login`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForSelector('input[autocomplete="username"]', { timeout: 30000 });
  await page.locator('input[autocomplete="username"]').fill(USER);
  await page.locator('input[autocomplete="current-password"], input[type="password"]').fill(PIN);
  await page.getByRole("button", { name: /sign in|સાઇન ઇન/i }).click();
  await page.waitForURL(/\/company\/(select|create|app)/, { timeout: 45000 });
  await page
    .waitForFunction(() => !/^\s*Loading/i.test(document.body?.innerText || ""), null, { timeout: 20000 })
    .catch(() => {});
  if (/\/company\/select/.test(page.url())) {
    const companyBtn = page.getByRole("button").filter({ hasNotText: /create|sign out|બનાવો|સાઇન|another/i });
    if ((await companyBtn.count()) > 0) {
      await companyBtn.first().click();
      await page.waitForURL(/\/company\/app/, { timeout: 45000 });
    }
  }
}

async function setLang(page, locale) {
  // Prefer UI toggle (no reload) to avoid auth-hydration race that flashes login.
  const toggle = page.getByRole("button", { name: /language|ભાષા/i });
  if ((await toggle.count()) > 0) {
    await toggle.click();
    const option =
      locale === "gu"
        ? page.getByRole("option", { name: /ગુજરાતી|gujarati/i })
        : page.getByRole("option", { name: /^english$/i });
    await option.click();
    await page.waitForTimeout(300);
  } else {
    await page.evaluate((loc) => {
      localStorage.setItem("spv.lang", loc);
      window.dispatchEvent(new CustomEvent("spv-lang-change", { detail: loc }));
    }, locale);
    await page.waitForTimeout(400);
  }
  const chip = locale === "gu" ? "ગુ" : "EN";
  await page
    .waitForFunction((c) => [...document.querySelectorAll("button")].some((b) => (b.textContent || "").includes(c)), chip, {
      timeout: 8000,
    })
    .catch(() => {});
}

async function main() {
  if (!existsSync(logPath)) writeFileSync(logPath, `PHASE_07 ${new Date().toISOString()}\n`, "utf8");
  appendFileSync(logPath, `\n--- I18N CRAWL ${new Date().toISOString()} ---\n`, "utf8");

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();

  try {
    await login(page);
    const hasCompany = /\/company\/app/.test(page.url());
    record("login:has-company", hasCompany, page.url());

    await page.goto(`${BASE}/company/app`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector("h1", { timeout: 20000 }).catch(() => {});
    const beforeText = await page.evaluate(() => document.body?.innerText || "");
    const englishBefore = /Dashboard/i.test(beforeText);
    record("default:english-chrome", englishBefore, englishBefore ? "Dashboard visible before toggle" : "missing Dashboard");
    console.log(`BEFORE TOGGLE chrome English=${englishBefore}`);

    await setLang(page, "gu");
    const guStored = await page.evaluate(() => localStorage.getItem("spv.lang"));
    const guText = await page.evaluate(() => document.body?.innerText || "");
    const guSession = /\/company\/app/.test(page.url());
    const guStrings = /ડેશબોર્ડ|તરલ|પૈસા/.test(guText);
    record(
      "persist:after-gu",
      guStored === "gu" && guStrings && guSession,
      `spv.lang=${guStored || "null"} gujarati=${guStrings} session=${guSession}`,
    );
    console.log(`AFTER GU spv.lang=${guStored} gujarati=${guStrings} session_kept=${guSession}`);

    await setLang(page, "en");
    const enStored = await page.evaluate(() => localStorage.getItem("spv.lang"));
    const enText = await page.evaluate(() => document.body?.innerText || "");
    const englishBack = /Dashboard/i.test(enText);
    record("persist:after-en", enStored === "en" && englishBack, `spv.lang=${enStored || "null"} english=${englishBack}`);
    console.log(`AFTER EN spv.lang=${enStored} english=${englishBack}`);

    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForSelector("h1", { timeout: 20000 }).catch(() => {});
    const reloadStored = await page.evaluate(() => localStorage.getItem("spv.lang"));
    const reloadText = await page.evaluate(() => document.body?.innerText || "");
    const reloadOk = reloadStored === "en" && /Dashboard/i.test(reloadText) && /\/company\/app/.test(page.url());
    record("persist:reload", reloadOk, `spv.lang=${reloadStored || "null"} kept=${reloadOk}`);
    console.log(`RELOAD KEEPS spv.lang=${reloadStored} english=${/Dashboard/i.test(reloadText)}`);

    for (const locale of ["en", "gu"]) {
      await page.goto(`${BASE}/company/app`, { waitUntil: "domcontentloaded" });
      if (/login/.test(page.url())) await login(page);
      if (/select/.test(page.url())) {
        const companyBtn = page.getByRole("button").filter({ hasNotText: /create|sign out|બનાવો|સાઇન|another/i });
        if ((await companyBtn.count()) > 0) {
          await companyBtn.first().click();
          await page.waitForURL(/\/company\/app/, { timeout: 45000 });
        }
      }
      await setLang(page, locale);
      // Stay on dashboard for chip + locale assert
      await page.goto(`${BASE}/company/app`, { waitUntil: "domcontentloaded" });
      await page.waitForSelector("h1", { timeout: 20000 }).catch(() => {});
      await page.waitForTimeout(400);

      const chip = locale === "gu" ? "ગુ" : "EN";
      const hasChip =
        (await page.getByRole("button", { name: /language|ભાષા/i }).count()) > 0 &&
        (await page.locator("button").filter({ hasText: chip }).count()) > 0;
      record(`lang-chip:${locale}`, hasChip, chip);

      const pages = hasCompany ? PAGES : ["/company/select"];
      for (const path of pages) {
        await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded", timeout: 60000 });
        await page.waitForTimeout(500);
        if (/login/.test(page.url()) && path !== "/company/login") {
          record(`crawl:${locale}:${path}`, false, "session-lost");
          continue;
        }
        await page.waitForSelector("h1, h2, main, form", { timeout: 15000 }).catch(() => {});
        const body = await page.evaluate(() => document.body?.innerText || "");
        const crashed = /\[object Object\]/.test(body);
        let localeOk = true;
        if (path === "/company/app" && locale === "gu") {
          localeOk = /ડેશબોર્ડ|તરલ|પૈસા/.test(body);
        }
        if (path === "/company/app" && locale === "en") {
          localeOk = /Dashboard/i.test(body);
        }
        const pass = !crashed && localeOk;
        record(`crawl:${locale}:${path}`, pass, crashed ? "crash" : localeOk ? "" : "locale-miss");
      }
    }

    await page.goto(`${BASE}/company/app`, { waitUntil: "domcontentloaded" });
    await setLang(page, "gu");
    const stored = await page.evaluate(() => localStorage.getItem("spv.lang"));
    record("persist:spv.lang", stored === "gu", stored || "null");
  } catch (e) {
    record("fatal", false, e instanceof Error ? e.message : String(e));
  } finally {
    await browser.close();
  }

  const fail = results.filter((r) => !r.pass).length;
  const summary = `CRAWL SUMMARY pass=${results.length - fail} fail=${fail}\n`;
  console.log(summary);
  appendFileSync(
    logPath,
    results.map((r) => `${r.pass ? "PASS" : "FAIL"} ${r.id}${r.detail ? " — " + r.detail : ""}`).join("\n") +
      "\n" +
      summary,
    "utf8",
  );
  process.exit(fail ? 1 : 0);
}

main();
