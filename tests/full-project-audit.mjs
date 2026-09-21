import assert from "node:assert/strict";
import { chromium, expect } from "@playwright/test";
import { mkdir, readFile, writeFile, readdir } from "node:fs/promises";
import { spawn } from "node:child_process";
import { createHmac } from "node:crypto";
import * as XLSX from "xlsx";

// Audit assertions express desired behavior, including currently failing product requirements.
// Only called from atomic-writes-e2e's unique, disposable database/runtime.
const entity = (collection, id) => `/api/data/${id ? "entity-item" : "entity"}.php?collection=${collection}${id ? `&id=${encodeURIComponent(id)}` : ""}`;
async function files(root) {
  const out = [];
  for (const item of await readdir(root, { withFileTypes: true })) {
    if (item.name.startsWith("._")) continue;
    const path = `${root}/${item.name}`;
    if (item.isDirectory()) out.push(...await files(path)); else out.push(path);
  }
  return out;
}

export async function testFullAuditApi({ req, user, create, db, check, base, env, directory }) {
  assert.match(env.DB_NAME, /^sv_write_test_\d+_\d+$/);
  await mkdir(`${directory}/audit`, { recursive: true });
  const auth = await user("fa"), other = await user("fb"), adminSeed = await user("fad");
  await db.query("UPDATE users SET role='admin' WHERE id=?", [adminSeed.user.id]);
  const adminLogin = await req("/api/auth/admin-login.php", "POST", { username: adminSeed.user.username, pin: "583921" });
  assert.equal(adminLogin.status, 200);
  const admin = adminLogin.data;
  const account = { id: "audit-bank", name: "Audit bank", type: "bank", openingBalance: 10000, openingBalancePaise: 1000000, icon: "wallet", color: "#16a34a" };
  const category = { id: "audit-food", name: "Audit Food", appliesTo: "expense", icon: "tag", color: "#dc2626" };
  const tx = { id: "audit-dinner", type: "expense", date: "2026-09-01T12:00:00.000Z", amount: 400, amountPaise: 40000, accountId: account.id, categoryId: category.id, paymentMode: "upi", businessOrPersonal: "personal", description: "Audit dinner", merchantOrPerson: "Audit Restaurant" };
  for (const [collection, row] of [["accounts", account], ["categories", category], ["transactions", tx]]) assert.equal((await create(auth, collection, row)).status, 201);
  const collectionKeys = Object.keys((await req("/api/cloud/sync/pull.php", "GET", undefined, auth)).data.collections);
  const inventory = { date: new Date().toISOString(), apiFiles: await files("api"), pageFiles: await files("src/components/pages"), collections: collectionKeys };
  await writeFile(`${directory}/audit/inventory.json`, JSON.stringify(inventory, null, 2));
  const matrix = [];
  const adminEndpoints = [
    ["dashboard", "GET"], ["users", "GET"], ["plans", "GET"], ["subscriptions", "GET"], ["feature-flags", "GET"], ["settings", "GET"],
    ["users-toggle-active", "POST"], ["users-reset-pin", "POST"], ["users-assign-plan", "POST"],
  ];
  for (const [name, method] of adminEndpoints) {
    const path = `/api/admin/${name}.php`;
    const body = method === "GET" ? undefined : { userId: other.user.id, pin: "675829", newPin: "675829", planId: 1 };
    for (const [role, session] of [["anonymous", undefined], ["user", auth]]) {
      await check(`audit RBAC: ${role} denied ${method} ${path}`, async () => {
        const result = await req(path, method, body, session);
        matrix.push({ path, method, role, status: result.status, code: result.code });
        assert.ok([401, 403].includes(result.status), `Expected 401/403, got ${result.status}`);
      });
    }
    if (method === "GET") await check(`audit admin: GET ${path}`, async () => {
      const result = await req(path, method, undefined, admin);
      matrix.push({ path, method, role: "admin", status: result.status });
      assert.equal(result.status, 200);
    });
  }
  for (const collection of collectionKeys) await check(`audit collection read: ${collection} owner isolation`, async () => {
    const path = entity(collection) + `&userId=${auth.user.id}`;
    const own = await req(path, "GET", undefined, auth), foreign = await req(path, "GET", undefined, other), anon = await req(path);
    matrix.push({ collection, own: own.status, foreign: foreign.status, anonymous: anon.status });
    assert.equal(own.status, 200); assert.ok(Array.isArray(own.data));
    assert.equal(foreign.status, 403); assert.equal(anon.status, 401);
  });
  await check("audit input: malformed JSON and unsupported collection rejected", async () => {
    const response = await fetch(base + entity("categories"), { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${auth.token}` }, body: "{broken", signal: AbortSignal.timeout(15000) });
    assert.equal(response.status, 400);
    assert.equal((await req(entity("users"), "POST", { userId: auth.user.id, data: { role: "admin" } }, auth)).status, 400);
  });
  await check("audit security: stored text remains data and SQL metacharacters do not bypass ownership", async () => {
    const text = "<img src=x onerror=alert(1)> ' OR 1=1 --";
    const row = await create(auth, "categories", { ...category, id: "audit-text", name: text });
    assert.equal(row.status, 201); assert.equal(row.data.name, text);
    assert.equal((await req(entity("categories", "' OR 1=1 --"), "GET", undefined, other)).status, 404);
  });
  await check("audit concurrency: stale versionless PATCH must not overwrite a newer edit", async () => {
    assert.equal((await req(entity("categories", category.id), "PATCH", { patch: { name: "Newer Food" }, expectedVersion: 1 }, auth)).status, 200);
    const stale = await req(entity("categories", category.id), "PATCH", { patch: { name: "Stale Food" } }, auth);
    assert.ok([409, 428].includes(stale.status), `Stale versionless update accepted: ${stale.status}, version=${stale.data?.version}`);
  });
  await check("audit security: client cannot fabricate and erase visible audit history", async () => {
    const forged = await create(auth, "auditLogs", { id: "audit-forged", action: "login", entity: "user", entityId: auth.user.id, detail: "Fabricated security event" });
    const removed = forged.status === 201 ? await req(entity("auditLogs", "audit-forged") + "&hard=1", "DELETE", undefined, auth) : null;
    assert.ok([401, 403, 405, 422].includes(forged.status), `Forged visible audit accepted=${forged.status}; erase=${removed?.status}. Server user_audit_logs is a separate table.`);
  });
  for (const [collection, data] of [
    ["accounts", { id: "bad-account", name: 123, type: "not_an_account_type", openingBalance: 1 }],
    ["loans", { id: "bad-loan", lender: "Invalid fixture", principalPaise: 10000, tenureMonths: -12, annualInterestRate: "not-a-rate", startDate: "not-a-date" }],
    ["goalContribs", { id: "orphan-goal-contrib", goalId: "missing-goal", amount: 1, amountPaise: 100, date: "2026-09-01" }],
    ["emis", { id: "orphan-emi", loanId: "missing-loan", amount: 1, amountPaise: 100, dueDate: "2026-09-01", status: "paid" }],
  ]) await check(`audit schema/reference: invalid ${collection} rejected`, async () => {
    const response = await create(other, collection, data);
    assert.equal(response.status, 422, `Invalid ${collection} persisted with HTTP ${response.status}`);
  });
  await check("audit export API: correct PIN exports own collections without credentials", async () => {
    const result = await req("/api/auth/data-export.php", "POST", { pin: "583921", userId: other.user.id }, auth);
    assert.equal(result.status, 200); assert.equal(result.data.user.username, auth.user.username);
    assert.ok(JSON.stringify(result.data).includes("audit-dinner"));
    assert.ok(!/pin_hash|pin_salt|recovery_answer_hash|credential_tag/.test(JSON.stringify(result.data)));
  });
  await check("audit export API: incorrect PIN cannot export", async () => {
    assert.equal((await req("/api/auth/data-export.php", "POST", { pin: "111829" }, auth)).status, 401);
  });
  // Safe legacy suites get our disposable DB and server, never their default/shared runtime.
  const legacy = [];
  for (const file of ["api-e2e.mjs", "account-endpoints-e2e.mjs", "phase-04-validation-e2e.mjs", "api-vnext-collections-e2e.mjs", "webhook-replay-e2e.mjs", "webhook-ownership-e2e.mjs"]) {
    await db.query("DELETE FROM api_rate_limits");
    const started = Date.now();
    const process = spawn("node", [`tests/${file}`], { env: { ...env, BASE_URL: base, RAZORPAY_WEBHOOK_SECRET: env.RAZORPAY_WEBHOOK_SECRET || "isolated-full-audit-webhook-secret" }, stdio: "pipe" });
    let output = "";
    process.stdout.on("data", chunk => { output += chunk; }); process.stderr.on("data", chunk => { output += chunk; });
    const timer = setTimeout(() => process.kill("SIGTERM"), 90000);
    const code = await new Promise((resolve, reject) => { process.on("error", reject); process.on("close", resolve); }); clearTimeout(timer);
    await writeFile(`${directory}/audit/legacy-${file}.log`, output);
    legacy.push({ file, exitCode: code, durationMs: Date.now() - started, passLines: (output.match(/\bPASS\b/g) || []).length, failLines: (output.match(/\bFAIL\b/g) || []).length });
    console.log(`AUDIT legacy ${file} exit=${code}`);
  }
  await db.query("DELETE FROM api_rate_limits");
  await check("audit webhook: invalid signature cannot poison a later authentic delivery", async () => {
    const stamp = Date.now();
    const orderId = `order_audit_${stamp}`, eventId = `evt_audit_${stamp}`;
    const [plans] = await db.query("SELECT id FROM plans LIMIT 1"); assert.ok(plans.length);
    const [sub] = await db.query("INSERT INTO subscriptions (user_id,plan_id,status,provider,provider_order_id,created_at,updated_at) VALUES (?,?,'pending','razorpay',?,UTC_TIMESTAMP(),UTC_TIMESTAMP())", [auth.user.id, plans[0].id, orderId]);
    await db.query("INSERT INTO payments (user_id,subscription_id,amount_inr,currency,expected_amount_paise,status,provider,provider_order_id,created_at,updated_at) VALUES (?,?,199.00,'INR',19900,'created','razorpay',?,UTC_TIMESTAMP(),UTC_TIMESTAMP())", [auth.user.id, sub.insertId, orderId]);
    const body = JSON.stringify({ event: "payment.captured", payload: { payment: { entity: { id: `pay_audit_${stamp}`, order_id: orderId, amount: 19900, currency: "INR" } } } });
    const signature = createHmac("sha256", env.RAZORPAY_WEBHOOK_SECRET).update(body).digest("hex");
    const statuses = [];
    for (const sig of ["invalid", signature]) {
      const response = await fetch(base + "/api/payments/razorpay/webhook.php", { method: "POST", headers: { "Content-Type": "application/json", "X-Razorpay-Event-Id": eventId, "X-Razorpay-Signature": sig }, body, signal: AbortSignal.timeout(15000) });
      statuses.push({ status: response.status, body: await response.json() });
    }
    const [payments] = await db.query("SELECT status FROM payments WHERE provider_order_id=?", [orderId]);
    const [events] = await db.query("SELECT signature_valid, processing_status FROM webhook_events WHERE event_id=?", [eventId]);
    await writeFile(`${directory}/audit/webhook-retry.json`, JSON.stringify({ statuses, payment: payments[0], event: events[0] }, null, 2));
    assert.equal(statuses[0].status, 401);
    assert.equal(payments[0].status, "captured", "Authentic retry acknowledged but payment remains unprocessed after invalid first delivery");
  });
  await writeFile(`${directory}/audit/api-matrix.json`, JSON.stringify(matrix, null, 2));
  await writeFile(`${directory}/audit/legacy-results.json`, JSON.stringify(legacy, null, 2));
  await db.query("UPDATE subscriptions SET status='cancelled' WHERE user_id=?", [auth.user.id]);
  await db.query("INSERT INTO subscriptions (user_id,plan_id,status,provider,current_period_start,current_period_end,created_at,updated_at) SELECT ?,id,'active','razorpay',UTC_TIMESTAMP(),DATE_ADD(UTC_TIMESTAMP(),INTERVAL 1 MONTH),UTC_TIMESTAMP(),UTC_TIMESTAMP() FROM plans WHERE code='PRO'", [auth.user.id]);
  await db.query("UPDATE subscriptions SET plan_id=(SELECT id FROM plans WHERE code='PRO' LIMIT 1),status='active',current_period_end=DATE_ADD(UTC_TIMESTAMP(),INTERVAL 1 MONTH) WHERE user_id=?", [auth.user.id]);
  await db.query("UPDATE feature_flags_global SET is_enabled=1 WHERE feature_key IN ('exports','advanced_reports','ca_reports','ai_suggestions')");
  const entitlement = await req("/api/subscriptions/my.php", "GET", undefined, auth);
  await writeFile(`${directory}/audit/browser-entitlement.json`, JSON.stringify({ status: entitlement.status, effectiveFeatures: entitlement.data?.effectiveFeatures }, null, 2));
  assert.equal(entitlement.data?.effectiveFeatures?.exports, true, "Audit fixture must have an enabled export entitlement before testing export UI");
  return { auth, admin, account, category, tx, collectionKeys };
}

export async function testFullAuditBrowser({ frontend, apiBase, fixture, db, check: recordCheck, directory }) {
  const path = `${directory}/audit`;
  await mkdir(`${path}/screenshots`, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, locale: "en-IN", timezoneId: "Asia/Kolkata" });
  await context.route("**/*", route => [new URL(frontend).origin, new URL(apiBase).origin].includes(new URL(route.request().url()).origin) ? route.continue() : route.abort());
  const page = await context.newPage(); page.setDefaultTimeout(10000);
  const errors = [], pages = [], network = [], probes = [];
  page.on("pageerror", error => errors.push({ url: page.url(), message: error.message }));
  page.on("response", response => { if (response.url().includes("/api/")) network.push({ path: new URL(response.url()).pathname, status: response.status(), method: response.request().method() }); });
  const check = (title, run) => recordCheck(title, async () => {
    try { await run(); }
    catch (error) {
      await page.screenshot({ path: `${path}/screenshots/failure-${title.replace(/[^a-z0-9]+/gi, "-")}.png` }).catch(() => undefined);
      throw error;
    }
  });
  async function navigate(route) {
    await page.goto(frontend + route, { waitUntil: "networkidle" });
    await expect(page.locator("main")).toBeVisible();
    await expect(page.getByRole("button", { name: "Upload bank statement", exact: true }).or(page.getByRole("banner").getByText("Admin Panel", { exact: true }))).toBeVisible();
    await expect(page.locator("main h1")).toBeVisible();
    await page.waitForTimeout(250);
  }
  async function login(auth, admin = false) {
    await page.goto(frontend + (admin ? "/admin" : "/"), { waitUntil: "networkidle" });
    await page.locator("input").first().fill(auth.user.username);
    await page.locator('input[type="password"]').first().fill("583921");
    await page.locator('form button[type="submit"]').click();
    if (admin) await expect(page.getByText("Admin Panel", { exact: true })).toBeVisible({ timeout: 20000 });
    else await expect(page.getByRole("button", { name: "Upload bank statement", exact: true })).toBeVisible({ timeout: 20000 });
    await expect.poll(() => page.evaluate(() => !!localStorage.getItem("sv:session"))).toBe(true);
  }
  async function domMetrics() {
    return page.evaluate(() => {
      const visible = el => el.getClientRects().length > 0 && getComputedStyle(el).visibility !== "hidden";
      const name = el => el.getAttribute("aria-label") || (el.getAttribute("aria-labelledby") || "").split(" ").map(id => document.getElementById(id)?.textContent || "").join("").trim() || Array.from(el.labels || []).map(label => label.textContent).join("").trim() || el.getAttribute("title");
      const controls = Array.from(document.querySelectorAll("main input,main select,main textarea,main button,[role=dialog] input,[role=dialog] select,[role=dialog] button")).filter(visible);
      return { overflowPx: document.documentElement.scrollWidth - innerWidth, mainChars: document.querySelector("main")?.textContent?.trim().length || 0,
        headings: Array.from(document.querySelectorAll("main h1,main h2,main h3")).map(el => el.textContent),
        controls: controls.length,
        unnamedInputs: controls.filter(el => ["INPUT", "SELECT", "TEXTAREA"].includes(el.tagName) && el.type !== "hidden" && !name(el)).map(el => ({ tag: el.tagName, type: el.type, placeholder: el.getAttribute("placeholder") })),
        unnamedButtons: controls.filter(el => el.tagName === "BUTTON" && !name(el) && !el.textContent?.trim()).map(el => el.outerHTML.slice(0, 180)),
      };
    });
  }
  try {
    await login(fixture.auth);
    const routes = ["/", "/transactions", "/income", "/expenses", "/categories", "/budgets", "/goals", "/accounts", "/cards", "/loans", "/udhari", "/savings", "/reports", "/suggestions", "/export", "/import", "/bills", "/reconciliation", "/household", "/alerts", "/settings", "/profile", "/audit", "/subscription"];
    for (const width of [1440, 768, 390, 360]) {
      await page.setViewportSize({ width, height: width < 768 ? 844 : 1000 });
      for (const route of routes) await check(`audit UI: ${route} loads at ${width}px`, async () => {
        const before = errors.length, start = Date.now();
        await navigate(route);
        const metrics = await domMetrics();
        pages.push({ route, width, durationMs: Date.now() - start, ...metrics, pageErrors: errors.slice(before) });
        await page.screenshot({ path: `${path}/screenshots/${route.replace(/\//g, "_") || "home"}-${width}.png` });
        assert.ok(metrics.mainChars > 30, "Main content missing/blank"); assert.ok(metrics.overflowPx <= 1, `Document overflow ${metrics.overflowPx}px`);
        assert.equal(errors.length, before, errors.slice(before).map(e => e.message).join("; "));
      });
    }
    await page.setViewportSize({ width: 1440, height: 1000 });
    await check("audit accessibility: account fields have programmatic names and Escape restores focus", async () => {
      await navigate("/accounts");
      const opener = page.locator("main").getByRole("button", { name: "New Account", exact: true }).first();
      await opener.click();
      await expect(page.getByRole("dialog")).toBeVisible();
      const metrics = await domMetrics(); probes.push({ name: "account-dialog-a11y", ...metrics });
      await page.keyboard.press("Escape"); await expect(page.getByRole("dialog")).toHaveCount(0);
      const focused = await opener.evaluate(el => document.activeElement === el);
      probes.push({ name: "account-dialog-focus-return", focused });
      assert.equal(metrics.unnamedInputs.length, 0, JSON.stringify(metrics.unnamedInputs));
      assert.ok(focused, "Dialog did not restore opener focus");
    });
    await check("audit UI workflow: create account, persist reload and edit", async () => {
      await navigate("/accounts"); await page.locator("main").getByRole("button", { name: "New Account", exact: true }).first().click();
      const dialog = page.getByRole("dialog"); await dialog.locator("input").nth(0).fill("Audit UI account");
      await dialog.locator('input[type="number"]').fill("1234.56");
      await dialog.getByRole("button", { name: "Save", exact: true }).click();
      await expect(page.getByRole("dialog")).toHaveCount(0); await navigate("/accounts");
      await expect(page.getByText("Audit UI account", { exact: true })).toBeVisible();
      const result = await page.evaluate(async () => { const { useDataStore } = await import("/src/store/dataStore.ts"); return useDataStore.getState().accounts.find(a => a.name === "Audit UI account"); });
      assert.equal(result.openingBalancePaise, 123456);
      const scope = page.locator("div.rounded-xl").filter({ has: page.getByText("Audit UI account", { exact: true }) }).last();
      // Use the rendered row's actual icon controls, not a direct repository mutation.
      const card = page.getByText("Audit UI account", { exact: true }).locator("xpath=ancestor::div[contains(@class,'group')][1]");
      const buttons = await card.count() ? card.locator("button") : scope.locator("button");
      probes.push({ name: "account-ui-buttons", count: await buttons.count() });
      await buttons.nth(0).click(); await page.getByRole("dialog").locator("input").nth(0).fill("Audit UI account edited");
      await page.getByRole("dialog").getByRole("button", { name: "Save", exact: true }).click();
      await expect(page.getByRole("dialog")).toHaveCount(0);
      await navigate("/accounts"); await expect(page.getByText("Audit UI account edited", { exact: true })).toBeVisible();
    });
    await check("audit reports: independent numeric and accounting export probes", async () => {
      await navigate("/export");
      const results = await page.evaluate(async () => {
        const exp = await import("/src/exports/xlsxExporter.ts");
        const ca = await import("/src/services/caReports.ts");
        const data = (await import("/src/store/dataStore.ts")).useDataStore.getState();
        const auth = (await import("/src/store/authStore.ts")).useAuthStore.getState().currentUser;
        const tx = data.transactions.find(t => t.id === "audit-dinner");
        const ctx = { transactions: [tx], categories: data.categories, accounts: data.accounts, cards: [], budgets: [], goals: [], goalContribs: [], loans: [], emis: [], udhari: [], investments: [], savingsContribs: [], userId: auth.id };
        const loan = { id: "loan-a", userId: auth.id, lender: "Same Bank", principal: 12000, principalPaise: 1200000, annualInterestRate: 12, tenureMonths: 12, emiDueDay: 5, startDate: "2026-01-01", status: "active", loanType: "personal", calculationMethod: "reducing" };
        let collisionError = null;
        try { exp.buildCAWorkbook({ ...ctx, loans: [loan, { ...loan, id: "loan-b" }] }); } catch (e) { collisionError = e.message; }
        const reportCtx = { txs: [tx], events: [], effects: [], accounts: [data.accounts.find(a => a.id === "audit-bank")], cards: [], loans: [], emis: [], goals: [], udharis: [], categories: data.categories };
        const recons = ca.reportAccountReconciliation(reportCtx);
        return { amountType: typeof exp.mapTransactionRow(tx, ctx).Amount, collisionError, reconciliation: recons, calculatedExpensePaise: 40000 };
      });
      probes.push({ name: "finance-export", ...results });
      assert.equal(results.amountType, "number", "XLSX master Amount is a formatted string, not a numeric cell");
    });
    await check("audit CA workbook: two active loans from same lender export without sheet collision", async () => {
      const result = probes.find(p => p.name === "finance-export"); assert.ok(result);
      assert.equal(result.collisionError, null, result.collisionError);
    });
    await check("audit reconciliation: missing external closing balance cannot be marked matched", async () => {
      const result = probes.find(p => p.name === "finance-export"); assert.ok(result);
      assert.ok(result.reconciliation.every(row => row.status !== "matched"), JSON.stringify(result.reconciliation));
    });
    let backup;
    await check("audit profile backup: full snapshot contains all synced collections", async () => {
      await navigate("/export"); await page.getByRole("button", { name: "Download Backup", exact: true }).click();
      await page.getByPlaceholder("Enter PIN", { exact: true }).fill("583921");
      const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Confirm export", exact: true }).click()]);
      backup = JSON.parse(await readFile(await download.path(), "utf8"));
      const omitted = fixture.collectionKeys.filter(key => !(key in backup.collections));
      probes.push({ name: "backup-collections", present: Object.keys(backup.collections), omitted });
      assert.equal(omitted.length, 0, `Full backup omits: ${omitted.join(", ")}`);
    });
    await check("audit CSV: formula-like narration is neutralized in exported file", async () => {
      await navigate("/export");
      const csv = await page.evaluate(async () => {
        const { exportModuleToSheet } = await import("/src/exports/xlsxExporter.ts");
        let contents = "";
        const original = URL.createObjectURL;
        URL.createObjectURL = blob => { void blob.text().then(text => { contents = text; }); return original(blob); };
        try { exportModuleToSheet("Audit", [{ Description: "=1+1", Note: "+1+1" }], "csv"); await new Promise(resolve => setTimeout(resolve, 50)); return contents; }
        finally { URL.createObjectURL = original; }
      });
      probes.push({ name: "csv-formula", content: csv });
      assert.ok(!/(?:^|[,\r\n])"?[=+@]/.test(csv), `Unescaped spreadsheet formula prefix: ${csv}`);
    });
    await check("audit workbook download: generated file opens with expected master row", async () => {
      await navigate("/export");
      const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Download CA Workbook", exact: true }).click()]);
      const wb = XLSX.read(await readFile(await download.path()), { type: "buffer" });
      assert.ok(wb.SheetNames.includes("Transactions_Master"));
      assert.ok(XLSX.utils.sheet_to_json(wb.Sheets.Transactions_Master).some(row => row.VoucherRefId === "audit-dinner"));
      probes.push({ name: "xlsx-download", sheetCount: wb.SheetNames.length, sheets: wb.SheetNames });
    });
    await check("audit backup restore: linked account/category/transaction restored atomically", async () => {
      assert.ok(backup, "Backup download unavailable");
      await navigate("/import");
      const restore = { version: 1, collections: { accounts: [{ ...fixture.account, id: "restore-account", name: "Restore isolated account", userId: "backup-origin" }], categories: [{ ...fixture.category, id: "restore-category", name: "Restore category", userId: "backup-origin" }], transactions: [{ ...fixture.tx, id: "restore-transaction", accountId: "restore-account", categoryId: "restore-category", description: "Restore atomic transaction", userId: "backup-origin" }] } };
      await page.locator('input[type="file"][accept=".json"]').setInputFiles({ name: "synthetic-restore.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(restore)) });
      await page.getByRole("button", { name: "Continue restore", exact: true }).click();
      await expect(page.getByText(/Backup restored|Invalid backup file/).first()).toBeVisible();
      const [rows] = await db.query("SELECT collection_name, payload FROM cloud_collection_rows WHERE user_id=? AND deleted_at IS NULL", [fixture.auth.user.id]);
      const parsed = rows.map(row => ({ collection: row.collection_name, data: JSON.parse(row.payload) }));
      const restored = parsed.filter(row => row.data.name === "Restore isolated account" || row.data.name === "Restore category" || row.data.description === "Restore atomic transaction");
      probes.push({ name: "restore-result", records: restored.map(row => ({ collection: row.collection, id: row.data.id, accountId: row.data.accountId, categoryId: row.data.categoryId })) });
      assert.equal(restored.length, 3, `Restore left ${restored.length}/3 records; missing child means partial restore`);
    });
    await check("audit profile wipe: deletes own profile data without reference-order failure", async () => {
      await navigate("/settings"); await page.getByRole("button", { name: "Wipe all profile data", exact: true }).click();
      await page.getByPlaceholder(`DELETE ${fixture.auth.user.username}`).fill(`DELETE ${fixture.auth.user.username}`);
      const response = page.waitForResponse(r => r.request().method() === "DELETE" && r.url().includes("/api/data/"));
      await page.getByRole("button", { name: "Delete all data", exact: true }).click();
      const result = await response;
      const [rows] = await db.query("SELECT COUNT(*) n FROM cloud_collection_rows WHERE user_id=? AND deleted_at IS NULL", [fixture.auth.user.id]);
      probes.push({ name: "wipe-result", status: result.status(), remaining: Number(rows[0].n) });
      assert.equal(result.status(), 200, "Profile wipe fails deleting referenced accounts before transactions");
    });
    await check("audit mobile navigation: Categories and Audit remain reachable through visible navigation", async () => {
      await page.setViewportSize({ width: 390, height: 844 }); await navigate("/");
      const labels = await page.locator("button:visible,a:visible").allTextContents();
      probes.push({ name: "mobile-navigation", labels: labels.map(s => s.trim()).filter(Boolean) });
      await expect(page.getByRole("button", { name: "Categories", exact: true })).toBeVisible();
      await expect(page.getByRole("button", { name: "Audit & Backup", exact: true })).toBeVisible();
    });
    await context.clearCookies(); await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
    await login(fixture.admin, true);
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 1000 });
      for (const route of ["/admin", "/admin/users", "/admin/plans", "/admin/flags", "/admin/branding", "/admin/subscriptions"]) await check(`audit admin UI: ${route} loads at ${width}px`, async () => {
        const before = errors.length; await navigate(route);
        const metrics = await domMetrics(); pages.push({ route, width, ...metrics, pageErrors: errors.slice(before) });
        await page.screenshot({ path: `${path}/screenshots/${route.replace(/\//g, "_")}-${width}.png` });
        assert.ok(metrics.mainChars > 30); assert.ok(metrics.overflowPx <= 1); assert.equal(errors.length, before);
      });
    }
  } finally {
    await writeFile(`${path}/browser-pages.json`, JSON.stringify(pages, null, 2));
    await writeFile(`${path}/browser-probes.json`, JSON.stringify(probes, null, 2));
    await writeFile(`${path}/browser-network.json`, JSON.stringify(network, null, 2));
    await writeFile(`${path}/browser-errors.json`, JSON.stringify(errors, null, 2));
    await browser.close();
  }
}
