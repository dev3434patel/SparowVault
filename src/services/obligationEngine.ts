/**
 * vNext Phase F — Unified obligations from recurring rules, loans, cards, EMI.
 */

import { addDays, parseISO } from "date-fns";
import type {
  Card,
  CardEmiInstallment,
  CardEmiPlan,
  CardStatement,
  EMIPayment,
  InsurancePolicy,
  Loan,
  Obligation,
  RecurringRule,
  UdhariRecord,
} from "@/types";
import { udhariRemainingPaise } from "@/services/udhariEngine";
import { readCardMoneyFact } from "@/services/statements/cardMoneyFact";
import { rupeesToPaise } from "@/utils/money";

function recurringRuleAmountPaise(r: RecurringRule): number {
  if (r.amountPaise != null && Number.isFinite(r.amountPaise)) return Math.round(r.amountPaise);
  return rupeesToPaise(r.amount);
}

export function obligationOccurrenceKey(sourceType: string, sourceId: string, expectedDate: string): string {
  return `${sourceType}:${sourceId}:${expectedDate}`;
}

function isoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Dates inside the horizon. A date is a due, not a posted expense. */
export function projectRecurringDates(rule: RecurringRule, today: Date, horizonDays: number): string[] {
  const lookAhead =
    rule.frequency === "weekly"
      ? Math.max(horizonDays, 84)
      : rule.frequency === "quarterly" || rule.frequency === "yearly"
        ? Math.max(horizonDays, 370)
        : horizonDays;
  const end = addDays(today, lookAhead);
  const dates: string[] = [];
  if (rule.frequency === "monthly" || rule.frequency === "quarterly" || rule.frequency === "yearly") {
    const step = rule.frequency === "yearly" ? 12 : rule.frequency === "quarterly" ? 3 : 1;
    const day = rule.dayOfMonth ?? parseISO(rule.nextRunDate).getDate();
    let cursor = new Date(today.getFullYear(), today.getMonth(), day);
    if (rule.frequency !== "monthly") {
      cursor = parseISO(rule.nextRunDate);
      while (cursor < today) cursor = new Date(cursor.getFullYear(), cursor.getMonth() + step, cursor.getDate());
    }
    while (cursor <= end) {
      if (cursor >= today) dates.push(isoDate(cursor));
      cursor = new Date(cursor.getFullYear(), cursor.getMonth() + step, day);
    }
    return dates;
  }
  if (rule.frequency === "weekly" || rule.frequency === "daily") {
    const step = rule.frequency === "daily" ? 1 : 7;
    let cursor = parseISO(rule.nextRunDate);
    if (Number.isNaN(cursor.getTime())) cursor = today;
    while (cursor < today) cursor = addDays(cursor, step);
    while (cursor <= end) {
      dates.push(isoDate(cursor));
      cursor = addDays(cursor, step);
    }
  }
  return dates;
}

export function materializeRecurringObligations(
  rules: RecurringRule[],
  userId: string,
  today = new Date(),
  horizonDays = 30,
): Obligation[] {
  const out: Obligation[] = [];
  for (const r of rules) {
    if (r.active !== 1 || r.isDeleted === 1 || r.userId !== userId) continue;
    for (const expectedDate of projectRecurringDates(r, today, horizonDays)) {
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
        notes: "scheduled-due",
      });
    }
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

function dueInHorizon(dueDate: string, today: Date, horizonDays: number): boolean {
  const due = dueDate.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(due)) return false;
  return due >= isoDate(today) && due <= isoDate(addDays(today, horizonDays));
}

function scheduledObligation(input: {
  userId: string;
  sourceType: Obligation["sourceType"];
  sourceId: string;
  title: string;
  dueDate: string;
  amountPaise: number;
  today: Date;
  cardId?: string;
}): Obligation {
  const dueDate = input.dueDate.slice(0, 10);
  const occurrenceKey = obligationOccurrenceKey(input.sourceType, input.sourceId, dueDate);
  const stamp = input.today.toISOString();
  return {
    id: occurrenceKey,
    userId: input.userId,
    sourceType: input.sourceType,
    sourceId: input.sourceId,
    occurrenceKey,
    title: input.title,
    dueDate,
    amountPaise: input.amountPaise,
    status: "due",
    cardId: input.cardId,
    createdAt: stamp,
    updatedAt: stamp,
    isDeleted: 0,
    version: 1,
    tags: [],
    notes: "scheduled-due",
  };
}

/** Payment date on or after the statement date. Uses the card due day when one is stored. */
export function statementPaymentDueDate(statementDate: string, dueDay?: number): string {
  const anchor = statementDate.slice(0, 10);
  if (!dueDay || dueDay < 1 || dueDay > 31) return anchor;
  const [year, month, day] = anchor.split("-").map(Number);
  const onDay = (y: number, monthIndex: number) => {
    const last = new Date(y, monthIndex + 1, 0).getDate();
    return new Date(y, monthIndex, Math.min(dueDay, last));
  };
  let due = onDay(year, month - 1);
  const anchorDate = new Date(year, month - 1, day);
  if (due < anchorDate) due = onDay(year, month);
  return isoDate(due);
}

function monthDueDates(dueDay: number, today: Date, horizonDays: number): string[] {
  const wanted = Math.min(31, Math.max(1, Math.trunc(dueDay) || 1));
  const end = isoDate(addDays(today, horizonDays));
  const start = isoDate(today);
  const dates: string[] = [];
  let year = today.getFullYear();
  let month = today.getMonth();
  for (let i = 0; i < 24; i += 1) {
    const last = new Date(year, month + 1, 0).getDate();
    const key = isoDate(new Date(year, month, Math.min(wanted, last)));
    if (key > end) break;
    if (key >= start) dates.push(key);
    month += 1;
    if (month > 11) {
      month = 0;
      year += 1;
    }
  }
  return dates;
}

/** Issuer or confirmed minimum. Unknown and printed zero do not fall back to the closing balance. */
export function cardStatementDuePaise(statement: CardStatement): number | null {
  const fact = readCardMoneyFact(statement, "minimumDue");
  if (fact.evidence === "not_observed" || fact.evidence === "estimated") return null;
  if (fact.valuePaise == null || fact.valuePaise <= 0) return null;
  return fact.valuePaise;
}

/** Saved card statement dues. A statement is not a new purchase or a bank payment. */
export function materializeCardStatementObligations(
  statements: CardStatement[],
  cards: Card[],
  userId: string,
  today = new Date(),
  horizonDays = 30,
): Obligation[] {
  const out: Obligation[] = [];
  for (const statement of statements) {
    if (statement.isDeleted === 1 || statement.userId !== userId || statement.status === "paid") continue;
    const fact = readCardMoneyFact(statement, "minimumDue");
    const confirmed = cardStatementDuePaise(statement);
    const unknownBalance = fact.evidence === "not_observed" && statement.closingBalancePaise > 0 ? statement.closingBalancePaise : null;
    const amountPaise = confirmed ?? unknownBalance;
    if (amountPaise == null || amountPaise <= 0) continue;
    const card = cards.find((row) => row.id === statement.cardId && row.isDeleted !== 1);
    const dueDate = statementPaymentDueDate(statement.statementDate, card?.dueDay);
    if (!dueInHorizon(dueDate, today, horizonDays)) continue;
    const baseTitle = card ? `${card.nickname} statement` : "Card statement";
    const title = unknownBalance != null ? `${baseTitle} (minimum due unknown)` : fact.needsReview ? `${baseTitle} (unconfirmed minimum)` : baseTitle;
    out.push(scheduledObligation({
      userId,
      sourceType: "card_statement",
      sourceId: statement.id,
      title,
      dueDate,
      amountPaise,
      today,
      cardId: statement.cardId,
    }));
  }
  return out;
}

/** Unpaid card EMI installments. Conversion already kept the purchase; this only lists the due. */
export function materializeCardEmiObligations(
  installments: CardEmiInstallment[],
  plans: CardEmiPlan[],
  userId: string,
  today = new Date(),
  horizonDays = 30,
): Obligation[] {
  const out: Obligation[] = [];
  for (const row of installments) {
    if (row.isDeleted === 1 || row.userId !== userId || row.status === "paid" || row.emiPaise <= 0) continue;
    if (!dueInHorizon(row.dueDate, today, horizonDays)) continue;
    const plan = plans.find((item) => item.id === row.planId && item.isDeleted !== 1);
    out.push(scheduledObligation({
      userId,
      sourceType: "card_emi",
      sourceId: row.id,
      title: `Card EMI ${row.installmentNo}`,
      dueDate: row.dueDate,
      amountPaise: row.emiPaise,
      today,
      cardId: plan?.cardId,
    }));
  }
  return out;
}

/** Open udhari with a due date. The remaining balance is not posted as an expense. */
export function materializeUdhariObligations(
  records: UdhariRecord[],
  userId: string,
  today = new Date(),
  horizonDays = 30,
): Obligation[] {
  const out: Obligation[] = [];
  for (const row of records) {
    if (row.isDeleted === 1 || row.userId !== userId) continue;
    if (row.status === "settled" || row.status === "written_off" || !row.dueDate) continue;
    const amountPaise = udhariRemainingPaise(row);
    if (amountPaise <= 0 || !dueInHorizon(row.dueDate, today, horizonDays)) continue;
    out.push(scheduledObligation({
      userId,
      sourceType: "udhari",
      sourceId: row.id,
      title: `${row.personName} udhari`,
      dueDate: row.dueDate,
      amountPaise,
      today,
    }));
  }
  return out;
}

/** Premium dates for an active policy. Saving the date does not pay the premium. */
export function materializeInsuranceObligations(
  policies: InsurancePolicy[],
  userId: string,
  today = new Date(),
  horizonDays = 30,
): Obligation[] {
  const out: Obligation[] = [];
  for (const policy of policies) {
    if (policy.isDeleted === 1 || policy.userId !== userId || policy.status !== "active") continue;
    if (policy.premiumPaise <= 0) continue;
    for (const dueDate of monthDueDates(policy.premiumDueDay, today, horizonDays)) {
      out.push(scheduledObligation({
        userId,
        sourceType: "insurance",
        sourceId: policy.id,
        title: `${policy.name} premium`,
        dueDate,
        amountPaise: policy.premiumPaise,
        today,
      }));
    }
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
