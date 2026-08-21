/**
 * vNext Phase I — Reconciliation helpers.
 */

import { parseISO } from "date-fns";
import type { Transaction } from "@/types";
import { transactionAmountPaise } from "@/utils/money";

export function findOrphanTransactions(txs: Transaction[]): Transaction[] {
  return txs.filter((t) => {
    if (t.isDeleted === 1) return false;
    if (t.type === "expense" && !t.categoryId) return true;
    if (t.type === "income" && !t.categoryId) return true;
    if (t.type === "transfer" && (!t.accountId || !t.toAccountId)) return true;
    if (t.paymentMode === "credit_card" && t.type === "expense" && !t.linkedCardId) return true;
    return false;
  });
}

export interface TransferMatchSuggestion {
  id: string;
  outTxId: string;
  inTxId: string;
  amountPaise: number;
  label: string;
  confidence: number;
}

/** Suggest self-transfer pairs by amount + date proximity. */
export function suggestTransferMatches(txs: Transaction[], windowDays = 2): TransferMatchSuggestion[] {
  const out = txs.filter(
    (t) => t.isDeleted !== 1 && t.type === "transfer" && t.accountId && t.toAccountId,
  );
  const suggestions: TransferMatchSuggestion[] = [];
  for (let i = 0; i < out.length; i += 1) {
    for (let j = i + 1; j < out.length; j += 1) {
      const a = out[i];
      const b = out[j];
      const amtA = transactionAmountPaise(a);
      const amtB = transactionAmountPaise(b);
      if (amtA !== amtB) continue;
      const dA = parseISO(a.date).getTime();
      const dB = parseISO(b.date).getTime();
      if (Math.abs(dA - dB) > windowDays * 86400000) continue;
      if (a.accountId === b.toAccountId && a.toAccountId === b.accountId) {
        suggestions.push({
          id: `tm_${a.id}_${b.id}`,
          outTxId: a.id,
          inTxId: b.id,
          amountPaise: amtA,
          label: `Mirror transfer ${a.date} ↔ ${b.date}`,
          confidence: 0.85,
        });
      }
    }
  }
  return suggestions;
}
