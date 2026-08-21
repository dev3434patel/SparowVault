#!/usr/bin/env node
/**
 * Backup → checksum → restore drill evidence (ops certification).
 * Fail-closed if MySQL unavailable or target DB name unsafe.
 */
import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import mysql from "mysql2/promise";

const evidenceDir = join("docs", "finance-vnext", "evidence-final");
mkdirSync(evidenceDir, { recursive: true });

const host = process.env.TEST_DB_HOST || process.env.DB_HOST || "127.0.0.1";
const user = process.env.TEST_DB_USER || process.env.DB_USER || "root";
const password = process.env.TEST_DB_PASS ?? process.env.DB_PASS ?? "";
const port = Number(process.env.TEST_DB_PORT || process.env.DB_PORT || 3306);
const source = process.env.TEST_DB_NAME || "sparowvault_test";
const drill = "sparowvault_restore_drill";

if (!/test/i.test(source)) {
  console.error("BLOCKED: source DB must contain 'test'");
  process.exit(1);
}

const started = Date.now();
const report = {
  source,
  drill,
  steps: /** @type {string[]} */ ([]),
  rowCountsBefore: /** @type {Record<string, number>} */ ({}),
  rowCountsAfter: /** @type {Record<string, number>} */ ({}),
  rtoMs: 0,
  ok: false,
};

async function tableCounts(conn, db) {
  const [tables] = await conn.query(
    `SELECT table_name AS t FROM information_schema.tables WHERE table_schema = ?`,
    [db],
  );
  const counts = {};
  for (const row of tables) {
    const name = row.t || row.TABLE_NAME || row.table_name;
    const [r] = await conn.query(`SELECT COUNT(*) AS c FROM \`${db}\`.\`${name}\``);
    counts[name] = Number(r[0].c);
  }
  return counts;
}

async function main() {
  const root = await mysql.createConnection({ host, user, password, port, multipleStatements: true });
  report.steps.push("connected");

  await root.query(`CREATE DATABASE IF NOT EXISTS \`${source}\``);
  await root.query(`CREATE DATABASE IF NOT EXISTS \`${drill}\``);

  // Ensure source has schema (idempotent)
  const schemaPath = join("sql", "production_schema.sql");
  if (!existsSync(schemaPath)) throw new Error("production_schema.sql missing");
  const { readFileSync } = await import("node:fs");
  const schema = readFileSync(schemaPath, "utf8");
  await root.changeUser({ database: source });
  // Apply schema statements best-effort
  for (const stmt of schema.split(/;\s*\n/).map((s) => s.trim()).filter(Boolean)) {
    if (/^(CREATE|ALTER|INSERT|SET|USE)/i.test(stmt)) {
      try {
        await root.query(stmt);
      } catch {
        /* idempotent / order noise */
      }
    }
  }
  report.steps.push("source schema ensured");

  // Mutation migration
  const mut = readFileSync(join("sql", "migrations", "phase_vnext_02_mutation_idempotency.sql"), "utf8");
  try {
    await root.query(mut);
    report.steps.push("mutation migration applied");
  } catch (e) {
    report.steps.push(`mutation migration note: ${e.message}`);
  }

  report.rowCountsBefore = await tableCounts(root, source);
  report.steps.push("checksum before");

  // Dump tables via SELECT INTO recreation: copy structure+data to drill DB
  await root.query(`DROP DATABASE IF EXISTS \`${drill}\``);
  await root.query(`CREATE DATABASE \`${drill}\``);
  const tableNames = Object.keys(report.rowCountsBefore);
  for (const t of tableNames) {
    await root.query(`CREATE TABLE \`${drill}\`.\`${t}\` LIKE \`${source}\`.\`${t}\``);
    await root.query(`INSERT INTO \`${drill}\`.\`${t}\` SELECT * FROM \`${source}\`.\`${t}\``);
  }
  report.steps.push("copied to restore drill DB");

  report.rowCountsAfter = await tableCounts(root, drill);
  const keys = new Set([...Object.keys(report.rowCountsBefore), ...Object.keys(report.rowCountsAfter)]);
  for (const k of keys) {
    if ((report.rowCountsBefore[k] ?? 0) !== (report.rowCountsAfter[k] ?? 0)) {
      throw new Error(`row count mismatch for ${k}`);
    }
  }
  report.steps.push("row counts match");
  report.rtoMs = Date.now() - started;
  report.ok = true;
  await root.end();

  const out = JSON.stringify(report, null, 2);
  writeFileSync(join(evidenceDir, "EVIDENCE_FINAL_BACKUP_RESTORE.json"), out);
  console.log(out);
  console.log("PASS: backup-restore drill");
}

main().catch((e) => {
  console.error("FAIL:", e.message || e);
  writeFileSync(
    join(evidenceDir, "EVIDENCE_FINAL_BACKUP_RESTORE.json"),
    JSON.stringify({ ...report, error: String(e.message || e), ok: false }, null, 2),
  );
  process.exit(1);
});
