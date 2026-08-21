/**
 * Phase 15 — CA-grade reports.
 *
 * Every report is a pure function (Transactions + Accounts + Cards + Loans +
 * Udhari + Goals + FinancialEvents/Effects) → rows. UI/Excel exporter wraps
 * them. All money is in paise. View separation honours Phase 5 rules:
 *
 *   - Expense report           : excludes credit-card bill payments
 *   - Cashflow report          : includes them
 *   - Net-worth                : assets vs liabilities
 *   - Loan amortization        : per-month schedule from loanEngine
 *
 * The point of this module is to keep report logic single-sourced so the
 * Excel export, the on-screen drilldown, and the AI suggestion engine all
 * agree on what a "business expense" looks like.
 */

import type {
  Account,
  Card,
  EMIPayment,
  Category,
  FinancialEffect,
  FinancialEvent,
  Goal,
  Loan,
  Transaction,
  UdhariRecord,
} from "@/types";
import {
  accountOpeningBalancePaise,
  loanEmiPaise,
  loanOutstandingPrincipalPaise,
  paiseToRupees,
  transactionAmountPaise,
  udhariAmountPaise,
  udhariSettledPaise,
} from "@/utils/money";
import { splitTransaction, sumSplit } from "@/services/businessPersonalSplit";
import { amortizationSchedule } from "@/services/calculations";

export interface ReportContext {
  txs: Transaction[];
  events: FinancialEvent[];
  effects: FinancialEffect[];
  accounts: Account[];
  cards: Card[];
  loans: Loan[];
  emis?: EMIPayment[];
  goals: Goal[];
  udharis: UdhariRecord[];
  categories: Category[];
}

const isLive = <T extends { isDeleted?: number }>(x: T) => x.isDeleted !== 1;

function cardDisplayName(card: Card): string {
  return card.nickname || [card.bank, card.last4 ? `****${card.last4}` : ""].filter(Boolean).join(" ") || card.id;
}

// ---------------------------------------------------------------------------
// 1. Transaction master
// ---------------------------------------------------------------------------
export interface TransactionMasterRow {
  date: string;
  localDate: string;
  transactionId: string;
  eventId: string;
  voucherRefId: string;
  voucherReferenceId: string;
  type: string;
  category: string;
  amountPaise: number;
  amountRupees: number;
  account: string;
  card: string;
  loan: string;
  goal: string;
  person: string;
  merchantOrPerson: string;
  paymentMode: string;
  taxFlag: 0 | 1;
  gstFlag: 0 | 1;
  billAvailable: 0 | 1;
  billAttachmentId: string;
  attachmentReference: string;
  gstin: string;
  invoiceNumber: string;
  reimbursementStatus: string;
  recurring: 0 | 1;
  businessOrPersonal: string;
  splitBusinessPct: number;
  splitBusinessPaise: number;
  splitPersonalPaise: number;
  description: string;
  deletedStatus: "live" | "deleted";
  reversedStatus: "posted" | "reversed" | "needs_review" | "missing_event";
}

export function reportTransactionMaster(ctx: ReportContext): TransactionMasterRow[] {
  const catName = new Map(ctx.categories.map((c) => [c.id, c.name]));
  const accName = new Map(ctx.accounts.map((a) => [a.id, a.name]));
  const cardName = new Map(ctx.cards.map((c) => [c.id, cardDisplayName(c)]));
  const loanName = new Map(ctx.loans.map((l) => [l.id, l.name || l.lender || l.id]));
  const goalName = new Map(ctx.goals.map((g) => [g.id, g.title]));
  const udhariName = new Map(ctx.udharis.map((u) => [u.id, u.personName]));
  const eventByTx = new Map(ctx.events.map((e) => [e.sourceTransactionId, e]));
  return ctx.txs.map((t) => {
    const split = splitTransaction(t);
    const amountPaise = transactionAmountPaise(t);
    const event = eventByTx.get(t.id);
    const extra = t as {
      voucherRefId?: string;
      voucherReferenceId?: string;
      billAttachmentId?: string;
      attachmentReference?: string;
      gstin?: string;
      gstinOptional?: string;
      invoiceNumber?: string;
      reimbursementStatus?: string;
      splitBusinessPct?: number;
    };
    const splitBusinessPct = amountPaise > 0 ? Math.round((split.businessPaise / amountPaise) * 10000) / 100 : 0;
    return {
      date: t.date,
      localDate: t.date.slice(0, 10),
      transactionId: t.id,
      eventId: event?.id ?? "",
      voucherRefId: extra.voucherRefId ?? t.id,
      voucherReferenceId: extra.voucherReferenceId ?? extra.voucherRefId ?? t.id,
      type: t.type,
      category: t.categoryId ? (catName.get(t.categoryId) ?? "") : "",
      amountPaise,
      amountRupees: paiseToRupees(amountPaise),
      account: t.accountId ? (accName.get(t.accountId) ?? "") : "",
      card: (t as { linkedCardId?: string }).linkedCardId ? (cardName.get((t as { linkedCardId?: string }).linkedCardId!) ?? "") : "",
      loan: t.linkedLoanId ? (loanName.get(t.linkedLoanId) ?? "") : "",
      goal: t.linkedGoalId ? (goalName.get(t.linkedGoalId) ?? "") : "",
      person: t.linkedUdhariId ? (udhariName.get(t.linkedUdhariId) ?? t.merchantOrPerson ?? "") : (t.merchantOrPerson ?? ""),
      merchantOrPerson: t.merchantOrPerson ?? "",
      paymentMode: t.paymentMode,
      taxFlag: t.taxFlag,
      gstFlag: t.gstApplicable,
      billAvailable: t.billAvailable,
      billAttachmentId: extra.billAttachmentId ?? t.attachmentMetaId ?? "",
      attachmentReference: extra.attachmentReference ?? t.attachmentMetaId ?? "",
      gstin: extra.gstin ?? extra.gstinOptional ?? "",
      invoiceNumber: extra.invoiceNumber ?? "",
      reimbursementStatus: extra.reimbursementStatus ?? "not_applicable",
      recurring: (t as { recurringRuleId?: string }).recurringRuleId ? 1 : 0,
      businessOrPersonal: t.businessOrPersonal,
      splitBusinessPct,
      splitBusinessPaise: split.businessPaise,
      splitPersonalPaise: split.personalPaise,
      description: t.description ?? "",
      deletedStatus: t.isDeleted === 1 ? "deleted" : "live",
      reversedStatus: event?.status ?? "missing_event",
    };
  });
}

// ---------------------------------------------------------------------------
// 2. Monthly cashflow
// ---------------------------------------------------------------------------
export interface MonthlyCashflowRow {
  yyyymm: string;
  inflowsPaise: number;
  outflowsPaise: number;
  netPaise: number;
}

export function reportMonthlyCashflow(ctx: ReportContext): MonthlyCashflowRow[] {
  const byMonth = new Map<string, { inflows: number; outflows: number }>();
  for (const e of ctx.effects) {
    if (e.targetType !== "account") continue;
    // Need the event date — look up the event
    const ev = ctx.events.find((x) => x.id === e.eventId);
    if (!ev) continue;
    const month = ev.eventDate.slice(0, 7);
    const bucket = byMonth.get(month) ?? { inflows: 0, outflows: 0 };
    if (e.effectDirection === "increase") bucket.inflows += e.amountPaise;
    else bucket.outflows += e.amountPaise;
    byMonth.set(month, bucket);
  }
  return [...byMonth.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([yyyymm, b]) => ({
      yyyymm,
      inflowsPaise: b.inflows,
      outflowsPaise: b.outflows,
      netPaise: b.inflows - b.outflows,
    }));
}

// ---------------------------------------------------------------------------
// 3. Category ledger (expense view — EXCLUDES credit-card bill payments)
// ---------------------------------------------------------------------------
export interface CategoryLedgerRow {
  categoryId: string;
  categoryName: string;
  totalExpensePaise: number;
  txCount: number;
}

export function reportCategoryLedger(ctx: ReportContext): CategoryLedgerRow[] {
  const catName = new Map(ctx.categories.map((c) => [c.id, c.name]));
  const totals = new Map<string, { total: number; count: number }>();
  for (const e of ctx.effects) {
    if (e.targetType !== "expense_category") continue;
    if (e.component !== "expense" && e.component !== "interest") continue;
    const cur = totals.get(e.targetId) ?? { total: 0, count: 0 };
    cur.total += e.effectDirection === "decrease" ? -e.amountPaise : e.amountPaise;
    cur.count += 1;
    totals.set(e.targetId, cur);
  }
  return [...totals.entries()].map(([id, v]) => ({
    categoryId: id,
    categoryName: catName.get(id) ?? id,
    totalExpensePaise: v.total,
    txCount: v.count,
  })).sort((a, b) => b.totalExpensePaise - a.totalExpensePaise);
}

// ---------------------------------------------------------------------------
// 4. Account ledger
// ---------------------------------------------------------------------------
export interface AccountLedgerRow {
  accountId: string;
  accountName: string;
  inflowsPaise: number;
  outflowsPaise: number;
  netPaise: number;
}

export function reportAccountLedger(ctx: ReportContext): AccountLedgerRow[] {
  const name = new Map(ctx.accounts.map((a) => [a.id, a.name]));
  const totals = new Map<string, { in: number; out: number }>();
  for (const e of ctx.effects) {
    if (e.targetType !== "account") continue;
    const cur = totals.get(e.targetId) ?? { in: 0, out: 0 };
    if (e.effectDirection === "increase") cur.in += e.amountPaise;
    else cur.out += e.amountPaise;
    totals.set(e.targetId, cur);
  }
  return [...totals.entries()].map(([id, v]) => ({
    accountId: id,
    accountName: name.get(id) ?? id,
    inflowsPaise: v.in,
    outflowsPaise: v.out,
    netPaise: v.in - v.out,
  }));
}

// ---------------------------------------------------------------------------
// 5. Credit-card ledger
// ---------------------------------------------------------------------------
export interface CardLedgerRow {
  cardId: string;
  cardName: string;
  purchasesPaise: number;        // increase in liability
  paymentsPaise: number;         // decrease in liability
  netOutstandingChangePaise: number;
}

export function reportCardLedger(ctx: ReportContext): CardLedgerRow[] {
  const name = new Map(ctx.cards.map((c) => [c.id, cardDisplayName(c)]));
  const totals = new Map<string, { purchases: number; payments: number }>();
  for (const e of ctx.effects) {
    if (e.targetType !== "credit_card" || e.component !== "liability") continue;
    const cur = totals.get(e.targetId) ?? { purchases: 0, payments: 0 };
    if (e.effectDirection === "increase") cur.purchases += e.amountPaise;
    else cur.payments += e.amountPaise;
    totals.set(e.targetId, cur);
  }
  return [...totals.entries()].map(([id, v]) => ({
    cardId: id,
    cardName: name.get(id) ?? id,
    purchasesPaise: v.purchases,
    paymentsPaise: v.payments,
    netOutstandingChangePaise: v.purchases - v.payments,
  }));
}

// ---------------------------------------------------------------------------
// 6. Interest-paid summary
// ---------------------------------------------------------------------------
export interface InterestPaidRow {
  loanId: string;
  totalInterestPaise: number;
  totalPrincipalPaise: number;
}

export function reportInterestPaid(ctx: ReportContext): InterestPaidRow[] {
  const totals = new Map<string, { interest: number; principal: number }>();
  const loanByEvent = new Map<string, string>();
  for (const effect of ctx.effects) {
    if (effect.targetType === "loan" && effect.component === "principal") {
      loanByEvent.set(effect.eventId, effect.targetId);
    }
  }
  for (const e of ctx.effects) {
    const cur = totals.get(e.targetType === "loan" ? e.targetId : "") ?? { interest: 0, principal: 0 };
    if (e.targetType === "loan" && e.component === "principal" && e.effectDirection === "decrease") {
      cur.principal += e.amountPaise;
      totals.set(e.targetId, cur);
    } else if (e.component === "interest" && e.effectDirection === "increase") {
      const ev = ctx.events.find((x) => x.id === e.eventId);
      const loanId = ev?.eventType === "emi_payment" ? loanByEvent.get(e.eventId) ?? e.targetId : "_interest_pool";
      const c2 = totals.get(loanId) ?? { interest: 0, principal: 0 };
      c2.interest += e.amountPaise;
      totals.set(loanId, c2);
    }
  }
  return [...totals.entries()]
    .filter(([id]) => id !== "")
    .map(([loanId, v]) => ({ loanId, totalInterestPaise: v.interest, totalPrincipalPaise: v.principal }));
}

// ---------------------------------------------------------------------------
// 7. Udhari ageing report
// ---------------------------------------------------------------------------
export interface UdhariAgeingRow {
  udhariId: string;
  counterparty: string;
  direction: "given" | "received";
  outstandingPaise: number;
  ageDays: number;
  bucket: "0-7" | "8-30" | "31-90" | "90+";
}

export function reportUdhariAgeing(ctx: ReportContext, today = new Date()): UdhariAgeingRow[] {
  return ctx.udharis.filter(isLive).map((u) => {
    const outstanding = (u as { outstandingPaise?: number }).outstandingPaise ?? 0;
    const start = (u as { startDate?: string; date?: string }).startDate ?? (u as { date?: string }).date ?? today.toISOString().slice(0, 10);
    const ageDays = Math.max(0, Math.floor((today.getTime() - new Date(start).getTime()) / 86_400_000));
    const bucket: UdhariAgeingRow["bucket"] =
      ageDays <= 7  ? "0-7"  :
      ageDays <= 30 ? "8-30" :
      ageDays <= 90 ? "31-90" : "90+";
    return {
      udhariId: u.id,
      counterparty: (u as { personName?: string; counterparty?: string }).personName ?? (u as { counterparty?: string }).counterparty ?? "",
      direction: (u as { direction?: "given" | "received" }).direction ?? "given",
      outstandingPaise: outstanding,
      ageDays,
      bucket,
    };
  });
}

// ---------------------------------------------------------------------------
// 8. Business expense / personal expense reports
// ---------------------------------------------------------------------------
export function reportBusinessExpense(ctx: ReportContext) {
  const businessTxs = ctx.txs.filter(isLive).filter((t) =>
    t.type === "expense" && (t.businessOrPersonal === "business" || t.businessOrPersonal === "mixed")
  );
  const split = sumSplit(businessTxs);
  return {
    totalPaise: split.businessPaise,  // only the business portion
    txs: businessTxs.length,
  };
}

export function reportPersonalExpense(ctx: ReportContext) {
  const personalTxs = ctx.txs.filter(isLive).filter((t) =>
    t.type === "expense" && (t.businessOrPersonal === "personal" || t.businessOrPersonal === "mixed")
  );
  const split = sumSplit(personalTxs);
  return {
    totalPaise: split.personalPaise,
    txs: personalTxs.length,
  };
}

// ---------------------------------------------------------------------------
// 9. Tax-flagged report
// ---------------------------------------------------------------------------
export function reportTaxFlag(ctx: ReportContext) {
  return ctx.txs.filter(isLive).filter((t) => t.taxFlag === 1).map((t) => ({
    id: t.id,
    date: t.date,
    type: t.type,
    amountPaise: transactionAmountPaise(t),
    businessOrPersonal: t.businessOrPersonal,
    description: t.description,
  }));
}

// ---------------------------------------------------------------------------
// 10. GST / missing-bill report
// ---------------------------------------------------------------------------
export function reportGstMissingBill(ctx: ReportContext) {
  return ctx.txs.filter(isLive).filter((t) =>
    (t.gstApplicable === 1 || t.taxFlag === 1) && t.billAvailable !== 1
  ).map((t) => ({
    id: t.id,
    date: t.date,
    amountPaise: transactionAmountPaise(t),
    businessOrPersonal: t.businessOrPersonal,
    description: t.description,
  }));
}

// ---------------------------------------------------------------------------
// 11. Loan amortization
// ---------------------------------------------------------------------------
export interface LoanAmortizationRow {
  loanId: string;
  loanName: string;
  monthIndex: number;
  dueDate: string;
  emiPaise: number;
  principalPaise: number;
  interestPaise: number;
  closingPrincipalPaise: number;
}

export function reportLoanAmortization(ctx: ReportContext): LoanAmortizationRow[] {
  return ctx.loans.filter(isLive).flatMap((loan) =>
    amortizationSchedule(loan).map((row) => ({
      loanId: loan.id,
      loanName: loan.name || loan.lender || loan.id,
      monthIndex: row.monthIndex,
      dueDate: row.dueDate.slice(0, 10),
      emiPaise: row.emiPaise,
      principalPaise: row.principalPaise,
      interestPaise: row.interestPaise,
      closingPrincipalPaise: row.balancePaise,
    })),
  );
}

// ---------------------------------------------------------------------------
// 12. Net-worth report
// ---------------------------------------------------------------------------
export interface NetWorthSummary {
  assetsPaise: number;
  liabilitiesPaise: number;
  netWorthPaise: number;
}

export function reportNetWorth(ctx: ReportContext): NetWorthSummary {
  // Cash assets — sum of account ledger nets
  const accountNet = reportAccountLedger(ctx).reduce((s, r) => s + r.netPaise, 0);
  // Receivables
  const receivable = ctx.udharis.filter(isLive)
    .filter((u) => (u as { direction?: "given" | "received" }).direction === "given")
    .reduce((s, u) => s + ((u as { outstandingPaise?: number }).outstandingPaise ?? 0), 0);
  // Liabilities — card outstanding + loan principal outstanding + payable udhari
  const cardLiability = ctx.cards.filter(isLive)
    .reduce((s, c) => s + ((c as { outstandingPaise?: number }).outstandingPaise ?? 0), 0);
  const loanLiability = ctx.loans.filter(isLive)
    .reduce((s, l) => s + loanOutstandingPrincipalPaise(l), 0);
  const payable = ctx.udharis.filter(isLive)
    .filter((u) => (u as { direction?: "given" | "received" }).direction === "received")
    .reduce((s, u) => s + ((u as { outstandingPaise?: number }).outstandingPaise ?? 0), 0);

  const assetsPaise = accountNet + receivable;
  const liabilitiesPaise = cardLiability + loanLiability + payable;
  return {
    assetsPaise,
    liabilitiesPaise,
    netWorthPaise: assetsPaise - liabilitiesPaise,
  };
}

// ---------------------------------------------------------------------------
// 13. Debt summary and receivable/payable summary
// ---------------------------------------------------------------------------
export interface DebtSummary {
  cardOutstandingPaise: number;
  loanOutstandingPaise: number;
  udhariPayablePaise: number;
  totalDebtPaise: number;
  monthlyEmiPaise: number;
}

export function reportDebtSummary(ctx: ReportContext): DebtSummary {
  const cardOutstandingPaise = ctx.cards.filter(isLive).reduce(
    (sum, card) => sum + ((card as { outstandingPaise?: number; currentOutstandingPaise?: number }).outstandingPaise ?? (card as { currentOutstandingPaise?: number }).currentOutstandingPaise ?? 0),
    0,
  );
  const loanOutstandingPaise = ctx.loans.filter(isLive).reduce(
    (sum, loan) => sum + loanOutstandingPrincipalPaise(loan),
    0,
  );
  const udhariPayablePaise = ctx.udharis.filter(isLive)
    .filter((u) => u.type === "payable")
    .reduce((sum, u) => sum + Math.max(0, udhariAmountPaise(u) - udhariSettledPaise(u)), 0);
  const monthlyEmiPaise = ctx.loans.filter(isLive)
    .filter((loan) => loan.status === "active")
    .reduce((sum, loan) => sum + loanEmiPaise(loan), 0);
  return {
    cardOutstandingPaise,
    loanOutstandingPaise,
    udhariPayablePaise,
    totalDebtPaise: cardOutstandingPaise + loanOutstandingPaise + udhariPayablePaise,
    monthlyEmiPaise,
  };
}

export interface ReceivablePayableSummary {
  receivablePaise: number;
  payablePaise: number;
  netReceivablePaise: number;
  openReceivableCount: number;
  openPayableCount: number;
}

export function reportReceivablePayableSummary(ctx: ReportContext): ReceivablePayableSummary {
  let receivablePaise = 0;
  let payablePaise = 0;
  let openReceivableCount = 0;
  let openPayableCount = 0;
  for (const u of ctx.udharis.filter(isLive)) {
    const outstanding = Math.max(0, udhariAmountPaise(u) - udhariSettledPaise(u));
    if (u.type === "receivable") {
      receivablePaise += outstanding;
      if (outstanding > 0) openReceivableCount += 1;
    } else {
      payablePaise += outstanding;
      if (outstanding > 0) openPayableCount += 1;
    }
  }
  return {
    receivablePaise,
    payablePaise,
    netReceivablePaise: receivablePaise - payablePaise,
    openReceivableCount,
    openPayableCount,
  };
}

/** vNext Phase K — financing cost from ledger effects. */
export function reportFinancingCostPaise(ctx: ReportContext): number {
  let sum = 0;
  for (const e of ctx.effects) {
    if (e.targetType !== "expense_category") continue;
    if (["interest", "fee", "penalty", "tax"].includes(e.component)) sum += e.amountPaise;
  }
  return sum;
}

// ---------------------------------------------------------------------------
// 14. Account reconciliation
// ---------------------------------------------------------------------------
export interface AccountReconciliationRow {
  accountId: string;
  accountName: string;
  openingBalancePaise: number;
  inflowsPaise: number;
  outflowsPaise: number;
  calculatedClosingBalancePaise: number;
  reportedClosingBalancePaise: number;
  mismatchPaise: number;
  status: "matched" | "mismatch";
  possibleCauses: string[];
  missingAccountTransactionIds: string[];
  deletedOrReversedTransactionIds: string[];
  legacyFallbackTransactionIds: string[];
}

export function reportAccountReconciliation(ctx: ReportContext): AccountReconciliationRow[] {
  const ledger = new Map(reportAccountLedger(ctx).map((row) => [row.accountId, row]));
  const reversedTxIds = new Set(
    ctx.events
      .filter((event) => event.status === "reversed" || event.deletedAt)
      .map((event) => event.sourceTransactionId),
  );
  const accountEffectTargets = new Set(
    ctx.effects.filter((effect) => effect.targetType === "account").map((effect) => effect.targetId),
  );
  const missingAccountTransactionIds = ctx.txs
    .filter(isLive)
    .filter((tx) => ["income", "expense", "refund", "adjustment", "emi_payment", "cc_payment"].includes(tx.type))
    .filter((tx) => !tx.accountId)
    .map((tx) => tx.id);

  return ctx.accounts.filter(isLive).map((account) => {
    const row = ledger.get(account.id);
    const inflowsPaise = row?.inflowsPaise ?? 0;
    const outflowsPaise = row?.outflowsPaise ?? 0;
    const openingBalancePaise = accountOpeningBalancePaise(account);
    const calculatedClosingBalancePaise = openingBalancePaise + inflowsPaise - outflowsPaise;
    const reportedClosingBalancePaise =
      (account as { currentBalancePaise?: number }).currentBalancePaise ?? calculatedClosingBalancePaise;
    const mismatchPaise = reportedClosingBalancePaise - calculatedClosingBalancePaise;
    const deletedOrReversedTransactionIds = [...reversedTxIds].filter((txId) =>
      ctx.txs.some((tx) => tx.id === txId && (tx.accountId === account.id || tx.toAccountId === account.id)),
    );
    const legacyFallbackTransactionIds = ctx.txs
      .filter((tx) => tx.isDeleted !== 1)
      .filter((tx) => tx.accountId === account.id || tx.toAccountId === account.id)
      .filter((tx) => !ctx.events.some((event) => event.sourceTransactionId === tx.id))
      .map((tx) => tx.id);
    const possibleCauses = [
      missingAccountTransactionIds.length > 0 ? "transactions_missing_account" : "",
      deletedOrReversedTransactionIds.length > 0 ? "deleted_or_reversed_rows" : "",
      legacyFallbackTransactionIds.length > 0 ? "legacy_rows_without_events" : "",
      !accountEffectTargets.has(account.id) && (inflowsPaise !== 0 || outflowsPaise !== 0) ? "invalid_account_effect_target" : "",
    ].filter(Boolean);
    return {
      accountId: account.id,
      accountName: account.name,
      openingBalancePaise,
      inflowsPaise,
      outflowsPaise,
      calculatedClosingBalancePaise,
      reportedClosingBalancePaise,
      mismatchPaise,
      status: mismatchPaise === 0 ? "matched" : "mismatch",
      possibleCauses,
      missingAccountTransactionIds,
      deletedOrReversedTransactionIds,
      legacyFallbackTransactionIds,
    };
  });
}

// ---------------------------------------------------------------------------
// 15. Report bundle and export footer
// ---------------------------------------------------------------------------
export interface CAReportFooter {
  generatedAt: string;
  reportPeriod: string;
  maskedUserId: string;
  dataSource: "ledger/effects";
  appVersion: string;
  exportVersion: string;
  reconciliationStatus: "matched" | "mismatch";
}

export function maskUserId(userId: string): string {
  if (userId.length <= 8) return `${userId.slice(0, 2)}***`;
  return `${userId.slice(0, 4)}***${userId.slice(-4)}`;
}

export function buildReportFooter(input: {
  ctx: ReportContext;
  userId: string;
  reportPeriod?: string;
  appVersion?: string;
  exportVersion?: string;
  generatedAt?: string;
}): CAReportFooter {
  const reconciliation = reportAccountReconciliation(input.ctx);
  return {
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    reportPeriod: input.reportPeriod ?? "all",
    maskedUserId: maskUserId(input.userId),
    dataSource: "ledger/effects",
    appVersion: input.appVersion ?? "sparowvault",
    exportVersion: input.exportVersion ?? "ca-v1",
    reconciliationStatus: reconciliation.some((row) => row.status === "mismatch") ? "mismatch" : "matched",
  };
}

export function buildCAReportBundle(ctx: ReportContext, footer: CAReportFooter) {
  return {
    transactionMaster: reportTransactionMaster(ctx),
    monthlyCashflow: reportMonthlyCashflow(ctx),
    categoryLedger: reportCategoryLedger(ctx),
    accountLedger: reportAccountLedger(ctx),
    creditCardLedger: reportCardLedger(ctx),
    loanAmortization: reportLoanAmortization(ctx),
    interestPaidSummary: reportInterestPaid(ctx),
    udhariAgeing: reportUdhariAgeing(ctx),
    businessExpense: reportBusinessExpense(ctx),
    personalExpense: reportPersonalExpense(ctx),
    gstMissingBill: reportGstMissingBill(ctx),
    taxFlag: reportTaxFlag(ctx),
    netWorth: reportNetWorth(ctx),
    debtSummary: reportDebtSummary(ctx),
    receivablePayableSummary: reportReceivablePayableSummary(ctx),
    accountReconciliation: reportAccountReconciliation(ctx),
    footer,
  };
}
