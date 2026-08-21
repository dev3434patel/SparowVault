/**
 * Event reversal golden — create then reverse → net economic effect ≈ 0.
 */
import { describe, it, expect } from "vitest";
import {
  buildFinanceEventBuilderContext,
  buildFullLedger,
  buildLedgerForTransaction,
} from "@/services/financeEventBuilder";
import { calculateExpenseView, calculateIncomeView } from "@/services/ledgerCalculations";
import type { Transaction } from "@/types";

const ctx = () => buildFinanceEventBuilderContext([], []);

const tx = (over: Partial<Transaction>): Transaction =>
  ({
    id: over.id ?? "tx1",
    userId: "u1",
    type: over.type ?? "expense",
    amountPaise: over.amountPaise ?? 1000_00,
    amount: (over.amountPaise ?? 1000_00) / 100,
    date: over.date ?? "2026-06-01",
    paymentMode: over.paymentMode ?? "upi",
    accountId: over.accountId ?? "acc1",
    toAccountId: over.toAccountId,
    linkedCardId: over.linkedCardId,
    categoryId: over.categoryId,
    merchantOrPerson: "",
    description: "",
    billAvailable: 0,
    gstApplicable: 0,
    taxFlag: 0,
    businessOrPersonal: "personal",
    needWant: "unassigned",
    fixedVariable: "unassigned",
    plannedUnplanned: "unassigned",
    isDeleted: over.isDeleted ?? 0,
    createdAt: "2026-06-01T00:00:00.000Z",
    updatedAt: "2026-06-01T00:00:00.000Z",
    version: 1,
    tags: [],
    notes: "",
    transactionIntent: over.transactionIntent,
    ...over,
  }) as Transaction;

describe("eventReversal.golden", () => {
  it("expense soft-delete removes expense effect", () => {
    const live = tx({ id: "e1", type: "expense", amountPaise: 500_00, paymentMode: "cash", categoryId: "cat_x" });
    const dead = { ...live, isDeleted: 1 as const };
    const c = ctx();
    const before = buildFullLedger("u1", [live], c);
    const after = buildFullLedger("u1", [dead], c);
    expect(before.effects.length).toBeGreaterThan(0);
    expect(after.effects.length).toBe(0);
    expect(after.events.length).toBe(0);
  });

  it("transfer create then soft-delete → income/expense stay 0 both sides", () => {
    const transfer = tx({
      id: "t1",
      type: "transfer",
      amountPaise: 25_000_00,
      accountId: "hdfc",
      toAccountId: "icici",
      paymentMode: "bank_transfer",
      transactionIntent: "self_transfer",
    });
    const c = ctx();
    const live = buildFullLedger("u1", [transfer], c);
    const dead = buildFullLedger("u1", [{ ...transfer, isDeleted: 1 }], c);
    expect(calculateIncomeView(live.events, live.effects, 2026, 6)).toBe(0);
    expect(calculateExpenseView(live.events, live.effects, 2026, 6)).toBe(0);
    expect(dead.effects.length).toBe(0);
  });

  it("card purchase soft-delete clears effects", () => {
    const purchase = tx({
      id: "cp1",
      type: "expense",
      paymentMode: "credit_card",
      linkedCardId: "card1",
      amountPaise: 60_000_00,
      categoryId: "cat_x",
    });
    const c = ctx();
    const live = buildFullLedger("u1", [purchase], c);
    const deleted = buildFullLedger("u1", [{ ...purchase, isDeleted: 1 }], c);
    expect(live.effects.some((e) => e.targetType === "credit_card")).toBe(true);
    expect(deleted.effects.length).toBe(0);
  });

  it("refund of expense nets toward zero consumption", () => {
    const purchase = tx({
      id: "p1",
      type: "expense",
      paymentMode: "upi",
      amountPaise: 1000_00,
      accountId: "acc1",
      categoryId: "cat_x",
    });
    const refund = tx({
      id: "r1",
      type: "refund",
      paymentMode: "upi",
      amountPaise: 1000_00,
      accountId: "acc1",
      linkedTransactionId: "p1",
      categoryId: "cat_x",
    });
    const c = ctx();
    const { events, effects } = buildFullLedger("u1", [purchase, refund], c);
    expect(calculateIncomeView(events, effects, 2026, 6)).toBe(0);
    expect(calculateExpenseView(events, effects, 2026, 6)).toBe(0);
  });

  it("buildLedgerForTransaction returns empty for deleted", () => {
    const deleted = tx({ isDeleted: 1 });
    const built = buildLedgerForTransaction(deleted, ctx());
    expect(built.effects.length).toBe(0);
  });
});
