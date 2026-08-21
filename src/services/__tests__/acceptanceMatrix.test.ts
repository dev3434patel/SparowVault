/**
 * Acceptance matrix tests: T-134/135/139/140 and received-money classification.
 */
import { describe, it, expect } from "vitest";
import {
  buildFinanceEventBuilderContext,
  buildFullLedger,
} from "@/services/financeEventBuilder";
import { calculateExpenseView, calculateIncomeView } from "@/services/ledgerCalculations";
import { intentToTransactionType } from "@/services/transactionIntent";
import type { Category, IncomingIntent, Transaction } from "@/types";

const cat = (id: string, appliesTo: Category["appliesTo"]): Category =>
  ({
    id,
    userId: "u1",
    name: id,
    appliesTo,
    parentId: null,
    icon: "💸",
    color: "#888",
    budgetable: 1,
    taxRelevant: 0,
    gstRelevant: 0,
    sortOrder: 0,
    archived: 0,
    isDeleted: 0,
    createdAt: "2026-05-13T00:00:00.000Z",
    updatedAt: "2026-05-13T00:00:00.000Z",
    version: 1,
    tags: [],
    notes: "",
  }) as Category;

const tx = (over: Partial<Transaction>): Transaction =>
  ({
    id: over.id ?? "tx1",
    userId: "u1",
    type: over.type ?? "expense",
    amountPaise: over.amountPaise ?? 0,
    amount: over.amount ?? 0,
    date: over.date ?? "2026-05-13",
    paymentMode: over.paymentMode ?? "upi",
    merchantOrPerson: "Test",
    description: "",
    billAvailable: 0,
    gstApplicable: 0,
    taxFlag: 0,
    businessOrPersonal: "personal",
    needWant: "unassigned",
    fixedVariable: "unassigned",
    plannedUnplanned: "unassigned",
    isDeleted: 0,
    createdAt: "2026-05-13T00:00:00.000Z",
    updatedAt: "2026-05-13T00:00:00.000Z",
    version: 1,
    tags: over.tags ?? [],
    notes: "",
    ...over,
  }) as Transaction;

function netCash(effects: { targetType: string; component: string; effectDirection: string; amountPaise: number }[]) {
  let n = 0;
  for (const e of effects) {
    if (e.targetType !== "account" || e.component !== "cash") continue;
    n += e.effectDirection === "increase" ? e.amountPaise : -e.amountPaise;
  }
  return n;
}

describe("Acceptance T-134/135/139/140", () => {
  it("T-134 self-transfer preserves assets and creates no P&L", () => {
    const txs = [
      tx({
        id: "t134",
        type: "transfer",
        transactionIntent: "self_transfer",
        accountId: "hdfc",
        toAccountId: "icici",
        amountPaise: 25_000_00,
        amount: 25_000,
        paymentMode: "bank_transfer",
      }),
    ];
    const { events, effects } = buildFullLedger("u1", txs, buildFinanceEventBuilderContext([], []));
    expect(netCash(effects)).toBe(0);
    expect(calculateExpenseView(events, effects, 2026, 5)).toBe(0);
    expect(calculateIncomeView(events, effects, 2026, 5)).toBe(0);
  });

  it("T-135 cash withdrawal is transfer not expense", () => {
    const txs = [
      tx({
        id: "t135",
        type: "transfer",
        transactionIntent: "cash_withdrawal",
        accountId: "bank",
        toAccountId: "cash",
        amountPaise: 10_000_00,
        amount: 10_000,
        paymentMode: "cash",
      }),
    ];
    const { events, effects } = buildFullLedger("u1", txs, buildFinanceEventBuilderContext([], []));
    expect(netCash(effects)).toBe(0);
    expect(calculateExpenseView(events, effects, 2026, 5)).toBe(0);
  });

  it("T-139 bank→FD is asset transfer not expense", () => {
    const txs = [
      tx({
        id: "t139",
        type: "investment_contribution",
        accountId: "bank",
        linkedSavingsId: "fd1",
        amountPaise: 100_000_00,
        amount: 100_000,
        paymentMode: "bank_transfer",
      }),
    ];
    const { events, effects } = buildFullLedger("u1", txs, buildFinanceEventBuilderContext([], []));
    expect(calculateExpenseView(events, effects, 2026, 5)).toBe(0);
    expect(
      effects.some(
        (e) => e.targetType === "investment" && e.effectDirection === "increase" && e.amountPaise === 100_000_00,
      ),
    ).toBe(true);
    expect(netCash(effects)).toBe(-100_000_00);
  });

  it("T-140 household family transfer: consolidated income/expense zero", () => {
    // Modeled as self_transfer between household members' accounts — P&L zero.
    const txs = [
      tx({
        id: "t140",
        type: "transfer",
        transactionIntent: "self_transfer",
        accountId: "spouse_a",
        toAccountId: "spouse_b",
        amountPaise: 15_000_00,
        amount: 15_000,
        paymentMode: "upi",
        tags: ["household_transfer"],
      }),
    ];
    const { events, effects } = buildFullLedger("u1", txs, buildFinanceEventBuilderContext([], []));
    expect(calculateIncomeView(events, effects, 2026, 5)).toBe(0);
    expect(calculateExpenseView(events, effects, 2026, 5)).toBe(0);
  });
});

describe("T-156 received-money intent matrix", () => {
  const cases: Array<{ intent: IncomingIntent; expectIncome: boolean; expectExpense: boolean }> = [
    { intent: "salary_income", expectIncome: true, expectExpense: false },
    { intent: "interest_dividend_income", expectIncome: true, expectExpense: false },
    { intent: "transfer_from_own", expectIncome: false, expectExpense: false },
    { intent: "purchase_refund", expectIncome: false, expectExpense: false },
    { intent: "loan_received", expectIncome: false, expectExpense: false },
    { intent: "udhari_repayment", expectIncome: false, expectExpense: false },
    { intent: "investment_redemption", expectIncome: false, expectExpense: false },
    { intent: "reimbursement", expectIncome: false, expectExpense: false },
  ];

  it.each(cases)("$intent maps to distinct economics", ({ intent, expectIncome }) => {
    const type = intentToTransactionType(intent);
    const food = cat("cat_food", "expense");
    const salary = cat("cat_salary", "income");
    let row: Transaction;
    switch (intent) {
      case "salary_income":
      case "interest_dividend_income":
        row = tx({
          id: intent,
          type,
          transactionIntent: intent,
          accountId: "acc",
          categoryId: "cat_salary",
          amountPaise: 50_000_00,
          amount: 50_000,
        });
        break;
      case "transfer_from_own":
        row = tx({
          id: intent,
          type: "transfer",
          transactionIntent: intent,
          accountId: "a",
          toAccountId: "b",
          amountPaise: 50_000_00,
          amount: 50_000,
        });
        break;
      case "purchase_refund":
        row = tx({
          id: intent,
          type: "refund",
          transactionIntent: intent,
          accountId: "acc",
          categoryId: "cat_food",
          amountPaise: 50_000_00,
          amount: 50_000,
        });
        break;
      case "loan_received":
        row = tx({
          id: intent,
          type: "loan_disbursement",
          transactionIntent: intent,
          accountId: "acc",
          linkedLoanId: "loan1",
          amountPaise: 50_000_00,
          amount: 50_000,
        });
        break;
      case "udhari_repayment":
        row = tx({
          id: intent,
          type: "udhari_collect",
          transactionIntent: intent,
          accountId: "acc",
          linkedUdhariId: "ud1",
          amountPaise: 50_000_00,
          amount: 50_000,
          merchantOrPerson: "Friend",
        });
        break;
      case "investment_redemption":
        row = tx({
          id: intent,
          type: "investment_sell",
          transactionIntent: intent,
          accountId: "acc",
          linkedSavingsId: "inv1",
          amountPaise: 50_000_00,
          amount: 50_000,
        });
        break;
      case "reimbursement":
        row = tx({
          id: intent,
          type: "income",
          transactionIntent: intent,
          accountId: "acc",
          linkedOriginalTransactionId: "exp1",
          amountPaise: 50_000_00,
          amount: 50_000,
          tags: ["reimbursement_settlement"],
        });
        break;
      default:
        row = tx({ id: intent, type, amountPaise: 50_000_00, amount: 50_000, accountId: "acc" });
    }
    const { events, effects } = buildFullLedger(
      "u1",
      [row],
      buildFinanceEventBuilderContext([food, salary], []),
    );
    const income = calculateIncomeView(events, effects, 2026, 5);
    if (expectIncome) expect(income).toBeGreaterThan(0);
    else expect(income).toBe(0);
  });
});
