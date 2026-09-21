export type SyncContractCollection =
  | "accounts"
  | "cards"
  | "categories"
  | "transactions"
  | "budgets"
  | "loans"
  | "emiPayments"
  | "udhari"
  | "udhariSettlements"
  | "investments"
  | "savingsContributions"
  | "goals"
  | "goalContributions"
  | "reminders"
  | "alerts"
  | "recurringRules"
  | "attachments"
  | "auditLogs"
  | "snapshots"
  | "exportHistory"
  | "settings"
  | "transferLinks"
  | "creditLimitGroups"
  | "cardStatements"
  | "cardPaymentAllocations"
  | "cardEmiPlans"
  | "cardEmiInstallments"
  | "obligations"
  | "sinkingFunds"
  | "households"
  | "householdMembers"
  | "householdPermissions"
  | "fixedIncomeAssets"
  | "insurancePolicies"
  | "assetValuations"
  | "importSources"
  | "reconciliationMatches";

export type SyncMigrationBehavior = "merge-by-id" | "soft-delete-aware" | "local-only-fallback";

export interface SyncContract {
  collectionName: SyncContractCollection;
  dexieStoreName: string;
  serverAllowlistName: string;
  requiredFields: string[];
  optionalFields: string[];
  hotFields: string[];
  validationRules: string[];
  schemaVersion: number;
  migrationBehavior: SyncMigrationBehavior[];
}

const baseFields = ["id", "userId", "createdAt", "updatedAt", "isDeleted", "version"];
const baseOptionalFields = ["tags", "notes", "sourceDeviceId", "schemaVersion"];
const baseHotFields = ["source_device_id", "payload_hash", "schema_version"];
const baseRules = [
  "id must be a non-empty string",
  "userId must match authenticated user_id",
  "isDeleted must be 0, 1, true, or false",
  "payload must fit max row JSON size",
];
const baseMigration: SyncMigrationBehavior[] = ["merge-by-id", "soft-delete-aware"];

function contract(input: Omit<SyncContract, "schemaVersion" | "migrationBehavior"> & Partial<Pick<SyncContract, "schemaVersion" | "migrationBehavior">>): SyncContract {
  return {
    schemaVersion: input.schemaVersion ?? 1,
    migrationBehavior: input.migrationBehavior ?? baseMigration,
    ...input,
  };
}

export const SYNC_CONTRACTS = [
  contract({
    collectionName: "accounts",
    dexieStoreName: "accounts",
    serverAllowlistName: "accounts",
    requiredFields: [...baseFields, "name", "type", "openingBalancePaise", "color", "icon"],
    optionalFields: [...baseOptionalFields, "institution", "openingBalance", "isInactive"],
    hotFields: [...baseHotFields, "account_id"],
    validationRules: [...baseRules, "money fields must be paise integers before sync"],
  }),
  contract({
    collectionName: "cards",
    dexieStoreName: "cards",
    serverAllowlistName: "cards",
    requiredFields: [...baseFields, "nickname", "bank", "last4", "type", "color"],
    optionalFields: [...baseOptionalFields, "linkedAccountId", "creditLimitPaise", "statementDay", "dueDay", "interestRate", "isInactive"],
    hotFields: [...baseHotFields, "card_id", "account_id"],
    validationRules: [...baseRules, "creditLimitPaise must be a paise integer when present"],
  }),
  contract({
    collectionName: "categories",
    dexieStoreName: "categories",
    serverAllowlistName: "categories",
    requiredFields: [...baseFields, "name", "appliesTo", "icon", "color"],
    optionalFields: [...baseOptionalFields, "parentId", "budgetable", "taxRelevant", "gstRelevant", "defaultPaymentMode", "sortOrder", "archived"],
    hotFields: [...baseHotFields, "category_id"],
    validationRules: [...baseRules, "appliesTo must be income, expense, or mixed"],
  }),
  contract({
    collectionName: "transactions",
    dexieStoreName: "transactions",
    serverAllowlistName: "transactions",
    requiredFields: [...baseFields, "date", "type", "amountPaise", "paymentMode", "businessOrPersonal"],
    optionalFields: [
      ...baseOptionalFields,
      "amount",
      "categoryId",
      "accountId",
      "toAccountId",
      "linkedCardId",
      "linkedLoanId",
      "linkedGoalId",
      "linkedUdhariId",
      "linkedSavingsId",
      "merchantOrPerson",
      "description",
      "needWant",
      "fixedVariable",
      "plannedUnplanned",
      "transactionIntent",
      "paymentChannel",
      "fundingInstrument",
      "linkedOriginalTransactionId",
      "isReimbursable",
      "reimbursementPolicy",
      "costBasisPaise",
      "transferLinkId",
      "groupId",
      "linkedCardEmiPlanId",
      "feePaise",
      "taxPaise",
      "interestPaise",
      "principalComponentPaise",
      "statementSource",
    ],
    hotFields: [
      "amount_paise",
      "txn_local_date",
      "txn_month",
      "txn_type",
      "payment_mode",
      "category_id",
      "account_id",
      "card_id",
      "loan_id",
      "goal_id",
      "udhari_id",
      "business_or_personal",
      "source_device_id",
      "payload_hash",
      "schema_version",
    ],
    validationRules: [
      ...baseRules,
      "amountPaise must be a positive paise integer",
      "date must parse to a local transaction date",
      "paymentMode must be in the supported payment-mode enum",
      "credit-card expenses require linkedCardId and must not reduce bank cash",
      "cash-like expenses require accountId",
      "emi_payment requires linkedLoanId and accountId",
      "cc_payment requires linkedCardId and accountId",
      "udhari transaction types require linkedUdhariId, accountId, and merchantOrPerson",
    ],
  }),
  contract({
    collectionName: "budgets",
    dexieStoreName: "budgets",
    serverAllowlistName: "budgets",
    requiredFields: [...baseFields, "period", "year", "categoryId", "limitPaise", "mode"],
    optionalFields: [...baseOptionalFields, "month", "amount", "carryForward", "rolloverSavings"],
    hotFields: [...baseHotFields, "category_id", "amount_paise"],
    validationRules: [...baseRules, "limitPaise must be a paise integer"],
  }),
  contract({
    collectionName: "loans",
    dexieStoreName: "loans",
    serverAllowlistName: "loans",
    requiredFields: [...baseFields, "lender", "loanType", "principalPaise", "startDate", "tenureMonths", "annualInterestRate", "emiDueDay", "status"],
    optionalFields: [...baseOptionalFields, "lifecycleMode", "completedEmis", "remainingEmis", "outstandingPrincipalPaise", "emiPaise", "linkedAccountId", "linkedCardId", "blockedAmount"],
    hotFields: [...baseHotFields, "loan_id", "account_id", "card_id", "amount_paise"],
    validationRules: [...baseRules, "principalPaise and outstandingPrincipalPaise must be paise integers when present"],
  }),
  contract({
    collectionName: "emiPayments",
    dexieStoreName: "emiPayments",
    serverAllowlistName: "emis",
    requiredFields: [...baseFields, "loanId", "dueDate", "amountPaise", "status"],
    optionalFields: [...baseOptionalFields, "paidDate", "amountPaidPaise", "principalComponentPaise", "interestComponentPaise", "penaltyPaise", "feePaise", "transactionId"],
    hotFields: [...baseHotFields, "loan_id", "amount_paise", "txn_local_date", "txn_month"],
    validationRules: [...baseRules, "amount and split fields must be paise integers"],
  }),
  contract({
    collectionName: "udhari",
    dexieStoreName: "udhari",
    serverAllowlistName: "udhari",
    requiredFields: [...baseFields, "personName", "type", "amountPaise", "givenDate", "status"],
    optionalFields: [...baseOptionalFields, "phone", "dueDate", "amountSettledPaise", "reminderOn", "context"],
    hotFields: [...baseHotFields, "udhari_id", "amount_paise", "txn_local_date"],
    validationRules: [...baseRules, "type must be receivable or payable"],
  }),
  contract({
    collectionName: "udhariSettlements",
    dexieStoreName: "udhariSettlements",
    serverAllowlistName: "udhariSettlements",
    requiredFields: [...baseFields, "udhariId", "date", "amountPaise"],
    optionalFields: [...baseOptionalFields, "transactionId", "accountId", "kind"],
    hotFields: [...baseHotFields, "udhari_id", "account_id", "amount_paise", "txn_local_date", "txn_month"],
    validationRules: [...baseRules, "settlement amount must be a paise integer"],
  }),
  contract({
    collectionName: "investments",
    dexieStoreName: "investments",
    serverAllowlistName: "investments",
    requiredFields: [...baseFields, "name", "type", "startDate", "frequency", "amountPaise", "status"],
    optionalFields: [...baseOptionalFields, "totalContributedPaise", "maturityDate", "expectedReturnRate", "linkedAccountId"],
    hotFields: [...baseHotFields, "account_id", "amount_paise"],
    validationRules: [...baseRules, "amount fields must be paise integers"],
  }),
  contract({
    collectionName: "savingsContributions",
    dexieStoreName: "savingsContributions",
    serverAllowlistName: "savingsContribs",
    requiredFields: [...baseFields, "investmentId", "date", "amountPaise"],
    optionalFields: [...baseOptionalFields, "transactionId"],
    hotFields: [...baseHotFields, "amount_paise", "txn_local_date", "txn_month"],
    validationRules: [...baseRules, "amountPaise must be a positive paise integer"],
  }),
  contract({
    collectionName: "goals",
    dexieStoreName: "goals",
    serverAllowlistName: "goals",
    requiredFields: [...baseFields, "title", "goalType", "targetAmountPaise", "targetDate", "startedAt", "savedAmountPaise", "priority", "icon", "color", "status"],
    optionalFields: [...baseOptionalFields, "linkedAccountId", "autoContribution"],
    hotFields: [...baseHotFields, "goal_id", "account_id", "amount_paise"],
    validationRules: [...baseRules, "targetAmountPaise and savedAmountPaise must be paise integers"],
  }),
  contract({
    collectionName: "goalContributions",
    dexieStoreName: "goalContributions",
    serverAllowlistName: "goalContribs",
    requiredFields: [...baseFields, "goalId", "date", "amountPaise"],
    optionalFields: [...baseOptionalFields, "sourceAccountId", "transactionId"],
    hotFields: [...baseHotFields, "goal_id", "account_id", "amount_paise", "txn_local_date", "txn_month"],
    validationRules: [...baseRules, "amountPaise must be a positive paise integer"],
  }),
  contract({
    collectionName: "reminders",
    dexieStoreName: "reminders",
    serverAllowlistName: "reminders",
    requiredFields: [...baseFields, "kind", "title", "dueDate", "done"],
    optionalFields: [...baseOptionalFields, "amount", "linkedId", "recurring", "intervalDays"],
    hotFields: [...baseHotFields, "txn_local_date"],
    validationRules: [...baseRules, "dueDate must parse as a date"],
  }),
  contract({
    collectionName: "alerts",
    dexieStoreName: "alerts",
    serverAllowlistName: "alerts",
    requiredFields: [...baseFields, "kind", "severity", "title", "message", "dismissed", "triggeredAt"],
    optionalFields: [...baseOptionalFields, "linkHref"],
    hotFields: [...baseHotFields],
    validationRules: [...baseRules, "severity must be info, warning, danger, or success"],
  }),
  contract({
    collectionName: "recurringRules",
    dexieStoreName: "recurringRules",
    serverAllowlistName: "recurringRules",
    requiredFields: [...baseFields, "title", "type", "amountPaise", "paymentMode", "frequency", "nextRunDate", "active"],
    optionalFields: [...baseOptionalFields, "categoryId", "accountId", "dayOfMonth", "dayOfWeek", "endDate"],
    hotFields: [...baseHotFields, "category_id", "account_id", "amount_paise", "txn_type", "payment_mode"],
    validationRules: [...baseRules, "amountPaise must be a positive paise integer"],
  }),
  contract({
    collectionName: "attachments",
    dexieStoreName: "attachments",
    serverAllowlistName: "attachments",
    requiredFields: [...baseFields, "fileName", "mimeType", "sizeBytes", "linkedType", "linkedId"],
    optionalFields: [...baseOptionalFields],
    hotFields: [...baseHotFields],
    validationRules: [...baseRules, "binary payloads are metadata-only in sync rows"],
  }),
  contract({
    collectionName: "auditLogs",
    dexieStoreName: "auditLogs",
    serverAllowlistName: "auditLogs",
    requiredFields: [...baseFields, "action", "entity", "detail"],
    optionalFields: [...baseOptionalFields, "entityId"],
    hotFields: [...baseHotFields],
    validationRules: [...baseRules, "client audit logs are user-owned and never admin audit logs"],
  }),
  contract({
    collectionName: "snapshots",
    dexieStoreName: "snapshots",
    serverAllowlistName: "snapshots",
    requiredFields: [...baseFields, "periodKey"],
    optionalFields: [...baseOptionalFields, "totalIncome", "totalExpense", "netSavings", "savingsRate", "budgetUsage", "creditUtilization", "healthScore"],
    hotFields: [...baseHotFields, "txn_month"],
    validationRules: [...baseRules, "snapshot money values must be deterministic derived values"],
  }),
  contract({
    collectionName: "exportHistory",
    dexieStoreName: "exportHistory",
    serverAllowlistName: "exportHistory",
    requiredFields: [...baseFields, "scope", "format", "fileName", "rowCount"],
    optionalFields: [...baseOptionalFields, "fromDate", "toDate"],
    hotFields: [...baseHotFields],
    validationRules: [...baseRules, "export rows must be scoped to authenticated user only"],
  }),
  contract({
    collectionName: "settings",
    dexieStoreName: "settings",
    serverAllowlistName: "settings",
    requiredFields: [...baseFields, "theme", "financialYearStartMonth", "dateFormat", "currency"],
    optionalFields: [...baseOptionalFields, "customPaymentModes", "budgetThresholds", "quickAddDefaults", "warningPreferences"],
    hotFields: [...baseHotFields],
    validationRules: [...baseRules, "settings are one row per user/profile"],
  }),
  contract({
    collectionName: "transferLinks",
    dexieStoreName: "transferLinks",
    serverAllowlistName: "transferLinks",
    requiredFields: [...baseFields, "fromAccountId", "toAccountId", "amountPaise", "transactionId", "status"],
    optionalFields: [...baseOptionalFields, "channel", "reference", "utr", "feeTransactionId"],
    hotFields: [...baseHotFields, "account_id", "amount_paise"],
    validationRules: [...baseRules, "amountPaise must be a positive paise integer"],
  }),
  contract({
    collectionName: "creditLimitGroups",
    dexieStoreName: "creditLimitGroups",
    serverAllowlistName: "creditLimitGroups",
    requiredFields: [...baseFields, "name", "totalLimitPaise"],
    optionalFields: [...baseOptionalFields, "issuerName"],
    hotFields: [...baseHotFields, "amount_paise"],
    validationRules: [...baseRules, "totalLimitPaise must be a non-negative paise integer"],
  }),
  contract({
    collectionName: "cardStatements",
    dexieStoreName: "cardStatements",
    serverAllowlistName: "cardStatements",
    requiredFields: [
      ...baseFields,
      "cardId",
      "cycleStartDate",
      "cycleEndDate",
      "statementDate",
      "openingBalancePaise",
      "closingBalancePaise",
      "minimumDuePaise",
      "retailSpendPaise",
      "feesPaise",
      "interestPaise",
      "paymentsPaise",
      "creditsPaise",
      "status",
    ],
    optionalFields: [...baseOptionalFields],
    hotFields: [...baseHotFields, "card_id", "amount_paise", "txn_local_date", "txn_month"],
    validationRules: [...baseRules, "statement money fields must be paise integers"],
  }),
  contract({
    collectionName: "cardPaymentAllocations",
    dexieStoreName: "cardPaymentAllocations",
    serverAllowlistName: "cardPaymentAllocations",
    requiredFields: [...baseFields, "cardId", "transactionId", "amountPaise", "allocatedAt"],
    optionalFields: [...baseOptionalFields, "statementId"],
    hotFields: [...baseHotFields, "card_id", "amount_paise"],
    validationRules: [...baseRules, "amountPaise must be a positive paise integer"],
  }),
  contract({
    collectionName: "cardEmiPlans",
    dexieStoreName: "cardEmiPlans",
    serverAllowlistName: "cardEmiPlans",
    requiredFields: [
      ...baseFields,
      "cardId",
      "purchaseTransactionIds",
      "principalPaise",
      "annualRateBps",
      "tenureMonths",
      "emiPaise",
      "startDate",
      "status",
      "scheduleStrategy",
      "calculationVersion",
    ],
    optionalFields: [...baseOptionalFields, "noCostEmi", "merchantSubsidyPaise"],
    hotFields: [...baseHotFields, "card_id", "amount_paise", "txn_local_date"],
    validationRules: [...baseRules, "principalPaise, emiPaise, and merchantSubsidyPaise must be paise integers"],
  }),
  contract({
    collectionName: "cardEmiInstallments",
    dexieStoreName: "cardEmiInstallments",
    serverAllowlistName: "cardEmiInstallments",
    requiredFields: [
      ...baseFields,
      "planId",
      "installmentNo",
      "dueDate",
      "emiPaise",
      "principalPaise",
      "interestPaise",
      "feePaise",
      "taxPaise",
      "status",
      "source",
    ],
    optionalFields: [...baseOptionalFields],
    hotFields: [...baseHotFields, "amount_paise", "txn_local_date", "txn_month"],
    validationRules: [...baseRules, "installment money fields must be paise integers"],
  }),
  contract({
    collectionName: "obligations",
    dexieStoreName: "obligations",
    serverAllowlistName: "obligations",
    requiredFields: [...baseFields, "sourceType", "sourceId", "occurrenceKey", "title", "dueDate", "amountPaise", "status"],
    optionalFields: [...baseOptionalFields, "categoryId", "accountId", "cardId"],
    hotFields: [...baseHotFields, "category_id", "account_id", "card_id", "amount_paise", "txn_local_date", "txn_month"],
    validationRules: [...baseRules, "amountPaise must be a non-negative paise integer"],
  }),
  contract({
    collectionName: "sinkingFunds",
    dexieStoreName: "sinkingFunds",
    serverAllowlistName: "sinkingFunds",
    requiredFields: [...baseFields, "name", "targetPaise", "targetDate"],
    optionalFields: [...baseOptionalFields, "linkedCategoryId", "monthlyRequiredPaise"],
    hotFields: [...baseHotFields, "category_id", "amount_paise", "txn_local_date"],
    validationRules: [...baseRules, "targetPaise and monthlyRequiredPaise must be paise integers"],
  }),
  contract({
    collectionName: "households",
    dexieStoreName: "households",
    serverAllowlistName: "households",
    requiredFields: [...baseFields, "name", "defaultCurrency"],
    optionalFields: [...baseOptionalFields],
    hotFields: [...baseHotFields],
    validationRules: [...baseRules, "defaultCurrency must be INR"],
  }),
  contract({
    collectionName: "householdMembers",
    dexieStoreName: "householdMembers",
    serverAllowlistName: "householdMembers",
    requiredFields: [...baseFields, "householdId", "role", "displayName"],
    optionalFields: [...baseOptionalFields],
    hotFields: [...baseHotFields],
    validationRules: [...baseRules, "role must be owner, partner, or viewer"],
  }),
  contract({
    collectionName: "householdPermissions",
    dexieStoreName: "householdPermissions",
    serverAllowlistName: "householdPermissions",
    requiredFields: [...baseFields, "householdId", "memberId", "canViewTransactions", "canEditTransactions", "canViewBalances"],
    optionalFields: [...baseOptionalFields],
    hotFields: [...baseHotFields],
    validationRules: [...baseRules, "permission fields must be 0 or 1"],
  }),
  contract({
    collectionName: "fixedIncomeAssets",
    dexieStoreName: "fixedIncomeAssets",
    serverAllowlistName: "fixedIncomeAssets",
    requiredFields: [...baseFields, "name", "type", "principalPaise", "rateBps", "startDate", "maturityDate", "status"],
    optionalFields: [...baseOptionalFields, "linkedAccountId"],
    hotFields: [...baseHotFields, "account_id", "amount_paise"],
    validationRules: [...baseRules, "principalPaise must be a non-negative paise integer"],
  }),
  contract({
    collectionName: "insurancePolicies",
    dexieStoreName: "insurancePolicies",
    serverAllowlistName: "insurancePolicies",
    requiredFields: [...baseFields, "name", "insurer", "premiumPaise", "premiumDueDay", "coveragePaise", "status"],
    optionalFields: [...baseOptionalFields],
    hotFields: [...baseHotFields, "amount_paise"],
    validationRules: [...baseRules, "premiumPaise and coveragePaise must be non-negative paise integers"],
  }),
  contract({
    collectionName: "assetValuations",
    dexieStoreName: "assetValuations",
    serverAllowlistName: "assetValuations",
    requiredFields: [...baseFields, "assetType", "label", "valuePaise", "asOfDate"],
    optionalFields: [...baseOptionalFields],
    hotFields: [...baseHotFields, "amount_paise", "txn_local_date"],
    validationRules: [...baseRules, "valuePaise must be a non-negative paise integer"],
  }),
  contract({
    collectionName: "importSources",
    dexieStoreName: "importSources",
    serverAllowlistName: "importSources",
    requiredFields: [...baseFields, "name", "kind"],
    optionalFields: [...baseOptionalFields, "lastImportAt"],
    hotFields: [...baseHotFields],
    validationRules: [...baseRules, "kind must be csv, manual, or aa_ready"],
  }),
  contract({
    collectionName: "reconciliationMatches",
    dexieStoreName: "reconciliationMatches",
    serverAllowlistName: "reconciliationMatches",
    requiredFields: [...baseFields, "leftTransactionId", "status", "confidence"],
    optionalFields: [...baseOptionalFields, "rightTransactionId"],
    hotFields: [...baseHotFields],
    validationRules: [...baseRules, "confidence must be between 0 and 1"],
  }),
] as const satisfies readonly SyncContract[];

export const SYNC_CONTRACT_COLLECTIONS = SYNC_CONTRACTS.map((c) => c.collectionName);
export const SYNC_CONTRACT_SERVER_ALLOWLIST = SYNC_CONTRACTS.map((c) => c.serverAllowlistName);
export const SYNC_CONTRACT_DEXIE_STORES = SYNC_CONTRACTS.map((c) => c.dexieStoreName);

export type ServerSyncCollectionKey = (typeof SYNC_CONTRACT_SERVER_ALLOWLIST)[number];
