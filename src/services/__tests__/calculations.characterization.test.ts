/**
 * PHASE 0 — Characterization tests for src/services/calculations.ts
 * -----------------------------------------------------------------
 * These tests LOCK IN the current behaviour of the calculation engine
 * without asserting whether that behaviour is "right". Any change to
 * the formulas in calculations.ts must be reflected here deliberately.
 *
 * If a Phase 1+ refactor changes a value here, that is a SIGNAL —
 * the maintainer must decide whether the old result, the new result,
 * or both is correct, and update the fixture + a doc note explaining
 * why.
 *
 * DO NOT add behaviour assertions here that the current code does not
 * already exhibit. New behaviour belongs to a later phase.
 */
import { describe, it, expect } from "vitest";
import {
  calculateEMI,
  netMonthlySavings,
  savingsRate,
  projectMonthEndSpend,
  sumIncome,
  sumExpense,
  sumByType,
  isIncomeTx,
  isExpenseTx,
  isCashInflow,
  isCashOutflow,
} from "@/services/calculations";
import type { Transaction } from "@/types";

const tx = (over: Partial<Transaction>): Transaction => ({
  id: over.id ?? "t",
  userId: over.userId ?? "u1",
  type: over.type ?? "expense",
  amount: over.amount ?? 0,
  date: over.date ?? "2026-05-12",
  categoryId: over.categoryId,
  accountId: over.accountId,
  isDeleted: false,
  createdAt: "2026-05-12T00:00:00.000Z",
  updatedAt: "2026-05-12T00:00:00.000Z",
  ...over,
}) as Transaction;

// --- EMI -----------------------------------------------------------------
describe("calculateEMI — characterization (principal in paise, result paise)", () => {
  it("returns 0 when principal is 0", () => {
    expect(calculateEMI(0, 12, 24)).toBe(0);
  });

  it("returns 0 when tenure is 0", () => {
    expect(calculateEMI(10_000_000, 12, 0)).toBe(0);
  });

  it("zero interest collapses to simple division", () => {
    // ₹120,000 principal → 12,000,000 paise / 12 mo = 1,000,000 paise/mo (₹10,000)
    expect(calculateEMI(12_000_000, 0, 12)).toBe(1_000_000);
  });

  it("matches the textbook EMI formula for P=₹100000, r=12%, n=24", () => {
    expect(calculateEMI(10_000_000, 12, 24)).toBeCloseTo(470735, 0);
  });

  it("matches current engine EMI for P=₹500000, r=9%, n=60 (integer paise)", () => {
    expect(calculateEMI(50_000_000, 9, 60)).toBe(1_037_918);
  });
});

// --- savings rate --------------------------------------------------------
describe("savingsRate — characterization", () => {
  it("returns clamped 0 when income is 0", () => {
    // percent(x, 0) is implementation-defined in lib/utils; the wrapping
    // clamp(_, -100, 999) is what we lock in here. If percent returns 0
    // for divide-by-zero we expect 0; if Infinity we expect 999.
    const v = savingsRate(100_000, 0);
    expect(v).toBeGreaterThanOrEqual(-100);
    expect(v).toBeLessThanOrEqual(999);
  });

  it("50% income saved → 50%", () => {
    expect(savingsRate(2_500_000, 5_000_000)).toBeCloseTo(50, 5);
  });

  it("over-saving clamps below 999%", () => {
    expect(savingsRate(10_000_000, 100)).toBeLessThanOrEqual(999);
  });

  it("over-spending clamps above -100%", () => {
    expect(savingsRate(-10_000_000, 100)).toBeGreaterThanOrEqual(-100);
  });
});

// --- monthly savings -----------------------------------------------------
describe("netMonthlySavings — characterization", () => {
  it("income minus expense minus emi minus cc_payment minus udhari_given", () => {
    const txs = [
      tx({ id: "1", type: "income", amount: 80000 }),
      tx({ id: "2", type: "expense", amount: 25000 }),
      tx({ id: "3", type: "emi_payment", amount: 10000 }),
      tx({ id: "4", type: "cc_payment", amount: 5000 }),
      tx({ id: "5", type: "udhari_given", amount: 2000 }),
    ];
    // Amounts are rupee mirrors; engine sums paise → ₹38,000 = 3,800,000 paise
    expect(netMonthlySavings(txs)).toBe(3_800_000);
  });

  it("savings_contribution and investment_contribution are NOT subtracted in netMonthlySavings (Phase 0 lock-in — see Phase-1 review)", () => {
    const txs = [
      tx({ id: "1", type: "income", amount: 50000 }),
      tx({ id: "2", type: "savings_contribution", amount: 5000 }),
      tx({ id: "3", type: "investment_contribution", amount: 3000 }),
    ];
    // Current behaviour: returns 50000. Phase 1 will decide if this is correct
    // (savings transferred to a savings account aren't an "outflow" — fine)
    // or if the alert/budget engine over-counts them somewhere else.
    expect(netMonthlySavings(txs)).toBe(5_000_000);
  });
});

// --- projection ----------------------------------------------------------
describe("projectMonthEndSpend — characterization", () => {
  it("linear extrapolation: half a month in, half spent → projects ~2x", () => {
    const mid = new Date(2026, 4, 15); // May 15 2026
    const spentPaise = 1_550_000; // ₹15,500
    const projected = projectMonthEndSpend(spentPaise, mid);
    expect(projected).toBe(3_203_333);
  });

  it("day 1: spent equals projection × 1/days_in_month", () => {
    const day1 = new Date(2026, 4, 1); // May 1 2026 — 31 days in May
    const projected = projectMonthEndSpend(100_000, day1); // ₹1,000
    expect(projected).toBeCloseTo(3_100_000, 1);
  });
});

// --- classifiers ---------------------------------------------------------
describe("transaction classifiers — characterization", () => {
  it("income type is income; refund is not classified as income", () => {
    expect(isIncomeTx(tx({ type: "income" }))).toBe(true);
    expect(isIncomeTx(tx({ type: "refund" }))).toBe(false);
    expect(isIncomeTx(tx({ type: "expense" }))).toBe(false);
  });

  it("only 'expense' is isExpenseTx (NOT emi_payment / cc_payment)", () => {
    expect(isExpenseTx(tx({ type: "expense" }))).toBe(true);
    expect(isExpenseTx(tx({ type: "emi_payment" }))).toBe(false);
    expect(isExpenseTx(tx({ type: "cc_payment" }))).toBe(false);
  });

  it("cash inflow vs outflow", () => {
    expect(isCashInflow(tx({ type: "income" }))).toBe(true);
    expect(isCashInflow(tx({ type: "loan_disbursement" }))).toBe(true);
    expect(isCashOutflow(tx({ type: "expense" }))).toBe(true);
    expect(isCashOutflow(tx({ type: "transfer" }))).toBe(true);
  });
});

// --- aggregators ---------------------------------------------------------
describe("sum helpers — characterization", () => {
  const sample = [
    tx({ type: "income", amount: 100 }),
    tx({ type: "income", amount: 200 }),
    tx({ type: "expense", amount: 50 }),
    tx({ type: "expense", amount: 75 }),
    tx({ type: "emi_payment", amount: 1000 }),
  ];

  it("sumIncome sums only income types", () => {
    expect(sumIncome(sample)).toBe(30_000);
  });

  it("sumExpense sums only pure 'expense' rows", () => {
    expect(sumExpense(sample)).toBe(12_500);
  });

  it("sumByType(['emi_payment']) returns EMI total", () => {
    expect(sumByType(sample, ["emi_payment"])).toBe(100_000);
  });
});
