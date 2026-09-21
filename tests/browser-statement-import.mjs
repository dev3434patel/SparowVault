import assert from "node:assert/strict";
import { chromium, expect } from "@playwright/test";
import { readFile, mkdir } from "node:fs/promises";

export async function testStatementBrowser({ frontend, apiBase, auth, check: recordCheck, directory, artifactMode = false }) {
  await mkdir(`${directory}/screenshots`, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
  // A built artifact must never reach the user's live/local database or a third-party service.
  const allowedOrigins = [new URL(frontend).origin, new URL(apiBase).origin];
  const htaccess = await readFile(".htaccess", "utf8");
  const csp = htaccess.match(/Header always set Content-Security-Policy "([\s\S]*?)"/)?.[1].replace(/\\\s*\n\s*/g, " ");
  assert.ok(csp, "Artifact CSP must be read from the deployment policy");
  await context.route("**/*", async route => {
    const origin = new URL(route.request().url()).origin;
    if (!allowedOrigins.includes(origin)) return route.abort();
    if (artifactMode && origin === new URL(frontend).origin && route.request().method() === "GET") {
      const response = await route.fetch();
      return route.fulfill({ response, headers: { ...response.headers(), "content-security-policy": csp } });
    }
    return route.continue();
  });
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  const check = (title, run) => recordCheck(title, async () => {
    try { await run(); }
    catch (error) {
      const body = await page.locator("body").innerText().catch(() => "");
      await page.screenshot({ path: `${directory}/screenshots/failed-${title.replace(/[^a-z0-9]+/gi, "-")}.png` }).catch(() => undefined);
      await page.goto(frontend, { waitUntil: "networkidle" });
      throw new Error(`${error.message}\nSynthetic fixture UI: ${body.slice(-6000)}`);
    }
  });
  const errors = [];
  const imports = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("request", request => { if (request.url().includes("/api/import/statement.php")) imports.push(request.postData()); });
  try {
    await page.goto(frontend);
    await page.locator("input").first().fill(auth.user.username);
    await page.locator('input[type="password"]').first().fill("583921");
    await page.locator('form button[type="submit"]').click();
    await expect(page.getByRole("button", { name: "Upload bank statement", exact: true })).toBeVisible();
    const fixture = name => `tests/fixtures/statements/${name}`;
    async function open(name, bank = "auto") {
      await page.getByRole("button", { name: "Upload bank statement", exact: true }).click();
      await page.getByLabel("Statement bank", { exact: true }).selectOption(bank);
      await expect(page.getByLabel("Statement account", { exact: true }).locator("option[value='statement-bank']")).toHaveCount(1);
      await page.getByLabel("Statement account", { exact: true }).selectOption("statement-bank");
      await page.getByLabel("Statement PDF", { exact: true }).setInputFiles(fixture(name));
      await page.getByRole("button", { name: "Analyze statement", exact: true }).click();
    }
    async function close() {
      await page.getByRole("button", { name: "Close", exact: true }).click();
      const confirm = page.getByRole("button", { name: "Close review", exact: true });
      if (await confirm.isVisible()) await confirm.click();
      await expect(page.getByRole("dialog", { name: "Bank Statement", exact: true })).toHaveCount(0);
    }
    await check("statement browser: encrypted PDF asks for password, rejects wrong password, extracts with correct one", async () => {
      await open("hdfc-locked.pdf", "hdfc");
      await expect(page.getByLabel("PDF password", { exact: true })).toBeVisible();
      await page.getByLabel("PDF password", { exact: true }).fill("wrong");
      await page.getByRole("button", { name: "Unlock PDF", exact: true }).click();
      await expect(page.getByText("Incorrect PDF password.", { exact: false })).toBeVisible();
      await page.getByLabel("PDF password", { exact: true }).fill("FixtureOnly42!");
      await page.getByRole("button", { name: "Unlock PDF", exact: true }).click();
      await expect(page.getByText("Arithmetic matched", { exact: true })).toBeVisible({ timeout: 20000 });
      await expect(page.locator("[data-statement-row]")).toHaveCount(3);
      await expect(page.getByLabel("PDF password", { exact: true })).toHaveCount(0);
      assert.equal(imports.length, 0);
      await page.getByRole("button", { name: "View source PDF", exact: true }).click();
      await expect(page.locator("canvas[aria-label='Original statement page 1']")).toBeVisible();
      await expect.poll(async () => page.locator("canvas[aria-label='Original statement page 1']").evaluate(canvas => { const values = canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height).data; let dark = 0; for (let i = 0; i < values.length; i += 4) if (values[i + 3] > 0 && values[i] < 220) dark++; return dark; })).toBeGreaterThan(100);
      await page.getByRole("button", { name: "Zoom in PDF", exact: true }).click();
      await expect(page.getByText("150%", { exact: true })).toBeVisible();
      await page.getByRole("button", { name: "Zoom out PDF", exact: true }).click();
      await expect(page.getByText("Welcome back, Atomic fixture", { exact: true })).toBeHidden({ timeout: 7000 });
      await page.screenshot({ path: `${directory}/screenshots/statement-desktop.png`, fullPage: true });
    });
    await check("statement browser: mobile review is contained and header upload remains reachable", async () => {
      for (const width of [768, 390, 360]) {
        await page.setViewportSize({ width, height: 900 });
        const box = await page.getByRole("dialog", { name: "Bank Statement", exact: true }).boundingBox();
        assert.ok(box.x >= 0 && box.x + box.width <= width + 1);
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
        await page.screenshot({ path: `${directory}/screenshots/statement-${width}.png`, fullPage: true });
      }
      await page.setViewportSize({ width: 1440, height: 1100 });
    });
    await check("statement browser: confirmed decisions import correct amounts and no PDF/password leaves the browser", async () => {
      await page.getByLabel("Purpose row 3", { exact: true }).selectOption("expense");
      await page.getByLabel("Category row 3", { exact: true }).selectOption("statement-other");
      await page.getByLabel("Scope for selected rows", { exact: true }).selectOption("personal");
      await page.getByRole("button", { name: "Confirm selected", exact: true }).click();
      await page.getByLabel("INR account and source balances confirmed", { exact: true }).check();
      await page.getByRole("button", { name: "Import reviewed", exact: true }).click();
      await page.getByRole("dialog").filter({ hasText: "Import 3 reviewed transactions?" }).getByRole("button", { name: "Import reviewed", exact: true }).click();
      await expect(page.getByText(/3 imported \/ 0 already imported \/ 0 excluded/)).toBeVisible();
      assert.equal(imports.length, 1); const payload = JSON.parse(imports[0]);
      assert.equal(payload.rows[0].creditPaise, 5000000); assert.equal(payload.rows[1].debitPaise, 50050);
      assert.ok(!imports[0].includes("FixtureOnly42!")); assert.ok(!imports[0].includes("%PDF-")); assert.ok(!imports[0].includes("hdfc-locked.pdf"));
      const downloadWait = page.waitForEvent("download"); await page.getByRole("button", { name: "Download statement review", exact: true }).click();
      const download = await downloadWait; const review = JSON.parse(await readFile(await download.path(), "utf8"));
      assert.equal(review.importResult.imported, 3); assert.equal(review.analysis.rows.length, 3);
      assert.ok(review.importResult.importSourceId);
      assert.ok(review.exportBundle?.sourceDocuments?.length >= 1);
      await page.getByRole("button", { name: "Done", exact: true }).click();
    });
    await check("statement browser: all five synthetic bank headings and multipage statements extract", async () => {
      for (const bank of ["kotak", "hdfc", "sbi", "indusind", "axis", "multipage"]) {
        await open(`${bank}.pdf`);
        await expect(page.getByText("Arithmetic matched", { exact: true })).toBeVisible();
        await expect(page.locator("[data-statement-row]")).toHaveCount(3);
        await expect(page.getByLabel("Include row 1", { exact: true })).not.toBeChecked();
        await close();
      }
    });
    await check("statement browser: numbered Kotak export resolves period, headerless continuation and independent summary", async () => {
      await open("kotak-numbered.pdf");
      await expect(page.getByText("Arithmetic matched", { exact: true })).toBeVisible();
      await expect(page.getByText("2025-04-01 to 2026-03-31 / 4 transactions / 4 pages", { exact: true })).toBeVisible();
      await expect(page.getByLabel("Statement opening balance", { exact: true })).toHaveValue("1000.00");
      await expect(page.getByLabel("Statement closing balance", { exact: true })).toHaveValue("3949.75");
      await expect(page.locator("[data-statement-row]")).toHaveCount(4);
      await page.getByLabel("Statement month", { exact: true }).selectOption("2026-03");
      await expect(page.locator("[data-statement-row]")).toHaveCount(2);
      const downloadWait = page.waitForEvent("download");
      await page.getByRole("button", { name: "Download statement review", exact: true }).click();
      const review = JSON.parse(await readFile(await (await downloadWait).path(), "utf8"));
      assert.equal(review.analysis.parserVersion, "statement-text-v2");
      assert.deepEqual(review.analysis.rows.map(row => [row.debitPaise, row.creditPaise, row.balancePaise]), [[0, 500000, 600000], [10025, 0, 589975], [200000, 0, 389975], [0, 5000, 394975]]);
      await close();
    });
    await check("statement browser: local OCR extracts clean and encrypted scanned statements with mandatory review", async () => {
      for (const name of ["ocr-clean.pdf", "ocr-locked.pdf"]) {
        await open(name, "kotak");
        if (name.includes("locked")) {
          await expect(page.getByLabel("PDF password", { exact: true })).toBeVisible();
          await page.getByLabel("PDF password", { exact: true }).fill("FixtureOnly42!");
          await page.getByRole("button", { name: "Unlock PDF", exact: true }).click();
        }
        await expect(page.getByText("Arithmetic matched", { exact: true })).toBeVisible({ timeout: 120000 });
        await expect(page.locator("[data-statement-row]")).toHaveCount(3);
        const downloadWait = page.waitForEvent("download");
        await page.getByRole("button", { name: "Download statement review", exact: true }).click();
        const review = JSON.parse(await readFile(await (await downloadWait).path(), "utf8"));
        assert.equal(review.analysis.parserVersion, "statement-ocr-v1");
        assert.deepEqual(review.analysis.ocrPages, [1]);
        assert.deepEqual(review.analysis.rows.map(row => [row.date, row.debitPaise, row.creditPaise, row.balancePaise]), [["2026-08-01", 0, 5000000, 6000000], ["2026-08-02", 50050, 0, 5949950], ["2026-08-03", 100000, 0, 5849950]]);
        const sourceReview = page.getByLabel("OCR dates, amounts and row completeness verified against the original PDF", { exact: true });
        await expect(sourceReview).not.toBeChecked();
        await expect(page.getByRole("button", { name: "Import reviewed", exact: true })).toBeDisabled();
        await sourceReview.check();
        await page.screenshot({ path: `${directory}/screenshots/${name}.png`, fullPage: true });
        await close();
      }
      assert.equal(imports.length, 1, "OCR analysis must never auto-post financial entries");
    });
    await check("statement browser: unsupported scanned content is blocked without guessed financial entries", async () => {
      await open("scanned.pdf", "hdfc");
      await expect(page.getByText("No transaction rows were extracted.", { exact: false })).toBeVisible({ timeout: 120000 });
      await expect(page.getByText("Unavailable", { exact: true })).toHaveCount(2);
      await expect(page.getByText("Selected rows reviewed", { exact: true })).toHaveCount(0);
      await expect(page.getByRole("button", { name: "Import reviewed", exact: true })).toBeDisabled();
      await close();
    });
    await check("contribution browser: original-expense action posts a linked return and displays net cost", async () => {
      await page.goto(frontend + "/transactions", { waitUntil: "networkidle" });
      const originalRow = page.getByRole("row").filter({ hasText: "Shared dinner UI fixture" });
      await originalRow.getByRole("button", { name: "Record contribution return", exact: true }).click();
      const dialog = page.getByRole("dialog", { name: "Contribution return", exact: true });
      await expect(dialog.getByLabel("Original shared expense", { exact: true })).toHaveValue("ui-shared-meal");
      await dialog.getByLabel("Transaction amount", { exact: true }).fill("401");
      await expect(dialog.getByRole("button", { name: "Add Transaction", exact: true })).toBeDisabled();
      await dialog.getByLabel("Transaction amount", { exact: true }).fill("200");
      for (const width of [1440, 390]) {
        await page.setViewportSize({ width, height: 1000 });
        const metrics = await dialog.evaluate(element => ({ client: element.clientWidth, scroll: element.scrollWidth }));
        assert.ok(metrics.scroll <= metrics.client + 1, `Contribution form overflow at ${width}`);
        await page.screenshot({ path: `${directory}/screenshots/contribution-${width}.png`, fullPage: true });
      }
      await page.setViewportSize({ width: 1440, height: 1100 });
      const responseWait = page.waitForResponse(response => response.url().includes("/api/data/entity.php?collection=transactions") && response.request().method() === "POST");
      await dialog.getByRole("button", { name: "Add Transaction", exact: true }).click();
      const response = await responseWait;
      assert.equal(response.status(), 201, await response.text());
      const posted = JSON.parse(response.request().postData()).data;
      assert.equal(posted.type, "refund"); assert.equal(posted.transactionIntent, "expense_contribution"); assert.equal(posted.linkedOriginalTransactionId, "ui-shared-meal"); assert.equal(posted.amountPaise, 20000);
      await expect(dialog).toHaveCount(0);
      await expect(originalRow.getByText(/Recovered.*200.*Net.*200/)).toBeVisible();
      await page.goto(frontend + "/income", { waitUntil: "networkidle" });
      await expect(page.getByText("Contribution: Shared dinner UI fixture", { exact: true })).toHaveCount(0);
    });
    await check("statement browser: malformed non-PDF is rejected and no uncaught errors occurred", async () => {
      await page.getByRole("button", { name: "Upload bank statement", exact: true }).click();
      await page.getByLabel("Statement account", { exact: true }).selectOption("statement-bank");
      await page.getByLabel("Statement PDF", { exact: true }).setInputFiles({ name: "bad.pdf", mimeType: "application/pdf", buffer: Buffer.from("not a PDF") });
      await page.getByRole("button", { name: "Analyze statement", exact: true }).click();
      await expect(page.getByText("The selected file is not a PDF.", { exact: true })).toBeVisible();
      assert.deepEqual(errors, []);
    });
  } finally { await browser.close(); }
}
