/**
 * Dual monthly reports: bank movement vs financial meaning.
 */
import type { StatementDecision, StatementRow } from "./types";
import { reportBankStatementMonths, type MonthlyBankMovement, type StatementSourceRowInput } from "./verifier";

export interface FinancialMeaningMonth {
  month: string;
  incomePaise: number;
  expensePaise: number;
  refundPaise: number;
  transferPaise: number;
  ccPaymentPaise: number;
  unresolvedPaise: number;
  /** Bank credits that must not be treated as income without purpose approval */
  bankCreditPaise: number;
  bankDebitPaise: number;
}

export function reportEconomicMonth(
  rows: StatementRow[],
  decisions: Record<string, StatementDecision>,
): FinancialMeaningMonth[] {
  const months = new Map<string, FinancialMeaningMonth>();
  const ensure = (month: string): FinancialMeaningMonth => {
    const existing = months.get(month);
    if (existing) return existing;
    const created: FinancialMeaningMonth = {
      month,
      incomePaise: 0,
      expensePaise: 0,
      refundPaise: 0,
      transferPaise: 0,
      ccPaymentPaise: 0,
      unresolvedPaise: 0,
      bankCreditPaise: 0,
      bankDebitPaise: 0,
    };
    months.set(month, created);
    return created;
  };

  for (const row of rows) {
    const month = row.date.slice(0, 7);
    const bucket = ensure(month);
    bucket.bankCreditPaise += row.creditPaise;
    bucket.bankDebitPaise += row.debitPaise;
    const decision = decisions[row.id];
    if (!decision?.include) continue;
    if (!decision.reviewed || !decision.kind || !decision.scope || row.issues.length) {
      bucket.unresolvedPaise += row.debitPaise + row.creditPaise;
      continue;
    }
    switch (decision.kind) {
      case "income":
        bucket.incomePaise += row.creditPaise;
        break;
      case "expense":
        bucket.expensePaise += row.debitPaise;
        break;
      case "refund":
      case "contribution":
        bucket.refundPaise += row.creditPaise;
        break;
      case "transfer":
        bucket.transferPaise += row.debitPaise + row.creditPaise;
        break;
      case "cc_payment":
        bucket.ccPaymentPaise += row.debitPaise;
        break;
      default:
        bucket.unresolvedPaise += row.debitPaise + row.creditPaise;
    }
  }
  return [...months.values()].sort((a, b) => a.month.localeCompare(b.month));
}

export function reportBankMonthsFromRows(
  rows: StatementRow[],
  periodFrom?: string | null,
  periodTo?: string | null,
): MonthlyBankMovement[] {
  const source: StatementSourceRowInput[] = rows.map((r) => ({
    id: r.id,
    bookingDate: r.date,
    debitPaise: r.debitPaise,
    creditPaise: r.creditPaise,
    balancePaise: r.balancePaise,
    page: r.page,
  }));
  return reportBankStatementMonths(source, { periodStart: periodFrom, periodEnd: periodTo });
}

export interface SourceDocumentStats {
  documentId: string;
  debitCount: number;
  creditCount: number;
  transactionCount: number;
  debitPaise: number;
  creditPaise: number;
}

/** Per-document source statistics (includes matched/excluded rows). */
export function sourceDocumentStats(
  documentId: string,
  rows: Array<{ debitPaise: number; creditPaise: number }>,
): SourceDocumentStats {
  let debitCount = 0;
  let creditCount = 0;
  let debitPaise = 0;
  let creditPaise = 0;
  for (const row of rows) {
    if (row.debitPaise > 0) {
      debitCount += 1;
      debitPaise += row.debitPaise;
    }
    if (row.creditPaise > 0) {
      creditCount += 1;
      creditPaise += row.creditPaise;
    }
  }
  return {
    documentId,
    debitCount,
    creditCount,
    transactionCount: rows.length,
    debitPaise,
    creditPaise,
  };
}

export interface AccountMonthUnionRow {
  month: string;
  debitCount: number;
  creditCount: number;
  debitPaise: number;
  creditPaise: number;
  unresolvedOverlapCount: number;
}

/**
 * Account-month activity across overlapping statement documents.
 * Deduplicate only by explicit observation identity; never sum document totals.
 * Unresolved same-fingerprint overlaps are counted separately — not auto-merged.
 */
export function accountMonthUnionFromDocuments(
  documents: Array<{
    documentId: string;
    rows: Array<{
      occurrenceId: string;
      bookingDate: string;
      debitPaise: number;
      creditPaise: number;
      fingerprint?: string;
      resolvedObservationId?: string;
    }>;
  }>,
): AccountMonthUnionRow[] {
  const byMonth = new Map<string, {
    seen: Set<string>;
    debitCount: number;
    creditCount: number;
    debitPaise: number;
    creditPaise: number;
    unresolvedOverlapCount: number;
  }>();

  for (const doc of documents) {
    for (const row of doc.rows) {
      const month = row.bookingDate.slice(0, 7);
      const bucket = byMonth.get(month) ?? {
        seen: new Set<string>(),
        debitCount: 0,
        creditCount: 0,
        debitPaise: 0,
        creditPaise: 0,
        unresolvedOverlapCount: 0,
      };
      const identity = row.resolvedObservationId ?? `${doc.documentId}:${row.occurrenceId}`;
      if (row.resolvedObservationId && bucket.seen.has(row.resolvedObservationId)) {
        // Already counted via resolved identity — skip double count.
        byMonth.set(month, bucket);
        continue;
      }
      if (row.fingerprint && !row.resolvedObservationId) {
        const collisionKey = `open:${row.fingerprint}`;
        if (bucket.seen.has(collisionKey)) {
          bucket.unresolvedOverlapCount += 1;
          byMonth.set(month, bucket);
          continue;
        }
        bucket.seen.add(collisionKey);
      }
      bucket.seen.add(identity);
      if (row.debitPaise > 0) {
        bucket.debitCount += 1;
        bucket.debitPaise += row.debitPaise;
      }
      if (row.creditPaise > 0) {
        bucket.creditCount += 1;
        bucket.creditPaise += row.creditPaise;
      }
      byMonth.set(month, bucket);
    }
  }

  return [...byMonth.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, b]) => ({
      month,
      debitCount: b.debitCount,
      creditCount: b.creditCount,
      debitPaise: b.debitPaise,
      creditPaise: b.creditPaise,
      unresolvedOverlapCount: b.unresolvedOverlapCount,
    }));
}
