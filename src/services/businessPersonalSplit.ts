/**
 * Phase 15 — business / personal split for any transaction.
 *
 * Each Transaction has businessOrPersonal ∈ {"personal","business","mixed"}.
 * For "mixed" rows we expect a numeric splitBusinessPct (0..100) — if absent
 * we default to 50/50.
 *
 * Money math is always in paise integers.
 */
import type { Transaction } from "@/types";
import { transactionAmountPaise } from "@/utils/money";

export interface SplitParts {
  /** Paise allocated to the business side */
  businessPaise: number;
  /** Paise allocated to the personal side */
  personalPaise: number;
  /** Total = businessPaise + personalPaise (always equals transactionAmountPaise) */
  totalPaise: number;
}

/**
 * Split a transaction into business + personal portions.
 *
 * Rule:
 *   - personal → 100% personal
 *   - business → 100% business
 *   - mixed    → splitBusinessPct of amount goes to business (default 50)
 *
 * Rounding: business side rounded; personal side gets the remainder so the
 * two parts always sum exactly to total — no rupee floats, no rounding drift.
 */
export function splitTransaction(tx: Transaction): SplitParts {
  const total = transactionAmountPaise(tx);
  const flag = tx.businessOrPersonal ?? "personal";

  if (flag === "personal") {
    return { businessPaise: 0, personalPaise: total, totalPaise: total };
  }
  if (flag === "business") {
    return { businessPaise: total, personalPaise: 0, totalPaise: total };
  }

  // mixed: explicit amount split wins because reports must reconcile to paise.
  const amountSplit = tx as {
    splitBusinessPaise?: number;
    splitPersonalPaise?: number;
  };
  const hasBusinessPaise =
    Number.isInteger(amountSplit.splitBusinessPaise) && amountSplit.splitBusinessPaise! >= 0;
  const hasPersonalPaise =
    Number.isInteger(amountSplit.splitPersonalPaise) && amountSplit.splitPersonalPaise! >= 0;
  if (hasBusinessPaise || hasPersonalPaise) {
    const businessPaise = Math.max(0, Math.min(
      total,
      hasBusinessPaise ? amountSplit.splitBusinessPaise! : total - amountSplit.splitPersonalPaise!,
    ));
    return {
      businessPaise,
      personalPaise: total - businessPaise,
      totalPaise: total,
    };
  }

  // mixed: percentage fallback
  const pctRaw = (tx as { splitBusinessPct?: number }).splitBusinessPct;
  const pct = typeof pctRaw === "number" && Number.isFinite(pctRaw)
    ? Math.max(0, Math.min(100, pctRaw))
    : 50;

  const businessPaise = Math.round((total * pct) / 100);
  const personalPaise = total - businessPaise;
  return { businessPaise, personalPaise, totalPaise: total };
}

/**
 * Aggregate split totals across many transactions.
 */
export function sumSplit(txs: Transaction[]): SplitParts {
  let businessPaise = 0;
  let personalPaise = 0;
  for (const t of txs) {
    if (t.isDeleted === 1) continue;
    const s = splitTransaction(t);
    businessPaise += s.businessPaise;
    personalPaise += s.personalPaise;
  }
  return { businessPaise, personalPaise, totalPaise: businessPaise + personalPaise };
}

export function sumExpenseSplit(txs: Transaction[]): SplitParts {
  let businessPaise = 0, personalPaise = 0;
  for (const tx of txs) {
    if (tx.isDeleted === 1 || !["expense", "refund"].includes(tx.type)) continue;
    const split = splitTransaction(tx);
    const sign = tx.type === "refund" ? -1 : 1;
    businessPaise += sign * split.businessPaise;
    personalPaise += sign * split.personalPaise;
  }
  return { businessPaise, personalPaise, totalPaise: businessPaise + personalPaise };
}
