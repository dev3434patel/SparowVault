import { describe, it, expect } from "vitest";
import {
  buildFinanceEventBuilderContext,
  buildFullLedger,
} from "@/services/financeEventBuilder";
import {
  calculateFinanceMonthKpis,
  operatingSurplusRate,
} from "@/services/financeKpiEngine";
import type { Category, Transaction } from "@/types";

const cat = (id: string, appliesTo: Category["appliesTo"], name = id): Category =>
  ({
    id,
    userId: "u1",
    name,
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
    amount: over.amount ?? 0,
    amountPaise: over.amountPaise ?? 0,
    date: over.date ?? "2026-05-13",
    type: over.type ?? "expense",
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

describe("financeKpiEngine", () => {
  it("computes operating surplus from ledger income and consumption expense", () => {
    const salary = cat("cat_salary", "income", "Salary");
    const food = cat("cat_food", "expense", "Food");
    const txs = [
      tx({
        id: "inc1",
        type: "income",
        categoryId: "cat_salary",
        accountId: "acc1",
        amountPaise: 100_000_00,
        amount: 100_000,
      }),
      tx({
        id: "exp1",
        type: "expense",
        categoryId: "cat_food",
        accountId: "acc1",
        amountPaise: 30_000_00,
        amount: 30_000,
      }),
    ];
    const ctx = buildFinanceEventBuilderContext([salary, food], []);
    const { events, effects } = buildFullLedger("u1", txs, ctx);
    const kpis = calculateFinanceMonthKpis(events, effects, 2026, 5, txs);
    expect(kpis.trueIncomePaise).toBe(100_000_00);
    expect(kpis.consumptionExpensePaise).toBe(30_000_00);
    expect(kpis.operatingSurplusPaise).toBe(70_000_00);
    expect(kpis.source).toBe("ledger");
    expect(operatingSurplusRate(kpis.operatingSurplusPaise, kpis.trueIncomePaise)).toBe(70);
  });

  it("bank refund reduces consumption expense, not true income", () => {
    const food = cat("cat_food", "expense", "Food");
    const txs = [
      tx({
        id: "exp1",
        type: "expense",
        categoryId: "cat_food",
        accountId: "acc1",
        amountPaise: 50_000,
        amount: 500,
      }),
      tx({
        id: "ref1",
        type: "refund",
        paymentMode: "upi",
        categoryId: "cat_food",
        accountId: "acc1",
        amountPaise: 20_000,
        amount: 200,
      }),
    ];
    const ctx = buildFinanceEventBuilderContext([food], []);
    const { events, effects } = buildFullLedger("u1", txs, ctx);
    const kpis = calculateFinanceMonthKpis(events, effects, 2026, 5, txs);
    expect(kpis.trueIncomePaise).toBe(0);
    expect(kpis.consumptionExpensePaise).toBe(30_000);
  });
});
