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

describe("vNext transfer & received-money (Phase C)", () => {
  it("T-134 self-transfer: zero net cash and no P&L", () => {
    const txs = [
      tx({
        id: "t134",
        type: "transfer",
        transactionIntent: "self_transfer",
        accountId: "acc_a",
        toAccountId: "acc_b",
        amountPaise: 500_000,
        amount: 5000,
      }),
    ];
    const { effects } = buildFullLedger("u1", txs, buildFinanceEventBuilderContext([], []));
    const pnl = effects.filter(
      (e) => e.targetType === "income_category" || e.targetType === "expense_category",
    );
    expect(pnl).toHaveLength(0);
  });

  it("T-138 reimbursement settlement reduces receivable, not income", () => {
    const food = cat("cat_food", "expense");
    const txs = [
      tx({
        id: "exp_reimb",
        type: "expense",
        categoryId: "cat_food",
        accountId: "acc1",
        isReimbursable: 1,
        amountPaise: 10_000,
        amount: 100,
      }),
      tx({
        id: "settle",
        type: "income",
        transactionIntent: "reimbursement",
        linkedOriginalTransactionId: "exp_reimb",
        accountId: "acc1",
        amountPaise: 10_000,
        amount: 100,
        tags: ["reimbursement_settlement"],
      }),
    ];
    const { effects } = buildFullLedger("u1", txs, buildFinanceEventBuilderContext([food], []));
    expect(
      effects.some(
        (e) =>
          e.targetType === "income_category" &&
          e.component === "income" &&
          e.effectDirection === "increase",
      ),
    ).toBe(false);
    expect(
      effects.some(
        (e) =>
          e.targetType === "reimbursement" &&
          e.targetId === "exp_reimb" &&
          e.component === "receivable" &&
          e.effectDirection === "decrease",
      ),
    ).toBe(true);
  });

  it("investment sell with cost basis splits gain to income", () => {
    const invCat = cat("cat_gain", "income");
    const txs = [
      tx({
        id: "sell1",
        type: "investment_sell",
        linkedSavingsId: "inv1",
        accountId: "acc1",
        categoryId: "cat_gain",
        costBasisPaise: 80_000,
        amountPaise: 100_000,
        amount: 1000,
      }),
    ];
    const { effects } = buildFullLedger("u1", txs, buildFinanceEventBuilderContext([invCat], []));
    expect(
      effects.some(
        (e) =>
          e.targetType === "investment" &&
          e.effectDirection === "decrease" &&
          e.amountPaise === 80_000,
      ),
    ).toBe(true);
    expect(
      effects.some(
        (e) =>
          e.targetType === "income_category" &&
          e.effectDirection === "increase" &&
          e.amountPaise === 20_000,
      ),
    ).toBe(true);
  });
});
