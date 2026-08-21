import { parseISO } from "date-fns";
import type { EMIPayment, Loan, Transaction } from "@/types";
import { emiRepo } from "@/repositories";
import {
  buildAmortizationSchedule,
  openingPrincipalForScheduleMonthPaise,
  openingPrincipalForSchedulePaise,
  splitPaymentPrincipalInterest,
} from "@/services/loanEngine";
import {
  emiPaymentAmountPaise,
  paiseToRupees,
  transactionAmountPaise,
} from "@/utils/money";

function pickClosestEmiRow(
  pool: EMIPayment[],
  paymentLocalIsoDate: string,
): EMIPayment | null {
  if (!pool.length) return null;
  const target = parseISO(`${paymentLocalIsoDate.slice(0, 10)}T12:00:00`);
  const scored = pool
    .map((row) => {
      let d = 999999999;
      try {
        d = Math.abs(parseISO(row.dueDate).getTime() - target.getTime());
      } catch {
        /* ignore */
      }
      return { row, d };
    })
    .sort((a, b) => a.d - b.d);
  return scored[0]?.row ?? null;
}

function monthIndexForEmiRow(row: EMIPayment, schedule: ReturnType<typeof buildAmortizationSchedule>): number {
  const ym = row.dueDate.slice(0, 7);
  const idx = schedule.findIndex((r) => r.dueDate.slice(0, 7) === ym);
  if (idx >= 0) return idx + 1;
  return 1;
}

/**
 * After an EMI transaction is saved, update the closest EMIPayment row with paid amounts,
 * principal/interest split, optional penalty/fee, and link transactionId.
 */
export async function syncEmiPaymentFromTransaction(
  tx: Transaction,
  loan: Loan,
  emis: EMIPayment[],
): Promise<EMIPayment | null> {
  if (tx.type !== "emi_payment" || !tx.linkedLoanId || tx.linkedLoanId !== loan.id) {
    return null;
  }
  const pool = emis.filter((e) => e.loanId === loan.id && e.isDeleted !== 1);
  const row = pickClosestEmiRow(pool, tx.date);
  if (!row?.id) return null;

  const amt = transactionAmountPaise(tx);
  const schedule = buildAmortizationSchedule(loan);
  const opening0 = openingPrincipalForSchedulePaise(loan);
  const mi = monthIndexForEmiRow(row, schedule);
  const opening = openingPrincipalForScheduleMonthPaise(schedule, mi, opening0);

  const penaltyPaise =
    typeof row.penaltyPaise === "number" && Number.isInteger(row.penaltyPaise) ? row.penaltyPaise : 0;
  const feePaise =
    typeof row.feePaise === "number" && Number.isInteger(row.feePaise) ? row.feePaise : 0;

  const split = splitPaymentPrincipalInterest(opening, amt, loan.annualInterestRate, {
    penaltyPaise,
    feePaise,
  });

  const dueAmt = emiPaymentAmountPaise(row);
  const paid = amt;
  const status: EMIPayment["status"] =
    paid >= dueAmt ? "paid" : paid > 0 ? "partial" : row.status;

  const towardPrincipal = split.principalPaise + split.extraPrincipalPaise;
  const closingPrincipal = Math.max(0, opening - towardPrincipal);

  const patch: Partial<EMIPayment> = {
    paidDate: tx.date,
    amountPaidPaise: paid,
    amountPaid: paiseToRupees(paid),
    principalComponentPaise: towardPrincipal,
    principalComponent: paiseToRupees(towardPrincipal),
    interestComponentPaise: split.interestPaise,
    interestComponent: paiseToRupees(split.interestPaise),
    penaltyPaise: split.penaltyPaise,
    feePaise: split.feePaise,
    extraPrincipalPaise: split.extraPrincipalPaise,
    openingPrincipalPaise: opening,
    closingPrincipalPaise: closingPrincipal,
    transactionId: tx.id,
    status,
    updatedAt: new Date().toISOString(),
  };

  const updated = await emiRepo.update(row.id, patch);
  return updated ?? null;
}
