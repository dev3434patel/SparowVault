import { describe, expect, it } from "vitest";
import type { Loan } from "@/types";
import {
  buildDebtSummary,
  buildEmiPaymentIntelligence,
  buildAmortizationSchedule,
  calculateForeclosureBreakdown,
  calculateEMIPaise,
  calculateOutstandingPrincipal,
  importedLoanConfidence,
  loanInterestMethodLabel,
  simulatePrepaymentOptions,
  splitPaymentPrincipalInterest,
} from "@/services/loanEngine";
import { loanPrincipalPaise, rupeesToPaise } from "@/utils/money";

function baseLoan(over: Partial<Loan> = {}): Loan {
  const now = new Date().toISOString();
  return {
    id: "lon_test",
    userId: "u1",
    createdAt: now,
    updatedAt: now,
    isDeleted: 0,
    version: 1,
    tags: [],
    notes: "",
    lender: "Test Bank",
    loanType: "personal",
    principal: 5_00_000,
    startDate: "2026-01-05T00:00:00.000Z",
    tenureMonths: 12,
    annualInterestRate: 12,
    emiDueDay: 5,
    processingFee: 0,
    insuranceCost: 0,
    prepaymentAllowed: 1,
    status: "active",
    ...over,
  } as Loan;
}

describe("loanEngine", () => {
  it("calculateEMIPaise returns integer paise", () => {
    const p = rupeesToPaise(5_00_000);
    const emi = calculateEMIPaise(p, 12, 60);
    expect(emi).toBeGreaterThan(0);
    expect(Number.isInteger(emi)).toBe(true);
  });

  it("buildAmortizationSchedule ends with zero balance", () => {
    const loan = baseLoan({ tenureMonths: 24, annualInterestRate: 10 });
    const rows = buildAmortizationSchedule(loan);
    expect(rows.length).toBe(24);
    expect(rows[rows.length - 1]?.balancePaise).toBe(0);
  });

  it("splitPaymentPrincipalInterest allocates interest before principal", () => {
    const opening = rupeesToPaise(4_00_000);
    const split = splitPaymentPrincipalInterest(opening, rupeesToPaise(44_000), 12);
    expect(split.interestPaise).toBeGreaterThan(0);
    expect(split.principalPaise).toBeGreaterThan(0);
    const totalCore = split.interestPaise + split.principalPaise + split.extraPrincipalPaise;
    expect(totalCore).toBeLessThanOrEqual(rupeesToPaise(44_000));
  });

  it("calculateOutstandingPrincipal subtracts paid principal components", () => {
    const loan = baseLoan();
    const emis = [
      {
        id: "e1",
        userId: "u1",
        loanId: loan.id,
        dueDate: "2026-02-05T00:00:00.000Z",
        amountDue: 10000,
        amountPaid: 10000,
        principalComponent: 5000,
        interestComponent: 5000,
        status: "paid" as const,
        createdAt: loan.createdAt,
        updatedAt: loan.updatedAt,
        isDeleted: 0 as const,
        version: 1,
        tags: [],
        notes: "",
        principalComponentPaise: rupeesToPaise(5000),
        interestComponentPaise: rupeesToPaise(5000),
        amountPaise: rupeesToPaise(10000),
        amountPaidPaise: rupeesToPaise(10000),
      },
    ];
    const out = calculateOutstandingPrincipal(loan, emis);
    expect(out).toBe(loanPrincipalPaise(loan) - rupeesToPaise(5000));
  });

  it("partial EMI remains partial and reports pending risk", () => {
    const emi = {
      id: "e_partial",
      userId: "u1",
      loanId: "lon_test",
      dueDate: "2026-02-05T00:00:00.000Z",
      amountDue: 8500,
      amountPaid: 5000,
      principalComponent: 3000,
      interestComponent: 2000,
      amountPaise: rupeesToPaise(8500),
      amountPaidPaise: rupeesToPaise(5000),
      principalComponentPaise: rupeesToPaise(3000),
      interestComponentPaise: rupeesToPaise(2000),
      status: "partial" as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isDeleted: 0 as const,
      version: 1,
      tags: [],
      notes: "",
    };
    const intel = buildEmiPaymentIntelligence(emi, new Date("2026-02-10"));
    expect(intel.status).toBe("partial");
    expect(intel.pendingPaise).toBe(rupeesToPaise(3500));
    expect(intel.risk).toBe("watch");
  });

  it("prepayment simulator returns reduce-tenure and reduce-EMI options", () => {
    const loan = baseLoan({ principal: 10_00_000, tenureMonths: 60, annualInterestRate: 12 });
    const result = simulatePrepaymentOptions(loan, [], rupeesToPaise(1_00_000));
    expect(result.optionReduceTenure.interestDeltaPaise).toBeGreaterThan(0);
    expect(result.optionReduceTenure.newRemainingTenureMonths).toBeLessThan(60);
    expect(result.optionReduceEmi.newEmiPaise).toBeGreaterThan(0);
    expect(result.explanation).toMatch(/Reduce tenure usually saves more interest/);
  });

  it("foreclosure breakdown includes principal, accrued interest, charges, and reminder", () => {
    const loan = baseLoan({ principal: 5_00_000, foreclosureCharges: 2 });
    const result = calculateForeclosureBreakdown(loan, [], new Date("2026-02-01"));
    expect(result.outstandingPrincipalPaise).toBe(rupeesToPaise(5_00_000));
    expect(result.accruedInterestPaise).toBeGreaterThan(0);
    expect(result.foreclosureChargePaise).toBe(rupeesToPaise(10_000));
    expect(result.finalClosureAmountPaise).toBe(
      result.outstandingPrincipalPaise + result.accruedInterestPaise + result.foreclosureChargePaise,
    );
    expect(result.reminder).toMatch(/NOC/);
  });

  it("labels reducing balance and imported loan confidence", () => {
    expect(loanInterestMethodLabel(baseLoan({ interestType: "reducing_balance" }))).toBe(
      "This loan is calculated using reducing balance method.",
    );
    expect(importedLoanConfidence(baseLoan({ lifecycleMode: "ongoing_imported", outstandingPrincipal: 2_00_000 }))).toBe("high");
    expect(importedLoanConfidence(baseLoan({ lifecycleMode: "ongoing_imported", outstandingPrincipal: 0, completedEmis: 5, emiAmountOverride: 10_000 }))).toBe("medium");
  });

  it("debt summary combines loans, cards, and udhari payable", () => {
    const loan = baseLoan({ principal: 1_00_000 });
    const now = new Date().toISOString();
    const card = {
      id: "card1",
      userId: "u1",
      nickname: "High APR",
      bank: "Bank",
      last4: "1111",
      type: "credit" as const,
      creditLimit: 50_000,
      interestRate: 42,
      color: "#000",
      isInactive: 0 as const,
      createdAt: now,
      updatedAt: now,
      isDeleted: 0 as const,
      version: 1,
      tags: [],
      notes: "",
    };
    const udhari = {
      id: "u_pay",
      userId: "u1",
      personName: "Amit",
      type: "payable" as const,
      amount: 10_000,
      amountPaise: rupeesToPaise(10_000),
      amountSettled: 2_000,
      amountSettledPaise: rupeesToPaise(2_000),
      givenDate: now,
      status: "open" as const,
      reminderOn: 1 as const,
      context: "friend" as const,
      createdAt: now,
      updatedAt: now,
      isDeleted: 0 as const,
      version: 1,
      tags: [],
      notes: "",
    };
    const effects = [
      {
        id: "fx1",
        eventId: "ev1",
        userId: "u1",
        targetType: "credit_card" as const,
        targetId: "card1",
        effectDirection: "increase" as const,
        amountPaise: rupeesToPaise(5_000),
        component: "liability" as const,
        createdAt: now,
      },
    ];
    const summary = buildDebtSummary([loan], [], [card], [udhari], effects, rupeesToPaise(1_00_000));
    expect(summary.totalLoanOutstandingPaise).toBe(rupeesToPaise(1_00_000));
    expect(summary.cardOutstandingPaise).toBe(rupeesToPaise(5_000));
    expect(summary.udhariPayablePaise).toBe(rupeesToPaise(8_000));
    expect(summary.totalDebtPaise).toBe(rupeesToPaise(1_13_000));
    expect(summary.highInterestPriority).toBe("High APR credit card");
  });
});
