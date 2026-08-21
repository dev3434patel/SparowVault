#!/usr/bin/env node
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import mysql from "mysql2/promise";

const BASE_URL = process.env.BASE_URL || "http://localhost:5000";
const DB_NAME = process.env.DB_NAME || "sparowvault_local_cert";
const OUT_DIR = path.join(process.cwd(), "local-phase-04-logs");
mkdirSync(OUT_DIR, { recursive: true });

const nowIso = () => new Date().toISOString();
const stamp = Date.now().toString(36);
const username = `phase4_${stamp}`;
const pin = "583921";

function id(prefix, label) {
  return `${prefix}_phase4_${label}_${stamp}`;
}

async function api(pathname, init = {}, token = null) {
  const headers = new Headers(init.headers ?? {});
  headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const response = await fetch(`${BASE_URL}${pathname}`, { ...init, headers });
  const text = await response.text();
  let body;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    throw new Error(`Non-JSON API response ${response.status} ${pathname}: ${text.slice(0, 200)}`);
  }
  if (!response.ok || body?.ok === false) {
    throw new Error(`API ${response.status} ${pathname}: ${body?.error ?? text}`);
  }
  return body?.data;
}

async function createEntity(token, userId, collection, idPrefix, data) {
  return api(
    `/api/data/entity.php?collection=${encodeURIComponent(collection)}`,
    {
      method: "POST",
      body: JSON.stringify({ userId, idPrefix, data }),
    },
    token,
  );
}

function baseEntity(entityId, userId) {
  return {
    id: entityId,
    userId,
    createdAt: nowIso(),
    updatedAt: nowIso(),
    isDeleted: 0,
    version: 1,
    tags: [],
    notes: "",
  };
}

function baseTransaction(entityId, userId, overrides) {
  return {
    ...baseEntity(entityId, userId),
    date: "2026-05-21",
    amount: overrides.amountPaise / 100,
    merchantOrPerson: overrides.merchantOrPerson ?? "Phase 4 Test",
    description: overrides.description ?? "Local Phase 4 hot-field verification",
    billAvailable: 0,
    gstApplicable: 0,
    taxFlag: 0,
    businessOrPersonal: "personal",
    needWant: "unassigned",
    fixedVariable: "unassigned",
    plannedUnplanned: "unassigned",
    sourceDeviceId: "local-phase-04",
    ...overrides,
  };
}

function validateRow(scenario, row) {
  const missing = [];
  for (const field of ["amount_paise", "txn_local_date", "txn_month", "txn_type", "payment_mode", "business_or_personal"]) {
    if (row[field] === null || row[field] === undefined || row[field] === "") missing.push(field);
  }
  for (const field of scenario.requiredHotFields) {
    if (row[field] === null || row[field] === undefined || row[field] === "") missing.push(field);
  }
  return [...new Set(missing)];
}

async function main() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || "127.0.0.1",
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASS || "",
    database: DB_NAME,
  });

  const register = await api("/api/auth/register.php", {
    method: "POST",
    body: JSON.stringify({
      username,
      displayName: "Phase 4 Hot Fields",
      pin,
      policyAcceptances: [
        { key: "terms", version: "2026-05-13" },
        { key: "privacy", version: "2026-05-13" },
      ],
    }),
  });
  const token = register.token;
  const userId = register.user.id;
  if (!token || !userId) throw new Error("Register response did not include dev token/user id");

  const bankA = id("acc", "bank_a");
  const bankB = id("acc", "bank_b");
  const card = id("crd", "hdfc");
  const loan = id("lon", "home");
  const goal = id("gol", "emergency");
  const udhari = id("udh", "rahul");
  const foodCat = id("cat", "food");
  const groceryCat = id("cat", "grocery");

  await createEntity(token, userId, "accounts", "acc", {
    ...baseEntity(bankA, userId),
    name: "Phase 4 Bank A",
    type: "bank",
    institution: "Local MySQL",
    openingBalance: 50000,
    openingBalancePaise: 5000000,
    color: "#2563eb",
    icon: "bank",
    isInactive: 0,
  });
  await createEntity(token, userId, "accounts", "acc", {
    ...baseEntity(bankB, userId),
    name: "Phase 4 Bank B",
    type: "bank",
    institution: "Local MySQL",
    openingBalance: 0,
    openingBalancePaise: 0,
    color: "#16a34a",
    icon: "bank",
    isInactive: 0,
  });
  await createEntity(token, userId, "cards", "crd", {
    ...baseEntity(card, userId),
    nickname: "Phase 4 HDFC",
    bank: "HDFC",
    last4: "4242",
    type: "credit",
    creditLimit: 50000,
    creditLimitPaise: 5000000,
    statementDay: 10,
    dueDay: 25,
    interestRate: 36,
    color: "#dc2626",
    isInactive: 0,
  });
  await createEntity(token, userId, "loans", "lon", {
    ...baseEntity(loan, userId),
    name: "Phase 4 Loan",
    lender: "Local Bank",
    loanType: "personal",
    principal: 500000,
    principalPaise: 50000000,
    outstandingPrincipalPaise: 50000000,
    emi: 10000,
    emiPaise: 1000000,
    interestRate: 10,
    annualInterestBps: 1000,
    startDate: "2026-01-01",
    dueDay: 5,
    tenureMonths: 60,
    remainingTenureMonths: 60,
    status: "active",
  });
  await createEntity(token, userId, "goals", "gol", {
    ...baseEntity(goal, userId),
    name: "Phase 4 Emergency Fund",
    targetAmount: 60000,
    targetAmountPaise: 6000000,
    savedAmount: 0,
    savedAmountPaise: 0,
    targetDate: "2027-05-21",
    icon: "shield",
    color: "#0f766e",
    priority: "critical",
    status: "active",
  });
  await createEntity(token, userId, "udhari", "udh", {
    ...baseEntity(udhari, userId),
    personName: "Rahul Phase 4",
    relationship: "friend",
    direction: "given",
    amount: 1000,
    amountPaise: 100000,
    amountSettledPaise: 0,
    dueDate: "2026-06-21",
    status: "open",
  });
  for (const [categoryId, name] of [[foodCat, "Food"], [groceryCat, "Grocery"]]) {
    await createEntity(token, userId, "categories", "cat", {
      ...baseEntity(categoryId, userId),
      name: `Phase 4 ${name}`,
      type: "expense",
      color: name === "Food" ? "#f97316" : "#84cc16",
      icon: "utensils",
      sortOrder: 1,
      isSystem: 0,
    });
  }

  const scenarios = [
    {
      name: "UPI expense",
      requiredHotFields: ["category_id", "account_id"],
      tx: baseTransaction(id("txn", "upi_expense"), userId, {
        type: "expense",
        amountPaise: 45000,
        categoryId: foodCat,
        accountId: bankA,
        paymentMode: "upi",
        merchantOrPerson: "Food Vendor",
      }),
    },
    {
      name: "Credit-card expense",
      requiredHotFields: ["category_id", "card_id"],
      tx: baseTransaction(id("txn", "cc_expense"), userId, {
        type: "expense",
        amountPaise: 45000,
        categoryId: groceryCat,
        linkedCardId: card,
        paymentMode: "credit_card",
        merchantOrPerson: "Grocery Store",
      }),
    },
    {
      name: "Credit-card payment",
      requiredHotFields: ["account_id", "card_id"],
      tx: baseTransaction(id("txn", "cc_payment"), userId, {
        type: "cc_payment",
        amountPaise: 45000,
        accountId: bankA,
        linkedCardId: card,
        paymentMode: "bank_transfer",
        merchantOrPerson: "HDFC Card",
      }),
    },
    {
      name: "EMI payment",
      requiredHotFields: ["account_id", "loan_id"],
      tx: baseTransaction(id("txn", "emi_payment"), userId, {
        type: "emi_payment",
        amountPaise: 1000000,
        accountId: bankA,
        linkedLoanId: loan,
        paymentMode: "auto_debit",
        merchantOrPerson: "Local Bank",
        principalComponentPaise: 700000,
        interestComponentPaise: 300000,
      }),
    },
    {
      name: "Udhari given",
      requiredHotFields: ["account_id", "udhari_id"],
      tx: baseTransaction(id("txn", "udhari_given"), userId, {
        type: "udhari_given",
        amountPaise: 100000,
        accountId: bankA,
        linkedUdhariId: udhari,
        paymentMode: "upi",
        merchantOrPerson: "Rahul Phase 4",
      }),
    },
    {
      name: "Goal contribution",
      requiredHotFields: ["account_id", "goal_id"],
      tx: baseTransaction(id("txn", "goal_contribution"), userId, {
        type: "savings_contribution",
        amountPaise: 200000,
        accountId: bankA,
        linkedGoalId: goal,
        paymentMode: "bank_transfer",
        merchantOrPerson: "Emergency Fund",
      }),
    },
    {
      name: "Transfer",
      requiredHotFields: ["account_id"],
      tx: baseTransaction(id("txn", "transfer"), userId, {
        type: "transfer",
        amountPaise: 500000,
        accountId: bankA,
        toAccountId: bankB,
        paymentMode: "bank_transfer",
        merchantOrPerson: "Self transfer",
      }),
    },
  ];

  const checks = [];
  for (const scenario of scenarios) {
    const created = await createEntity(token, userId, "transactions", "txn", scenario.tx);
    const [rows] = await conn.query(
      `SELECT collection_name, entity_id, amount_paise, txn_local_date, txn_month,
              txn_type, payment_mode, category_id, account_id, card_id, loan_id,
              goal_id, udhari_id, business_or_personal
         FROM cloud_collection_rows
        WHERE user_id = ?
          AND collection_name = 'transactions'
        ORDER BY updated_at DESC
        LIMIT 20`,
      [userId],
    );
    const row = rows.find((item) => item.entity_id === created.id);
    if (!row) throw new Error(`Missing cloud_collection_rows transaction row for ${scenario.name}`);
    const missing = validateRow(scenario, row);
    checks.push({
      scenario: scenario.name,
      entityId: created.id,
      status: missing.length === 0 ? "PASS" : "FAIL",
      missing,
      row,
      queryRows: rows,
    });
    if (missing.length > 0) {
      throw new Error(`${scenario.name} missing hot fields: ${missing.join(", ")}`);
    }
  }

  const [finalRows] = await conn.query(
    `SELECT collection_name, entity_id, amount_paise, txn_local_date, txn_month,
            txn_type, payment_mode, category_id, account_id, card_id, loan_id,
            goal_id, udhari_id, business_or_personal
       FROM cloud_collection_rows
      WHERE user_id = ?
        AND collection_name = 'transactions'
      ORDER BY updated_at DESC
      LIMIT 20`,
    [userId],
  );
  const [dbMeta] = await conn.query("SELECT DATABASE() AS db_name, @@character_set_database AS charset_name");
  await conn.end();

  const result = {
    ok: true,
    checkedAt: nowIso(),
    baseUrl: BASE_URL,
    database: dbMeta,
    testUser: { id: userId, username },
    checks,
    finalQuery: finalRows,
  };
  writeFileSync(path.join(OUT_DIR, "sync-hot-fields-results.json"), JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  const result = { ok: false, checkedAt: nowIso(), error: error instanceof Error ? error.message : String(error) };
  writeFileSync(path.join(OUT_DIR, "sync-hot-fields-results.json"), JSON.stringify(result, null, 2));
  console.error(error);
  process.exit(1);
});
