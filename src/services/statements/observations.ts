/**
 * Statement observation contracts (source rows ≠ posted ledger events).
 * Keep PDF/password out of these persisted shapes.
 */
import type { BankId } from "./types";

export type LayoutSupportStatus =
  | "registered"
  | "synthetic-tested"
  | "real-corpus-tested"
  | "verified-for-scope"
  | "disabled";

export type ExtractionStatus = "ok" | "partial" | "failed" | "unsupported";
export type ArithmeticStatus = "matched" | "mismatched" | "limited" | "unknown";
export type CompletenessStatus = "complete" | "incomplete" | "unknown";
export type PurposeStatus = "pending" | "suggested" | "approved" | "excluded";
export type AuthenticityStatus = "unknown" | "fingerprint_only" | "unsupported";

export interface FieldProvenance {
  page: number;
  /** Bounding box in PDF page coordinates when available */
  box?: { x: number; y: number; width: number; height: number };
  sourceText: string;
  method: "native" | "ocr" | "user_correction";
}

export interface StatementSourceObservation {
  occurrenceId: string;
  sourceOrdinal: number;
  page: number;
  bookingDate: string;
  valueDate?: string;
  narration: string;
  reference: string;
  debitPaise: number;
  creditPaise: number;
  balancePaise: number | null;
  currency: "INR";
  issues: string[];
  fields: Partial<Record<"date" | "amount" | "direction" | "reference" | "balance" | "narration", FieldProvenance>>;
}

export interface StatementAccountSegment {
  segmentId: string;
  bankId: BankId | null;
  productHint: string | null;
  accountMask: string | null;
  accountLast4: string | null;
  currency: "INR";
  destinationAccountId: string | null;
  mappingStatus: "mapped" | "ambiguous" | "unmapped" | "conflict";
  mappingReason: string;
  rows: StatementSourceObservation[];
}

export interface StatementDocumentObservation {
  documentHash: string;
  parserVersion: string;
  processingMode: "native_pdf" | "ocr_selective" | "hybrid";
  layoutId: string | null;
  layoutStatus: LayoutSupportStatus | null;
  issuerBankId: BankId | null;
  issuerEvidence: string[];
  issuerAlternatives: Array<{ bankId: BankId; evidence: string }>;
  pageCount: number;
  segments: StatementAccountSegment[];
  extractionStatus: ExtractionStatus;
  arithmeticStatus: ArithmeticStatus;
  completenessStatus: CompletenessStatus;
  authenticityStatus: AuthenticityStatus;
  issues: string[];
  warnings: string[];
}

export interface ImportRowDisposition {
  occurrenceId: string;
  disposition: "new_post" | "link_existing" | "pending" | "excluded" | "non_transaction";
  purposeStatus: PurposeStatus;
  linkedTransactionId?: string;
  reason: string;
}

export interface ImportReceiptCounts {
  sourceRows: number;
  newlyPosted: number;
  linkedExisting: number;
  pending: number;
  excluded: number;
}

/** Build reviewable observations from parser analysis.
 * Field token boxes are used only when provided; otherwise a documented row-band highlight is used.
 */
export function buildObservationsFromAnalysis(analysis: {
  documentHash?: string;
  parserVersion: string;
  bank: BankId | null;
  rows: Array<{
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
    fieldBoxes?: Partial<Record<"date" | "amount" | "narration" | "balance", { x: number; y: number; width: number; height: number }>>;
  }>;
  pageCount: number;
  issues: string[];
  warnings: string[];
  ocrPages?: number[];
  pageWidth?: number;
}): StatementDocumentObservation {
  const pageWidth = analysis.pageWidth ?? 612;
  const rows: StatementSourceObservation[] = analysis.rows.map((row, index) => {
    const method = analysis.ocrPages?.includes(row.page) ? "ocr" : "native";
    const band = { x: 0, y: Math.max(0, row.y - 2), width: pageWidth, height: 14 };
    const boxOrBand = (field: "date" | "amount" | "narration" | "balance") =>
      row.fieldBoxes?.[field] ?? band;
    return {
    occurrenceId: row.id,
    sourceOrdinal: index,
    page: row.page,
    bookingDate: row.date,
    valueDate: row.valueDate,
    narration: row.description,
    reference: row.reference,
    debitPaise: row.debitPaise,
    creditPaise: row.creditPaise,
    balancePaise: row.balancePaise,
    currency: "INR",
    issues: [
      ...row.issues,
      ...(row.fieldBoxes ? [] : ["Source highlight uses row-band provenance (field token boxes unavailable)"]),
    ],
    fields: {
      date: {
        page: row.page,
        box: boxOrBand("date"),
        sourceText: row.date,
        method,
      },
      amount: {
        page: row.page,
        box: boxOrBand("amount"),
        sourceText: String((row.debitPaise || row.creditPaise) / 100),
        method,
      },
      direction: {
        page: row.page,
        sourceText: row.debitPaise > 0 ? "DR" : "CR",
        method,
      },
      balance: row.balancePaise === null
        ? undefined
        : {
            page: row.page,
            box: boxOrBand("balance"),
            sourceText: String(row.balancePaise / 100),
            method,
          },
      narration: {
        page: row.page,
        box: boxOrBand("narration"),
        sourceText: row.description,
        method,
      },
    },
  };
  });

  return {
    documentHash: analysis.documentHash ?? "",
    parserVersion: analysis.parserVersion,
    processingMode: analysis.ocrPages?.length ? "ocr_selective" : "native_pdf",
    layoutId: null,
    layoutStatus: null,
    issuerBankId: analysis.bank,
    issuerEvidence: [],
    issuerAlternatives: [],
    pageCount: analysis.pageCount,
    segments: [
      {
        segmentId: "primary",
        bankId: analysis.bank,
        productHint: null,
        accountMask: null,
        accountLast4: null,
        currency: "INR",
        destinationAccountId: null,
        mappingStatus: "unmapped",
        mappingReason: "Mapped at import time via destination account selection",
        rows,
      },
    ],
    extractionStatus: analysis.issues.length ? "partial" : "ok",
    arithmeticStatus: "unknown",
    completenessStatus: "unknown",
    authenticityStatus: "fingerprint_only",
    issues: analysis.issues,
    warnings: analysis.warnings,
  };
}
