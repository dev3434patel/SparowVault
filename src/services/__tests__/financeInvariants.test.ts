import { describe, it, expect } from "vitest";
import {
  buildFinanceEventBuilderContext,
  buildFullLedger,
} from "@/services/financeEventBuilder";
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
    type: over.type ?? "transfer",
    amountPaise: over.amountPaise ?? 0,
    amount: over.amount ?? 0,
    date: over.date ?? "2026-05-13",
    paymentMode: over.paymentMode ?? "bank_transfer",
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

describe("finance invariants", () => {
  it("self-transfer preserves net cash across accounts", () => {
    const txs = [
      tx({
        id: "t1",
        type: "transfer",
        accountId: "acc_a",
        toAccountId: "acc_b",
        amountPaise: 2_500_000,
        amount: 25_000,
      }),
    ];
    const ctx = buildFinanceEventBuilderContext([], []);
    const { effects } = buildFullLedger("u1", txs, ctx);
    let cashDelta = 0;
    for (const e of effects) {
      if (e.targetType === "account" && e.component === "cash") {
        cashDelta += e.effectDirection === "increase" ? e.amountPaise : -e.amountPaise;
      }
    }
    expect(cashDelta).toBe(0);
    expect(effects.some((e) => e.component === "expense" || e.component === "income")).toBe(false);
  });

  it("credit-card purchase never decreases bank cash", () => {
    const food = cat("cat_food", "expense");
    const txs = [
      tx({
        id: "cc1",
        type: "expense",
        paymentMode: "credit_card",
        linkedCardId: "card1",
        categoryId: "cat_food",
        amountPaise: 60_000_00,
        amount: 60_000,
      }),
    ];
    const { effects } = buildFullLedger("u1", txs, buildFinanceEventBuilderContext([food], []));
    expect(effects.some((e) => e.targetType === "account" && e.effectDirection === "decrease")).toBe(false);
  });

  it("cc_payment never creates expense effect", () => {
    const txs = [
      tx({
        id: "pay1",
        type: "cc_payment",
        accountId: "acc1",
        linkedCardId: "card1",
        amountPaise: 10_000_00,
        amount: 10_000,
      }),
    ];
    const { effects } = buildFullLedger("u1", txs, buildFinanceEventBuilderContext([], []));
    expect(effects.some((e) => e.component === "expense")).toBe(false);
  });

  it("loan disbursement never creates income effect", () => {
    const txs = [
      tx({
        id: "ld1",
        type: "loan_disbursement",
        accountId: "acc1",
        linkedLoanId: "loan1",
        amountPaise: 500_000_00,
        amount: 500_000,
      }),
    ];
    const { effects } = buildFullLedger("u1", txs, buildFinanceEventBuilderContext([], []));
    expect(effects.some((e) => e.component === "income")).toBe(false);
  });
});
