/**
 * Phase 7 — Credit-card intelligence from ledger effects + transaction fallbacks.
 */

import { addMonths, addDays, parseISO } from "date-fns";
import type { Card, FinancialEffect, Transaction, UserCreditCardShadow } from "@/types";
import { cardCreditLimitPaise, transactionAmountPaise } from "@/utils/money";
import { sumBy } from "@/lib/utils";

export type CardRiskLevel = "safe" | "watch" | "risky" | "danger" | "over_limit";

export interface StatementWindow {
  /** Inclusive start of billing cycle (post previous statement). */
  cycleStart: Date;
  /** Statement close date for this cycle. */
  cycleEnd: Date;
  lastStatementDate: Date;
}

export function filterCardLiabilityEffects(
  effects: FinancialEffect[],
  cardId: string,
  userId?: string,
): FinancialEffect[] {
  return effects.filter(
    (e) =>
      e.targetType === "credit_card" &&
      e.targetId === cardId &&
      e.component === "liability" &&
      (!userId || e.userId === userId),
  );
}

/** Net card liability from posted ledger effects (negative = credit balance). */
export function calculateCardNetLiability(
  cardId: string,
  effects: FinancialEffect[],
  userId?: string,
): number {
  let bal = 0;
  for (const e of filterCardLiabilityEffects(effects, cardId, userId)) {
    if (e.effectDirection === "increase") bal += e.amountPaise;
    else bal -= e.amountPaise;
  }
  return bal;
}

/** Outstanding liability only (0 when overpaid). */
export function calculateCardOutstanding(cardId: string, effects: FinancialEffect[], userId?: string): number {
  return Math.max(0, calculateCardNetLiability(cardId, effects, userId));
}

/** Credit balance when net liability is negative (overpayment). */
export function calculateCardCreditBalance(
  cardId: string,
  effects: FinancialEffect[],
  userId?: string,
): number {
  const net = calculateCardNetLiability(cardId, effects, userId);
  return net < 0 ? -net : 0;
}

/** Legacy outstanding from linked transactions when no effects exist yet. */
export function calculateCardOutstandingFromTransactions(card: Card, txs: Transaction[]): number {
  const related = txs.filter(
    (t) => t.isDeleted !== 1 && t.userId === card.userId && t.linkedCardId === card.id,
  );
  const charges = sumBy(
    related.filter((t) => t.type === "expense"),
    (t) => transactionAmountPaise(t),
  );
  const refunds = sumBy(
    related.filter((t) => t.type === "refund" && t.paymentMode === "credit_card"),
    (t) => transactionAmountPaise(t),
  );
  const paid = sumBy(
    related.filter((t) => t.type === "cc_payment"),
    (t) => transactionAmountPaise(t),
  );
  return Math.max(0, charges - refunds - paid);
}

export function resolveCardOutstandingPaise(
  card: Card,
  txs: Transaction[],
  effects: FinancialEffect[],
  shadow?: UserCreditCardShadow | null,
): { outstandingPaise: number; source: "effects" | "shadow" | "transactions" } {
  const fx = filterCardLiabilityEffects(effects, card.id, card.userId);
  if (fx.length > 0) {
    return { outstandingPaise: calculateCardOutstanding(card.id, effects, card.userId), source: "effects" };
  }
  if (shadow && shadow.userId === card.userId && shadow.id === card.id && shadow.isActive === 1) {
    return { outstandingPaise: Math.max(0, shadow.currentOutstandingPaise), source: "shadow" };
  }
  return {
    outstandingPaise: calculateCardOutstandingFromTransactions(card, txs),
    source: "transactions",
  };
}

export function calculateAvailableLimit(card: Card, outstandingPaise: number): number {
  const lim = cardCreditLimitPaise(card);
  return Math.max(0, lim - outstandingPaise);
}

/**
 * Shared-limit facility: one pool, never sum of per-card limits.
 * available = max(0, groupTotalLimit - sum(outstanding of members in group))
 */
export function calculateSharedLimitAvailablePaise(input: {
  groupTotalLimitPaise: number;
  memberOutstandingPaise: number[];
}): number {
  const used = input.memberOutstandingPaise.reduce((s, v) => s + Math.max(0, v), 0);
  return Math.max(0, input.groupTotalLimitPaise - used);
}

/** Utilization as percentage (0–100+ when over limit). */
export function calculateUtilization(card: Card, outstandingPaise: number): number {
  const lim = cardCreditLimitPaise(card);
  if (lim <= 0) return 0;
  return (100 * outstandingPaise) / lim;
}

export function lastStatementDateForCard(card: Card, today: Date): Date {
  const statementDay = card.statementDay ?? 1;
  const thisMonthStatement = new Date(today.getFullYear(), today.getMonth(), statementDay);
  if (today.getDate() > statementDay) {
    return thisMonthStatement;
  }
  return new Date(today.getFullYear(), today.getMonth() - 1, statementDay);
}

export function calculateStatementWindow(card: Card, today: Date): StatementWindow {
  const lastStatementDate = lastStatementDateForCard(card, today);
  const prevStatement = addMonths(lastStatementDate, -1);
  const cycleStart = addDays(prevStatement, 1);
  const cycleEnd = lastStatementDate;
  return { cycleStart, cycleEnd, lastStatementDate };
}

export function calculateNextDueDate(card: Card, today: Date): Date | null {
  const lastStatementDate = lastStatementDateForCard(card, today);
  const dueDay = card.dueDay ?? 15;
  const dueThisCycle = new Date(
    lastStatementDate.getFullYear(),
    lastStatementDate.getMonth(),
    dueDay,
  );
  if (dueThisCycle >= lastStatementDate) {
    return dueThisCycle;
  }
  return addMonths(dueThisCycle, 1);
}

/** Minimum due heuristic: max(₹500, 5% of statement balance), capped at statement. */
export function calculateMinimumDue(statementBalancePaise: number): number {
  if (statementBalancePaise <= 0) return 0;
  const floor = 50_000; // ₹500
  const pct = Math.round(statementBalancePaise * 0.05);
  return Math.min(statementBalancePaise, Math.max(floor, pct));
}

export function calculateCardRisk(card: Card, outstandingPaise: number): CardRiskLevel {
  const lim = cardCreditLimitPaise(card);
  if (lim > 0 && outstandingPaise > lim) return "over_limit";
  const u = calculateUtilization(card, outstandingPaise);
  if (u >= 80) return "danger";
  if (u >= 50) return "risky";
  if (u >= 30) return "watch";
  return "safe";
}

export interface CreditCardIntel {
  outstandingPaise: number;
  creditBalancePaise: number;
  netLiabilityPaise: number;
  outstandingSource: "effects" | "shadow" | "transactions";
  sourceWarning: string | null;
  limitPaise: number;
  availablePaise: number;
  utilizationPct: number;
  unbilledPaise: number;
  statementBalancePaise: number;
  minimumDuePaise: number;
  fullDuePaise: number;
  lastStatementDateIso: string;
  nextDueDateIso: string | null;
  risk: CardRiskLevel;
  payBelow80Paise: number;
  payBelow50Paise: number;
  payBelow30Paise: number;
  minimumDueWarning: string | null;
  statementPeriodLabel: string;
}

function formatShort(d: Date): string {
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export function buildCreditCardIntel(
  card: Card,
  txs: Transaction[],
  effects: FinancialEffect[],
  today = new Date(),
  shadow?: UserCreditCardShadow | null,
): CreditCardIntel | null {
  if (card.type !== "credit") return null;

  const { outstandingPaise, source } = resolveCardOutstandingPaise(card, txs, effects, shadow);
  const netLiabilityPaise =
    filterCardLiabilityEffects(effects, card.id, card.userId).length > 0
      ? calculateCardNetLiability(card.id, effects, card.userId)
      : outstandingPaise;
  const creditBalancePaise = netLiabilityPaise < 0 ? -netLiabilityPaise : 0;
  const limitPaise = cardCreditLimitPaise(card);
  const availablePaise = calculateAvailableLimit(card, outstandingPaise);
  const utilizationPct = calculateUtilization(card, outstandingPaise);
  const risk = calculateCardRisk(card, outstandingPaise);

  const related = txs.filter(
    (t) => t.isDeleted !== 1 && t.userId === card.userId && t.linkedCardId === card.id,
  );

  const lastStatementDate = lastStatementDateForCard(card, today);
  const lastStatementDateIso = lastStatementDate.toISOString();
  const { cycleStart, cycleEnd } = calculateStatementWindow(card, today);

  const statementCharges = sumBy(
    related.filter((t) => {
      const d = parseISO(t.date);
      return t.type === "expense" && d <= lastStatementDate;
    }),
    (t) => transactionAmountPaise(t),
  );
  const statementRefunds = sumBy(
    related.filter((t) => {
      const d = parseISO(t.date);
      return t.type === "refund" && t.paymentMode === "credit_card" && d <= lastStatementDate;
    }),
    (t) => transactionAmountPaise(t),
  );
  const statementPayments = sumBy(
    related.filter((t) => {
      const d = parseISO(t.date);
      return t.type === "cc_payment" && d <= lastStatementDate;
    }),
    (t) => transactionAmountPaise(t),
  );
  const statementBalancePaise = Math.max(0, statementCharges - statementRefunds - statementPayments);

  const unbilledPaise = sumBy(
    related.filter((t) => {
      if (t.type !== "expense" && !(t.type === "refund" && t.paymentMode === "credit_card")) return false;
      const d = parseISO(t.date);
      return d > lastStatementDate;
    }),
    (t) => (t.type === "refund" ? -transactionAmountPaise(t) : transactionAmountPaise(t)),
  );

  const nextDue = calculateNextDueDate(card, today);
  const minimumDuePaise = calculateMinimumDue(statementBalancePaise);
  const fullDuePaise = statementBalancePaise;

  const statementPeriodLabel = `Statement cycle ${formatShort(cycleStart)} – ${formatShort(cycleEnd)}`;

  return {
    outstandingPaise,
    creditBalancePaise,
    netLiabilityPaise,
    outstandingSource: source,
    sourceWarning:
      source === "transactions"
        ? "Calculated from legacy transactions. Please repair missing card links."
        : null,
    limitPaise,
    availablePaise,
    utilizationPct,
    unbilledPaise,
    statementBalancePaise,
    minimumDuePaise,
    fullDuePaise,
    lastStatementDateIso,
    nextDueDateIso: nextDue ? nextDue.toISOString() : null,
    risk,
    payBelow80Paise: calculatePaymentToReachUtilization(card, outstandingPaise, 80),
    payBelow50Paise: calculatePaymentToReachUtilization(card, outstandingPaise, 50),
    payBelow30Paise: calculatePaymentToReachUtilization(card, outstandingPaise, 30),
    minimumDueWarning:
      minimumDuePaise > 0 && minimumDuePaise < fullDuePaise
        ? "Minimum due avoids late fee but interest may apply on remaining balance."
        : null,
    statementPeriodLabel,
  };
}

export function calculatePaymentToReachUtilization(
  card: Card,
  outstandingPaise: number,
  targetPct: 80 | 50 | 30,
): number {
  const limitPaise = cardCreditLimitPaise(card);
  if (limitPaise <= 0) return 0;
  const targetOutstanding = Math.floor((limitPaise * targetPct) / 100);
  return Math.max(0, outstandingPaise - targetOutstanding);
}

/** Expenses marked credit_card but missing linkedCardId (repair queue). */
export function findOrphanCreditCardExpenses(txs: Transaction[], userId: string): Transaction[] {
  return txs.filter(
    (t) =>
      t.userId === userId &&
      t.isDeleted !== 1 &&
      t.type === "expense" &&
      t.paymentMode === "credit_card" &&
      (!t.linkedCardId || String(t.linkedCardId).trim() === ""),
  );
}

export interface CardRepairIssue {
  id: string;
  kind:
    | "credit_expense_missing_card"
    | "card_payment_missing_card"
    | "card_invalid_limit"
    | "card_missing_due_day";
  severity: "high" | "medium";
  label: string;
  transaction?: Transaction;
  card?: Card;
}

export function buildCardRepairQueue(
  cards: Card[],
  txs: Transaction[],
  userId: string,
): CardRepairIssue[] {
  const issues: CardRepairIssue[] = [];
  for (const t of txs) {
    if (t.userId !== userId || t.isDeleted === 1) continue;
    const isLegacyReviewed =
      (t.tags ?? []).includes("legacy_manual_card_reviewed") ||
      (t.notes ?? "").includes("legacy/manual card reviewed");
    if (isLegacyReviewed) continue;
    if (t.type === "expense" && t.paymentMode === "credit_card" && !t.linkedCardId) {
      issues.push({
        id: `tx:${t.id}:missing-card`,
        kind: "credit_expense_missing_card",
        severity: "high",
        label: "Credit-card expense missing card",
        transaction: t,
      });
    }
    if (t.type === "cc_payment" && !t.linkedCardId) {
      issues.push({
        id: `tx:${t.id}:payment-missing-card`,
        kind: "card_payment_missing_card",
        severity: "high",
        label: "Card payment missing card",
        transaction: t,
      });
    }
  }
  for (const c of cards) {
    if (c.userId !== userId || c.type !== "credit" || c.isDeleted === 1) continue;
    if (cardCreditLimitPaise(c) <= 0) {
      issues.push({
        id: `card:${c.id}:invalid-limit`,
        kind: "card_invalid_limit",
        severity: "high",
        label: "Credit card has invalid limit",
        card: c,
      });
    }
    if (!c.dueDay || c.dueDay < 1 || c.dueDay > 31) {
      issues.push({
        id: `card:${c.id}:missing-due-day`,
        kind: "card_missing_due_day",
        severity: "medium",
        label: "Credit card due day missing",
        card: c,
      });
    }
  }
  return issues;
}
