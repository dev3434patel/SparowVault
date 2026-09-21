/**
 * Phase 5 - Human-readable preview of ledger / cashflow impact before save.
 */

import { parseISO } from "date-fns";
import type {
  Account,
  Card,
  Category,
  EMIPayment,
  Goal,
  Investment,
  Loan,
  Transaction,
  UdhariRecord,
} from "@/types";
import { formatINR, localDateToIso } from "@/lib/format";
import { nowIso, uid } from "@/lib/utils";
import {
  buildFinanceEventBuilderContext,
  buildLedgerForTransaction,
  type LedgerTransactionBuild,
} from "@/services/financeEventBuilder";
import type { TransactionFormRuleState } from "@/services/transactionFormRules";
import {
  deriveAccountBalanceFromAccount,
  summarizeCardHealth,
  summarizeLoan,
} from "@/services/calculations";
import {
  cardCreditLimitPaise,
  emiPaymentInterestPaise,
  emiPaymentPrincipalPaidPaise,
  goalSavedPaise,
  goalTargetPaise,
  paiseToRupees,
  rupeesToPaise,
  transactionAmountPaise,
} from "@/utils/money";

export interface TransactionPreviewContext {
  userId: string;
  draftTransactionId: string;
  categories: Category[];
  emis: EMIPayment[];
  accounts: Account[];
  cards: Card[];
  loans: Loan[];
  goals: Goal[];
  investments: Investment[];
  udhari: UdhariRecord[];
  transactions: Transaction[];
  omitTransactionId?: string;
}

function accountName(ctx: TransactionPreviewContext, id: string): string {
  return ctx.accounts.find((a) => a.id === id)?.name ?? "Account";
}

function cardLabel(ctx: TransactionPreviewContext, id: string): string {
  const c = ctx.cards.find((x) => x.id === id);
  return c ? `${c.nickname} (**** ${c.last4})` : "Card";
}

function goalTitle(ctx: TransactionPreviewContext, id: string): string {
  return ctx.goals.find((g) => g.id === id)?.title ?? "Goal";
}

function loanLabel(ctx: TransactionPreviewContext, id: string): string {
  return ctx.loans.find((l) => l.id === id)?.lender ?? "Loan";
}

function invName(ctx: TransactionPreviewContext, id: string): string {
  return ctx.investments.find((i) => i.id === id)?.name ?? "Investment";
}

function udhariPerson(ctx: TransactionPreviewContext, id: string): string {
  return ctx.udhari.find((u) => u.id === id)?.personName ?? "Person";
}

function categoryName(ctx: TransactionPreviewContext, id: string | undefined): string {
  if (!id) return "Uncategorised";
  return ctx.categories.find((c) => c.id === id)?.name ?? "Category";
}

function accountBalancePreview(
  ctx: TransactionPreviewContext,
  accountId: string,
  deltaPaise: number,
): { before: number; after: number } | null {
  const account = ctx.accounts.find((a) => a.id === accountId);
  if (!account) return null;
  const baseTxs = ctx.transactions
    .filter((t) => t.isDeleted !== 1)
    .filter((t) => (ctx.omitTransactionId ? t.id !== ctx.omitTransactionId : true));
  const before = deriveAccountBalanceFromAccount(account.id, account, baseTxs);
  return { before, after: before + deltaPaise };
}

function effectSummary(ledger: LedgerTransactionBuild, ru: (paise: number) => string): string[] {
  return ledger.effects.map((e) => {
    const sign = e.effectDirection === "increase" ? "+" : "-";
    const target = e.targetType.replace(/_/g, " ");
    return `${target} ${e.component}: ${sign}${ru(e.amountPaise)}`;
  });
}

export function stateToDraftTransaction(
  state: TransactionFormRuleState,
  ctx: TransactionPreviewContext,
): Transaction | null {
  if (state.amount === "" || !Number.isFinite(state.amount) || state.amount <= 0) return null;
  const iso = localDateToIso(state.date);
  const amountPaise = rupeesToPaise(state.amount);
  return {
    id: ctx.draftTransactionId,
    userId: ctx.userId,
    date: iso,
    type: state.type,
    amount: state.amount,
    amountPaise,
    categoryId: state.categoryId || undefined,
    accountId: state.accountId || undefined,
    toAccountId: state.toAccountId || undefined,
    linkedCardId: state.linkedCardId || undefined,
    linkedLoanId: state.linkedLoanId || undefined,
    linkedGoalId: state.linkedGoalId || undefined,
    linkedUdhariId: state.linkedUdhariId || undefined,
    linkedSavingsId: state.linkedSavingsId || undefined,
    linkedOriginalTransactionId: state.linkedOriginalTransactionId || undefined,
    transactionIntent: state.transactionIntent,
    paymentMode: state.paymentMode,
    merchantOrPerson: state.merchantOrPerson,
    description: state.description,
    notes: state.notes,
    tags: state.tags,
    billAvailable: state.billAvailable,
    gstApplicable: state.gstApplicable,
    taxFlag: state.taxFlag,
    businessOrPersonal: state.businessOrPersonal,
    needWant: state.needWant,
    fixedVariable: state.fixedVariable,
    plannedUnplanned: state.plannedUnplanned,
    isDeleted: 0,
    version: 1,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
}

export function estimateEmiSplitForPreview(
  emis: EMIPayment[],
  loanId: string,
  paymentPaise: number,
  localDate: string,
): { principalPaise: number; interestPaise: number; dueLabel: string } | null {
  const pool = emis.filter((e) => e.loanId === loanId && e.isDeleted !== 1);
  if (!pool.length) return null;
  const target = parseISO(`${localDate}T12:00:00`);
  const row = pool
    .map((r) => {
      let distance = Number.MAX_SAFE_INTEGER;
      try {
        distance = Math.abs(parseISO(r.dueDate).getTime() - target.getTime());
      } catch {
        // Keep unparsable dates last.
      }
      return { row: r, distance };
    })
    .sort((a, b) => a.distance - b.distance)[0]?.row;
  if (!row) return null;

  let principalPaise = emiPaymentPrincipalPaidPaise(row);
  let interestPaise = emiPaymentInterestPaise(row);
  const split = principalPaise + interestPaise;
  if (split > 0 && split !== paymentPaise) {
    principalPaise = Math.round((paymentPaise * principalPaise) / split);
    interestPaise = paymentPaise - principalPaise;
  } else if (split === 0) {
    principalPaise = paymentPaise;
    interestPaise = 0;
  }

  return {
    principalPaise,
    interestPaise,
    dueLabel: row.dueDate.slice(0, 10),
  };
}

export interface TransactionPreviewLines {
  ledger: LedgerTransactionBuild;
  lines: string[];
}

export function buildTransactionPreview(
  state: TransactionFormRuleState,
  ctx: TransactionPreviewContext,
): TransactionPreviewLines | null {
  const draft = stateToDraftTransaction(state, ctx);
  if (!draft) return null;

  const bctx = buildFinanceEventBuilderContext(ctx.categories, ctx.emis);
  const ledger = buildLedgerForTransaction(draft, bctx);
  const amt = transactionAmountPaise(draft);
  const ru = (p: number) => formatINR(paiseToRupees(p), { showSymbol: true, decimals: 2 });
  const lines: string[] = [];

  for (const x of ledger.excluded) {
    lines.push(`Ledger note: ${x.message}`);
  }

  switch (state.type) {
    case "expense": {
      const cat = categoryName(ctx, state.categoryId);
      if (state.paymentMode === "credit_card" && state.linkedCardId) {
        const card = ctx.cards.find((c) => c.id === state.linkedCardId);
        if (card?.type === "credit") {
          const baseTxs = ctx.transactions
            .filter((t) => t.isDeleted !== 1)
            .filter((t) => (ctx.omitTransactionId ? t.id !== ctx.omitTransactionId : true));
          const hypo = [...baseTxs, draft];
          const before = summarizeCardHealth(card, baseTxs);
          const after = summarizeCardHealth(card, hypo);
          const limitPaise = cardCreditLimitPaise(card);
          const availableBefore = Math.max(0, limitPaise - before.outstandingBalancePaise);
          const availableAfter = Math.max(0, limitPaise - after.outstandingBalancePaise);
          lines.push(
            `You are buying ${ru(amt)} ${cat.toLowerCase()} using ${cardLabel(ctx, state.linkedCardId)}. ${cat} expense will increase by ${ru(amt)}.`,
          );
          lines.push(
            `${cardLabel(ctx, state.linkedCardId)} outstanding will increase to about ${ru(after.outstandingBalancePaise)} (was ${ru(before.outstandingBalancePaise)}). Available limit will be about ${ru(availableAfter)} (was ${ru(availableBefore)}).`,
          );
          lines.push(`Utilization after transaction: ${Math.round(after.utilization)}% of ${ru(limitPaise)} limit.`);
          lines.push("Bank balance will not change today for this card purchase.");
        }
      } else if (state.accountId) {
        const balance = accountBalancePreview(ctx, state.accountId, -amt);
        lines.push(
          `Cash outflow of ${ru(amt)} from ${accountName(ctx, state.accountId)}. ${cat} spending increases by ${ru(amt)}.`,
        );
        if (balance) {
          lines.push(`${accountName(ctx, state.accountId)} balance preview: ${ru(balance.before)} to ${ru(balance.after)}.`);
        }
      }
      break;
    }
    case "income":
    case "refund": {
      if (state.type === "refund" && state.paymentMode === "credit_card") {
        lines.push(
          `Card refund of ${ru(amt)} reduces ${state.linkedCardId ? cardLabel(ctx, state.linkedCardId) : "card"} liability and adjusts ${categoryName(ctx, state.categoryId)} expense. This is not income unless it is true cashback or reward.`,
        );
        break;
      }
      if (state.accountId) {
        const balance = accountBalancePreview(ctx, state.accountId, amt);
        lines.push(`${state.transactionIntent === "expense_contribution" ? "Contribution return" : state.type === "income" ? "Income" : "Refund"} of ${ru(amt)} credits ${accountName(ctx, state.accountId)}.`);
        if (state.transactionIntent === "expense_contribution") lines.push(`Expense reduction: ${ru(amt)}. Income: ${ru(0)}.`);
        if (balance) {
          lines.push(`${accountName(ctx, state.accountId)} balance preview: ${ru(balance.before)} to ${ru(balance.after)}.`);
        }
      }
      break;
    }
    case "cc_payment": {
      if (state.accountId) {
        const balance = accountBalancePreview(ctx, state.accountId, -amt);
        if (balance) {
          lines.push(`${accountName(ctx, state.accountId)} decreases from ${ru(balance.before)} to ${ru(balance.after)}.`);
        }
      }
      lines.push(
        `Pay ${ru(amt)} from ${state.accountId ? accountName(ctx, state.accountId) : "account"} toward ${state.linkedCardId ? cardLabel(ctx, state.linkedCardId) : "card"}; card liability decreases by ${ru(amt)}.`,
      );
      lines.push("Credit card bill payment is not a new expense.");
      break;
    }
    case "emi_payment": {
      const split = estimateEmiSplitForPreview(ctx.emis, state.linkedLoanId, amt, state.date);
      if (state.accountId) {
        const balance = accountBalancePreview(ctx, state.accountId, -amt);
        if (balance) {
          lines.push(`${accountName(ctx, state.accountId)} decreases from ${ru(balance.before)} to ${ru(balance.after)}.`);
        }
      }
      lines.push(`EMI payment ${ru(amt)} from ${state.accountId ? accountName(ctx, state.accountId) : "account"} toward ${loanLabel(ctx, state.linkedLoanId)}.`);
      if (split) {
        const loan = ctx.loans.find((l) => l.id === state.linkedLoanId);
        const summary = loan ? summarizeLoan(loan, ctx.emis) : null;
        const remaining = summary ? Math.max(0, summary.outstandingPrincipalPaise - split.principalPaise) : null;
        lines.push(`Estimated split (from EMI due ${split.dueLabel}): principal ${ru(split.principalPaise)}, interest ${ru(split.interestPaise)}.`);
        if (remaining !== null) {
          lines.push(`Remaining loan principal after this payment: about ${ru(remaining)}.`);
        }
      }
      break;
    }
    case "loan_disbursement": {
      if (state.accountId) {
        const balance = accountBalancePreview(ctx, state.accountId, amt);
        if (balance) {
          lines.push(`${accountName(ctx, state.accountId)} increases from ${ru(balance.before)} to ${ru(balance.after)}.`);
        }
      }
      lines.push(`Loan disbursement ${ru(amt)} to ${state.accountId ? accountName(ctx, state.accountId) : "account"} for ${loanLabel(ctx, state.linkedLoanId)}. Loan liability also increases by ${ru(amt)}.`);
      break;
    }
    case "loan_prepayment":
      lines.push(`Loan prepayment ${ru(amt)} from ${state.accountId ? accountName(ctx, state.accountId) : "account"} toward ${loanLabel(ctx, state.linkedLoanId)}. Loan principal decreases by ${ru(amt)}.`);
      break;
    case "udhari_given": {
      if (state.accountId) {
        const balance = accountBalancePreview(ctx, state.accountId, -amt);
        if (balance) {
          lines.push(`${accountName(ctx, state.accountId)} decreases from ${ru(balance.before)} to ${ru(balance.after)}.`);
        }
      }
      lines.push(`Lend ${ru(amt)} from ${state.accountId ? accountName(ctx, state.accountId) : "account"} to ${udhariPerson(ctx, state.linkedUdhariId)}. Receivable increases by ${ru(amt)}; this is not an expense.`);
      break;
    }
    case "udhari_received": {
      if (state.accountId) {
        const balance = accountBalancePreview(ctx, state.accountId, amt);
        if (balance) {
          lines.push(`${accountName(ctx, state.accountId)} increases from ${ru(balance.before)} to ${ru(balance.after)}.`);
        }
      }
      lines.push(`Receive ${ru(amt)} into ${state.accountId ? accountName(ctx, state.accountId) : "account"} from ${udhariPerson(ctx, state.linkedUdhariId)}. Payable increases by ${ru(amt)}; this is not income.`);
      break;
    }
    case "udhari_collect":
      lines.push(`Collect ${ru(amt)} into ${state.accountId ? accountName(ctx, state.accountId) : "account"}; receivable from ${udhariPerson(ctx, state.linkedUdhariId)} drops by the same amount. This is not income.`);
      break;
    case "udhari_repay":
      lines.push(`Repay ${ru(amt)} from ${state.accountId ? accountName(ctx, state.accountId) : "account"}; payable to ${udhariPerson(ctx, state.linkedUdhariId)} drops. This is not expense.`);
      break;
    case "udhari_write_off":
      lines.push(`Write off ${ru(amt)} receivable for ${udhariPerson(ctx, state.linkedUdhariId)}; ${categoryName(ctx, state.categoryId)} expense increases (no cash movement).`);
      break;
    case "savings_contribution": {
      if (state.accountId) {
        const balance = accountBalancePreview(ctx, state.accountId, -amt);
        if (balance) {
          lines.push(`${accountName(ctx, state.accountId)} decreases from ${ru(balance.before)} to ${ru(balance.after)}.`);
        }
      }
      const goal = ctx.goals.find((g) => g.id === state.linkedGoalId);
      if (goal) {
        const savedAfter = goalSavedPaise(goal) + amt;
        const targetPaise = Math.max(1, goalTargetPaise(goal));
        lines.push(`Goal progress after contribution: ${ru(savedAfter)} of ${ru(targetPaise)} (${Math.min(100, Math.round((savedAfter / targetPaise) * 100))}%).`);
      }
      lines.push(`Move ${ru(amt)} from ${state.accountId ? accountName(ctx, state.accountId) : "account"} into goal "${goalTitle(ctx, state.linkedGoalId)}".`);
      break;
    }
    case "goal_withdrawal":
      lines.push(`Withdraw ${ru(amt)} from goal "${goalTitle(ctx, state.linkedGoalId)}"; goal asset decreases and bank cash increases.`);
      break;
    case "investment_contribution":
      lines.push(`Invest ${ru(amt)} from ${state.accountId ? accountName(ctx, state.accountId) : "account"} into ${invName(ctx, state.linkedSavingsId)}.`);
      break;
    case "investment_sell":
      lines.push(`Sell ${ru(amt)} from ${invName(ctx, state.linkedSavingsId)} into ${state.accountId ? accountName(ctx, state.accountId) : "account"}. Investment asset decreases and bank cash increases.`);
      break;
    case "transfer": {
      if (state.accountId && state.toAccountId) {
        const from = accountBalancePreview(ctx, state.accountId, -amt);
        const to = accountBalancePreview(ctx, state.toAccountId, amt);
        lines.push(`Transfer ${ru(amt)} from ${accountName(ctx, state.accountId)} to ${accountName(ctx, state.toAccountId)}.`);
        if (from) lines.push(`${accountName(ctx, state.accountId)}: ${ru(from.before)} to ${ru(from.after)}.`);
        if (to) lines.push(`${accountName(ctx, state.toAccountId)}: ${ru(to.before)} to ${ru(to.after)}.`);
        lines.push("This transfer is not income or expense.");
      }
      break;
    }
    default:
      lines.push(`Review ledger effects for type "${state.type}".`);
  }

  const ledgerLines = effectSummary(ledger, ru);
  if (ledgerLines.length) {
    lines.push(`Ledger effects: ${ledgerLines.join("; ")}.`);
  }

  return { ledger, lines };
}

export function newPreviewTransactionId(): string {
  return uid("draft_tx");
}
