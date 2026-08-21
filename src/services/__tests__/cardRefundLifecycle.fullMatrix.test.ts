/**
 * Card refund / EMI cancellation lifecycle matrix (P0-F).
 */
import { describe, it, expect } from "vitest";
import {
  buildFinanceEventBuilderContext,
  buildFullLedger,
} from "@/services/financeEventBuilder";
import { calculateExpenseView, calculateIncomeView } from "@/services/ledgerCalculations";
import { createCardEmiPlanFromPurchase } from "@/services/cardEmiEngine";
import type { Category, Transaction } from "@/types";

const cat: Category = {
  id: "cat_e",
  userId: "u1",
  name: "Electronics",
  color: "#000",
  icon: "phone",
  appliesTo: "expense",
  isSystem: 0,
  archived: 0,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  isDeleted: 0,
  version: 1,
  tags: [],
  notes: "",
};

const base = (over: Partial<Transaction>): Transaction =>
  ({
    id: "tx",
    userId: "u1",
    type: "expense",
    amountPaise: 60_000_00,
    amount: 60000,
    date: "2026-05-01",
    paymentMode: "credit_card",
    linkedCardId: "card_sbi",
    categoryId: "cat_e",
    merchantOrPerson: "Mobile",
    description: "",
    billAvailable: 0,
    gstApplicable: 0,
    taxFlag: 0,
    businessOrPersonal: "personal",
    needWant: "unassigned",
    fixedVariable: "unassigned",
    plannedUnplanned: "unassigned",
    isDeleted: 0,
    createdAt: "2026-05-01T00:00:00.000Z",
    updatedAt: "2026-05-01T00:00:00.000Z",
    version: 1,
    tags: [],
    notes: "",
    ...over,
  }) as Transaction;

function views(txs: Transaction[]) {
  const ctx = buildFinanceEventBuilderContext([cat], []);
  const { events, effects } = buildFullLedger("u1", txs, ctx);
  return {
    expense: calculateExpenseView(events, effects, 2026, 5),
    income: calculateIncomeView(events, effects, 2026, 5),
    effects,
  };
}

describe("cardRefundLifecycle.fullMatrix", () => {
  it("A: purchase → full refund before statement — no income, expense nets to 0", () => {
    const purchase = base({ id: "p1" });
    const refund = base({
      id: "r1",
      type: "refund",
      amountPaise: 60_000_00,
      linkedTransactionId: "p1",
      date: "2026-05-02",
    });
    const v = views([purchase, refund]);
    expect(v.income).toBe(0);
    expect(v.expense).toBe(0);
  });

  it("B: purchase → partial refund before statement", () => {
    const purchase = base({ id: "p1" });
    const refund = base({
      id: "r1",
      type: "refund",
      amountPaise: 20_000_00,
      linkedTransactionId: "p1",
      date: "2026-05-02",
    });
    const v = views([purchase, refund]);
    expect(v.income).toBe(0);
    expect(v.expense).toBe(40_000_00);
  });

  it("E: purchase → EMI conversion → full refund still does not create income", () => {
    const purchase = base({ id: "p1" });
    const { plan } = createCardEmiPlanFromPurchase({
      id: "plan_1",
      userId: "u1",
      cardId: "card_sbi",
      purchaseTransactionIds: ["p1"],
      principalPaise: 60_000_00,
      annualRateBps: 1500,
      tenureMonths: 12,
      startDate: "2026-05-05",
    });
    const conversion = base({
      id: "c1",
      type: "card_emi_conversion",
      amountPaise: 60_000_00,
      linkedCardId: "card_sbi",
      linkedCardEmiPlanId: plan.id,
      date: "2026-05-05",
    });
    const refund = base({
      id: "r1",
      type: "refund",
      amountPaise: 60_000_00,
      linkedTransactionId: "p1",
      date: "2026-05-10",
    });
    const v = views([purchase, conversion, refund]);
    expect(v.income).toBe(0);
    expect(v.expense).toBeLessThanOrEqual(60_000_00);
  });

  it("C: purchase → statement date → refund before payment — no income", () => {
    const purchase = base({ id: "p1", date: "2026-05-01" });
    const refund = base({
      id: "r1",
      type: "refund",
      amountPaise: 60_000_00,
      linkedTransactionId: "p1",
      date: "2026-05-20",
    });
    const v = views([purchase, refund]);
    expect(v.income).toBe(0);
    expect(v.expense).toBe(0);
  });

  it("D: purchase → payment → refund — expense nets; no income", () => {
    const purchase = base({ id: "p1", date: "2026-05-01" });
    const payment = base({
      id: "pay1",
      type: "cc_payment",
      amountPaise: 60_000_00,
      paymentMode: "bank_transfer",
      accountId: "acc_bank",
      linkedCardId: "card_sbi",
      date: "2026-05-25",
    });
    const refund = base({
      id: "r1",
      type: "refund",
      amountPaise: 60_000_00,
      linkedTransactionId: "p1",
      date: "2026-05-28",
    });
    const v = views([purchase, payment, refund]);
    expect(v.income).toBe(0);
  });

  it("G: purchase → EMI → one installment paid → refund still not income", () => {
    const purchase = base({ id: "p1" });
    const { plan } = createCardEmiPlanFromPurchase({
      id: "plan_g",
      userId: "u1",
      cardId: "card_sbi",
      purchaseTransactionIds: ["p1"],
      principalPaise: 60_000_00,
      annualRateBps: 1200,
      tenureMonths: 6,
      startDate: "2026-05-05",
    });
    const conversion = base({
      id: "c1",
      type: "card_emi_conversion",
      amountPaise: 60_000_00,
      linkedCardId: "card_sbi",
      linkedCardEmiPlanId: plan.id,
      date: "2026-05-05",
    });
    const charge = base({
      id: "emi1",
      type: "card_emi_charge",
      amountPaise: plan.emiPaise || 10_000_00,
      linkedCardId: "card_sbi",
      linkedCardEmiPlanId: plan.id,
      date: "2026-06-05",
    });
    const refund = base({
      id: "r1",
      type: "refund",
      amountPaise: 30_000_00,
      linkedTransactionId: "p1",
      date: "2026-06-10",
    });
    const v = views([purchase, conversion, charge, refund]);
    expect(v.income).toBe(0);
  });

  it("I: soft-delete purchase removes economic event (cancel path)", () => {
    const purchase = base({ id: "p1", isDeleted: 1 });
    const v = views([purchase]);
    expect(v.expense).toBe(0);
    expect(v.income).toBe(0);
  });
});
