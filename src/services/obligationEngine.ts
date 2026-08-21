/**
 * vNext Phase F — Unified obligations from recurring rules, loans, cards, EMI.
 */

import { addDays, parseISO } from "date-fns";
import type { EMIPayment, Loan, Obligation, RecurringRule } from "@/types";
import { rupeesToPaise } from "@/utils/money";

function recurringRuleAmountPaise(r: RecurringRule): number {
  if (r.amountPaise != null && Number.isFinite(r.amountPaise)) return Math.round(r.amountPaise);
  return rupeesToPaise(r.amount);
}

export function obligationOccurrenceKey(sourceType: string, sourceId: string, expectedDate: string): string {
  return `${sourceType}:${sourceId}:${expectedDate}`;
}

export function materializeRecurringObligations(
  rules: RecurringRule[],
  userId: string,
  today = new Date(),
  horizonDays = 30,
): Obligation[] {
  const out: Obligation[] = [];
  const end = addDays(today, horizonDays);
  for (const r of rules) {
    if (r.active !== 1 || r.isDeleted === 1 || r.userId !== userId) continue;
    if (r.frequency !== "monthly") continue;
    const due = new Date(today.getFullYear(), today.getMonth(), r.dayOfMonth ?? 1);
    if (due < today || due > end) continue;
    const expectedDate = due.toISOString().slice(0, 10);
    out.push({
      id: obligationOccurrenceKey("recurring", r.id, expectedDate),
      userId,
      sourceType: "recurring_rule",
      sourceId: r.id,
      occurrenceKey: obligationOccurrenceKey("recurring", r.id, expectedDate),
      title: r.title,
      dueDate: expectedDate,
      amountPaise: recurringRuleAmountPaise(r),
      status: "due",
      categoryId: r.categoryId,
      accountId: r.accountId,
      createdAt: today.toISOString(),
      updatedAt: today.toISOString(),
      isDeleted: 0,
      version: 1,
      tags: [],
      notes: "",
    });
  }
  return out;
}

export function materializeLoanEmiObligations(
  loans: Loan[],
  emis: EMIPayment[],
  userId: string,
  today = new Date(),
  horizonDays = 30,
): Obligation[] {
  const out: Obligation[] = [];
  const end = addDays(today, horizonDays);
  for (const e of emis) {
    if (e.isDeleted === 1 || e.userId !== userId || e.status === "paid") continue;
    const due = parseISO(e.dueDate);
    if (due < today || due > end) continue;
    const loan = loans.find((l) => l.id === e.loanId);
    out.push({
      id: obligationOccurrenceKey("loan_emi", e.id, e.dueDate),
      userId,
      sourceType: "loan_emi",
      sourceId: e.id,
      occurrenceKey: obligationOccurrenceKey("loan_emi", e.id, e.dueDate),
      title: loan ? `${loan.lender} EMI` : "Loan EMI",
      dueDate: e.dueDate,
      amountPaise: e.amountPaise ?? 0,
      status: "due",
      createdAt: today.toISOString(),
      updatedAt: today.toISOString(),
      isDeleted: 0,
      version: 1,
      tags: [],
      notes: "",
    });
  }
  return out;
}

export function mergeObligationsUnique(existing: Obligation[], incoming: Obligation[]): Obligation[] {
  const map = new Map<string, Obligation>();
  for (const o of existing) map.set(o.occurrenceKey, o);
  for (const o of incoming) {
    if (!map.has(o.occurrenceKey)) map.set(o.occurrenceKey, o);
  }
  return [...map.values()].sort((a, b) => a.dueDate.localeCompare(b.dueDate));
}

export function obligationsDueBefore(
  obligations: Obligation[],
  beforeDate: Date,
): Obligation[] {
  return obligations.filter((o) => parseISO(o.dueDate) <= beforeDate && o.status !== "paid");
}

export function totalDuePaise(obligations: Obligation[]): number {
  return obligations.reduce((s, o) => s + (o.status === "paid" ? 0 : o.amountPaise), 0);
}

/** Aggregate next 7/30 day totals. */
export function obligationCalendarSummary(obligations: Obligation[], today = new Date()) {
  const d7 = addDays(today, 7);
  const d30 = addDays(today, 30);
  const next7 = obligationsDueBefore(obligations, d7);
  const next30 = obligationsDueBefore(obligations, d30);
  return {
    next7DaysPaise: totalDuePaise(next7),
    next30DaysPaise: totalDuePaise(next30),
    count7: next7.length,
    count30: next30.length,
  };
}
