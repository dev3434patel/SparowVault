/**
 * vNext Phase D — Allocate card payments to statements.
 */

import type { CardPaymentAllocation, CardStatement, Transaction } from "@/types";
import { transactionAmountPaise } from "@/utils/money";

export interface PaymentAllocationResult {
  allocations: CardPaymentAllocation[];
  unallocatedPaise: number;
}

/** FIFO allocate payments against statement closing balance. */
export function allocatePaymentsToStatement(
  statement: CardStatement,
  payments: Transaction[],
  userId: string,
): PaymentAllocationResult {
  let remaining = statement.closingBalancePaise;
  const allocations: PaymentAllocationResult["allocations"] = [];
  for (const p of payments) {
    if (p.isDeleted === 1 || p.userId !== userId || p.type !== "cc_payment") continue;
    if (p.linkedCardId !== statement.cardId) continue;
    const amt = transactionAmountPaise(p);
    if (amt <= 0 || remaining <= 0) continue;
    const applied = Math.min(amt, remaining);
    allocations.push({
      id: `cpa_${p.id}`,
      userId,
      cardId: statement.cardId,
      statementId: statement.id,
      transactionId: p.id,
      amountPaise: applied,
      allocatedAt: p.date,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
      isDeleted: 0,
      version: 1,
      tags: [],
      notes: "",
    });
    remaining -= applied;
  }
  const totalPaid = allocations.reduce((s, a) => s + a.amountPaise, 0);
  const totalPayment = payments
    .filter((p) => p.linkedCardId === statement.cardId && p.type === "cc_payment")
    .reduce((s, p) => s + transactionAmountPaise(p), 0);
  return { allocations, unallocatedPaise: Math.max(0, totalPayment - totalPaid) };
}
