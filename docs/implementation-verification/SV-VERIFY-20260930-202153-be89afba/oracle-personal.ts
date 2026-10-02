import "fake-indexeddb/auto";
import { SparowVaultDB } from "@/db/database";
import { computeAccountCashClosingPaise } from "@/services/accountBalanceEngine";
import { calculateCardOutstandingFromTransactions } from "@/services/cardEngine";
import { buildFinanceEventBuilderContext, buildLedgerForTransaction } from "@/services/financeEventBuilder";
import { alertPreferenceEnabled, type AlertPreferenceKey } from "@/services/alertPreferences";
import {
  createCashReservation,
  reservationViewFromFunds,
  saveCardEmiPlan,
  saveCardPaymentAllocation,
  saveCardStatement,
  sharedFamilyKpis,
} from "@/services/personalBookWorkflows";
import type { Card, CardEmiInstallment, CardEmiPlan, CardPaymentAllocation, CardStatement, SinkingFund, Transaction } from "@/types";

const db = new SparowVaultDB("sparowvault_verify_idb");
const results: Array<Record<string, unknown>> = [];

function record(id: string, status: string, detail: Record<string, unknown>) {
  results.push({ id, status, ...detail });
  console.log(id, status);
}

function writer<T extends { id: string; userId: string; isDeleted?: number; notes?: string; tags?: string[]; version?: number }>(
  table: {
    where: (k: string) => { equals: (v: string) => { toArray: () => Promise<T[]> } };
    add: (row: T) => Promise<unknown>;
    get: (id: string) => Promise<T | undefined>;
    put: (row: T) => Promise<unknown>;
  },
) {
  return {
    async list(userId: string) {
      const rows = await table.where("userId").equals(userId).toArray();
      return rows.filter((row) => row.isDeleted !== 1);
    },
    async create(input: { userId: string; data: Partial<T> }) {
      const now = new Date().toISOString();
      const row = {
        ...input.data,
        id: crypto.randomUUID(),
        userId: input.userId,
        createdAt: now,
        updatedAt: now,
        isDeleted: 0,
        version: 1,
        tags: (input.data as { tags?: string[] }).tags ?? [],
        notes: (input.data as { notes?: string }).notes ?? "",
      } as T;
      await table.add(row);
      return row;
    },
    async update(id: string, patch: Partial<T>) {
      const current = await table.get(id);
      if (!current) return undefined;
      const next = { ...current, ...patch, updatedAt: new Date().toISOString(), version: (current.version ?? 1) + 1 };
      await table.put(next);
      return next;
    },
  };
}

function tx(over: Partial<Transaction>): Transaction {
  return {
    id: over.id ?? crypto.randomUUID(),
    userId: "alice",
    date: "2026-09-30",
    type: "expense",
    amount: 0,
    amountPaise: 0,
    accountId: "bank",
    paymentMode: "bank_transfer",
    merchantOrPerson: "",
    description: "",
    billAvailable: 0,
    gstApplicable: 0,
    taxFlag: 0,
    businessOrPersonal: "personal",
    needWant: "unassigned",
    fixedVariable: "unassigned",
    plannedUnplanned: "unassigned",
    createdAt: "2026-09-30",
    updatedAt: "2026-09-30",
    isDeleted: 0,
    version: 1,
    tags: [],
    notes: "",
    ...over,
  } as Transaction;
}

const funds = writer<SinkingFund>(db.sinkingFunds as never);
const statements = writer<CardStatement>(db.cardStatements as never);
const allocations = writer<CardPaymentAllocation>(db.cardPaymentAllocations as never);
const plans = writer<CardEmiPlan>(db.cardEmiPlans as never);
const installments = writer<CardEmiInstallment>(db.cardEmiInstallments as never);

const envelope = await createCashReservation("alice", {
  name: "Rent envelope",
  kind: "envelope",
  targetPaise: 200_000,
  reservedPaise: 200_000,
  targetDate: "2026-10-01",
}, funds);
const sinking = await createCashReservation("alice", {
  name: "Insurance sinking",
  kind: "sinking",
  targetPaise: 50_000,
  reservedPaise: 50_000,
  targetDate: "2026-12-01",
}, funds);
const snap = reservationViewFromFunds({
  bankCashPaise: 1_000_000,
  goalEarmarkPaise: 50_000,
  funds: [envelope, sinking],
});
const stored = await funds.list("alice");
record("O01", snap.bankCashPaise === 1_000_000 && snap.reservedPaise === 300_000 && snap.availableToSpendPaise === 700_000 && stored.length === 2 ? "PASS" : "FAIL", {
  bankCashPaise: snap.bankCashPaise,
  reservedPaise: snap.reservedPaise,
  availableToSpendPaise: snap.availableToSpendPaise,
  persistedFunds: stored.length,
  expectedReservedPaise: 300_000,
  differencePaise: snap.reservedPaise - 300_000,
});

const opening = 1_000_000;
const transfer = tx({ type: "transfer", amountPaise: 50_000, amount: 500, accountId: "bank", toAccountId: "cash" });
const bankAfter = computeAccountCashClosingPaise("bank", opening, [transfer]);
const cashAfter = computeAccountCashClosingPaise("cash", 0, [transfer]);
record("O02", bankAfter === 950_000 && cashAfter === 50_000 ? "PASS" : "FAIL", {
  bankPaise: bankAfter,
  cashPaise: cashAfter,
  expectedBankPaise: 950_000,
  expectedCashPaise: 50_000,
  differencePaise: bankAfter - 950_000,
});

const purchase = tx({
  id: "purchase-1",
  type: "expense",
  amountPaise: 300_000,
  amount: 3000,
  paymentMode: "credit_card",
  linkedCardId: "card-1",
  accountId: "bank",
});
const repayment = tx({
  id: "pay-1",
  type: "cc_payment",
  amountPaise: 100_000,
  amount: 1000,
  paymentMode: "cash",
  linkedCardId: "card-1",
  accountId: "cash",
});
const cashAfterCard = computeAccountCashClosingPaise("cash", 50_000, [purchase, repayment]);
const card = { id: "card-1", userId: "alice" } as Card;
const outstanding = calculateCardOutstandingFromTransactions(card, [purchase, repayment]);
const statement = await saveCardStatement("alice", {
  cardId: "card-1",
  cycleStartDate: "2026-08-02",
  cycleEndDate: "2026-09-01",
  statementDate: "2026-09-01",
  openingBalancePaise: 0,
  closingBalancePaise: 250_000,
  minimumDuePaise: 25_000,
  retailSpendPaise: 250_000,
  feesPaise: 0,
  interestPaise: 0,
  paymentsPaise: 0,
  creditsPaise: 0,
  status: "closed",
}, statements);
const allocation = await saveCardPaymentAllocation("alice", {
  cardId: "card-1",
  transactionId: repayment.id,
  statementId: statement.id,
  amountPaise: 100_000,
  allocatedAt: "2026-09-30",
}, allocations);
const reloaded = await statements.list("alice");
record("O03", cashAfterCard === 50_000 - 100_000 && outstanding === 200_000 && reloaded[0]?.closingBalancePaise === 250_000 && allocation.amountPaise === 100_000 ? "PASS" : "FAIL", {
  cashPaise: cashAfterCard,
  expectedCashPaise: -50_000,
  outstandingPaise: outstanding,
  expectedOutstandingPaise: 200_000,
  statementClosingPaise: reloaded[0]?.closingBalancePaise,
  allocationPaise: allocation.amountPaise,
  differencePaise: outstanding - 200_000,
});

const txCountBefore = 2;
const emi = await saveCardEmiPlan("alice", {
  cardId: "card-1",
  purchaseTransactionIds: [purchase.id],
  principalPaise: 300_000,
  annualRateBps: 0,
  tenureMonths: 3,
  startDate: "2026-10-01",
  noCostEmi: true,
}, plans, installments);
const savedPlans = await plans.list("alice");
const savedInst = await installments.list("alice");
record("O04", savedPlans.length === 1 && savedInst.length === 3 && emi.plan.principalPaise === 300_000 ? "PASS" : "FAIL", {
  plans: savedPlans.length,
  installments: savedInst.length,
  principalPaise: emi.plan.principalPaise,
  transactionsBeforeConversion: txCountBefore,
  note: "Conversion persists a plan. It does not insert another purchase transaction in this call.",
});

const ctx = buildFinanceEventBuilderContext([], []);
const loanTx = tx({
  type: "loan_disbursement",
  amountPaise: 5_000_000,
  amount: 50000,
  accountId: "bank",
  linkedLoanId: "loan-1",
});
const loan = buildLedgerForTransaction(loanTx, ctx);
const loanCash = loan.effects.filter((e) => e.component === "cash").reduce((s, e) => s + (e.effectDirection === "increase" ? e.amountPaise : -e.amountPaise), 0);
const loanPrincipal = loan.effects.filter((e) => e.component === "principal").reduce((s, e) => s + e.amountPaise, 0);
const loanIncome = loan.effects.filter((e) => e.component === "income").reduce((s, e) => s + e.amountPaise, 0);
const cashLoan = computeAccountCashClosingPaise("bank", 0, [loanTx]);
record("O05", loanCash === 5_000_000 && loanPrincipal === 5_000_000 && loanIncome === 0 && cashLoan === 5_000_000 ? "PASS" : "FAIL", {
  cashEffectPaise: loanCash,
  principalEffectPaise: loanPrincipal,
  incomeEffectPaise: loanIncome,
  accountClosingPaise: cashLoan,
  expectedPaise: 5_000_000,
});

const given = tx({ type: "udhari_given", amountPaise: 100_000, amount: 1000, accountId: "bank", linkedUdhariId: "udh-1" });
const collected = tx({ type: "udhari_collect", amountPaise: 40_000, amount: 400, accountId: "bank", linkedUdhariId: "udh-1" });
const givenBuild = buildLedgerForTransaction(given, ctx);
const collectBuild = buildLedgerForTransaction(collected, ctx);
const givenIncome = givenBuild.effects.some((e) => e.component === "income");
const collectIncome = collectBuild.effects.some((e) => e.component === "income");
const recv = givenBuild.effects.find((e) => e.component === "receivable");
const recvDown = collectBuild.effects.find((e) => e.component === "receivable");
const cashU = computeAccountCashClosingPaise("bank", 1_000_000, [given, collected]);
record("O06", !givenIncome && !collectIncome && recv?.amountPaise === 100_000 && recvDown?.effectDirection === "decrease" && cashU === 940_000 ? "PASS" : "FAIL", {
  cashPaise: cashU,
  expectedCashPaise: 940_000,
  receivableIncreasePaise: recv?.amountPaise ?? 0,
  collectionDirection: recvDown?.effectDirection ?? null,
  givenCountedAsIncome: givenIncome,
  collectionCountedAsIncome: collectIncome,
  differencePaise: cashU - 940_000,
});

const householdRows = [
  tx({ type: "expense", amountPaise: 10_000, notes: "" }),
  tx({ type: "expense", amountPaise: 20_000, notes: "shared=1" }),
  tx({ type: "income", amountPaise: 50_000, notes: "shared=1" }),
];
const kpis = sharedFamilyKpis(householdRows);
record("HOUSEHOLD", kpis.expensePaise === 20_000 && kpis.incomePaise === 50_000 && kpis.sharedCount === 2 ? "PASS" : "FAIL", {
  incomePaise: kpis.incomePaise,
  expensePaise: kpis.expensePaise,
  sharedCount: kpis.sharedCount,
  note: "Unmarked expense of 10000 paise is excluded.",
});

const keys: AlertPreferenceKey[] = ["budgetAlerts", "dueAlerts", "udhariAlerts", "savingsAlerts", "unusualSpendAlerts", "duplicateAlerts"];
const kinds = ["budget_over", "emi_due_soon", "udhari_overdue", "low_savings", "unusual_spend", "duplicate_candidate"];
let alertFailures = 0;
let combos = 0;
for (let mask = 0; mask < 64; mask += 1) {
  combos += 1;
  const prefs = Object.fromEntries(keys.map((key, index) => [key, (mask & (1 << index)) !== 0])) as Record<AlertPreferenceKey, boolean>;
  kinds.forEach((kind, index) => {
    const expected = prefs[keys[index]] !== false;
    if (alertPreferenceEnabled(prefs, kind) !== expected) alertFailures += 1;
  });
}
record("ALERTS64", alertFailures === 0 && combos === 64 ? "PASS" : "FAIL", { combos, failures: alertFailures });

await db.delete();
const fs = await import("node:fs");
fs.writeFileSync(new URL("./oracle-personal.json", import.meta.url), JSON.stringify({ database: "sparowvault_verify_idb", results }, null, 2));
console.log("wrote oracle-personal.json");
