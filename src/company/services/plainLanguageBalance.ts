import { createI18n, readStoredLocale, type MessagesByLocale } from "@/company/i18n/index";
import en from "@/company/i18n/locales/en.json";
import gu from "@/company/i18n/locales/gu.json";
import { formatMoney } from "@/utils/money";

function phrase(key: string, params?: Record<string, string | number>): string {
  const locale = typeof localStorage === "undefined" ? "en" : readStoredLocale();
  return createI18n({ locale, fallback: "en", messages: { en, gu } as MessagesByLocale }).t(key, params);
}

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
  const name = partyDisplayName.trim() || phrase("balance.party");
  if (signedBalancePaise === 0) {
    return {
      side: "settled",
      amountPaise: 0,
      sentence: phrase("balance.settledWith", { name }),
      shortLabel: phrase("balance.settled"),
    };
  }
  if (signedBalancePaise > 0) {
    return {
      side: "they_pay",
      amountPaise: signedBalancePaise,
      sentence: phrase("balance.theyPay", { name, amount: formatMoney(signedBalancePaise) }),
      shortLabel: phrase("balance.receivable"),
    };
  }
  const abs = Math.abs(signedBalancePaise);
  return {
    side: "you_pay",
    amountPaise: abs,
    sentence: phrase("balance.youPay", { name, amount: formatMoney(abs) }),
    shortLabel: phrase("balance.payable"),
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
