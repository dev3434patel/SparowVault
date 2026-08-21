/**
 * Phase 11 — Deterministic suggestion engine. All amounts are computed here;
 * optional AI may only rephrase fixed strings + JSON facts.
 */

import {
  differenceInCalendarDays,
  endOfMonth,
  parseISO,
  startOfMonth,
  subDays,
} from "date-fns";
import type {
  Account,
  AiSuggestionSeverity,
  AiSuggestionType,
  Budget,
  Card,
  Category,
  EMIPayment,
  FinancialEffect,
  FinancialEvent,
  Goal,
  ISODate,
  Loan,
  RecurringRule,
  Transaction,
  UdhariRecord,
} from "@/types";
import { calculateCategorySpend, hasUsableLedger } from "@/services/ledgerCalculations";
import {
  computeGoalProgress,
  filterByMonth,
  summarizeLoan,
} from "@/services/calculations";
import { buildCashflowSurvivalReport } from "@/services/cashflowSurvivalEngine";
import { buildCreditCardIntel } from "@/services/cardEngine";
import { smartBudgetStatuses } from "@/services/smartBudgetEngine";
import {
  budgetLimitPaise,
  emiPaymentAmountPaise,
  emiPaymentOutstandingPaise,
  emiPaymentPaidPaise,
  formatMoney,
  rupeesToPaise,
  transactionAmountPaise,
  udhariAmountPaise,
  udhariSettledPaise,
} from "@/utils/money";

export interface SuggestionEngineInput {
  userId: string;
  today?: Date;
  accounts: Account[];
  cards: Card[];
  loans: Loan[];
  emis: EMIPayment[];
  goals: Goal[];
  budgets: Budget[];
  udhari: UdhariRecord[];
  recurringRules: RecurringRule[];
  categories: Category[];
  transactions: Transaction[];
  ledgerEvents: FinancialEvent[];
  ledgerEffects: FinancialEffect[];
}

export interface SuggestionDraft {
  dedupeKey: string;
  suggestionType: AiSuggestionType;
  severity: AiSuggestionSeverity;
  title: string;
  reason: string;
  calculationInputsJson: Record<string, unknown>;
  recommendedAction: string;
  expectedImpactJson?: Record<string, unknown> | null;
  confidenceScore: number;
  sourceModule: string;
  expiresAt: ISODate;
  status: "active";
}

const MODULE = "suggestionEngine.v1";

/** Stable JSON for idempotent comparison of calculation payloads. */
export function stableCalculationJson(obj: Record<string, unknown>): string {
  const sort = (v: unknown): unknown => {
    if (v === null || typeof v !== "object") return v;
    if (Array.isArray(v)) return v.map(sort);
    const o = v as Record<string, unknown>;
    const keys = Object.keys(o).sort();
    const out: Record<string, unknown> = {};
    for (const k of keys) out[k] = sort(o[k]);
    return out;
  };
  return JSON.stringify(sort(obj));
}

export function validateSuggestionDraft(draft: SuggestionDraft): string[] {
  const errors: string[] = [];
  if (!draft.suggestionType) errors.push("suggestionType");
  if (!draft.severity) errors.push("severity");
  if (!draft.title.trim()) errors.push("title");
  if (!draft.reason.trim()) errors.push("reason");
  if (!draft.calculationInputsJson || typeof draft.calculationInputsJson !== "object") {
    errors.push("calculationInputsJson");
  }
  if (!draft.recommendedAction.trim()) errors.push("recommendedAction");
  if (draft.expectedImpactJson === undefined) errors.push("expectedImpactJson");
  if (!Number.isFinite(draft.confidenceScore) || draft.confidenceScore < 0 || draft.confidenceScore > 1) {
    errors.push("confidenceScore");
  }
  if (!draft.sourceModule.trim()) errors.push("sourceModule");
  if (!draft.expiresAt) errors.push("expiresAt");
  if (!draft.dedupeKey.trim()) errors.push("dedupeKey");
  if (draft.status !== "active") errors.push("status");
  return errors;
}

function draft(row: Omit<SuggestionDraft, "status">): SuggestionDraft {
  return { ...row, status: "active" };
}

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function expiresEndOfMonthIso(today: Date): ISODate {
  return endOfMonth(today).toISOString();
}

function categoryName(categories: Category[], id: string): string {
  return categories.find((c) => c.id === id)?.name ?? "This category";
}

function median(nums: number[]): number {
  if (nums.length === 0) return 0;
  const s = [...nums].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2;
}

export function buildSuggestionDrafts(input: SuggestionEngineInput): SuggestionDraft[] {
  const today = input.today ?? new Date();
  const y = today.getFullYear();
  const m = today.getMonth() + 1;
  const mk = monthKey(today);
  const out: Array<Omit<SuggestionDraft, "status">> = [];

  const txs = input.transactions.filter((t) => t.isDeleted !== 1 && t.userId === input.userId);
  const budgets = input.budgets.filter((b) => b.isDeleted !== 1 && b.userId === input.userId);
  const ledgerEvents = input.ledgerEvents ?? [];
  const ledgerEffects = input.ledgerEffects ?? [];
  const useLedgerViews = hasUsableLedger(ledgerEvents, ledgerEffects);
  const smart = smartBudgetStatuses(budgets, txs, input.recurringRules, today);

  for (const row of smart) {
    const b = row.budget;
    if (b.period !== "monthly" || b.year !== y || (b.month ?? m) !== m) continue;
    const cap = budgetLimitPaise(b);
    if (cap <= 0) continue;
    const start = startOfMonth(today);
    const end = endOfMonth(today);
    const totalDays = Math.max(1, differenceInCalendarDays(end, start) + 1);
    const dayIdx = Math.min(totalDays, differenceInCalendarDays(today, start) + 1);
    const daysLeft = Math.max(0, totalDays - dayIdx);
    if (daysLeft <= 0) continue;
    const ledgerSpentPaise = useLedgerViews
      ? calculateCategorySpend(ledgerEvents, ledgerEffects, b.categoryId, y, m)
      : row.spentPaise;
    const remainingPaise = cap - ledgerSpentPaise;
    const percentUsed = (ledgerSpentPaise / Math.max(1, cap)) * 100;
    const level = percentUsed >= 100 ? "over" : percentUsed >= 80 ? "warning" : row.level;
    const safeDaily = Math.round(remainingPaise / daysLeft);
    if (percentUsed < 40 && level === "ok") continue;
    const cat = categoryName(input.categories, b.categoryId);
    const calc: Record<string, unknown> = {
      budgetId: b.id,
      categoryId: b.categoryId,
      categoryName: cat,
      spentPaise: ledgerSpentPaise,
      capPaise: cap,
      daysLeftInMonth: daysLeft,
      safeDailySpendPaise: safeDaily,
      percentUsed: Math.round(percentUsed * 10) / 10,
      month: mk,
      calculationSource: useLedgerViews ? "ledger" : "transaction_fallback",
    };
    const title = `${cat} budget pace`;
    const reason = `${cat} spending is ${formatMoney(ledgerSpentPaise)} of ${formatMoney(cap)}. ${daysLeft} day(s) left in the month. Safe pace for this category is about ${formatMoney(safeDaily)}/day.`;
    out.push({
      dedupeKey: `budget:${b.categoryId}:${mk}`,
      suggestionType: "budget",
      severity: level === "over" ? "danger" : level === "warning" ? "warning" : "info",
      title,
      reason,
      calculationInputsJson: calc,
      recommendedAction: remainingPaise <= 0
        ? "Pause discretionary spends in this category until next month."
        : `Keep this category under about ${formatMoney(safeDaily)} per day for the rest of the month.`,
      expectedImpactJson: { avoidsOverrunPaise: Math.max(0, row.adjustedMonthEndProjectedPaise - cap) },
      confidenceScore: 0.82,
      sourceModule: MODULE,
      expiresAt: expiresEndOfMonthIso(today),
    });
  }

  for (const card of input.cards) {
    if (card.isDeleted === 1 || card.userId !== input.userId || card.type !== "credit") continue;
    const intel = buildCreditCardIntel(card, txs, input.ledgerEffects, today);
    if (!intel || intel.limitPaise <= 0) continue;
    const util = Math.round(intel.utilizationPct);
    if (util < 70) continue;
    const targetOutstanding = Math.round(intel.limitPaise * 0.5);
    const payPaise = Math.max(0, intel.outstandingPaise - targetOutstanding);
    if (payPaise < 50_000) continue;
    const calc: Record<string, unknown> = {
      cardId: card.id,
      cardName: card.nickname,
      outstandingPaise: intel.outstandingPaise,
      limitPaise: intel.limitPaise,
      utilizationPct: util,
      suggestedPaymentPaise: payPaise,
      statementPeriodLabel: intel.statementPeriodLabel,
    };
    const title = `${card.nickname} utilization`;
    const reason = `${card.nickname} is at about ${util}% of the limit (${formatMoney(intel.outstandingPaise)} of ${formatMoney(intel.limitPaise)}). Paying about ${formatMoney(payPaise)} would bring utilization near 50% and reduce rollover risk.`;
    out.push({
      dedupeKey: `card:${card.id}:${mk}`,
      suggestionType: "credit_card",
      severity: util >= 90 ? "danger" : "warning",
      title,
      reason,
      calculationInputsJson: calc,
      recommendedAction: `Schedule a card payment of at least ${formatMoney(payPaise)} before the due date.`,
      expectedImpactJson: { utilizationAfterPaymentApproxPct: 50 },
      confidenceScore: 0.78,
      sourceModule: MODULE,
      expiresAt: expiresEndOfMonthIso(today),
    });
  }

  for (const loan of input.loans) {
    if (loan.isDeleted === 1 || loan.userId !== input.userId || loan.status !== "active") continue;
    if (loan.prepaymentAllowed !== 1) continue;
    const sum = summarizeLoan(loan, input.emis);
    if (sum.outstandingPrincipalPaise <= 0) continue;
    const extra = Math.min(
      500_000,
      Math.max(100_000, Math.round(sum.outstandingPrincipalPaise * 0.02)),
    );
    if (extra > sum.outstandingPrincipalPaise) continue;
    const ratio = extra / Math.max(1, sum.outstandingPrincipalPaise);
    const interestSavedRough = Math.min(
      sum.remainingInterestEstimatePaise,
      Math.round(sum.remainingInterestEstimatePaise * ratio),
    );
    const calc: Record<string, unknown> = {
      loanId: loan.id,
      lender: loan.lender,
      outstandingPrincipalPaise: sum.outstandingPrincipalPaise,
      extraPrepaymentPaise: extra,
      estimatedInterestSavedPaise: interestSavedRough,
      remainingInterestEstimatePaise: sum.remainingInterestEstimatePaise,
      annualInterestRate: loan.annualInterestRate,
    };
    const title = `${loan.lender} prepayment`;
    const reason = `An extra prepayment of about ${formatMoney(extra)} could reduce lifetime interest by roughly ${formatMoney(interestSavedRough)} (estimate from your remaining interest balance and principal).`;
    out.push({
      dedupeKey: `loan:${loan.id}:${mk}`,
      suggestionType: "loan",
      severity: "opportunity",
      title,
      reason,
      calculationInputsJson: calc,
      recommendedAction: "If your lender allows it, add this amount to principal prepayment on the next EMI cycle.",
      expectedImpactJson: { estimatedInterestSavedPaise: interestSavedRough },
      confidenceScore: 0.65,
      sourceModule: MODULE,
      expiresAt: expiresEndOfMonthIso(today),
    });
  }

  const activeLoanById = new Map(
    input.loans
      .filter((loan) => loan.isDeleted !== 1 && loan.userId === input.userId && loan.status === "active")
      .map((loan) => [loan.id, loan]),
  );
  for (const emi of input.emis) {
    if (emi.isDeleted === 1 || emi.userId !== input.userId) continue;
    const loan = activeLoanById.get(emi.loanId);
    if (!loan) continue;
    const dueDate = parseISO(emi.dueDate);
    const daysOverdue = differenceInCalendarDays(today, dueDate);
    const amountDuePaise = emiPaymentAmountPaise(emi);
    const paidPaise = emiPaymentPaidPaise(emi);
    const pendingPaise = emiPaymentOutstandingPaise(emi);
    if (amountDuePaise <= 0 || pendingPaise <= 0) continue;
    const baseCalc: Record<string, unknown> = {
      emiId: emi.id,
      loanId: loan.id,
      lender: loan.lender,
      dueDate: emi.dueDate,
      status: emi.status,
      amountDuePaise,
      paidPaise,
      pendingPaise,
      daysOverdue,
    };

    if (daysOverdue > 0 && (emi.status === "due" || emi.status === "unpaid" || emi.status === "overdue" || emi.status === "late")) {
      out.push({
        dedupeKey: `emi:overdue:${emi.id}:${mk}`,
        suggestionType: "loan",
        severity: daysOverdue >= 7 ? "danger" : "warning",
        title: `${loan.lender} EMI overdue`,
        reason: `${loan.lender} EMI due on ${emi.dueDate.slice(0, 10)} still has ${formatMoney(pendingPaise)} pending after ${daysOverdue} day(s).`,
        calculationInputsJson: baseCalc,
        recommendedAction: "Pay the pending EMI amount or record lender-approved restructuring before treating this month as paid.",
        expectedImpactJson: { pendingEmiPaise: pendingPaise, overdueDays: daysOverdue },
        confidenceScore: 0.9,
        sourceModule: MODULE,
        expiresAt: expiresEndOfMonthIso(today),
      });
    }

    if (emi.status === "partial") {
      out.push({
        dedupeKey: `emi:partial:${emi.id}:${mk}`,
        suggestionType: "loan",
        severity: daysOverdue > 0 ? "warning" : "info",
        title: `${loan.lender} partial EMI pending`,
        reason: `${loan.lender} EMI has ${formatMoney(paidPaise)} paid against ${formatMoney(amountDuePaise)} due, leaving ${formatMoney(pendingPaise)} pending.`,
        calculationInputsJson: baseCalc,
        recommendedAction: "Clear the pending EMI balance or keep the loan marked partial until the lender confirms full payment.",
        expectedImpactJson: { pendingEmiPaise: pendingPaise },
        confidenceScore: 0.88,
        sourceModule: MODULE,
        expiresAt: expiresEndOfMonthIso(today),
      });
    }
  }

  const survival = buildCashflowSurvivalReport(
    input.accounts,
    txs,
    input.recurringRules,
    input.loans,
    input.emis,
    input.cards,
    input.goals,
    input.udhari,
    input.ledgerEffects,
    today,
  );
  const coreDaily = survival.safeDailyCorePaise;
  const headlineDaily =
    coreDaily > 0 ? coreDaily : Math.max(0, survival.safeDailySpendPaise);
  if (
    headlineDaily > 0 ||
    survival.disposableAfterBillsPaise > 0 ||
    survival.cashAvailablePaise > 0 ||
    survival.breakdown.length > 0
  ) {
    const calc: Record<string, unknown> = {
      disposableAfterBillsPaise: survival.disposableAfterBillsPaise,
      disposableCorePaise: survival.disposableCorePaise,
      daysUntilNextIncome: survival.daysUntilNextIncome,
      safeDailySpendPaise: survival.safeDailySpendPaise,
      safeDailyCorePaise: survival.safeDailyCorePaise,
      nextIncomeDate: survival.nextIncomeDate,
      headlineSafeDailyPaise: headlineDaily,
    };
    const reason =
      coreDaily > 0
        ? `After bills in your cashflow window, a conservative daily spend from core balances is about ${formatMoney(coreDaily)}/day (informal udhari payables are handled separately in the survival report).`
        : `After all scheduled items in the window (including informal udhari), the model shows about ${formatMoney(survival.safeDailySpendPaise)}/day — core-only headroom is tighter; review dated bills and income timing.`;
    out.push({
      dedupeKey: `cashflow:daily:${mk}:${survival.nextIncomeDate ?? "none"}`,
      suggestionType: "cashflow",
      severity: coreDaily > 0 && coreDaily < 30_000 ? "warning" : headlineDaily === 0 ? "danger" : "info",
      title: "Safe daily spend (after bills)",
      reason,
      calculationInputsJson: calc,
      recommendedAction:
        "Use this figure as a soft ceiling for discretionary spending until the next inflow or bill cycle refresh.",
      expectedImpactJson: { headlineSafeDailyPaise: headlineDaily },
      confidenceScore: 0.74,
      sourceModule: MODULE,
      expiresAt: expiresEndOfMonthIso(today),
    });
  }

  for (const goal of input.goals) {
    if (goal.isDeleted === 1 || goal.userId !== input.userId || goal.status !== "active") continue;
    if (differenceInCalendarDays(parseISO(goal.targetDate), today) < 0) continue;
    const gp = computeGoalProgress(goal, today);
    if (gp.remainingPaise <= 0) continue;
    if (gp.monthlyRequiredPaise <= 0) continue;
    const calc: Record<string, unknown> = {
      goalId: goal.id,
      goalTitle: goal.title,
      remainingPaise: gp.remainingPaise,
      monthsLeft: gp.monthsLeft,
      monthlyRequiredPaise: gp.monthlyRequiredPaise,
      onTrack: gp.onTrack,
      targetDate: goal.targetDate,
    };
    const title = `${goal.title} funding pace`;
    const reason = `${goal.title} still needs about ${formatMoney(gp.remainingPaise)} with roughly ${gp.monthsLeft} month(s) to the target date — that implies about ${formatMoney(gp.monthlyRequiredPaise)}/month if you save evenly.`;
    out.push({
      dedupeKey: `goal:${goal.id}:${mk}`,
      suggestionType: "goal",
      severity: gp.onTrack ? "info" : "warning",
      title,
      reason,
      calculationInputsJson: calc,
      recommendedAction: "Set or increase a recurring transfer toward this goal on pay day.",
      expectedImpactJson: { monthlyRequiredPaise: gp.monthlyRequiredPaise },
      confidenceScore: 0.8,
      sourceModule: MODULE,
      expiresAt: expiresEndOfMonthIso(today),
    });
  }

  for (const r of input.udhari) {
    if (r.isDeleted === 1 || r.userId !== input.userId) continue;
    if (r.type !== "receivable") continue;
    if (r.status !== "open" && r.status !== "partial") continue;
    const gross = udhariAmountPaise(r);
    const settled = udhariSettledPaise(r);
    const open = gross - settled;
    if (open <= 0) continue;
    const anchor = parseISO(r.dueDate ?? r.givenDate);
    const days = Math.max(0, differenceInCalendarDays(today, anchor));
    const calc: Record<string, unknown> = {
      udhariId: r.id,
      personName: r.personName,
      openBalancePaise: open,
      anchorDate: r.dueDate ?? r.givenDate,
      daysSinceAnchor: days,
    };
    const title = `Collect — ${r.personName}`;
    const reason = `${r.personName} still owes about ${formatMoney(open)}; it has been ${days} day(s) since ${r.dueDate ? "the due date" : "you lent this amount"}.`;
    out.push({
      dedupeKey: `udhari:${r.id}:${mk}`,
      suggestionType: "udhari",
      severity: days >= 14 ? "warning" : "info",
      title,
      reason,
      calculationInputsJson: calc,
      recommendedAction: "Send a polite reminder and log any partial settlement against this entry.",
      expectedImpactJson: { receivableOpenPaise: open },
      confidenceScore: 0.88,
      sourceModule: MODULE,
      expiresAt: expiresEndOfMonthIso(today),
    });
  }

  const monthTx = filterByMonth(txs, y, m);
  for (const rule of input.recurringRules) {
    if (rule.isDeleted === 1 || rule.userId !== input.userId || rule.active !== 1) continue;
    if (rule.frequency !== "monthly" || rule.type !== "expense") continue;
    if (!rule.categoryId) continue;
    const expected =
      rule.amountPaise != null && Number.isFinite(rule.amountPaise)
        ? Math.round(rule.amountPaise)
        : rupeesToPaise(rule.amount);
    if (expected <= 0) continue;
    const hits = monthTx.filter(
      (t) =>
        t.type === "expense" &&
        t.categoryId === rule.categoryId &&
        Math.abs(transactionAmountPaise(t) - expected) / expected <= 0.12,
    );
    if (hits.length < 3) continue;
    const calc: Record<string, unknown> = {
      recurringRuleId: rule.id,
      ruleTitle: rule.title,
      categoryId: rule.categoryId,
      expectedAmountPaise: expected,
      matchingDebitCount: hits.length,
      month: mk,
    };
    const cat = categoryName(input.categories, rule.categoryId);
    out.push({
      dedupeKey: `subscription:${rule.id}:${mk}`,
      suggestionType: "subscription",
      severity: "opportunity",
      title: `Recurring — ${rule.title}`,
      reason: `You recorded ${hits.length} similar debits this month for “${rule.title}” (${cat}), close to the recurring amount of ${formatMoney(expected)} — confirm this is intentional and not a double charge.`,
      calculationInputsJson: calc,
      recommendedAction: "Review merchant statements; cancel unused subscriptions or merge duplicate rules.",
      expectedImpactJson: { duplicateDebitSignals: hits.length },
      confidenceScore: 0.55,
      sourceModule: MODULE,
      expiresAt: expiresEndOfMonthIso(today),
    });
  }

  const taxWindowFrom = subDays(today, 120);
  let taxCount = 0;
  for (const t of txs) {
    if (taxCount >= 5) break;
    if (t.type !== "expense") continue;
    if (parseISO(t.date) < taxWindowFrom) continue;
    if (t.businessOrPersonal !== "business") continue;
    if (t.billAvailable === 1) continue;
    const calc: Record<string, unknown> = {
      transactionId: t.id,
      date: t.date,
      amountPaise: transactionAmountPaise(t),
      businessOrPersonal: t.businessOrPersonal,
      billAvailable: t.billAvailable,
    };
    out.push({
      dedupeKey: `tax:txn:${t.id}`,
      suggestionType: "missing_bill",
      severity: "warning",
      title: "Business expense missing bill",
      reason: `A business-tagged expense on ${t.date.slice(0, 10)} for ${formatMoney(transactionAmountPaise(t))} has no bill/invoice attached — this weakens audit evidence.`,
      calculationInputsJson: calc,
      recommendedAction: "Attach the GST invoice or receipt before filing returns.",
      expectedImpactJson: { complianceRisk: "missing_bill" },
      confidenceScore: 0.72,
      sourceModule: MODULE,
      expiresAt: expiresEndOfMonthIso(today),
    });
    taxCount += 1;
  }

  const recentExp = txs.filter(
    (t) =>
      t.type === "expense" &&
      parseISO(t.date) >= subDays(today, 30) &&
      transactionAmountPaise(t) > 0,
  );
  const amounts = recentExp.map((t) => transactionAmountPaise(t));
  const med = median(amounts);
  if (med > 0 && amounts.length >= 8) {
    let spikeT = recentExp[0]!;
    let spikeAmt = transactionAmountPaise(spikeT);
    for (const t of recentExp) {
      const a = transactionAmountPaise(t);
      if (a > spikeAmt) {
        spikeT = t;
        spikeAmt = a;
      }
    }
    if (spikeAmt >= med * 5 && spikeAmt >= 2_500_000) {
      const calc: Record<string, unknown> = {
        transactionId: spikeT.id,
        date: spikeT.date,
        amountPaise: spikeAmt,
        medianExpensePaise30d: Math.round(med),
        ratioToMedian: Math.round((spikeAmt / med) * 100) / 100,
      };
      out.push({
        dedupeKey: `fraud:spike:${spikeT.id}`,
        suggestionType: "cashflow",
        severity: "warning",
        title: "Unusually large expense",
        reason: `Largest expense in the last 30 days is ${formatMoney(spikeAmt)} on ${spikeT.date.slice(0, 10)}, about ${Math.round(spikeAmt / med)}× your typical day-to-day spend — verify it was you.`,
        calculationInputsJson: calc,
        recommendedAction: "Confirm merchant, card, and category; dispute if unrecognized.",
        expectedImpactJson: { reviewRecommended: true },
        confidenceScore: 0.5,
        sourceModule: MODULE,
        expiresAt: expiresEndOfMonthIso(today),
      });
    }
  }

  if (survival.safeDailyCorePaise < 10_000 && survival.disposableCorePaise < 50_000) {
    const calc: Record<string, unknown> = {
      safeDailyCorePaise: survival.safeDailyCorePaise,
      disposableCorePaise: survival.disposableCorePaise,
      cashAvailablePaise: survival.cashAvailablePaise,
    };
    out.push({
      dedupeKey: `emergency:buffer:${mk}`,
      suggestionType: "emergency_fund",
      severity: "danger",
      title: "Emergency buffer looks thin",
      reason: `Core safe daily spend is only about ${formatMoney(survival.safeDailyCorePaise)}/day with limited dated-bill headroom (${formatMoney(survival.disposableCorePaise)} total in-window).`,
      calculationInputsJson: calc,
      recommendedAction: "Prioritize essentials, defer discretionary purchases, and schedule inflows or bill shifts if possible.",
      expectedImpactJson: { liquidityStress: "high" },
      confidenceScore: 0.68,
      sourceModule: MODULE,
      expiresAt: expiresEndOfMonthIso(today),
    });
  }

  return out.map(draft);
}
