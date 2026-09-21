import type { Transaction } from "@/types";
import { transactionAmountPaise } from "@/utils/money";

export const isExpenseContribution = (tx: Pick<Transaction, "type" | "transactionIntent">) =>
  tx.type === "refund" && tx.transactionIntent === "expense_contribution";

export function expenseRecovery(original: Transaction, transactions: Transaction[], omitId?: string) {
  let contributionPaise = 0, refundPaise = 0;
  for (const tx of transactions) {
    if (tx.isDeleted === 1 || tx.id === omitId || tx.userId !== original.userId || tx.type !== "refund" || tx.linkedOriginalTransactionId !== original.id) continue;
    if (isExpenseContribution(tx)) contributionPaise += transactionAmountPaise(tx);
    else refundPaise += transactionAmountPaise(tx);
  }
  const grossPaise = transactionAmountPaise(original);
  return { grossPaise, contributionPaise, refundPaise, recoveredPaise: contributionPaise + refundPaise, remainingPaise: Math.max(0, grossPaise - contributionPaise - refundPaise) };
}

export function contributionError(tx: Pick<Transaction, "id" | "userId" | "type" | "transactionIntent" | "linkedOriginalTransactionId" | "amount" | "amountPaise" | "date" | "categoryId" | "businessOrPersonal" | "paymentMode">, transactions: Transaction[]): string | null {
  if (tx.transactionIntent !== "expense_contribution") return null;
  if (tx.type !== "refund" || tx.paymentMode === "credit_card") return "Contributions must be received into a cash or bank account.";
  const original = transactions.find(t => t.id === tx.linkedOriginalTransactionId && t.userId === tx.userId && t.type === "expense" && !t.isDeleted);
  if (!original || original.id === tx.id) return "Select an active original expense.";
  if (original.isReimbursable === 1) return "Use the reimbursement workflow for this receivable expense.";
  if (original.businessOrPersonal === "mixed") return "Mixed expenses need an explicit allocation before a contribution can be recorded.";
  if (tx.categoryId !== original.categoryId || tx.businessOrPersonal !== original.businessOrPersonal) return "Contribution category and scope must match the original expense.";
  if (tx.date.slice(0, 10) < original.date.slice(0, 10)) return "Contribution cannot precede the original expense.";
  if (transactionAmountPaise(tx) > expenseRecovery(original, transactions, tx.id).remainingPaise) return "Contribution exceeds the unrecovered expense amount.";
  return null;
}
