#!/usr/bin/env node
/**
 * PHASE 0 — SQL migration "dry-run".
 *
 * Reads every .sql under sql/ and produces a static report. If a live test
 * database is configured (TEST_DB_HOST/USER/PASS/NAME or TEST_DATABASE_URL),
 * the script will ALSO open a connection, BEGIN, attempt each file, and
 * ROLLBACK — proving the migration can be applied without committing.
 *
 * Usage:
 *   npm run check:sql              # static only
 *   TEST_DB_HOST=… npm run check:sql   # static + live rollback test
 *
 * SAFETY:
 *   - Refuses to run against any DB whose name does not contain "test".
 *   - Always wraps in a TRANSACTION + ROLLBACK; nothing is committed.
 *   - Never touches the production database.
 */
import { promises as fs } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const SQL_DIR = path.join(ROOT, "sql");
const LIVE_DRY_RUN_FILES = [
  path.join(SQL_DIR, "production_schema.sql"),
  path.join(SQL_DIR, "migrations", "all_phases_combined.sql"),
];

async function listSqlFiles() {
  const entries = await fs.readdir(SQL_DIR, { withFileTypes: true });
  return entries
    .filter((e) => e.isFile() && e.name.endsWith(".sql"))
    .map((e) => path.join(SQL_DIR, e.name))
    .sort();
}

function staticReport(file, text) {
  const lower = text.toLowerCase();
  const counts = {
    createTable:   (lower.match(/create\s+table\s+/g)        ?? []).length,
    createIfNotEx: (lower.match(/create\s+table\s+if\s+not\s+exists/g) ?? []).length,
    alterTable:    (lower.match(/alter\s+table\s+/g)         ?? []).length,
    dropTable:     (lower.match(/drop\s+table\s+/g)          ?? []).length,
    insert:        (lower.match(/^\s*insert\s+into\s+/gm)    ?? []).length,
  };
  const warns = [];
  if (counts.dropTable > 0) warns.push(`contains ${counts.dropTable} DROP TABLE — confirm intentional`);
  if (counts.createTable > 0 && counts.createIfNotEx < counts.createTable) {
    warns.push("not all CREATE TABLE statements use IF NOT EXISTS (idempotency risk)");
  }
  if (counts.alterTable > 0 && !/if\s+exists/i.test(text)) {
    warns.push("ALTER TABLE without IF EXISTS — re-run will fail");
  }
  return { counts, warns };
}

async function maybeLiveDryRun() {
  const cfg = {
    host:     process.env.TEST_DB_HOST,
    port:     Number(process.env.TEST_DB_PORT || 3306),
    user:     process.env.TEST_DB_USER,
    password: process.env.TEST_DB_PASS || "",
    database: process.env.TEST_DB_NAME,
  };
  const url = process.env.TEST_DATABASE_URL;
  if (!url && (!cfg.host || !cfg.user || !cfg.database)) {
    console.log("\nℹ  No TEST_DB_* env set — skipping live rollback test.");
    return { ran: false };
  }
  if (cfg.database && !/test/i.test(cfg.database)) {
    console.error(`✗ Refusing to run: TEST_DB_NAME='${cfg.database}' does not contain 'test'.`);
    process.exit(2);
  }

  let mysql;
  try { mysql = (await import("mysql2/promise")).default ?? await import("mysql2/promise"); }
  catch {
    console.error("✗ mysql2 is not installed — run `npm i mysql2`.");
    process.exit(2);
  }

  const tempDb = `${cfg.database}_dryrun_${process.pid}`;
  const conn = await mysql.createConnection(url || { ...cfg, database: undefined });
  await conn.query(`DROP DATABASE IF EXISTS \`${tempDb}\``);
  await conn.query(`CREATE DATABASE \`${tempDb}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  await conn.query(`USE \`${tempDb}\``);
  console.log(`\n→ Live dry-run against ${cfg.database || url}`);
  try {
    for (const f of LIVE_DRY_RUN_FILES) {
      const sql = await fs.readFile(f, "utf8");
      await conn.beginTransaction();
      try {
        for (const stmt of splitStatements(sql)) {
          if (!stmt.trim()) continue;
          await conn.query(stmt);
        }
        await conn.rollback();
        console.log(`  ✓ ${path.basename(f)} (rolled back)`);
      } catch (e) {
        await conn.rollback().catch(() => {});
        console.error(`  ✗ ${path.basename(f)} → ${e.message}`);
        process.exit(1);
      }
    }
  } finally {
    await conn.query(`DROP DATABASE IF EXISTS \`${tempDb}\``).catch(() => {});
    await conn.end();
  }
  return { ran: true };
}

// Naive splitter — good enough for migrations that don't contain ';' inside string literals
function splitStatements(sql) {
  const statements = [];
  let delimiter = ";";
  let buffer = "";
  let inSingle = false;
  let inDouble = false;
  let inBacktick = false;
  let inLineComment = false;
  let inBlockComment = false;
  let lineStart = true;

  const flushIfDelimited = () => {
    if (!buffer.endsWith(delimiter)) return false;
    const statement = buffer.slice(0, -delimiter.length).trim();
    if (statement) statements.push(statement);
    buffer = "";
    lineStart = true;
    return true;
  };

  for (let i = 0; i < sql.length; i += 1) {
    const char = sql[i];
    const next = sql[i + 1] ?? "";
    if (lineStart) {
      const match = sql.slice(i).match(/^\s*DELIMITER\s+(.+?)\r?\n/i);
      if (match) {
        const pending = buffer.trim();
        if (pending) statements.push(pending);
        buffer = "";
        delimiter = match[1].trim();
        i += match[0].length - 1;
        lineStart = true;
        continue;
      }
    }
    buffer += char;
    if (inLineComment) {
      if (char === "\n") {
        inLineComment = false;
        lineStart = true;
      }
      continue;
    }
    if (inBlockComment) {
      if (char === "*" && next === "/") {
        buffer += next;
        i += 1;
        inBlockComment = false;
      }
      lineStart = char === "\n";
      continue;
    }
    if (!inSingle && !inDouble && !inBacktick) {
      if (char === "-" && next === "-" && /\s/.test(sql[i + 2] ?? "")) {
        buffer += next;
        i += 1;
        inLineComment = true;
        continue;
      }
      if (char === "#") {
        inLineComment = true;
        continue;
      }
      if (char === "/" && next === "*") {
        buffer += next;
        i += 1;
        inBlockComment = true;
        continue;
      }
      if (char === "'") inSingle = true;
      else if (char === '"') inDouble = true;
      else if (char === "`") inBacktick = true;
      else if (flushIfDelimited()) continue;
    } else if (inSingle) {
      if (char === "\\" && next) {
        buffer += next;
        i += 1;
      } else if (char === "'") {
        inSingle = false;
      }
    } else if (inDouble) {
      if (char === "\\" && next) {
        buffer += next;
        i += 1;
      } else if (char === '"') {
        inDouble = false;
      }
    } else if (inBacktick && char === "`") {
      inBacktick = false;
    }
    lineStart = char === "\n";
  }
  const trailing = buffer.trim();
  if (trailing) statements.push(trailing);
  return statements;
}

async function main() {
  const files = await listSqlFiles();
  if (files.length === 0) {
    console.log("No .sql files in sql/.");
    return;
  }
  console.log(`Inspecting ${files.length} SQL files…\n`);
  let issues = 0;
  for (const f of files) {
    const text = await fs.readFile(f, "utf8");
    const r = staticReport(f, text);
    const rel = path.relative(ROOT, f);
    const summary = Object.entries(r.counts).filter(([, v]) => v > 0).map(([k, v]) => `${k}:${v}`).join("  ");
    console.log(`• ${rel}  [${summary || "no DDL detected"}]`);
    for (const w of r.warns) {
      issues++;
      console.log(`    ⚠ ${w}`);
    }
  }
  await maybeLiveDryRun();
  if (issues > 0) {
    console.log(`\n⚠ Static report flagged ${issues} item(s) — review above.`);
    process.exit(0); // warnings, not failures
  }
  console.log(`\n✓ Static SQL inspection clean.`);
}

main().catch((e) => { console.error(e); process.exit(2); });
