import Dexie, { type Table } from "dexie";
import type {
  Account,
  AssetValuation,
  AppAlert,
  AttachmentMeta,
  AuditLog,
  Budget,
  Card,
  CardEmiInstallment,
  CardEmiPlan,
  CardPaymentAllocation,
  CardStatement,
  Category,
  CreditLimitGroup,
  EMIPayment,
  ExportHistory,
  FinancialSnapshot,
  FixedIncomeAsset,
  AiSuggestion,
  Goal,
  GoalContribution,
  Household,
  HouseholdMember,
  HouseholdPermission,
  ImportSource,
  InsurancePolicy,
  Investment,
  Loan,
  Obligation,
  ProfileSettings,
  ReconciliationMatch,
  RecurringRule,
  Reminder,
  SavingsContribution,
  Session,
  SinkingFund,
  Transaction,
  TransferLink,
  UdhariRecord,
  UdhariSettlement,
  User,
} from "@/types";
import type { CloudCollectionKey } from "@/lib/cloud/collections";
import { normalizeMoneyEntity } from "@/utils/moneyEntityNormalize";
import type { DurableMutation } from "@/services/durableOutbox";

const MONEY_TABLES: CloudCollectionKey[] = [
  "transactions",
  "accounts",
  "cards",
  "budgets",
  "loans",
  "emis",
  "goals",
  "goalContribs",
  "udhari",
  "udhariSettlements",
  "investments",
  "savingsContribs",
  "recurringRules",
];

export class SparowVaultDB extends Dexie {
  syncMutations!: Table<DurableMutation, number>;
  users!: Table<User, string>;
  sessions!: Table<Session, string>;
  settings!: Table<ProfileSettings, string>;
  accounts!: Table<Account, string>;
  cards!: Table<Card, string>;
  categories!: Table<Category, string>;
  transactions!: Table<Transaction, string>;
  budgets!: Table<Budget, string>;
  goals!: Table<Goal, string>;
  goalContributions!: Table<GoalContribution, string>;
  loans!: Table<Loan, string>;
  emiPayments!: Table<EMIPayment, string>;
  udhari!: Table<UdhariRecord, string>;
  udhariSettlements!: Table<UdhariSettlement, string>;
  investments!: Table<Investment, string>;
  savingsContributions!: Table<SavingsContribution, string>;
  reminders!: Table<Reminder, string>;
  alerts!: Table<AppAlert, string>;
  recurringRules!: Table<RecurringRule, string>;
  attachments!: Table<AttachmentMeta, string>;
  exportHistory!: Table<ExportHistory, string>;
  auditLogs!: Table<AuditLog, string>;
  snapshots!: Table<FinancialSnapshot, string>;
  aiSuggestions!: Table<AiSuggestion, string>;
  transferLinks!: Table<TransferLink, string>;
  creditLimitGroups!: Table<CreditLimitGroup, string>;
  cardStatements!: Table<CardStatement, string>;
  cardPaymentAllocations!: Table<CardPaymentAllocation, string>;
  cardEmiPlans!: Table<CardEmiPlan, string>;
  cardEmiInstallments!: Table<CardEmiInstallment, string>;
  obligations!: Table<Obligation, string>;
  sinkingFunds!: Table<SinkingFund, string>;
  households!: Table<Household, string>;
  householdMembers!: Table<HouseholdMember, string>;
  householdPermissions!: Table<HouseholdPermission, string>;
  fixedIncomeAssets!: Table<FixedIncomeAsset, string>;
  insurancePolicies!: Table<InsurancePolicy, string>;
  assetValuations!: Table<AssetValuation, string>;
  importSources!: Table<ImportSource, string>;
  reconciliationMatches!: Table<ReconciliationMatch, string>;

  constructor(name = "sparowvault_v1") {
    super(name);
    this.version(1).stores({
      users: "id, username, isDeleted",
      sessions: "id, userId",
      settings: "id, userId",
      accounts: "id, userId, type, isDeleted",
      cards: "id, userId, type, isDeleted",
      categories: "id, userId, parentId, appliesTo, isDeleted",
      transactions:
        "id, userId, date, type, categoryId, accountId, linkedCardId, linkedLoanId, linkedGoalId, linkedUdhariId, isDeleted",
      budgets: "id, userId, period, year, month, categoryId, isDeleted",
      goals: "id, userId, status, isDeleted",
      goalContributions: "id, userId, goalId, date, isDeleted",
      loans: "id, userId, status, isDeleted",
      emiPayments: "id, userId, loanId, dueDate, status, isDeleted",
      udhari: "id, userId, type, status, dueDate, isDeleted",
      udhariSettlements: "id, userId, udhariId, date, isDeleted",
      investments: "id, userId, type, status, isDeleted",
      savingsContributions: "id, userId, investmentId, date, isDeleted",
      reminders: "id, userId, dueDate, kind, done, isDeleted",
      alerts: "id, userId, severity, triggeredAt, dismissed, isDeleted",
      recurringRules: "id, userId, nextRunDate, active, isDeleted",
      attachments: "id, userId, linkedType, linkedId, isDeleted",
      exportHistory: "id, userId, createdAt, isDeleted",
      auditLogs: "id, userId, createdAt, action, entity, isDeleted",
      snapshots: "id, userId, periodKey, isDeleted",
    });

    this.version(2)
      .stores({
        users: "id, username, isDeleted",
        sessions: "id, userId",
        settings: "id, userId",
        accounts: "id, userId, type, isDeleted",
        cards: "id, userId, type, isDeleted",
        categories: "id, userId, parentId, appliesTo, isDeleted",
        transactions:
          "id, userId, date, type, categoryId, accountId, linkedCardId, linkedLoanId, linkedGoalId, linkedUdhariId, isDeleted",
        budgets: "id, userId, period, year, month, categoryId, isDeleted",
        goals: "id, userId, status, isDeleted",
        goalContributions: "id, userId, goalId, date, isDeleted",
        loans: "id, userId, status, isDeleted",
        emiPayments: "id, userId, loanId, dueDate, status, isDeleted",
        udhari: "id, userId, type, status, dueDate, isDeleted",
        udhariSettlements: "id, userId, udhariId, date, isDeleted",
        investments: "id, userId, type, status, isDeleted",
        savingsContributions: "id, userId, investmentId, date, isDeleted",
        reminders: "id, userId, dueDate, kind, done, isDeleted",
        alerts: "id, userId, severity, triggeredAt, dismissed, isDeleted",
        recurringRules: "id, userId, nextRunDate, active, isDeleted",
        attachments: "id, userId, linkedType, linkedId, isDeleted",
        exportHistory: "id, userId, createdAt, isDeleted",
        auditLogs: "id, userId, createdAt, action, entity, isDeleted",
        snapshots: "id, userId, periodKey, isDeleted",
      })
      .upgrade(async (tx) => {
        const tableMap: Record<string, CloudCollectionKey> = {
          transactions: "transactions",
          accounts: "accounts",
          cards: "cards",
          budgets: "budgets",
          loans: "loans",
          emiPayments: "emis",
          goals: "goals",
          goalContributions: "goalContribs",
          udhari: "udhari",
          udhariSettlements: "udhariSettlements",
          investments: "investments",
          savingsContributions: "savingsContribs",
          recurringRules: "recurringRules",
        };
        for (const [tableName, collection] of Object.entries(tableMap)) {
          if (!MONEY_TABLES.includes(collection)) continue;
          const tbl = tx.table(tableName);
          await tbl.toCollection().modify((row: Record<string, unknown>) => {
            normalizeMoneyEntity(collection, row, "pull");
          });
        }
      });

    this.version(3).stores({
      users: "id, username, isDeleted",
      sessions: "id, userId",
      settings: "id, userId",
      accounts: "id, userId, type, isDeleted",
      cards: "id, userId, type, isDeleted",
      categories: "id, userId, parentId, appliesTo, isDeleted",
      transactions:
        "id, userId, date, type, categoryId, accountId, linkedCardId, linkedLoanId, linkedGoalId, linkedUdhariId, isDeleted",
      budgets: "id, userId, period, year, month, categoryId, isDeleted",
      goals: "id, userId, status, isDeleted",
      goalContributions: "id, userId, goalId, date, isDeleted",
      loans: "id, userId, status, isDeleted",
      emiPayments: "id, userId, loanId, dueDate, status, isDeleted",
      udhari: "id, userId, type, status, dueDate, isDeleted",
      udhariSettlements: "id, userId, udhariId, date, isDeleted",
      investments: "id, userId, type, status, isDeleted",
      savingsContributions: "id, userId, investmentId, date, isDeleted",
      reminders: "id, userId, dueDate, kind, done, isDeleted",
      alerts: "id, userId, severity, triggeredAt, dismissed, isDeleted",
      recurringRules: "id, userId, nextRunDate, active, isDeleted",
      attachments: "id, userId, linkedType, linkedId, isDeleted",
      exportHistory: "id, userId, createdAt, isDeleted",
      auditLogs: "id, userId, createdAt, action, entity, isDeleted",
      snapshots: "id, userId, periodKey, isDeleted",
      aiSuggestions: "id, userId, dedupeKey, status, isDeleted, expiresAt",
    });

    this.version(4).stores({
      users: "id, username, isDeleted",
      sessions: "id, userId",
      settings: "id, userId",
      accounts: "id, userId, type, isDeleted",
      cards: "id, userId, type, isDeleted",
      categories: "id, userId, parentId, appliesTo, isDeleted",
      transactions:
        "id, userId, date, type, categoryId, accountId, linkedCardId, linkedLoanId, linkedGoalId, linkedUdhariId, isDeleted",
      budgets: "id, userId, period, year, month, categoryId, isDeleted",
      goals: "id, userId, status, isDeleted",
      goalContributions: "id, userId, goalId, date, isDeleted",
      loans: "id, userId, status, isDeleted",
      emiPayments: "id, userId, loanId, dueDate, status, isDeleted",
      udhari: "id, userId, type, status, dueDate, isDeleted",
      udhariSettlements: "id, userId, udhariId, date, isDeleted",
      investments: "id, userId, type, status, isDeleted",
      savingsContributions: "id, userId, investmentId, date, isDeleted",
      reminders: "id, userId, dueDate, kind, done, isDeleted",
      alerts: "id, userId, severity, triggeredAt, dismissed, isDeleted",
      recurringRules: "id, userId, nextRunDate, active, isDeleted",
      attachments: "id, userId, linkedType, linkedId, isDeleted",
      exportHistory: "id, userId, createdAt, isDeleted",
      auditLogs: "id, userId, createdAt, action, entity, isDeleted",
      snapshots: "id, userId, periodKey, isDeleted",
      aiSuggestions: "id, userId, dedupeKey, status, isDeleted, expiresAt",
      transferLinks: "id, userId, fromAccountId, toAccountId, transactionId, status, isDeleted",
      creditLimitGroups: "id, userId, issuerName, isDeleted",
      cardStatements: "id, userId, cardId, statementDate, status, isDeleted",
      cardPaymentAllocations:
        "id, userId, cardId, statementId, transactionId, allocatedAt, isDeleted",
      cardEmiPlans: "id, userId, cardId, startDate, status, isDeleted",
      cardEmiInstallments: "id, userId, planId, dueDate, status, isDeleted",
      obligations:
        "id, userId, sourceType, sourceId, occurrenceKey, dueDate, status, categoryId, accountId, cardId, isDeleted",
      sinkingFunds: "id, userId, targetDate, linkedCategoryId, isDeleted",
      households: "id, userId, isDeleted",
      householdMembers: "id, userId, householdId, role, isDeleted",
      householdPermissions: "id, userId, householdId, memberId, isDeleted",
      fixedIncomeAssets:
        "id, userId, type, startDate, maturityDate, linkedAccountId, status, isDeleted",
      insurancePolicies: "id, userId, premiumDueDay, status, isDeleted",
      assetValuations: "id, userId, assetType, asOfDate, isDeleted",
      importSources: "id, userId, kind, lastImportAt, isDeleted",
      reconciliationMatches:
        "id, userId, leftTransactionId, rightTransactionId, status, isDeleted",
    });
    this.version(5).stores({
      syncMutations: "++sequence,&mutationId,userId,[userId+collection],[userId+collection+entityId],state",
    });
  }
}

let _db: SparowVaultDB | null = null;

export function getDB(): SparowVaultDB {
  if (typeof window === "undefined") {
    // Return a stub in SSR environments — operations should not run server-side
    throw new Error("IndexedDB is only available in the browser.");
  }
  if (!_db) {
    _db = new SparowVaultDB();
  }
  return _db;
}

export function isDBReady(): boolean {
  return typeof window !== "undefined";
}
