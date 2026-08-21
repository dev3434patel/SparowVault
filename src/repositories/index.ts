import { getDB } from "@/db/database";
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
  SinkingFund,
  Transaction,
  TransferLink,
  UdhariRecord,
  UdhariSettlement,
  User,
} from "@/types";
import { BaseRepo } from "./baseRepo";

export const userRepo = new BaseRepo<User>(() => getDB().users, "usr");
export const settingsRepo = new BaseRepo<ProfileSettings>(
  () => getDB().settings,
  "set",
  "settings",
);
export const accountRepo = new BaseRepo<Account>(() => getDB().accounts, "acc", "accounts");
export const cardRepo = new BaseRepo<Card>(() => getDB().cards, "crd", "cards");
export const categoryRepo = new BaseRepo<Category>(
  () => getDB().categories,
  "cat",
  "categories",
);
export const transactionRepo = new BaseRepo<Transaction>(
  () => getDB().transactions,
  "txn",
  "transactions",
);
export const budgetRepo = new BaseRepo<Budget>(() => getDB().budgets, "bgt", "budgets");
export const goalRepo = new BaseRepo<Goal>(() => getDB().goals, "gol", "goals");
export const goalContribRepo = new BaseRepo<GoalContribution>(
  () => getDB().goalContributions,
  "gcn",
  "goalContribs",
);
export const loanRepo = new BaseRepo<Loan>(() => getDB().loans, "lon", "loans");
export const emiRepo = new BaseRepo<EMIPayment>(
  () => getDB().emiPayments,
  "emi",
  "emis",
);
export const udhariRepo = new BaseRepo<UdhariRecord>(
  () => getDB().udhari,
  "udh",
  "udhari",
);
export const udhariSettlementRepo = new BaseRepo<UdhariSettlement>(
  () => getDB().udhariSettlements,
  "uds",
  "udhariSettlements",
);
export const investmentRepo = new BaseRepo<Investment>(
  () => getDB().investments,
  "inv",
  "investments",
);
export const savingsContribRepo = new BaseRepo<SavingsContribution>(
  () => getDB().savingsContributions,
  "svc",
  "savingsContribs",
);
export const reminderRepo = new BaseRepo<Reminder>(
  () => getDB().reminders,
  "rem",
  "reminders",
);
export const alertRepo = new BaseRepo<AppAlert>(() => getDB().alerts, "alt", "alerts");
export const recurringRepo = new BaseRepo<RecurringRule>(
  () => getDB().recurringRules,
  "rcr",
  "recurringRules",
);
export const attachmentRepo = new BaseRepo<AttachmentMeta>(
  () => getDB().attachments,
  "att",
  "attachments",
);
export const exportHistoryRepo = new BaseRepo<ExportHistory>(
  () => getDB().exportHistory,
  "exh",
  "exportHistory",
);
export const auditRepo = new BaseRepo<AuditLog>(() => getDB().auditLogs, "aud", "auditLogs");
export const snapshotRepo = new BaseRepo<FinancialSnapshot>(
  () => getDB().snapshots,
  "snp",
  "snapshots",
);
export const aiSuggestionRepo = new BaseRepo<AiSuggestion>(
  () => getDB().aiSuggestions,
  "ais",
);
export const transferLinkRepo = new BaseRepo<TransferLink>(
  () => getDB().transferLinks,
  "tln",
  "transferLinks",
);
export const creditLimitGroupRepo = new BaseRepo<CreditLimitGroup>(
  () => getDB().creditLimitGroups,
  "clg",
  "creditLimitGroups",
);
export const cardStatementRepo = new BaseRepo<CardStatement>(
  () => getDB().cardStatements,
  "cst",
  "cardStatements",
);
export const cardPaymentAllocationRepo = new BaseRepo<CardPaymentAllocation>(
  () => getDB().cardPaymentAllocations,
  "cpa",
  "cardPaymentAllocations",
);
export const cardEmiPlanRepo = new BaseRepo<CardEmiPlan>(
  () => getDB().cardEmiPlans,
  "cep",
  "cardEmiPlans",
);
export const cardEmiInstallmentRepo = new BaseRepo<CardEmiInstallment>(
  () => getDB().cardEmiInstallments,
  "cei",
  "cardEmiInstallments",
);
export const obligationRepo = new BaseRepo<Obligation>(
  () => getDB().obligations,
  "obl",
  "obligations",
);
export const sinkingFundRepo = new BaseRepo<SinkingFund>(
  () => getDB().sinkingFunds,
  "skf",
  "sinkingFunds",
);
export const householdRepo = new BaseRepo<Household>(
  () => getDB().households,
  "hhd",
  "households",
);
export const householdMemberRepo = new BaseRepo<HouseholdMember>(
  () => getDB().householdMembers,
  "hhm",
  "householdMembers",
);
export const householdPermissionRepo = new BaseRepo<HouseholdPermission>(
  () => getDB().householdPermissions,
  "hhp",
  "householdPermissions",
);
export const fixedIncomeAssetRepo = new BaseRepo<FixedIncomeAsset>(
  () => getDB().fixedIncomeAssets,
  "fia",
  "fixedIncomeAssets",
);
export const insurancePolicyRepo = new BaseRepo<InsurancePolicy>(
  () => getDB().insurancePolicies,
  "inp",
  "insurancePolicies",
);
export const assetValuationRepo = new BaseRepo<AssetValuation>(
  () => getDB().assetValuations,
  "asv",
  "assetValuations",
);
export const importSourceRepo = new BaseRepo<ImportSource>(
  () => getDB().importSources,
  "ims",
  "importSources",
);
export const reconciliationMatchRepo = new BaseRepo<ReconciliationMatch>(
  () => getDB().reconciliationMatches,
  "rcm",
  "reconciliationMatches",
);
