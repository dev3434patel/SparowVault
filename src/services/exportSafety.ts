import type {
  Account,
  Budget,
  Card,
  Category,
  Goal,
  GoalContribution,
  Investment,
  Loan,
  EMIPayment,
  RecurringRule,
  Reminder,
  SavingsContribution,
  Transaction,
  UdhariRecord,
  UdhariSettlement,
  User,
} from "@/types";

type UserScopedRow = { userId?: string };

function ownRows<T extends UserScopedRow>(rows: T[], userId: string): T[] {
  return rows.filter((row) => row.userId === userId);
}

export interface FullExportCollections {
  settings: unknown;
  accounts: Account[];
  cards: Card[];
  categories: Category[];
  transactions: Transaction[];
  budgets: Budget[];
  goals: Goal[];
  goalContribs: GoalContribution[];
  loans: Loan[];
  emis: EMIPayment[];
  udhari: UdhariRecord[];
  udhariSettlements: UdhariSettlement[];
  investments: Investment[];
  savingsContribs: SavingsContribution[];
  reminders: Reminder[];
  recurringRules: RecurringRule[];
}

export function buildUserOwnedFullExportPayload(
  user: Pick<User, "id" | "username" | "displayName">,
  collections: FullExportCollections,
  exportedAt = new Date().toISOString(),
) {
  return {
    version: 1,
    exportedAt,
    user: {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
    },
    collections: {
      settings: collections.settings,
      accounts: ownRows(collections.accounts, user.id),
      cards: ownRows(collections.cards, user.id),
      categories: ownRows(collections.categories, user.id),
      transactions: ownRows(collections.transactions, user.id),
      budgets: ownRows(collections.budgets, user.id),
      goals: ownRows(collections.goals, user.id),
      goalContribs: ownRows(collections.goalContribs, user.id),
      loans: ownRows(collections.loans, user.id),
      emis: ownRows(collections.emis, user.id),
      udhari: ownRows(collections.udhari, user.id),
      udhariSettlements: ownRows(collections.udhariSettlements, user.id),
      investments: ownRows(collections.investments, user.id),
      savingsContribs: ownRows(collections.savingsContribs, user.id),
      reminders: ownRows(collections.reminders, user.id),
      recurringRules: ownRows(collections.recurringRules, user.id),
    },
  };
}
