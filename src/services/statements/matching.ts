/**
 * Safe statement ↔ existing transaction match proposals.
 * Fuzzy matches stay suggestions; never silently merge money records.
 */
import type { ReconciliationMatch, Transaction } from "@/types";
import type { StatementRow } from "./types";
import { statementDuplicate } from "./classification";

export interface StatementMatchProposal {
  occurrenceId: string;
  existingTransactionId: string | null;
  status: "suggested" | "none";
  confidence: number;
  reason: string;
}

function normalized(text: string): string {
  return text.replace(/\s+/g, " ").trim().toUpperCase();
}

/**
 * Propose links for duplicate candidates without writing the ledger.
 */
export function proposeStatementMatches(
  rows: StatementRow[],
  accountId: string,
  existing: Transaction[],
): StatementMatchProposal[] {
  return rows.map((row) => {
    const reason = statementDuplicate(row, accountId, existing);
    if (!reason) {
      return {
        occurrenceId: row.id,
        existingTransactionId: null,
        status: "none",
        confidence: 0,
        reason: "No duplicate candidate",
      };
    }
    const amount = row.debitPaise + row.creditPaise;
    const exact = existing.find((tx) => {
      if (tx.isDeleted || tx.date.slice(0, 10) !== row.date) return false;
      if ((tx.amountPaise ?? Math.round(tx.amount * 100)) !== amount) return false;
      return normalized(tx.description) === normalized(row.description);
    });
    return {
      occurrenceId: row.id,
      existingTransactionId: exact?.id ?? null,
      status: "suggested",
      confidence: exact ? 0.95 : 0.55,
      reason,
    };
  });
}

export function toReconciliationMatchDraft(
  userId: string,
  proposal: StatementMatchProposal,
  now = new Date().toISOString(),
): ReconciliationMatch | null {
  if (proposal.status !== "suggested" || !proposal.existingTransactionId) return null;
  return {
    id: `stmt_match_${userId}_${proposal.occurrenceId}_${proposal.existingTransactionId}`,
    userId,
    leftTransactionId: proposal.existingTransactionId,
    rightTransactionId: undefined,
    status: "suggested",
    confidence: proposal.confidence,
    createdAt: now,
    updatedAt: now,
    isDeleted: 0,
    version: 1,
    tags: ["statement-match"],
    notes: proposal.reason,
  };
}
