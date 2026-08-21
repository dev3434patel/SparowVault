/**
 * vNext Phase B — Named financial KPIs from ledger effects (single source of truth).
 */

import type { Account, FinancialEffect, FinancialEvent, Investment, Transaction } from "@/types";
import { accountOpeningBalancePaise, investmentTotalContributedPaise } from "@/utils/money";
import { computeAccountCashClosingPaise } from "@/services/accountBalanceEngine";
import {
  calculateCashflowView,
  calculateDebtPrincipalRepaidView,
  calculateDebtView,
  calculateExpenseView,
  calculateFinancingCostView,
  calculateIncomeView,
  calculateNetLiquidChangeView,
  calculateNetWorthView,
  calculateReceivablesPayables,
  hasUsableLedger,
} from "@/services/ledgerCalculations";
import { sumExpense, sumIncome } from "@/services/calculations";

export interface FinanceMonthKpis {
  trueIncomePaise: number;
  consumptionExpensePaise: number;
  operatingSurplusPaise: number;
  netLiquidChangePaise: number;
  debtPrincipalRepaidPaise: number;
  financingCostPaise: number;
  netWorthPaise: number;
  source: "ledger" | "transaction_fallback";
}

export interface FinanceMonthKpiExplain {
  kpis: FinanceMonthKpis;
  cashInflowPaise: number;
  cashOutflowPaise: number;
  receivablePaise: number;
  payablePaise: number;
  cardLiabilityPaise: number;
  loanPrincipalPaise: number;
}

export function calculateFinanceMonthKpis(
  events: FinancialEvent[],
  effects: FinancialEffect[],
  year: number,
  month1to12: number,
  fallbackTxs: Transaction[] = [],
): FinanceMonthKpis {
  if (hasUsableLedger(events, effects)) {
    const trueIncomePaise = calculateIncomeView(events, effects, year, month1to12);
    const consumptionExpensePaise = calculateExpenseView(events, effects, year, month1to12);
    return {
      trueIncomePaise,
      consumptionExpensePaise,
      operatingSurplusPaise: trueIncomePaise - consumptionExpensePaise,
      netLiquidChangePaise: calculateNetLiquidChangeView(events, effects, year, month1to12),
      debtPrincipalRepaidPaise: calculateDebtPrincipalRepaidView(events, effects, year, month1to12),
      financingCostPaise: calculateFinancingCostView(events, effects, year, month1to12),
      netWorthPaise: calculateNetWorthView(effects),
      source: "ledger",
    };
  }
  const trueIncomePaise = sumIncome(fallbackTxs);
  const consumptionExpensePaise = sumExpense(fallbackTxs);
  return {
    trueIncomePaise,
    consumptionExpensePaise,
    operatingSurplusPaise: trueIncomePaise - consumptionExpensePaise,
    netLiquidChangePaise: 0,
    debtPrincipalRepaidPaise: 0,
    financingCostPaise: 0,
    netWorthPaise: 0,
    source: "transaction_fallback",
  };
}

export function explainFinanceMonthKpis(
  events: FinancialEvent[],
  effects: FinancialEffect[],
  year: number,
  month1to12: number,
  fallbackTxs: Transaction[] = [],
): FinanceMonthKpiExplain {
  const kpis = calculateFinanceMonthKpis(events, effects, year, month1to12, fallbackTxs);
  const cash = calculateCashflowView(events, effects, year, month1to12);
  const recPay = calculateReceivablesPayables(effects);
  const debt = calculateDebtView(effects);
  return {
    kpis,
    cashInflowPaise: cash.inflowPaise,
    cashOutflowPaise: cash.outflowPaise,
    receivablePaise: recPay.receivablePaise,
    payablePaise: recPay.payablePaise,
    cardLiabilityPaise: debt.cardLiabilityPaise,
    loanPrincipalPaise: debt.loanPrincipalPaise,
  };
}

/** Operating surplus rate = operating surplus / true income. */
export function operatingSurplusRate(operatingSurplusPaise: number, trueIncomePaise: number): number {
  if (!trueIncomePaise) return 0;
  return Math.round((operatingSurplusPaise / trueIncomePaise) * 10000) / 100;
}

/** Consolidated net worth from account openings + ledger effects + investment contributions. */
export function calculateConsolidatedNetWorthPaise(
  accounts: Account[],
  investments: Investment[],
  effects: FinancialEffect[],
  txs: Transaction[],
): number {
  let assets = 0;
  for (const a of accounts) {
    if (a.isDeleted === 1 || a.isInactive === 1) continue;
    assets += computeAccountCashClosingPaise(
      a.id,
      accountOpeningBalancePaise(a),
      txs.filter((t) => t.isDeleted !== 1),
    );
  }
  for (const inv of investments) {
    if (inv.status !== "active" || inv.isDeleted === 1) continue;
    assets += investmentTotalContributedPaise(inv);
  }
  const debt = calculateDebtView(effects);
  const recPay = calculateReceivablesPayables(effects);
  assets += recPay.receivablePaise;
  const liabilities =
    debt.cardLiabilityPaise + debt.loanPrincipalPaise + recPay.payablePaise;
  return assets - liabilities;
}
