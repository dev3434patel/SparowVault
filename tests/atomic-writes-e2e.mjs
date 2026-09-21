import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import net from "node:net";
import mysql from "mysql2/promise";

// Always create our own database and server. Never reuse a user's running API.
const name = `sv_write_test_${process.pid}_${Date.now()}`;
const cfg = { host: "127.0.0.1", user: process.env.TEST_DB_USER || "root", password: process.env.TEST_DB_PASS || "", port: Number(process.env.TEST_DB_PORT || 3306) };
const admin = await mysql.createConnection(cfg);
const children = [];
const checks = [];
const statementMode = process.argv.includes("--statements");
const directory = process.env.AUDIT_DIRECTORY || (statementMode ? process.env.STATEMENT_EVIDENCE_DIRECTORY || "docs/statement-evidence/2026-09-10" : "docs/implementation-evidence/2026-09-10");
let db;
let base;
let databaseCreated = false;
async function child(command, args, env) {
  const process = spawn(command, args, { env, stdio: "pipe" });
  let output = "";
  process.stdout.on("data", chunk => { output += chunk; });
  process.stderr.on("data", chunk => { output += chunk; });
  const [code] = await once(process, "close");
  assert.equal(code, 0, output);
}
async function check(title, run) {
  try { await run(); checks.push({ title, pass: true }); console.log("PASS", title); }
  catch (error) { checks.push({ title, pass: false, error: error.message }); console.error("FAIL", title, error.message); }
}
async function req(path, method = "GET", body, auth) {
  const response = await fetch(base + path, { method, headers: {
    "Content-Type": "application/json",
    ...(auth ? { Authorization: `Bearer ${auth.token}`, Cookie: `sv_csrf=${auth.csrfToken}`, "X-CSRF-Token": auth.csrfToken } : {}),
  }, body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(20000) });
  const json = await response.json();
  return { status: response.status, ...json };
}
const entityPath = (collection, id) => `/api/data/${id ? "entity-item" : "entity"}.php?collection=${collection}${id ? `&id=${id}` : ""}`;
const create = (auth, collection, data, mutationId) => req(entityPath(collection), "POST", { userId: auth.user.id, data, ...(mutationId ? { mutationId } : {}) }, auth);
const count = async (table, userId) => Number((await db.query(`SELECT COUNT(*) n FROM ${table} WHERE user_id=?`, [userId]))[0][0].n);
try {
  await admin.query(`CREATE DATABASE \`${name}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  databaseCreated = true;
  const env = { ...process.env, APP_ENV: "test", DATABASE_URL: `mysql://${encodeURIComponent(cfg.user)}:${encodeURIComponent(cfg.password)}@127.0.0.1:${cfg.port}/${name}`, DB_NAME: name, DB_HOST: cfg.host, DB_USER: cfg.user, DB_PASS: cfg.password, TEST_DB_NAME: name, TEST_DB_HOST: cfg.host, TEST_DB_USER: cfg.user, TEST_DB_PASS: cfg.password, TEST_DB_PORT: String(cfg.port), CLOUD_JWT_SECRET: "isolated-atomic-write-test-secret-not-for-deployment-20260910", ENABLE_RAZORPAY: "false", PHP_CLI_SERVER_WORKERS: "4" };
  delete env.TEST_DATABASE_URL;
  if (process.argv.includes("--audit")) env.RAZORPAY_WEBHOOK_SECRET = "isolated-full-audit-webhook-secret";
  await child("node", ["scripts/db-test-reset.mjs"], env);
  db = await mysql.createConnection({ ...cfg, database: name, multipleStatements: true });
  await db.query(await readFile("sql/migrations/20260910_atomic_writes.sql", "utf8"));
  const socket = net.createServer(); socket.listen(0, "127.0.0.1"); await once(socket, "listening");
  const port = socket.address().port; await new Promise(resolve => socket.close(resolve));
  base = `http://127.0.0.1:${port}`;
  const php = spawn("php", ["-S", `127.0.0.1:${port}`, "-t", ".", "php/dev-router.php"], { env, detached: true, stdio: "ignore" });
  children.push(php);
  let ready = false;
  for (let i = 0; i < 100; i++) {
    if (php.exitCode !== null) throw new Error("Isolated PHP server exited before readiness");
    try { if ((await fetch(base + "/api/health.php")).ok) { ready = true; break; } } catch { /* startup */ }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  assert.ok(ready, "Isolated server did not become ready");
  const policies = (await req("/api/policies/current.php")).data.versions;
  async function user(suffix) {
    const result = await req("/api/auth/register.php", "POST", { username: `aw_${suffix}_${Date.now().toString(36)}`, displayName: "Atomic fixture", pin: "583921", policyAcceptances: ["terms", "privacy"].map(key => ({ key, version: policies[key] })) });
    assert.equal(result.status, 201, JSON.stringify(result));
    return result.data;
  }
  const a = await user("a"), b = await user("b");
  const category = { id: "category", name: "Test category", appliesTo: "expense", icon: "tag", color: "#ef4444" };
  const account = { id: "account", name: "Test cash", type: "cash", openingBalance: 0, openingBalancePaise: 0, icon: "wallet", color: "#22c55e" };
  for (const auth of [a, b]) {
    assert.equal((await create(auth, "categories", category)).status, 201);
    assert.equal((await create(auth, "accounts", account)).status, 201);
  }
  const tx = id => ({ id, type: "expense", date: "2026-09-10T12:00:00.000Z", amount: 10, amountPaise: 1000, accountId: "account", categoryId: "category", paymentMode: "cash", businessOrPersonal: "personal", description: "Atomic fixture" });
  await check("24 identical concurrent retries produce one immutable receipt and record", async () => {
    const results = await Promise.all(Array.from({ length: 24 }, () => create(a, "categories", { ...category, id: "race_same" }, "same-request")));
    assert.ok(results.every(result => result.status === 201));
    assert.ok(results.every(result => JSON.stringify(result.data) === JSON.stringify(results[0].data)));
    assert.equal(await count("financial_write_receipts", a.user.id), 1);
  });
  await check("24 different payloads cannot share one mutation key", async () => {
    const results = await Promise.all(Array.from({ length: 24 }, (_, i) => create(a, "categories", { ...category, id: `race_changed_${i}` }, "changed-request")));
    assert.equal(results.filter(result => result.status === 201).length, 1);
    assert.equal(results.filter(result => result.code === "IDEMPOTENCY_CONFLICT").length, 23);
    const [rows] = await db.query("SELECT COUNT(*) n FROM cloud_collection_rows WHERE user_id=? AND entity_id LIKE 'race_changed_%'", [a.user.id]);
    assert.equal(Number(rows[0].n), 1);
  });
  await check("stale PATCH is rejected and retry returns the original committed result", async () => {
    const body = { patch: { name: "Version two" }, expectedVersion: 1, mutationId: "patch-version" };
    const result = await req(entityPath("categories", "race_same"), "PATCH", body, a);
    assert.equal(result.status, 200); assert.equal(result.data.version, 2);
    const stale = await req(entityPath("categories", "race_same"), "PATCH", { patch: { name: "Stale" }, expectedVersion: 1 }, a);
    assert.equal(stale.code, "VERSION_CONFLICT");
    assert.deepEqual((await req(entityPath("categories", "race_same"), "PATCH", body, a)).data, result.data);
  });
  await check("invalid sync batch rolls back source, ledger and audit", async () => {
    const before = await count("user_audit_logs", a.user.id);
    const result = await req("/api/cloud/sync/push.php", "POST", { collections: { transactions: [{ ...tx("batch_valid"), userId: a.user.id }, { ...tx("batch_bad"), userId: a.user.id, amountPaise: -1 }] } }, a);
    assert.equal(result.status, 422);
    assert.equal((await req(entityPath("transactions", "batch_valid"), "GET", undefined, a)).status, 404);
    assert.equal(await count("financial_events", a.user.id), 0);
    assert.equal(await count("user_audit_logs", a.user.id), before);
  });
  await check("malformed sync rows are rejected rather than silently skipped", async () => {
    const result = await req("/api/cloud/sync/push.php", "POST", { collections: { categories: [null] } }, a);
    assert.equal(result.status, 422);
  });
  await check("stale sync cannot resurrect a soft-deleted record", async () => {
    const old = (await create(a, "categories", { ...category, id: "soft_deleted" })).data;
    assert.equal((await req(entityPath("categories", old.id), "DELETE", undefined, a)).status, 200);
    const result = await req("/api/cloud/sync/push.php", "POST", { collections: { categories: [old] } }, a);
    assert.equal(result.code, "VERSION_REQUIRED");
    assert.equal((await req(entityPath("categories", old.id), "GET", undefined, a)).data.isDeleted, 1);
  });
  await check("nonexistent and foreign transaction references are rejected", async () => {
    await create(b, "accounts", { ...account, id: "foreign-account" });
    for (const accountId of ["missing-account", "foreign-account"]) {
      const result = await create(a, "transactions", { ...tx(`invalid_${accountId}`), accountId });
      assert.equal(result.status, 422);
    }
  });
  await check("same transaction ID in two tenants has isolated ledger effects", async () => {
    assert.equal((await create(a, "transactions", tx("shared-id"))).status, 201);
    const before = await count("financial_effects", a.user.id);
    assert.ok(before > 0);
    assert.equal((await create(b, "transactions", tx("shared-id"))).status, 201);
    assert.equal(await count("financial_effects", a.user.id), before);
    assert.ok(await count("financial_effects", b.user.id) > 0);
    assert.equal((await req(entityPath("transactions", "shared-id") + "&hard=1", "DELETE", undefined, b)).status, 200);
    assert.equal(await count("financial_effects", a.user.id), before);
    assert.equal(await count("financial_effects", b.user.id), 0);
  });
  await check("referenced account cannot be deleted", async () => {
    const result = await req(entityPath("accounts", "account") + "&hard=1", "DELETE", undefined, a);
    assert.equal(result.code, "REFERENCE_CONFLICT");
  });
  await check("ledger failure rolls back entity, receipt and audit", async () => {
    const before = await count("user_audit_logs", a.user.id);
    const receipts = await count("financial_write_receipts", a.user.id);
    await db.query("CREATE TRIGGER fail_effect BEFORE INSERT ON financial_effects FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='test injected ledger failure'");
    try {
      const result = await create(a, "transactions", tx("injected-failure"), "ledger-failure");
      assert.equal(result.status, 503);
      assert.equal((await req(entityPath("transactions", "injected-failure"), "GET", undefined, a)).status, 404);
      assert.equal(await count("user_audit_logs", a.user.id), before);
      assert.equal(await count("financial_write_receipts", a.user.id), receipts);
    } finally { await db.query("DROP TRIGGER fail_effect"); }
    assert.equal((await create(a, "transactions", tx("injected-failure"), "ledger-failure")).status, 201);
  });
  await check("batch PATCH rolls back its first row when a later row is missing", async () => {
    const before = (await req(entityPath("categories", "category"), "GET", undefined, a)).data;
    const result = await req(entityPath("categories"), "PATCH", { ids: ["category", "not-present"], patch: { name: "Must rollback" } }, a);
    assert.equal(result.status, 404);
    assert.deepEqual((await req(entityPath("categories", "category"), "GET", undefined, a)).data, before);
  });
  await check("bulk hard-delete voids posted ledger and retains server audit", async () => {
    const result = await req(entityPath("transactions") + `&userId=${a.user.id}`, "DELETE", undefined, a);
    assert.equal(result.status, 200);
    assert.equal(await count("financial_effects", a.user.id), 0);
    const [posted] = await db.query("SELECT COUNT(*) n FROM financial_events WHERE user_id=? AND deleted_at IS NULL", [a.user.id]);
    assert.equal(Number(posted[0].n), 0);
    assert.ok(await count("financial_events", a.user.id) > 0);
  });
  await check("hard-delete tombstones prevent stale snapshot resurrection", async () => {
    const result = await req("/api/cloud/sync/push.php", "POST", { collections: { transactions: [{ ...tx("shared-id"), userId: a.user.id }] } }, a);
    assert.equal(result.code, "DELETED_ENTITY_CONFLICT");
  });
  await check("mutation keys are isolated by user and bound to collection", async () => {
    assert.equal((await create(b, "categories", { ...category, id: "other-owner-key" }, "same-request")).status, 201);
    assert.equal((await create(a, "accounts", { ...account, id: "wrong-collection" }, "same-request")).code, "IDEMPOTENCY_CONFLICT");
  });
  await check("sync validates a final parent graph independent of collection order", async () => {
    const result = await req("/api/cloud/sync/push.php", "POST", { collections: {
      transactions: [{ ...tx("graph-child"), userId: a.user.id, accountId: "graph-parent" }],
      accounts: [{ ...account, id: "graph-parent", userId: a.user.id }],
    } }, a);
    assert.equal(result.status, 200, JSON.stringify(result));
    assert.equal(result.data.upserted, 2);
  });
  await check("household viewer restrictions hold on batch, sync and bulk hard-delete", async () => {
    const house = (await create(a, "households", { name: "Restricted household", defaultCurrency: "INR" })).data;
    const member = (await create(a, "householdMembers", { householdId: house.id, role: "viewer", displayName: "Viewer" })).data;
    assert.ok(member?.id);
    const single = await req(entityPath("householdMembers", member.id), "PATCH", { patch: { role: "owner" } }, a);
    const batch = await req(entityPath("householdMembers"), "PATCH", { ids: [member.id], patch: { role: "owner" } }, a);
    const sync = await req("/api/cloud/sync/push.php", "POST", { collections: { householdMembers: [{ ...member, role: "owner" }] }, expectedVersions: { householdMembers: { [member.id]: 1 } } }, a);
    const remove = await req(entityPath("householdMembers") + `&userId=${a.user.id}`, "DELETE", undefined, a);
    for (const result of [single, batch, sync, remove]) assert.equal(result.status, 422, JSON.stringify(result));
    assert.equal((await req(entityPath("householdMembers", member.id), "GET", undefined, a)).data.role, "viewer");
  });
  await check("bulk import uses reference validation and retry-safe row writes", async () => {
    const importedRow = { ...tx("import-row"), mutationId: "import-row-key" };
    for (let i = 0; i < 2; i++) {
      const result = await req("/api/import/transactions.php", "POST", { rows: [importedRow] }, a);
      assert.equal(result.status, 200); assert.equal(result.data.imported, 1);
    }
    const [rows] = await db.query("SELECT COUNT(*) n FROM cloud_collection_rows WHERE user_id=? AND collection_name='transactions' AND entity_id='import-row'", [a.user.id]);
    assert.equal(Number(rows[0].n), 1);
    const bad = await req("/api/import/transactions.php", "POST", { rows: [{ ...tx("bad-import"), accountId: "foreign-account" }] }, a);
    assert.equal(bad.data.imported, 0); assert.equal(bad.data.rejectedCount, 1);
  });
  await check("owner-bound reads and queued patches reject a changed authenticated user", async () => {
    const read = await req(entityPath("categories", "category") + `&userId=${a.user.id}`, "GET", undefined, b);
    const write = await req(entityPath("categories", "category"), "PATCH", { userId: a.user.id, patch: { name: "Wrong owner" }, expectedVersion: 1, mutationId: "wrong-owner" }, b);
    assert.equal(read.code, "USER_MISMATCH"); assert.equal(write.code, "USER_MISMATCH");
  });
  let auditFixture;
  if (process.argv.includes("--audit")) {
    const { testFullAuditApi } = await import("./full-project-audit.mjs");
    auditFixture = await testFullAuditApi({ req, user, create, db, check, base, env, directory });
  }
  let statementFixture;
  if (statementMode) {
    const { testStatementApi } = await import("./statement-api-checks.mjs");
    statementFixture = await testStatementApi({ req, user, create, db, check });
    const { testExpansionApi } = await import("./expansion-api-checks.mjs");
    await testExpansionApi({ req, user, create, db, check, base });
    const { testDatabaseSnapshot } = await import("./database-snapshot-checks.mjs");
    await testDatabaseSnapshot({ db, cfg, env, check });
  }
  if (process.argv.includes("--browser")) {
    const frontendSocket = net.createServer(); frontendSocket.listen(0, "127.0.0.1"); await once(frontendSocket, "listening");
    const frontendPort = frontendSocket.address().port; await new Promise(resolve => frontendSocket.close(resolve));
    const frontend = `http://127.0.0.1:${frontendPort}`;
    const artifactMode = process.argv.includes("--artifact");
    const vite = spawn("node", ["node_modules/vite/bin/vite.js", ...(artifactMode ? ["preview"] : []), "--host", "127.0.0.1", "--port", String(frontendPort), "--strictPort"], { env: { ...env, VITE_API_TARGET: base, VITE_API_BASE_URL: "" }, detached: true, stdio: "ignore" });
    children.push(vite);
    let frontendReady = false;
    for (let i = 0; i < 100; i++) {
      if (vite.exitCode !== null) throw new Error("Isolated frontend exited before readiness");
      try { if ((await fetch(frontend)).ok) { frontendReady = true; break; } } catch { /* startup */ }
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    assert.ok(frontendReady);
    if (!artifactMode) {
      const { testDurableBrowser } = await import("./browser-durable-outbox.mjs");
      await testDurableBrowser({ frontend, username: a.user.username, pin: "583921", check, evidenceDirectory: directory });
    }
    if (statementMode) {
      const { testStatementBrowser } = await import("./browser-statement-import.mjs");
      await testStatementBrowser({ frontend, apiBase: base, auth: statementFixture.auth, check, directory, artifactMode });
    }
    if (auditFixture) {
      const { testFullAuditBrowser } = await import("./full-project-audit.mjs");
      await testFullAuditBrowser({ frontend, apiBase: base, fixture: auditFixture, db, check, directory });
    }
    if (process.argv.includes("--module-workflows")) {
      const fixture = await user("wf");
      assert.equal((await create(fixture, "accounts", account)).status, 201);
      assert.equal((await create(fixture, "categories", category)).status, 201);
      const { testModuleWorkflows } = await import("./browser-module-workflows.mjs");
      await testModuleWorkflows({ frontend, base, auth: fixture, db, check, directory });
    }
  }
} finally {
  for (const child of children) {
    if (child.exitCode !== null || child.signalCode !== null) continue;
    const closed = once(child, "close");
    try {
      if (process.platform === "win32") {
        spawn("taskkill", ["/pid", String(child.pid), "/t", "/f"], { stdio: "ignore" });
      } else {
        globalThis.process.kill(-child.pid, "SIGTERM");
      }
      await Promise.race([closed, new Promise((resolve) => setTimeout(resolve, 8000))]);
    } catch { /* already stopped */ }
  }
  if (db) await db.end();
  if (databaseCreated) await admin.query(`DROP DATABASE IF EXISTS \`${name}\``);
  await admin.end();
  await mkdir(directory, { recursive: true });
  await writeFile(`${directory}/${process.argv.includes("--artifact") ? "production-artifact" : "atomic-writes"}.json`, JSON.stringify({ date: new Date().toISOString(), isolation: "fresh disposable MariaDB database; four PHP workers", checks }, null, 2) + "\n");
}
assert.ok(checks.length >= 13 && checks.every(check => check.pass), "Atomic-write regression suite failed");
