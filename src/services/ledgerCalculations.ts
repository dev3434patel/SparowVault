/**
 * Phase 5 — Ledger-based views (effects are source of truth).
 * Falls back to empty aggregates when no effects are provided.
 */

import { parseISO } from "date-fns";
import type { FinancialEffect, FinancialEvent } from "@/types";

function inMonth(isoDate: string, year: number, month1to12: number): boolean {
  try {
    const d = parseISO(isoDate);
    return d.getFullYear() === year && d.getMonth() === month1to12 - 1;
  } catch {
    return false;
  }
}

function eventIdsForMonth(
  events: FinancialEvent[],
  year: number,
  month1to12: number,
): Set<string> {
  const ids = new Set<string>();
  for (const ev of events) {
    if (ev.deletedAt) continue;
    if (inMonth(ev.eventDate, year, month1to12)) ids.add(ev.id);
  }
  return ids;
}

function filterEffectsForMonth(
  events: FinancialEvent[],
  effects: FinancialEffect[],
  year: number,
  month1to12: number,
): FinancialEffect[] {
  const ids = eventIdsForMonth(events, year, month1to12);
  return effects.filter((e) => ids.has(e.eventId));
}

/** P&L-style expense: expense_category with expense or interest components. */
export function calculateExpenseView(
  events: FinancialEvent[],
  effects: FinancialEffect[],
  year: number,
  month1to12: number,
): number {
  const slice = filterEffectsForMonth(events, effects, year, month1to12);
  let sum = 0;
  for (const e of slice) {
    if (e.targetType !== "expense_category") continue;
    if (
      e.component === "expense" ||
      e.component === "interest" ||
      e.component === "fee" ||
      e.component === "penalty" ||
      e.component === "tax"
    ) {
      sum += e.effectDirection === "increase" ? e.amountPaise : -e.amountPaise;
    }
  }
  return sum;
}

/** P&L-style income: income_category with income component. */
export function calculateIncomeView(
  events: FinancialEvent[],
  effects: FinancialEffect[],
  year: number,
  month1to12: number,
): number {
  const slice = filterEffectsForMonth(events, effects, year, month1to12);
  let sum = 0;
  for (const e of slice) {
    if (e.targetType !== "income_category") continue;
    if (e.component === "income") sum += e.amountPaise;
  }
  return sum;
}

export function hasUsableLedger(
  events: FinancialEvent[] = [],
  effects: FinancialEffect[] = [],
): boolean {
  return events.some((e) => !e.deletedAt) && effects.length > 0;
}

export function calculateLedgerMonthKpis(
  events: FinancialEvent[],
  effects: FinancialEffect[],
  year: number,
  month1to12: number,
): {
  incomePaise: number;
  expensePaise: number;
  netPaise: number;
  source: "ledger" | "empty_ledger";
} {
  const incomePaise = calculateIncomeView(events, effects, year, month1to12);
  const expensePaise = calculateExpenseView(events, effects, year, month1to12);
  return {
    incomePaise,
    expensePaise,
    netPaise: incomePaise - expensePaise,
    source: hasUsableLedger(events, effects) ? "ledger" : "empty_ledger",
  };
}

/** Cash movement on accounts (cash component). */
export function calculateCashflowView(
  events: FinancialEvent[],
  effects: FinancialEffect[],
  year: number,
  month1to12: number,
): { inflowPaise: number; outflowPaise: number } {
  const slice = filterEffectsForMonth(events, effects, year, month1to12);
  let inflow = 0;
  let outflow = 0;
  for (const e of slice) {
    if (e.targetType !== "account" || e.component !== "cash") continue;
    if (e.effectDirection === "increase") inflow += e.amountPaise;
    else outflow += e.amountPaise;
  }
  return { inflowPaise: inflow, outflowPaise: outflow };
}

/** Simplified net worth delta from ledger effects (not opening balances). */
export function calculateNetWorthView(effects: FinancialEffect[]): number {
  let nw = 0;
  for (const e of effects) {
    if (e.targetType === "account" && e.component === "cash") {
      nw += e.effectDirection === "increase" ? e.amountPaise : -e.amountPaise;
    } else if (e.targetType === "credit_card" && e.component === "liability") {
      nw -= e.effectDirection === "increase" ? e.amountPaise : -e.amountPaise;
    } else if (e.targetType === "loan" && e.component === "principal") {
      nw -= e.effectDirection === "increase" ? e.amountPaise : -e.amountPaise;
    } else if (e.targetType === "goal" && e.component === "asset") {
      nw += e.effectDirection === "increase" ? e.amountPaise : -e.amountPaise;
    } else if (e.targetType === "investment" && e.component === "asset") {
      nw += e.effectDirection === "increase" ? e.amountPaise : -e.amountPaise;
    } else if (e.targetType === "udhari_person") {
      if (e.component === "receivable") {
        nw += e.effectDirection === "increase" ? e.amountPaise : -e.amountPaise;
      } else if (e.component === "payable") {
        nw -= e.effectDirection === "increase" ? e.amountPaise : -e.amountPaise;
      }
    }
  }
  return nw;
}

export function calculateDebtView(effects: FinancialEffect[]): {
  cardLiabilityPaise: number;
  loanPrincipalPaise: number;
} {
  let card = 0;
  let loan = 0;
  for (const e of effects) {
    if (e.targetType === "credit_card" && e.component === "liability") {
      card += e.effectDirection === "increase" ? e.amountPaise : -e.amountPaise;
    }
    if (e.targetType === "loan" && e.component === "principal") {
      loan += e.effectDirection === "increase" ? e.amountPaise : -e.amountPaise;
    }
  }
  return { cardLiabilityPaise: Math.max(0, card), loanPrincipalPaise: Math.max(0, loan) };
}

export function calculateReceivablesPayables(effects: FinancialEffect[]): {
  receivablePaise: number;
  payablePaise: number;
} {
  let rec = 0;
  let pay = 0;
  for (const e of effects) {
    if (e.targetType !== "udhari_person") continue;
    if (e.component === "receivable") {
      rec += e.effectDirection === "increase" ? e.amountPaise : -e.amountPaise;
    }
    if (e.component === "payable") {
      pay += e.effectDirection === "increase" ? e.amountPaise : -e.amountPaise;
    }
  }
  return { receivablePaise: Math.max(0, rec), payablePaise: Math.max(0, pay) };
}

export function calculateCategorySpend(
  events: FinancialEvent[],
  effects: FinancialEffect[],
  categoryId: string,
  year: number,
  month1to12: number,
): number {
  const slice = filterEffectsForMonth(events, effects, year, month1to12);
  let sum = 0;
  for (const e of slice) {
    if (e.targetType !== "expense_category" || e.targetId !== categoryId) continue;
    if (
      e.component === "expense" ||
      e.component === "interest" ||
      e.component === "fee" ||
      e.component === "penalty" ||
      e.component === "tax"
    ) {
      sum += e.effectDirection === "increase" ? e.amountPaise : -e.amountPaise;
    }
  }
  return sum;
}

/** Financing charges posted to P&L (interest, fees, penalties, taxes). */
export function calculateFinancingCostView(
  events: FinancialEvent[],
  effects: FinancialEffect[],
  year: number,
  month1to12: number,
): number {
  const slice = filterEffectsForMonth(events, effects, year, month1to12);
  let sum = 0;
  for (const e of slice) {
    if (e.targetType !== "expense_category") continue;
    if (
      e.component === "interest" ||
      e.component === "fee" ||
      e.component === "penalty" ||
      e.component === "tax"
    ) {
      sum += e.amountPaise;
    }
  }
  return sum;
}

/** Loan/card principal repaid in period (wealth rebuilding, not consumption). */
export function calculateDebtPrincipalRepaidView(
  events: FinancialEvent[],
  effects: FinancialEffect[],
  year: number,
  month1to12: number,
): number {
  const slice = filterEffectsForMonth(events, effects, year, month1to12);
  let sum = 0;
  for (const e of slice) {
    if (e.component !== "principal") continue;
    if (e.targetType !== "loan" && e.targetType !== "credit_card") continue;
    if (e.effectDirection === "decrease") sum += e.amountPaise;
  }
  return sum;
}

/** Net liquid change on bank/cash accounts in period. */
export function calculateNetLiquidChangeView(
  events: FinancialEvent[],
  effects: FinancialEffect[],
  year: number,
  month1to12: number,
): number {
  const { inflowPaise, outflowPaise } = calculateCashflowView(events, effects, year, month1to12);
  return inflowPaise - outflowPaise;
}
