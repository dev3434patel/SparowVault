import { describe, expect, it } from "vitest";
import type { Card, EMIPayment, FinancialEffect, Loan } from "@/types";
import { buildDebtSummary } from "@/services/loanEngine";
import { cardSchema } from "@/services/validators";

const now = "2026-05-22T00:00:00.000Z";

function creditCard(over: Partial<Card> = {}): Card {
  return {
    id: "card_1",
    userId: "u1",
    nickname: "HDFC Card",
    bank: "HDFC",
    last4: "1234",
    type: "credit",
    creditLimit: 50_000,
    statementDay: 10,
    dueDay: 25,
    color: "#2563eb",
    isInactive: 0,
    isDeleted: 0,
    createdAt: now,
    updatedAt: now,
    version: 1,
    tags: [],
    notes: "",
    ...over,
  };
}

function loan(over: Partial<Loan> = {}): Loan {
  return {
    id: "loan_1",
    userId: "u1",
    lender: "SBI",
    loanType: "personal",
    principal: 5_00_000,
    principalPaise: 50_000_000,
    startDate: now,
    tenureMonths: 60,
    annualInterestRate: 12,
    emiDueDay: 5,
    emiAmountOverride: 10_000,
    prepaymentAllowed: 1,
    processingFee: 0,
    insuranceCost: 0,
    status: "active",
    isDeleted: 0,
    createdAt: now,
    updatedAt: now,
    version: 1,
    tags: [],
    notes: "",
    ...over,
  } as Loan;
}

function effect(over: Partial<FinancialEffect>): FinancialEffect {
  return {
    id: over.id ?? "fx_1",
    eventId: over.eventId ?? "evt_1",
    userId: "u1",
    targetType: over.targetType ?? "credit_card",
    targetId: over.targetId ?? "card_1",
    effectDirection: over.effectDirection ?? "increase",
    amountPaise: over.amountPaise ?? 0,
    component: over.component ?? "liability",
    createdAt: now,
  };
}

describe("local phase 6 debt QA contract", () => {
  it("requires limit, statement day, and due day for credit cards", () => {
    const missingCreditLimit = cardSchema.safeParse({
      nickname: "HDFC Card",
      bank: "HDFC",
      type: "credit",
      statementDay: 10,
      dueDay: 25,
    });
    expect(missingCreditLimit.success).toBe(false);

    const valid = cardSchema.safeParse({
      nickname: "HDFC Card",
      bank: "HDFC",
      type: "credit",
      creditLimit: 50_000,
      statementDay: 10,
      dueDay: 25,
    });
    expect(valid.success).toBe(true);
  });

  it("keeps deleted cards out of active debt while allowing historical rows to remain in data", () => {
    const summary = buildDebtSummary(
      [],
      [],
      [
        creditCard({ id: "active_card" }),
        creditCard({ id: "deleted_card", isDeleted: 1 }),
      ],
      [],
      [
        effect({ targetId: "active_card", amountPaise: 10_000 }),
        effect({ targetId: "deleted_card", amountPaise: 99_999 }),
      ],
    );

    expect(summary.cardOutstandingPaise).toBe(10_000);
  });

  it("reports total debt, card debt, loan debt, udhari payable, EMI burden, and debt-to-income", () => {
    const emi: EMIPayment = {
      id: "emi_1",
      userId: "u1",
      loanId: "loan_1",
      dueDate: now,
      amount: 10_000,
      amountPaise: 1_000_000,
      paidAmount: 0,
      paidAmountPaise: 0,
      principalComponent: 0,
      principalComponentPaise: 0,
      interestComponent: 0,
      interestComponentPaise: 0,
      status: "unpaid",
      isDeleted: 0,
      createdAt: now,
      updatedAt: now,
      version: 1,
      tags: [],
      notes: "",
    } as EMIPayment;

    const summary = buildDebtSummary(
      [loan()],
      [emi],
      [creditCard()],
      [
        {
          id: "udh_1",
          userId: "u1",
          name: "Amit",
          type: "payable",
          amount: 1_000,
          amountPaise: 100_000,
          settledAmount: 0,
          settledAmountPaise: 0,
          dueDate: now,
          status: "active",
          isDeleted: 0,
          createdAt: now,
          updatedAt: now,
          version: 1,
          tags: [],
          notes: "",
        },
      ],
      [effect({ amountPaise: 42_000 })],
      100_000_00,
    );

    expect(summary.totalLoanOutstandingPaise).toBe(50_000_000);
    expect(summary.cardOutstandingPaise).toBe(42_000);
    expect(summary.udhariPayablePaise).toBe(100_000);
    expect(summary.totalDebtPaise).toBe(50_142_000);
    expect(summary.monthlyEmiBurdenPaise).toBe(1_000_000);
    expect(summary.debtToIncomePct).toBe(10);
    expect(summary.highInterestPriority).toContain("credit card");
  });
});
