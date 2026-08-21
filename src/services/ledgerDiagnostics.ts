import type {
  Account,
  Card,
  Category,
  FinancialEffect,
  FinancialEvent,
  Goal,
  Investment,
  Loan,
  Transaction,
  UdhariRecord,
} from "@/types";

export interface LedgerDiagnosticRow {
  id: string;
  reason: string;
}

export interface LedgerDiagnostics {
  transactionsWithoutFinancialEvent: LedgerDiagnosticRow[];
  eventsWithoutEffects: LedgerDiagnosticRow[];
  effectsWithInvalidTarget: LedgerDiagnosticRow[];
  creditCardTransactionsMissingCard: LedgerDiagnosticRow[];
  emiTransactionsMissingLoan: LedgerDiagnosticRow[];
  udhariTransactionsMissingPerson: LedgerDiagnosticRow[];
}

export interface LedgerDiagnosticInput {
  userId: string;
  transactions: Transaction[];
  events: FinancialEvent[];
  effects: FinancialEffect[];
  accounts: Account[];
  cards: Card[];
  loans: Loan[];
  goals: Goal[];
  investments: Investment[];
  udhari: UdhariRecord[];
  categories: Category[];
}

function active<T extends { userId: string; isDeleted?: number }>(rows: T[], userId: string): T[] {
  return rows.filter((r) => r.userId === userId && r.isDeleted !== 1);
}

function setOf<T extends { id: string }>(rows: T[]): Set<string> {
  return new Set(rows.map((r) => r.id));
}

export function diagnoseLedgerCoverage(input: LedgerDiagnosticInput): LedgerDiagnostics {
  const txs = active(input.transactions, input.userId);
  const events = input.events.filter((e) => e.userId === input.userId && !e.deletedAt);
  const effects = input.effects.filter((e) => e.userId === input.userId);

  const eventByTx = new Set(events.map((e) => e.sourceTransactionId));
  const effectByEvent = new Set(effects.map((e) => e.eventId));

  const accountIds = setOf(active(input.accounts, input.userId));
  const cardIds = setOf(active(input.cards, input.userId));
  const loanIds = setOf(active(input.loans, input.userId));
  const goalIds = setOf(active(input.goals, input.userId));
  const investmentIds = setOf(active(input.investments, input.userId));
  const udhariIds = setOf(active(input.udhari, input.userId));
  const categoryIds = setOf(active(input.categories, input.userId));

  const targetExists = (e: FinancialEffect): boolean => {
    switch (e.targetType) {
      case "account":
        return accountIds.has(e.targetId);
      case "credit_card":
        return cardIds.has(e.targetId);
      case "loan":
        return loanIds.has(e.targetId);
      case "goal":
        return goalIds.has(e.targetId);
      case "investment":
        return investmentIds.has(e.targetId);
      case "udhari_person":
        return udhariIds.has(e.targetId);
      case "income_category":
      case "expense_category":
        return categoryIds.has(e.targetId);
      default:
        return false;
    }
  };

  return {
    transactionsWithoutFinancialEvent: txs
      .filter((t) => !eventByTx.has(t.id))
      .map((t) => ({ id: t.id, reason: `${t.type} has no financial_event` })),
    eventsWithoutEffects: events
      .filter((e) => !effectByEvent.has(e.id))
      .map((e) => ({ id: e.id, reason: `${e.eventType} has no financial_effect rows` })),
    effectsWithInvalidTarget: effects
      .filter((e) => !targetExists(e))
      .map((e) => ({ id: e.id, reason: `${e.targetType}:${e.targetId} does not exist for user` })),
    creditCardTransactionsMissingCard: txs
      .filter((t) => t.type === "expense" && t.paymentMode === "credit_card" && !t.linkedCardId)
      .map((t) => ({ id: t.id, reason: "credit-card purchase missing linkedCardId" })),
    emiTransactionsMissingLoan: txs
      .filter((t) => t.type === "emi_payment" && !t.linkedLoanId)
      .map((t) => ({ id: t.id, reason: "EMI payment missing linkedLoanId" })),
    udhariTransactionsMissingPerson: txs
      .filter(
        (t) =>
          (
            t.type === "udhari_given" ||
            t.type === "udhari_received" ||
            t.type === "udhari_collect" ||
            t.type === "udhari_repay" ||
            t.type === "udhari_write_off"
          ) &&
          !t.linkedUdhariId,
      )
      .map((t) => ({ id: t.id, reason: `${t.type} missing linkedUdhariId` })),
  };
}

export function ledgerDiagnosticTotal(diagnostics: LedgerDiagnostics): number {
  return Object.values(diagnostics).reduce((sum, rows) => sum + rows.length, 0);
}
