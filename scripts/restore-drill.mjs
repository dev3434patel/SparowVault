#!/usr/bin/env node
/**
 * Phase 17 backup restore drill.
 *
 * Usage:
 *   node scripts/restore-drill.mjs --backup backups/db_latest.sql --target sparowvault_restore_drill
 *
 * Safety:
 * - --target must contain "drill" or "test".
 * - Drops only the target database.
 * - Uses mysql2 so the drill works even when mysql/mysqldump CLIs are absent.
 */
import { spawn } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";
import os from "node:os";
import mysql from "mysql2/promise";

const args = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};

const BACKUP = arg("--backup");
const TARGET = arg("--target");
const HOST = process.env.TEST_DB_HOST || process.env.DB_HOST;
const USER = process.env.TEST_DB_USER || process.env.DB_USER;
const PASS = process.env.TEST_DB_PASS ?? process.env.DB_PASS ?? "";
const PORT = process.env.TEST_DB_PORT || process.env.DB_PORT || "3306";

if (!BACKUP || !TARGET || !HOST || !USER) {
  console.error("Usage: node scripts/restore-drill.mjs --backup <file.sql[.gpg]> --target <name>");
  console.error("Required env: TEST_DB_HOST, TEST_DB_USER, TEST_DB_PASS, TEST_DB_PORT?");
  process.exit(2);
}

if (!/(drill|test)/i.test(TARGET)) {
  console.error("Refusing: --target must contain 'drill' or 'test'.");
  process.exit(2);
}

function runShell(line) {
  return new Promise((resolve, reject) => {
    const c = spawn(
      process.platform === "win32" ? "cmd.exe" : "/bin/sh",
      process.platform === "win32" ? ["/c", line] : ["-c", line],
      { stdio: ["inherit", "pipe", "inherit"] },
    );
    let out = "";
    c.stdout?.on("data", (d) => {
      out += d.toString();
      process.stdout.write(d);
    });
    c.on("close", (code) => (code === 0 ? resolve(out) : reject(new Error(`shell exited ${code}`))));
  });
}

async function ensureExists(p) {
  try {
    await fs.access(p);
  } catch {
    console.error("backup file not found:", p);
    process.exit(1);
  }
}

async function connect(database) {
  return mysql.createConnection({
    host: HOST,
    port: Number(PORT),
    user: USER,
    password: PASS,
    database,
    multipleStatements: true,
  });
}

async function main() {
  await ensureExists(BACKUP);

  let sqlFile = BACKUP;
  if (BACKUP.endsWith(".gpg")) {
    sqlFile = path.join(os.tmpdir(), path.basename(BACKUP).replace(/\.gpg$/, ""));
    console.log(`decrypting ${BACKUP} to ${sqlFile}`);
    await runShell(`gpg --output "${sqlFile}" --decrypt "${BACKUP}"`);
  }

  console.log(`recreating database ${TARGET}`);
  const admin = await connect(undefined);
  try {
    await admin.query("DROP DATABASE IF EXISTS ??", [TARGET]);
    await admin.query("CREATE DATABASE ?? CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci", [TARGET]);
  } finally {
    await admin.end();
  }

  console.log(`importing ${sqlFile} into ${TARGET}`);
  const sql = await fs.readFile(sqlFile, "utf8");
  const restore = await connect(TARGET);
  try {
    await restore.query(sql);
  } finally {
    await restore.end();
  }

  console.log(`smoke testing ${TARGET}`);
  const smoke = await connect(TARGET);
  let tablesCount = 0;
  let userCount = 0;
  let transactionRows = 0;
  let subscriptionRows = 0;
  let schemaRows = [];
  let schemaVersionAvailable = true;
  let subscriptionsAvailable = true;
  try {
    const [tableRows] = await smoke.query(
      "SELECT COUNT(*) AS tables_count FROM information_schema.tables WHERE table_schema=?",
      [TARGET],
    );
    tablesCount = Number(tableRows?.[0]?.tables_count ?? 0);
    const [userRows] = await smoke.query("SELECT COUNT(*) AS user_count FROM users");
    userCount = Number(userRows?.[0]?.user_count ?? 0);
    const [txRows] = await smoke.query("SELECT COUNT(*) AS transaction_rows FROM cloud_collection_rows WHERE collection_name='transactions'");
    transactionRows = Number(txRows?.[0]?.transaction_rows ?? 0);
    try {
      const [subRows] = await smoke.query("SELECT COUNT(*) AS subscription_rows FROM subscriptions");
      subscriptionRows = Number(subRows?.[0]?.subscription_rows ?? 0);
    } catch {
      subscriptionsAvailable = false;
    }
    try {
      const [versions] = await smoke.query("SELECT version_key, applied_at FROM schema_version ORDER BY applied_at DESC LIMIT 3");
      schemaRows = versions;
    } catch {
      schemaVersionAvailable = false;
    }
  } finally {
    await smoke.end();
  }

  const result = {
    ok: tablesCount > 0,
    target: TARGET,
    tablesCount,
    userCount,
    transactionRows,
    subscriptionsAvailable,
    subscriptionRows,
    schemaVersionAvailable,
    schemaRows,
  };
  console.log(JSON.stringify(result, null, 2));
  if (!result.ok) process.exit(1);
  console.log("Restore drill complete. Drop the drill database when the report is signed off.");
}

main().catch((e) => {
  console.error("Restore drill failed:", e.message);
  process.exit(1);
});
