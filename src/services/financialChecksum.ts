/**
 * Financial checksum — migration / sync / backup integrity fingerprint.
 */
import type { FinancialEffect, FinancialEvent, Transaction } from "@/types";
import { calculateExpenseView, calculateIncomeView } from "@/services/ledgerCalculations";
import { transactionAmountPaise } from "@/utils/money";

export interface FinancialChecksum {
  transactionCount: number;
  eventCount: number;
  effectCount: number;
  incomePaise: number;
  consumptionExpensePaise: number;
  cashMovementProxyPaise: number;
  cardLiabilityPaise: number;
  loanPrincipalPaise: number;
  investmentAssetPaise: number;
  receivablePaise: number;
  payablePaise: number;
  netWorthProxyPaise: number;
}

export function buildFinancialChecksum(input: {
  transactions: Transaction[];
  events: FinancialEvent[];
  effects: FinancialEffect[];
  year?: number;
  month?: number;
}): FinancialChecksum {
  const txs = input.transactions.filter((t) => t.isDeleted !== 1);
  const effects = input.effects;
  const events = input.events;
  const year = input.year ?? 2026;
  const month = input.month ?? 1;

  let cardLiabilityPaise = 0;
  let loanPrincipalPaise = 0;
  let investmentAssetPaise = 0;
  let receivablePaise = 0;
  let payablePaise = 0;
  let cashMovementProxyPaise = 0;

  for (const e of effects) {
    const signed = e.effectDirection === "increase" ? e.amountPaise : -e.amountPaise;
    if (e.targetType === "credit_card" || e.targetType === "card_emi_plan") {
      cardLiabilityPaise += signed;
    } else if (e.targetType === "loan") {
      loanPrincipalPaise += signed;
    } else if (e.targetType === "investment") {
      investmentAssetPaise += signed;
    } else if (e.targetType === "udhari_person") {
      // Net signed direction encodes receivable (+) vs payable (-) at effect build time.
      if (signed >= 0) receivablePaise += signed;
      else payablePaise += -signed;
    } else if (e.targetType === "account") {
      cashMovementProxyPaise += signed;
    }
  }

  const assets = cashMovementProxyPaise + investmentAssetPaise + receivablePaise;
  const liabilities = cardLiabilityPaise + loanPrincipalPaise + payablePaise;

  return {
    transactionCount: txs.length,
    eventCount: events.length,
    effectCount: effects.length,
    incomePaise: calculateIncomeView(events, effects, year, month),
    consumptionExpensePaise: calculateExpenseView(events, effects, year, month),
    cashMovementProxyPaise,
    cardLiabilityPaise,
    loanPrincipalPaise,
    investmentAssetPaise,
    receivablePaise,
    payablePaise,
    netWorthProxyPaise: assets - liabilities,
  };
}

export function checksumsEqual(a: FinancialChecksum, b: FinancialChecksum): boolean {
  const keys = Object.keys(a) as (keyof FinancialChecksum)[];
  return keys.every((k) => a[k] === b[k]);
}

export function sumActiveTransactionPaise(txs: Transaction[]): number {
  return txs.filter((t) => t.isDeleted !== 1).reduce((s, t) => s + transactionAmountPaise(t), 0);
}
