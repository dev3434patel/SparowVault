/**
 * PHASE_06 — axe-core scan of 10 core Company pages (critical/serious = fail).
 * Env: COMPANY_E2E_BASEURL, COMPANY_E2E_USER, COMPANY_E2E_PIN
 */
import { chromium } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { mkdirSync, appendFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const logPath = join(root, "docs/company/audit/raw/PHASE_06.log");
mkdirSync(join(root, "docs/company/audit/raw"), { recursive: true });

const BASE = (process.env.COMPANY_E2E_BASEURL || "http://localhost:5173").replace(/\/$/, "");
const USER = process.env.COMPANY_E2E_USER || "cert_211549";
const PIN = process.env.COMPANY_E2E_PIN || "583921";

const CORE_PAGES = [
  { id: "login", path: "/company/login", auth: false },
  { id: "select-company", path: "/company/select", auth: true },
  { id: "dashboard", path: "/company/app", auth: true },
  { id: "parties", path: "/company/app/parties", auth: true },
  { id: "vouchers", path: "/company/app/vouchers", auth: true },
  { id: "quick-received", path: "/company/app/quick/received", auth: true },
  { id: "receivables", path: "/company/app/receivables", auth: true },
  { id: "reports", path: "/company/app/reports", auth: true },
  { id: "approvals", path: "/company/app/approvals", auth: true },
  { id: "settings", path: "/company/app/settings", auth: true },
];

async function login(page) {
  await page.goto(`${BASE}/company/login`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForSelector('input[autocomplete="username"], form input', { timeout: 30000 });
  const userInput = page.locator('input[autocomplete="username"]').first();
  if (await userInput.count()) await userInput.fill(USER);
  else await page.locator("form input").first().fill(USER);
  await page.locator('input[autocomplete="current-password"], input[type="password"]').first().fill(PIN);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL(/\/company\/(select|create|app)/, { timeout: 45000 });
}

async function ensureCompany(page) {
  if (/\/company\/app(\/|$|\?)/.test(page.url())) return;
  await page
    .waitForFunction(() => !/^\s*Loading/i.test(document.body?.innerText || ""), null, { timeout: 30000 })
    .catch(() => {});
  if (/\/company\/app(\/|$|\?)/.test(page.url())) return;
  if (/\/company\/select/.test(page.url())) {
    const btn = page.getByRole("button").filter({ hasNotText: /create|sign out/i }).first();
    await btn.waitFor({ timeout: 30000 });
    await btn.click();
    await page.waitForURL(/\/company\/app/, { timeout: 45000 });
  }
}

async function main() {
  if (!existsSync(logPath)) writeFileSync(logPath, `PHASE_06 AXE ${new Date().toISOString()}\n`, "utf8");
  appendFileSync(logPath, `\n--- AXE SCAN ${new Date().toISOString()} ---\n`, "utf8");

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, colorScheme: "dark" });
  const page = await context.newPage();

  let totalSerious = 0;
  const pageResults = [];

  try {
    await login(page);
    await ensureCompany(page);

    for (const p of CORE_PAGES) {
      if (!p.auth) {
        // Fresh context for login page without session noise
        await page.goto(`${BASE}${p.path}`, { waitUntil: "domcontentloaded", timeout: 60000 });
      } else {
        await page.goto(`${BASE}${p.path}`, { waitUntil: "domcontentloaded", timeout: 60000 });
        await ensureCompany(page);
        if (p.id === "select-company") {
          await page.goto(`${BASE}/company/select`, { waitUntil: "domcontentloaded" });
        }
      }
      await page.waitForTimeout(500);
      // Force dark theme class for contrast audit
      await page.evaluate(() => document.documentElement.classList.add("dark"));

      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze();

      const bad = results.violations.filter((v) => v.impact === "critical" || v.impact === "serious");
      totalSerious += bad.length;
      const detail = bad.map((v) => `${v.id}(${v.impact}):${v.nodes.length}`).join("; ");
      const pass = bad.length === 0;
      pageResults.push({ id: p.id, pass, detail, all: results.violations.length });
      const line = `${pass ? "PASS" : "FAIL"} axe:${p.id} serious=${bad.length} total=${results.violations.length}${detail ? " — " + detail : ""}`;
      console.log(line);
      appendFileSync(logPath, line + "\n", "utf8");

      if (bad.length) {
        for (const v of bad.slice(0, 5)) {
          const nodes = v.nodes
            .slice(0, 3)
            .map((n) => n.target?.join(" ") || "")
            .join(" | ");
          appendFileSync(logPath, `  ${v.id}: ${v.help} :: ${nodes}\n`, "utf8");
        }
      }
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("AXE FATAL", msg);
    appendFileSync(logPath, `FAIL axe:fatal — ${msg}\n`, "utf8");
    totalSerious += 1;
  } finally {
    await browser.close();
  }

  const summary = `AXE SUMMARY pages=${pageResults.length} serious_critical=${totalSerious} pass=${pageResults.filter((r) => r.pass).length}\n`;
  console.log(summary);
  appendFileSync(logPath, summary, "utf8");
  process.exit(totalSerious ? 1 : 0);
}

main();
