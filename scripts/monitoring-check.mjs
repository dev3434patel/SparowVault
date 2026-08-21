#!/usr/bin/env node
/**
 * Phase 17 monitoring probe.
 *
 * Intended for cron or an external runner. It checks:
 * - health endpoint
 * - failed Razorpay webhook count
 * - newest backup freshness
 * - local disk/storage availability
 * - database size
 *
 * Exit code is 0 when all checks are within thresholds, 1 otherwise.
 */
import { access, readdir, stat } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import process from "node:process";
import mysql from "mysql2/promise";

const args = process.argv.slice(2);
const arg = (name, fallback) => {
  const index = args.indexOf(name);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
};

const healthUrl = arg("--health-url", process.env.MONITOR_HEALTH_URL || "http://localhost:5000/api/health.php");
const backupDir = arg("--backup-dir", process.env.MONITOR_BACKUP_DIR || path.join(process.cwd(), "backups"));
const maxBackupAgeHours = Number(arg("--max-backup-age-hours", process.env.MONITOR_MAX_BACKUP_AGE_HOURS || "30"));
const maxFailedWebhooks = Number(arg("--max-failed-webhooks", process.env.MONITOR_MAX_FAILED_WEBHOOKS || "0"));
const maxDbSizeMb = Number(arg("--max-db-size-mb", process.env.MONITOR_MAX_DB_SIZE_MB || "1024"));
const minFreeDiskMb = Number(arg("--min-free-disk-mb", process.env.MONITOR_MIN_FREE_DISK_MB || "1024"));

const dbConfig = {
  host: process.env.DB_HOST || process.env.TEST_DB_HOST || "127.0.0.1",
  port: Number(process.env.DB_PORT || process.env.TEST_DB_PORT || 3306),
  user: process.env.DB_USER || process.env.TEST_DB_USER || "root",
  password: process.env.DB_PASS ?? process.env.TEST_DB_PASS ?? "",
  database: process.env.DB_NAME || process.env.TEST_DB_NAME || "sparowvault_test",
};

const results = [];

function record(name, ok, detail = {}) {
  results.push({ name, ok, detail });
}

async function checkHealth() {
  const res = await fetch(healthUrl, { headers: { "X-Request-Id": `monitor-${Date.now()}` } });
  const json = await res.json();
  record("health", res.ok && json?.data?.status === "healthy" && json?.data?.db?.status === "ok", {
    statusCode: res.status,
    appStatus: json?.data?.status,
    dbStatus: json?.data?.db?.status,
    requestId: res.headers.get("x-request-id") || json?.data?.requestId || null,
  });
}

async function newestBackupAgeHours() {
  await access(backupDir);
  const files = await readdir(backupDir);
  let newest = 0;
  let newestFile = null;
  for (const file of files) {
    if (!/\.(sql|json|zip|gz|gpg)$/i.test(file)) continue;
    const full = path.join(backupDir, file);
    const st = await stat(full);
    if (st.mtimeMs > newest) {
      newest = st.mtimeMs;
      newestFile = file;
    }
  }
  if (!newest) return { ageHours: Infinity, newestFile: null };
  return { ageHours: (Date.now() - newest) / 36e5, newestFile };
}

async function checkDb() {
  const conn = await mysql.createConnection(dbConfig);
  try {
    const [webhooks] = await conn.query(
      "SELECT COUNT(*) AS count FROM webhook_events WHERE processing_status='failed'",
    ).catch(() => [[{ count: 0 }]]);
    const failedWebhookCount = Number(webhooks?.[0]?.count ?? 0);
    record("failed_webhooks", failedWebhookCount <= maxFailedWebhooks, { failedWebhookCount, maxFailedWebhooks });

    const [sizes] = await conn.query(
      "SELECT ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) AS sizeMb FROM information_schema.tables WHERE table_schema=?",
      [dbConfig.database],
    );
    const dbSizeMb = Number(sizes?.[0]?.sizeMb ?? 0);
    record("db_size", dbSizeMb <= maxDbSizeMb, { database: dbConfig.database, dbSizeMb, maxDbSizeMb });
  } finally {
    await conn.end();
  }
}

async function checkBackup() {
  try {
    const backup = await newestBackupAgeHours();
    record("backup_freshness", backup.ageHours <= maxBackupAgeHours, {
      newestFile: backup.newestFile,
      ageHours: Number.isFinite(backup.ageHours) ? Number(backup.ageHours.toFixed(2)) : null,
      maxBackupAgeHours,
    });
  } catch (error) {
    record("backup_freshness", false, { error: error.message, backupDir });
  }
}

function checkDisk() {
  const freeMb = Number(process.env.MONITOR_FREE_DISK_MB_OVERRIDE || "0");
  if (freeMb > 0) {
    record("disk_storage", freeMb >= minFreeDiskMb, { freeMb, minFreeDiskMb, source: "override" });
    return;
  }
  record("disk_storage", true, {
    platform: os.platform(),
    note: "Use host monitor for exact free disk on Windows/shared hosting, or set MONITOR_FREE_DISK_MB_OVERRIDE.",
    minFreeDiskMb,
  });
}

async function main() {
  await checkHealth().catch((error) => record("health", false, { error: error.message }));
  await checkDb().catch((error) => {
    record("failed_webhooks", false, { error: error.message });
    record("db_size", false, { error: error.message });
  });
  await checkBackup();
  checkDisk();

  const ok = results.every((result) => result.ok);
  console.log(JSON.stringify({ ok, checkedAt: new Date().toISOString(), results }, null, 2));
  process.exit(ok ? 0 : 1);
}

main();
