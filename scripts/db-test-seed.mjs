#!/usr/bin/env node
/**
 * PHASE 0 — Load the 7 fixture users into the test DB.
 *
 * Imports the typed fixtures from tests/fixtures/users/* and writes them as
 * cloud_collection_rows rows. Never uses production data. Re-runs are safe —
 * existing rows are TRUNCATEd first.
 *
 * Usage:
 *   TEST_DB_NAME=sparowvault_test … npm run db:test:seed
 */
import { promises as fs } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const ROOT = process.cwd();
const FIX_DIR = path.join(ROOT, "tests", "fixtures", "users");

const cfg = {
  host:     process.env.TEST_DB_HOST,
  port:     Number(process.env.TEST_DB_PORT || 3306),
  user:     process.env.TEST_DB_USER,
  password: process.env.TEST_DB_PASS || "",
  database: process.env.TEST_DB_NAME,
  multipleStatements: true,
};
const url = process.env.TEST_DATABASE_URL;

const FORBIDDEN_DATABASES = new Set([
  "sparowvault",
  "sparowvault_current_schema",
  "sparowvault_final_merge",
  "sparowvault_final_sql_validate",
]);

function refuseDestructiveTarget(name, label) {
  const normalized = String(name || "").trim().toLowerCase();
  if (!normalized || FORBIDDEN_DATABASES.has(normalized) || !/test/i.test(normalized)) {
    console.error(`✗ Refusing destructive runner before connect: ${label} '${name || ""}' is not allowlisted.`);
    process.exit(2);
  }
}

if (!String(process.env.AUDIT_RUN_SENTINEL || "").trim()) {
  console.error("✗ Refusing destructive runner before connect: per-run sentinel is missing.");
  process.exit(2);
}
if (!cfg.database && !url) {
  console.error("✗ Refusing destructive runner before connect: database is not configured.");
  process.exit(2);
}
if (cfg.database) refuseDestructiveTarget(cfg.database, "TEST_DB_NAME");
if (url) {
  let urlName = "";
  try {
    urlName = decodeURIComponent(new URL(url).pathname.replace(/^\/+/, "").split("/")[0] ?? "");
  } catch {
    urlName = "";
  }
  refuseDestructiveTarget(urlName, "TEST_DATABASE_URL");
}

const mysql = (await import("mysql2/promise"));

function toSqlDateTime(value) {
  const d = value ? new Date(value) : new Date("2026-05-01T00:00:00.000Z");
  if (Number.isNaN(d.getTime())) return "2026-05-01 00:00:00";
  return d.toISOString().slice(0, 19).replace("T", " ");
}

function paiseInteger(value) {
  if (value === undefined || value === null || value === "") return null;
  if (Number.isInteger(value)) return value;
  if (typeof value === "string" && /^\d+$/.test(value)) return Number(value);
  if (typeof value === "number" && Number.isFinite(value) && Math.floor(value) === value) return value;
  return null;
}

function rupeesToPaise(value) {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value === "string" && value.trim() !== "" && Number.isFinite(Number(value))) {
    return Math.round(Number(value) * 100);
  }
  if (typeof value === "number" && Number.isFinite(value)) return Math.round(value * 100);
  return null;
}

function computeHotFields(row) {
  const payload = row.payload ?? {};
  const amountPaise =
    payload.amountPaise !== undefined
      ? paiseInteger(payload.amountPaise)
      : payload.limitPaise !== undefined
        ? paiseInteger(payload.limitPaise)
        : payload.targetAmountPaise !== undefined
          ? paiseInteger(payload.targetAmountPaise)
          : rupeesToPaise(payload.amount);
  const dateRaw = payload.date ?? payload.dueDate ?? payload.givenDate ?? payload.startedAt ?? payload.startDate;
  const date = dateRaw ? new Date(dateRaw) : null;
  const txnLocalDate = date && !Number.isNaN(date.getTime()) ? date.toISOString().slice(0, 10) : null;
  const isTxn = row.collection === "transactions";
  const paymentMode =
    payload.paymentMode ??
    (isTxn && (payload.cardId || payload.linkedCardId) ? "credit_card" : isTxn ? "bank_transfer" : null);
  const normalizedPayload = {
    ...payload,
    ...(isTxn && payload.paymentMode === undefined ? { paymentMode } : {}),
    ...(isTxn && payload.amountPaise === undefined && amountPaise !== null ? { amountPaise } : {}),
    ...(isTxn && payload.businessOrPersonal === undefined ? { businessOrPersonal: "personal" } : {}),
  };

  return {
    payload: normalizedPayload,
    amountPaise,
    schemaVersion: Number(payload.schemaVersion ?? 1),
    txnLocalDate,
    txnMonth: txnLocalDate ? txnLocalDate.slice(0, 7) : null,
    txnType: isTxn ? (payload.type ?? null) : null,
    paymentMode,
    categoryId: payload.categoryId ?? null,
    accountId: payload.accountId ?? payload.linkedAccountId ?? payload.sourceAccountId ?? null,
    cardId: payload.linkedCardId ?? payload.cardId ?? null,
    loanId: payload.linkedLoanId ?? payload.loanId ?? null,
    goalId: payload.linkedGoalId ?? payload.goalId ?? null,
    udhariId: payload.linkedUdhariId ?? payload.udhariId ?? null,
    businessOrPersonal: payload.businessOrPersonal ?? (isTxn ? "personal" : null),
    sourceDeviceId: payload.sourceDeviceId ?? "fixture-seed",
    payloadHash: null,
  };
}

async function loadFixtures() {
  // We import .ts fixtures via tsx; require the caller to use `tsx scripts/db-test-seed.mjs`
  // OR pre-compile. Here we attempt require(.ts) — falls back to compiled .js if you
  // ran `npm run build:fixtures`.
  const entries = await fs.readdir(FIX_DIR, { withFileTypes: true });
  const files = entries
    .filter((e) => e.isFile() && /\.(ts|mjs|js)$/.test(e.name) && !e.name.endsWith(".d.ts"))
    .map((e) => path.join(FIX_DIR, e.name));
  const fixtures = [];
  for (const f of files) {
    const mod = await import(pathToFileURL(f).href);
    if (mod.default) fixtures.push(mod.default);
  }
  return fixtures;
}

async function main() {
  const fixtures = await loadFixtures();
  if (fixtures.length === 0) {
    console.error("✗ No fixtures found in tests/fixtures/users/");
    process.exit(1);
  }

  const conn = await mysql.createConnection(url || cfg);
  console.log(`→ Connected to ${cfg.database || url}`);
  console.log("→ Truncating user-owned tables…");
  await conn.query("SET FOREIGN_KEY_CHECKS = 0");
  await conn.query("TRUNCATE TABLE cloud_collection_rows");
  await conn.query("DELETE FROM subscriptions");
  await conn.query("DELETE FROM payments");
  await conn.query("DELETE FROM users WHERE id LIKE 'fixt_%'");
  await conn.query("SET FOREIGN_KEY_CHECKS = 1");

  for (const fx of fixtures) {
    console.log(`→ Seeding fixture: ${fx.user.username}`);
    await conn.query(
      `INSERT INTO users (id, username, display_name, pin_hash, pin_salt, role, is_active)
       VALUES (?, ?, ?, ?, ?, 'user', 1)`,
      [fx.user.id, fx.user.username, fx.user.displayName, fx.user.pinHashPlaceholder, fx.user.pinSaltPlaceholder]
    );
    for (const row of fx.rows) {
      const hot = computeHotFields(row);
      const payloadJson = JSON.stringify(hot.payload);
      const updatedAt = toSqlDateTime(hot.payload.updatedAt ?? hot.payload.date ?? hot.payload.createdAt);
      await conn.query(
        `INSERT INTO cloud_collection_rows (
          id, user_id, collection_name, entity_id, payload, updated_at, created_at,
          schema_version, amount_paise, txn_local_date, txn_month, txn_type, payment_mode,
          category_id, account_id, card_id, loan_id, goal_id, udhari_id, business_or_personal,
          source_device_id, payload_hash
        )
         VALUES (UUID(), ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?, ?, ?,
          ?, SHA2(?, 256))`,
        [
          fx.user.id,
          row.collection,
          row.entityId,
          payloadJson,
          updatedAt,
          updatedAt,
          hot.schemaVersion,
          hot.amountPaise,
          hot.txnLocalDate,
          hot.txnMonth,
          hot.txnType,
          hot.paymentMode,
          hot.categoryId,
          hot.accountId,
          hot.cardId,
          hot.loanId,
          hot.goalId,
          hot.udhariId,
          hot.businessOrPersonal,
          hot.sourceDeviceId,
          payloadJson,
        ]
      );
    }
  }

  await conn.end();
  console.log(`✓ Seeded ${fixtures.length} fixture user(s) into test DB.`);
}

main().catch((e) => { console.error("✗", e.message); process.exit(1); });
