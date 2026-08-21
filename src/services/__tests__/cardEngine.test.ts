import { describe, it, expect } from "vitest";
import type { Card, FinancialEffect, Transaction } from "@/types";
import {
  buildCardRepairQueue,
  buildCreditCardIntel,
  calculateCardOutstanding,
  calculateCardOutstandingFromTransactions,
  calculatePaymentToReachUtilization,
  calculateCardRisk,
  findOrphanCreditCardExpenses,
  resolveCardOutstandingPaise,
} from "@/services/cardEngine";

const card = (over: Partial<Card>): Card => ({
  id: over.id ?? "card1",
  userId: over.userId ?? "u1",
  nickname: over.nickname ?? "Test",
  bank: over.bank ?? "Bank",
  last4: over.last4 ?? "4242",
  type: "credit",
  creditLimit: over.creditLimit ?? 100_000,
  creditLimitPaise: over.creditLimitPaise,
  statementDay: over.statementDay ?? 15,
  dueDay: over.dueDay ?? 5,
  color: "#000",
  isInactive: 0,
  createdAt: "2026-01-01",
  updatedAt: "2026-01-01",
  isDeleted: 0,
  version: 1,
  tags: [],
  notes: "",
});

const eff = (over: Partial<FinancialEffect>): FinancialEffect => ({
  id: over.id ?? "e1",
  eventId: over.eventId ?? "fevt_1",
  userId: over.userId ?? "u1",
  targetType: "credit_card",
  targetId: over.targetId ?? "card1",
  effectDirection: over.effectDirection ?? "increase",
  amountPaise: over.amountPaise ?? 10_000,
  component: "liability",
  createdAt: "2026-01-01",
});

describe("cardEngine", () => {
  it("calculateCardOutstanding sums liability effects", () => {
    const effects: FinancialEffect[] = [
      eff({ id: "1", effectDirection: "increase", amountPaise: 50_000 }),
      eff({ id: "2", effectDirection: "decrease", amountPaise: 20_000 }),
    ];
    expect(calculateCardOutstanding("card1", effects, "u1")).toBe(30_000);
  });

  it("findOrphanCreditCardExpenses detects missing linkedCardId", () => {
    const txs: Transaction[] = [
      {
        id: "t1",
        userId: "u1",
        type: "expense",
        amount: 100,
        amountPaise: 10_000,
        date: "2026-05-01",
        paymentMode: "credit_card",
        linkedCardId: "",
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
        isDeleted: 0,
        createdAt: "2026-01-01",
        updatedAt: "2026-01-01",
        version: 1,
      },
    ];
    const o = findOrphanCreditCardExpenses(txs, "u1");
    expect(o).toHaveLength(1);
  });

  it("calculateCardRisk flags over limit", () => {
    const c = card({ creditLimit: 1000 }); // ₹1000 limit → 100_000 paise
    expect(calculateCardRisk(c, 150_000)).toBe("over_limit");
  });

  it("buildCreditCardIntel prefers effects over txn math when effects present", () => {
    const c = card({ id: "c1", creditLimit: 10_000 });
    const txs: Transaction[] = [];
    const effects = [eff({ targetId: "c1", amountPaise: 12_000, effectDirection: "increase" })];
    const intel = buildCreditCardIntel(c, txs, effects, new Date("2026-05-20"));
    expect(intel?.outstandingPaise).toBe(12_000);
    expect(intel?.outstandingSource).toBe("effects");
  });

  it("T-132 overpayment shows credit balance and zero outstanding", () => {
    const c = card({ id: "c_over", creditLimit: 50_000 });
    const effects = [
      eff({ targetId: "c_over", amountPaise: 100_000, effectDirection: "increase" }),
      eff({ targetId: "c_over", amountPaise: 150_000, effectDirection: "decrease" }),
    ];
    const intel = buildCreditCardIntel(c, [], effects, new Date("2026-05-20"));
    expect(intel?.outstandingPaise).toBe(0);
    expect(intel?.creditBalancePaise).toBe(50_000);
    expect(intel?.netLiabilityPaise).toBe(-50_000);
  });

  it("subtracts credit-card refunds from legacy outstanding and statement buckets", () => {
    const c = card({ id: "c1", creditLimit: 10_000, statementDay: 15 });
    const txs: Transaction[] = [
      {
        id: "charge",
        userId: "u1",
        type: "expense",
        amount: 1000,
        amountPaise: 100_000,
        date: "2026-05-10",
        paymentMode: "credit_card",
        linkedCardId: "c1",
        merchantOrPerson: "Store",
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
        isDeleted: 0,
        createdAt: "2026-01-01",
        updatedAt: "2026-01-01",
        version: 1,
      },
      {
        id: "refund",
        userId: "u1",
        type: "refund",
        amount: 250,
        amountPaise: 25_000,
        date: "2026-05-11",
        paymentMode: "credit_card",
        linkedCardId: "c1",
        merchantOrPerson: "Store",
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
        isDeleted: 0,
        createdAt: "2026-01-01",
        updatedAt: "2026-01-01",
        version: 1,
      },
    ] as Transaction[];

    expect(calculateCardOutstandingFromTransactions(c, txs)).toBe(75_000);
    const intel = buildCreditCardIntel(c, txs, [], new Date("2026-05-20"));
    expect(intel?.statementBalancePaise).toBe(75_000);
    expect(intel?.sourceWarning).toBe("Calculated from legacy transactions. Please repair missing card links.");
  });

  it("uses shadow outstanding only when effects are absent", () => {
    const c = card({ id: "c1" });
    const shadow = {
      id: "c1",
      userId: "u1",
      cardName: "Test",
      issuerName: "Bank",
      last4: "4242",
      creditLimitPaise: 100_000,
      currentOutstandingPaise: 40_000,
      unbilledAmountPaise: 0,
      statementBalancePaise: 0,
      minimumDuePaise: 0,
      statementDay: 15,
      dueDay: 5,
      interestRateBps: 3600,
      annualFeePaise: 0,
      isActive: 1,
    } as const;

    expect(resolveCardOutstandingPaise(c, [], [], shadow).source).toBe("shadow");
    expect(resolveCardOutstandingPaise(c, [], [], shadow).outstandingPaise).toBe(40_000);
    expect(resolveCardOutstandingPaise(c, [], [eff({ targetId: "c1", amountPaise: 10_000 })], shadow).source).toBe("effects");
  });

  it("calculates pay-down amounts for utilization targets", () => {
    const c = card({ creditLimit: 1000 });
    expect(calculatePaymentToReachUtilization(c, 90_000, 80)).toBe(10_000);
    expect(calculatePaymentToReachUtilization(c, 90_000, 50)).toBe(40_000);
    expect(calculatePaymentToReachUtilization(c, 90_000, 30)).toBe(60_000);
  });

  it("buildCardRepairQueue detects missing links and setup gaps, skipping reviewed legacy rows", () => {
    const c = card({ id: "bad-card", creditLimit: 0, dueDay: 0 });
    const txs: Transaction[] = [
      {
        id: "missing-card",
        userId: "u1",
        type: "expense",
        amount: 100,
        amountPaise: 10_000,
        date: "2026-05-01",
        paymentMode: "credit_card",
        linkedCardId: "",
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
        isDeleted: 0,
        createdAt: "2026-01-01",
        updatedAt: "2026-01-01",
        version: 1,
      },
      {
        id: "payment-missing-card",
        userId: "u1",
        type: "cc_payment",
        amount: 100,
        amountPaise: 10_000,
        date: "2026-05-01",
        paymentMode: "bank_transfer",
        linkedCardId: "",
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
        isDeleted: 0,
        createdAt: "2026-01-01",
        updatedAt: "2026-01-01",
        version: 1,
      },
      {
        id: "reviewed",
        userId: "u1",
        type: "expense",
        amount: 100,
        amountPaise: 10_000,
        date: "2026-05-01",
        paymentMode: "credit_card",
        linkedCardId: "",
        merchantOrPerson: "",
        description: "",
        notes: "",
        tags: ["legacy_manual_card_reviewed"],
        billAvailable: 0,
        gstApplicable: 0,
        taxFlag: 0,
        businessOrPersonal: "personal",
        needWant: "unassigned",
        fixedVariable: "unassigned",
        plannedUnplanned: "unassigned",
        isDeleted: 0,
        createdAt: "2026-01-01",
        updatedAt: "2026-01-01",
        version: 1,
      },
    ] as Transaction[];

    const kinds = buildCardRepairQueue([c], txs, "u1").map((i) => i.kind);
    expect(kinds).toEqual([
      "credit_expense_missing_card",
      "card_payment_missing_card",
      "card_invalid_limit",
      "card_missing_due_day",
    ]);
  });
});
