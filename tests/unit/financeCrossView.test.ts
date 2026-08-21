/**
 * Cross-view reconciliation: consumption expense, cash movement, and card liability
 * must not double-count the same economic event.
 */
import { describe, it, expect } from "vitest";
import {
  buildFinanceEventBuilderContext,
  buildFullLedger,
} from "@/services/financeEventBuilder";
import {
  calculateCashflowView,
  calculateExpenseView,
  calculateIncomeView,
} from "@/services/ledgerCalculations";
import { calculateFinanceMonthKpis } from "@/services/financeKpiEngine";
import type { Category, Transaction } from "@/types";

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
    tags: [],
    notes: "",
    ...over,
  }) as Transaction;

describe("financeCrossView", () => {
  it("CC purchase + bill payment: expense once; payment is cash only", () => {
    const food = cat("cat_food", "expense");
    const salary = cat("cat_salary", "income");
    const txs = [
      tx({
        id: "salary",
        type: "income",
        categoryId: "cat_salary",
        accountId: "acc_bank",
        amountPaise: 100_000_00,
        amount: 100_000,
        paymentMode: "bank_transfer",
      }),
      tx({
        id: "cc_buy",
        type: "expense",
        paymentMode: "credit_card",
        linkedCardId: "card1",
        categoryId: "cat_food",
        amountPaise: 5_000_00,
        amount: 5_000,
      }),
      tx({
        id: "cc_pay",
        type: "cc_payment",
        accountId: "acc_bank",
        linkedCardId: "card1",
        amountPaise: 5_000_00,
        amount: 5_000,
        paymentMode: "bank_transfer",
      }),
    ];
    const { events, effects } = buildFullLedger(
      "u1",
      txs,
      buildFinanceEventBuilderContext([food, salary], []),
    );
    const expense = calculateExpenseView(events, effects, 2026, 5);
    const income = calculateIncomeView(events, effects, 2026, 5);
    const cash = calculateCashflowView(events, effects, 2026, 5);
    const kpis = calculateFinanceMonthKpis(events, effects, 2026, 5, txs);

    expect(expense).toBe(5_000_00);
    expect(income).toBe(100_000_00);
    expect(kpis.consumptionExpensePaise).toBe(expense);
    expect(kpis.trueIncomePaise).toBe(income);
    // Salary in + card payment out; purchase does not move bank
    expect(cash.inflowPaise).toBe(100_000_00);
    expect(cash.outflowPaise).toBe(5_000_00);
    expect(
      effects.filter((e) => e.targetType === "expense_category" && e.component === "expense"),
    ).toHaveLength(1);
  });

  it("self-transfer: zero P&L and zero net cash", () => {
    const txs = [
      tx({
        id: "tr1",
        type: "transfer",
        accountId: "a",
        toAccountId: "b",
        amountPaise: 25_000_00,
        amount: 25_000,
        paymentMode: "bank_transfer",
      }),
    ];
    const { events, effects } = buildFullLedger("u1", txs, buildFinanceEventBuilderContext([], []));
    expect(calculateExpenseView(events, effects, 2026, 5)).toBe(0);
    expect(calculateIncomeView(events, effects, 2026, 5)).toBe(0);
    const cash = calculateCashflowView(events, effects, 2026, 5);
    expect(cash.inflowPaise - cash.outflowPaise).toBe(0);
  });
});
