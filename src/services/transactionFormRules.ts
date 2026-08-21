/**
 * Phase 6 — Conditional required fields for transaction entry (client + mirrors server checks).
 */

import type { NeedWant, PaymentMode, PersonalBusiness, TransactionType } from "@/types";

export interface TransactionFormRuleState {
  date: string;
  type: TransactionType;
  amount: number | "";
  categoryId: string;
  accountId: string;
  toAccountId: string;
  linkedCardId: string;
  linkedLoanId: string;
  linkedGoalId: string;
  linkedUdhariId: string;
  linkedSavingsId: string;
  paymentMode: PaymentMode;
  merchantOrPerson: string;
  description: string;
  notes: string;
  tags: string[];
  billAvailable: 0 | 1;
  gstApplicable: 0 | 1;
  taxFlag: 0 | 1;
  businessOrPersonal: PersonalBusiness;
  needWant: NeedWant;
  fixedVariable: "fixed" | "variable" | "unassigned";
  plannedUnplanned: "planned" | "unplanned" | "unassigned";
}

/** Payment modes that move cash/bank for expenses (not credit_card). */
export const EXPENSE_CASH_LIKE_PAYMENT_MODES: PaymentMode[] = [
  "cash",
  "upi",
  "bank_transfer",
  "debit_card",
  "cheque",
  "wallet",
  "auto_debit",
  "other",
];

function needsCategory(type: TransactionType): boolean {
  return type === "income" || type === "expense" || type === "refund";
}

function trimPerson(s: string): boolean {
  return s.trim().length > 0;
}

/**
 * Field-level errors for Phase 6 rules (empty object means OK for this layer).
 * Call after Zod parse succeeds for amount/date/type/paymentMode enums.
 */
export function getTransactionFormPhase6Errors(
  state: TransactionFormRuleState,
): Record<string, string> {
  const e: Record<string, string> = {};
  const { type, paymentMode: pm } = state;

  if (needsCategory(type)) {
    if (!state.categoryId?.trim()) {
      e.categoryId = "Category is required";
    }
  }

  if (type === "expense") {
    if (pm === "credit_card") {
      if (!state.linkedCardId?.trim()) {
        e.linkedCardId = "Select the credit card used for this expense.";
      }
    } else if (EXPENSE_CASH_LIKE_PAYMENT_MODES.includes(pm)) {
      if (!state.accountId?.trim()) {
        e.accountId = "Select the account this money left from.";
      }
    }
  }

  if (type === "refund" && pm === "credit_card") {
    if (!state.linkedCardId?.trim()) {
      e.linkedCardId = "Select the credit card receiving this refund.";
    }
  }

  if (type === "refund" && EXPENSE_CASH_LIKE_PAYMENT_MODES.includes(pm)) {
    if (!state.accountId?.trim()) {
      e.accountId = "Select the account receiving this refund.";
    }
  }

  if (type === "transfer") {
    if (!state.accountId?.trim()) e.accountId = "Select the account to transfer from.";
    if (!state.toAccountId?.trim()) e.toAccountId = "Select the account to transfer to.";
    if (
      state.accountId &&
      state.toAccountId &&
      state.accountId === state.toAccountId
    ) {
      e.toAccountId = "You cannot transfer to the same account.";
    }
  }

  if (type === "emi_payment") {
    if (!state.linkedLoanId?.trim()) e.linkedLoanId = "Select the loan for this EMI payment.";
    if (!state.accountId?.trim()) e.accountId = "Select the payment account for this EMI.";
  }

  if (type === "loan_prepayment") {
    if (!state.linkedLoanId?.trim()) e.linkedLoanId = "Select the loan for this prepayment.";
    if (!state.accountId?.trim()) e.accountId = "Select the account paid from.";
  }

  if (type === "cc_payment") {
    if (!state.linkedCardId?.trim()) e.linkedCardId = "Select the credit card bill you are paying.";
    if (!state.accountId?.trim()) e.accountId = "Select the bank account used for this card payment.";
  }

  if (type === "savings_contribution") {
    if (!state.linkedGoalId?.trim()) e.linkedGoalId = "Select the goal for this contribution.";
    if (!state.accountId?.trim()) e.accountId = "Select the source account for this goal contribution.";
  }

  if (type === "goal_withdrawal") {
    if (!state.linkedGoalId?.trim()) e.linkedGoalId = "Select the goal for this withdrawal.";
    if (!state.accountId?.trim()) e.accountId = "Select the receiving account.";
  }

  if (type === "investment_contribution") {
    if (!state.linkedSavingsId?.trim()) e.linkedSavingsId = "Select the investment";
    if (!state.accountId?.trim()) e.accountId = "Select the source account";
  }

  if (type === "investment_sell") {
    if (!state.linkedSavingsId?.trim()) e.linkedSavingsId = "Select the investment";
    if (!state.accountId?.trim()) e.accountId = "Select the receiving account";
  }

  if (type === "udhari_given" || type === "udhari_received") {
    if (!state.linkedUdhariId?.trim()) {
      e.linkedUdhariId = "Select the udhari person for this entry.";
    }
    if (!state.accountId?.trim()) {
      e.accountId =
        type === "udhari_given"
          ? "Select the source account for this udhari given."
          : "Select the receiving account for this udhari received.";
    }
    if (!trimPerson(state.merchantOrPerson)) {
      e.merchantOrPerson = "Enter person or label for this entry";
    }
  }

  if (type === "udhari_collect" || type === "udhari_repay") {
    if (!state.linkedUdhariId?.trim()) {
      e.linkedUdhariId = "Select the udhari person being settled.";
    }
    if (!state.accountId?.trim()) {
      e.accountId =
        type === "udhari_collect"
          ? "Select the account receiving repayment"
          : "Select the account paying them back";
    }
    if (!trimPerson(state.merchantOrPerson)) {
      e.merchantOrPerson = "Enter person or label for this entry";
    }
  }

  if (type === "udhari_write_off") {
    if (!state.linkedUdhariId?.trim()) {
      e.linkedUdhariId = "Link the receivable udhari entry";
    }
    if (!state.categoryId?.trim()) {
      e.categoryId = "Pick an expense category (e.g. bad debt / loss)";
    }
  }

  if (type === "income" || (type === "refund" && pm !== "credit_card")) {
    if (!state.accountId?.trim()) e.accountId = "Select the receiving account";
  }

  if (type === "loan_disbursement") {
    if (!state.linkedLoanId?.trim()) e.linkedLoanId = "Select the loan";
    if (!state.accountId?.trim()) e.accountId = "Select the account receiving funds";
  }

  return e;
}

export function isTransactionFormPhase6Valid(state: TransactionFormRuleState): boolean {
  return Object.keys(getTransactionFormPhase6Errors(state)).length === 0;
}
