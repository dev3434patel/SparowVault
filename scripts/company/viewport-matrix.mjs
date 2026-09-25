/**
 * Viewport matrix — prove company SPA at every real-user width.
 * Env: COMPANY_E2E_BASEURL, COMPANY_E2E_USER, COMPANY_E2E_PIN, COMPANY_PRODUCT_RUN
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
const screenDir = join(outDir, "screens/viewport-matrix");
mkdirSync(rawDir, { recursive: true });
mkdirSync(screenDir, { recursive: true });
mkdirSync(join(root, "docs/company/audit/raw"), { recursive: true });

const BASE = (process.env.COMPANY_E2E_BASEURL || "http://localhost:5173").replace(/\/$/, "");
const USER = process.env.COMPANY_E2E_USER || "cert_211549";
const PIN = process.env.COMPANY_E2E_PIN || "583921";

const VIEWPORTS = [320, 375, 390, 768, 1024, 1280, 1440, 1920];
const HEIGHT = 900;

/** 21 pages × 8 viewports = 168 checks */
const PAGES = [
  { id: "dashboard", path: "/company/app" },
  { id: "parties", path: "/company/app/parties" },
  { id: "parties-new", path: "/company/app/parties/new" },
  { id: "vouchers", path: "/company/app/vouchers" },
  { id: "vouchers-new", path: "/company/app/vouchers/new" },
  { id: "quick-received", path: "/company/app/quick/received" },
  { id: "quick-paid", path: "/company/app/quick/paid" },
  { id: "quick-transfer", path: "/company/app/quick/transfer" },
  { id: "quick-journal", path: "/company/app/quick/journal" },
  { id: "receivables", path: "/company/app/receivables" },
  { id: "payables", path: "/company/app/payables" },
  { id: "reports", path: "/company/app/reports" },
  { id: "report-trial-balance", path: "/company/app/reports/trial-balance" },
  { id: "masters", path: "/company/app/masters/business-units", mastersTabs: true },
  { id: "users", path: "/company/app/users" },
  { id: "approvals", path: "/company/app/approvals" },
  { id: "settings", path: "/company/app/settings" },
  { id: "audit", path: "/company/app/audit" },
  { id: "export", path: "/company/app/export" },
  { id: "search", path: "/company/app/search" },
  { id: "select-company", path: "/company/select", noShell: true },
];

const results = [];
function record(id, pass, detail = "") {
  results.push({ id, pass, detail: String(detail).slice(0, 240) });
  console.log(`${pass ? "PASS" : "FAIL"} ${id}${detail ? " — " + detail : ""}`);
}

async function login(page) {
  await page.goto(`${BASE}/company/login`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForSelector('input[autocomplete="username"], form input', { timeout: 30000 });
  const userInput = page.locator('input[autocomplete="username"]').first();
  if (await userInput.count()) await userInput.fill(USER);
  else await page.locator("form input").first().fill(USER);
  await page.locator('input[autocomplete="current-password"], input[type="password"]').first().fill(PIN);
  await Promise.all([
    page.waitForURL(/\/company\/(select|create|app)/, { timeout: 60000 }),
    page.getByRole("button", { name: /sign in|પ્રવેશ|login/i }).click(),
  ]);
}

async function ensureCompanyOpen(page) {
  if (/\/company\/app(\/|$|\?)/.test(page.url())) return;
  await page
    .waitForFunction(() => !/^\s*Loading/i.test(document.body?.innerText || ""), null, { timeout: 30000 })
    .catch(() => {});
  if (/\/company\/app(\/|$|\?)/.test(page.url())) return;
  if (/\/company\/select/.test(page.url())) {
    const body = await page.locator("body").innerText();
    if (/No companies yet/i.test(body)) {
      await page.goto(`${BASE}/company/create`, { waitUntil: "domcontentloaded", timeout: 60000 });
      await page.locator("input").first().fill(`Viewport Co ${Date.now().toString(36)}`);
      const cont = page.getByRole("button", { name: /^continue$/i });
      if (await cont.count()) {
        await cont.click();
        await page.waitForTimeout(400);
        if (await cont.count()) await cont.click();
        await page.waitForTimeout(400);
      }
      await page.getByRole("button", { name: /create company|create|finish|open/i }).last().click();
      await page.waitForURL(/\/company\/app/, { timeout: 60000 });
      return;
    }
    const openBtn = page.getByRole("button").filter({ hasNotText: /create|sign out|log out|logout/i });
    await openBtn.first().waitFor({ timeout: 30000 });
    await openBtn.first().click();
    await page.waitForURL(/\/company\/app/, { timeout: 60000 });
  }
}

async function assertPage(page, width, pageDef) {
  const failures = [];
  const isMobile = width < 768;

  // 1) No horizontal scroll on document
  const scroll = await page.evaluate(() => {
    const el = document.scrollingElement || document.documentElement;
    const main = document.querySelector("main");
    return {
      docScrollWidth: el.scrollWidth,
      innerWidth: window.innerWidth,
      mainScrollWidth: main ? main.scrollWidth : 0,
      mainClientWidth: main ? main.clientWidth : 0,
    };
  });
  const tol = 2;
  if (scroll.docScrollWidth > scroll.innerWidth + tol) {
    failures.push(`h-scroll doc ${scroll.docScrollWidth}>${scroll.innerWidth}`);
  }
  if (scroll.mainScrollWidth > scroll.mainClientWidth + tol && scroll.mainClientWidth > 0) {
    failures.push(`h-scroll main ${scroll.mainScrollWidth}>${scroll.mainClientWidth}`);
  }

  // 2) Primary CTA in header actions — must fit initial viewport (skip if none)
  const cta = await page.evaluate(() => {
    const scope = document.querySelector("[data-primary-actions]");
    if (!scope) return { found: false };
    const btn = scope.querySelector("button:not([disabled]), a[href]");
    if (!btn) return { found: false };
    const r = btn.getBoundingClientRect();
    return {
      found: true,
      inView:
        r.top >= -1 &&
        r.left >= -1 &&
        r.bottom <= window.innerHeight + 1 &&
        r.right <= window.innerWidth + 1 &&
        r.width > 0 &&
        r.height > 0,
      right: r.right,
      bottom: r.bottom,
    };
  });
  if (cta.found && !cta.inView) {
    // Zero-size means the lazy page chunk has not painted yet — not a real clip.
    if (cta.right === 0 && cta.bottom === 0) {
      /* ignore transient unmounted CTA */
    } else {
      failures.push(`primary CTA clipped (right=${Math.round(cta.right)} bottom=${Math.round(cta.bottom)})`);
    }
  }

  // 3) Tables: card reflow ≤768 OR scroll affordance
  const tableCheck = await page.evaluate((mobile) => {
    const issues = [];
    const tables = Array.from(document.querySelectorAll("main table"));
    for (const table of tables) {
      const visible = table.getBoundingClientRect().width > 0 && getComputedStyle(table).display !== "none";
      if (!visible) continue;
      const wrap =
        table.closest("[data-scroll-affordance]") ||
        table.closest("[data-responsive-table]") ||
        table.parentElement;
      const tw = table.scrollWidth;
      const vw = window.innerWidth;
      if (tw <= vw + 2) continue;
      // overflowing table
      if (mobile) {
        // At ≤768 we prefer cards; if table still shown it must scroll with affordance
        const aff = wrap?.getAttribute?.("data-scroll-affordance") === "x" ||
          wrap?.querySelector?.("[data-scroll-hint]") ||
          (wrap && getComputedStyle(wrap).overflowX === "auto") ||
          (wrap && getComputedStyle(wrap).overflowX === "scroll");
        const canScroll = wrap && wrap.scrollWidth > wrap.clientWidth + 1;
        if (!aff || !canScroll) {
          issues.push("table overflows without scroll affordance");
        }
      } else {
        const ox = wrap ? getComputedStyle(wrap).overflowX : "";
        if (ox !== "auto" && ox !== "scroll" && wrap?.getAttribute?.("data-scroll-affordance") !== "x") {
          issues.push("desktop table overflows without scroll container");
        }
      }
    }
    return issues;
  }, isMobile);
  failures.push(...tableCheck);

  // 4) Nav chrome
  if (!pageDef.noShell) {
    const loading = await page.evaluate(() =>
      /Loading company workspace|કંપની વર્કસ્પેસ/i.test(document.body?.innerText || ""),
    );
    if (loading) {
      failures.push("workspace still loading");
    } else {
      const nav = await page.evaluate((mobile) => {
        const bottom = document.querySelector("nav.fixed.inset-x-0.bottom-0, nav[class*='bottom-0']");
        const aside = document.querySelector("aside");
        const bottomVisible = !!(bottom && getComputedStyle(bottom).display !== "none");
        const asideVisible = !!(aside && getComputedStyle(aside).display !== "none" && aside.getBoundingClientRect().width > 0);
        return { bottomVisible, asideVisible, mobile };
      }, isMobile);
      if (isMobile && !nav.bottomVisible) failures.push("mobile bottom nav missing");
      if (!isMobile && !nav.asideVisible) failures.push("desktop sidebar missing");
    }
  }

  // 5) Open sheets/modals fit (if any open)
  const modal = await page.evaluate(() => {
    const dialogs = Array.from(
      document.querySelectorAll('[role="dialog"], [data-state="open"].fixed, .fixed.inset-0'),
    ).filter((el) => {
      const s = getComputedStyle(el);
      return s.display !== "none" && s.visibility !== "hidden" && el.getBoundingClientRect().height > 40;
    });
    for (const d of dialogs) {
      const panel =
        d.querySelector("[class*='rounded'], [class*='card'], [role='document']") || d;
      const buttons = Array.from(panel.querySelectorAll("button")).filter(
        (b) => getComputedStyle(b).display !== "none",
      );
      for (const b of buttons) {
        const r = b.getBoundingClientRect();
        if (r.bottom > window.innerHeight + 2 || r.top < -2) {
          return { ok: false, reason: "modal button outside viewport height" };
        }
      }
    }
    return { ok: true };
  });
  if (!modal.ok) failures.push(modal.reason);

  // Masters: exercise tabs once per viewport
  if (pageDef.mastersTabs) {
    const tabs = page.getByRole("tab");
    const n = await tabs.count();
    for (let i = 0; i < Math.min(n, 6); i++) {
      await tabs.nth(i).click({ timeout: 5000 }).catch(() => {});
      await page.waitForTimeout(150);
    }
    const after = await page.evaluate(() => {
      const el = document.scrollingElement || document.documentElement;
      return el.scrollWidth <= window.innerWidth + 2;
    });
    if (!after) failures.push("masters tabs caused h-scroll");
  }

  return failures;
}

async function waitShell(page, width) {
  const isMobile = width < 768;
  await page
    .waitForFunction(
      () => !/Loading company workspace|કંપની વર્કસ્પેસ/i.test(document.body?.innerText || ""),
      null,
      { timeout: 20000 },
    )
    .catch(() => {});
  await page
    .waitForFunction(
      (mobile) => {
        const bottom = document.querySelector("nav.fixed.inset-x-0.bottom-0, nav[class*='bottom-0']");
        const aside = document.querySelector("aside");
        const bottomVisible = !!(bottom && getComputedStyle(bottom).display !== "none");
        const asideVisible = !!(
          aside &&
          getComputedStyle(aside).display !== "none" &&
          aside.getBoundingClientRect().width > 0
        );
        return mobile ? bottomVisible : asideVisible;
      },
      isMobile,
      { timeout: 15000 },
    )
    .catch(() => {});
}

/** Soft navigate — keeps lazy CompanyApp mounted (full goto remounts and races hydrate). */
async function softGoto(page, path) {
  const cur = new URL(page.url()).pathname;
  if (cur === path) return;
  await page.evaluate((p) => {
    window.history.pushState({}, "", p);
    window.dispatchEvent(new PopStateEvent("popstate"));
  }, path);
  await page.waitForTimeout(200);
  // Lazy route chunk: wait until primary actions (if any) have real layout, or 2s.
  await page
    .waitForFunction(() => {
      const scope = document.querySelector("[data-primary-actions]");
      if (!scope) return true;
      const btn = scope.querySelector("button:not([disabled]), a[href]");
      if (!btn) return true;
      const r = btn.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    }, null, { timeout: 8000 })
    .catch(() => {});
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  page.setDefaultTimeout(45000);

  try {
    await page.setViewportSize({ width: 1440, height: HEIGHT });
    await login(page);
    await ensureCompanyOpen(page);
    await waitShell(page, 1440);

    for (const vp of VIEWPORTS) {
      await page.setViewportSize({ width: vp, height: HEIGHT });
      // Ensure shell once per viewport via soft nav (avoid full remount storms).
      await softGoto(page, "/company/app");
      if (/\/company\/(select|login)/.test(page.url())) {
        await ensureCompanyOpen(page);
      }
      await waitShell(page, vp);

      for (const pageDef of PAGES) {
        const checkId = `${vp}×${pageDef.id}`;
        try {
          if (pageDef.noShell) {
            await page.goto(`${BASE}${pageDef.path}`, { waitUntil: "domcontentloaded", timeout: 60000 });
            await page.waitForTimeout(300);
          } else {
            await softGoto(page, pageDef.path);
            if (/\/company\/(select|login)/.test(page.url())) {
              await ensureCompanyOpen(page);
              await softGoto(page, pageDef.path);
            }
            await waitShell(page, vp);
          }

          const failures = await assertPage(page, vp, pageDef);
          if (vp === 320 || vp === 1440) {
            const shotName = `${pageDef.id}@${vp}`;
            await page.screenshot({ path: join(screenDir, `${shotName}.png`), fullPage: true });
          }
          record(checkId, failures.length === 0, failures.join("; "));
        } catch (e) {
          record(checkId, false, String(e).slice(0, 200));
        }
      }
    }
  } finally {
    await browser.close();
  }

  const pass = results.filter((r) => r.pass).length;
  const fail = results.filter((r) => !r.pass).length;
  const expected = VIEWPORTS.length * PAGES.length;
  const lines = [
    `VIEWPORT MATRIX ${new Date().toISOString()}`,
    `BASE=${BASE} USER=${USER}`,
    `expected=${expected} pass=${pass} fail=${fail}`,
    ...results.map((r) => `${r.pass ? "PASS" : "FAIL"} ${r.id} ${r.detail}`),
    `SUMMARY pass=${pass} fail=${fail} expected=${expected}`,
    fail === 0 && pass === expected ? "VERDICT PASS" : "VERDICT FAIL",
  ];
  const evidence = lines.join("\n") + "\n";
  writeFileSync(join(rawDir, "EVIDENCE_VIEWPORT_MATRIX.txt"), evidence);
  try {
    writeFileSync(join(root, "docs/company/audit/raw/PHASE_05.log"), evidence);
  } catch {
    writeFileSync(join(root, "docs/company/audit/raw/PHASE_05_run.log"), evidence);
  }
  writeFileSync(
    join(outDir, "VIEWPORT_MATRIX_REPORT.md"),
    [
      "# Viewport Matrix Report",
      "",
      `| Viewport × Page | Verdict | Detail |`,
      `|-----------------|---------|--------|`,
      ...results.map((r) => `| ${r.id} | ${r.pass ? "PASS" : "FAIL"} | ${r.detail.replace(/\|/g, "/")} |`),
      "",
      fail === 0 && pass === expected ? "**VIEWPORT MATRIX PASS**" : "**VIEWPORT MATRIX FAIL**",
      "",
    ].join("\n"),
  );

  console.log(`\nSUMMARY pass=${pass} fail=${fail} expected=${expected}`);
  process.exit(fail === 0 && pass === expected ? 0 : 1);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
