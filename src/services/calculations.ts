// Central financial calculation engine. Pure functions, deterministic, no IO.
// Phase 3: internal amounts are integer paise; UI formats to rupees.

import {
  addMonths,
  differenceInCalendarDays,
  differenceInCalendarMonths,
  endOfMonth,
  isSameMonth,
  parseISO,
  startOfMonth,
  subMonths,
} from "date-fns";
import type {
  Budget,
  Card,
  Category,
  EMIPayment,
  FinancialEffect,
  FinancialEvent,
  Goal,
  Investment,
  Loan,
  Transaction,
  TransactionType,
  UdhariRecord,
} from "@/types";
import { computeAccountCashClosingPaise } from "@/services/accountBalanceEngine";
import { calculateCategorySpend } from "@/services/ledgerCalculations";
import { buildCreditCardIntel, type CardRiskLevel } from "@/services/cardEngine";
import {
  buildAmortizationSchedule,
  buildFriendlyLoanSummaryLine,
  calculateForeclosureEstimate,
  calculateInterestPaid,
  calculateOutstandingPrincipal,
  calculateOverdueEMIs,
  calculatePrincipalPaid,
  calculateRemainingInterest,
  calculateRemainingTenure,
  countPaidScheduleMonths,
  openingPrincipalForSchedulePaise,
  type AmortizationRow,
} from "@/services/loanEngine";
import {
  accountOpeningBalancePaise,
  budgetLimitPaise,
  calculateEMI,
  goalSavedPaise,
  goalTargetPaise,
  investmentTotalContributedPaise,
  loanPrincipalPaise,
  transactionAmountPaise,
  udhariAmountPaise,
  udhariSettledPaise,
} from "@/utils/money";

export type { AmortizationRow } from "@/services/loanEngine";

function sumBy<T>(items: readonly T[], fn: (item: T) => number): number {
  let s = 0;
  for (const x of items) s += fn(x);
  return s;
}

function percent(part: number, whole: number): number {
  if (!whole) return 0;
  return Math.round((part / whole) * 10000) / 100;
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

// ------------------------- Transaction roll-ups ------------------------------
/** Genuine income transaction types only — refunds are contra-expense, not income. */
export const INCOME_TYPES: TransactionType[] = ["income"];
export const EXPENSE_TYPES: TransactionType[] = [
  "expense",
  "emi_payment",
  "cc_payment",
  "udhari_given",
  "savings_contribution",
  "investment_contribution",
];

export function isIncomeTx(t: Transaction): boolean {
  return INCOME_TYPES.includes(t.type);
}
export function isExpenseTx(t: Transaction): boolean {
  return t.type === "expense";
}
export function isCashOutflow(t: Transaction): boolean {
  return [
    "expense",
    "emi_payment",
    "cc_payment",
    "udhari_given",
    "udhari_repay",
    "savings_contribution",
    "investment_contribution",
    "transfer",
  ].includes(t.type);
}
export function isCashInflow(t: Transaction): boolean {
  return ["income", "refund", "udhari_received", "loan_disbursement", "udhari_collect"].includes(
    t.type,
  );
}

export function sumIncome(txs: Transaction[]): number {
  return sumBy(txs.filter((t) => INCOME_TYPES.includes(t.type)), (t) => transactionAmountPaise(t));
}

export function sumExpense(txs: Transaction[]): number {
  return sumBy(
    txs.filter((t) => t.type === "expense"),
    (t) => transactionAmountPaise(t),
  );
}

export function sumByType(txs: Transaction[], types: TransactionType[]): number {
  return sumBy(
    txs.filter((t) => types.includes(t.type)),
    (t) => transactionAmountPaise(t),
  );
}

export function filterByMonth(
  txs: Transaction[],
  year: number,
  month: number, // 1-12
): Transaction[] {
  return txs.filter((t) => {
    const d = parseISO(t.date);
    return d.getFullYear() === year && d.getMonth() === month - 1;
  });
}

export function filterByDateRange(txs: Transaction[], from: Date, to: Date): Transaction[] {
  const fromMs = from.getTime();
  const toMs = to.getTime();
  return txs.filter((t) => {
    const m = parseISO(t.date).getTime();
    return m >= fromMs && m <= toMs;
  });
}

// ------------------------- Net savings / savings rate ------------------------
/** Net monthly savings in paise */
export function netMonthlySavings(txs: Transaction[]): number {
  const income = sumIncome(txs);
  const expense = sumExpense(txs);
  const emi = sumByType(txs, ["emi_payment"]);
  const cardDebtSettlements = sumByType(txs, ["cc_payment"]);
  const udhariGiven = sumByType(txs, ["udhari_given"]);
  return income - expense - emi - cardDebtSettlements - udhariGiven;
}

export function savingsRate(netSavingsPaise: number, totalIncomePaise: number): number {
  return clamp(percent(netSavingsPaise, totalIncomePaise), -100, 999);
}

// ------------------------- Budgets -------------------------------------------
export function budgetUsagePercent(spentPaise: number, budgetPaise: number): number {
  return percent(spentPaise, budgetPaise);
}

export function projectMonthEndSpend(spentSoFarPaise: number, today = new Date()): number {
  const startMonth = startOfMonth(today);
  const endMonth = endOfMonth(today);
  const daysElapsed = Math.max(1, differenceInCalendarDays(today, startMonth) + 1);
  const totalDays = differenceInCalendarDays(endMonth, startMonth) + 1;
  const avgPerDay = spentSoFarPaise / daysElapsed;
  return Math.round(avgPerDay * totalDays);
}

// ------------------------- Goals ---------------------------------------------
export interface GoalProgress {
  remainingPaise: number;
  completionPercent: number;
  monthsLeft: number;
  monthlyRequiredPaise: number;
  projectedCompletion: Date | null;
  onTrack: boolean;
}

export function computeGoalProgress(goal: Goal, today = new Date()): GoalProgress {
  const targetP = goalTargetPaise(goal);
  const savedP = goalSavedPaise(goal);
  const remainingPaise = Math.max(0, targetP - savedP);
  const completionPercent = percent(savedP, targetP);
  const target = parseISO(goal.targetDate);
  const monthsLeft = Math.max(0, differenceInCalendarMonths(target, today));
  const monthlyRequiredPaise =
    monthsLeft > 0 ? Math.round(remainingPaise / monthsLeft) : remainingPaise;

  const started = parseISO(goal.startedAt);
  const monthsSinceStart = Math.max(1, differenceInCalendarMonths(today, started));
  const pacePerMonth = savedP / monthsSinceStart;
  const projectedMonths =
    pacePerMonth > 0 ? Math.ceil(remainingPaise / pacePerMonth) : null;
  const projectedCompletion =
    projectedMonths !== null ? addMonths(today, projectedMonths) : null;

  const onTrack =
    monthsLeft === 0
      ? savedP >= targetP
      : pacePerMonth >= monthlyRequiredPaise * 0.9;

  return {
    remainingPaise,
    completionPercent,
    monthsLeft,
    monthlyRequiredPaise,
    projectedCompletion,
    onTrack,
  };
}

// ------------------------- Loans / EMI ---------------------------------------
export { calculateEMI };

export function amortizationSchedule(loan: Loan): AmortizationRow[] {
  return buildAmortizationSchedule(loan);
}

export interface LoanSummary {
  emiPaise: number;
  totalPayablePaise: number;
  totalInterestPaise: number;
  outstandingPrincipalPaise: number;
  originalPrincipalPaise: number;
  principalPaidPaise: number;
  interestPaidPaise: number;
  remainingInterestEstimatePaise: number;
  overdueEmiCount: number;
  overdueAmountPaise: number;
  monthsPaid: number;
  monthsPending: number;
  nextDueDate: string | null;
  foreclosureEstimatePaise: number;
  friendlySummaryLine: string;
}

export function summarizeLoan(loan: Loan, emiPayments: EMIPayment[]): LoanSummary {
  const loanEmis = emiPayments.filter((p) => p.loanId === loan.id);
  const schedule = amortizationSchedule(loan);
  const emiPaise =
    loan.emiPaise ??
    schedule[0]?.emiPaise ??
    calculateEMI(loanPrincipalPaise(loan), loan.annualInterestRate, loan.tenureMonths);
  const openingScheduledPaise = openingPrincipalForSchedulePaise(loan);
  const totalPayablePaise = sumBy(schedule, (row) => row.emiPaise);
  const totalInterestPaise = Math.max(0, totalPayablePaise - openingScheduledPaise);
  const principalPaidPaise = calculatePrincipalPaid(loanEmis);
  const interestPaidPaise = calculateInterestPaid(loanEmis);
  const outstandingPrincipalPaise = calculateOutstandingPrincipal(loan, loanEmis);
  const remainingInterestEstimatePaise = calculateRemainingInterest(loan, loanEmis);
  const overdue = calculateOverdueEMIs(loan, loanEmis);
  const paid = loanEmis.filter((p) => p.status === "paid" || p.status === "partial");
  const monthsPaid = Math.max(
    loan.completedEmis ?? 0,
    paid.length,
    countPaidScheduleMonths(schedule, loanEmis),
  );
  const monthsPending = calculateRemainingTenure(loan, loanEmis);
  const nextUnpaid = schedule.find((row) => {
    const due = loanEmis.find((p) => p.dueDate.slice(0, 7) === row.dueDate.slice(0, 7));
    if (!due) return true;
    if (due.status === "partial") return true;
    return due.status === "due" || due.status === "overdue";
  });
  const foreclosureEstimatePaise = calculateForeclosureEstimate(
    outstandingPrincipalPaise,
    loan.foreclosureCharges ?? 0,
  );
  const originalPrincipalPaise = loanPrincipalPaise(loan);
  const friendlySummaryLine = buildFriendlyLoanSummaryLine(loan, loanEmis);
  return {
    emiPaise,
    totalPayablePaise,
    totalInterestPaise,
    outstandingPrincipalPaise,
    originalPrincipalPaise,
    principalPaidPaise,
    interestPaidPaise,
    remainingInterestEstimatePaise,
    overdueEmiCount: overdue.count,
    overdueAmountPaise: overdue.amountPaise,
    monthsPaid,
    monthsPending,
    nextDueDate: nextUnpaid?.dueDate ?? null,
    foreclosureEstimatePaise,
    friendlySummaryLine,
  };
}

// ------------------------- Credit cards --------------------------------------
export interface CardHealth {
  utilization: number;
  outstandingBalancePaise: number;
  statementBalancePaise: number;
  status: "healthy" | "watch" | "warning" | "critical";
  nextDueDate: string | null;
}

export function summarizeCardHealth(
  card: Card,
  txs: Transaction[],
  today = new Date(),
  effects: FinancialEffect[] = [],
): CardHealth {
  if (card.type !== "credit") {
    return {
      utilization: 0,
      outstandingBalancePaise: 0,
      statementBalancePaise: 0,
      status: "healthy",
      nextDueDate: null,
    };
  }
  const intel = buildCreditCardIntel(card, txs, effects, today);
  if (!intel) {
    return {
      utilization: 0,
      outstandingBalancePaise: 0,
      statementBalancePaise: 0,
      status: "healthy",
      nextDueDate: null,
    };
  }
  const riskToStatus: Record<CardRiskLevel, CardHealth["status"]> = {
    safe: "healthy",
    watch: "watch",
    risky: "warning",
    danger: "critical",
    over_limit: "critical",
  };
  return {
    utilization: intel.utilizationPct,
    outstandingBalancePaise: intel.outstandingPaise,
    statementBalancePaise: intel.statementBalancePaise,
    status: riskToStatus[intel.risk],
    nextDueDate: intel.nextDueDateIso,
  };
}

// ------------------------- Udhari --------------------------------------------
export function totalUdhariReceivable(records: UdhariRecord[]): number {
  return sumBy(
    records.filter((r) => r.type === "receivable" && r.status !== "settled" && r.status !== "written_off"),
    (r) => udhariAmountPaise(r) - udhariSettledPaise(r),
  );
}
export function totalUdhariPayable(records: UdhariRecord[]): number {
  return sumBy(
    records.filter((r) => r.type === "payable" && r.status !== "settled" && r.status !== "written_off"),
    (r) => udhariAmountPaise(r) - udhariSettledPaise(r),
  );
}

// ------------------------- Investments ---------------------------------------
export function projectedCorpus(
  monthlyAmountPaise: number,
  annualReturnPct: number,
  months: number,
): number {
  if (months <= 0) return 0;
  const r = annualReturnPct / 12 / 100;
  if (r === 0) return monthlyAmountPaise * months;
  const corpusPaise = monthlyAmountPaise * ((Math.pow(1 + r, months) - 1) / r) * (1 + r);
  return Math.round(corpusPaise);
}

export function emergencyMonthsCoverage(
  totalEmergencyFundPaise: number,
  avgMonthlyExpensePaise: number,
): number {
  if (!avgMonthlyExpensePaise) return 0;
  return totalEmergencyFundPaise / avgMonthlyExpensePaise;
}

// ------------------------- Financial Health Score ----------------------------
export interface FinancialHealthBreakdown {
  savings: number;
  overdue: number;
  creditUtilization: number;
  budgetDiscipline: number;
  goals: number;
  emergencyFund: number;
  debtToIncome: number;
  total: number;
  grade: "Excellent" | "Strong" | "Fair" | "Weak" | "Poor";
}

export interface HealthInputs {
  savingsRatePct: number;
  overduePayments: number;
  avgCreditUtilizationPct: number;
  budgetAdherencePct: number;
  goalOnTrackPct: number;
  emergencyMonthsCoverage: number;
  debtToIncomeRatio: number;
}

export function computeFinancialHealth(i: HealthInputs): FinancialHealthBreakdown {
  const savings = clamp(i.savingsRatePct / 30, 0, 1) * 22;
  const overdue = i.overduePayments === 0 ? 14 : Math.max(0, 14 - i.overduePayments * 3);
  const creditUtilization =
    i.avgCreditUtilizationPct <= 30
      ? 14
      : i.avgCreditUtilizationPct <= 50
        ? 10
        : i.avgCreditUtilizationPct <= 80
          ? 5
          : 0;
  const budgetDiscipline = clamp(i.budgetAdherencePct / 100, 0, 1) * 14;
  const goals = clamp(i.goalOnTrackPct / 100, 0, 1) * 12;
  const emergencyFund = clamp(i.emergencyMonthsCoverage / 6, 0, 1) * 14;
  const dti = clamp(1 - i.debtToIncomeRatio / 0.5, 0, 1) * 10;

  const total = Math.round(
    savings + overdue + creditUtilization + budgetDiscipline + goals + emergencyFund + dti,
  );
  const grade: FinancialHealthBreakdown["grade"] =
    total >= 85
      ? "Excellent"
      : total >= 70
        ? "Strong"
        : total >= 55
          ? "Fair"
          : total >= 40
            ? "Weak"
            : "Poor";
  return {
    savings: Math.round(savings),
    overdue: Math.round(overdue),
    creditUtilization: Math.round(creditUtilization),
    budgetDiscipline: Math.round(budgetDiscipline),
    goals: Math.round(goals),
    emergencyFund: Math.round(emergencyFund),
    debtToIncome: Math.round(dti),
    total,
    grade,
  };
}

// ------------------------- Account balance derivation ------------------------
export function deriveAccountBalance(
  accountId: string,
  openingBalancePaise: number,
  txs: Transaction[],
): number {
  return computeAccountCashClosingPaise(accountId, openingBalancePaise, txs);
}

export function deriveAccountBalanceFromAccount(
  accountId: string,
  account: Pick<import("@/types").Account, "openingBalance" | "openingBalancePaise">,
  txs: Transaction[],
): number {
  return deriveAccountBalance(accountId, accountOpeningBalancePaise(account), txs);
}

// ------------------------- Monthly trend -------------------------------------
export interface MonthlyBucket {
  monthKey: string;
  label: string;
  incomePaise: number;
  expensePaise: number;
  netPaise: number;
}

export function monthlyTrend(
  txs: Transaction[],
  monthsBack: number,
  today = new Date(),
): MonthlyBucket[] {
  const buckets: MonthlyBucket[] = [];
  for (let i = monthsBack - 1; i >= 0; i--) {
    const d = subMonths(today, i);
    const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleString("en-US", { month: "short" });
    const monthTx = txs.filter((t) => {
      const td = parseISO(t.date);
      return isSameMonth(td, d);
    });
    const incomePaise = sumIncome(monthTx);
    const expensePaise = sumExpense(monthTx);
    buckets.push({ monthKey, label, incomePaise, expensePaise, netPaise: incomePaise - expensePaise });
  }
  return buckets;
}

// ------------------------- Category breakdown --------------------------------
export interface CategorySlice {
  categoryId: string;
  categoryName: string;
  color: string;
  amountPaise: number;
  percent: number;
}

export function categoryBreakdown(
  txs: Transaction[],
  categories: Category[],
): CategorySlice[] {
  const expenses = txs.filter((t) => t.type === "expense");
  const total = sumBy(expenses, (t) => transactionAmountPaise(t));
  const map = new Map<string, { amountPaise: number; name: string; color: string }>();
  for (const tx of expenses) {
    const catId = tx.categoryId ?? "uncategorized";
    const cat = categories.find((c) => c.id === catId);
    const name = cat?.name ?? "Uncategorized";
    const color = cat?.color ?? "#9aa4b2";
    const cur = map.get(catId) ?? { amountPaise: 0, name, color };
    cur.amountPaise += transactionAmountPaise(tx);
    cur.name = name;
    cur.color = color;
    map.set(catId, cur);
  }
  return Array.from(map.entries())
    .map(([id, v]) => ({
      categoryId: id,
      categoryName: v.name,
      color: v.color,
      amountPaise: v.amountPaise,
      percent: percent(v.amountPaise, total),
    }))
    .sort((a, b) => b.amountPaise - a.amountPaise);
}

// ------------------------- Budget status --------------------------------------
export interface BudgetStatus {
  budget: Budget;
  spentPaise: number;
  remainingPaise: number;
  percentUsed: number;
  level: "ok" | "watch" | "warning" | "over";
  projectedMonthEndPaise: number;
  projectedOverrun: boolean;
}

export function budgetStatuses(
  budgets: Budget[],
  txs: Transaction[],
  today = new Date(),
  ledger?: {
    events: FinancialEvent[];
    effects: FinancialEffect[];
    useLedger: boolean;
  },
): BudgetStatus[] {
  return budgets.map((b) => {
    const monthNo = b.period === "monthly" ? (b.month ?? today.getMonth() + 1) : today.getMonth() + 1;
    const yearNo = b.year;
    let spentPaise: number;
    if (ledger?.useLedger && b.categoryId) {
      spentPaise =
        b.period === "monthly"
          ? calculateCategorySpend(ledger.events, ledger.effects, b.categoryId, yearNo, monthNo)
          : (() => {
              let sum = 0;
              for (let m = 1; m <= 12; m += 1) {
                sum += calculateCategorySpend(ledger.events, ledger.effects, b.categoryId, yearNo, m);
              }
              return sum;
            })();
    } else {
      let relevant: Transaction[];
      if (b.period === "monthly") {
        relevant = filterByMonth(txs, b.year, monthNo);
      } else {
        relevant = txs.filter((t) => parseISO(t.date).getFullYear() === b.year);
      }
      spentPaise = sumBy(
        relevant.filter((t) => t.type === "expense" && t.categoryId === b.categoryId),
        (t) => transactionAmountPaise(t),
      );
    }
    const cap = budgetLimitPaise(b);
    const remainingPaise = Math.max(0, cap - spentPaise);
    const percentUsed = percent(spentPaise, cap);
    const level: BudgetStatus["level"] =
      percentUsed >= 100 ? "over" : percentUsed >= 80 ? "warning" : percentUsed >= 50 ? "watch" : "ok";
    const projectedMonthEndPaise = projectMonthEndSpend(spentPaise, today);
    return {
      budget: b,
      spentPaise,
      remainingPaise,
      percentUsed,
      level,
      projectedMonthEndPaise,
      projectedOverrun: projectedMonthEndPaise > cap && percentUsed < 100,
    };
  });
}

// ------------------------- Investment aggregates -----------------------------
export function totalInvested(investments: Investment[]): number {
  return sumBy(
    investments.filter((i) => i.status === "active"),
    (i) => investmentTotalContributedPaise(i),
  );
}
