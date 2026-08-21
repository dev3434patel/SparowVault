/**
 * Phase 5 — "Explain this number" helpers for ledger-backed metrics.
 */

import { parseISO } from "date-fns";
import type { FinancialEffect, FinancialEvent, Transaction } from "@/types";
import { transactionAmountPaise } from "@/utils/money";

function inMonth(isoDate: string, year: number, month1to12: number): boolean {
  try {
    const d = parseISO(isoDate);
    return d.getFullYear() === year && d.getMonth() === month1to12 - 1;
  } catch {
    return false;
  }
}

export interface ExplainCategorySpendResult {
  included: FinancialEffect[];
  excluded: Array<{ transactionId: string; reason: string }>;
}

/** Which effects count toward category spend in a month, and which legacy tx rows were skipped. */
export function explainCategorySpend(
  categoryId: string,
  year: number,
  month1to12: number,
  transactions: Transaction[],
  events: FinancialEvent[],
  effects: FinancialEffect[],
): ExplainCategorySpendResult {
  const eventById = new Map(events.map((e) => [e.id, e]));
  const included = effects.filter((e) => {
    const ev = eventById.get(e.eventId);
    if (!ev || ev.deletedAt) return false;
    if (!inMonth(ev.eventDate, year, month1to12)) return false;
    if (e.targetType !== "expense_category" || e.targetId !== categoryId) return false;
    return e.component === "expense" || e.component === "interest";
  });

  const includedTxn = new Set(
    included.map((e) => {
      const ev = eventById.get(e.eventId);
      return ev?.sourceTransactionId;
    }),
  );

  const excluded: ExplainCategorySpendResult["excluded"] = [];
  for (const t of transactions) {
    if (t.isDeleted === 1 || t.type !== "expense" || t.categoryId !== categoryId) continue;
    if (!inMonth(t.date, year, month1to12)) continue;
    if (!includedTxn.has(t.id)) {
      excluded.push({
        transactionId: t.id,
        reason:
          t.paymentMode === "credit_card" && !t.linkedCardId
            ? "needs_review: credit card expense without linkedCardId"
            : "needs_review or not mapped to ledger effects",
      });
    }
  }
  return { included, excluded };
}

export interface ExplainMetricLine {
  label: string;
  amountPaise: number;
  kind: "included" | "excluded";
}

export function explainCashflowMonth(
  year: number,
  month1to12: number,
  events: FinancialEvent[],
  effects: FinancialEffect[],
): { included: ExplainMetricLine[]; excluded: ExplainMetricLine[] } {
  const eventById = new Map(events.map((e) => [e.id, e]));
  const included: ExplainMetricLine[] = [];
  const excluded: ExplainMetricLine[] = [];
  for (const e of effects) {
    const ev = eventById.get(e.eventId);
    if (!ev || ev.deletedAt || !inMonth(ev.eventDate, year, month1to12)) continue;
    if (e.targetType !== "account" || e.component !== "cash") continue;
    const sign = e.effectDirection === "increase" ? 1 : -1;
    included.push({
      label: `${ev.eventType} · ${e.effectDirection} · account ${e.targetId.slice(0, 8)}…`,
      amountPaise: sign * e.amountPaise,
      kind: "included",
    });
  }
  for (const ev of events) {
    if (ev.status === "needs_review" && inMonth(ev.eventDate, year, month1to12)) {
      excluded.push({
        label: `Event ${ev.eventType} (${ev.sourceTransactionId}) — needs_review`,
        amountPaise: ev.amountPaise,
        kind: "excluded",
      });
    }
  }
  return { included, excluded };
}

export function explainTransactionLedgerCoverage(
  t: Transaction,
  events: FinancialEvent[],
): { covered: boolean; event?: FinancialEvent; note?: string } {
  const ev = events.find((e) => e.sourceTransactionId === t.id);
  if (!ev) return { covered: false, note: "No ledger event for this transaction" };
  if (ev.status === "needs_review") return { covered: false, event: ev, note: "needs_review" };
  return { covered: true, event: ev };
}

export function sumExcludedExpenseTransactionsPaise(
  excluded: ExplainCategorySpendResult["excluded"],
  transactions: Transaction[],
): number {
  const ids = new Set(excluded.map((x) => x.transactionId));
  return transactions
    .filter((t) => ids.has(t.id))
    .reduce((a, t) => a + transactionAmountPaise(t), 0);
}
