/**
 * Issuer / account segmentation helpers.
 * Narration payee bank names must not determine the issuer.
 */
import { BANKS, type BankId, type StatementPage } from "./types";

export interface IssuerDetectionResult {
  bankId: BankId | null;
  evidence: string[];
  alternatives: Array<{ bankId: BankId; evidence: string }>;
  needsConfirmation: boolean;
  reason: string;
}

function pageText(pages: StatementPage[], maxPages = 2): string {
  return pages
    .slice(0, maxPages)
    .flatMap((p) => p.tokens.map((t) => t.text))
    .join(" ");
}

function headerText(pages: StatementPage[]): string {
  return pages
    .slice(0, 1)
    .flatMap((p) => p.tokens.filter((t) => t.y < p.height * 0.22).map((t) => t.text))
    .join(" ");
}

function footerText(pages: StatementPage[]): string {
  if (!pages.length) return "";
  const last = pages[pages.length - 1];
  const midY = last.height * 0.72;
  return last.tokens.filter((t) => t.y >= midY).map((t) => t.text).join(" ");
}

/**
 * Prefer header/legal/footer branding over narration mentions.
 */
export function detectStatementIssuer(pages: StatementPage[]): IssuerDetectionResult {
  const header = headerText(pages);
  const early = pageText(pages, 2);
  const footer = footerText(pages);
  const strongRegions = `${header}\n${footer}`;
  const hits: Array<{ bankId: BankId; evidence: string; weight: number }> = [];

  for (const bank of BANKS) {
    if (bank.id === "other") continue;
    if (bank.pattern.test(strongRegions)) {
      hits.push({ bankId: bank.id, evidence: `header/footer match: ${bank.name}`, weight: 3 });
    } else if (bank.pattern.test(early)) {
      hits.push({ bankId: bank.id, evidence: `early-page match: ${bank.name}`, weight: 1 });
    }
  }

  hits.sort((a, b) => b.weight - a.weight);
  if (!hits.length) {
    return {
      bankId: null,
      evidence: [],
      alternatives: [],
      needsConfirmation: true,
      reason: "No strong issuer evidence in header/footer",
    };
  }

  const best = hits[0];
  const strong = hits.filter((h) => h.weight >= 3);
  if (strong.length > 1) {
    return {
      bankId: null,
      evidence: strong.map((h) => h.evidence),
      alternatives: strong.map((h) => ({ bankId: h.bankId, evidence: h.evidence })),
      needsConfirmation: true,
      reason: "Conflicting header/footer issuer evidence",
    };
  }

  if (best.weight < 3) {
    return {
      bankId: best.bankId,
      evidence: [best.evidence],
      alternatives: hits.slice(1, 4).map((h) => ({ bankId: h.bankId, evidence: h.evidence })),
      needsConfirmation: true,
      reason: "Weak issuer evidence (narration-region match only); confirm before import",
    };
  }

  return {
    bankId: best.bankId,
    evidence: [best.evidence],
    alternatives: hits.slice(1, 4).map((h) => ({ bankId: h.bankId, evidence: h.evidence })),
    needsConfirmation: false,
    reason: "Issuer detected from header/footer branding",
  };
}

export interface AccountMaskMatch {
  last4: string;
  mask: string;
  ambiguous: boolean;
  reason: string;
}

/**
 * last4 is never a globally unique identity.
 */
export function evaluateAccountMaskCollision(
  candidateLast4: string | null,
  ownedAccounts: Array<{ id: string; name: string; last4?: string | null }>,
): AccountMaskMatch | null {
  if (!candidateLast4 || !/^\d{4}$/.test(candidateLast4)) return null;
  const matches = ownedAccounts.filter((a) => a.last4 === candidateLast4);
  if (matches.length === 0) {
    return { last4: candidateLast4, mask: `****${candidateLast4}`, ambiguous: true, reason: "No owned account matches last4" };
  }
  if (matches.length > 1) {
    return {
      last4: candidateLast4,
      mask: `****${candidateLast4}`,
      ambiguous: true,
      reason: "Multiple owned accounts share the same last4; user confirmation required",
    };
  }
  return {
    last4: candidateLast4,
    mask: `****${candidateLast4}`,
    ambiguous: false,
    reason: `Single owned account matches last4 (${matches[0].name})`,
  };
}

export function extractAccountMasksFromText(text: string): string[] {
  const masks = new Set<string>();
  const re = /(?:X{2,}|\*{2,}|\u2022{2,}|\d*X+\d*|\d*\*+\d*)(\d{4})\b/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) masks.add(m[1]);
  return [...masks];
}
