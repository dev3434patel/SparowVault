import { useDataStore } from "@/store/dataStore";

export interface ReferenceCheck {
  blocking: boolean;
  count: number;
  message: string;
}

export function refsForAccount(accountId: string): ReferenceCheck {
  const s = useDataStore.getState();
  const txCount = s.transactions.filter(
    (t) => t.accountId === accountId || t.toAccountId === accountId,
  ).length;
  const cardCount = s.cards.filter((c) => c.linkedAccountId === accountId).length;
  const loanCount = s.loans.filter((l) => l.linkedAccountId === accountId).length;
  const total = txCount + cardCount + loanCount;
  return {
    blocking: total > 0,
    count: total,
    message:
      total === 0
        ? ""
        : `${txCount} transaction(s), ${cardCount} card(s), ${loanCount} loan(s) reference this account.`,
  };
}

export function refsForCard(cardId: string): ReferenceCheck {
  const s = useDataStore.getState();
  const count = s.transactions.filter((t) => t.linkedCardId === cardId).length;
  return {
    blocking: count > 0,
    count,
    message: count === 0 ? "" : `${count} transaction(s) reference this card.`,
  };
}

export function refsForLoan(loanId: string): ReferenceCheck {
  const s = useDataStore.getState();
  const txCount = s.transactions.filter((t) => t.linkedLoanId === loanId).length;
  const emiCount = s.emis.filter((e) => e.loanId === loanId).length;
  const total = txCount + emiCount;
  return {
    blocking: total > 0,
    count: total,
    message:
      total === 0
        ? ""
        : `${emiCount} EMI payment(s), ${txCount} transaction(s) reference this loan.`,
  };
}

export function refsForGoal(goalId: string): ReferenceCheck {
  const s = useDataStore.getState();
  const txCount = s.transactions.filter((t) => t.linkedGoalId === goalId).length;
  const contribCount = s.goalContribs.filter((c) => c.goalId === goalId).length;
  const total = txCount + contribCount;
  return {
    blocking: total > 0,
    count: total,
    message:
      total === 0
        ? ""
        : `${contribCount} contribution(s), ${txCount} transaction(s) reference this goal.`,
  };
}

export function refsForInvestment(investmentId: string): ReferenceCheck {
  const s = useDataStore.getState();
  const txCount = s.transactions.filter((t) => t.linkedSavingsId === investmentId).length;
  const contribCount = s.savingsContribs.filter((c) => c.investmentId === investmentId).length;
  const total = txCount + contribCount;
  return {
    blocking: total > 0,
    count: total,
    message:
      total === 0
        ? ""
        : `${contribCount} contribution(s), ${txCount} transaction(s) reference this investment.`,
  };
}

export function refsForUdhari(udhariId: string): ReferenceCheck {
  const s = useDataStore.getState();
  const txCount = s.transactions.filter((t) => t.linkedUdhariId === udhariId).length;
  const settleCount = s.udhariSettlements.filter((u) => u.udhariId === udhariId).length;
  const total = txCount + settleCount;
  return {
    blocking: total > 0,
    count: total,
    message:
      total === 0
        ? ""
        : `${settleCount} settlement(s), ${txCount} transaction(s) reference this entry.`,
  };
}

export function refsForCategory(categoryId: string): ReferenceCheck {
  const s = useDataStore.getState();
  const txCount = s.transactions.filter((t) => t.categoryId === categoryId).length;
  const budgetCount = s.budgets.filter((b) => b.categoryId === categoryId).length;
  const total = txCount + budgetCount;
  return {
    blocking: total > 0,
    count: total,
    message:
      total === 0
        ? ""
        : `${txCount} transaction(s), ${budgetCount} budget(s) reference this category.`,
  };
}
