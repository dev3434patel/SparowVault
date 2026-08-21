#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import mysql from "mysql2/promise";

const ROOT = process.cwd();
const BACKUP_DIR = path.join(ROOT, "backups", "local-phase-01");
const TARGET_DB = "sparowvault_local_cert";
const REQUIRED_TABLES = [
  "users",
  "cloud_collection_rows",
  "financial_events",
  "financial_effects",
  "user_credit_cards",
  "user_loans",
  "user_loan_payments",
  "udhari_people",
  "udhari_entries",
  "udhari_settlements",
  "ai_suggestions",
  "payments",
  "subscriptions",
  "webhook_events",
  "user_audit_logs",
  "schema_version",
];

function parseEnv(text) {
  const env = {};
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) continue;
    let value = match[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    env[match[1]] = value;
  }
  return env;
}

async function loadLocalDbConfig() {
  const base = parseEnv(await readFile(path.join(ROOT, ".env"), "utf8").catch(() => ""));
  const envFile = base.APP_ENV_FILE || ".env.local";
  const local = parseEnv(await readFile(path.join(ROOT, envFile), "utf8"));
  return {
    host: local.DB_HOST || "127.0.0.1",
    port: Number(local.DB_PORT || 3306),
    user: local.DB_USER || "root",
    password: local.DB_PASS ?? "",
    database: local.DB_NAME || "sparowvault",
    envFile,
  };
}

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

async function databaseExists(conn, dbName) {
  const [rows] = await conn.query("SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME=?", [dbName]);
  return rows.length > 0;
}

async function backupDatabase(conn, dbName) {
  await mkdir(BACKUP_DIR, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupPath = path.join(BACKUP_DIR, `${dbName}_${stamp}.sql`);
  if (!(await databaseExists(conn, dbName))) {
    await writeFile(backupPath, `-- Database ${dbName} did not exist; no backup data available.\n`, "utf8");
    return { backupPath, tableCount: 0, rowCount: 0, existed: false };
  }

  const out = [];
  out.push(`-- SparowVault Local Phase 01 backup`);
  out.push(`-- Source database: ${dbName}`);
  out.push(`-- Created at: ${new Date().toISOString()}`);
  out.push("SET NAMES utf8mb4;");
  out.push("SET FOREIGN_KEY_CHECKS=0;");
  out.push(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
  out.push(`USE \`${dbName}\`;`);

  const [tables] = await conn.query(
    "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA=? AND TABLE_TYPE='BASE TABLE' ORDER BY TABLE_NAME",
    [dbName],
  );
  let rowCount = 0;
  for (const table of tables) {
    const tableName = table.TABLE_NAME;
    const [createRows] = await conn.query(`SHOW CREATE TABLE \`${dbName}\`.\`${tableName}\``);
    out.push("");
    out.push(`DROP TABLE IF EXISTS \`${tableName}\`;`);
    out.push(`${createRows[0]["Create Table"]};`);
    const [rows] = await conn.query(`SELECT * FROM \`${dbName}\`.\`${tableName}\``);
    rowCount += rows.length;
    for (const row of rows) {
      const columns = Object.keys(row).map((column) => `\`${column}\``).join(", ");
      const values = Object.values(row).map((value) => conn.escape(value)).join(", ");
      out.push(`INSERT INTO \`${tableName}\` (${columns}) VALUES (${values});`);
    }
  }
  out.push("SET FOREIGN_KEY_CHECKS=1;");
  await writeFile(backupPath, `${out.join("\n")}\n`, "utf8");
  return { backupPath, tableCount: tables.length, rowCount, existed: true };
}

async function applySqlFile(conn, filePath) {
  const sql = await readFile(filePath, "utf8");
  const statements = splitStatements(sql);
  let applied = 0;
  for (const statement of statements) {
    if (!statement.trim()) continue;
    await conn.query(statement);
    applied += 1;
  }
  return { filePath, statements: applied };
}

async function verify(conn) {
  const [charsetRows] = await conn.query(
    "SELECT DEFAULT_CHARACTER_SET_NAME AS charset_name, DEFAULT_COLLATION_NAME AS collation_name FROM information_schema.SCHEMATA WHERE SCHEMA_NAME=?",
    [TARGET_DB],
  );
  const [tablesRows] = await conn.query("SHOW TABLES");
  const tableNames = tablesRows.map((row) => Object.values(row)[0]).sort();
  const missingTables = REQUIRED_TABLES.filter((table) => !tableNames.includes(table));
  const [schemaRows] = await conn.query("SELECT version_key, applied_at FROM schema_version ORDER BY applied_at DESC LIMIT 10").catch(() => [[]]);
  return {
    charset: charsetRows[0] ?? null,
    tableNames,
    requiredTables: REQUIRED_TABLES,
    missingTables,
    schemaVersionRows: schemaRows,
  };
}

async function main() {
  const cfg = await loadLocalDbConfig();
  const conn = await mysql.createConnection({
    host: cfg.host,
    port: cfg.port,
    user: cfg.user,
    password: cfg.password,
    multipleStatements: false,
  });

  try {
    const backup = await backupDatabase(conn, cfg.database);
    await conn.query(`DROP DATABASE IF EXISTS \`${TARGET_DB}\``);
    await conn.query(`CREATE DATABASE \`${TARGET_DB}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    await conn.query(`USE \`${TARGET_DB}\``);

    const imports = [];
    imports.push(await applySqlFile(conn, path.join(ROOT, "sql", "production_schema.sql")));
    imports.push(await applySqlFile(conn, path.join(ROOT, "sql", "migrations", "all_phases_combined.sql")));

    const verification = await verify(conn);
    const result = {
      ok: verification.missingTables.length === 0 && verification.charset?.charset_name === "utf8mb4",
      checkedAt: new Date().toISOString(),
      envFile: cfg.envFile,
      sourceDatabaseBackedUp: cfg.database,
      targetDatabase: TARGET_DB,
      backup,
      imports: imports.map((entry) => ({
        file: path.relative(ROOT, entry.filePath).replace(/\\/g, "/"),
        statements: entry.statements,
      })),
      verification,
    };
    console.log(JSON.stringify(result, null, 2));
    if (!result.ok) process.exit(1);
  } finally {
    await conn.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
