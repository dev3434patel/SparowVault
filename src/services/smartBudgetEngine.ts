/**
 * Phase 10 — Smart budgets: time-aware pace, recurring-aware projection, variable burn.
 */

import {
  differenceInCalendarDays,
  endOfMonth,
  parseISO,
  startOfMonth,
} from "date-fns";
import type { Budget, RecurringRule, Transaction } from "@/types";
import {
  budgetStatuses,
  filterByMonth,
  type BudgetStatus,
} from "@/services/calculations";
import { rupeesToPaise, transactionAmountPaise } from "@/utils/money";

function recurringRuleAmountPaise(r: RecurringRule): number {
  if (r.amountPaise != null && Number.isFinite(r.amountPaise)) return Math.round(r.amountPaise);
  return rupeesToPaise(r.amount);
}

/** Expense-like recurring types that behave as fixed monthly bills. */
const FIXED_RECURRING_TYPES = new Set<string>(["expense", "emi_payment", "cc_payment"]);

function isPaidRecurringThisMonth(
  rule: RecurringRule,
  monthTx: Transaction[],
  tolerance = 0.12,
): boolean {
  if (!rule.categoryId) return false;
  const expected = recurringRuleAmountPaise(rule);
  if (expected <= 0) return false;
  const hits = monthTx.filter(
    (t) =>
      t.type === "expense" &&
      t.categoryId === rule.categoryId &&
      Math.abs(transactionAmountPaise(t) - expected) / expected <= tolerance,
  );
  return hits.length > 0;
}

function fixedRecurringPaidForCategory(
  categoryId: string,
  rules: RecurringRule[],
  monthTx: Transaction[],
  today: Date,
): number {
  let credited = 0;
  for (const r of rules) {
    if (r.active !== 1) continue;
    if (r.frequency !== "monthly") continue;
    if (!FIXED_RECURRING_TYPES.has(r.type)) continue;
    if (r.categoryId !== categoryId) continue;
    const amt = recurringRuleAmountPaise(r);
    if (amt <= 0) continue;
    if (isPaidRecurringThisMonth(r, monthTx)) {
      credited += amt;
    } else if (r.dayOfMonth != null && r.dayOfMonth <= today.getDate()) {
      const catSpent = monthTx
        .filter((t) => t.type === "expense" && t.categoryId === categoryId)
        .reduce((a, t) => a + transactionAmountPaise(t), 0);
      credited += Math.min(amt, catSpent);
    }
  }
  return credited;
}

function variableDailyAveragePaise(
  txs: Transaction[],
  categoryId: string,
  from: Date,
  to: Date,
): number {
  const fromMs = from.getTime();
  const toMs = to.getTime();
  const slice = txs.filter((t) => {
    const d = parseISO(t.date).getTime();
    return (
      d >= fromMs &&
      d <= toMs &&
      t.type === "expense" &&
      t.categoryId === categoryId &&
      t.isDeleted !== 1
    );
  });
  const sum = slice.reduce((a, t) => a + transactionAmountPaise(t), 0);
  const days = Math.max(1, differenceInCalendarDays(to, from) + 1);
  return sum / days;
}

export type SmartBurnRisk = "ok" | "watch" | "high";

export interface SmartBudgetStatus extends BudgetStatus {
  dayProgressPct: number;
  usageVsTimeRatio: number;
  fixedRecurringCreditedPaise: number;
  variableSpentPaise: number;
  variableDailyAvgPaise: number;
  plannedSpentPaise: number;
  unplannedSpentPaise: number;
  adjustedMonthEndProjectedPaise: number;
  burnRisk: SmartBurnRisk;
}

export function smartBudgetStatuses(
  budgets: Budget[],
  txs: Transaction[],
  recurringRules: RecurringRule[],
  today = new Date(),
): SmartBudgetStatus[] {
  const base = budgetStatuses(budgets, txs, today);
  const start = startOfMonth(today);
  const end = endOfMonth(today);
  const totalDays = Math.max(1, differenceInCalendarDays(end, start) + 1);
  const dayIdx = Math.min(totalDays, differenceInCalendarDays(today, start) + 1);
  const dayProgressPct = (dayIdx / totalDays) * 100;
  const rollingFrom = new Date(today);
  rollingFrom.setDate(rollingFrom.getDate() - 13);

  return base.map((row) => {
    const b = row.budget;
    let monthTx: Transaction[];
    if (b.period === "monthly") {
      monthTx = filterByMonth(txs, b.year, b.month ?? today.getMonth() + 1).filter(
        (t) => t.isDeleted !== 1,
      );
    } else {
      monthTx = txs.filter(
        (t) => parseISO(t.date).getFullYear() === b.year && t.isDeleted !== 1,
      );
    }
    const fixedRecurringCreditedPaise = fixedRecurringPaidForCategory(
      b.categoryId,
      recurringRules,
      monthTx,
      today,
    );
    const variableSpentPaise = Math.max(0, row.spentPaise - fixedRecurringCreditedPaise);
    const plannedSpentPaise = monthTx
      .filter(
        (t) =>
          t.type === "expense" &&
          t.categoryId === b.categoryId &&
          t.plannedUnplanned === "planned",
      )
      .reduce((a, t) => a + transactionAmountPaise(t), 0);
    const unplannedSpentPaise = monthTx
      .filter(
        (t) =>
          t.type === "expense" &&
          t.categoryId === b.categoryId &&
          t.plannedUnplanned === "unplanned",
      )
      .reduce((a, t) => a + transactionAmountPaise(t), 0);
    const variableDailyAvgPaise = variableDailyAveragePaise(
      txs,
      b.categoryId,
      rollingFrom,
      today,
    );
    const daysLeft = Math.max(0, totalDays - dayIdx);
    const variableDailyInMonth = dayIdx > 0 ? variableSpentPaise / dayIdx : variableDailyAvgPaise;
    const adjustedMonthEndProjectedPaise = Math.round(
      row.spentPaise + variableDailyInMonth * daysLeft,
    );

    const usageVsTimeRatio = dayProgressPct > 0 ? row.percentUsed / dayProgressPct : row.percentUsed;
    const cap = row.spentPaise + row.remainingPaise;
    const adjustedProjectedPercent = cap > 0 ? (adjustedMonthEndProjectedPaise / cap) * 100 : 0;

    let burnRisk: SmartBurnRisk = "ok";
    if (row.level === "over" || adjustedMonthEndProjectedPaise > cap) burnRisk = "high";
    else if (
      adjustedProjectedPercent >= 85 ||
      (usageVsTimeRatio >= 1.1 && variableSpentPaise > 0 && adjustedProjectedPercent >= 80)
    ) {
      burnRisk = "watch";
    }

    return {
      ...row,
      dayProgressPct,
      usageVsTimeRatio,
      fixedRecurringCreditedPaise,
      variableSpentPaise,
      variableDailyAvgPaise,
      plannedSpentPaise,
      unplannedSpentPaise,
      adjustedMonthEndProjectedPaise,
      burnRisk,
    };
  });
}
