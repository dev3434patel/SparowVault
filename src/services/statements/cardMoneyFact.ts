import type { CardMoneyEvidence, CardStatement } from "@/types";

export type CardMoneyField = "minimumDue" | "fees" | "interest";

export interface CardMoneyFact {
  valuePaise: number | null;
  evidence: CardMoneyEvidence;
  /** True when a stored number has no provenance. It is not issuer-observed zero. */
  needsReview: boolean;
}

export interface CardMoneyFactInput {
  valuePaise: number | null;
  evidence: CardMoneyEvidence;
}

/** Phrases written when a missing line was stored as zero. Matching rows are not observed charges. */
export const LEGACY_PLACEHOLDER_NOTES: Record<CardMoneyField, string> = {
  interest: "Interest is 0 because the reviewed rows did not include an interest line.",
  fees: "Fees are 0 because the reviewed rows did not include a fee line.",
  minimumDue: "Minimum due is 0 because it was not in the reviewed rows.",
};

const VALUE_KEY: Record<CardMoneyField, "minimumDuePaise" | "feesPaise" | "interestPaise"> = {
  minimumDue: "minimumDuePaise",
  fees: "feesPaise",
  interest: "interestPaise",
};

const EVIDENCE_KEY: Record<CardMoneyField, "minimumDueEvidence" | "feesEvidence" | "interestEvidence"> = {
  minimumDue: "minimumDueEvidence",
  fees: "feesEvidence",
  interest: "interestEvidence",
};

function isEvidence(value: unknown): value is CardMoneyEvidence {
  return value === "source_observed" || value === "user_confirmed" || value === "estimated" || value === "not_observed";
}

function integerPaise(value: unknown): number | null {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 ? value : null;
}

/**
 * Printed issuer evidence wins over an estimate or a later user confirmation.
 * A missing fact stays not_observed.
 */
export function mergeCardMoneyFact(current: CardMoneyFact, incoming: CardMoneyFact): CardMoneyFact {
  if (current.evidence === "source_observed" && (incoming.evidence === "estimated" || incoming.evidence === "user_confirmed")) {
    return current;
  }
  if (incoming.evidence === "source_observed") return { ...incoming, needsReview: false };
  if (current.evidence === "not_observed" && incoming.evidence !== "not_observed") return incoming;
  if (current.evidence === "source_observed") return current;
  return incoming;
}

export function readCardMoneyFact(statement: CardStatement, field: CardMoneyField): CardMoneyFact {
  const evidence = statement[EVIDENCE_KEY[field]];
  const stored = statement[VALUE_KEY[field]];
  const notes = statement.notes ?? "";
  if (notes.includes(LEGACY_PLACEHOLDER_NOTES[field]) && !(typeof stored === "number" && stored > 0)) {
    return { valuePaise: null, evidence: "not_observed", needsReview: false };
  }
  if (evidence === "not_observed") return { valuePaise: null, evidence: "not_observed", needsReview: false };
  const amount = integerPaise(stored);
  if (evidence && amount != null) {
    return { valuePaise: amount, evidence, needsReview: false };
  }
  if (amount != null && amount > 0) {
    return { valuePaise: amount, evidence: "user_confirmed", needsReview: true };
  }
  return { valuePaise: null, evidence: "not_observed", needsReview: amount === 0 && !isEvidence(evidence) };
}

/**
 * Mark placeholder zeros named by the legacy notes. Does not invent a charge
 * and does not change any other statement figure.
 */
export function markLegacyPlaceholderCardFacts(statement: CardStatement): { statement: CardStatement; changed: boolean } {
  let changed = false;
  const next: CardStatement = { ...statement };
  (Object.keys(LEGACY_PLACEHOLDER_NOTES) as CardMoneyField[]).forEach((field) => {
    if (!(statement.notes ?? "").includes(LEGACY_PLACEHOLDER_NOTES[field])) return;
    const stored = statement[VALUE_KEY[field]];
    if (typeof stored === "number" && stored > 0) return;
    const valueKey = VALUE_KEY[field];
    const evidenceKey = EVIDENCE_KEY[field];
    if (next[valueKey] !== null || next[evidenceKey] !== "not_observed") changed = true;
    next[valueKey] = null;
    next[evidenceKey] = "not_observed";
  });
  return { statement: next, changed };
}

export function cardStatementForExport(statement: CardStatement): CardStatement {
  const marked = markLegacyPlaceholderCardFacts(statement).statement;
  const next: CardStatement = { ...marked };
  (Object.keys(VALUE_KEY) as CardMoneyField[]).forEach((field) => {
    const fact = readCardMoneyFact(marked, field);
    next[VALUE_KEY[field]] = fact.evidence === "not_observed" ? null : fact.valuePaise;
    next[EVIDENCE_KEY[field]] = fact.evidence;
  });
  return next;
}

export function formatCardMoneyFact(fact: CardMoneyFact, formatPaise: (paise: number) => string): string {
  if (fact.evidence === "not_observed" || fact.valuePaise == null) return "Unknown";
  const amount = formatPaise(fact.valuePaise);
  if (fact.evidence === "estimated") return `Estimated ${amount}`;
  if (fact.evidence === "user_confirmed") return fact.needsReview ? `${amount} (unconfirmed)` : `${amount} (you confirmed)`;
  return amount;
}

export function normalizeCardMoneyWrite(
  value: number | null | undefined,
  evidence: CardMoneyEvidence | undefined,
  field: string,
): { valuePaise: number | null; evidence?: CardMoneyEvidence } {
  if (evidence === "not_observed") {
    if (value != null && value !== 0) throw new Error(`${field} cannot store a charge when it was not observed`);
    return { valuePaise: null, evidence: "not_observed" };
  }
  if (evidence === "source_observed" || evidence === "user_confirmed" || evidence === "estimated") {
    if (value == null || !Number.isInteger(value) || value < 0) {
      throw new Error(`${field} must be a non-negative paise integer`);
    }
    return { valuePaise: value, evidence };
  }
  if (value == null || !Number.isInteger(value) || value < 0) {
    throw new Error(`${field} must be a non-negative paise integer`);
  }
  return { valuePaise: value };
}
