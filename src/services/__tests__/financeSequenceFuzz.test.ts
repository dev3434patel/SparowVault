/**
 * Random command-sequence invariants without fast-check dependency.
 */
import { describe, it, expect } from "vitest";
import {
  buildFinanceEventBuilderContext,
  buildFullLedger,
} from "@/services/financeEventBuilder";
import { calculateExpenseView, calculateIncomeView } from "@/services/ledgerCalculations";
import type { Transaction } from "@/types";

function mulberry32(seed: number) {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const mk = (over: Partial<Transaction>): Transaction =>
  ({
    id: over.id ?? "tx",
    userId: "u1",
    type: over.type ?? "expense",
    amountPaise: over.amountPaise ?? 100_00,
    amount: (over.amountPaise ?? 100_00) / 100,
    date: over.date ?? "2026-03-15",
    paymentMode: over.paymentMode ?? "upi",
    accountId: over.accountId ?? "acc1",
    toAccountId: over.toAccountId,
    linkedCardId: over.linkedCardId,
    categoryId: over.categoryId ?? "cat1",
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
    createdAt: "2026-03-15T00:00:00.000Z",
    updatedAt: "2026-03-15T00:00:00.000Z",
    version: 1,
    tags: [],
    notes: "",
    transactionIntent: over.transactionIntent,
    ...over,
  }) as Transaction;

describe("financeSequenceFuzz", () => {
  it("seeded sequences length 50 keep finite paise and transfer Δincome/expense = 0", () => {
    const seeds = [1, 42, 99, 2026];
    for (const seed of seeds) {
      const rnd = mulberry32(seed);
      const txs: Transaction[] = [];
      for (let i = 0; i < 50; i++) {
        const roll = rnd();
        const amt = Math.max(1, Math.floor(rnd() * 50_000_00));
        if (roll < 0.2) {
          txs.push(mk({ id: `i${i}`, type: "income", amountPaise: amt, paymentMode: "bank_transfer" }));
        } else if (roll < 0.45) {
          txs.push(mk({ id: `e${i}`, type: "expense", amountPaise: amt }));
        } else if (roll < 0.6) {
          txs.push(
            mk({
              id: `t${i}`,
              type: "transfer",
              amountPaise: amt,
              accountId: "acc1",
              toAccountId: "acc2",
              paymentMode: "bank_transfer",
              transactionIntent: "self_transfer",
            }),
          );
        } else if (roll < 0.8) {
          txs.push(
            mk({
              id: `c${i}`,
              type: "expense",
              paymentMode: "credit_card",
              linkedCardId: "card1",
              amountPaise: amt,
            }),
          );
        } else {
          txs.push(
            mk({
              id: `p${i}`,
              type: "cc_payment",
              paymentMode: "bank_transfer",
              linkedCardId: "card1",
              accountId: "acc1",
              amountPaise: Math.min(amt, 10_000_00),
            }),
          );
        }
      }
      const ctx = buildFinanceEventBuilderContext([], []);
      const { events, effects } = buildFullLedger("u1", txs, ctx);
      const income = calculateIncomeView(events, effects, 2026, 3);
      const expense = calculateExpenseView(events, effects, 2026, 3);
      expect(Number.isFinite(income)).toBe(true);
      expect(Number.isFinite(expense)).toBe(true);
      expect(effects.every((e) => Number.isInteger(e.amountPaise))).toBe(true);

      const transfersOnly = txs.filter((t) => t.type === "transfer");
      if (transfersOnly.length) {
        const tLedger = buildFullLedger("u1", transfersOnly, ctx);
        expect(calculateIncomeView(tLedger.events, tLedger.effects, 2026, 3)).toBe(0);
        expect(calculateExpenseView(tLedger.events, tLedger.effects, 2026, 3)).toBe(0);
      }
    }
  });
});
