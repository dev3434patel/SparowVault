/**
 * Review revision / approval digest — corrections invalidate prior approval.
 */
import type { PrintedEvidence } from "./verifier";
import type { StatementDecision, StatementRow } from "./types";

export type ReviewState =
  | "extracted"
  | "needs_review"
  | "dirty"
  | "validated"
  | "committing"
  | "committed"
  | "rejected";

export interface ReviewManifestInput {
  bank: string | null;
  layoutId?: string | null;
  parserVersion: string;
  accountId: string;
  currency: string;
  rows: StatementRow[];
  evidence: PrintedEvidence;
  decisions: Record<string, Pick<StatementDecision, "include" | "kind" | "categoryId" | "scope" | "counterpartId" | "matchTransactionId">>;
  corrections?: Record<string, { amountPaise?: number; date?: string; direction?: "debit" | "credit"; balancePaise?: number | null; reason?: string }>;
  reviewRevision: number;
}

/** Canonical digest material for approval binding (not a bank authenticity proof). */
export function buildReviewManifest(input: ReviewManifestInput): string {
  const orderedRows = input.rows.map((r) => ({
    id: r.id,
    date: r.date,
    debitPaise: r.debitPaise,
    creditPaise: r.creditPaise,
    balancePaise: r.balancePaise,
    page: r.page,
    description: r.description,
    reference: r.reference,
  }));
  const payload = {
    bank: input.bank,
    layoutId: input.layoutId ?? null,
    parserVersion: input.parserVersion,
    accountId: input.accountId,
    currency: input.currency,
    rows: orderedRows,
    evidence: input.evidence,
    decisions: input.decisions,
    corrections: input.corrections ?? {},
    reviewRevision: input.reviewRevision,
  };
  return JSON.stringify(payload);
}

export function approvalInvalidatedByCorrection(before: ReviewManifestInput, after: ReviewManifestInput): boolean {
  return buildReviewManifest(before) !== buildReviewManifest(after);
}

export function nextReviewState(current: ReviewState, event: "correct" | "validate_ok" | "validate_fail" | "commit_start" | "commit_ok" | "commit_fail"): ReviewState {
  if (event === "correct") return "dirty";
  if (event === "validate_ok") return current === "dirty" || current === "needs_review" || current === "extracted" ? "validated" : current;
  if (event === "validate_fail") return "needs_review";
  if (event === "commit_start") return "committing";
  if (event === "commit_ok") return "committed";
  if (event === "commit_fail") return "rejected";
  return current;
}

export function applyFieldCorrection(
  row: StatementRow,
  patch: { amountPaise?: number; date?: string; direction?: "debit" | "credit"; balancePaise?: number | null },
): StatementRow {
  const next = { ...row };
  if (patch.date != null) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(patch.date)) throw new Error("Invalid booking date");
    next.date = patch.date;
  }
  if (patch.balancePaise !== undefined) next.balancePaise = patch.balancePaise;
  if (patch.direction != null || patch.amountPaise != null) {
    const amount = patch.amountPaise ?? (row.debitPaise || row.creditPaise);
    if (!Number.isInteger(amount) || amount < 0) throw new Error("Amount must be non-negative integer paise");
    const direction = patch.direction ?? (row.debitPaise > 0 ? "debit" : "credit");
    if (direction === "debit") {
      next.debitPaise = amount;
      next.creditPaise = 0;
    } else {
      next.creditPaise = amount;
      next.debitPaise = 0;
    }
  }
  return next;
}
