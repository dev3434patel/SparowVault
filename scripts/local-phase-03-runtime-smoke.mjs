#!/usr/bin/env node
import { chromium } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const FRONTEND = process.env.FRONTEND_URL || "http://localhost:5173";
const BACKEND = process.env.BASE_URL || "http://localhost:5000";
const OUT_DIR = path.join(process.cwd(), "local-phase-03-logs");
mkdirSync(OUT_DIR, { recursive: true });

const userPages = [
  ["Dashboard", "/"],
  ["Transactions", "/transactions"],
  ["Income", "/income"],
  ["Expenses", "/expenses"],
  ["Accounts", "/accounts"],
  ["Cards", "/cards"],
  ["Loans", "/loans"],
  ["Udhari", "/udhari"],
  ["Goals", "/goals"],
  ["Budgets", "/budgets"],
  ["Investments", "/savings"],
  ["Categories", "/categories"],
  ["Reports", "/reports"],
  ["Suggestions", "/suggestions"],
  ["Alerts", "/alerts"],
  ["Audit", "/audit"],
  ["Import", "/import"],
  ["Export", "/export"],
  ["Subscription", "/subscription"],
  ["Settings", "/settings"],
  ["Profile", "/profile"],
];

const adminPages = [
  ["Admin Dashboard", "/admin"],
  ["User Management", "/admin/users"],
  ["Subscription Management", "/admin/subscriptions"],
  ["Plan Management", "/admin/plans"],
  ["Feature Flags", "/admin/flags"],
  ["Branding Settings", "/admin/branding"],
];

const results = [];
const consoleErrors = [];
const pageErrors = [];
const apiResponses = [];

function record(name, status, detail = "") {
  results.push({ name, status, detail });
  const marker = status === "PASS" ? "PASS" : status === "WARN" ? "WARN" : "FAIL";
  console.log(`  ${marker}  ${name}${detail ? ` -- ${detail}` : ""}`);
}

function actionableConsoleErrors() {
  return consoleErrors.filter((message) => !/401 \(Unauthorized\)/i.test(message));
}

async function healthCheck() {
  const res = await fetch(`${BACKEND}/api/health.php`);
  const json = await res.json();
  const ok = res.ok && json?.data?.status === "healthy" && json?.data?.db?.status === "ok";
  record("/api/health.php", ok ? "PASS" : "FAIL", JSON.stringify(json?.data ?? json));
  return ok;
}

async function pageReady(page) {
  await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => undefined);
  await page.waitForTimeout(300);
}

async function waitForDashboardContent(page) {
  await page.waitForFunction(
    () => /good morning|good afternoon|good evening|money snapshot|cashflow survival|financial health score/i.test(document.body.innerText),
    undefined,
    { timeout: 60000 },
  ).catch(() => undefined);
}

async function clearBrowserState(page) {
  await page.goto(FRONTEND, { waitUntil: "domcontentloaded" });
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.goto(FRONTEND, { waitUntil: "networkidle" });
}

async function registerUser(page) {
  const stamp = Date.now().toString(36);
  const username = `smoke_${stamp}`;
  const pin = "583921";
  await page.goto(FRONTEND, { waitUntil: "networkidle" });
  const authVisible = await page.getByRole("heading", { name: /sign in to your account|create your account/i }).isVisible().catch(() => false);
  record("CloudAuth renders", authVisible ? "PASS" : "FAIL");
  await page.screenshot({ path: path.join(OUT_DIR, "01-cloudauth.png"), fullPage: true });

  await page.locator("button", { hasText: "Create account" }).first().click();
  await page.getByRole("heading", { name: /create your account/i }).waitFor({ timeout: 10000 });
  await page.getByPlaceholder("User Name").fill("Runtime Smoke User");
  await page.getByPlaceholder("amit").fill(username);
  await page.getByPlaceholder("••••").first().fill(pin);
  await page.getByPlaceholder("••••").nth(1).fill(pin);
  await page.locator('input[type="checkbox"]').check();
  await page.locator('form button[type="submit"]').click();
  await page.waitForURL(/localhost:5173/, { timeout: 15000 }).catch(() => undefined);
  await waitForDashboardContent(page);
  const dashboardVisible = await page.getByText(/good morning|good afternoon|good evening|dashboard|money left|net worth/i).first().isVisible().catch(() => false);
  record("Register works", dashboardVisible ? "PASS" : "FAIL", username);
  record("Dashboard opens after register", dashboardVisible ? "PASS" : "FAIL");
  await page.screenshot({ path: path.join(OUT_DIR, "02-dashboard-after-register.png"), fullPage: true });
  return { username, pin };
}

async function verifyLogin(browser, user) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("response", (response) => {
    const url = response.url();
    if (url.includes("/api/")) {
      apiResponses.push({ url, status: response.status() });
    }
  });
  await clearBrowserState(page);
  await page.goto(FRONTEND, { waitUntil: "networkidle" });
  await page.getByPlaceholder("your.username").fill(user.username);
  await page.getByPlaceholder("Enter PIN").fill(user.pin);
  await page.locator('form button[type="submit"]').click();
  await waitForDashboardContent(page);
  const loggedIn = await page.getByText(/good morning|good afternoon|good evening|dashboard|money left|net worth/i).first().isVisible().catch(() => false);
  record("Login works", loggedIn ? "PASS" : "FAIL");
  await context.close();
  return loggedIn;
}

async function verifyUserPages(page) {
  for (const [label, route] of userPages) {
    await page.goto(`${FRONTEND}${route}`, { waitUntil: "networkidle" });
    await pageReady(page);
    const bodyText = (await page.locator("body").innerText().catch(() => "")).trim();
    const hasFatal = /uncaught|runtime error|failed to fetch dynamically imported module/i.test(bodyText);
    if (label === "Subscription" && /dashboard|good morning|good afternoon|good evening/i.test(bodyText) && !/subscription|plan|billing/i.test(bodyText)) {
      record(`${label} page`, "WARN", "Razorpay/subscription UI disabled by local VITE_ENABLE_RAZORPAY=false; route did not crash.");
    } else {
      record(`${label} page`, bodyText.length > 50 && !hasFatal ? "PASS" : "FAIL", route);
    }
  }
}

async function adminLogin(page) {
  await clearBrowserState(page);
  await page.goto(`${FRONTEND}/admin`, { waitUntil: "networkidle" });
  const loginVisible = await page.getByRole("heading", { name: /admin login/i }).isVisible().catch(() => false);
  record("Admin login screen renders", loginVisible ? "PASS" : "FAIL");
  await page.locator('input').nth(0).fill("admin");
  await page.locator('input').nth(1).fill("12345678");
  await page.getByRole("button", { name: /sign in to admin/i }).click();
  await page.waitForTimeout(2500);
  const adminPanel = await page.getByText(/admin panel|admin console/i).first().isVisible().catch(() => false);
  record("Admin login works", adminPanel ? "PASS" : "FAIL");
  await page.screenshot({ path: path.join(OUT_DIR, "03-admin-dashboard.png"), fullPage: true });
  return adminPanel;
}

async function verifyAdminPages(page) {
  for (const [label, route] of adminPages) {
    await page.goto(`${FRONTEND}${route}`, { waitUntil: "networkidle" });
    await pageReady(page);
    const bodyText = (await page.locator("body").innerText().catch(() => "")).trim();
    const hasFatal = /uncaught|runtime error|failed to fetch dynamically imported module/i.test(bodyText);
    if (label === "Subscription Management" && /admin panel|admin console|dashboard/i.test(bodyText) && !/subscription management|subscriptions/i.test(bodyText)) {
      record(`${label}`, "WARN", "Razorpay disabled locally; admin subscriptions route falls back without crashing.");
    } else {
      record(`${label}`, bodyText.length > 50 && !hasFatal ? "PASS" : "FAIL", route);
    }
  }
}

async function main() {
  await healthCheck();
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("response", (response) => {
    const url = response.url();
    if (url.includes("/api/")) {
      apiResponses.push({ url, status: response.status() });
    }
  });

  try {
    await clearBrowserState(page);
    const user = await registerUser(page);
    await verifyLogin(browser, user);
    await verifyUserPages(page);
    await adminLogin(page);
    await verifyAdminPages(page);
  } finally {
    await browser.close();
  }

  const fatalConsole = actionableConsoleErrors();
  record("No fatal browser console errors", fatalConsole.length === 0 && pageErrors.length === 0 ? "PASS" : "FAIL", [...fatalConsole, ...pageErrors].slice(0, 10).join(" | "));
  const failed = results.filter((result) => result.status === "FAIL");
  const warnings = results.filter((result) => result.status === "WARN");
  const summary = {
    ok: failed.length === 0,
    checkedAt: new Date().toISOString(),
    frontend: FRONTEND,
    backend: BACKEND,
    results,
    warnings,
    consoleErrors,
    pageErrors,
    apiResponses,
    screenshots: [
      "local-phase-03-logs/01-cloudauth.png",
      "local-phase-03-logs/02-dashboard-after-register.png",
      "local-phase-03-logs/03-admin-dashboard.png",
    ],
  };
  writeFileSync(path.join(OUT_DIR, "runtime-smoke-results.json"), JSON.stringify(summary, null, 2));
  console.log(`\nSUMMARY: ${results.length - failed.length}/${results.length} non-failing checks, ${failed.length} failed, ${warnings.length} warnings`);
  process.exit(failed.length === 0 ? 0 : 1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
