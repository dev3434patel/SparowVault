/**
 * OCR field uncertainty helpers — page confidence is not money-digit proof.
 */
export type CriticalField = "date" | "amount" | "direction" | "balance" | "reference";

export interface OcrFieldIssue {
  field: CriticalField;
  reason: string;
  requiresReview: true;
}

const CONFUSABLES = /[OIlS5B8]/;

export function ocrPageConfidenceIsNotEnough(pageConfidence: number | undefined): boolean {
  // Even >= 80 must not auto-trust every money digit.
  return true;
}

export function detectOcrFieldUncertainty(input: {
  sourceText: string;
  field: CriticalField;
  pageConfidence?: number;
}): OcrFieldIssue | null {
  const text = input.sourceText.trim();
  if (!text) {
    return { field: input.field, reason: "Empty OCR text for critical field", requiresReview: true };
  }
  if ((input.pageConfidence ?? 100) < 80) {
    return { field: input.field, reason: `Page OCR confidence ${input.pageConfidence ?? 0} is below 80`, requiresReview: true };
  }
  if (input.field === "amount" || input.field === "balance") {
    if (CONFUSABLES.test(text.replace(/[0-9,.\-\sCRDRcrdr]/g, ""))) {
      return { field: input.field, reason: "OCR amount contains confusable characters", requiresReview: true };
    }
    if (!/^(?:INR|Rs\.?|₹)?\s*-?\(?\d[\d,]*\.?\d{0,2}\)?(?:\s*(?:CR|DR))?\.?$/i.test(text)) {
      return { field: input.field, reason: "OCR amount format is ambiguous", requiresReview: true };
    }
  }
  if (input.field === "direction" && !/^(?:CR|DR|CREDIT|DEBIT)\.?$/i.test(text)) {
    return { field: input.field, reason: "OCR direction marker is ambiguous", requiresReview: true };
  }
  if (input.field === "date" && !/\d/.test(text)) {
    return { field: input.field, reason: "OCR date has no digits", requiresReview: true };
  }
  // Always require review for OCR critical fields even when format looks plausible.
  if ((input.pageConfidence ?? 0) >= 80) {
    return {
      field: input.field,
      reason: "OCR critical fields require human verification even when page confidence is high",
      requiresReview: true,
    };
  }
  return null;
}

export const OCR_POLICY = {
  maxPages: 12,
  nativeFirst: true,
  handwritingSupported: false,
  remoteUploadAllowed: false,
} as const;
