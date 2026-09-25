import { formatMoney } from "@/utils/money";

export type PlainBalanceSide = "you_pay" | "they_pay" | "settled";

export interface PlainLanguageBalance {
  side: PlainBalanceSide;
  /** Absolute outstanding in paise. */
  amountPaise: number;
  sentence: string;
  shortLabel: string;
}

/**
 * Convert a signed party balance to plain language.
 * Positive balance = party owes company (receivable).
 * Negative balance = company owes party (payable).
 */
export function plainLanguageBalance(
  partyDisplayName: string,
  signedBalancePaise: number,
): PlainLanguageBalance {
  const name = partyDisplayName.trim() || "Party";
  if (signedBalancePaise === 0) {
    return {
      side: "settled",
      amountPaise: 0,
      sentence: `Settled with ${name}`,
      shortLabel: "Settled",
    };
  }
  if (signedBalancePaise > 0) {
    return {
      side: "they_pay",
      amountPaise: signedBalancePaise,
      sentence: `${name} has to pay you: ${formatMoney(signedBalancePaise)}`,
      shortLabel: "Receivable",
    };
  }
  const abs = Math.abs(signedBalancePaise);
  return {
    side: "you_pay",
    amountPaise: abs,
    sentence: `You have to pay ${name}: ${formatMoney(abs)}`,
    shortLabel: "Payable",
  };
}

/** Relationship-wise: liability/payable credit balance → you pay; asset/receivable debit → they pay. */
export function plainLanguageFromRelationship(
  partyDisplayName: string,
  relationshipNetDebitPaise: number,
  relationshipKind: "receivable_or_advance" | "payable_or_loan",
): PlainLanguageBalance {
  if (relationshipKind === "payable_or_loan") {
    // Credit balance (negative debit-net) means you owe them
    return plainLanguageBalance(partyDisplayName, -relationshipNetDebitPaise);
  }
  return plainLanguageBalance(partyDisplayName, relationshipNetDebitPaise);
}
