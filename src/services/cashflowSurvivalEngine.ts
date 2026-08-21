/**
 * Phase 10 — Cashflow survival: safe daily spend until next income, bills before then.
 */

import { differenceInCalendarDays, parseISO } from "date-fns";
import type {
  Account,
  Card,
  EMIPayment,
  FinancialEffect,
  Goal,
  Loan,
  RecurringRule,
  Transaction,
  UdhariRecord,
} from "@/types";
import {
  deriveAccountBalanceFromAccount,
  totalUdhariPayable,
} from "@/services/calculations";
import { buildCreditCardIntel } from "@/services/cardEngine";
import { emiPaymentOutstandingPaise, paiseToRupees, rupeesToPaise } from "@/utils/money";

export interface SurvivalLineItem {
  label: string;
  amountPaise: number;
  dueDate?: string;
}

export interface CashflowSurvivalReport {
  cashAvailablePaise: number;
  nextIncomeDate: string | null;
  nextIncomeAmountPaise: number;
  daysUntilNextIncome: number;
  totalOutflowsBeforeIncomePaise: number;
  /** Open udhari payable included in total outflows when positive. */
  udhariPayablePaise: number;
  breakdown: SurvivalLineItem[];
  disposableAfterBillsPaise: number;
  /** Headroom if informal udhari is excluded (not a fixed dated bill). */
  disposableCorePaise: number;
  safeDailySpendPaise: number;
  /** Safe daily excluding udhari lump — avoids false “₹0/day” when udhari is large. */
  safeDailyCorePaise: number;
  /** Headroom per day after paying the earliest card min in the window. */
  safeDailyAfterCardPaise: number | null;
  cardBillInWindow: SurvivalLineItem | null;
  narrativeLines: string[];
}

function spendableAccountTypes(t: Account["type"]): boolean {
  return (
    t === "cash" ||
    t === "bank" ||
    t === "upi_wallet" ||
    t === "savings" ||
    t === "current" ||
    t === "wallet" ||
    t === "debit_linked" ||
    t === "petty_cash" ||
    t === "family_pool" ||
    t === "custom"
  );
}

function nextIncomeFromRecurring(rules: RecurringRule[]): {
  date: string;
  amountPaise: number;
} | null {
  const incomes = rules
    .filter((r) => r.active === 1 && r.type === "income")
    .map((r) => ({ r, d: parseISO(r.nextRunDate) }))
    .filter((x) => !Number.isNaN(x.d.getTime()))
    .sort((a, b) => a.d.getTime() - b.d.getTime());
  const pick = incomes[0];
  if (!pick) return null;
  const amt =
    pick.r.amountPaise != null && Number.isFinite(pick.r.amountPaise)
      ? Math.round(pick.r.amountPaise)
      : rupeesToPaise(pick.r.amount);
  return { date: pick.r.nextRunDate, amountPaise: amt };
}

export function buildCashflowSurvivalReport(
  accounts: Account[],
  transactions: Transaction[],
  recurringRules: RecurringRule[],
  loans: Loan[],
  emis: EMIPayment[],
  cards: Card[],
  goals: Goal[],
  udhari: UdhariRecord[],
  ledgerEffects: FinancialEffect[],
  today = new Date(),
): CashflowSurvivalReport {
  const cashAvailablePaise = accounts
    .filter((a) => a.isDeleted !== 1 && spendableAccountTypes(a.type))
    .reduce(
      (sum, a) => sum + deriveAccountBalanceFromAccount(a.id, a, transactions),
      0,
    );

  const next = nextIncomeFromRecurring(recurringRules);
  const horizonEnd = next ? parseISO(next.date) : new Date(today.getTime() + 30 * 86400000);
  const adjustedDays = next
    ? Math.max(1, differenceInCalendarDays(parseISO(next.date), today))
    : 30;

  const breakdown: SurvivalLineItem[] = [];

  for (const e of emis) {
    if (e.isDeleted === 1) continue;
    const due = parseISO(e.dueDate);
    if (due < today || due > horizonEnd) continue;
    const amt = emiPaymentOutstandingPaise(e);
    if (amt <= 0) continue;
    const loan = loans.find((l) => l.id === e.loanId);
    breakdown.push({
      label: loan ? `EMI — ${loan.lender}` : "EMI",
      amountPaise: amt,
      dueDate: e.dueDate,
    });
  }

  for (const r of recurringRules) {
    if (r.active !== 1) continue;
    if (!["expense", "emi_payment", "cc_payment"].includes(r.type)) continue;
    const run = parseISO(r.nextRunDate);
    if (run < today || run > horizonEnd) continue;
    const amt =
      r.amountPaise != null && Number.isFinite(r.amountPaise)
        ? Math.round(r.amountPaise)
        : rupeesToPaise(r.amount);
    if (amt <= 0) continue;
    breakdown.push({
      label: `Recurring — ${r.title}`,
      amountPaise: amt,
      dueDate: r.nextRunDate,
    });
  }

  let cardBillInWindow: SurvivalLineItem | null = null;
  for (const card of cards) {
    if (card.type !== "credit") continue;
    const intel = buildCreditCardIntel(card, transactions, ledgerEffects, today);
    if (!intel?.nextDueDateIso) continue;
    const due = parseISO(intel.nextDueDateIso);
    if (due < today || due > horizonEnd) continue;
    if (intel.minimumDuePaise <= 0) continue;
    const item: SurvivalLineItem = {
      label: `Card min — ${card.nickname}`,
      amountPaise: intel.minimumDuePaise,
      dueDate: intel.nextDueDateIso,
    };
    if (
      !cardBillInWindow ||
      (item.dueDate &&
        cardBillInWindow.dueDate &&
        item.dueDate < cardBillInWindow.dueDate)
    ) {
      cardBillInWindow = item;
    }
  }
  if (cardBillInWindow) breakdown.push(cardBillInWindow);

  const dom = today.getDate();
  let goalCommitPaise = 0;
  for (const g of goals) {
    if (g.status !== "active") continue;
    if (!g.autoContribution?.enabled || g.autoContribution.amount <= 0) continue;
    const day = g.autoContribution.dayOfMonth ?? 1;
    if (day >= dom && parseISO(g.targetDate) >= today) {
      goalCommitPaise += rupeesToPaise(g.autoContribution.amount);
    }
  }
  if (goalCommitPaise > 0) {
    breakdown.push({ label: "Goal auto-debits (scheduled)", amountPaise: goalCommitPaise });
  }

  const udhariPayablePaise = totalUdhariPayable(udhari);
  if (udhariPayablePaise > 0) {
    breakdown.push({ label: "Udhari payable (open)", amountPaise: udhariPayablePaise });
  }

  const totalOutflowsBeforeIncomePaise = breakdown.reduce((a, b) => a + b.amountPaise, 0);
  const outflowsExcludingUdhariPaise = Math.max(0, totalOutflowsBeforeIncomePaise - udhariPayablePaise);
  const expectedIncome = next?.amountPaise ?? 0;

  const disposableAfterBillsPaise = Math.max(
    0,
    cashAvailablePaise + expectedIncome - totalOutflowsBeforeIncomePaise,
  );
  const disposableCorePaise = Math.max(
    0,
    cashAvailablePaise + expectedIncome - outflowsExcludingUdhariPaise,
  );
  const safeDailySpendPaise = Math.round(disposableAfterBillsPaise / adjustedDays);
  const safeDailyCorePaise = Math.round(disposableCorePaise / adjustedDays);

  let safeDailyAfterCardPaise: number | null = null;
  if (cardBillInWindow?.dueDate) {
    safeDailyAfterCardPaise = Math.round(disposableAfterBillsPaise / adjustedDays);
  }

  const narrativeLines: string[] = [];
  const fmt = (p: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(paiseToRupees(p));

  narrativeLines.push(
    `About ${fmt(disposableAfterBillsPaise)} headroom over ${adjustedDays} day(s) after scheduled bills${
      next ? `; next income ${fmt(expectedIncome)} on ${next.date.slice(0, 10)}` : " (add an income recurring rule for salary-based timing)"
    }.`,
  );
  narrativeLines.push(`Safe daily spend ≈ ${fmt(safeDailySpendPaise)} / day (rough).`);
  if (udhariPayablePaise > 0) {
    narrativeLines.push(
      `Open udhari ${fmt(udhariPayablePaise)} is informal — dated bills only → core headroom ${fmt(disposableCorePaise)} (~${fmt(safeDailyCorePaise)}/day).`,
    );
  }
  if (cardBillInWindow?.dueDate) {
    const d = Math.max(0, differenceInCalendarDays(parseISO(cardBillInWindow.dueDate), today));
    narrativeLines.push(
      `Card min ${fmt(cardBillInWindow.amountPaise)} due in ${d} day(s).${
        safeDailyAfterCardPaise != null
          ? ` After that payment, rough daily headroom ≈ ${fmt(safeDailyAfterCardPaise)}.`
          : ""
      }`,
    );
  }

  return {
    cashAvailablePaise,
    nextIncomeDate: next?.date ?? null,
    nextIncomeAmountPaise: expectedIncome,
    daysUntilNextIncome: adjustedDays,
    totalOutflowsBeforeIncomePaise,
    udhariPayablePaise,
    breakdown,
    disposableAfterBillsPaise,
    disposableCorePaise,
    safeDailySpendPaise,
    safeDailyCorePaise,
    safeDailyAfterCardPaise,
    cardBillInWindow,
    narrativeLines,
  };
}
