/**
 * Export helpers for source / account-month / economic views (R4).
 */
import type { FinancialMeaningMonth } from "./reports";
import type { AccountMonthUnionRow, SourceDocumentStats } from "./reports";
import type { MonthlyBankMovement } from "./verifier";

export interface StatementExportBundle {
  exportedAt: string;
  currency: "INR";
  parserVersion: string;
  documentHash: string | null;
  sourceDocuments: SourceDocumentStats[];
  accountMonthUnion: AccountMonthUnionRow[];
  bankMonths: MonthlyBankMovement[];
  economicMonths: FinancialMeaningMonth[];
  coverageNote: string;
}

export function buildStatementExportBundle(input: {
  parserVersion: string;
  documentHash: string | null;
  sourceDocuments: SourceDocumentStats[];
  accountMonthUnion: AccountMonthUnionRow[];
  bankMonths: MonthlyBankMovement[];
  economicMonths: FinancialMeaningMonth[];
}): StatementExportBundle {
  return {
    exportedAt: new Date().toISOString(),
    currency: "INR",
    parserVersion: input.parserVersion,
    documentHash: input.documentHash,
    sourceDocuments: input.sourceDocuments,
    accountMonthUnion: input.accountMonthUnion,
    bankMonths: input.bankMonths,
    economicMonths: input.economicMonths,
    coverageNote: "Missing months are unknown coverage, not zero spending. Bank credits are not automatic income.",
  };
}

/** CSV for one account-month union view — values are independent of UI formatting. */
export function accountMonthUnionToCsv(rows: AccountMonthUnionRow[]): string {
  const header = "month,debit_count,debit_paise,credit_count,credit_paise,unresolved_overlap_count";
  const lines = rows.map((r) =>
    [r.month, r.debitCount, r.debitPaise, r.creditCount, r.creditPaise, r.unresolvedOverlapCount].join(","),
  );
  return [header, ...lines].join("\n");
}
