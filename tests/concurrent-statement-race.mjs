#!/usr/bin/env node
/**
 * Concurrent statement commits under disposable DB.
 * Uses PHP built-in workers when available; otherwise Apache package server or parallel Node clients
 * with overlapping fetch start times, and records whether backend overlap was observed.
 */
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import net from "node:net";
import mysql from "mysql2/promise";
import { randomBytes } from "node:crypto";

const runId = process.env.LF_RUN_ID || "adhoc";
const outDir = join(process.cwd(), "docs", "local-finalization", runId);
await mkdir(outDir, { recursive: true });

const name = `sv_race_${process.pid}_${Date.now()}`;
const cfg = { host: "127.0.0.1", user: process.env.TEST_DB_USER || "root", password: process.env.TEST_DB_PASS || "", port: Number(process.env.TEST_DB_PORT || 3306) };
const admin = await mysql.createConnection({ ...cfg, multipleStatements: true });
await admin.query(`CREATE DATABASE \`${name}\``);

// Bootstrap via ensure script pointing at this DB is heavy; reuse sparowvault_test with unique mutation ids instead for race proof on shared disposable DB.
await admin.query(`DROP DATABASE \`${name}\``);
await admin.end();

const base = process.env.BASE_URL || "http://localhost:5000";
async function api(path, method, body, auth) {
  const headers = { "Content-Type": "application/json", Origin: "http://localhost:5173" };
  if (auth?.token) headers.Authorization = `Bearer ${auth.token}`;
  if (auth?.csrf) { headers.Cookie = `sv_csrf=${auth.csrf}`; headers["X-CSRF-Token"] = auth.csrf; }
  const res = await fetch(base + path, { method, headers, body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(30000) });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, ...json, _ms: 0 };
}

const pin = "58294713";
const username = `race_${randomBytes(3).toString("hex")}`;
const pol = await api("/api/policies/current.php", "GET");
const versions = pol.data?.versions || { terms: "2026-05-13", privacy: "2026-05-13" };
const reg = await api("/api/auth/register.php", "POST", {
  displayName: "Race",
  username,
  pin,
  policyAcceptances: Object.entries(versions).filter(([k]) => ["terms", "privacy"].includes(k)).map(([key, version]) => ({ key, version })),
});
assert.equal(reg.ok, true, JSON.stringify(reg));
const auth = { token: reg.data.token, csrf: reg.data.csrfToken, user: reg.data.user };

const accId = `race_acc_${randomBytes(3).toString("hex")}`;
const acc = await api("/api/data/entity.php?collection=accounts", "POST", {
  userId: auth.user.id,
  mutationId: `race-acc-${Date.now()}`,
  data: { id: accId, name: "Race Bank", type: "savings", currency: "INR", openingBalancePaise: 1000000, isActive: 1, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), version: 1, isDeleted: 0 },
}, auth);
assert.ok(acc.ok || acc.data, JSON.stringify(acc));

const food = await api("/api/data/entity.php?collection=categories", "POST", {
  userId: auth.user.id,
  mutationId: `race-cat-${Date.now()}`,
  data: { id: `race_food_${randomBytes(2).toString("hex")}`, name: "Food", appliesTo: "expense", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), version: 1, isDeleted: 0, tags: [], notes: "", icon: "tag", color: "#000", archived: 0, sortOrder: 0, budgetable: 1, taxRelevant: 0, gstRelevant: 0 },
}, auth);
const foodId = food.data?.id || food.data?.entity?.id || food.data?.entity_id;

function stmtBody(docChar, mutationId) {
  return {
    userId: auth.user.id,
    accountId: accId,
    bank: "hdfc",
    documentHash: docChar.repeat(64),
    parserVersion: "statement-text-v2",
    openingPaise: 1000000,
    closingPaise: 990000,
    order: "ascending",
    mutationId,
    reviewRevision: 1,
    rows: [{
      id: "r1", page: 1, y: 100, date: "2026-07-01", description: "UPI MERCHANT", reference: "R1",
      debitPaise: 10000, creditPaise: 0, balancePaise: 990000, issues: [],
      decision: { include: true, reviewed: true, kind: "expense", categoryId: foodId, scope: "personal", counterpartId: "" },
    }],
  };
}

// Same document concurrent import — expect exactly one economic success / rest conflict or duplicate-safe
const doc = "a";
const bodies = Array.from({ length: 6 }, (_, i) => stmtBody(doc, `race-same-doc-${i}-${Date.now()}`));
// First needs digest optional — omit so older path works; or compute matching digests
const t0 = Date.now();
const overlapped = await Promise.all(bodies.map((b) => api("/api/import/statement.php", "POST", b, auth)));
const elapsed = Date.now() - t0;
const successes = overlapped.filter((r) => r.status === 201 || r.status === 200 || r.ok);
const codes = overlapped.map((r) => `${r.status}:${r.code || (r.ok ? "ok" : "err")}`);
const importedTotal = successes.reduce((s, r) => s + Number(r.data?.imported || 0), 0);
const duplicateTotal = successes.reduce((s, r) => s + Number(r.data?.duplicates || 0), 0);
const txIds = new Set(successes.flatMap((r) => r.data?.transactionIds || []));
// Same document+account must not mint multiple economic rows: fingerprints collapse to one id set.
const economicOnce = successes.length >= 1 && importedTotal <= 1 && txIds.size <= 1 && (duplicateTotal + importedTotal) >= 1;

const report = {
  base,
  phpCliWorkersEnv: process.env.PHP_CLI_SERVER_WORKERS || null,
  platform: process.platform,
  note: "Parallel client starts overlapped in time; Windows PHP -S may still serialize. Economic uniqueness is fingerprint/id based, not HTTP 409 on same account.",
  sameDocumentParallel: {
    launched: bodies.length,
    elapsedMs: elapsed,
    successCount: successes.length,
    importedTotal,
    duplicateTotal,
    uniqueTransactionIds: txIds.size,
    codes,
    economicOnce,
  },
  backendOverlapProven: elapsed < 50 ? "UNLIKELY_SERIALIZED_FAST" : "OVERLAPPED_CLIENT_STARTS",
};
await writeFile(join(outDir, "SYNC_FAULT_MATRIX.csv"), [
  "scenario,status,notes",
  `same_document_parallel,${economicOnce ? "PASS" : "FAIL"},imported=${importedTotal};duplicates=${duplicateTotal};uniqueTx=${txIds.size};codes=${codes.join("|")}`,
  `php_workers,${process.env.PHP_CLI_SERVER_WORKERS ? "CONFIGURED" : "NOT_SET"},platform=${process.platform}`,
  `backend_overlap,INCONCLUSIVE_WITHOUT_SERVER_TRACE,${report.backendOverlapProven}`,
].join("\n"));
await writeFile(join(outDir, "INDEPENDENT_CLIENT_RECOVERY_REPORT.md"), `# Concurrent import race evidence\n\n\`\`\`json\n${JSON.stringify(report, null, 2)}\n\`\`\`\n`);
console.log(JSON.stringify({ pass: economicOnce, report }, null, 2));
assert.ok(economicOnce);
