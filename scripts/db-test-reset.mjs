#!/usr/bin/env node
/**
 * PHASE 0 — Reset a clean SCHEMA-ONLY test database.
 *
 * Drops every table in TEST_DB_NAME, re-applies sql/production_schema.sql,
 * and does NOT load any user data. Pair with `npm run db:test:seed` to
 * load fixtures.
 *
 * SAFETY:
 *   - Refuses to run unless TEST_DB_NAME contains the substring 'test'.
 *   - Never touches the production DB.
 *   - Requires explicit TEST_DB_* env (or TEST_DATABASE_URL).
 *
 * Usage:
 *   TEST_DB_HOST=localhost TEST_DB_USER=root TEST_DB_PASS=… TEST_DB_NAME=sparowvault_test \
 *     npm run db:test:reset
 */
import { promises as fs } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const SCHEMA = path.join(ROOT, "sql", "production_schema.sql");
const COMBINED_MIGRATION = path.join(ROOT, "sql", "migrations", "all_phases_combined.sql");

const cfg = {
  host:     process.env.TEST_DB_HOST,
  port:     Number(process.env.TEST_DB_PORT || 3306),
  user:     process.env.TEST_DB_USER,
  password: process.env.TEST_DB_PASS || "",
  database: process.env.TEST_DB_NAME,
  multipleStatements: true,
};
const url = process.env.TEST_DATABASE_URL;

if (!url && (!cfg.host || !cfg.user || !cfg.database)) {
  console.error("✗ Set TEST_DB_HOST, TEST_DB_USER, TEST_DB_NAME (and TEST_DB_PASS) or TEST_DATABASE_URL.");
  process.exit(2);
}
if (cfg.database && !/test/i.test(cfg.database)) {
  console.error(`✗ Refusing to run: TEST_DB_NAME='${cfg.database}' must contain 'test'.`);
  process.exit(2);
}

const mysql = (await import("mysql2/promise"));

function splitSqlStatements(sql) {
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
  const conn = await mysql.createConnection(url || cfg);
  console.log(`→ Connected to ${cfg.database || url}`);

  console.log("→ Dropping all tables…");
  await conn.query("SET FOREIGN_KEY_CHECKS = 0");
  const [rows] = await conn.query("SHOW TABLES");
  for (const row of rows) {
    const tbl = Object.values(row)[0];
    await conn.query(`DROP TABLE IF EXISTS \`${tbl}\``);
    console.log(`   dropped ${tbl}`);
  }
  await conn.query("SET FOREIGN_KEY_CHECKS = 1");

  console.log(`→ Applying ${path.relative(ROOT, SCHEMA)}…`);
  const sql = await fs.readFile(SCHEMA, "utf8");
  await conn.query(sql);

  console.log(`→ Applying ${path.relative(ROOT, COMBINED_MIGRATION)}…`);
  const migrationSql = await fs.readFile(COMBINED_MIGRATION, "utf8");
  for (const statement of splitSqlStatements(migrationSql)) {
    if (statement.trim()) await conn.query(statement);
  }
  const atomicWrites = await fs.readFile(path.join(ROOT, "sql", "migrations", "20260910_atomic_writes.sql"), "utf8");
  await conn.query(atomicWrites);
  await conn.query(await fs.readFile(path.join(ROOT, "sql", "migrations", "20260911_security_sessions.sql"), "utf8"));

  await conn.end();
  console.log("✓ Test DB reset (schema-only, no user data).");
}

main().catch((e) => { console.error("✗", e.message); process.exit(1); });
