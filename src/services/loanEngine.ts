/**
 * Phase 8 — Loan / EMI intelligence: schedules, splits, aggregates (integer paise).
 */

import { addMonths, endOfMonth, parseISO, startOfMonth } from "date-fns";
import type { Card, EMIPayment, Loan, LoanInterestType, UdhariRecord } from "@/types";
import {
  calculateEMI,
  emiPaymentAmountPaise,
  emiPaymentInterestPaise,
  emiPaymentPaidPaise,
  emiPaymentPrincipalPaidPaise,
  loanEmiPaise,
  loanOutstandingPrincipalPaise,
  loanPrincipalPaise,
  paiseToRupees,
  udhariAmountPaise,
  udhariSettledPaise,
} from "@/utils/money";
import { buildCreditCardIntel } from "@/services/cardEngine";
import type { FinancialEffect } from "@/types";

export const REDUCING_BALANCE_LABEL = "This loan is calculated using reducing balance method.";

export function loanInterestType(loan: Pick<Loan, "interestType">): LoanInterestType {
  return loan.interestType ?? "reducing_balance";
}

export function loanInterestMethodLabel(loan: Pick<Loan, "interestType">): string {
  const t = loanInterestType(loan);
  if (t === "reducing_balance") return REDUCING_BALANCE_LABEL;
  if (t === "flat_interest") return "Flat-interest loans are labelled; exact split may need lender statement verification.";
  if (t === "interest_only") return "Interest-only loan mode is labelled; principal repayment must be tracked manually.";
  return "Custom/manual loan mode uses user-entered EMI and split details.";
}

export function isImportedLoanLifecycle(loan: Pick<Loan, "lifecycleMode">): boolean {
  const m = loan.lifecycleMode ?? "fresh";
  return m === "existing" || m === "ongoing_imported";
}

/** Same EMI formula as money.ts — exposed for tests / naming consistency. */
export function calculateEMIPaise(
  principalPaise: number,
  annualRatePercent: number,
  tenureMonths: number,
): number {
  return calculateEMI(principalPaise, annualRatePercent, tenureMonths);
}

export interface AmortizationRow {
  monthIndex: number;
  dueDate: string;
  emiPaise: number;
  principalPaise: number;
  interestPaise: number;
  /** Closing principal after this instalment (always 0 on last row). */
  balancePaise: number;
}

export function remainingTenureMonthsForLoan(
  loan: Pick<Loan, "lifecycleMode" | "remainingEmis" | "completedEmis" | "tenureMonths">,
): number {
  if (isImportedLoanLifecycle(loan)) {
    return Math.max(
      1,
      loan.remainingEmis ??
        (loan.completedEmis !== undefined
          ? Math.max(1, loan.tenureMonths - loan.completedEmis)
          : loan.tenureMonths),
    );
  }
  return Math.max(1, loan.tenureMonths);
}

export function openingPrincipalForSchedulePaise(loan: Loan): number {
  return isImportedLoanLifecycle(loan)
    ? loanOutstandingPrincipalPaise(loan)
    : loanPrincipalPaise(loan);
}

export function buildAmortizationSchedule(loan: Loan): AmortizationRow[] {
  const remainingTenure = remainingTenureMonthsForLoan(loan);
  const openingBalancePaise = openingPrincipalForSchedulePaise(loan);
  const nominalEmiPaise = loanEmiPaise(loan);
  const monthlyRate = loan.annualInterestRate / 12 / 100;
  const start = loan.nextDueDate
    ? parseISO(loan.nextDueDate)
    : loan.firstEmiDate
      ? parseISO(loan.firstEmiDate)
      : parseISO(loan.startDate);
  let balancePaise = openingBalancePaise;
  const rows: AmortizationRow[] = [];

  for (let i = 1; i <= remainingTenure; i++) {
    const isLast = i === remainingTenure;
    let interestPaise: number;
    let principalPaise: number;
    if (isLast) {
      principalPaise = balancePaise;
      interestPaise = Math.max(0, nominalEmiPaise - principalPaise);
      balancePaise = 0;
    } else {
      interestPaise = Math.round(balancePaise * monthlyRate);
      const maxPrincipal = Math.max(0, nominalEmiPaise - interestPaise);
      principalPaise = Math.min(balancePaise, maxPrincipal);
      balancePaise = Math.max(0, balancePaise - principalPaise);
    }

    const rawDue = addMonths(start, i - 1);
    const monthStart = startOfMonth(rawDue);
    const monthEnd = endOfMonth(rawDue);
    const dueDay = Math.min(
      Math.max(1, loan.emiDueDay ?? rawDue.getDate()),
      monthEnd.getDate(),
    );
    const dueDate = new Date(
      monthStart.getFullYear(),
      monthStart.getMonth(),
      dueDay,
    ).toISOString();

    const emiPaise = principalPaise + interestPaise;
    rows.push({
      monthIndex: i,
      dueDate,
      emiPaise,
      principalPaise,
      interestPaise,
      balancePaise,
    });
  }

  return rows;
}

export function openingPrincipalForScheduleMonthPaise(
  schedule: AmortizationRow[],
  monthIndex: number,
  loanOpeningPaise: number,
): number {
  if (monthIndex <= 1) return loanOpeningPaise;
  const prev = schedule[monthIndex - 2];
  return prev?.balancePaise ?? 0;
}

export interface PaymentSplitResult {
  principalPaise: number;
  interestPaise: number;
  penaltyPaise: number;
  feePaise: number;
  extraPrincipalPaise: number;
}

export type PremiumEmiStatus =
  | "unpaid"
  | "partial"
  | "paid"
  | "late"
  | "skipped"
  | "restructured"
  | "moratorium";

export interface EmiPaymentIntelligence {
  actualPaidPaise: number;
  amountDuePaise: number;
  pendingPaise: number;
  principalPaise: number;
  interestPaise: number;
  penaltyPaise: number;
  feePaise: number;
  extraPrincipalPaise: number;
  openingPrincipalPaise: number;
  closingPrincipalPaise: number;
  status: PremiumEmiStatus;
  risk: "none" | "watch" | "high";
}

export function buildEmiPaymentIntelligence(
  payment: EMIPayment,
  today = new Date(),
): EmiPaymentIntelligence {
  const amountDuePaise = emiPaymentAmountPaise(payment);
  const actualPaidPaise = emiPaymentPaidPaise(payment);
  const pendingPaise = Math.max(0, amountDuePaise - actualPaidPaise);
  const due = parseISO(payment.dueDate);
  const isLate = pendingPaise > 0 && due.getTime() < startOfMonth(today).getTime();
  const rawStatus = payment.status;
  const status: PremiumEmiStatus =
    rawStatus === "paid"
      ? "paid"
      : rawStatus === "partial" || (actualPaidPaise > 0 && pendingPaise > 0)
        ? "partial"
        : rawStatus === "late" || rawStatus === "overdue" || isLate
          ? "late"
          : rawStatus === "skipped" || rawStatus === "restructured" || rawStatus === "moratorium"
            ? rawStatus
            : "unpaid";
  const openingPrincipalPaise = Math.max(0, payment.openingPrincipalPaise ?? 0);
  const principalPaise = emiPaymentPrincipalPaidPaise(payment);
  const extraPrincipalPaise = Math.max(0, payment.extraPrincipalPaise ?? 0);
  const closingPrincipalPaise =
    payment.closingPrincipalPaise ?? Math.max(0, openingPrincipalPaise - principalPaise - extraPrincipalPaise);
  return {
    actualPaidPaise,
    amountDuePaise,
    pendingPaise,
    principalPaise,
    interestPaise: emiPaymentInterestPaise(payment),
    penaltyPaise: Math.max(0, payment.penaltyPaise ?? 0),
    feePaise: Math.max(0, payment.feePaise ?? 0),
    extraPrincipalPaise,
    openingPrincipalPaise,
    closingPrincipalPaise,
    status,
    risk: pendingPaise === 0 ? "none" : status === "late" || status === "skipped" ? "high" : "watch",
  };
}

/**
 * Allocate a cash payment: optional penalty & fee taken first, then interest due on opening balance, then principal, then extra principal.
 */
export function splitPaymentPrincipalInterest(
  openingPrincipalPaise: number,
  paymentPaise: number,
  annualRatePercent: number,
  opts?: { penaltyPaise?: number; feePaise?: number },
): PaymentSplitResult {
  const penaltyPaise = Math.max(0, Math.round(opts?.penaltyPaise ?? 0));
  const feePaise = Math.max(0, Math.round(opts?.feePaise ?? 0));
  let pool = paymentPaise - penaltyPaise - feePaise;
  if (pool < 0) pool = 0;

  const monthlyRate = annualRatePercent / 12 / 100;
  const interestDue = Math.round(Math.max(0, openingPrincipalPaise) * monthlyRate);
  const interestPaise = Math.min(pool, interestDue);
  pool -= interestPaise;

  const principalPaise = Math.min(Math.max(0, openingPrincipalPaise), pool);
  pool -= principalPaise;
  const extraPrincipalPaise = Math.max(0, pool);

  return { principalPaise, interestPaise, penaltyPaise, feePaise, extraPrincipalPaise };
}

export function calculatePrincipalPaid(emiPayments: EMIPayment[]): number {
  let sum = 0;
  for (const p of emiPayments) {
    if (p.status !== "paid" && p.status !== "partial") continue;
    sum += emiPaymentPrincipalPaidPaise(p);
    const extra =
      typeof p.extraPrincipalPaise === "number" && Number.isInteger(p.extraPrincipalPaise)
        ? p.extraPrincipalPaise
        : 0;
    sum += Math.max(0, extra);
  }
  return sum;
}

export function calculateInterestPaid(emiPayments: EMIPayment[]): number {
  let sum = 0;
  for (const p of emiPayments) {
    if (p.status !== "paid" && p.status !== "partial") continue;
    sum += emiPaymentInterestPaise(p);
  }
  return sum;
}

export function calculateOutstandingPrincipal(loan: Loan, emiPayments: EMIPayment[]): number {
  const baseline = isImportedLoanLifecycle(loan)
    ? loanOutstandingPrincipalPaise(loan)
    : loanPrincipalPaise(loan);
  return Math.max(0, baseline - calculatePrincipalPaid(emiPayments));
}

function sumScheduleInterestFrom(
  openingPaise: number,
  annualRatePercent: number,
  monthsLeft: number,
  emiPaise: number,
): number {
  if (monthsLeft <= 0 || openingPaise <= 0) return 0;
  const monthlyRate = annualRatePercent / 12 / 100;
  let bal = openingPaise;
  let totalInterest = 0;
  const emi = Math.max(0, emiPaise);
  for (let i = 0; i < monthsLeft; i++) {
    const isLast = i === monthsLeft - 1;
    if (isLast) {
      const p = bal;
      const intr = Math.max(0, emi - p);
      totalInterest += intr;
      bal = 0;
    } else {
      const intr = Math.round(bal * monthlyRate);
      const p = Math.min(bal, Math.max(0, emi - intr));
      totalInterest += intr;
      bal = Math.max(0, bal - p);
    }
  }
  return totalInterest;
}

export function calculateRemainingInterest(
  loan: Loan,
  emiPayments: EMIPayment[],
): number {
  const outstanding = calculateOutstandingPrincipal(loan, emiPayments);
  const monthsLeft = calculateRemainingTenure(loan, emiPayments);
  const emiPaise = loanEmiPaise(loan);
  return sumScheduleInterestFrom(outstanding, loan.annualInterestRate, monthsLeft, emiPaise);
}

export function countPaidScheduleMonths(
  schedule: AmortizationRow[],
  emiPayments: EMIPayment[],
): number {
  let n = 0;
  for (const row of schedule) {
    const ym = row.dueDate.slice(0, 7);
    const hit = emiPayments.find(
      (p) =>
        p.isDeleted !== 1 &&
        p.dueDate.slice(0, 7) === ym &&
        (p.status === "paid" || p.status === "partial"),
    );
    if (hit) n += 1;
  }
  return n;
}

export function calculateRemainingTenure(loan: Loan, emiPayments: EMIPayment[]): number {
  const schedule = buildAmortizationSchedule(loan);
  const paidOnSchedule = countPaidScheduleMonths(schedule, emiPayments);
  const fromLoan = isImportedLoanLifecycle(loan) ? loan.remainingEmis : undefined;
  const fromSchedule = Math.max(0, schedule.length - paidOnSchedule);
  if (fromLoan !== undefined && fromLoan > 0) {
    return Math.max(0, Math.min(fromLoan, fromSchedule));
  }
  return fromSchedule;
}

export interface OverdueEmiSummary {
  count: number;
  amountPaise: number;
}

export function calculateOverdueEMIs(
  loan: Loan,
  emiPayments: EMIPayment[],
  today = new Date(),
): OverdueEmiSummary {
  const t0 = startOfMonth(today).getTime();
  let count = 0;
  let amountPaise = 0;
  for (const p of emiPayments) {
    if (p.isDeleted === 1 || p.loanId !== loan.id) continue;
    if (p.status === "paid") continue;
    const due = parseISO(p.dueDate);
    if (due.getTime() >= t0) continue;
    const dueAmt = emiPaymentAmountPaise(p);
    const paid = emiPaymentPaidPaise(p);
    const overduePart = Math.max(0, dueAmt - paid);
    if (overduePart > 0) {
      count += 1;
      amountPaise += overduePart;
    }
  }
  return { count, amountPaise };
}

export interface PrepaymentImpactResult {
  /** Difference in total future interest vs baseline (positive = saved). */
  interestDeltaPaise: number;
  newRemainingTenureMonths: number;
  newEmiPaise: number;
}

export interface PrepaymentSimulatorResult {
  optionReduceTenure: PrepaymentImpactResult;
  optionReduceEmi: PrepaymentImpactResult;
  explanation: string;
}

/** Run reducing-balance schedule with fixed EMI until principal is cleared; returns month count and total interest. */
export function simulatePayoffMonthsAndInterest(
  openingPaise: number,
  annualRatePercent: number,
  emiPaise: number,
): { months: number; totalInterestPaise: number } {
  let bal = Math.max(0, Math.round(openingPaise));
  const r = annualRatePercent / 12 / 100;
  const emi = Math.max(0, Math.round(emiPaise));
  let months = 0;
  let totalInterestPaise = 0;
  while (bal > 0 && months < 720) {
    months++;
    const intr = Math.round(bal * r);
    const towardPrincipal = emi - intr;
    if (towardPrincipal >= bal || towardPrincipal < 0) {
      totalInterestPaise += Math.max(0, emi - bal);
      bal = 0;
      break;
    }
    const pr = towardPrincipal;
    totalInterestPaise += intr;
    bal = Math.max(0, bal - pr);
  }
  return { months, totalInterestPaise };
}

/**
 * Compare total future interest vs after applying an extra principal prepayment (same EMI; tenure may shrink).
 */
export function calculatePrepaymentImpact(
  loan: Loan,
  emiPayments: EMIPayment[],
  extraPrincipalPaise: number,
): PrepaymentImpactResult {
  const outstanding = calculateOutstandingPrincipal(loan, emiPayments);
  const emiPaise = loanEmiPaise(loan);
  const extra = Math.max(0, Math.round(extraPrincipalPaise));
  const base = simulatePayoffMonthsAndInterest(outstanding, loan.annualInterestRate, emiPaise);
  const newOpening = Math.max(0, outstanding - extra);
  if (newOpening <= 0) {
    return {
      interestDeltaPaise: base.totalInterestPaise,
      newRemainingTenureMonths: 0,
      newEmiPaise: emiPaise,
    };
  }
  const after = simulatePayoffMonthsAndInterest(newOpening, loan.annualInterestRate, emiPaise);
  return {
    interestDeltaPaise: base.totalInterestPaise - after.totalInterestPaise,
    newRemainingTenureMonths: after.months,
    newEmiPaise: emiPaise,
  };
}

export function simulatePrepaymentOptions(
  loan: Loan,
  emiPayments: EMIPayment[],
  extraPrincipalPaise: number,
): PrepaymentSimulatorResult {
  const outstanding = calculateOutstandingPrincipal(loan, emiPayments);
  const monthsLeft = calculateRemainingTenure(loan, emiPayments);
  const newOpening = Math.max(0, outstanding - Math.max(0, extraPrincipalPaise));
  const optionReduceTenure = calculatePrepaymentImpact(loan, emiPayments, extraPrincipalPaise);
  const newEmiPaise =
    newOpening <= 0 || monthsLeft <= 0
      ? 0
      : calculateEMIPaise(newOpening, loan.annualInterestRate, monthsLeft);
  const baseInterest = calculateRemainingInterest(loan, emiPayments);
  const reducedEmiInterest = sumScheduleInterestFrom(
    newOpening,
    loan.annualInterestRate,
    monthsLeft,
    newEmiPaise,
  );
  return {
    optionReduceTenure,
    optionReduceEmi: {
      interestDeltaPaise: Math.max(0, baseInterest - reducedEmiInterest),
      newRemainingTenureMonths: monthsLeft,
      newEmiPaise,
    },
    explanation:
      "Reduce tenure usually saves more interest. Reduce EMI improves monthly cashflow.",
  };
}

export function calculateForeclosureEstimate(
  outstandingPrincipalPaise: number,
  foreclosureChargePercent: number,
): number {
  const fc = foreclosureChargePercent ?? 0;
  return Math.round(outstandingPrincipalPaise * (1 + fc / 100));
}

export interface ForeclosureBreakdown {
  outstandingPrincipalPaise: number;
  accruedInterestPaise: number;
  foreclosureChargePaise: number;
  pendingPenaltyFeePaise: number;
  finalClosureAmountPaise: number;
  reminder: string;
}

export function calculateForeclosureBreakdown(
  loan: Loan,
  emiPayments: EMIPayment[],
  closureDate = new Date(),
): ForeclosureBreakdown {
  const outstandingPrincipalPaise = calculateOutstandingPrincipal(loan, emiPayments);
  const monthlyRate = loan.annualInterestRate / 12 / 100;
  const accruedInterestPaise = Math.round(outstandingPrincipalPaise * monthlyRate);
  const foreclosureChargePaise = Math.round(outstandingPrincipalPaise * ((loan.foreclosureCharges ?? 0) / 100));
  const pendingPenaltyFeePaise = emiPayments
    .filter((p) => p.loanId === loan.id && p.isDeleted !== 1)
    .map((p) => buildEmiPaymentIntelligence(p, closureDate))
    .filter((p) => p.status !== "paid")
    .reduce((sum, p) => sum + p.penaltyPaise + p.feePaise, 0);
  return {
    outstandingPrincipalPaise,
    accruedInterestPaise,
    foreclosureChargePaise,
    pendingPenaltyFeePaise,
    finalClosureAmountPaise:
      outstandingPrincipalPaise + accruedInterestPaise + foreclosureChargePaise + pendingPenaltyFeePaise,
    reminder: "Collect NOC / loan closure letter and verify lien removal after foreclosure.",
  };
}

export type ImportedLoanConfidence = "high" | "medium" | "low";

export function importedLoanConfidence(
  loan: Pick<Loan, "outstandingPrincipal" | "outstandingPrincipalPaise" | "emiAmountOverride" | "emiPaise" | "annualInterestRate" | "emiDueDay" | "completedEmis" | "remainingEmis" | "principal">,
): ImportedLoanConfidence {
  if ((loan.outstandingPrincipalPaise ?? 0) > 0 || (loan.outstandingPrincipal ?? 0) > 0) return "high";
  const hasEnough =
    (loan.principal ?? 0) > 0 &&
    (loan.annualInterestRate ?? 0) > 0 &&
    (loan.emiDueDay ?? 0) > 0 &&
    ((loan.completedEmis ?? 0) > 0 || (loan.remainingEmis ?? 0) > 0) &&
    ((loan.emiPaise ?? 0) > 0 || (loan.emiAmountOverride ?? 0) > 0);
  return hasEnough ? "medium" : "low";
}

export interface DebtSummary {
  totalLoanOutstandingPaise: number;
  cardOutstandingPaise: number;
  udhariPayablePaise: number;
  totalDebtPaise: number;
  monthlyEmiBurdenPaise: number;
  debtToIncomePct: number | null;
  highInterestPriority: string | null;
}

export function buildDebtSummary(
  loans: Loan[],
  emiPayments: EMIPayment[],
  cards: Card[],
  udhari: UdhariRecord[],
  effects: FinancialEffect[] = [],
  monthlyIncomePaise?: number,
): DebtSummary {
  const totalLoanOutstandingPaise = loans
    .filter((l) => l.status !== "closed" && l.isDeleted !== 1)
    .reduce((sum, l) => sum + calculateOutstandingPrincipal(l, emiPayments.filter((e) => e.loanId === l.id)), 0);
  const monthlyEmiBurdenPaise = loans
    .filter((l) => l.status !== "closed" && l.isDeleted !== 1)
    .reduce((sum, l) => sum + loanEmiPaise(l), 0);
  const cardOutstandingPaise = cards
    .filter((c) => c.type === "credit" && c.isDeleted !== 1)
    .reduce((sum, c) => sum + (buildCreditCardIntel(c, [], effects)?.outstandingPaise ?? 0), 0);
  const udhariPayablePaise = udhari
    .filter((u) => u.type === "payable" && u.status !== "settled" && u.status !== "written_off" && u.isDeleted !== 1)
    .reduce((sum, u) => sum + Math.max(0, udhariAmountPaise(u) - udhariSettledPaise(u)), 0);
  const highestLoan = loans
    .filter((l) => l.status !== "closed" && l.isDeleted !== 1)
    .sort((a, b) => b.annualInterestRate - a.annualInterestRate)[0];
  const highestCard = cards
    .filter((c) => c.type === "credit" && c.isDeleted !== 1)
    .sort((a, b) => (b.interestRate ?? 36) - (a.interestRate ?? 36))[0];
  const highInterestPriority =
    highestCard && (!highestLoan || (highestCard.interestRate ?? 36) > highestLoan.annualInterestRate)
      ? `${highestCard.nickname} credit card`
      : highestLoan
        ? `${highestLoan.name ?? highestLoan.lender} loan`
        : null;
  return {
    totalLoanOutstandingPaise,
    cardOutstandingPaise,
    udhariPayablePaise,
    totalDebtPaise: totalLoanOutstandingPaise + cardOutstandingPaise + udhariPayablePaise,
    monthlyEmiBurdenPaise,
    debtToIncomePct:
      monthlyIncomePaise && monthlyIncomePaise > 0
        ? Math.round((monthlyEmiBurdenPaise / monthlyIncomePaise) * 10000) / 100
        : null,
    highInterestPriority,
  };
}

export function buildFriendlyLoanSummaryLine(loan: Loan, emiPayments: EMIPayment[]): string {
  const borrowed = loanPrincipalPaise(loan);
  const paidPrincipal = calculatePrincipalPaid(emiPayments);
  const paidInterest = calculateInterestPaid(emiPayments);
  const totalPaid = paidPrincipal + paidInterest;
  const remainingLoan = calculateOutstandingPrincipal(loan, emiPayments);
  const pool = emiPayments
    .filter((e) => e.loanId === loan.id && e.isDeleted !== 1)
    .filter((e) => e.status !== "paid")
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const nextEmi = pool[0];
  const schedule = buildAmortizationSchedule(loan);
  const schedRow =
    schedule.find((row) => {
      const ym = row.dueDate.slice(0, 7);
      return nextEmi && ym === nextEmi.dueDate.slice(0, 7);
    }) ?? schedule[0];
  const emiPaise = nextEmi ? emiPaymentAmountPaise(nextEmi) : schedRow?.emiPaise ?? loanEmiPaise(loan);
  const dueStr = nextEmi ? formatDueEnIn(nextEmi.dueDate) : schedRow ? formatDueEnIn(schedRow.dueDate) : "—";

  const ru = (p: number) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(
      paiseToRupees(p),
    );

  return `You borrowed ${ru(borrowed)}. You have paid ${ru(totalPaid)}. Your remaining loan is ${ru(remainingLoan)}. Next EMI ${ru(emiPaise)} is due on ${dueStr}.`;
}

function formatDueEnIn(iso: string): string {
  try {
    const d = parseISO(iso);
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
  } catch {
    return iso.slice(0, 10);
  }
}
