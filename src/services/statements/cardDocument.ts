/**
 * Credit-card PDF statements are a separate document class.
 * Deposit-account running-balance formulas must not be applied blindly.
 */

export interface CardStatementHeader {
  issuerHint: string | null;
  statementDate: string | null;
  dueDate: string | null;
  minimumDuePaise: number | null;
  totalDuePaise: number | null;
  previousBalancePaise: number | null;
}

export interface CardStatementRow {
  id: string;
  bookingDate: string;
  narration: string;
  amountPaise: number;
  direction: "debit" | "credit";
  kindHint: "purchase" | "payment" | "interest" | "fee" | "refund" | "tax" | "other";
}

export interface CardStatementDocument {
  documentClass: "credit_card";
  header: CardStatementHeader;
  rows: CardStatementRow[];
  issues: string[];
  closingLiabilityPaise: number | null;
}

const CARD_HEADING = /credit\s+card\s+statement|minimum\s+(?:amount\s+)?due|total\s+amount\s+due/i;

export function isCreditCardStatementHeading(text: string): boolean {
  return CARD_HEADING.test(text);
}

export function routeStatementDocumentClass(text: string): "deposit_account" | "credit_card" | "unknown" {
  if (isCreditCardStatementHeading(text)) return "credit_card";
  if (/account\s+statement|savings\s+account|current\s+account|passbook/i.test(text)) return "deposit_account";
  return "unknown";
}

/**
 * Synthetic card arithmetic fixture (not an issuer-specific charge formula).
 * opening 1000 + purchases 500 + interest 20 - payment 800 - refund 100 = closing 620.
 */
export function parseSyntheticCardFixture(input: {
  previousBalancePaise: number;
  rows: CardStatementRow[];
}): CardStatementDocument {
  let liability = input.previousBalancePaise;
  const issues: string[] = [];
  for (const row of input.rows) {
    if (row.direction === "debit") liability += row.amountPaise;
    else liability -= row.amountPaise;
  }
  return {
    documentClass: "credit_card",
    header: {
      issuerHint: "synthetic",
      statementDate: null,
      dueDate: null,
      minimumDuePaise: null,
      totalDuePaise: liability > 0 ? liability : 0,
      previousBalancePaise: input.previousBalancePaise,
    },
    rows: input.rows,
    issues,
    closingLiabilityPaise: liability,
  };
}

/**
 * Bank EMI narration alone never proves principal/interest allocation.
 */
export function emiAllocationFromNarration(_narration: string): {
  status: "unavailable";
  reason: string;
} {
  return {
    status: "unavailable",
    reason: "Use lender schedule or user-confirmed allocation; never invent a split from narration",
  };
}

export function allocateEmiFromSchedule(input: {
  openingPrincipalPaise: number;
  annualRatePercent: number;
  paymentPaise: number;
  periodsPerYear?: number;
}): { interestPaise: number; principalPaise: number; source: "lender_schedule" } {
  const periods = input.periodsPerYear ?? 12;
  const interestPaise = Math.round((input.openingPrincipalPaise * input.annualRatePercent) / (100 * periods));
  const principalPaise = input.paymentPaise - interestPaise;
  if (principalPaise < 0) {
    throw new Error("Payment is smaller than computed interest for the stated schedule");
  }
  return { interestPaise, principalPaise, source: "lender_schedule" };
}
