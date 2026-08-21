/**
 * Phase 5 — Build financial_events + financial_effects from transactions.
 * Source of truth for ledger-based calculations; transactions remain for UI.
 */

import { parseISO } from "date-fns";
import type {
  Category,
  EMIPayment,
  FinancialEffect,
  FinancialEffectComponent,
  FinancialEffectDirection,
  FinancialEffectTargetType,
  FinancialEvent,
  FinancialEventSource,
  FinancialEventStatus,
  FinancialEventType,
  Transaction,
} from "@/types";
import {
  emiPaymentInterestPaise,
  emiPaymentPrincipalPaidPaise,
  transactionAmountPaise,
} from "@/utils/money";
import { nowIso, uid } from "@/lib/utils";

export interface FinanceEventBuilderContext {
  categoriesById: Map<string, Category>;
  emiByTransactionId: Map<string, EMIPayment>;
}

export interface LedgerTransactionBuild {
  event: FinancialEvent | null;
  effects: FinancialEffect[];
  excluded: Array<{ code: string; message: string }>;
}

function txDateKey(t: Transaction): string {
  // Prefer calendar date from YYYY-MM-DD (avoid UTC shift via toISOString).
  if (/^\d{4}-\d{2}-\d{2}/.test(t.date)) return t.date.slice(0, 10);
  try {
    return parseISO(t.date).toISOString().slice(0, 10);
  } catch {
    return t.date.slice(0, 10);
  }
}

function eff(
  eventId: string,
  userId: string,
  targetType: FinancialEffectTargetType,
  targetId: string,
  direction: FinancialEffectDirection,
  amountPaise: number,
  component: FinancialEffectComponent,
): FinancialEffect {
  return {
    id: uid("fef"),
    eventId,
    userId,
    targetType,
    targetId,
    effectDirection: direction,
    amountPaise,
    component,
    createdAt: nowIso(),
  };
}

function expenseEventType(pm: Transaction["paymentMode"]): FinancialEventType {
  return pm === "credit_card" ? "credit_card_purchase" : "expense";
}

export function buildFinanceEventBuilderContext(
  categories: Category[],
  emis: EMIPayment[],
): FinanceEventBuilderContext {
  const categoriesById = new Map(categories.map((c) => [c.id, c]));
  const emiByTransactionId = new Map<string, EMIPayment>();
  for (const e of emis) {
    if (e.transactionId) emiByTransactionId.set(e.transactionId, e);
  }
  return { categoriesById, emiByTransactionId };
}

/** One transaction → at most one event row + N effects. */
export function buildLedgerForTransaction(
  tx: Transaction,
  ctx: FinanceEventBuilderContext,
  source: FinancialEventSource = "transaction",
): LedgerTransactionBuild {
  const excluded: Array<{ code: string; message: string }> = [];
  if (tx.isDeleted === 1) {
    return { event: null, effects: [], excluded };
  }

  const userId = tx.userId;
  const amt = transactionAmountPaise(tx);
  const eventId = `fevt_${tx.id}`;
  const now = nowIso();
  const baseEvent = (type: FinancialEventType, status: FinancialEventStatus): FinancialEvent => ({
    id: eventId,
    userId,
    sourceTransactionId: tx.id,
    eventType: type,
    eventDate: txDateKey(tx),
    amountPaise: amt,
    currency: "INR",
    description: tx.description || tx.merchantOrPerson || tx.type,
    source,
    status,
    reversalOfEventId: null,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  });

  const effects: FinancialEffect[] = [];
  let status: FinancialEventStatus = "posted";
  let eventType: FinancialEventType = "adjustment";

  const pushEx = (code: string, message: string) => {
    excluded.push({ code, message });
    status = "needs_review";
  };

  switch (tx.type) {
    case "expense": {
      eventType = expenseEventType(tx.paymentMode);
      if (tx.paymentMode === "credit_card") {
        if (!tx.linkedCardId) {
          pushEx("MISSING_CARD", "Credit card expense without linkedCardId — liability not posted");
        } else {
          effects.push(
            eff(eventId, userId, "credit_card", tx.linkedCardId, "increase", amt, "liability"),
          );
        }
        if (tx.categoryId) {
          effects.push(
            eff(eventId, userId, "expense_category", tx.categoryId, "increase", amt, "expense"),
          );
        } else {
          pushEx("MISSING_CATEGORY", "Expense has no categoryId");
        }
      } else {
        if (tx.accountId) {
          effects.push(eff(eventId, userId, "account", tx.accountId, "decrease", amt, "cash"));
        } else {
          pushEx("MISSING_ACCOUNT", "Cash/bank expense without accountId");
        }
        if (tx.categoryId) {
          effects.push(
            eff(eventId, userId, "expense_category", tx.categoryId, "increase", amt, "expense"),
          );
        } else {
          pushEx("MISSING_CATEGORY", "Expense has no categoryId");
        }
      }
      if (tx.isReimbursable === 1) {
        const reimbId = tx.linkedOriginalTransactionId ?? tx.id;
        effects.push(
          eff(eventId, userId, "reimbursement", reimbId, "increase", amt, "receivable"),
        );
      }
      break;
    }
    case "income": {
      eventType = "income";
      const isReimbursement =
        tx.transactionIntent === "reimbursement" ||
        (tx.tags ?? []).includes("reimbursement_settlement");
      if (tx.accountId) {
        effects.push(eff(eventId, userId, "account", tx.accountId, "increase", amt, "cash"));
      } else {
        pushEx("MISSING_ACCOUNT", "Income without accountId");
      }
      if (isReimbursement) {
        const reimbId = tx.linkedOriginalTransactionId ?? tx.id;
        effects.push(
          eff(eventId, userId, "reimbursement", reimbId, "decrease", amt, "receivable"),
        );
      } else if (tx.categoryId) {
        effects.push(
          eff(eventId, userId, "income_category", tx.categoryId, "increase", amt, "income"),
        );
      } else {
        pushEx("MISSING_CATEGORY", "Income without categoryId");
      }
      break;
    }
    case "refund": {
      eventType = "refund";
      if (tx.paymentMode === "credit_card") {
        if (tx.linkedCardId) {
          effects.push(
            eff(eventId, userId, "credit_card", tx.linkedCardId, "decrease", amt, "liability"),
          );
        } else {
          pushEx("MISSING_CARD", "Card refund without linkedCardId");
        }
        if (tx.categoryId) {
          effects.push(
            eff(eventId, userId, "expense_category", tx.categoryId, "decrease", amt, "expense"),
          );
        } else {
          pushEx("MISSING_CATEGORY", "Card refund without original expense category");
        }
      } else if (tx.accountId) {
        effects.push(eff(eventId, userId, "account", tx.accountId, "increase", amt, "cash"));
        if (tx.categoryId) {
          effects.push(
            eff(eventId, userId, "expense_category", tx.categoryId, "decrease", amt, "expense"),
          );
        } else {
          pushEx(
            "MISSING_CATEGORY",
            "Bank/cash refund without categoryId — cannot contra original expense",
          );
        }
      } else {
        pushEx("MISSING_ACCOUNT", "Refund without accountId");
      }
      break;
    }
    case "transfer": {
      eventType = "transfer";
      if (!tx.accountId || !tx.toAccountId || tx.accountId === tx.toAccountId) {
        pushEx("INVALID_TRANSFER", "Transfer requires two distinct accounts");
        break;
      }
      effects.push(eff(eventId, userId, "account", tx.accountId, "decrease", amt, "cash"));
      effects.push(eff(eventId, userId, "account", tx.toAccountId, "increase", amt, "cash"));
      break;
    }
    case "cc_payment": {
      eventType = "credit_card_payment";
      if (tx.accountId) {
        effects.push(eff(eventId, userId, "account", tx.accountId, "decrease", amt, "cash"));
      } else {
        pushEx("MISSING_ACCOUNT", "CC payment without accountId");
      }
      if (tx.linkedCardId) {
        effects.push(
          eff(eventId, userId, "credit_card", tx.linkedCardId, "decrease", amt, "liability"),
        );
      } else {
        pushEx("MISSING_CARD", "CC payment without linkedCardId");
      }
      break;
    }
    case "emi_payment": {
      eventType = "emi_payment";
      if (!tx.accountId) {
        pushEx("MISSING_ACCOUNT", "EMI payment without accountId");
      } else {
        effects.push(eff(eventId, userId, "account", tx.accountId, "decrease", amt, "cash"));
      }
      const emi = ctx.emiByTransactionId.get(tx.id);
      if (!tx.linkedLoanId) {
        pushEx("MISSING_LOAN", "EMI payment without linkedLoanId");
        break;
      }
      if (emi) {
        const penaltyP =
          typeof emi.penaltyPaise === "number" && Number.isInteger(emi.penaltyPaise)
            ? emi.penaltyPaise
            : 0;
        const feeP =
          typeof emi.feePaise === "number" && Number.isInteger(emi.feePaise) ? emi.feePaise : 0;
        const charges = penaltyP + feeP;
        const core = Math.max(0, amt - charges);
        if (charges > 0) {
          if (!tx.categoryId) {
            pushEx(
              "MISSING_CATEGORY",
              "EMI penalty/fee requires categoryId on transaction to post to P&L",
            );
          } else {
            if (penaltyP > 0) {
              effects.push(
                eff(eventId, userId, "expense_category", tx.categoryId, "increase", penaltyP, "penalty"),
              );
            }
            if (feeP > 0) {
              effects.push(
                eff(eventId, userId, "expense_category", tx.categoryId, "increase", feeP, "fee"),
              );
            }
          }
        }
        let principalP = emiPaymentPrincipalPaidPaise(emi);
        let interestP = emiPaymentInterestPaise(emi);
        const split = principalP + interestP;
        if (split > 0 && split !== core) {
          principalP = Math.round((core * principalP) / split);
          interestP = core - principalP;
        } else if (split === 0) {
          principalP = core;
          interestP = 0;
        }
        if (principalP > 0) {
          effects.push(
            eff(eventId, userId, "loan", tx.linkedLoanId, "decrease", principalP, "principal"),
          );
        }
        if (interestP > 0) {
          if (tx.categoryId) {
            effects.push(
              eff(
                eventId,
                userId,
                "expense_category",
                tx.categoryId,
                "increase",
                interestP,
                "interest",
              ),
            );
          } else {
            effects.push(
              eff(eventId, userId, "loan", tx.linkedLoanId, "increase", interestP, "interest"),
            );
            pushEx(
              "MISSING_INTEREST_CATEGORY",
              "EMI interest has no categoryId on transaction — interest not posted to P&L",
            );
          }
        }
      } else {
        effects.push(
          eff(eventId, userId, "loan", tx.linkedLoanId, "decrease", amt, "principal"),
        );
        pushEx("MISSING_EMI_ROW", "No EMIPayment linked to transactionId — principal assumed full amount");
      }
      break;
    }
    case "loan_prepayment": {
      eventType = "loan_prepayment";
      if (tx.accountId) {
        effects.push(eff(eventId, userId, "account", tx.accountId, "decrease", amt, "cash"));
      } else {
        pushEx("MISSING_ACCOUNT", "Loan prepayment without accountId");
      }
      if (tx.linkedLoanId) {
        effects.push(
          eff(eventId, userId, "loan", tx.linkedLoanId, "decrease", amt, "principal"),
        );
      } else {
        pushEx("MISSING_LOAN", "Loan prepayment without linkedLoanId");
      }
      break;
    }
    case "loan_disbursement": {
      eventType = "loan_disbursement";
      if (tx.accountId) {
        effects.push(eff(eventId, userId, "account", tx.accountId, "increase", amt, "cash"));
      } else {
        pushEx("MISSING_ACCOUNT", "Loan disbursement without accountId");
      }
      if (tx.linkedLoanId) {
        effects.push(
          eff(eventId, userId, "loan", tx.linkedLoanId, "increase", amt, "principal"),
        );
      } else {
        pushEx("MISSING_LOAN", "Loan disbursement without linkedLoanId");
      }
      break;
    }
    case "udhari_given": {
      eventType = "udhari_given";
      if (tx.accountId) {
        effects.push(eff(eventId, userId, "account", tx.accountId, "decrease", amt, "cash"));
      } else {
        pushEx("MISSING_ACCOUNT", "Udhari given without accountId");
      }
      if (tx.linkedUdhariId) {
        effects.push(
          eff(eventId, userId, "udhari_person", tx.linkedUdhariId, "increase", amt, "receivable"),
        );
      } else {
        pushEx("MISSING_UDHARI", "Udhari given without linkedUdhariId");
      }
      break;
    }
    case "udhari_received": {
      eventType = "udhari_received";
      if (tx.accountId) {
        effects.push(eff(eventId, userId, "account", tx.accountId, "increase", amt, "cash"));
      } else {
        pushEx("MISSING_ACCOUNT", "Udhari received without accountId");
      }
      if (tx.linkedUdhariId) {
        effects.push(
          eff(eventId, userId, "udhari_person", tx.linkedUdhariId, "increase", amt, "payable"),
        );
      } else {
        pushEx("MISSING_UDHARI", "Udhari received without linkedUdhariId");
      }
      break;
    }
    case "udhari_collect": {
      eventType = "udhari_settlement";
      if (tx.accountId) {
        effects.push(eff(eventId, userId, "account", tx.accountId, "increase", amt, "cash"));
      } else {
        pushEx("MISSING_ACCOUNT", "Udhari collect without accountId");
      }
      if (tx.linkedUdhariId) {
        effects.push(
          eff(eventId, userId, "udhari_person", tx.linkedUdhariId, "decrease", amt, "receivable"),
        );
      } else {
        pushEx("MISSING_UDHARI", "Udhari collect without linkedUdhariId");
      }
      break;
    }
    case "udhari_repay": {
      eventType = "udhari_settlement";
      if (tx.accountId) {
        effects.push(eff(eventId, userId, "account", tx.accountId, "decrease", amt, "cash"));
      } else {
        pushEx("MISSING_ACCOUNT", "Udhari repay without accountId");
      }
      if (tx.linkedUdhariId) {
        effects.push(
          eff(eventId, userId, "udhari_person", tx.linkedUdhariId, "decrease", amt, "payable"),
        );
      } else {
        pushEx("MISSING_UDHARI", "Udhari repay without linkedUdhariId");
      }
      break;
    }
    case "udhari_write_off": {
      eventType = "udhari_write_off";
      if (tx.linkedUdhariId) {
        effects.push(
          eff(eventId, userId, "udhari_person", tx.linkedUdhariId, "decrease", amt, "receivable"),
        );
      } else {
        pushEx("MISSING_UDHARI", "Udhari write-off without linkedUdhariId");
      }
      if (tx.categoryId) {
        effects.push(
          eff(eventId, userId, "expense_category", tx.categoryId, "increase", amt, "expense"),
        );
      } else {
        pushEx("MISSING_CATEGORY", "Udhari write-off without categoryId");
      }
      break;
    }
    case "savings_contribution": {
      eventType = "goal_contribution";
      if (tx.accountId) {
        effects.push(eff(eventId, userId, "account", tx.accountId, "decrease", amt, "cash"));
      } else {
        pushEx("MISSING_ACCOUNT", "Goal contribution without accountId");
      }
      if (tx.linkedGoalId) {
        effects.push(eff(eventId, userId, "goal", tx.linkedGoalId, "increase", amt, "asset"));
      } else {
        pushEx("MISSING_GOAL", "Savings contribution without linkedGoalId");
      }
      break;
    }
    case "goal_withdrawal": {
      eventType = "goal_withdrawal";
      if (tx.linkedGoalId) {
        effects.push(eff(eventId, userId, "goal", tx.linkedGoalId, "decrease", amt, "asset"));
      } else {
        pushEx("MISSING_GOAL", "Goal withdrawal without linkedGoalId");
      }
      if (tx.accountId) {
        effects.push(eff(eventId, userId, "account", tx.accountId, "increase", amt, "cash"));
      } else {
        pushEx("MISSING_ACCOUNT", "Goal withdrawal without receiving accountId");
      }
      break;
    }
    case "investment_contribution": {
      eventType = "investment_buy";
      if (tx.accountId) {
        effects.push(eff(eventId, userId, "account", tx.accountId, "decrease", amt, "cash"));
      } else {
        pushEx("MISSING_ACCOUNT", "Investment contribution without accountId");
      }
      const invId = tx.linkedSavingsId;
      if (invId) {
        effects.push(eff(eventId, userId, "investment", invId, "increase", amt, "asset"));
      } else {
        pushEx("MISSING_INVESTMENT", "Investment contribution without linkedSavingsId");
      }
      break;
    }
    case "investment_sell": {
      eventType = "investment_sell";
      const invId = tx.linkedSavingsId;
      const basisP =
        typeof tx.costBasisPaise === "number" && tx.costBasisPaise > 0
          ? tx.costBasisPaise
          : amt;
      const gainP = amt - basisP;
      if (invId) {
        effects.push(eff(eventId, userId, "investment", invId, "decrease", basisP, "asset"));
      } else {
        pushEx("MISSING_INVESTMENT", "Investment sell without linkedSavingsId");
      }
      if (tx.accountId) {
        effects.push(eff(eventId, userId, "account", tx.accountId, "increase", amt, "cash"));
      } else {
        pushEx("MISSING_ACCOUNT", "Investment sell without receiving accountId");
      }
      if (gainP !== 0 && tx.categoryId) {
        if (gainP > 0) {
          effects.push(
            eff(eventId, userId, "income_category", tx.categoryId, "increase", gainP, "income"),
          );
        } else {
          effects.push(
            eff(
              eventId,
              userId,
              "expense_category",
              tx.categoryId,
              "increase",
              Math.abs(gainP),
              "expense",
            ),
          );
        }
      }
      break;
    }
    case "adjustment": {
      eventType = "adjustment";
      if (tx.accountId) {
        const dir: FinancialEffectDirection = tx.description?.toLowerCase().includes("decrease")
          ? "decrease"
          : "increase";
        effects.push(eff(eventId, userId, "account", tx.accountId, dir, amt, "cash"));
      } else {
        pushEx("UNSPECIFIED_ADJUSTMENT", "Adjustment without resolvable targets");
      }
      break;
    }
    case "card_emi_conversion": {
      // Restructure retail liability → EMI principal; expense unchanged.
      eventType = "card_emi_conversion";
      const planId = tx.linkedCardEmiPlanId;
      if (!tx.linkedCardId) {
        pushEx("MISSING_CARD", "Card EMI conversion without linkedCardId");
        break;
      }
      if (!planId) {
        pushEx("MISSING_EMI_PLAN", "Card EMI conversion without linkedCardEmiPlanId");
        break;
      }
      effects.push(
        eff(eventId, userId, "credit_card", tx.linkedCardId, "decrease", amt, "liability"),
      );
      effects.push(
        eff(eventId, userId, "card_emi_plan", planId, "increase", amt, "principal"),
      );
      const feeP = typeof tx.feePaise === "number" ? Math.max(0, Math.round(tx.feePaise)) : 0;
      const taxP = typeof tx.taxPaise === "number" ? Math.max(0, Math.round(tx.taxPaise)) : 0;
      if (feeP > 0) {
        effects.push(
          eff(eventId, userId, "credit_card", tx.linkedCardId, "increase", feeP, "liability"),
        );
        if (tx.categoryId) {
          effects.push(
            eff(eventId, userId, "expense_category", tx.categoryId, "increase", feeP, "fee"),
          );
        }
      }
      if (taxP > 0) {
        effects.push(
          eff(eventId, userId, "credit_card", tx.linkedCardId, "increase", taxP, "liability"),
        );
        if (tx.categoryId) {
          effects.push(
            eff(eventId, userId, "expense_category", tx.categoryId, "increase", taxP, "tax"),
          );
        }
      }
      break;
    }
    case "card_emi_charge": {
      // Bill installment financing charges (interest/fee/tax) onto card liability.
      eventType = "card_emi_charge";
      if (!tx.linkedCardId) {
        pushEx("MISSING_CARD", "Card EMI charge without linkedCardId");
        break;
      }
      const interestP =
        typeof tx.interestPaise === "number" ? Math.max(0, Math.round(tx.interestPaise)) : 0;
      const feeP = typeof tx.feePaise === "number" ? Math.max(0, Math.round(tx.feePaise)) : 0;
      const taxP = typeof tx.taxPaise === "number" ? Math.max(0, Math.round(tx.taxPaise)) : 0;
      const principalP =
        typeof tx.principalComponentPaise === "number"
          ? Math.max(0, Math.round(tx.principalComponentPaise))
          : 0;
      const planId = tx.linkedCardEmiPlanId;
      if (principalP > 0 && planId) {
        // Move EMI principal into billed card liability bucket (net liability unchanged).
        effects.push(
          eff(eventId, userId, "card_emi_plan", planId, "decrease", principalP, "principal"),
        );
        effects.push(
          eff(eventId, userId, "credit_card", tx.linkedCardId, "increase", principalP, "liability"),
        );
      }
      const financeCharges = interestP + feeP + taxP;
      if (financeCharges > 0) {
        effects.push(
          eff(eventId, userId, "credit_card", tx.linkedCardId, "increase", financeCharges, "liability"),
        );
      }
      if (interestP > 0 && tx.categoryId) {
        effects.push(
          eff(eventId, userId, "expense_category", tx.categoryId, "increase", interestP, "interest"),
        );
      }
      if (feeP > 0 && tx.categoryId) {
        effects.push(
          eff(eventId, userId, "expense_category", tx.categoryId, "increase", feeP, "fee"),
        );
      }
      if (taxP > 0 && tx.categoryId) {
        effects.push(
          eff(eventId, userId, "expense_category", tx.categoryId, "increase", taxP, "tax"),
        );
      }
      break;
    }
    default: {
      eventType = "adjustment";
      pushEx("UNSUPPORTED_TYPE", `No ledger mapping for transaction type ${tx.type}`);
    }
  }

  const event = baseEvent(eventType, status);
  return { event, effects, excluded };
}

export function buildFullLedger(
  userId: string,
  transactions: Transaction[],
  ctx: FinanceEventBuilderContext,
  source: FinancialEventSource = "transaction",
): { events: FinancialEvent[]; effects: FinancialEffect[] } {
  const events: FinancialEvent[] = [];
  const effects: FinancialEffect[] = [];
  for (const tx of transactions) {
    if (tx.userId !== userId) continue;
    const r = buildLedgerForTransaction(tx, ctx, source);
    if (r.event) {
      events.push(r.event);
      effects.push(...r.effects);
    }
  }
  return { events, effects };
}
