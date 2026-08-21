#!/usr/bin/env node
import { chromium } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import mysql from "mysql2/promise";

const BASE_URL = process.env.BASE_URL || "http://localhost:5000";
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";
const DB_NAME = process.env.DB_NAME || "sparowvault_local_cert";
const OUT_DIR = path.join(process.cwd(), "local-phase-05-logs");
mkdirSync(OUT_DIR, { recursive: true });

const stamp = Date.now().toString(36);
const username = `phase5_${stamp}`;
const pin = "583921";
const nowIso = () => new Date().toISOString();
const testDate = "2026-05-21";

function id(prefix, label) {
  return `${prefix}_phase5_${label}_${stamp}`;
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
    { method: "POST", body: JSON.stringify({ userId, idPrefix, data }) },
    token,
  );
}

async function updateEntity(token, collection, entityId, patch) {
  return api(
    `/api/data/entity-item.php?collection=${encodeURIComponent(collection)}&id=${encodeURIComponent(entityId)}`,
    { method: "PATCH", body: JSON.stringify({ patch }) },
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

function tx(entityId, userId, overrides) {
  return {
    ...baseEntity(entityId, userId),
    date: testDate,
    amount: overrides.amountPaise / 100,
    merchantOrPerson: overrides.merchantOrPerson ?? "Phase 5 Replay",
    description: overrides.description ?? "Local Phase 5 finance replay",
    billAvailable: 0,
    gstApplicable: 0,
    taxFlag: 0,
    businessOrPersonal: "personal",
    needWant: "unassigned",
    fixedVariable: "unassigned",
    plannedUnplanned: "unassigned",
    sourceDeviceId: "local-phase-05",
    ...overrides,
  };
}

function canonicalEffect(effect) {
  return {
    target_type: effect.target_type,
    target_id: effect.target_id,
    effect_direction: effect.effect_direction,
    amount_paise: Number(effect.amount_paise),
    component: effect.component,
  };
}

function effectKey(effect) {
  return `${effect.target_type}|${effect.target_id}|${effect.effect_direction}|${effect.amount_paise}|${effect.component}`;
}

function validateExpectedEffects(actualEffects, expectedEffects) {
  const actualKeys = new Set(actualEffects.map((e) => effectKey(canonicalEffect(e))));
  return expectedEffects.filter((expected) => !actualKeys.has(effectKey(expected)));
}

async function fetchTransactionEvidence(conn, userId, entityId) {
  const [hotRows] = await conn.query(
    `SELECT collection_name, entity_id, amount_paise, txn_local_date, txn_month,
            txn_type, payment_mode, category_id, account_id, card_id, loan_id,
            goal_id, udhari_id, business_or_personal
       FROM cloud_collection_rows
      WHERE user_id = ? AND collection_name = 'transactions' AND entity_id = ?`,
    [userId, entityId],
  );
  const [events] = await conn.query(
    `SELECT id, user_id, source_transaction_id, event_type, event_date, amount_paise, status
       FROM financial_events
      WHERE user_id = ? AND source_transaction_id = ? AND deleted_at IS NULL`,
    [userId, entityId],
  );
  const eventIds = events.map((event) => event.id);
  let effects = [];
  if (eventIds.length > 0) {
    const [effectRows] = await conn.query(
      `SELECT event_id, user_id, target_type, target_id, effect_direction, amount_paise, component
         FROM financial_effects
        WHERE user_id = ? AND event_id IN (?)`,
      [userId, eventIds],
    );
    effects = effectRows;
  }
  return { hotRows, events, effects };
}

function sumEffects(effects, filter) {
  return effects
    .filter(filter)
    .reduce((sum, effect) => {
      const sign = effect.effect_direction === "increase" ? 1 : -1;
      return sum + sign * Number(effect.amount_paise);
    }, 0);
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
      displayName: "Phase 5 Finance Replay",
      pin,
      policyAcceptances: [
        { key: "terms", version: "2026-05-13" },
        { key: "privacy", version: "2026-05-13" },
      ],
    }),
  });
  const userId = register.user.id;
  const token = register.token;

  const bank = id("acc", "sbi_bank");
  const cash = id("acc", "cash_wallet");
  const card = id("crd", "hdfc_card");
  const loan = id("lon", "personal_loan");
  const goal = id("gol", "emergency_fund");
  const rahul = id("udh", "rahul");
  const amit = id("udh", "amit");
  const foodCat = id("cat", "food");
  const groceryCat = id("cat", "grocery");
  const interestCat = id("cat", "interest");
  const badDebtCat = id("cat", "bad_debt");

  await createEntity(token, userId, "accounts", "acc", {
    ...baseEntity(bank, userId),
    name: "SBI Bank",
    type: "bank",
    institution: "SBI",
    openingBalance: 50000,
    openingBalancePaise: 5000000,
    color: "#2563eb",
    icon: "bank",
    isInactive: 0,
  });
  await createEntity(token, userId, "accounts", "acc", {
    ...baseEntity(cash, userId),
    name: "Cash Wallet",
    type: "cash",
    openingBalance: 5000,
    openingBalancePaise: 500000,
    color: "#16a34a",
    icon: "wallet",
    isInactive: 0,
  });
  await createEntity(token, userId, "cards", "crd", {
    ...baseEntity(card, userId),
    nickname: "HDFC Card",
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
    name: "Personal Loan",
    lender: "Personal Loan",
    loanType: "personal",
    principal: 500000,
    principalPaise: 50000000,
    disbursedAmount: 500000,
    disbursedAmountPaise: 50000000,
    startDate: "2026-01-01",
    firstEmiDate: "2026-02-05",
    tenureMonths: 60,
    annualInterestRate: 10,
    annualInterestBps: 1000,
    interestType: "reducing_balance",
    emiDueDay: 5,
    lifecycleMode: "fresh",
    completedEmis: 0,
    remainingEmis: 60,
    outstandingPrincipal: 500000,
    outstandingPrincipalPaise: 50000000,
    emiAmountOverride: 10000,
    emiPaise: 1000000,
    processingFee: 0,
    insuranceCost: 0,
    prepaymentAllowed: 1,
    foreclosureCharges: 0,
    linkedAccountId: bank,
    status: "active",
  });
  await createEntity(token, userId, "goals", "gol", {
    ...baseEntity(goal, userId),
    title: "Emergency Fund",
    goalType: "emergency_fund",
    targetAmount: 60000,
    targetAmountPaise: 6000000,
    targetDate: "2027-05-21",
    startedAt: testDate,
    currentSaved: 0,
    savedAmountPaise: 0,
    linkedAccountId: bank,
    priority: 1,
    icon: "shield",
    color: "#0f766e",
    status: "active",
  });
  await createEntity(token, userId, "udhari", "udh", {
    ...baseEntity(rahul, userId),
    personName: "Rahul",
    type: "receivable",
    amount: 1000,
    amountPaise: 100000,
    givenDate: testDate,
    dueDate: "2026-05-01",
    status: "open",
    amountSettled: 0,
    amountSettledPaise: 0,
    reminderOn: 1,
    context: "friend",
  });
  await createEntity(token, userId, "udhari", "udh", {
    ...baseEntity(amit, userId),
    personName: "Amit",
    type: "payable",
    amount: 1000,
    amountPaise: 100000,
    givenDate: testDate,
    dueDate: "2026-06-01",
    status: "open",
    amountSettled: 0,
    amountSettledPaise: 0,
    reminderOn: 1,
    context: "friend",
  });
  for (const [categoryId, name, color] of [
    [foodCat, "Food", "#f97316"],
    [groceryCat, "Grocery", "#84cc16"],
    [interestCat, "Interest", "#0ea5e9"],
    [badDebtCat, "Bad debt", "#ef4444"],
  ]) {
    await createEntity(token, userId, "categories", "cat", {
      ...baseEntity(categoryId, userId),
      name,
      parentId: null,
      appliesTo: "expense",
      icon: "tag",
      color,
      budgetable: 1,
      taxRelevant: 0,
      gstRelevant: 0,
      sortOrder: 1,
      archived: 0,
    });
  }

  const fullEmiTxn = id("txn", "full_emi");
  const partialEmiTxn = id("txn", "partial_emi");
  await createEntity(token, userId, "emis", "emi", {
    ...baseEntity(id("emi", "full"), userId),
    loanId: loan,
    dueDate: testDate,
    paidDate: testDate,
    amountDue: 10000,
    amountPaise: 1000000,
    amountPaid: 10000,
    amountPaidPaise: 1000000,
    principalComponent: 7000,
    principalComponentPaise: 700000,
    interestComponent: 3000,
    interestComponentPaise: 300000,
    status: "paid",
    transactionId: fullEmiTxn,
  });
  await createEntity(token, userId, "emis", "emi", {
    ...baseEntity(id("emi", "partial"), userId),
    loanId: loan,
    dueDate: testDate,
    paidDate: testDate,
    amountDue: 10000,
    amountPaise: 1000000,
    amountPaid: 6000,
    amountPaidPaise: 600000,
    principalComponent: 4000,
    principalComponentPaise: 400000,
    interestComponent: 2000,
    interestComponentPaise: 200000,
    status: "partial",
    transactionId: partialEmiTxn,
  });

  const scenarios = [
    {
      key: "A",
      name: "UPI expense ₹450",
      tx: tx(id("txn", "upi_expense"), userId, {
        type: "expense",
        amountPaise: 45000,
        categoryId: foodCat,
        accountId: bank,
        paymentMode: "upi",
        merchantOrPerson: "Food vendor",
      }),
      eventType: "expense",
      expectedEffects: [
        { target_type: "account", target_id: bank, effect_direction: "decrease", amount_paise: 45000, component: "cash" },
        { target_type: "expense_category", target_id: foodCat, effect_direction: "increase", amount_paise: 45000, component: "expense" },
      ],
    },
    {
      key: "B",
      name: "Credit-card purchase ₹10,000",
      tx: tx(id("txn", "cc_purchase_10000"), userId, {
        type: "expense",
        amountPaise: 1000000,
        categoryId: groceryCat,
        linkedCardId: card,
        paymentMode: "credit_card",
        merchantOrPerson: "Grocery store",
      }),
      eventType: "credit_card_purchase",
      expectedEffects: [
        { target_type: "credit_card", target_id: card, effect_direction: "increase", amount_paise: 1000000, component: "liability" },
        { target_type: "expense_category", target_id: groceryCat, effect_direction: "increase", amount_paise: 1000000, component: "expense" },
      ],
    },
    {
      key: "C",
      name: "Credit-card purchase ₹32,000",
      tx: tx(id("txn", "cc_purchase_32000"), userId, {
        type: "expense",
        amountPaise: 3200000,
        categoryId: groceryCat,
        linkedCardId: card,
        paymentMode: "credit_card",
        merchantOrPerson: "Electronics store",
      }),
      eventType: "credit_card_purchase",
      expectedEffects: [
        { target_type: "credit_card", target_id: card, effect_direction: "increase", amount_paise: 3200000, component: "liability" },
        { target_type: "expense_category", target_id: groceryCat, effect_direction: "increase", amount_paise: 3200000, component: "expense" },
      ],
    },
    {
      key: "D",
      name: "Card bill payment ₹7,000",
      tx: tx(id("txn", "cc_payment_7000"), userId, {
        type: "cc_payment",
        amountPaise: 700000,
        accountId: bank,
        linkedCardId: card,
        paymentMode: "bank_transfer",
        merchantOrPerson: "HDFC Card",
      }),
      eventType: "credit_card_payment",
      expectedEffects: [
        { target_type: "account", target_id: bank, effect_direction: "decrease", amount_paise: 700000, component: "cash" },
        { target_type: "credit_card", target_id: card, effect_direction: "decrease", amount_paise: 700000, component: "liability" },
      ],
    },
    {
      key: "E",
      name: "Card refund ₹2,000",
      tx: tx(id("txn", "card_refund_2000"), userId, {
        type: "refund",
        amountPaise: 200000,
        categoryId: groceryCat,
        accountId: bank,
        linkedCardId: card,
        paymentMode: "credit_card",
        merchantOrPerson: "Merchant refund",
      }),
      eventType: "refund",
      expectedEffects: [
        { target_type: "credit_card", target_id: card, effect_direction: "decrease", amount_paise: 200000, component: "liability" },
        { target_type: "expense_category", target_id: groceryCat, effect_direction: "decrease", amount_paise: 200000, component: "expense" },
      ],
    },
    {
      key: "F",
      name: "EMI ₹10,000",
      tx: tx(fullEmiTxn, userId, {
        type: "emi_payment",
        amountPaise: 1000000,
        categoryId: interestCat,
        accountId: bank,
        linkedLoanId: loan,
        paymentMode: "auto_debit",
        merchantOrPerson: "Personal Loan",
      }),
      eventType: "emi_payment",
      expectedEffects: [
        { target_type: "account", target_id: bank, effect_direction: "decrease", amount_paise: 1000000, component: "cash" },
        { target_type: "loan", target_id: loan, effect_direction: "decrease", amount_paise: 700000, component: "principal" },
        { target_type: "expense_category", target_id: interestCat, effect_direction: "increase", amount_paise: 300000, component: "interest" },
      ],
    },
    {
      key: "G",
      name: "Partial EMI ₹6,000 against ₹10,000",
      tx: tx(partialEmiTxn, userId, {
        type: "emi_payment",
        amountPaise: 600000,
        categoryId: interestCat,
        accountId: bank,
        linkedLoanId: loan,
        paymentMode: "auto_debit",
        merchantOrPerson: "Personal Loan partial",
      }),
      eventType: "emi_payment",
      expectedEffects: [
        { target_type: "account", target_id: bank, effect_direction: "decrease", amount_paise: 600000, component: "cash" },
        { target_type: "loan", target_id: loan, effect_direction: "decrease", amount_paise: 400000, component: "principal" },
        { target_type: "expense_category", target_id: interestCat, effect_direction: "increase", amount_paise: 200000, component: "interest" },
      ],
    },
    {
      key: "H",
      name: "Loan prepayment ₹20,000",
      tx: tx(id("txn", "loan_prepayment"), userId, {
        type: "loan_prepayment",
        amountPaise: 2000000,
        accountId: bank,
        linkedLoanId: loan,
        paymentMode: "bank_transfer",
        merchantOrPerson: "Personal Loan prepayment",
      }),
      eventType: "loan_prepayment",
      expectedEffects: [
        { target_type: "account", target_id: bank, effect_direction: "decrease", amount_paise: 2000000, component: "cash" },
        { target_type: "loan", target_id: loan, effect_direction: "decrease", amount_paise: 2000000, component: "principal" },
      ],
    },
    {
      key: "I",
      name: "Udhari given Rahul ₹1,000",
      tx: tx(id("txn", "udhari_given"), userId, {
        type: "udhari_given",
        amountPaise: 100000,
        accountId: bank,
        linkedUdhariId: rahul,
        paymentMode: "upi",
        merchantOrPerson: "Rahul",
      }),
      eventType: "udhari_given",
      expectedEffects: [
        { target_type: "account", target_id: bank, effect_direction: "decrease", amount_paise: 100000, component: "cash" },
        { target_type: "udhari_person", target_id: rahul, effect_direction: "increase", amount_paise: 100000, component: "receivable" },
      ],
    },
    {
      key: "J",
      name: "Rahul repays ₹400",
      tx: tx(id("txn", "rahul_repay_400"), userId, {
        type: "udhari_collect",
        amountPaise: 40000,
        accountId: bank,
        linkedUdhariId: rahul,
        paymentMode: "bank_transfer",
        merchantOrPerson: "Rahul",
      }),
      afterCreate: async () => updateEntity(token, "udhari", rahul, { amountSettled: 400, amountSettledPaise: 40000, status: "partial" }),
      eventType: "udhari_settlement",
      expectedEffects: [
        { target_type: "account", target_id: bank, effect_direction: "increase", amount_paise: 40000, component: "cash" },
        { target_type: "udhari_person", target_id: rahul, effect_direction: "decrease", amount_paise: 40000, component: "receivable" },
      ],
    },
    {
      key: "K",
      name: "Borrow from Amit ₹1,000",
      tx: tx(id("txn", "borrow_amit"), userId, {
        type: "udhari_received",
        amountPaise: 100000,
        accountId: bank,
        linkedUdhariId: amit,
        paymentMode: "bank_transfer",
        merchantOrPerson: "Amit",
      }),
      eventType: "udhari_received",
      expectedEffects: [
        { target_type: "account", target_id: bank, effect_direction: "increase", amount_paise: 100000, component: "cash" },
        { target_type: "udhari_person", target_id: amit, effect_direction: "increase", amount_paise: 100000, component: "payable" },
      ],
    },
    {
      key: "L",
      name: "Repay Amit ₹1,000",
      tx: tx(id("txn", "repay_amit"), userId, {
        type: "udhari_repay",
        amountPaise: 100000,
        accountId: bank,
        linkedUdhariId: amit,
        paymentMode: "bank_transfer",
        merchantOrPerson: "Amit",
      }),
      afterCreate: async () => updateEntity(token, "udhari", amit, { amountSettled: 1000, amountSettledPaise: 100000, status: "settled" }),
      eventType: "udhari_settlement",
      expectedEffects: [
        { target_type: "account", target_id: bank, effect_direction: "decrease", amount_paise: 100000, component: "cash" },
        { target_type: "udhari_person", target_id: amit, effect_direction: "decrease", amount_paise: 100000, component: "payable" },
      ],
    },
    {
      key: "M",
      name: "Write off Rahul ₹600",
      tx: tx(id("txn", "rahul_writeoff"), userId, {
        type: "udhari_write_off",
        amountPaise: 60000,
        categoryId: badDebtCat,
        linkedUdhariId: rahul,
        paymentMode: "other",
        merchantOrPerson: "Rahul",
        description: "Udhari receivable written off (bad debt / loss): borrower unable to repay",
        plannedUnplanned: "unplanned",
      }),
      afterCreate: async (created) => {
        await updateEntity(token, "udhari", rahul, { amountSettled: 1000, amountSettledPaise: 100000, status: "written_off" });
        await createEntity(token, userId, "udhariSettlements", "uds", {
          ...baseEntity(id("uds", "rahul_writeoff"), userId),
          udhariId: rahul,
          date: testDate,
          amount: 600,
          amountPaise: 60000,
          transactionId: created.id,
          kind: "write_off",
          reason: "borrower unable to repay",
        });
      },
      eventType: "udhari_write_off",
      expectedEffects: [
        { target_type: "udhari_person", target_id: rahul, effect_direction: "decrease", amount_paise: 60000, component: "receivable" },
        { target_type: "expense_category", target_id: badDebtCat, effect_direction: "increase", amount_paise: 60000, component: "expense" },
      ],
    },
    {
      key: "N",
      name: "Goal contribution ₹2,000",
      tx: tx(id("txn", "goal_contribution"), userId, {
        type: "savings_contribution",
        amountPaise: 200000,
        accountId: bank,
        linkedGoalId: goal,
        paymentMode: "bank_transfer",
        merchantOrPerson: "Emergency Fund",
      }),
      afterCreate: async (created) => {
        await updateEntity(token, "goals", goal, { currentSaved: 2000, savedAmountPaise: 200000 });
        await createEntity(token, userId, "goalContribs", "gcn", {
          ...baseEntity(id("gcn", "goal_contribution"), userId),
          goalId: goal,
          date: testDate,
          amount: 2000,
          amountPaise: 200000,
          sourceAccountId: bank,
          transactionId: created.id,
        });
      },
      eventType: "goal_contribution",
      expectedEffects: [
        { target_type: "account", target_id: bank, effect_direction: "decrease", amount_paise: 200000, component: "cash" },
        { target_type: "goal", target_id: goal, effect_direction: "increase", amount_paise: 200000, component: "asset" },
      ],
    },
    {
      key: "O",
      name: "Transfer ₹5,000",
      tx: tx(id("txn", "transfer"), userId, {
        type: "transfer",
        amountPaise: 500000,
        accountId: bank,
        toAccountId: cash,
        paymentMode: "bank_transfer",
        merchantOrPerson: "Self transfer",
      }),
      eventType: "transfer",
      expectedEffects: [
        { target_type: "account", target_id: bank, effect_direction: "decrease", amount_paise: 500000, component: "cash" },
        { target_type: "account", target_id: cash, effect_direction: "increase", amount_paise: 500000, component: "cash" },
      ],
    },
  ];

  const scenarioResults = [];
  const createdTransactions = [];
  for (const scenario of scenarios) {
    const created = await createEntity(token, userId, "transactions", "txn", scenario.tx);
    createdTransactions.push(created);
    if (scenario.afterCreate) await scenario.afterCreate(created);
    const evidence = await fetchTransactionEvidence(conn, userId, created.id);
    const event = evidence.events[0];
    const missingEffects = validateExpectedEffects(evidence.effects, scenario.expectedEffects);
    const hot = evidence.hotRows[0];
    const hotMissing = [];
    for (const field of ["amount_paise", "txn_local_date", "txn_month", "txn_type", "payment_mode", "business_or_personal"]) {
      if (hot?.[field] === null || hot?.[field] === undefined || hot?.[field] === "") hotMissing.push(field);
    }
    const pass =
      evidence.hotRows.length === 1 &&
      hotMissing.length === 0 &&
      evidence.events.length === 1 &&
      event.event_type === scenario.eventType &&
      missingEffects.length === 0;
    scenarioResults.push({
      key: scenario.key,
      name: scenario.name,
      transactionId: created.id,
      status: pass ? "PASS" : "FAIL",
      hotMissing,
      expectedEventType: scenario.eventType,
      actualEventType: event?.event_type ?? null,
      missingEffects,
      evidence,
    });
    if (!pass) {
      throw new Error(`${scenario.key} ${scenario.name} failed ledger/hot-field validation`);
    }
  }

  const [allEffects] = await conn.query(
    `SELECT fe.source_transaction_id, fe.event_type, fx.target_type, fx.target_id, fx.effect_direction, fx.amount_paise, fx.component
       FROM financial_events fe
       JOIN financial_effects fx ON fx.event_id = fe.id
      WHERE fe.user_id = ? AND fe.deleted_at IS NULL`,
    [userId],
  );
  const [emis] = await conn.query(
    `SELECT entity_id, payload FROM cloud_collection_rows WHERE user_id = ? AND collection_name = 'emis' AND deleted_at IS NULL`,
    [userId],
  );
  const parsedEmis = emis.map((row) => ({ entity_id: row.entity_id, payload: JSON.parse(row.payload) }));
  const [udhariRows] = await conn.query(
    `SELECT entity_id, payload FROM cloud_collection_rows WHERE user_id = ? AND collection_name = 'udhari' AND deleted_at IS NULL`,
    [userId],
  );
  const parsedUdhari = udhariRows.map((row) => ({ entity_id: row.entity_id, payload: JSON.parse(row.payload) }));
  const [goals] = await conn.query(
    `SELECT entity_id, payload FROM cloud_collection_rows WHERE user_id = ? AND collection_name = 'goals' AND deleted_at IS NULL`,
    [userId],
  );
  const parsedGoals = goals.map((row) => ({ entity_id: row.entity_id, payload: JSON.parse(row.payload) }));
  const [hotRows] = await conn.query(
    `SELECT collection_name, entity_id, amount_paise, txn_local_date, txn_month,
            txn_type, payment_mode, category_id, account_id, card_id, loan_id,
            goal_id, udhari_id, business_or_personal
       FROM cloud_collection_rows
      WHERE user_id = ? AND collection_name = 'transactions'
      ORDER BY updated_at DESC
      LIMIT 30`,
    [userId],
  );

  const accountMovement = {
    bankPaise: 5000000 + sumEffects(allEffects, (e) => e.target_type === "account" && e.target_id === bank),
    cashPaise: 500000 + sumEffects(allEffects, (e) => e.target_type === "account" && e.target_id === cash),
  };
  const cardLiabilityPaise = sumEffects(allEffects, (e) => e.target_type === "credit_card" && e.target_id === card);
  const loanPrincipalDeltaPaise = sumEffects(allEffects, (e) => e.target_type === "loan" && e.target_id === loan);
  const rahulReceivablePaise = sumEffects(allEffects, (e) => e.target_type === "udhari_person" && e.target_id === rahul && e.component === "receivable");
  const amitPayablePaise = sumEffects(allEffects, (e) => e.target_type === "udhari_person" && e.target_id === amit && e.component === "payable");
  const normalExpensePaise = allEffects
    .filter((e) => e.target_type === "expense_category")
    .reduce((sum, e) => sum + (e.effect_direction === "increase" ? Number(e.amount_paise) : -Number(e.amount_paise)), 0);
  const incomePaise = allEffects
    .filter((e) => e.target_type === "income_category")
    .reduce((sum, e) => sum + (e.effect_direction === "increase" ? Number(e.amount_paise) : -Number(e.amount_paise)), 0);

  const aggregateChecks = [
    { name: "Card outstanding after purchases/payment/refund", expected: 3300000, actual: cardLiabilityPaise },
    { name: "Card utilization after final card replay", expected: 66, actual: Math.round((cardLiabilityPaise / 5000000) * 100) },
    { name: "Bank balance after all bank movements", expected: 5000000 - 45000 - 700000 - 1000000 - 600000 - 2000000 - 100000 + 40000 + 100000 - 100000 - 200000 - 500000, actual: accountMovement.bankPaise },
    { name: "Cash balance after transfer", expected: 1000000, actual: accountMovement.cashPaise },
    { name: "Loan principal reduction", expected: -3100000, actual: loanPrincipalDeltaPaise },
    { name: "Rahul receivable net zero after collect/write-off", expected: 0, actual: rahulReceivablePaise },
    { name: "Amit payable net zero after borrow/repay", expected: 0, actual: amitPayablePaise },
    { name: "Income remains zero for udhari/transfer/card payment", expected: 0, actual: incomePaise },
    { name: "Expense total includes purchases, UPI, interest, bad debt, refund contra", expected: 45000 + 1000000 + 3200000 - 200000 + 300000 + 200000 + 60000, actual: normalExpensePaise },
  ];
  const failedAggregates = aggregateChecks.filter((check) => check.expected !== check.actual);
  if (failedAggregates.length > 0) {
    throw new Error(`Aggregate finance checks failed: ${JSON.stringify(failedAggregates)}`);
  }

  const partialEmi = parsedEmis.find((row) => row.payload.transactionId === partialEmiTxn)?.payload;
  const partialEmiCheck = {
    expectedStatus: "partial",
    actualStatus: partialEmi?.status ?? null,
    expectedPendingPaise: 400000,
    actualPendingPaise: partialEmi ? Number(partialEmi.amountPaise ?? 0) - Number(partialEmi.amountPaidPaise ?? 0) : null,
  };
  if (partialEmiCheck.actualStatus !== "partial" || partialEmiCheck.actualPendingPaise !== 400000) {
    throw new Error(`Partial EMI check failed: ${JSON.stringify(partialEmiCheck)}`);
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const consoleErrors = [];
  const pageErrors = [];
  page.on("console", (msg) => {
    if (msg.type() === "error" && !/401 \(Unauthorized\)/i.test(msg.text())) consoleErrors.push(msg.text());
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await page.goto(FRONTEND_URL, { waitUntil: "networkidle" });
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.goto(FRONTEND_URL, { waitUntil: "networkidle" });
  await page.getByPlaceholder("your.username").fill(username);
  await page.getByPlaceholder("Enter PIN").fill(pin);
  await page.locator('form button[type="submit"]').click();
  await page.waitForFunction(
    () => /money snapshot|cashflow survival|financial health score/i.test(document.body.innerText),
    undefined,
    { timeout: 60000 },
  );
  await page.screenshot({ path: path.join(OUT_DIR, "01-dashboard.png"), fullPage: true });
  const dashboardText = await page.locator("body").innerText();
  await page.goto(`${FRONTEND_URL}/reports`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(OUT_DIR, "02-reports.png"), fullPage: true });
  const reportsText = await page.locator("body").innerText();
  await page.goto(`${FRONTEND_URL}/suggestions`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(OUT_DIR, "03-suggestions.png"), fullPage: true });
  const suggestionsText = await page.locator("body").innerText();
  const dexieCounts = await page.evaluate(async () => {
    const dbs = indexedDB.databases ? await indexedDB.databases() : [];
    const counts = await new Promise((resolve) => {
      const request = indexedDB.open("sparowvault_v1");
      request.onerror = () => resolve({ error: "open failed" });
      request.onsuccess = () => {
        const db = request.result;
        const wanted = ["accounts", "cards", "categories", "transactions", "loans", "emiPayments", "goals", "udhari"];
        const present = wanted.filter((name) => db.objectStoreNames.contains(name));
        const tx = db.transaction(present, "readonly");
        const out = {};
        let pending = present.length;
        if (pending === 0) {
          db.close();
          resolve(out);
          return;
        }
        for (const storeName of present) {
          const countRequest = tx.objectStore(storeName).count();
          countRequest.onsuccess = () => {
            out[storeName] = countRequest.result;
            pending -= 1;
            if (pending === 0) {
              db.close();
              resolve(out);
            }
          };
          countRequest.onerror = () => {
            out[storeName] = "count failed";
            pending -= 1;
            if (pending === 0) {
              db.close();
              resolve(out);
            }
          };
        }
      };
    });
    return { databases: dbs.map((db) => db.name).filter(Boolean), counts };
  });
  await browser.close();

  const fatalConsoleErrors = consoleErrors.filter(
    (message) => !/TypeError: Failed to fetch[\s\S]*ensureCollections/i.test(message),
  );
  const uiChecks = [
    { name: "Dashboard opens for replay user", passed: /money snapshot|financial health score/i.test(dashboardText) },
    { name: "Reports page opens for replay user", passed: /reports|cashflow|expense|ledger/i.test(reportsText) },
    { name: "Suggestions page opens for replay user", passed: /suggestion|insight|action/i.test(suggestionsText) },
    { name: "Dexie has mirrored SQL-backed transactions", passed: Number(dexieCounts.counts?.transactions ?? 0) >= scenarios.length },
    { name: "No fatal browser errors", passed: fatalConsoleErrors.length === 0 && pageErrors.length === 0 },
  ];

  const result = {
    ok: scenarioResults.every((s) => s.status === "PASS") && failedAggregates.length === 0 && uiChecks.every((c) => c.passed),
    checkedAt: nowIso(),
    baseUrl: BASE_URL,
    frontendUrl: FRONTEND_URL,
    testUser: { id: userId, username },
    fixtures: { bank, cash, card, loan, goal, rahul, amit, foodCat, groceryCat, interestCat, badDebtCat },
    scenarioResults,
    aggregateChecks,
    partialEmiCheck,
    finalHotFieldQuery: hotRows,
    allEffects,
    parsedEmis,
    parsedUdhari,
    parsedGoals,
    uiChecks,
    dashboardContains: {
      moneySnapshot: /money snapshot/i.test(dashboardText),
      financialHealthScore: /financial health score/i.test(dashboardText),
      hdfcCard: /hdfc/i.test(dashboardText),
    },
    reportsContains: {
      reports: /reports/i.test(reportsText),
      expense: /expense/i.test(reportsText),
      cashflow: /cashflow/i.test(reportsText),
    },
    suggestionsContains: {
      suggestion: /suggestion|insight|action/i.test(suggestionsText),
      cardRiskText: /card|util|used|danger|risk|84|80/i.test(suggestionsText),
    },
    browserErrors: { consoleErrors, fatalConsoleErrors, pageErrors },
    dexieObservation: {
      databases: dexieCounts.databases,
      counts: dexieCounts.counts,
      note: "SQL-backed repository rows are mirrored into IndexedDB during browser load.",
    },
    screenshots: [
      "local-phase-05-logs/01-dashboard.png",
      "local-phase-05-logs/02-reports.png",
      "local-phase-05-logs/03-suggestions.png",
    ],
  };
  writeFileSync(path.join(OUT_DIR, "manual-finance-replay-results.json"), JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
  if (!result.ok) process.exit(1);

  await conn.end();
}

main().catch((error) => {
  const result = { ok: false, checkedAt: nowIso(), error: error instanceof Error ? error.message : String(error) };
  writeFileSync(path.join(OUT_DIR, "manual-finance-replay-results.json"), JSON.stringify(result, null, 2));
  console.error(error);
  process.exit(1);
});
