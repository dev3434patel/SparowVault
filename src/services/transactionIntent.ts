/**
 * vNext — User-facing transaction intent mapped to canonical TransactionType.
 */

import type {
  IncomingIntent,
  OutgoingIntent,
  TransactionIntent,
  TransactionType,
} from "@/types";

export type { IncomingIntent, OutgoingIntent, TransactionIntent };

const OUTGOING_TO_TYPE: Record<OutgoingIntent, TransactionType> = {
  purchase_expense: "expense",
  self_transfer: "transfer",
  credit_card_bill: "cc_payment",
  loan_emi_payment: "emi_payment",
  invest_or_save: "investment_contribution",
  lend_udhari: "udhari_given",
  repay_borrowed: "udhari_repay",
  refundable_deposit: "expense",
  gift_expense: "expense",
  cash_withdrawal: "transfer",
  cash_deposit: "transfer",
  other_outgoing: "expense",
};

const INCOMING_TO_TYPE: Record<IncomingIntent, TransactionType> = {
  salary_income: "income",
  interest_dividend_income: "income",
  transfer_from_own: "transfer",
  purchase_refund: "refund",
  credit_card_refund: "refund",
  reimbursement: "income",
  expense_contribution: "refund",
  loan_received: "loan_disbursement",
  udhari_repayment: "udhari_collect",
  investment_redemption: "investment_sell",
  deposit_returned: "refund",
  cashback_reward: "income",
  gift_received: "income",
  other_incoming: "income",
};

export function intentToTransactionType(intent: TransactionIntent): TransactionType {
  if (intent in OUTGOING_TO_TYPE) {
    return OUTGOING_TO_TYPE[intent as OutgoingIntent];
  }
  return INCOMING_TO_TYPE[intent as IncomingIntent];
}

export function isOutgoingIntent(intent: TransactionIntent): intent is OutgoingIntent {
  return intent in OUTGOING_TO_TYPE;
}

export function transactionTypeToDefaultIntent(type: TransactionType): TransactionIntent | null {
  switch (type) {
    case "expense":
      return "purchase_expense";
    case "income":
      return "salary_income";
    case "transfer":
      return "self_transfer";
    case "cc_payment":
      return "credit_card_bill";
    case "emi_payment":
      return "loan_emi_payment";
    case "loan_disbursement":
      return "loan_received";
    case "refund":
      return "purchase_refund";
    case "udhari_given":
      return "lend_udhari";
    case "udhari_collect":
      return "udhari_repayment";
    case "udhari_repay":
      return "repay_borrowed";
    case "investment_contribution":
      return "invest_or_save";
    case "investment_sell":
      return "investment_redemption";
    default:
      return null;
  }
}

export const OUTGOING_INTENT_LABELS: Record<OutgoingIntent, string> = {
  purchase_expense: "I bought or paid for something",
  self_transfer: "I moved money to my own account",
  credit_card_bill: "I paid my credit-card bill",
  loan_emi_payment: "I paid a loan or EMI",
  invest_or_save: "I invested or saved money",
  lend_udhari: "I lent money to someone",
  repay_borrowed: "I paid back money I borrowed",
  refundable_deposit: "I paid a refundable or security deposit",
  gift_expense: "I gave money or a gift",
  cash_withdrawal: "I withdrew cash from my bank",
  cash_deposit: "I deposited cash into my bank",
  other_outgoing: "Other",
};

export const INCOMING_INTENT_LABELS: Record<IncomingIntent, string> = {
  salary_income: "Salary / business / freelance income",
  interest_dividend_income: "Interest / dividend / pension / rent",
  transfer_from_own: "Transfer from my own account",
  purchase_refund: "Purchase refund",
  credit_card_refund: "Credit-card refund",
  reimbursement: "Reimbursement from employer or other",
  expense_contribution: "Contribution returned for a shared expense",
  loan_received: "Loan received",
  udhari_repayment: "Someone repaid money I lent",
  investment_redemption: "Investment redemption",
  deposit_returned: "Refundable deposit returned",
  cashback_reward: "Cashback or reward",
  gift_received: "Gift received",
  other_incoming: "Other",
};

import type { PaymentChannel, PaymentMode, FundingInstrument } from "@/types";

/** Infer channel + instrument from legacy paymentMode when not explicitly set. */
export function inferChannelAndInstrument(paymentMode: PaymentMode): {
  paymentChannel: PaymentChannel;
  fundingInstrument: FundingInstrument;
} {
  switch (paymentMode) {
    case "cash":
      return { paymentChannel: "cash", fundingInstrument: "cash_account" };
    case "upi":
      return { paymentChannel: "upi", fundingInstrument: "bank_account" };
    case "credit_card":
      return { paymentChannel: "card_online", fundingInstrument: "credit_card" };
    case "debit_card":
      return { paymentChannel: "card_pos", fundingInstrument: "debit_card_linked_bank" };
    case "wallet":
      return { paymentChannel: "wallet", fundingInstrument: "wallet_account" };
    case "bank_transfer":
      return { paymentChannel: "neft", fundingInstrument: "bank_account" };
    case "cheque":
      return { paymentChannel: "cheque", fundingInstrument: "bank_account" };
    case "auto_debit":
      return { paymentChannel: "auto_debit", fundingInstrument: "bank_account" };
    default:
      return { paymentChannel: "other", fundingInstrument: "other" };
  }
}
