/**
 * Normalize cloud / Dexie entities for Phase 3 paise fields.
 * Pull: fill missing *Paise from legacy rupee fields.
 * Push: ensure *Paise set and sync legacy rupee mirrors for old clients.
 */

import type { CloudCollectionKey } from "@/lib/cloud/collections";
import { paiseToRupees, rupeesToPaise } from "@/utils/money";

export type MoneyNormalizeDirection = "pull" | "push";

function roundRupeeMirror(paise: number): number {
  return paiseToRupees(paise);
}

/** Merge paise from legacy when paise missing */
function pullTransactions(row: Record<string, unknown>): void {
  if (row.amountPaise == null || !Number.isInteger(row.amountPaise)) {
    row.amountPaise = rupeesToPaise(row.amount);
  }
}

function pushTransactions(row: Record<string, unknown>): void {
  const p =
    row.amountPaise != null && Number.isInteger(row.amountPaise)
      ? (row.amountPaise as number)
      : rupeesToPaise(row.amount);
  row.amountPaise = p;
  row.amount = roundRupeeMirror(p);
}

function pullAccounts(row: Record<string, unknown>): void {
  if (row.openingBalancePaise == null || !Number.isInteger(row.openingBalancePaise)) {
    row.openingBalancePaise = rupeesToPaise(row.openingBalance);
  }
}

function pushAccounts(row: Record<string, unknown>): void {
  const p =
    row.openingBalancePaise != null && Number.isInteger(row.openingBalancePaise)
      ? (row.openingBalancePaise as number)
      : rupeesToPaise(row.openingBalance);
  row.openingBalancePaise = p;
  row.openingBalance = roundRupeeMirror(p);
}

function pullCards(row: Record<string, unknown>): void {
  if (row.creditLimit != null && (row.creditLimitPaise == null || !Number.isInteger(row.creditLimitPaise))) {
    row.creditLimitPaise = rupeesToPaise(row.creditLimit);
  }
}

function pushCards(row: Record<string, unknown>): void {
  if (row.creditLimitPaise != null && Number.isInteger(row.creditLimitPaise)) {
    const p = row.creditLimitPaise as number;
    row.creditLimit = roundRupeeMirror(p);
  } else if (row.creditLimit != null) {
    const p = rupeesToPaise(row.creditLimit);
    row.creditLimitPaise = p;
    row.creditLimit = roundRupeeMirror(p);
  }
}

function pullBudgets(row: Record<string, unknown>): void {
  if (row.limitPaise == null || !Number.isInteger(row.limitPaise)) {
    row.limitPaise = rupeesToPaise(row.amount);
  }
}

function pushBudgets(row: Record<string, unknown>): void {
  const p =
    row.limitPaise != null && Number.isInteger(row.limitPaise)
      ? (row.limitPaise as number)
      : rupeesToPaise(row.amount);
  row.limitPaise = p;
  row.amount = roundRupeeMirror(p);
}

function pullLoans(row: Record<string, unknown>): void {
  if (row.principalPaise == null || !Number.isInteger(row.principalPaise)) {
    row.principalPaise = rupeesToPaise(row.principal);
  }
  if (row.outstandingPrincipal != null && (row.outstandingPrincipalPaise == null || !Number.isInteger(row.outstandingPrincipalPaise))) {
    row.outstandingPrincipalPaise = rupeesToPaise(row.outstandingPrincipal);
  }
  if (row.emiAmountOverride != null && (row.emiPaise == null || !Number.isInteger(row.emiPaise))) {
    row.emiPaise = rupeesToPaise(row.emiAmountOverride);
  }
}

function pushLoans(row: Record<string, unknown>): void {
  const pp =
    row.principalPaise != null && Number.isInteger(row.principalPaise)
      ? (row.principalPaise as number)
      : rupeesToPaise(row.principal);
  row.principalPaise = pp;
  row.principal = roundRupeeMirror(pp);
  if (row.outstandingPrincipal != null || row.outstandingPrincipalPaise != null) {
    const op =
      row.outstandingPrincipalPaise != null && Number.isInteger(row.outstandingPrincipalPaise)
        ? (row.outstandingPrincipalPaise as number)
        : rupeesToPaise(row.outstandingPrincipal ?? row.principal);
    row.outstandingPrincipalPaise = op;
    row.outstandingPrincipal = roundRupeeMirror(op);
  }
  if (row.emiAmountOverride != null || row.emiPaise != null) {
    const ep =
      row.emiPaise != null && Number.isInteger(row.emiPaise)
        ? (row.emiPaise as number)
        : rupeesToPaise(row.emiAmountOverride ?? 0);
    if (ep > 0) {
      row.emiPaise = ep;
      row.emiAmountOverride = roundRupeeMirror(ep);
    }
  }
}

function pullEmis(row: Record<string, unknown>): void {
  if (row.amountPaise == null || !Number.isInteger(row.amountPaise)) {
    row.amountPaise = rupeesToPaise(row.amountDue);
  }
  if (row.principalComponentPaise == null || !Number.isInteger(row.principalComponentPaise)) {
    row.principalComponentPaise = rupeesToPaise(row.principalComponent);
  }
  if (row.interestComponentPaise == null || !Number.isInteger(row.interestComponentPaise)) {
    row.interestComponentPaise = rupeesToPaise(row.interestComponent);
  }
  if (row.amountPaidPaise == null || !Number.isInteger(row.amountPaidPaise)) {
    row.amountPaidPaise = rupeesToPaise(row.amountPaid);
  }
  if (row.penaltyPaise == null || !Number.isInteger(row.penaltyPaise)) {
    row.penaltyPaise = 0;
  }
  if (row.feePaise == null || !Number.isInteger(row.feePaise)) {
    row.feePaise = 0;
  }
  if (row.extraPrincipalPaise == null || !Number.isInteger(row.extraPrincipalPaise)) {
    row.extraPrincipalPaise = 0;
  }
  if (row.openingPrincipalPaise == null || !Number.isInteger(row.openingPrincipalPaise)) {
    row.openingPrincipalPaise = 0;
  }
  if (row.closingPrincipalPaise == null || !Number.isInteger(row.closingPrincipalPaise)) {
    row.closingPrincipalPaise = 0;
  }
}

function pushEmis(row: Record<string, unknown>): void {
  const due =
    row.amountPaise != null && Number.isInteger(row.amountPaise)
      ? (row.amountPaise as number)
      : rupeesToPaise(row.amountDue);
  row.amountPaise = due;
  row.amountDue = roundRupeeMirror(due);
  const pr =
    row.principalComponentPaise != null && Number.isInteger(row.principalComponentPaise)
      ? (row.principalComponentPaise as number)
      : rupeesToPaise(row.principalComponent);
  row.principalComponentPaise = pr;
  row.principalComponent = roundRupeeMirror(pr);
  const intr =
    row.interestComponentPaise != null && Number.isInteger(row.interestComponentPaise)
      ? (row.interestComponentPaise as number)
      : rupeesToPaise(row.interestComponent);
  row.interestComponentPaise = intr;
  row.interestComponent = roundRupeeMirror(intr);
  const paid =
    row.amountPaidPaise != null && Number.isInteger(row.amountPaidPaise)
      ? (row.amountPaidPaise as number)
      : rupeesToPaise(row.amountPaid);
  row.amountPaidPaise = paid;
  row.amountPaid = roundRupeeMirror(paid);
  const pen =
    row.penaltyPaise != null && Number.isInteger(row.penaltyPaise) ? (row.penaltyPaise as number) : 0;
  row.penaltyPaise = pen;
  const fee =
    row.feePaise != null && Number.isInteger(row.feePaise) ? (row.feePaise as number) : 0;
  row.feePaise = fee;
  const extra =
    row.extraPrincipalPaise != null && Number.isInteger(row.extraPrincipalPaise)
      ? (row.extraPrincipalPaise as number)
      : 0;
  row.extraPrincipalPaise = extra;
  const op =
    row.openingPrincipalPaise != null && Number.isInteger(row.openingPrincipalPaise)
      ? (row.openingPrincipalPaise as number)
      : 0;
  row.openingPrincipalPaise = op;
  const cp =
    row.closingPrincipalPaise != null && Number.isInteger(row.closingPrincipalPaise)
      ? (row.closingPrincipalPaise as number)
      : 0;
  row.closingPrincipalPaise = cp;
}

function pullGoals(row: Record<string, unknown>): void {
  if (row.targetAmountPaise == null || !Number.isInteger(row.targetAmountPaise)) {
    row.targetAmountPaise = rupeesToPaise(row.targetAmount);
  }
  if (row.savedAmountPaise == null || !Number.isInteger(row.savedAmountPaise)) {
    row.savedAmountPaise = rupeesToPaise(row.currentSaved);
  }
}

function pushGoals(row: Record<string, unknown>): void {
  const tp =
    row.targetAmountPaise != null && Number.isInteger(row.targetAmountPaise)
      ? (row.targetAmountPaise as number)
      : rupeesToPaise(row.targetAmount);
  row.targetAmountPaise = tp;
  row.targetAmount = roundRupeeMirror(tp);
  const sp =
    row.savedAmountPaise != null && Number.isInteger(row.savedAmountPaise)
      ? (row.savedAmountPaise as number)
      : rupeesToPaise(row.currentSaved);
  row.savedAmountPaise = sp;
  row.currentSaved = roundRupeeMirror(sp);
}

function pullUdhari(row: Record<string, unknown>): void {
  if (row.amountPaise == null || !Number.isInteger(row.amountPaise)) {
    row.amountPaise = rupeesToPaise(row.amount);
  }
  if (row.amountSettledPaise == null || !Number.isInteger(row.amountSettledPaise)) {
    row.amountSettledPaise = rupeesToPaise(row.amountSettled);
  }
}

function pushUdhari(row: Record<string, unknown>): void {
  const ap =
    row.amountPaise != null && Number.isInteger(row.amountPaise)
      ? (row.amountPaise as number)
      : rupeesToPaise(row.amount);
  row.amountPaise = ap;
  row.amount = roundRupeeMirror(ap);
  const st =
    row.amountSettledPaise != null && Number.isInteger(row.amountSettledPaise)
      ? (row.amountSettledPaise as number)
      : rupeesToPaise(row.amountSettled);
  row.amountSettledPaise = st;
  row.amountSettled = roundRupeeMirror(st);
}

function pullUdhariSettlements(row: Record<string, unknown>): void {
  if (row.amountPaise == null || !Number.isInteger(row.amountPaise)) {
    row.amountPaise = rupeesToPaise(row.amount);
  }
}

function pushUdhariSettlements(row: Record<string, unknown>): void {
  const p =
    row.amountPaise != null && Number.isInteger(row.amountPaise)
      ? (row.amountPaise as number)
      : rupeesToPaise(row.amount);
  row.amountPaise = p;
  row.amount = roundRupeeMirror(p);
}

function pullInvestments(row: Record<string, unknown>): void {
  if (row.amountPaise == null || !Number.isInteger(row.amountPaise)) {
    row.amountPaise = rupeesToPaise(row.monthlyTarget);
  }
  if (row.totalContributedPaise == null || !Number.isInteger(row.totalContributedPaise)) {
    row.totalContributedPaise = rupeesToPaise(row.totalContributed);
  }
}

function pushInvestments(row: Record<string, unknown>): void {
  const mp =
    row.amountPaise != null && Number.isInteger(row.amountPaise)
      ? (row.amountPaise as number)
      : rupeesToPaise(row.monthlyTarget);
  row.amountPaise = mp;
  row.monthlyTarget = roundRupeeMirror(mp);
  const tc =
    row.totalContributedPaise != null && Number.isInteger(row.totalContributedPaise)
      ? (row.totalContributedPaise as number)
      : rupeesToPaise(row.totalContributed);
  row.totalContributedPaise = tc;
  row.totalContributed = roundRupeeMirror(tc);
}

function pullGoalContribs(row: Record<string, unknown>): void {
  if (row.amountPaise == null || !Number.isInteger(row.amountPaise)) {
    row.amountPaise = rupeesToPaise(row.amount);
  }
}

function pushGoalContribs(row: Record<string, unknown>): void {
  const p =
    row.amountPaise != null && Number.isInteger(row.amountPaise)
      ? (row.amountPaise as number)
      : rupeesToPaise(row.amount);
  row.amountPaise = p;
  row.amount = roundRupeeMirror(p);
}

function pullSavingsContribs(row: Record<string, unknown>): void {
  if (row.amountPaise == null || !Number.isInteger(row.amountPaise)) {
    row.amountPaise = rupeesToPaise(row.amount);
  }
}

function pushSavingsContribs(row: Record<string, unknown>): void {
  const p =
    row.amountPaise != null && Number.isInteger(row.amountPaise)
      ? (row.amountPaise as number)
      : rupeesToPaise(row.amount);
  row.amountPaise = p;
  row.amount = roundRupeeMirror(p);
}

function pullRecurring(row: Record<string, unknown>): void {
  if (row.amountPaise == null || !Number.isInteger(row.amountPaise)) {
    row.amountPaise = rupeesToPaise(row.amount);
  }
}

function pushRecurring(row: Record<string, unknown>): void {
  const p =
    row.amountPaise != null && Number.isInteger(row.amountPaise)
      ? (row.amountPaise as number)
      : rupeesToPaise(row.amount);
  row.amountPaise = p;
  row.amount = roundRupeeMirror(p);
}

const PULL: Partial<Record<CloudCollectionKey, (r: Record<string, unknown>) => void>> = {
  transactions: pullTransactions,
  accounts: pullAccounts,
  cards: pullCards,
  budgets: pullBudgets,
  loans: pullLoans,
  emis: pullEmis,
  goals: pullGoals,
  udhari: pullUdhari,
  udhariSettlements: pullUdhariSettlements,
  investments: pullInvestments,
  goalContribs: pullGoalContribs,
  savingsContribs: pullSavingsContribs,
  recurringRules: pullRecurring,
};

const PUSH: Partial<Record<CloudCollectionKey, (r: Record<string, unknown>) => void>> = {
  transactions: pushTransactions,
  accounts: pushAccounts,
  cards: pushCards,
  budgets: pushBudgets,
  loans: pushLoans,
  emis: pushEmis,
  goals: pushGoals,
  udhari: pushUdhari,
  udhariSettlements: pushUdhariSettlements,
  investments: pushInvestments,
  goalContribs: pushGoalContribs,
  savingsContribs: pushSavingsContribs,
  recurringRules: pushRecurring,
};

export function normalizeMoneyEntity(
  collection: CloudCollectionKey,
  row: Record<string, unknown>,
  direction: MoneyNormalizeDirection,
): Record<string, unknown> {
  const fn = direction === "pull" ? PULL[collection] : PUSH[collection];
  if (fn) fn(row);
  return row;
}

export function normalizeMoneyEntityDeep<T extends object>(
  collection: CloudCollectionKey,
  entity: T,
  direction: MoneyNormalizeDirection,
): T {
  const row = { ...(entity as Record<string, unknown>) };
  normalizeMoneyEntity(collection, row, direction);
  return row as T;
}

/** Rupees string for export cells — avoids float dust */
export function formatMoneyRupeeLabel(paise: number): string {
  return paiseToRupees(paise).toFixed(2);
}
