import { cardStatementForExport } from "@/services/statements/cardMoneyFact";
import type {
  Account,
  AssetValuation,
  AttachmentMeta,
  Budget,
  Card,
  CardEmiInstallment,
  CardEmiPlan,
  CardPaymentAllocation,
  CardStatement,
  Category,
  FinancialSnapshot,
  FixedIncomeAsset,
  Goal,
  GoalContribution,
  Household,
  HouseholdMember,
  HouseholdPermission,
  ImportSource,
  InsurancePolicy,
  Investment,
  Loan,
  EMIPayment,
  Obligation,
  ReconciliationMatch,
  RecurringRule,
  Reminder,
  SavingsContribution,
  SinkingFund,
  Transaction,
  TransferLink,
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
  transferLinks?: TransferLink[];
  cardStatements?: CardStatement[];
  cardPaymentAllocations?: CardPaymentAllocation[];
  cardEmiPlans?: CardEmiPlan[];
  cardEmiInstallments?: CardEmiInstallment[];
  obligations?: Obligation[];
  sinkingFunds?: SinkingFund[];
  households?: Household[];
  householdMembers?: HouseholdMember[];
  householdPermissions?: HouseholdPermission[];
  fixedIncomeAssets?: FixedIncomeAsset[];
  insurancePolicies?: InsurancePolicy[];
  assetValuations?: AssetValuation[];
  importSources?: ImportSource[];
  reconciliationMatches?: ReconciliationMatch[];
  attachments?: AttachmentMeta[];
  snapshots?: FinancialSnapshot[];
}

export const PERSONAL_BACKUP_EXTRA_KEYS = [
  "transferLinks",
  "cardStatements",
  "cardPaymentAllocations",
  "cardEmiPlans",
  "cardEmiInstallments",
  "obligations",
  "sinkingFunds",
  "households",
  "householdMembers",
  "householdPermissions",
  "fixedIncomeAssets",
  "insurancePolicies",
  "assetValuations",
  "importSources",
  "reconciliationMatches",
  "attachments",
  "snapshots",
] as const satisfies readonly (keyof FullExportCollections)[];

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
      ...ownedExtras(collections, user.id),
    },
  };
}

function ownedExtras(collections: FullExportCollections, userId: string): Record<string, unknown[]> {
  const extras: Record<string, unknown[]> = {};
  for (const key of PERSONAL_BACKUP_EXTRA_KEYS) {
    const rows = collections[key];
    if (!rows) continue;
    const owned = ownRows(rows as UserScopedRow[], userId);
    extras[key] = key === "cardStatements" ? owned.map((row) => cardStatementForExport(row as CardStatement)) : owned;
  }
  return extras;
}
