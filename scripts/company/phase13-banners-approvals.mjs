/**
 * Phase 13 browser proof: dashboard loading region, export 403 banner, approvals cash impact.
 * Env: COMPANY_E2E_BASEURL, COMPANY_E2E_USER, COMPANY_E2E_PIN
 */
import { chromium } from "@playwright/test";

const BASE = (process.env.COMPANY_E2E_BASEURL || "http://localhost:5173").replace(/\/$/, "");
const USER = process.env.COMPANY_E2E_USER || "cert_211549";
const PIN = process.env.COMPANY_E2E_PIN || "583921";

const results = [];
function record(id, pass, detail = "") {
  results.push({ id, pass, detail });
  console.log(`${pass ? "PASS" : "FAIL"} ${id}${detail ? " — " + detail : ""}`);
}

async function login(page) {
  await page.goto(`${BASE}/company/login`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForSelector('input[autocomplete="username"]', { timeout: 30000 });
  await page.locator('input[autocomplete="username"]').fill(USER);
  await page.locator('input[autocomplete="current-password"], input[type="password"]').fill(PIN);
  await page.getByRole("button", { name: /sign in|સાઇન ઇન/i }).click();
  await page.waitForURL(/\/company\/(select|create|app)/, { timeout: 45000 });
  if (/\/company\/select/.test(page.url())) {
    const btn = page.getByRole("button").filter({ hasNotText: /create|sign out|another/i }).first();
    await btn.click();
    await page.waitForURL(/\/company\/app/, { timeout: 45000 });
  }
}

async function seedPendingJournal(page) {
  return page.evaluate(async () => {
    const companyId = localStorage.getItem("sv:company:activeCompanyId");
    if (!companyId) return { ok: false, error: "no company" };
    const ledgersRes = await fetch(`/api/company/ledgers.php?companyId=${encodeURIComponent(companyId)}`, {
      credentials: "include",
    });
    const ledgersBody = await ledgersRes.json();
    const payload = ledgersBody.data && typeof ledgersBody.data === "object" ? ledgersBody.data : ledgersBody;
    const list = Array.isArray(payload.ledgers) ? payload.ledgers : [];
    const ids = list.map((l) => String(l.id || "")).filter(Boolean).slice(0, 2);
    if (ids.length < 2) {
      return {
        ok: false,
        error: `ledgers=${list.length} status=${ledgersRes.status} keys=${Object.keys(ledgersBody).join(",")}`,
      };
    }
    const csrf = sessionStorage.getItem("sv:csrf_token") || "";
    const today = new Date().toISOString().slice(0, 10);
    const post = await fetch("/api/company/voucher-post.php", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json", ...(csrf ? { "X-CSRF-Token": csrf } : {}) },
      body: JSON.stringify({
        companyId,
        mutationId: `phase13-${Date.now()}`,
        voucherType: "JOURNAL",
        voucherDate: today,
        status: "PENDING_APPROVAL",
        narration: "PHASE13 pending approval",
        lines: [
          { ledgerId: ids[0], side: "DEBIT", amountPaise: 10000 },
          { ledgerId: ids[1], side: "CREDIT", amountPaise: 10000 },
        ],
      }),
    });
    const text = await post.text();
    return { ok: post.ok, status: post.status, companyId, body: text.slice(0, 240) };
  });
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  let mode = "delay";
  try {
    await page.route("**/api/company/**", async (route) => {
      const url = route.request().url();
      const method = route.request().method();
      if (mode === "export403" && url.includes("exports.php") && method === "POST") {
        await route.fulfill({
          status: 403,
          contentType: "application/json",
          body: JSON.stringify({ error: "forbidden", code: "FORBIDDEN" }),
        });
        return;
      }
      if (mode === "delay" && method === "GET" && /reports\.php|bills\.php/.test(url)) {
        await new Promise((r) => setTimeout(r, 2500));
      }
      await route.continue();
    });
    mode = "passthrough";
    await login(page);
    const loadingWatch = page
      .getByRole("status", { name: /loading/i })
      .or(page.getByText(/Loading company workspace/i))
      .first()
      .waitFor({ state: "visible", timeout: 12000 })
      .then(() => true)
      .catch(() => false);
    mode = "delay";
    await page.goto(`${BASE}/company/app`, { waitUntil: "domcontentloaded" });
    const sawLoading = await loadingWatch;
    record("dashboard:loading-region", sawLoading, sawLoading ? "skeleton or loading region visible" : "none");

    mode = "passthrough";
    await page.goto(`${BASE}/company/app/export`, { waitUntil: "domcontentloaded" });
    mode = "export403";
    page.once("dialog", (d) => d.accept("583921"));
    await page.getByRole("button", { name: "Export PDF" }).click();
    const banner = page.getByText("You don't have permission to export this report.");
    const sawBanner = await banner.waitFor({ state: "visible", timeout: 10000 }).then(() => true).catch(() => false);
    record("export:403-banner", sawBanner, sawBanner ? "permission sentence visible" : "missing");

    mode = "passthrough";
    await page.goto(`${BASE}/company/app/approvals`, { waitUntil: "domcontentloaded" });
    await page.getByRole("heading", { name: /approvals/i }).waitFor({ timeout: 15000 }).catch(() => {});
    let impact = await page.getByText(/increases bank|reduces bank|no cash/i).count();
    if (impact === 0) {
      const seeded = await seedPendingJournal(page);
      record("approvals:seed", Boolean(seeded.ok), JSON.stringify(seeded).slice(0, 180));
      await page.reload({ waitUntil: "domcontentloaded" });
      await page.getByRole("heading", { name: /approvals/i }).waitFor({ timeout: 15000 }).catch(() => {});
      impact = await page.getByText(/increases bank|reduces bank|no cash/i).count();
    }
    const sample = impact
      ? (await page.getByText(/increases bank|reduces bank|no cash/i).first().innerText()).slice(0, 80)
      : "";
    record("approvals:cash-impact", impact > 0, sample || "no impact copy");
  } catch (e) {
    record("fatal", false, e instanceof Error ? e.message : String(e));
  } finally {
    await browser.close();
  }
  const fail = results.filter((r) => !r.pass).length;
  console.log(`PHASE13 BROWSER SUMMARY fail=${fail}`);
  process.exit(fail ? 1 : 0);
}

main();
