import assert from "node:assert/strict";
import { performance } from "node:perf_hooks";
import { mkdir, writeFile } from "node:fs/promises";
import * as XLSX from "xlsx";
import { sumIncome, sumExpense, deriveAccountBalanceFromAccount, categoryBreakdown } from "../src/services/calculations.ts";
import { splitTransaction } from "../src/services/businessPersonalSplit.ts";
import { buildCAWorkbook } from "../src/exports/xlsxExporter.ts";
import { reportNetWorth, reportAccountReconciliation, reportMonthlyCashflow, reportUdhariAgeing } from "../src/services/caReports.ts";
import { rupeesToPaise, paiseToRupees } from "../src/utils/money.ts";

const directory = process.env.AUDIT_DIRECTORY || "docs/audit-evidence/2026-09-11-full/calculations";
await mkdir(directory, { recursive: true });
const checks = [];
async function check(name, run) {
  const start = performance.now();
  try { const evidence = await run(); checks.push({ name, pass: true, durationMs: performance.now() - start, evidence }); }
  catch (error) { checks.push({ name, pass: false, durationMs: performance.now() - start, error: error.message }); }
  console.log(`${checks.at(-1).pass ? "PASS" : "FAIL"} ${name}`);
}
const common = { userId: "audit", isDeleted: 0, createdAt: "2026-09-01T00:00:00.000Z", updatedAt: "2026-09-01T00:00:00.000Z", version: 1, tags: [], notes: "" };
const account = { ...common, id: "bank", name: "Audit bank", type: "bank", openingBalance: 10000, openingBalancePaise: 1000000 };
const category = { ...common, id: "food", name: "Food", appliesTo: "expense", color: "#dc2626", icon: "tag" };
const tx = { ...common, id: "expense", type: "expense", date: "2026-09-01T12:00:00.000Z", amount: 400, amountPaise: 40000, accountId: "bank", categoryId: "food", description: "Synthetic dinner", merchantOrPerson: "Cafe", paymentMode: "upi", businessOrPersonal: "personal" };
const contribution = { ...tx, id: "return", type: "refund", transactionIntent: "expense_contribution", linkedOriginalTransactionId: tx.id, amount: 200, amountPaise: 20000 };
const ctx = { txs: [tx], events: [], effects: [], accounts: [account], cards: [], loans: [], emis: [], goals: [], udharis: [], categories: [category] };
const exportCtx = { transactions: [tx], accounts: [account], categories: [category], cards: [], loans: [], emis: [], goals: [], goalContribs: [], udhari: [], budgets: [], investments: [], savingsContribs: [], userId: "audit", reportPeriod: "2026-09" };
const sheet = (context, name) => {
  const workbook = XLSX.read(buildCAWorkbook(context).buffer, { type: "array" });
  return XLSX.utils.sheet_to_json(workbook.Sheets[name]);
};
await check("10,000 integer-paise round trips remain exact", () => {
  for (let i = 0; i < 10000; i++) { const paise = (i * 982451653) % 100000000000; assert.equal(rupeesToPaise(paiseToRupees(paise)), paise); }
  return { cases: 10000 };
});
await check("10,000 mixed splits preserve total and nonnegative allocations", () => {
  for (let i = 0; i < 10000; i++) {
    const amount = i * 7919, result = splitTransaction({ ...tx, amountPaise: amount, businessOrPersonal: "mixed", splitBusinessPct: i % 121 - 10 });
    assert.equal(result.businessPaise + result.personalPaise, amount); assert.ok(result.businessPaise >= 0 && result.personalPaise >= 0);
  }
  return { cases: 10000 };
});
await check("Contribution agrees across income, expense, account balance and category", () => {
  const rows = [tx, contribution];
  assert.equal(sumIncome(rows), 0); assert.equal(sumExpense(rows), 20000);
  assert.equal(deriveAccountBalanceFromAccount(account.id, account, rows), 980000);
  const categories = categoryBreakdown(rows, [category]); assert.equal(categories[0].amountPaise, 20000);
  return { incomePaise: 0, expensePaise: 20000, closingPaise: 980000 };
});
await check("Deleted original and return have no income/expense effect", () => {
  const rows = [tx, contribution].map(row => ({ ...row, isDeleted: 1 })); assert.equal(sumIncome(rows), 0); assert.equal(sumExpense(rows), 0);
});
await check("Own-account transfer is neutral for consolidated cash and income/expense", () => {
  const target = { ...account, id: "second", openingBalance: 0, openingBalancePaise: 0 };
  const transfer = { ...tx, type: "transfer", accountId: "bank", fromAccountId: "bank", toAccountId: "second", amountPaise: 40000 };
  assert.equal(sumIncome([transfer]), 0); assert.equal(sumExpense([transfer]), 0);
  assert.equal(deriveAccountBalanceFromAccount("bank", account, [transfer]) + deriveAccountBalanceFromAccount("second", target, [transfer]), 1000000);
});
await check("CA net worth includes opening bank balance with no transactions", () => {
  const result = reportNetWorth({ ...ctx, txs: [] }); assert.equal(result.assetsPaise, 1000000, JSON.stringify(result));
});
await check("CA net worth respects canonical receivable and payable fields", () => {
  const result = reportNetWorth({ ...ctx, accounts: [], txs: [], udharis: [{ ...common, id: "receivable", type: "receivable", amount: 1000, amountPaise: 100000, amountSettled: 200, amountSettledPaise: 20000 }] });
  assert.equal(result.assetsPaise, 80000, JSON.stringify(result));
});
await check("CA reconciliation does not invent an independent closing balance", () => {
  const result = reportAccountReconciliation(ctx); assert.notEqual(result[0].status, "matched", JSON.stringify(result));
});
const event = { ...common, id: "event", sourceTransactionId: tx.id, eventDate: "2026-08-01", status: "posted", eventType: "expense" };
const effect = { ...common, id: "effect", eventId: event.id, targetType: "account", targetId: account.id, effectDirection: "decrease", amountPaise: 40000, component: "cash" };
await check("CA Udhari ageing uses canonical outstanding amount and given date", () => {
  const result = reportUdhariAgeing({ ...ctx, udharis: [{ ...common, id: "debt", personName: "Audit friend", type: "receivable", amount: 1000, amountPaise: 100000, amountSettled: 200, amountSettledPaise: 20000, givenDate: "2026-08-01", status: "partial" }] }, new Date("2026-09-11T00:00:00Z"));
  assert.equal(result[0].outstandingPaise, 80000, JSON.stringify(result)); assert.equal(result[0].ageDays, 41);
});
await check("CA income summary excludes a 200 contribution credit", () => {
  const result = sheet({ ...exportCtx, transactions: [tx, contribution], events: [{ ...event, eventDate: "2026-09-01" }, { ...event, id: "return-event", sourceTransactionId: contribution.id, eventDate: "2026-09-01", eventType: "refund" }], effects: [effect, { ...effect, id: "return-effect", eventId: "return-event", effectDirection: "increase", amountPaise: 20000 }] }, "Income_Summary_Monthly");
  assert.equal(result.reduce((sum, row) => sum + row.Income, 0), 0, JSON.stringify(result));
});
await check("CA income summary excludes an own-account transfer credit", () => {
  const transfer = { ...tx, type: "transfer", toAccountId: "second" };
  const result = sheet({ ...exportCtx, transactions: [transfer], accounts: [account, { ...account, id: "second", openingBalancePaise: 0 }], events: [{ ...event, eventDate: "2026-09-01", eventType: "transfer" }], effects: [effect, { ...effect, id: "other-leg", targetId: "second", effectDirection: "increase" }] }, "Income_Summary_Monthly");
  assert.equal(result.reduce((sum, row) => sum + row.Income, 0), 0, JSON.stringify(result));
});
await check("CA expense summary includes card purchases even before a bank bill payment", () => {
  const purchase = { ...tx, accountId: undefined, linkedCardId: "card", paymentMode: "credit_card" };
  const result = sheet({ ...exportCtx, transactions: [purchase], events: [{ ...event, eventDate: "2026-09-01" }], effects: [{ ...effect, targetType: "credit_card", targetId: "card", component: "liability", effectDirection: "increase" }, { ...effect, id: "category-effect", targetType: "expense_category", targetId: "food", component: "expense", effectDirection: "increase" }] }, "Expense_Summary_Monthly");
  assert.equal(result.reduce((sum, row) => sum + row.Expense, 0), 400, JSON.stringify(result));
});
await check("CA monthly cashflow excludes effects of a reversed source event", () => {
  const result = reportMonthlyCashflow({ ...ctx, events: [{ ...event, status: "reversed" }], effects: [effect] });
  assert.equal(result.reduce((sum, row) => sum + row.outflowsPaise, 0), 0, JSON.stringify(result));
});
await check("September-filtered workbook cannot include August cashflow", () => {
  const result = sheet({ ...exportCtx, events: [event], effects: [effect] }, "Expense_Summary_Monthly");
  assert.ok(!result.some(row => row.Month === "2026-08"), JSON.stringify(result));
});
await check("Workbook allocates a 70/30 mixed expense into business and personal totals", () => {
  const result = sheet({ ...exportCtx, transactions: [{ ...tx, businessOrPersonal: "mixed", splitBusinessPct: 70 }] }, "Business_Personal_Split");
  assert.equal(result[0].Business, 280, JSON.stringify(result)); assert.equal(result[0].Personal, 120);
});
await check("50,000 real-engine transactions match an independent integer oracle", () => {
  let income = 0, expense = 0;
  const rows = Array.from({ length: 50000 }, (_, index) => {
    const amount = (index % 997 + 1) * 100; const type = index % 2 ? "income" : "expense";
    if (type === "income") income += amount; else expense += amount;
    return { ...tx, id: `load_${index}`, type, amountPaise: amount, amount: amount / 100 };
  });
  const start = performance.now();
  assert.equal(sumIncome(rows), income); assert.equal(sumExpense(rows), expense);
  assert.equal(deriveAccountBalanceFromAccount(account.id, account, rows), 1000000 + income - expense);
  return { rows: rows.length, engineDurationMs: performance.now() - start, incomePaise: income, expensePaise: expense, browserOrApiBenchmark: false };
});
await writeFile(`${directory}/results.json`, JSON.stringify({ date: new Date().toISOString(), scope: "Pure production finance/export functions with synthetic inputs; failures are desired-contract assertions", checks }, null, 2));
process.exitCode = checks.some(check => !check.pass) ? 1 : 0;
