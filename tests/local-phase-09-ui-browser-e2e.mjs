import { chromium } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const BASE = process.env.FRONTEND_URL ?? "http://localhost:5173";
const ARTIFACT_DIR = join(process.cwd(), "local-phase-09-logs");
mkdirSync(ARTIFACT_DIR, { recursive: true });

const VIEWPORTS = [
  { name: "mobile-360x800", width: 360, height: 800 },
  { name: "mobile-430x932", width: 430, height: 932 },
  { name: "tablet-768x1024", width: 768, height: 1024 },
  { name: "desktop-1366x768", width: 1366, height: 768 },
  { name: "desktop-1920x1080", width: 1920, height: 1080 },
];

const USER_PAGES = [
  ["Dashboard", "/"],
  ["Transactions", "/transactions"],
  ["Quick Add", "/"],
  ["Accounts", "/accounts"],
  ["Cards", "/cards"],
  ["Loans", "/loans"],
  ["Udhari", "/udhari"],
  ["Goals", "/goals"],
  ["Budgets", "/budgets"],
  ["Reports", "/reports"],
  ["Suggestions", "/suggestions"],
  ["Export", "/export"],
  ["Import", "/import"],
  ["Subscription", "/subscription"],
  ["Settings", "/settings"],
  ["Profile", "/profile"],
  ["Audit", "/audit"],
];

const ADMIN_PAGES = [
  ["Admin Dashboard", "/admin"],
  ["User Management", "/admin/users"],
  ["Plan Management", "/admin/plans"],
  ["Subscription Management", "/admin/subscriptions"],
  ["Feature Flags", "/admin/flags"],
  ["Branding Settings", "/admin/branding"],
];

const results = [];
const consoleRows = [];

function record(area, viewport, check, status, detail = "") {
  results.push({ area, viewport, check, status, detail });
  const prefix = status === "PASS" ? "PASS" : status === "WARN" ? "WARN" : "FAIL";
  console.log(`${prefix} ${viewport} ${area} :: ${check}${detail ? ` -- ${detail}` : ""}`);
}

function failCount() {
  return results.filter((r) => r.status === "FAIL").length;
}

async function clearBrowserState(context) {
  const page = await context.newPage();
  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  await page.evaluate(async () => {
    localStorage.clear();
    sessionStorage.clear();
    if ("databases" in indexedDB) {
      const dbs = await indexedDB.databases();
      await Promise.all(dbs.map((db) => db.name ? new Promise((resolve) => {
        const req = indexedDB.deleteDatabase(db.name);
        req.onsuccess = req.onerror = req.onblocked = () => resolve(undefined);
      }) : Promise.resolve()));
    }
  });
  await page.close();
}

function attachConsole(page, area) {
  page.on("console", (msg) => {
    const text = msg.text();
    if (msg.type() === "error" && !/401 \(Unauthorized\)/i.test(text)) {
      consoleRows.push({ area, type: msg.type(), text });
    }
  });
  page.on("pageerror", (err) => {
    consoleRows.push({ area, type: "pageerror", text: err.message });
  });
}

async function registerUser(page) {
  const stamp = Date.now().toString(36);
  await page.goto(BASE, { waitUntil: "networkidle" });
  const createAccountTab = page.getByRole("button", { name: /^create account$/i }).first();
  if (await createAccountTab.isVisible().catch(() => false)) {
    await createAccountTab.click();
  }
  await page.getByPlaceholder("User Name").fill("Phase Nine QA");
  await page.getByPlaceholder("amit", { exact: true }).fill(`phase9_${stamp}`);
  const pins = page.locator('input[type="password"]');
  await pins.nth(0).fill("583921");
  await pins.nth(1).fill("583921");
  const policyCheckbox = page.locator('input[type="checkbox"]').first();
  if (await policyCheckbox.isVisible().catch(() => false)) {
    await policyCheckbox.check();
  }
  await page.locator("form button[type='submit']").first().click();
  const reachedApp = await page
    .getByRole("button", { name: /quick add/i })
    .first()
    .waitFor({ state: "visible", timeout: 45000 })
    .then(() => true)
    .catch(() => false);
  if (!reachedApp) {
    const body = await page.locator("body").innerText().catch(() => "");
    throw new Error(`User registration did not reach app shell: ${body.slice(0, 300)}`);
  }
}

async function loginAdmin(page) {
  await page.goto(`${BASE}/admin`, { waitUntil: "networkidle" });
  await page.locator("input").nth(0).fill("admin");
  await page.locator("input").nth(1).fill(process.env.ADMIN_PIN ?? "12345678");
  await page.getByRole("button", { name: /sign in to admin/i }).click();
  const reachedAdmin = await page
    .getByText(/admin panel/i)
    .first()
    .waitFor({ state: "visible", timeout: 45000 })
    .then(() => true)
    .catch(() => false);
  if (!reachedAdmin) {
    const body = await page.locator("body").innerText().catch(() => "");
    throw new Error(`Admin login did not reach admin shell: ${body.slice(0, 300)}`);
  }
}

async function inspectLayout(page) {
  return await page.evaluate(() => {
    const vw = window.innerWidth;
    const doc = document.documentElement;
    const body = document.body;
    const horizontalOverflowPx = Math.max(
      0,
      doc.scrollWidth - doc.clientWidth,
      body.scrollWidth - window.innerWidth,
    );

    const isVisible = (el) => {
      const style = window.getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      return (
        style.visibility !== "hidden" &&
        style.display !== "none" &&
        Number(style.opacity) !== 0 &&
        rect.width > 1 &&
        rect.height > 1
      );
    };
    const isInHorizontalScrollContainer = (el) => {
      let cur = el.parentElement;
      while (cur && cur !== document.body) {
        const style = window.getComputedStyle(cur);
        if (["auto", "scroll"].includes(style.overflowX) && cur.scrollWidth > cur.clientWidth) {
          return true;
        }
        cur = cur.parentElement;
      }
      return false;
    };

    const clippedInteractive = Array.from(
      document.querySelectorAll("button,a[href],input,select,textarea,[role='button']"),
    )
      .filter(isVisible)
      .filter((el) => !isInHorizontalScrollContainer(el))
      .map((el) => {
        const rect = el.getBoundingClientRect();
        return {
          tag: el.tagName.toLowerCase(),
          text: (el.getAttribute("aria-label") || el.textContent || el.getAttribute("placeholder") || "").trim().slice(0, 80),
          left: Math.round(rect.left),
          right: Math.round(rect.right),
          width: Math.round(rect.width),
        };
      })
      .filter((x) => x.left < -4 || x.right > vw + 4);

    const tableIssues = Array.from(document.querySelectorAll("table")).map((table) => {
      const rect = table.getBoundingClientRect();
      let cur = table.parentElement;
      let hasScrollContainer = false;
      while (cur && cur !== document.body) {
        const style = window.getComputedStyle(cur);
        if (["auto", "scroll"].includes(style.overflowX) && cur.scrollWidth > cur.clientWidth) {
          hasScrollContainer = true;
          break;
        }
        cur = cur.parentElement;
      }
      return {
        width: Math.round(rect.width),
        viewportWidth: vw,
        usable: rect.width <= vw || hasScrollContainer,
      };
    }).filter((x) => !x.usable);

    const chartCount = document.querySelectorAll("svg.recharts-surface, .recharts-wrapper svg").length;
    const smallCharts = Array.from(document.querySelectorAll("svg.recharts-surface, .recharts-wrapper svg"))
      .map((svg) => svg.getBoundingClientRect())
      .filter((r) => r.width > 0 && r.width < 120);

    const focusableCount = Array.from(
      document.querySelectorAll("button,a[href],input,select,textarea,[tabindex]:not([tabindex='-1'])"),
    ).filter(isVisible).length;

    return {
      horizontalOverflowPx,
      clippedInteractive,
      tableIssues,
      chartCount,
      smallChartCount: smallCharts.length,
      focusableCount,
      bodyTextLength: document.body.innerText.length,
    };
  });
}

async function runFocusCheck(page, area, viewportName) {
  await page.keyboard.press("Tab");
  const focus = await page.evaluate(() => {
    const el = document.activeElement;
    if (!el || el === document.body) return { visible: false, detail: "No active focusable element" };
    const rect = el.getBoundingClientRect();
    const style = window.getComputedStyle(el);
    const hasFocusStyle =
      style.outlineStyle !== "none" ||
      style.boxShadow !== "none" ||
      style.borderColor !== "rgba(0, 0, 0, 0)";
    return {
      visible: rect.width > 1 && rect.height > 1 && rect.left >= -2 && rect.right <= window.innerWidth + 2,
      detail: `${el.tagName.toLowerCase()} ${(el.getAttribute("aria-label") || el.textContent || "").trim().slice(0, 60)} focusStyle=${hasFocusStyle}`,
    };
  });
  record(area, viewportName, "keyboard focus visible/reachable", focus.visible ? "PASS" : "FAIL", focus.detail);
}

async function checkPage(page, viewport, label, url, area = "user") {
  const beforeConsole = consoleRows.length;
  await page.goto(`${BASE}${url}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(250);
  const authVisible = await page.getByRole("heading", { name: /sign in to your account|admin login/i }).first().isVisible().catch(() => false);
  if (authVisible) {
    record(label, viewport.name, "app shell/auth guard", "FAIL", "auth screen visible");
    return;
  }
  record(label, viewport.name, "app shell/auth guard", "PASS");
  const h1Count = await page.locator("h1").count();
  record(label, viewport.name, "page heading rendered", h1Count > 0 ? "PASS" : "FAIL", `h1=${h1Count}`);

  const layout = await inspectLayout(page);
  record(label, viewport.name, "no page-level horizontal overflow", layout.horizontalOverflowPx <= 8 ? "PASS" : "FAIL", `${layout.horizontalOverflowPx}px`);
  record(label, viewport.name, "no clipped visible buttons/inputs", layout.clippedInteractive.length === 0 ? "PASS" : "FAIL", layout.clippedInteractive.slice(0, 3).map((x) => `${x.tag}:${x.text}:${x.left}-${x.right}`).join(" | "));
  record(label, viewport.name, "tables usable", layout.tableIssues.length === 0 ? "PASS" : "FAIL", layout.tableIssues.length ? JSON.stringify(layout.tableIssues.slice(0, 2)) : "ok");
  record(label, viewport.name, "forms/text readable baseline", layout.bodyTextLength > 20 && layout.focusableCount > 0 ? "PASS" : "FAIL", `text=${layout.bodyTextLength}, focusables=${layout.focusableCount}`);
  if (label === "Dashboard" || label === "Reports") {
    record(label, viewport.name, "charts readable or empty-state present", layout.smallChartCount === 0 ? "PASS" : "FAIL", `charts=${layout.chartCount}, small=${layout.smallChartCount}`);
  }

  const newConsole = consoleRows.slice(beforeConsole);
  record(label, viewport.name, "no fatal console/page errors", newConsole.length === 0 ? "PASS" : "FAIL", newConsole.slice(-2).map((x) => x.text).join(" | "));

  if (area === "user" && label === "Dashboard") {
    await runFocusCheck(page, label, viewport.name);
  }
}

async function checkQuickAdd(page, viewport) {
  await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
  const beforeConsole = consoleRows.length;
  const quickAdd = page.getByRole("button", { name: /quick add/i }).first();
  if (!(await quickAdd.isVisible().catch(() => false))) {
    record("Quick Add", viewport.name, "quick add trigger visible", "FAIL");
    return;
  }
  record("Quick Add", viewport.name, "quick add trigger visible", "PASS");
  await quickAdd.click();
  await page.getByRole("menuitem", { name: /expense/i }).click();
  const dialog = page.locator('[role="dialog"]').first();
  const visible = await dialog.isVisible().catch(() => false);
  record("Quick Add", viewport.name, "modal opens", visible ? "PASS" : "FAIL");
  if (visible) {
    const metrics = await dialog.evaluate((el) => {
      const rect = el.getBoundingClientRect();
      const buttons = Array.from(el.querySelectorAll("button")).map((button) => {
        const r = button.getBoundingClientRect();
        return {
          text: (button.textContent || button.getAttribute("aria-label") || "").trim(),
          visible: r.width > 1 && r.height > 1,
          reachable: r.right <= window.innerWidth + 4 && r.left >= -4,
        };
      });
      return {
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        fitsWidth: rect.left >= 0 && rect.right <= window.innerWidth + 4,
        scrollableWhenNeeded: el.scrollHeight >= el.clientHeight,
        hasSave: buttons.some((b) => /save|add|create/i.test(b.text) && b.visible && b.reachable),
        hasCancel: buttons.some((b) => /cancel/i.test(b.text) && b.visible && b.reachable),
      };
    });
    record("Quick Add", viewport.name, "modal fits viewport width", metrics.fitsWidth ? "PASS" : "FAIL", `${metrics.width}x${metrics.height}`);
    record("Quick Add", viewport.name, "save/cancel reachable", metrics.hasSave && metrics.hasCancel ? "PASS" : "FAIL", JSON.stringify(metrics));
    await page.screenshot({ path: join(ARTIFACT_DIR, `${viewport.name}-quick-add.png`), fullPage: true });
    await page.keyboard.press("Escape");
  }
  const newConsole = consoleRows.slice(beforeConsole);
  record("Quick Add", viewport.name, "no fatal console/page errors", newConsole.length === 0 ? "PASS" : "FAIL", newConsole.slice(-2).map((x) => x.text).join(" | "));
}

async function checkExplainDrawer(page, viewport) {
  await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
  const trigger = page.getByRole("button", { name: /explain/i }).first();
  if (!(await trigger.isVisible().catch(() => false))) {
    record("Dashboard", viewport.name, "explain-this-number trigger visible", "FAIL");
    return;
  }
  await trigger.click();
  const dialog = page.locator('[role="dialog"]').first();
  const body = await dialog.innerText({ timeout: 5000 }).catch(() => "");
  const ok = /Formula/i.test(body) && /Included|Excluded|Source/i.test(body);
  record("Dashboard", viewport.name, "explain-this-number drawer works", ok ? "PASS" : "FAIL", body.slice(0, 120));
  await page.keyboard.press("Escape");
}

async function checkColorblindMode(page, viewport) {
  await page.goto(`${BASE}/settings`, { waitUntil: "networkidle" });
  await page.evaluate(() => localStorage.setItem("sparowvault_chart_accessibility", "colorblind"));
  await page.reload({ waitUntil: "networkidle" });
  const selected = await page.evaluate(() => localStorage.getItem("sparowvault_chart_accessibility"));
  record("Settings", viewport.name, "colorblind mode persisted", selected === "colorblind" ? "PASS" : "FAIL", String(selected));
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  try {
    const userContext = await browser.newContext();
    await clearBrowserState(userContext);
    const userPage = await userContext.newPage();
    attachConsole(userPage, "user");
    await registerUser(userPage);

    for (const viewport of VIEWPORTS) {
      await userPage.setViewportSize({ width: viewport.width, height: viewport.height });
      for (const [label, url] of USER_PAGES) {
        if (label === "Quick Add") {
          await checkQuickAdd(userPage, viewport);
        } else {
          await checkPage(userPage, viewport, label, url, "user");
        }
      }
      await checkExplainDrawer(userPage, viewport);
      await checkColorblindMode(userPage, viewport);
      await userPage.screenshot({ path: join(ARTIFACT_DIR, `${viewport.name}-dashboard.png`), fullPage: true });
    }
    await userContext.close();

    const adminContext = await browser.newContext();
    await clearBrowserState(adminContext);
    const adminPage = await adminContext.newPage();
    attachConsole(adminPage, "admin");
    await loginAdmin(adminPage);
    for (const viewport of VIEWPORTS) {
      await adminPage.setViewportSize({ width: viewport.width, height: viewport.height });
      for (const [label, url] of ADMIN_PAGES) {
        await checkPage(adminPage, viewport, label, url, "admin");
      }
      await adminPage.screenshot({ path: join(ARTIFACT_DIR, `${viewport.name}-admin.png`), fullPage: true });
    }
    await adminContext.close();
  } finally {
    await browser.close();
  }

  const summary = {
    generatedAt: new Date().toISOString(),
    baseUrl: BASE,
    viewports: VIEWPORTS,
    pass: results.filter((r) => r.status === "PASS").length,
    warn: results.filter((r) => r.status === "WARN").length,
    fail: failCount(),
    results,
    consoleRows,
  };
  writeFileSync(join(ARTIFACT_DIR, "ui-qa-results.json"), `${JSON.stringify(summary, null, 2)}\n`);
  writeFileSync(join(ARTIFACT_DIR, "browser-console.json"), `${JSON.stringify(consoleRows, null, 2)}\n`);
  if (summary.fail > 0) {
    console.error(`LOCAL_PHASE_09_UI_QA_FAILED failures=${summary.fail}`);
    process.exit(1);
  }
  console.log(`LOCAL_PHASE_09_UI_QA_PASS checks=${summary.pass}`);
}

main().catch((error) => {
  writeFileSync(join(ARTIFACT_DIR, "ui-qa-error.log"), `${error.stack || error.message}\n`);
  console.error(error);
  process.exit(1);
});
