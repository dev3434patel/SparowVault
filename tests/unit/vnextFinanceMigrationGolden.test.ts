/**
 * Migration golden — financial checksum preserved across ledger rebuild (P0-A).
 */
import { describe, it, expect } from "vitest";
import {
  buildFinanceEventBuilderContext,
  buildFullLedger,
} from "@/services/financeEventBuilder";
import {
  buildFinancialChecksum,
  checksumsEqual,
} from "@/services/financialChecksum";
import type { Transaction } from "@/types";

const tx = (over: Partial<Transaction>): Transaction =>
  ({
    id: over.id ?? "tx",
    userId: "fixture_light",
    type: over.type ?? "expense",
    amountPaise: over.amountPaise ?? 100_00,
    amount: (over.amountPaise ?? 100_00) / 100,
    date: over.date ?? "2026-01-15",
    paymentMode: over.paymentMode ?? "upi",
    accountId: over.accountId ?? "acc_bank",
    toAccountId: over.toAccountId,
    linkedCardId: over.linkedCardId,
    merchantOrPerson: "",
    description: "",
    billAvailable: 0,
    gstApplicable: 0,
    taxFlag: 0,
    businessOrPersonal: "personal",
    needWant: "unassigned",
    fixedVariable: "unassigned",
    plannedUnplanned: "unassigned",
    isDeleted: 0,
    createdAt: "2026-01-15T00:00:00.000Z",
    updatedAt: "2026-01-15T00:00:00.000Z",
    version: 1,
    tags: [],
    notes: "",
    transactionIntent: over.transactionIntent,
    ...over,
  }) as Transaction;

function checksumFor(txs: Transaction[]) {
  const ctx = buildFinanceEventBuilderContext([], []);
  const { events, effects } = buildFullLedger("fixture_light", txs, ctx);
  return buildFinancialChecksum({ transactions: txs, events, effects, year: 2026, month: 1 });
}

describe("vnextFinanceMigrationGolden", () => {
  it("light user: rebuild ledger twice → identical checksum", () => {
    const txs = [
      tx({
        id: "i1",
        type: "income",
        amountPaise: 50_000_00,
        paymentMode: "bank_transfer",
        categoryId: "cat_salary",
      }),
      tx({ id: "e1", type: "expense", amountPaise: 1_200_00, categoryId: "cat_food" }),
      tx({
        id: "t1",
        type: "transfer",
        amountPaise: 5_000_00,
        accountId: "acc_bank",
        toAccountId: "acc_cash",
        paymentMode: "cash",
        transactionIntent: "self_transfer",
      }),
    ];
    const before = checksumFor(txs);
    const after = checksumFor([...txs]);
    expect(checksumsEqual(before, after)).toBe(true);
    expect(before.transactionCount).toBe(3);
    expect(before.eventCount).toBeGreaterThan(0);
    expect(before.effectCount).toBeGreaterThan(0);
    // Income effect present (category-linked)
    expect(before.incomePaise).toBe(50_000_00);
  });

  it("four-card user: card purchase checksum stable across rebuild", () => {
    const txs = [
      tx({
        id: "cp1",
        type: "expense",
        paymentMode: "credit_card",
        linkedCardId: "card_b",
        amountPaise: 60_000_00,
      }),
      tx({
        id: "pay1",
        type: "cc_payment",
        paymentMode: "bank_transfer",
        linkedCardId: "card_b",
        accountId: "acc_bank",
        amountPaise: 10_000_00,
      }),
    ];
    const a = checksumFor(txs);
    const b = checksumFor(txs.map((t) => ({ ...t })));
    expect(checksumsEqual(a, b)).toBe(true);
    expect(a.cardLiabilityPaise).toBeGreaterThan(0);
  });
});
