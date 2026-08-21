import { describe, it, expect } from "vitest";
import {
  computeAccountBalanceBreakdown,
  computeAccountCashClosingPaise,
} from "@/services/accountBalanceEngine";
import { deriveAccountBalance } from "@/services/calculations";
import type { Transaction } from "@/types";

const tx = (over: Partial<Transaction>): Transaction => ({
  id: over.id ?? "t1",
  userId: over.userId ?? "u1",
  type: over.type ?? "expense",
  amount: over.amount ?? 100,
  date: over.date ?? "2026-05-12T12:00:00.000Z",
  categoryId: over.categoryId,
  accountId: over.accountId,
  toAccountId: over.toAccountId,
  linkedCardId: over.linkedCardId,
  paymentMode: over.paymentMode ?? "upi",
  merchantOrPerson: over.merchantOrPerson ?? "",
  description: over.description ?? "",
  notes: over.notes ?? "",
  tags: over.tags ?? [],
  billAvailable: over.billAvailable ?? 0,
  gstApplicable: over.gstApplicable ?? 0,
  taxFlag: over.taxFlag ?? 0,
  businessOrPersonal: over.businessOrPersonal ?? "personal",
  needWant: over.needWant ?? "unassigned",
  fixedVariable: over.fixedVariable ?? "unassigned",
  plannedUnplanned: over.plannedUnplanned ?? "unassigned",
  isDeleted: over.isDeleted ?? 0,
  createdAt: over.createdAt ?? "2026-05-12T00:00:00.000Z",
  updatedAt: over.updatedAt ?? "2026-05-12T00:00:00.000Z",
});

describe("accountBalanceEngine", () => {
  it("matches deriveAccountBalance for mixed flows", () => {
    const acc = "a1";
    const opening = 1_000_00;
    const txs: Transaction[] = [
      tx({ id: "1", type: "income", amount: 500, accountId: acc, paymentMode: "upi" }),
      tx({ id: "2", type: "expense", amount: 100, accountId: acc, paymentMode: "upi" }),
      tx({
        id: "3",
        type: "expense",
        amount: 450,
        accountId: acc,
        paymentMode: "credit_card",
        linkedCardId: "c1",
      }),
      tx({
        id: "4",
        type: "transfer",
        amount: 200,
        accountId: acc,
        toAccountId: "a2",
        paymentMode: "bank_transfer",
      }),
    ];
    const legacy = deriveAccountBalance(acc, opening, txs);
    const engine = computeAccountCashClosingPaise(acc, opening, txs);
    expect(engine).toBe(legacy);
    expect(engine).toBe(1_000_00 + 50_000 - 10_000 - 20_000);
  });

  it("does not reduce cash for credit-card expense on that account", () => {
    const acc = "a1";
    const opening = 0;
    const txs: Transaction[] = [
      tx({
        id: "cc1",
        type: "expense",
        amount: 999,
        accountId: acc,
        paymentMode: "credit_card",
        linkedCardId: "c1",
      }),
    ];
    const b = computeAccountBalanceBreakdown(acc, opening, txs);
    expect(b.closingPaise).toBe(0);
    expect(b.cashBankExpensePaise).toBe(0);
  });

  it("classifies transfer in/out separately", () => {
    const a1 = "a1";
    const a2 = "a2";
    const txs: Transaction[] = [
      tx({
        id: "tr",
        type: "transfer",
        amount: 50,
        accountId: a1,
        toAccountId: a2,
        paymentMode: "bank_transfer",
      }),
    ];
    const out = computeAccountBalanceBreakdown(a1, 0, txs);
    const inn = computeAccountBalanceBreakdown(a2, 0, txs);
    expect(out.transferOutPaise).toBe(50_00);
    expect(out.closingPaise).toBe(-50_00);
    expect(inn.transferInPaise).toBe(50_00);
    expect(inn.closingPaise).toBe(50_00);
  });
});
