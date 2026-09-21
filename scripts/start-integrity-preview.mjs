import { spawn } from "node:child_process";
import { once } from "node:events";
import { mkdir, open, writeFile } from "node:fs/promises";
import net from "node:net";
import mysql from "mysql2/promise";

const database = "sparowvault_integrity_preview_test";
const backendPort = 8088, frontendPort = 5178;
const backend = `http://127.0.0.1:${backendPort}`, frontend = `http://127.0.0.1:${frontendPort}`;
const username = "review_demo", pin = "583921";
const cfg = { host: "127.0.0.1", user: process.env.TEST_DB_USER || "root", password: process.env.TEST_DB_PASS || "", port: Number(process.env.TEST_DB_PORT || 3306) };
const env = { ...process.env, APP_ENV: "development", DATABASE_URL: `mysql://${encodeURIComponent(cfg.user)}:${encodeURIComponent(cfg.password)}@127.0.0.1:${cfg.port}/${database}`, DB_NAME: database,
  TEST_DB_NAME: database, TEST_DB_HOST: cfg.host, TEST_DB_USER: cfg.user, TEST_DB_PASS: cfg.password, TEST_DB_PORT: String(cfg.port),
  CLOUD_JWT_SECRET: "synthetic-local-integrity-preview-only-do-not-deploy-20260910", ENABLE_RAZORPAY: "false", VITE_ENABLE_RAZORPAY: "false",
  VITE_API_TARGET: backend, VITE_API_BASE_URL: backend, PHP_CLI_SERVER_WORKERS: "4" };
delete env.TEST_DATABASE_URL;
for (const port of [backendPort, frontendPort]) {
  const probe = net.createServer(); probe.listen(port, "127.0.0.1");
  await once(probe, "listening"); await new Promise(resolve => probe.close(resolve));
}
const db = await mysql.createConnection(cfg);
try {
  const [existing] = await db.query("SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME=?", [database]);
  if (!existing.length) {
    await db.query(`CREATE DATABASE \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    const reset = spawn("node", ["scripts/db-test-reset.mjs"], { env, stdio: "inherit" });
    const [code] = await once(reset, "close");
    if (code !== 0) throw new Error("Preview schema setup failed");
  }
} finally { await db.end(); }
const migrate = spawn("php", ["php/scripts/migrate_atomic_writes.php", `--database=${database}`, "--apply"], { env, stdio: "inherit" });
if ((await once(migrate, "close"))[0] !== 0) throw new Error("Preview migration failed");
const securityMigrate = spawn("php", ["php/scripts/migrate_security_sessions.php", `--database=${database}`, "--apply"], { env, stdio: "inherit" });
if ((await once(securityMigrate, "close"))[0] !== 0) throw new Error("Preview security migration failed");
await mkdir("tmp/integrity-preview", { recursive: true });
const children = [];
async function start(command, args, log) {
  const file = await open(`tmp/integrity-preview/${log}`, "a");
  const child = spawn(command, args, { env, detached: true, stdio: ["ignore", file.fd, file.fd] });
  children.push(child); await file.close(); return child;
}
async function ready(url, child) {
  for (let i = 0; i < 100; i++) {
    if (child.exitCode !== null) throw new Error("Preview service exited; inspect tmp/integrity-preview logs");
    try { if ((await fetch(url)).ok) return; } catch { /* startup */ }
    await new Promise(resolve => setTimeout(resolve, 150));
  }
  throw new Error("Preview service did not become ready");
}
try {
  const php = await start("php", ["-S", `127.0.0.1:${backendPort}`, "-t", ".", "php/dev-router.php"], "php.log");
  await ready(backend + "/api/health.php", php);
  const call = async (path, body) => (await fetch(backend + path, { method: body ? "POST" : "GET", headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined })).json();
  let auth = await call("/api/auth/login.php", { username, pin });
  if (!auth.ok) {
    const policies = (await call("/api/policies/current.php")).data.versions;
    auth = await call("/api/auth/register.php", { username, displayName: "Integrity Review", pin, policyAcceptances: ["terms", "privacy"].map(key => ({ key, version: policies[key] })) });
  }
  if (!auth.ok) throw new Error("Preview login unavailable; existing preview credentials were not reset");
  // Known linked synthetic parents also avoid racing legacy first-login default seeding.
  for (const [collection, data] of [
    ["accounts", { id: "preview-cash", name: "Preview Cash", type: "cash", openingBalance: 0, openingBalancePaise: 0, icon: "wallet", color: "#22c55e", isInactive: 0 }],
    ["categories", { id: "preview-expense", name: "Preview Expense", appliesTo: "expense", icon: "tag", color: "#ef4444" }],
    ["accounts", { id: "preview-statement-bank", name: "Statement Demo Bank", type: "bank", openingBalance: 10000, openingBalancePaise: 1000000, icon: "landmark", color: "#0d9488", isInactive: 0 }],
    ["categories", { id: "preview-statement-salary", name: "Salary", appliesTo: "income", icon: "briefcase", color: "#059669" }],
    ["categories", { id: "preview-statement-food", name: "Food & Dining", appliesTo: "expense", icon: "utensils", color: "#e11d48" }],
  ]) {
    const mutationId = data.id.startsWith("preview-statement-") ? `preview:${collection}:${data.id}` : `preview:${collection}`;
    const response = await fetch(`${backend}/api/data/entity.php?collection=${collection}`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${auth.data.token}`, Cookie: `sv_csrf=${auth.data.csrfToken}`, "X-CSRF-Token": auth.data.csrfToken }, body: JSON.stringify({ userId: auth.data.user.id, data, mutationId }) });
    if (![200, 201, 409].includes(response.status)) throw new Error("Preview fixture creation failed");
  }
  const vite = await start("node", ["node_modules/vite/bin/vite.js", "--host", "127.0.0.1", "--port", String(frontendPort), "--strictPort"], "vite.log");
  await ready(frontend, vite);
  await writeFile("tmp/integrity-preview/runtime.json", JSON.stringify({ database, backend, frontend, processes: children.map(child => child.pid) }, null, 2));
  for (const child of children) child.unref();
  console.log(JSON.stringify({ frontend, backend, database, username, pin, note: "Synthetic local preview only; not hosted staging. Existing preview data is retained." }, null, 2));
} catch (error) {
  for (const child of children) try { process.kill(-child.pid, "SIGTERM"); } catch { /* stopped */ }
  throw error;
}
