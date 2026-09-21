import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { chromium, expect } from "@playwright/test";

const path = process.argv[2];
if (!path) throw new Error("Supply a local Kotak numbered PDF path; private PDFs are never CI fixtures.");
const frontend = process.env.VALIDATION_FRONTEND || "http://127.0.0.1:5178";
const api = process.env.VALIDATION_API || "http://127.0.0.1:8088";
for (const address of [frontend, api]) assert.ok(["127.0.0.1", "localhost"].includes(new URL(address).hostname), "Local validation only");
const normalize = value => typeof value === "string" ? value.replace(/\s+/g, " ").trim() : value;
const hash = bytes => createHash("sha256").update(bytes).digest("hex");
const originalHash = hash(await readFile(path));
const oracle = JSON.parse(execFileSync(process.env.PYTHON || "python3", ["tests/fixtures/statements/check-kotak-source.py", path], { encoding: "utf8", maxBuffer: 8_000_000 }));
const browser = await chromium.launch({ headless: true });
const errors = [];
let importRequests = 0;
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const origins = [new URL(frontend).origin, new URL(api).origin];
  await context.route("**/*", route => {
    if (route.request().url().includes("/api/import/")) { importRequests++; return route.abort(); }
    return origins.includes(new URL(route.request().url()).origin) ? route.continue() : route.abort();
  });
  const page = await context.newPage();
  page.on("pageerror", error => errors.push(error.message));
  await page.goto(frontend);
  await page.locator("input").first().fill("review_demo");
  await page.locator('input[type="password"]').first().fill("583921");
  await page.locator('form button[type="submit"]').click();
  await page.getByRole("button", { name: "Upload bank statement", exact: true }).click();
  await page.getByLabel("Statement account", { exact: true }).selectOption("preview-statement-bank");
  await page.getByLabel("Statement PDF", { exact: true }).setInputFiles(path);
  const started = Date.now();
  await page.getByRole("button", { name: "Analyze statement", exact: true }).click();
  await expect(page.getByText("Arithmetic matched", { exact: true })).toBeVisible({ timeout: 70000 });
  const durationMs = Date.now() - started;
  const downloadWait = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download statement review", exact: true }).click();
  const downloaded = await downloadWait;
  const review = JSON.parse(await readFile(await downloaded.path(), "utf8"));
  await downloaded.delete();
  const actual = review.analysis;
  assert.equal(actual.bank, "kotak"); assert.equal(actual.pageCount, oracle.pageCount);
  assert.equal(actual.rows.length, oracle.rows.length);
  assert.ok(actual.openingPaise === oracle.openingPaise, "Independent opening balance differs");
  assert.ok(actual.closingPaise === oracle.closingPaise, "Independent closing balance differs");
  assert.deepEqual(actual.issues, []); assert.deepEqual(actual.rows.flatMap(row => row.issues), []);
  const fields = ["page", "date", "description", "reference", "debitPaise", "creditPaise", "balancePaise"];
  const mismatches = [];
  for (const [index, row] of oracle.rows.entries()) for (const field of fields) {
    if (normalize(row[field]) !== normalize(actual.rows[index][field])) mismatches.push({ row: index + 1, field });
  }
  assert.equal(mismatches.length, 0, JSON.stringify({ fieldMismatches: mismatches.slice(0, 30) }));
  const months = [...new Set(actual.rows.map(row => row.date.slice(0, 7)))].sort();
  for (const month of months) {
    await page.getByLabel("Statement month", { exact: true }).selectOption(month);
    const expected = actual.rows.filter(row => row.date.startsWith(month));
    await expect(page.locator("[data-statement-row]")).toHaveCount(Math.min(expected.length, 25));
    await expect(page.getByText(`${expected.length} matching rows / page 1 of ${Math.ceil(expected.length / 25)}`, { exact: true })).toBeVisible();
  }
  await page.getByLabel("Statement month", { exact: true }).selectOption("");
  if (actual.rows.length > 25) {
    await page.getByRole("button", { name: "Next transaction page", exact: true }).click();
    await expect(page.locator('[data-statement-row="26"]')).toBeVisible();
  }
  await page.setViewportSize({ width: 390, height: 900 });
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
  assert.equal(importRequests, 0); assert.deepEqual(errors, []);
  assert.equal(hash(await readFile(path)), originalHash, "Original PDF must remain unchanged");
  // Only counts and pass/fail are reported, never private source fields or financial amounts.
  console.log(JSON.stringify({ verifiedAt: new Date().toISOString(), parserVersion: actual.parserVersion, pages: actual.pageCount, rows: actual.rows.length, fieldsPerRow: fields.length, fieldMismatches: mismatches.length, openingAndClosingMatched: true, monthsChecked: months.length, paginationChecked: true, mobileOverflow: false, sourceUnchanged: true, importRequests, durationMs }, null, 2));
} finally { await browser.close(); }
