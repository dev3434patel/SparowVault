/**
 * Phase 6 — Account cash/bank balance engine + categorised breakdown.
 * Credit-card purchases must NOT reduce account cash (matches deriveAccountBalance).
 */

import type { Transaction } from "@/types";
import { transactionAmountPaise } from "@/utils/money";

function isCashInflow(t: Transaction): boolean {
  return ["income", "refund", "udhari_received", "loan_disbursement", "udhari_collect"].includes(
    t.type,
  );
}

function isCashOutflow(t: Transaction): boolean {
  return [
    "expense",
    "emi_payment",
    "cc_payment",
    "udhari_given",
    "udhari_repay",
    "savings_contribution",
    "investment_contribution",
    "transfer",
  ].includes(t.type);
}

export interface AccountBalanceBreakdown {
  accountId: string;
  openingPaise: number;
  cashBankIncomePaise: number;
  cashBankExpensePaise: number;
  transferInPaise: number;
  transferOutPaise: number;
  cardBillPaymentsPaise: number;
  emiPaymentsPaise: number;
  udhariGivenPaise: number;
  udhariReceivedPaise: number;
  udhariCollectPaise: number;
  udhariRepayPaise: number;
  goalContributionsPaise: number;
  investmentContributionsPaise: number;
  loanDisbursementPaise: number;
  adjustmentsPaise: number;
  closingPaise: number;
}

function emptyBreakdown(accountId: string, openingPaise: number): AccountBalanceBreakdown {
  return {
    accountId,
    openingPaise,
    cashBankIncomePaise: 0,
    cashBankExpensePaise: 0,
    transferInPaise: 0,
    transferOutPaise: 0,
    cardBillPaymentsPaise: 0,
    emiPaymentsPaise: 0,
    udhariGivenPaise: 0,
    udhariReceivedPaise: 0,
    udhariCollectPaise: 0,
    udhariRepayPaise: 0,
    goalContributionsPaise: 0,
    investmentContributionsPaise: 0,
    loanDisbursementPaise: 0,
    adjustmentsPaise: 0,
    closingPaise: openingPaise,
  };
}

/**
 * Canonical closing cash balance for an account from transactions (non-deleted only).
 */
export function computeAccountCashClosingPaise(
  accountId: string,
  openingBalancePaise: number,
  txs: Transaction[],
): number {
  const b = computeAccountBalanceBreakdown(accountId, openingBalancePaise, txs);
  return b.closingPaise;
}

/**
 * Opening balance + component deltas that explain closing cash for this account.
 */
export function computeAccountBalanceBreakdown(
  accountId: string,
  openingBalancePaise: number,
  txs: Transaction[],
): AccountBalanceBreakdown {
  const b = emptyBreakdown(accountId, openingBalancePaise);
  let bal = openingBalancePaise;

  for (const t of txs) {
    if (t.isDeleted === 1) continue;
    const amt = transactionAmountPaise(t);

    if (t.accountId === accountId) {
      if (isCashInflow(t)) {
        bal += amt;
        if (t.type === "loan_disbursement") b.loanDisbursementPaise += amt;
        else if (t.type === "udhari_received") b.udhariReceivedPaise += amt;
        else if (t.type === "udhari_collect") b.udhariCollectPaise += amt;
        else b.cashBankIncomePaise += amt;
      } else if (t.type === "expense" && t.paymentMode === "credit_card") {
        // Liability on card; bank/cash unchanged.
      } else if (isCashOutflow(t)) {
        bal -= amt;
        if (t.type === "transfer") b.transferOutPaise += amt;
        else if (t.type === "cc_payment") b.cardBillPaymentsPaise += amt;
        else if (t.type === "emi_payment") b.emiPaymentsPaise += amt;
        else if (t.type === "udhari_given") b.udhariGivenPaise += amt;
        else if (t.type === "udhari_repay") b.udhariRepayPaise += amt;
        else if (t.type === "savings_contribution") b.goalContributionsPaise += amt;
        else if (t.type === "investment_contribution") b.investmentContributionsPaise += amt;
        else if (t.type === "expense") b.cashBankExpensePaise += amt;
        else b.cashBankExpensePaise += amt;
      } else if (t.type === "adjustment") {
        bal += amt;
        b.adjustmentsPaise += amt;
      }
    }

    if (t.toAccountId === accountId && t.type === "transfer") {
      bal += amt;
      b.transferInPaise += amt;
    }
  }

  b.closingPaise = bal;
  return b;
}
