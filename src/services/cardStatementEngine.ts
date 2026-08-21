/**
 * vNext Phase D — Statement cycle aggregation per card.
 */

import { parseISO } from "date-fns";
import type { Card, CardStatement, Transaction } from "@/types";
import { transactionAmountPaise } from "@/utils/money";
import {
  calculateMinimumDue,
  calculateStatementWindow,
  lastStatementDateForCard,
} from "@/services/cardEngine";

export function buildOpenCardStatement(
  card: Card,
  txs: Transaction[],
  today = new Date(),
): CardStatement {
  const { cycleStart, cycleEnd, lastStatementDate } = calculateStatementWindow(card, today);
  const related = txs.filter(
    (t) => t.isDeleted !== 1 && t.userId === card.userId && t.linkedCardId === card.id,
  );
  let retail = 0;
  let credits = 0;
  let payments = 0;
  for (const t of related) {
    const d = parseISO(t.date);
    if (d < cycleStart || d > cycleEnd) continue;
    const amt = transactionAmountPaise(t);
    if (t.type === "expense") retail += amt;
    else if (t.type === "refund" && t.paymentMode === "credit_card") credits += amt;
    else if (t.type === "cc_payment") payments += amt;
  }
  const closing = Math.max(0, retail - credits - payments);
  return {
    id: `stmt_${card.id}_${lastStatementDate.toISOString().slice(0, 10)}`,
    userId: card.userId,
    cardId: card.id,
    cycleStartDate: cycleStart.toISOString().slice(0, 10),
    cycleEndDate: cycleEnd.toISOString().slice(0, 10),
    statementDate: lastStatementDate.toISOString().slice(0, 10),
    openingBalancePaise: 0,
    closingBalancePaise: closing,
    minimumDuePaise: calculateMinimumDue(closing),
    retailSpendPaise: retail,
    feesPaise: 0,
    interestPaise: 0,
    paymentsPaise: payments,
    creditsPaise: credits,
    status: "open",
    createdAt: today.toISOString(),
    updatedAt: today.toISOString(),
    isDeleted: 0,
    version: 1,
    tags: [],
    notes: "",
  };
}

export function remainingDuePaise(statement: CardStatement, extraPaymentsPaise = 0): number {
  return Math.max(0, statement.closingBalancePaise - statement.paymentsPaise - extraPaymentsPaise);
}

export function nextStatementCloseDate(card: Card, today = new Date()): Date {
  return lastStatementDateForCard(card, today);
}
