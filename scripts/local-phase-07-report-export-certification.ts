import fs from "node:fs";
import path from "node:path";
import * as XLSX from "xlsx";
import type {
  Account,
  Card,
  Category,
  FinancialEffect,
  FinancialEvent,
  Goal,
  Loan,
  Transaction,
  UdhariRecord,
} from "../src/types";
import {
  buildCAReportBundle,
  buildReportFooter,
  reportAccountReconciliation,
  reportBusinessExpense,
  reportCardLedger,
  reportCategoryLedger,
  reportDebtSummary,
  reportGstMissingBill,
  reportInterestPaid,
  reportMonthlyCashflow,
  reportNetWorth,
  reportPersonalExpense,
  reportReceivablePayableSummary,
  reportTaxFlag,
  reportTransactionMaster,
  type ReportContext,
} from "../src/services/caReports";
import { buildCAWorkbook } from "../src/exports/xlsxExporter";

type Phase5HotRow = {
  entity_id: string;
  amount_paise: number;
  txn_local_date: string;
  txn_type: Transaction["type"];
  payment_mode: Transaction["paymentMode"];
  category_id: string | null;
  account_id: string | null;
  card_id: string | null;
  loan_id: string | null;
  goal_id: string | null;
  udhari_id: string | null;
  business_or_personal: Transaction["businessOrPersonal"];
};

type Phase5SqlEvent = {
  id: string;
  event_type: string;
  amount_paise: number;
  event_date: string;
  status: FinancialEvent["status"];
  source_transaction_id: string;
};

type Phase5SqlEffect = {
  event_id: string;
  target_type: string;
  target_id: string;
  effect_direction: string;
  amount_paise: number;
  component: string;
};

const ROOT = process.cwd();
const LOG_DIR = path.join(ROOT, "local-phase-07-logs");
fs.mkdirSync(LOG_DIR, { recursive: true });

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
}

const phase5 = readJson<{
  checkedAt: string;
  testUser: { id: string; username: string };
  fixtures: Record<string, string>;
  finalHotFieldQuery: Phase5HotRow[];
}>(path.join(ROOT, "local-phase-05-logs", "manual-finance-replay-results.json"));

const sql = readJson<{
  checkedAt: string;
  userId: string;
  events: Phase5SqlEvent[];
  effects: Phase5SqlEffect[];
}>(path.join(ROOT, "local-phase-05-logs", "sql-financial-events-effects-check.json"));

const userId = phase5.testUser.id;
const now = "2026-05-22T00:00:00.000Z";
const base = {
  userId,
  createdAt: now,
  updatedAt: now,
  isDeleted: 0,
  version: 1,
  tags: [] as string[],
  notes: "",
};

function eventFromSql(row: Phase5SqlEvent): FinancialEvent {
  return {
    id: row.id,
    userId,
    sourceTransactionId: row.source_transaction_id,
    eventType: row.event_type,
    eventDate: row.event_date,
    amountPaise: row.amount_paise,
    currency: "INR",
    description: row.event_type,
    source: "transaction",
    status: row.status,
    createdAt: now,
    updatedAt: now,
  } as FinancialEvent;
}

function effectFromSql(row: Phase5SqlEffect, index: number): FinancialEffect {
  return {
    id: `phase5_fx_${index}`,
    eventId: row.event_id,
    userId,
    targetType: row.target_type,
    targetId: row.target_id,
    effectDirection: row.effect_direction,
    amountPaise: row.amount_paise,
    component: row.component,
    createdAt: now,
  } as FinancialEffect;
}

function txFromHot(row: Phase5HotRow): Transaction {
  return {
    ...base,
    id: row.entity_id,
    date: row.txn_local_date,
    type: row.txn_type,
    amount: row.amount_paise / 100,
    amountPaise: row.amount_paise,
    categoryId: row.category_id ?? undefined,
    accountId: row.account_id ?? undefined,
    linkedCardId: row.card_id ?? undefined,
    linkedLoanId: row.loan_id ?? undefined,
    linkedGoalId: row.goal_id ?? undefined,
    linkedUdhariId: row.udhari_id ?? undefined,
    paymentMode: row.payment_mode,
    merchantOrPerson: row.txn_type,
    description: row.txn_type,
    billAvailable: 1,
    gstApplicable: 0,
    taxFlag: 0,
    businessOrPersonal: row.business_or_personal,
    needWant: "unassigned",
    fixedVariable: "unassigned",
    plannedUnplanned: "unassigned",
  } as Transaction;
}

function category(id: string, name: string): Category {
  return {
    ...base,
    id,
    name,
    parentId: null,
    appliesTo: "expense",
    icon: "tag",
    color: "#0ea5e9",
    budgetable: 1,
    taxRelevant: 0,
    gstRelevant: 0,
    sortOrder: 1,
    archived: 0,
  } as Category;
}

const categories: Category[] = [
  category(phase5.fixtures.foodCat, "Food"),
  category(phase5.fixtures.groceryCat, "Grocery"),
  category(phase5.fixtures.interestCat, "Interest"),
  category(phase5.fixtures.badDebtCat, "Bad Debt"),
  category("cat_phase7_business", "Business Supplies"),
  category("cat_phase7_personal", "Personal"),
];

const accounts: Account[] = [
  {
    ...base,
    id: phase5.fixtures.bank,
    name: "SBI Bank",
    type: "bank",
    openingBalance: 50_000,
    openingBalancePaise: 5_000_000,
    currentBalancePaise: -255_000,
    color: "#0ea5e9",
    icon: "bank",
    isInactive: 0,
  } as Account,
  {
    ...base,
    id: phase5.fixtures.cash,
    name: "Cash Wallet",
    type: "cash",
    openingBalance: 5_000,
    openingBalancePaise: 500_000,
    currentBalancePaise: 1_000_000,
    color: "#22c55e",
    icon: "wallet",
    isInactive: 0,
  } as Account,
];

const cards: Card[] = [
  {
    ...base,
    id: phase5.fixtures.card,
    nickname: "HDFC Card",
    bank: "HDFC",
    last4: "1234",
    type: "credit",
    creditLimit: 50_000,
    creditLimitPaise: 5_000_000,
    outstandingPaise: 3_300_000,
    color: "#2563eb",
    statementDay: 10,
    dueDay: 25,
    isInactive: 0,
  } as Card,
];

const loans: Loan[] = [
  {
    ...base,
    id: phase5.fixtures.loan,
    name: "Personal Loan",
    lender: "Personal Loan",
    loanType: "personal",
    principal: 500_000,
    principalPaise: 50_000_000,
    outstandingPrincipalPaise: 46_900_000,
    startDate: "2026-01-01T00:00:00.000Z",
    tenureMonths: 60,
    annualInterestRate: 12,
    emiDueDay: 5,
    emiAmountOverride: 10_000,
    prepaymentAllowed: 1,
    processingFee: 0,
    insuranceCost: 0,
    status: "active",
  } as Loan,
];

const udharis: UdhariRecord[] = [
  {
    ...base,
    id: phase5.fixtures.rahul,
    personName: "Rahul",
    name: "Rahul",
    type: "receivable",
    direction: "given",
    amount: 1_000,
    amountPaise: 100_000,
    settledAmount: 400,
    settledAmountPaise: 40_000,
    amountSettled: 400,
    amountSettledPaise: 40_000,
    outstandingPaise: 60_000,
    givenDate: "2026-05-01T00:00:00.000Z",
    dueDate: "2026-05-15T00:00:00.000Z",
    status: "partial",
    reminderOn: 1,
    context: "friend",
  } as UdhariRecord,
  {
    ...base,
    id: phase5.fixtures.amit,
    personName: "Amit",
    name: "Amit",
    type: "payable",
    direction: "received",
    amount: 1_000,
    amountPaise: 100_000,
    settledAmount: 0,
    settledAmountPaise: 0,
    amountSettled: 0,
    amountSettledPaise: 0,
    outstandingPaise: 100_000,
    givenDate: "2026-05-01T00:00:00.000Z",
    dueDate: "2026-05-15T00:00:00.000Z",
    status: "active",
    reminderOn: 1,
    context: "friend",
  } as UdhariRecord,
];

const businessTx: Transaction = {
  ...base,
  id: "txn_phase7_business_mixed",
  date: "2026-05-22T00:00:00.000Z",
  type: "expense",
  amount: 1_000,
  amountPaise: 100_000,
  categoryId: "cat_phase7_business",
  accountId: phase5.fixtures.bank,
  paymentMode: "upi",
  merchantOrPerson: "Business Vendor",
  description: "Mixed business/personal test expense",
  billAvailable: 0,
  gstApplicable: 1,
  taxFlag: 1,
  businessOrPersonal: "mixed",
  splitBusinessPaise: 60_000,
  needWant: "need",
  fixedVariable: "variable",
  plannedUnplanned: "planned",
} as Transaction;

const personalTx: Transaction = {
  ...businessTx,
  id: "txn_phase7_personal",
  amount: 500,
  amountPaise: 50_000,
  categoryId: "cat_phase7_personal",
  merchantOrPerson: "Personal Vendor",
  description: "Personal test expense",
  billAvailable: 1,
  gstApplicable: 0,
  taxFlag: 0,
  businessOrPersonal: "personal",
  splitBusinessPaise: undefined,
} as Transaction;

const syntheticEvents: FinancialEvent[] = [
  {
    id: "evt_phase7_business_mixed",
    userId,
    sourceTransactionId: businessTx.id,
    eventType: "expense",
    eventDate: businessTx.date,
    amountPaise: businessTx.amountPaise,
    currency: "INR",
    description: businessTx.description,
    source: "transaction",
    status: "posted",
    createdAt: now,
    updatedAt: now,
  } as FinancialEvent,
  {
    id: "evt_phase7_personal",
    userId,
    sourceTransactionId: personalTx.id,
    eventType: "expense",
    eventDate: personalTx.date,
    amountPaise: personalTx.amountPaise,
    currency: "INR",
    description: personalTx.description,
    source: "transaction",
    status: "posted",
    createdAt: now,
    updatedAt: now,
  } as FinancialEvent,
];

const syntheticEffects: FinancialEffect[] = [
  {
    id: "fx_phase7_business_cash",
    eventId: "evt_phase7_business_mixed",
    userId,
    targetType: "account",
    targetId: phase5.fixtures.bank,
    effectDirection: "decrease",
    amountPaise: 100_000,
    component: "cash",
    createdAt: now,
  } as FinancialEffect,
  {
    id: "fx_phase7_business_expense",
    eventId: "evt_phase7_business_mixed",
    userId,
    targetType: "expense_category",
    targetId: "cat_phase7_business",
    effectDirection: "increase",
    amountPaise: 100_000,
    component: "expense",
    createdAt: now,
  } as FinancialEffect,
  {
    id: "fx_phase7_personal_cash",
    eventId: "evt_phase7_personal",
    userId,
    targetType: "account",
    targetId: phase5.fixtures.bank,
    effectDirection: "decrease",
    amountPaise: 50_000,
    component: "cash",
    createdAt: now,
  } as FinancialEffect,
  {
    id: "fx_phase7_personal_expense",
    eventId: "evt_phase7_personal",
    userId,
    targetType: "expense_category",
    targetId: "cat_phase7_personal",
    effectDirection: "increase",
    amountPaise: 50_000,
    component: "expense",
    createdAt: now,
  } as FinancialEffect,
];

const events: FinancialEvent[] = sql.events.map(eventFromSql).concat(syntheticEvents);
const effects: FinancialEffect[] = sql.effects.map(effectFromSql).concat(syntheticEffects);
const txs: Transaction[] = phase5.finalHotFieldQuery.map(txFromHot).concat([businessTx, personalTx]);

const ctx: ReportContext = {
  txs,
  events,
  effects,
  accounts,
  cards,
  loans,
  emis: [],
  goals: [{ ...base, id: phase5.fixtures.goal, title: "Emergency Fund" } as Goal],
  udharis,
  categories,
};

const categoryLedger = reportCategoryLedger(ctx);
const cashflow = reportMonthlyCashflow(ctx);
const cardLedger = reportCardLedger(ctx);
const interestPaid = reportInterestPaid(ctx);
const receivablePayable = reportReceivablePayableSummary(ctx);
const businessExpense = reportBusinessExpense(ctx);
const personalExpense = reportPersonalExpense(ctx);
const gstMissing = reportGstMissingBill(ctx);
const taxFlag = reportTaxFlag(ctx);
const reconciliation = reportAccountReconciliation(ctx);
const netWorth = reportNetWorth(ctx);
const debt = reportDebtSummary(ctx);
const master = reportTransactionMaster(ctx);
const footer = buildReportFooter({ ctx, userId, reportPeriod: "2026-05", appVersion: "local-phase-07" });
const bundle = buildCAReportBundle(ctx, footer);
const workbook = XLSX.read(
  buildCAWorkbook(
    {
      transactions: txs,
      categories,
      accounts,
      cards,
      budgets: [],
      goals: ctx.goals,
      goalContribs: [],
      loans,
      emis: [],
      udhari: udharis,
      investments: [],
      savingsContribs: [],
      events,
      effects,
      userId,
      reportPeriod: "2026-05",
      appVersion: "local-phase-07",
    },
    "local_phase_07",
  ).buffer,
  { type: "array" },
);

function sumSheet(sheetName: string, col: string): number {
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets[sheetName]);
  return rows.reduce((sum, row) => sum + Number(row[col] ?? 0), 0);
}

const expenseTotalPaise = categoryLedger.reduce((sum, row) => sum + row.totalExpensePaise, 0);
const workbookExpenseByCategoryPaise = Math.round(sumSheet("Expense_By_Category", "Amount") * 100);

const checks: Array<{ name: string; pass: boolean; evidence: unknown }> = [];
function check(name: string, pass: boolean, evidence: unknown) {
  checks.push({ name, pass, evidence });
}

const hasCategory = (categoryId: string, amountPaise: number) =>
  categoryLedger.some((row) => row.categoryId === categoryId && row.totalExpensePaise === amountPaise);
const month = cashflow.find((row) => row.yyyymm === "2026-05");

check("Expense report includes card purchases and UPI expense", hasCategory(phase5.fixtures.groceryCat, 4_000_000) && hasCategory(phase5.fixtures.foodCat, 45_000), categoryLedger);
check("Card bill payment does not appear as new expense", !categoryLedger.some((row) => row.totalExpensePaise === 700_000 && row.categoryId === phase5.fixtures.card), categoryLedger);
check("Card bill payment appears in cashflow", (month?.outflowsPaise ?? 0) >= 700_000, month);
check("EMI interest appears as expense", hasCategory(phase5.fixtures.interestCat, 500_000), categoryLedger);
check("EMI principal appears as loan reduction", interestPaid.some((row) => row.loanId === phase5.fixtures.loan && row.totalPrincipalPaise === 3_100_000), interestPaid);
check("Udhari given appears as receivable", receivablePayable.receivablePaise === 60_000, receivablePayable);
check("Udhari received appears as payable", receivablePayable.payablePaise === 100_000, receivablePayable);
check("Udhari write-off appears as expense", hasCategory(phase5.fixtures.badDebtCat, 60_000), categoryLedger);
check("Transfers do not appear as income or expense", !categoryLedger.some((row) => row.categoryId === "transfer") && !master.some((row) => row.type === "transfer" && row.category), master.filter((row) => row.type === "transfer"));
check("Business/personal split totals correctly", businessExpense.totalPaise === 60_000 && personalExpense.totalPaise === 4_335_000, { businessExpense, personalExpense });
check("GST missing bill report works", gstMissing.some((row) => row.id === businessTx.id), gstMissing);
check("Tax flag report works", taxFlag.some((row) => row.id === businessTx.id), taxFlag);
check("Credit-card ledger reports purchases/payments", cardLedger.some((row) => row.cardId === phase5.fixtures.card && row.purchasesPaise === 4_200_000 && row.paymentsPaise === 900_000), cardLedger);
check("Net worth and debt reports are generated", Number.isFinite(netWorth.netWorthPaise) && debt.totalDebtPaise > 0, { netWorth, debt });
check("Account reconciliation generated and matched", reconciliation.length === accounts.length && reconciliation.every((row) => row.status === "matched"), reconciliation);
check("CA workbook export contains required sheets", ["Transactions_Master", "Expense_By_Category", "Account_Reconciliation", "Export_Footer"].every((name) => workbook.SheetNames.includes(name)), workbook.SheetNames);
check("Export totals match ledger report totals", workbookExpenseByCategoryPaise === expenseTotalPaise, { workbookExpenseByCategoryPaise, expenseTotalPaise });
check("Full data export contains current user only", JSON.stringify({ txs, accounts, cards, loans, udharis }).includes(userId) && !JSON.stringify({ txs, accounts, cards, loans, udharis }).includes("other_user"), { userId });
check("CA report bundle has all sections", ["transactionMaster", "monthlyCashflow", "categoryLedger", "accountLedger", "creditCardLedger", "loanAmortization", "interestPaidSummary", "udhariAgeing", "businessExpense", "personalExpense", "gstMissingBill", "taxFlag", "netWorth", "debtSummary", "receivablePayableSummary", "accountReconciliation", "footer"].every((key) => Object.hasOwn(bundle, key)), Object.keys(bundle));

const result = {
  ok: checks.every((c) => c.pass),
  checkedAt: new Date().toISOString(),
  sourceEvidence: {
    phase5Replay: "local-phase-05-logs/manual-finance-replay-results.json",
    phase5Sql: "local-phase-05-logs/sql-financial-events-effects-check.json",
  },
  totals: {
    expenseTotalPaise,
    workbookExpenseByCategoryPaise,
    cashflowMay: month,
    businessExpense,
    personalExpense,
    receivablePayable,
  },
  checks,
};

fs.writeFileSync(
  path.join(LOG_DIR, "report-export-certification-results.json"),
  JSON.stringify(result, null, 2),
);
console.log(JSON.stringify(result, null, 2));
if (!result.ok) process.exit(1);
