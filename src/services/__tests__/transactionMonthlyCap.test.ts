import { describe, it, expect } from "vitest";
import { format } from "date-fns";
import type { Transaction } from "@/types";
import {
  assertTransactionCreateAllowed,
  countTransactionsInCurrentCalendarMonth,
  monthlyTransactionLimit,
  transactionCreateBlockedByMonthlyCap,
} from "@/services/transactionMonthlyCap";
import { snapshotFromEffectiveFeatures } from "@/services/modulePolicy";

function tx(partial: Partial<Transaction> & Pick<Transaction, "id">): Transaction {
  const month = format(new Date(), "yyyy-MM-dd");
  return {
    userId: "u1",
    date: month,
    type: "expense",
    amount: 1,
    amountPaise: 100,
    categoryId: "c1",
    accountId: "a1",
    paymentMode: "upi",
    merchantOrPerson: "",
    description: "",
    notes: "",
    tags: [],
    billAvailable: 0,
    gstApplicable: 0,
    taxFlag: 0,
    businessOrPersonal: "personal",
    needWant: "unassigned",
    fixedVariable: "unassigned",
    plannedUnplanned: "unassigned",
    createdAt: month,
    updatedAt: month,
    isDeleted: 0,
    version: 1,
    ...partial,
  };
}

describe("transaction monthly cap", () => {
  it("parses numeric max_transactions_per_month from effectiveFeatures", () => {
    const snapshot = snapshotFromEffectiveFeatures({ max_transactions_per_month: 100 });
    expect(snapshot.features.max_transactions_per_month).toEqual({
      isEnabled: true,
      limitValue: 100,
    });
    expect(monthlyTransactionLimit(snapshot)).toBe(100);
  });

  it("missing limit allows create", () => {
    const snapshot = snapshotFromEffectiveFeatures({ exports: true });
    expect(monthlyTransactionLimit(snapshot)).toBeNull();
    expect(
      transactionCreateBlockedByMonthlyCap(snapshot, [tx({ id: "t1" })], "u1"),
    ).toBeNull();
    expect(() =>
      assertTransactionCreateAllowed({ exports: true }, [tx({ id: "t1" })], "u1"),
    ).not.toThrow();
  });

  it("under limit allows one more create", () => {
    const features = { max_transactions_per_month: 2 };
    const snapshot = snapshotFromEffectiveFeatures(features);
    const rows = [tx({ id: "t1" })];
    expect(countTransactionsInCurrentCalendarMonth(rows, "u1")).toBe(1);
    expect(transactionCreateBlockedByMonthlyCap(snapshot, rows, "u1")).toBeNull();
    expect(() => assertTransactionCreateAllowed(features, rows, "u1")).not.toThrow();
  });

  it("at limit blocks create", () => {
    const features = { max_transactions_per_month: 2 };
    const snapshot = snapshotFromEffectiveFeatures(features);
    const rows = [tx({ id: "t1" }), tx({ id: "t2" })];
    expect(transactionCreateBlockedByMonthlyCap(snapshot, rows, "u1")).toMatch(/limit/i);
    expect(() => assertTransactionCreateAllowed(features, rows, "u1")).toThrow(/limit/i);
  });

  it("explicit zero blocks create", () => {
    const features = { max_transactions_per_month: 0 };
    const snapshot = snapshotFromEffectiveFeatures(features);
    expect(transactionCreateBlockedByMonthlyCap(snapshot, [], "u1")).toMatch(/limit/i);
  });

  it("ignores deleted rows in the count", () => {
    const features = { max_transactions_per_month: 1 };
    const snapshot = snapshotFromEffectiveFeatures(features);
    const rows = [tx({ id: "t1", isDeleted: 1 })];
    expect(transactionCreateBlockedByMonthlyCap(snapshot, rows, "u1")).toBeNull();
  });

  it("edit path is not gated by assert (repo update only); cap helper is create-only", () => {
    const features = { max_transactions_per_month: 1 };
    const rows = [tx({ id: "t1" })];
    expect(transactionCreateBlockedByMonthlyCap(snapshotFromEffectiveFeatures(features), rows, "u1")).toMatch(
      /limit/i,
    );
    expect(monthlyTransactionLimit(snapshotFromEffectiveFeatures(features))).toBe(1);
  });
});
