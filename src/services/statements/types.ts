import type { PersonalBusiness } from "@/types";
import bankRegistry from "../../../php/config/statement_banks.json";

export const BANKS = bankRegistry.map(bank => ({ ...bank, pattern: new RegExp(bank.pattern, "i") }));
export type BankId = typeof BANKS[number]["id"];
export type StatementKind = "income" | "expense" | "transfer" | "refund" | "contribution" | "cc_payment";
export interface StatementToken { text: string; x: number; y: number; width: number; height: number }
export interface StatementPage { number: number; width: number; height: number; tokens: StatementToken[]; extraction?: "ocr"; confidence?: number }
export interface StatementRow {
  id: string;
  page: number;
  y: number;
  date: string;
  valueDate?: string;
  description: string;
  reference: string;
  debitPaise: number;
  creditPaise: number;
  balancePaise: number | null;
  issues: string[];
}
export interface StatementAnalysis {
  parserVersion: "statement-text-v2" | "statement-ocr-v1";
  ocrPages?: number[];
  bank: BankId | null;
  rows: StatementRow[];
  openingPaise: number | null;
  closingPaise: number | null;
  periodFrom: string | null;
  periodTo: string | null;
  periodSource: "printed" | "transactions";
  order: "ascending" | "descending";
  issues: string[];
  warnings: string[];
  pageCount: number;
  /** Per-page extraction coverage; missing/failed pages block completeness */
  pageCoverage?: Array<{
    page: number;
    status: "ok" | "empty" | "failed" | "ocr";
    tokenCount: number;
    transactionRows: number;
  }>;
}
export interface StatementDecision {
  include: boolean;
  reviewed: boolean;
  kind: StatementKind | "";
  /** Non-binding direction/narration hint; never treated as approved purpose */
  suggestedKind?: StatementKind | "";
  /** strong = keyword/special-case proposal; weak = direction-only; none = blank */
  proposalStrength?: "strong" | "weak" | "none";
  categoryId: string;
  scope: PersonalBusiness | "";
  counterpartId: string;
  /** When excluding a duplicate, optional confirmed link to existing transaction */
  matchTransactionId?: string;
  reason: string;
  duplicate: string | null;
}
export interface StatementImportRow extends StatementRow {
  decision: Omit<StatementDecision, "reason" | "duplicate">;
}
export interface StatementSourceEvidence {
  pageNumbers?: number[];
  pageTotal?: number | null;
  printedDebitCount?: number | null;
  printedCreditCount?: number | null;
  printedGrossDebitPaise?: number | null;
  printedGrossCreditPaise?: number | null;
  expectedTransactionCount?: number | null;
  evidenceOrigin?: "printed_summary" | "human_provided" | "layout_required" | "unavailable";
  evidenceScope?: string;
}
export interface StatementImportRequest {
  userId: string;
  accountId: string;
  bank: BankId;
  documentHash: string;
  parserVersion: string;
  openingPaise: number;
  closingPaise: number;
  order: "ascending" | "descending";
  rows: StatementImportRow[];
  mutationId: string;
  ocrSourceConfirmed?: boolean;
  sourceEvidence?: StatementSourceEvidence;
  confirmedMatches?: Array<{ occurrenceId: string; transactionId: string; fingerprint?: string }>;
  reviewRevision?: number;
  /** SHA-256 hex of buildServerAlignedDigestMaterial; server rejects mismatches as STALE_REVIEW_DIGEST */
  reviewDigest?: string;
}
export interface StatementImportResult {
  imported: number;
  duplicates: number;
  skipped: number;
  transactionIds: string[];
  importSourceId?: string | null;
  matchIds?: string[];
}
