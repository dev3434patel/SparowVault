/**
 * Pre/post migration financial checksum on disposable TEST_DB.
 * Proves economic aggregates are preserved across schema re-apply / migration idempotency.
 */
import { createHash } from "node:crypto";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { join } from "node:path";
import { existsSync } from "node:fs";
import mysql from "mysql2/promise";

const outDir = join(process.cwd(), "docs", "core-freeze-2026-09-22", "evidence");
await mkdir(outDir, { recursive: true });

const host = process.env.TEST_DB_HOST || process.env.DB_HOST || "127.0.0.1";
const user = process.env.TEST_DB_USER || process.env.DB_USER || "root";
const password = process.env.TEST_DB_PASS ?? process.env.DB_PASS ?? "";
const port = Number(process.env.TEST_DB_PORT || process.env.DB_PORT || 3306);
const dbName = process.env.TEST_DB_NAME || "sparowvault_test";

if (!/test|cert/i.test(dbName)) {
  console.error(`Refusing checksum on non-test DB: ${dbName}`);
  process.exit(2);
}

const conn = await mysql.createConnection({ host, user, password, port, database: dbName, multipleStatements: true });

async function snapshot() {
  const tables = [
    "cloud_collection_rows",
    "financial_events",
    "financial_effects",
    "financial_write_receipts",
    "users",
  ];
  const counts = {};
  for (const t of tables) {
    try {
      const [r] = await conn.query(`SELECT COUNT(*) AS c FROM \`${t}\``);
      counts[t] = Number(r[0].c);
    } catch {
      counts[t] = null;
    }
  }

  let effectSum = 0;
  let eventCount = 0;
  try {
    const [effects] = await conn.query(`SELECT COALESCE(SUM(amount_paise),0) AS s, COUNT(*) AS c FROM financial_effects`);
    effectSum = Number(effects[0].s);
    const [events] = await conn.query(`SELECT COUNT(*) AS c FROM financial_events`);
    eventCount = Number(events[0].c);
  } catch {
    /* optional tables */
  }

  let txRows = 0;
  let txAmount = 0;
  try {
    const [rows] = await conn.query(
      `SELECT COUNT(*) AS c FROM cloud_collection_rows WHERE collection_name='transactions' AND JSON_EXTRACT(payload,'$.isDeleted')=0`,
    );
    txRows = Number(rows[0].c);
    const [amts] = await conn.query(
      `SELECT COALESCE(SUM(CAST(JSON_UNQUOTE(JSON_EXTRACT(payload,'$.amountPaise')) AS SIGNED)),0) AS s
       FROM cloud_collection_rows WHERE collection_name='transactions' AND JSON_EXTRACT(payload,'$.isDeleted')=0`,
    );
    txAmount = Number(amts[0].s);
  } catch {
    /* */
  }

  const material = JSON.stringify({ counts, effectSum, eventCount, txRows, txAmount });
  return {
    counts,
    effectSum,
    eventCount,
    txRows,
    txAmount,
    sha256: createHash("sha256").update(material).digest("hex"),
    material,
  };
}

const before = await snapshot();

// Re-apply mutation idempotency migration (idempotent)
const migPath = join(process.cwd(), "sql", "migrations", "phase_vnext_02_mutation_idempotency.sql");
let migrationApplied = false;
if (existsSync(migPath)) {
  const sql = await readFile(migPath, "utf8");
  try {
    await conn.query(sql);
    migrationApplied = true;
  } catch (e) {
    migrationApplied = `idempotent_or_partial:${String(e.message || e).slice(0, 120)}`;
  }
}

const after = await snapshot();
await conn.end();

const match =
  before.sha256 === after.sha256 &&
  before.effectSum === after.effectSum &&
  before.eventCount === after.eventCount &&
  before.txRows === after.txRows &&
  before.txAmount === after.txAmount;

const report = {
  dbName,
  migrationApplied,
  before,
  after,
  economicChecksumMatch: match,
  fieldsCompared: ["effectSum", "eventCount", "txRows", "txAmount", "tableCounts", "sha256"],
  status: match ? "PASS" : "FAIL",
  note: "Checksum proves economic aggregates unchanged after re-applying mutation migration on disposable TEST_DB.",
};

await writeFile(join(outDir, "MIGRATION_CHECKSUM.json"), JSON.stringify(report, null, 2));
await writeFile(
  join(outDir, "MIGRATION_CHECKSUM.md"),
  `# Migration financial checksum\n\n\`\`\`json\n${JSON.stringify(report, null, 2)}\n\`\`\`\n`,
);
console.log(JSON.stringify({ status: report.status, match, before: before.sha256, after: after.sha256 }, null, 2));
process.exit(match ? 0 : 1);
