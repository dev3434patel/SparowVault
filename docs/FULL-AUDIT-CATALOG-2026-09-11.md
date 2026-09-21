# SparowVault Static Audit Catalog - 2026-09-11

Companion to FULL-PROJECT-AUDIT-2026-09-11.md. Generated from the current source, not inferred from earlier reports.

These inventories are source-level evidence, NOT a claim that every listed function, field, button or conditional state was executed. See the main report and machine-readable check results for actual runtime coverage. Repeated render definitions are counted once; a definition can produce many controls. Field and input entries can refer to the same visible form field.

## Collection Contracts

All 37 server allowlist names received owner/other-owner/anonymous list probes in the isolated extended audit. Declared validation below is intended metadata: runtime tests demonstrate that non-transaction collection schemas and relationships are not fully enforced. API aliases use the same controller. Canonical values should be integer paise; rupee mirrors remain in some components.

### accounts

- Contract name: `accounts`; IndexedDB store: `accounts`; schema version: 1.
- Required (declared): `id`, `userId`, `createdAt`, `updatedAt`, `isDeleted`, `version`, `name`, `type`, `openingBalancePaise`, `color`, `icon`.
- Optional (declared): `tags`, `notes`, `sourceDeviceId`, `schemaVersion`, `institution`, `openingBalance`, `isInactive`.
- Indexed/hot fields: `source_device_id`, `payload_hash`, `schema_version`, `account_id`.
- Declared rules: id must be a non-empty string; userId must match authenticated user_id; isDeleted must be 0, 1, true, or false; payload must fit max row JSON size; money fields must be paise integers before sync.
- Migration intent: merge-by-id, soft-delete-aware.

### cards

- Contract name: `cards`; IndexedDB store: `cards`; schema version: 1.
- Required (declared): `id`, `userId`, `createdAt`, `updatedAt`, `isDeleted`, `version`, `nickname`, `bank`, `last4`, `type`, `color`.
- Optional (declared): `tags`, `notes`, `sourceDeviceId`, `schemaVersion`, `linkedAccountId`, `creditLimitPaise`, `statementDay`, `dueDay`, `interestRate`, `isInactive`.
- Indexed/hot fields: `source_device_id`, `payload_hash`, `schema_version`, `card_id`, `account_id`.
- Declared rules: id must be a non-empty string; userId must match authenticated user_id; isDeleted must be 0, 1, true, or false; payload must fit max row JSON size; creditLimitPaise must be a paise integer when present.
- Migration intent: merge-by-id, soft-delete-aware.

### categories

- Contract name: `categories`; IndexedDB store: `categories`; schema version: 1.
- Required (declared): `id`, `userId`, `createdAt`, `updatedAt`, `isDeleted`, `version`, `name`, `appliesTo`, `icon`, `color`.
- Optional (declared): `tags`, `notes`, `sourceDeviceId`, `schemaVersion`, `parentId`, `budgetable`, `taxRelevant`, `gstRelevant`, `defaultPaymentMode`, `sortOrder`, `archived`.
- Indexed/hot fields: `source_device_id`, `payload_hash`, `schema_version`, `category_id`.
- Declared rules: id must be a non-empty string; userId must match authenticated user_id; isDeleted must be 0, 1, true, or false; payload must fit max row JSON size; appliesTo must be income, expense, or mixed.
- Migration intent: merge-by-id, soft-delete-aware.

### transactions

- Contract name: `transactions`; IndexedDB store: `transactions`; schema version: 1.
- Required (declared): `id`, `userId`, `createdAt`, `updatedAt`, `isDeleted`, `version`, `date`, `type`, `amountPaise`, `paymentMode`, `businessOrPersonal`.
- Optional (declared): `tags`, `notes`, `sourceDeviceId`, `schemaVersion`, `amount`, `categoryId`, `accountId`, `toAccountId`, `linkedCardId`, `linkedLoanId`, `linkedGoalId`, `linkedUdhariId`, `linkedSavingsId`, `merchantOrPerson`, `description`, `needWant`, `fixedVariable`, `plannedUnplanned`, `transactionIntent`, `paymentChannel`, `fundingInstrument`, `linkedOriginalTransactionId`, `isReimbursable`, `reimbursementPolicy`, `costBasisPaise`, `transferLinkId`, `groupId`, `linkedCardEmiPlanId`, `feePaise`, `taxPaise`, `interestPaise`, `principalComponentPaise`, `statementSource`.
- Indexed/hot fields: `amount_paise`, `txn_local_date`, `txn_month`, `txn_type`, `payment_mode`, `category_id`, `account_id`, `card_id`, `loan_id`, `goal_id`, `udhari_id`, `business_or_personal`, `source_device_id`, `payload_hash`, `schema_version`.
- Declared rules: id must be a non-empty string; userId must match authenticated user_id; isDeleted must be 0, 1, true, or false; payload must fit max row JSON size; amountPaise must be a positive paise integer; date must parse to a local transaction date; paymentMode must be in the supported payment-mode enum; credit-card expenses require linkedCardId and must not reduce bank cash; cash-like expenses require accountId; emi_payment requires linkedLoanId and accountId; cc_payment requires linkedCardId and accountId; udhari transaction types require linkedUdhariId, accountId, and merchantOrPerson.
- Migration intent: merge-by-id, soft-delete-aware.

### budgets

- Contract name: `budgets`; IndexedDB store: `budgets`; schema version: 1.
- Required (declared): `id`, `userId`, `createdAt`, `updatedAt`, `isDeleted`, `version`, `period`, `year`, `categoryId`, `limitPaise`, `mode`.
- Optional (declared): `tags`, `notes`, `sourceDeviceId`, `schemaVersion`, `month`, `amount`, `carryForward`, `rolloverSavings`.
- Indexed/hot fields: `source_device_id`, `payload_hash`, `schema_version`, `category_id`, `amount_paise`.
- Declared rules: id must be a non-empty string; userId must match authenticated user_id; isDeleted must be 0, 1, true, or false; payload must fit max row JSON size; limitPaise must be a paise integer.
- Migration intent: merge-by-id, soft-delete-aware.

### loans

- Contract name: `loans`; IndexedDB store: `loans`; schema version: 1.
- Required (declared): `id`, `userId`, `createdAt`, `updatedAt`, `isDeleted`, `version`, `lender`, `loanType`, `principalPaise`, `startDate`, `tenureMonths`, `annualInterestRate`, `emiDueDay`, `status`.
- Optional (declared): `tags`, `notes`, `sourceDeviceId`, `schemaVersion`, `lifecycleMode`, `completedEmis`, `remainingEmis`, `outstandingPrincipalPaise`, `emiPaise`, `linkedAccountId`, `linkedCardId`, `blockedAmount`.
- Indexed/hot fields: `source_device_id`, `payload_hash`, `schema_version`, `loan_id`, `account_id`, `card_id`, `amount_paise`.
- Declared rules: id must be a non-empty string; userId must match authenticated user_id; isDeleted must be 0, 1, true, or false; payload must fit max row JSON size; principalPaise and outstandingPrincipalPaise must be paise integers when present.
- Migration intent: merge-by-id, soft-delete-aware.

### emis

- Contract name: `emiPayments`; IndexedDB store: `emiPayments`; schema version: 1.
- Required (declared): `id`, `userId`, `createdAt`, `updatedAt`, `isDeleted`, `version`, `loanId`, `dueDate`, `amountPaise`, `status`.
- Optional (declared): `tags`, `notes`, `sourceDeviceId`, `schemaVersion`, `paidDate`, `amountPaidPaise`, `principalComponentPaise`, `interestComponentPaise`, `penaltyPaise`, `feePaise`, `transactionId`.
- Indexed/hot fields: `source_device_id`, `payload_hash`, `schema_version`, `loan_id`, `amount_paise`, `txn_local_date`, `txn_month`.
- Declared rules: id must be a non-empty string; userId must match authenticated user_id; isDeleted must be 0, 1, true, or false; payload must fit max row JSON size; amount and split fields must be paise integers.
- Migration intent: merge-by-id, soft-delete-aware.

### udhari

- Contract name: `udhari`; IndexedDB store: `udhari`; schema version: 1.
- Required (declared): `id`, `userId`, `createdAt`, `updatedAt`, `isDeleted`, `version`, `personName`, `type`, `amountPaise`, `givenDate`, `status`.
- Optional (declared): `tags`, `notes`, `sourceDeviceId`, `schemaVersion`, `phone`, `dueDate`, `amountSettledPaise`, `reminderOn`, `context`.
- Indexed/hot fields: `source_device_id`, `payload_hash`, `schema_version`, `udhari_id`, `amount_paise`, `txn_local_date`.
- Declared rules: id must be a non-empty string; userId must match authenticated user_id; isDeleted must be 0, 1, true, or false; payload must fit max row JSON size; type must be receivable or payable.
- Migration intent: merge-by-id, soft-delete-aware.

### udhariSettlements

- Contract name: `udhariSettlements`; IndexedDB store: `udhariSettlements`; schema version: 1.
- Required (declared): `id`, `userId`, `createdAt`, `updatedAt`, `isDeleted`, `version`, `udhariId`, `date`, `amountPaise`.
- Optional (declared): `tags`, `notes`, `sourceDeviceId`, `schemaVersion`, `transactionId`, `accountId`, `kind`.
- Indexed/hot fields: `source_device_id`, `payload_hash`, `schema_version`, `udhari_id`, `account_id`, `amount_paise`, `txn_local_date`, `txn_month`.
- Declared rules: id must be a non-empty string; userId must match authenticated user_id; isDeleted must be 0, 1, true, or false; payload must fit max row JSON size; settlement amount must be a paise integer.
- Migration intent: merge-by-id, soft-delete-aware.

### investments

- Contract name: `investments`; IndexedDB store: `investments`; schema version: 1.
- Required (declared): `id`, `userId`, `createdAt`, `updatedAt`, `isDeleted`, `version`, `name`, `type`, `startDate`, `frequency`, `amountPaise`, `status`.
- Optional (declared): `tags`, `notes`, `sourceDeviceId`, `schemaVersion`, `totalContributedPaise`, `maturityDate`, `expectedReturnRate`, `linkedAccountId`.
- Indexed/hot fields: `source_device_id`, `payload_hash`, `schema_version`, `account_id`, `amount_paise`.
- Declared rules: id must be a non-empty string; userId must match authenticated user_id; isDeleted must be 0, 1, true, or false; payload must fit max row JSON size; amount fields must be paise integers.
- Migration intent: merge-by-id, soft-delete-aware.

### savingsContribs

- Contract name: `savingsContributions`; IndexedDB store: `savingsContributions`; schema version: 1.
- Required (declared): `id`, `userId`, `createdAt`, `updatedAt`, `isDeleted`, `version`, `investmentId`, `date`, `amountPaise`.
- Optional (declared): `tags`, `notes`, `sourceDeviceId`, `schemaVersion`, `transactionId`.
- Indexed/hot fields: `source_device_id`, `payload_hash`, `schema_version`, `amount_paise`, `txn_local_date`, `txn_month`.
- Declared rules: id must be a non-empty string; userId must match authenticated user_id; isDeleted must be 0, 1, true, or false; payload must fit max row JSON size; amountPaise must be a positive paise integer.
- Migration intent: merge-by-id, soft-delete-aware.

### goals

- Contract name: `goals`; IndexedDB store: `goals`; schema version: 1.
- Required (declared): `id`, `userId`, `createdAt`, `updatedAt`, `isDeleted`, `version`, `title`, `goalType`, `targetAmountPaise`, `targetDate`, `startedAt`, `savedAmountPaise`, `priority`, `icon`, `color`, `status`.
- Optional (declared): `tags`, `notes`, `sourceDeviceId`, `schemaVersion`, `linkedAccountId`, `autoContribution`.
- Indexed/hot fields: `source_device_id`, `payload_hash`, `schema_version`, `goal_id`, `account_id`, `amount_paise`.
- Declared rules: id must be a non-empty string; userId must match authenticated user_id; isDeleted must be 0, 1, true, or false; payload must fit max row JSON size; targetAmountPaise and savedAmountPaise must be paise integers.
- Migration intent: merge-by-id, soft-delete-aware.

### goalContribs

- Contract name: `goalContributions`; IndexedDB store: `goalContributions`; schema version: 1.
- Required (declared): `id`, `userId`, `createdAt`, `updatedAt`, `isDeleted`, `version`, `goalId`, `date`, `amountPaise`.
- Optional (declared): `tags`, `notes`, `sourceDeviceId`, `schemaVersion`, `sourceAccountId`, `transactionId`.
- Indexed/hot fields: `source_device_id`, `payload_hash`, `schema_version`, `goal_id`, `account_id`, `amount_paise`, `txn_local_date`, `txn_month`.
- Declared rules: id must be a non-empty string; userId must match authenticated user_id; isDeleted must be 0, 1, true, or false; payload must fit max row JSON size; amountPaise must be a positive paise integer.
- Migration intent: merge-by-id, soft-delete-aware.

### reminders

- Contract name: `reminders`; IndexedDB store: `reminders`; schema version: 1.
- Required (declared): `id`, `userId`, `createdAt`, `updatedAt`, `isDeleted`, `version`, `kind`, `title`, `dueDate`, `done`.
- Optional (declared): `tags`, `notes`, `sourceDeviceId`, `schemaVersion`, `amount`, `linkedId`, `recurring`, `intervalDays`.
- Indexed/hot fields: `source_device_id`, `payload_hash`, `schema_version`, `txn_local_date`.
- Declared rules: id must be a non-empty string; userId must match authenticated user_id; isDeleted must be 0, 1, true, or false; payload must fit max row JSON size; dueDate must parse as a date.
- Migration intent: merge-by-id, soft-delete-aware.

### alerts

- Contract name: `alerts`; IndexedDB store: `alerts`; schema version: 1.
- Required (declared): `id`, `userId`, `createdAt`, `updatedAt`, `isDeleted`, `version`, `kind`, `severity`, `title`, `message`, `dismissed`, `triggeredAt`.
- Optional (declared): `tags`, `notes`, `sourceDeviceId`, `schemaVersion`, `linkHref`.
- Indexed/hot fields: `source_device_id`, `payload_hash`, `schema_version`.
- Declared rules: id must be a non-empty string; userId must match authenticated user_id; isDeleted must be 0, 1, true, or false; payload must fit max row JSON size; severity must be info, warning, danger, or success.
- Migration intent: merge-by-id, soft-delete-aware.

### recurringRules

- Contract name: `recurringRules`; IndexedDB store: `recurringRules`; schema version: 1.
- Required (declared): `id`, `userId`, `createdAt`, `updatedAt`, `isDeleted`, `version`, `title`, `type`, `amountPaise`, `paymentMode`, `frequency`, `nextRunDate`, `active`.
- Optional (declared): `tags`, `notes`, `sourceDeviceId`, `schemaVersion`, `categoryId`, `accountId`, `dayOfMonth`, `dayOfWeek`, `endDate`.
- Indexed/hot fields: `source_device_id`, `payload_hash`, `schema_version`, `category_id`, `account_id`, `amount_paise`, `txn_type`, `payment_mode`.
- Declared rules: id must be a non-empty string; userId must match authenticated user_id; isDeleted must be 0, 1, true, or false; payload must fit max row JSON size; amountPaise must be a positive paise integer.
- Migration intent: merge-by-id, soft-delete-aware.

### attachments

- Contract name: `attachments`; IndexedDB store: `attachments`; schema version: 1.
- Required (declared): `id`, `userId`, `createdAt`, `updatedAt`, `isDeleted`, `version`, `fileName`, `mimeType`, `sizeBytes`, `linkedType`, `linkedId`.
- Optional (declared): `tags`, `notes`, `sourceDeviceId`, `schemaVersion`.
- Indexed/hot fields: `source_device_id`, `payload_hash`, `schema_version`.
- Declared rules: id must be a non-empty string; userId must match authenticated user_id; isDeleted must be 0, 1, true, or false; payload must fit max row JSON size; binary payloads are metadata-only in sync rows.
- Migration intent: merge-by-id, soft-delete-aware.

### auditLogs

- Contract name: `auditLogs`; IndexedDB store: `auditLogs`; schema version: 1.
- Required (declared): `id`, `userId`, `createdAt`, `updatedAt`, `isDeleted`, `version`, `action`, `entity`, `detail`.
- Optional (declared): `tags`, `notes`, `sourceDeviceId`, `schemaVersion`, `entityId`.
- Indexed/hot fields: `source_device_id`, `payload_hash`, `schema_version`.
- Declared rules: id must be a non-empty string; userId must match authenticated user_id; isDeleted must be 0, 1, true, or false; payload must fit max row JSON size; client audit logs are user-owned and never admin audit logs.
- Migration intent: merge-by-id, soft-delete-aware.

### snapshots

- Contract name: `snapshots`; IndexedDB store: `snapshots`; schema version: 1.
- Required (declared): `id`, `userId`, `createdAt`, `updatedAt`, `isDeleted`, `version`, `periodKey`.
- Optional (declared): `tags`, `notes`, `sourceDeviceId`, `schemaVersion`, `totalIncome`, `totalExpense`, `netSavings`, `savingsRate`, `budgetUsage`, `creditUtilization`, `healthScore`.
- Indexed/hot fields: `source_device_id`, `payload_hash`, `schema_version`, `txn_month`.
- Declared rules: id must be a non-empty string; userId must match authenticated user_id; isDeleted must be 0, 1, true, or false; payload must fit max row JSON size; snapshot money values must be deterministic derived values.
- Migration intent: merge-by-id, soft-delete-aware.

### exportHistory

- Contract name: `exportHistory`; IndexedDB store: `exportHistory`; schema version: 1.
- Required (declared): `id`, `userId`, `createdAt`, `updatedAt`, `isDeleted`, `version`, `scope`, `format`, `fileName`, `rowCount`.
- Optional (declared): `tags`, `notes`, `sourceDeviceId`, `schemaVersion`, `fromDate`, `toDate`.
- Indexed/hot fields: `source_device_id`, `payload_hash`, `schema_version`.
- Declared rules: id must be a non-empty string; userId must match authenticated user_id; isDeleted must be 0, 1, true, or false; payload must fit max row JSON size; export rows must be scoped to authenticated user only.
- Migration intent: merge-by-id, soft-delete-aware.

### settings

- Contract name: `settings`; IndexedDB store: `settings`; schema version: 1.
- Required (declared): `id`, `userId`, `createdAt`, `updatedAt`, `isDeleted`, `version`, `theme`, `financialYearStartMonth`, `dateFormat`, `currency`.
- Optional (declared): `tags`, `notes`, `sourceDeviceId`, `schemaVersion`, `customPaymentModes`, `budgetThresholds`, `quickAddDefaults`, `warningPreferences`.
- Indexed/hot fields: `source_device_id`, `payload_hash`, `schema_version`.
- Declared rules: id must be a non-empty string; userId must match authenticated user_id; isDeleted must be 0, 1, true, or false; payload must fit max row JSON size; settings are one row per user/profile.
- Migration intent: merge-by-id, soft-delete-aware.

### transferLinks

- Contract name: `transferLinks`; IndexedDB store: `transferLinks`; schema version: 1.
- Required (declared): `id`, `userId`, `createdAt`, `updatedAt`, `isDeleted`, `version`, `fromAccountId`, `toAccountId`, `amountPaise`, `transactionId`, `status`.
- Optional (declared): `tags`, `notes`, `sourceDeviceId`, `schemaVersion`, `channel`, `reference`, `utr`, `feeTransactionId`.
- Indexed/hot fields: `source_device_id`, `payload_hash`, `schema_version`, `account_id`, `amount_paise`.
- Declared rules: id must be a non-empty string; userId must match authenticated user_id; isDeleted must be 0, 1, true, or false; payload must fit max row JSON size; amountPaise must be a positive paise integer.
- Migration intent: merge-by-id, soft-delete-aware.

### creditLimitGroups

- Contract name: `creditLimitGroups`; IndexedDB store: `creditLimitGroups`; schema version: 1.
- Required (declared): `id`, `userId`, `createdAt`, `updatedAt`, `isDeleted`, `version`, `name`, `totalLimitPaise`.
- Optional (declared): `tags`, `notes`, `sourceDeviceId`, `schemaVersion`, `issuerName`.
- Indexed/hot fields: `source_device_id`, `payload_hash`, `schema_version`, `amount_paise`.
- Declared rules: id must be a non-empty string; userId must match authenticated user_id; isDeleted must be 0, 1, true, or false; payload must fit max row JSON size; totalLimitPaise must be a non-negative paise integer.
- Migration intent: merge-by-id, soft-delete-aware.

### cardStatements

- Contract name: `cardStatements`; IndexedDB store: `cardStatements`; schema version: 1.
- Required (declared): `id`, `userId`, `createdAt`, `updatedAt`, `isDeleted`, `version`, `cardId`, `cycleStartDate`, `cycleEndDate`, `statementDate`, `openingBalancePaise`, `closingBalancePaise`, `minimumDuePaise`, `retailSpendPaise`, `feesPaise`, `interestPaise`, `paymentsPaise`, `creditsPaise`, `status`.
- Optional (declared): `tags`, `notes`, `sourceDeviceId`, `schemaVersion`.
- Indexed/hot fields: `source_device_id`, `payload_hash`, `schema_version`, `card_id`, `amount_paise`, `txn_local_date`, `txn_month`.
- Declared rules: id must be a non-empty string; userId must match authenticated user_id; isDeleted must be 0, 1, true, or false; payload must fit max row JSON size; statement money fields must be paise integers.
- Migration intent: merge-by-id, soft-delete-aware.

### cardPaymentAllocations

- Contract name: `cardPaymentAllocations`; IndexedDB store: `cardPaymentAllocations`; schema version: 1.
- Required (declared): `id`, `userId`, `createdAt`, `updatedAt`, `isDeleted`, `version`, `cardId`, `transactionId`, `amountPaise`, `allocatedAt`.
- Optional (declared): `tags`, `notes`, `sourceDeviceId`, `schemaVersion`, `statementId`.
- Indexed/hot fields: `source_device_id`, `payload_hash`, `schema_version`, `card_id`, `amount_paise`.
- Declared rules: id must be a non-empty string; userId must match authenticated user_id; isDeleted must be 0, 1, true, or false; payload must fit max row JSON size; amountPaise must be a positive paise integer.
- Migration intent: merge-by-id, soft-delete-aware.

### cardEmiPlans

- Contract name: `cardEmiPlans`; IndexedDB store: `cardEmiPlans`; schema version: 1.
- Required (declared): `id`, `userId`, `createdAt`, `updatedAt`, `isDeleted`, `version`, `cardId`, `purchaseTransactionIds`, `principalPaise`, `annualRateBps`, `tenureMonths`, `emiPaise`, `startDate`, `status`, `scheduleStrategy`, `calculationVersion`.
- Optional (declared): `tags`, `notes`, `sourceDeviceId`, `schemaVersion`, `noCostEmi`, `merchantSubsidyPaise`.
- Indexed/hot fields: `source_device_id`, `payload_hash`, `schema_version`, `card_id`, `amount_paise`, `txn_local_date`.
- Declared rules: id must be a non-empty string; userId must match authenticated user_id; isDeleted must be 0, 1, true, or false; payload must fit max row JSON size; principalPaise, emiPaise, and merchantSubsidyPaise must be paise integers.
- Migration intent: merge-by-id, soft-delete-aware.

### cardEmiInstallments

- Contract name: `cardEmiInstallments`; IndexedDB store: `cardEmiInstallments`; schema version: 1.
- Required (declared): `id`, `userId`, `createdAt`, `updatedAt`, `isDeleted`, `version`, `planId`, `installmentNo`, `dueDate`, `emiPaise`, `principalPaise`, `interestPaise`, `feePaise`, `taxPaise`, `status`, `source`.
- Optional (declared): `tags`, `notes`, `sourceDeviceId`, `schemaVersion`.
- Indexed/hot fields: `source_device_id`, `payload_hash`, `schema_version`, `amount_paise`, `txn_local_date`, `txn_month`.
- Declared rules: id must be a non-empty string; userId must match authenticated user_id; isDeleted must be 0, 1, true, or false; payload must fit max row JSON size; installment money fields must be paise integers.
- Migration intent: merge-by-id, soft-delete-aware.

### obligations

- Contract name: `obligations`; IndexedDB store: `obligations`; schema version: 1.
- Required (declared): `id`, `userId`, `createdAt`, `updatedAt`, `isDeleted`, `version`, `sourceType`, `sourceId`, `occurrenceKey`, `title`, `dueDate`, `amountPaise`, `status`.
- Optional (declared): `tags`, `notes`, `sourceDeviceId`, `schemaVersion`, `categoryId`, `accountId`, `cardId`.
- Indexed/hot fields: `source_device_id`, `payload_hash`, `schema_version`, `category_id`, `account_id`, `card_id`, `amount_paise`, `txn_local_date`, `txn_month`.
- Declared rules: id must be a non-empty string; userId must match authenticated user_id; isDeleted must be 0, 1, true, or false; payload must fit max row JSON size; amountPaise must be a non-negative paise integer.
- Migration intent: merge-by-id, soft-delete-aware.

### sinkingFunds

- Contract name: `sinkingFunds`; IndexedDB store: `sinkingFunds`; schema version: 1.
- Required (declared): `id`, `userId`, `createdAt`, `updatedAt`, `isDeleted`, `version`, `name`, `targetPaise`, `targetDate`.
- Optional (declared): `tags`, `notes`, `sourceDeviceId`, `schemaVersion`, `linkedCategoryId`, `monthlyRequiredPaise`.
- Indexed/hot fields: `source_device_id`, `payload_hash`, `schema_version`, `category_id`, `amount_paise`, `txn_local_date`.
- Declared rules: id must be a non-empty string; userId must match authenticated user_id; isDeleted must be 0, 1, true, or false; payload must fit max row JSON size; targetPaise and monthlyRequiredPaise must be paise integers.
- Migration intent: merge-by-id, soft-delete-aware.

### households

- Contract name: `households`; IndexedDB store: `households`; schema version: 1.
- Required (declared): `id`, `userId`, `createdAt`, `updatedAt`, `isDeleted`, `version`, `name`, `defaultCurrency`.
- Optional (declared): `tags`, `notes`, `sourceDeviceId`, `schemaVersion`.
- Indexed/hot fields: `source_device_id`, `payload_hash`, `schema_version`.
- Declared rules: id must be a non-empty string; userId must match authenticated user_id; isDeleted must be 0, 1, true, or false; payload must fit max row JSON size; defaultCurrency must be INR.
- Migration intent: merge-by-id, soft-delete-aware.

### householdMembers

- Contract name: `householdMembers`; IndexedDB store: `householdMembers`; schema version: 1.
- Required (declared): `id`, `userId`, `createdAt`, `updatedAt`, `isDeleted`, `version`, `householdId`, `role`, `displayName`.
- Optional (declared): `tags`, `notes`, `sourceDeviceId`, `schemaVersion`.
- Indexed/hot fields: `source_device_id`, `payload_hash`, `schema_version`.
- Declared rules: id must be a non-empty string; userId must match authenticated user_id; isDeleted must be 0, 1, true, or false; payload must fit max row JSON size; role must be owner, partner, or viewer.
- Migration intent: merge-by-id, soft-delete-aware.

### householdPermissions

- Contract name: `householdPermissions`; IndexedDB store: `householdPermissions`; schema version: 1.
- Required (declared): `id`, `userId`, `createdAt`, `updatedAt`, `isDeleted`, `version`, `householdId`, `memberId`, `canViewTransactions`, `canEditTransactions`, `canViewBalances`.
- Optional (declared): `tags`, `notes`, `sourceDeviceId`, `schemaVersion`.
- Indexed/hot fields: `source_device_id`, `payload_hash`, `schema_version`.
- Declared rules: id must be a non-empty string; userId must match authenticated user_id; isDeleted must be 0, 1, true, or false; payload must fit max row JSON size; permission fields must be 0 or 1.
- Migration intent: merge-by-id, soft-delete-aware.

### fixedIncomeAssets

- Contract name: `fixedIncomeAssets`; IndexedDB store: `fixedIncomeAssets`; schema version: 1.
- Required (declared): `id`, `userId`, `createdAt`, `updatedAt`, `isDeleted`, `version`, `name`, `type`, `principalPaise`, `rateBps`, `startDate`, `maturityDate`, `status`.
- Optional (declared): `tags`, `notes`, `sourceDeviceId`, `schemaVersion`, `linkedAccountId`.
- Indexed/hot fields: `source_device_id`, `payload_hash`, `schema_version`, `account_id`, `amount_paise`.
- Declared rules: id must be a non-empty string; userId must match authenticated user_id; isDeleted must be 0, 1, true, or false; payload must fit max row JSON size; principalPaise must be a non-negative paise integer.
- Migration intent: merge-by-id, soft-delete-aware.

### insurancePolicies

- Contract name: `insurancePolicies`; IndexedDB store: `insurancePolicies`; schema version: 1.
- Required (declared): `id`, `userId`, `createdAt`, `updatedAt`, `isDeleted`, `version`, `name`, `insurer`, `premiumPaise`, `premiumDueDay`, `coveragePaise`, `status`.
- Optional (declared): `tags`, `notes`, `sourceDeviceId`, `schemaVersion`.
- Indexed/hot fields: `source_device_id`, `payload_hash`, `schema_version`, `amount_paise`.
- Declared rules: id must be a non-empty string; userId must match authenticated user_id; isDeleted must be 0, 1, true, or false; payload must fit max row JSON size; premiumPaise and coveragePaise must be non-negative paise integers.
- Migration intent: merge-by-id, soft-delete-aware.

### assetValuations

- Contract name: `assetValuations`; IndexedDB store: `assetValuations`; schema version: 1.
- Required (declared): `id`, `userId`, `createdAt`, `updatedAt`, `isDeleted`, `version`, `assetType`, `label`, `valuePaise`, `asOfDate`.
- Optional (declared): `tags`, `notes`, `sourceDeviceId`, `schemaVersion`.
- Indexed/hot fields: `source_device_id`, `payload_hash`, `schema_version`, `amount_paise`, `txn_local_date`.
- Declared rules: id must be a non-empty string; userId must match authenticated user_id; isDeleted must be 0, 1, true, or false; payload must fit max row JSON size; valuePaise must be a non-negative paise integer.
- Migration intent: merge-by-id, soft-delete-aware.

### importSources

- Contract name: `importSources`; IndexedDB store: `importSources`; schema version: 1.
- Required (declared): `id`, `userId`, `createdAt`, `updatedAt`, `isDeleted`, `version`, `name`, `kind`.
- Optional (declared): `tags`, `notes`, `sourceDeviceId`, `schemaVersion`, `lastImportAt`.
- Indexed/hot fields: `source_device_id`, `payload_hash`, `schema_version`.
- Declared rules: id must be a non-empty string; userId must match authenticated user_id; isDeleted must be 0, 1, true, or false; payload must fit max row JSON size; kind must be csv, manual, or aa_ready.
- Migration intent: merge-by-id, soft-delete-aware.

### reconciliationMatches

- Contract name: `reconciliationMatches`; IndexedDB store: `reconciliationMatches`; schema version: 1.
- Required (declared): `id`, `userId`, `createdAt`, `updatedAt`, `isDeleted`, `version`, `leftTransactionId`, `status`, `confidence`.
- Optional (declared): `tags`, `notes`, `sourceDeviceId`, `schemaVersion`, `rightTransactionId`.
- Indexed/hot fields: `source_device_id`, `payload_hash`, `schema_version`.
- Declared rules: id must be a non-empty string; userId must match authenticated user_id; isDeleted must be 0, 1, true, or false; payload must fit max row JSON size; confidence must be between 0 and 1.
- Migration intent: merge-by-id, soft-delete-aware.

## Action Definitions

Handler expressions are preserved so the developer can trace API/store effects. PIN, role visibility and nested confirmation requirements must be read in the enclosing component; a handler inventory cannot certify them.

### src/components/auth/AdminAuth.tsx

| Source | Element | Handler | Disabled condition / title |
|---|---|---|---|
| [src/components/auth/AdminAuth.tsx:59](../src/components/auth/AdminAuth.tsx#L59) | form | {submit} |  |

### src/components/auth/CloudAuth.tsx

| Source | Element | Handler | Disabled condition / title |
|---|---|---|---|
| [src/components/auth/CloudAuth.tsx:170](../src/components/auth/CloudAuth.tsx#L170) | button | {onBack} |  |
| [src/components/auth/CloudAuth.tsx:181](../src/components/auth/CloudAuth.tsx#L181) | button | {() => { setMode("signin"); setErr(null); }} |  |
| [src/components/auth/CloudAuth.tsx:195](../src/components/auth/CloudAuth.tsx#L195) | button | {() => { setMode("register"); setErr(null); }} |  |
| [src/components/auth/CloudAuth.tsx:218](../src/components/auth/CloudAuth.tsx#L218) | form | {handleSignIn} |  |
| [src/components/auth/CloudAuth.tsx:244](../src/components/auth/CloudAuth.tsx#L244) | Button | {async () => { setLoading(true); try { await acceptPolicies(pendingPolicyUser.policyOutstanding); await finishLogin(pendingPolicyUser, pin); setPendingPolicyUser(null); setErr(null); } catch (error) { setErr(error instanceof Error ? error.message : "Policy acceptance failed"); } finally { setLoading |  |
| [src/components/auth/CloudAuth.tsx:268](../src/components/auth/CloudAuth.tsx#L268) | button | {() => { setMode("register"); setErr(null); }} |  |
| [src/components/auth/CloudAuth.tsx:281](../src/components/auth/CloudAuth.tsx#L281) | form | {handleRegister} |  |

### src/components/auth/LockScreen.tsx

| Source | Element | Handler | Disabled condition / title |
|---|---|---|---|
| [src/components/auth/LockScreen.tsx:52](../src/components/auth/LockScreen.tsx#L52) | form | {submit} |  |
| [src/components/auth/LockScreen.tsx:66](../src/components/auth/LockScreen.tsx#L66) | Button | {() => logout()} |  |

### src/components/auth/ProfileLogin.tsx

| Source | Element | Handler | Disabled condition / title |
|---|---|---|---|
| [src/components/auth/ProfileLogin.tsx:65](../src/components/auth/ProfileLogin.tsx#L65) | button | {() => undefined} |  |
| [src/components/auth/ProfileLogin.tsx:88](../src/components/auth/ProfileLogin.tsx#L88) | form | {(e) => { e.preventDefault(); submit(); }} |  |
| [src/components/auth/ProfileLogin.tsx:116](../src/components/auth/ProfileLogin.tsx#L116) | Button | {onCreateNew} |  |
| [src/components/auth/ProfileLogin.tsx:123](../src/components/auth/ProfileLogin.tsx#L123) | button | {onCloudSignIn} |  |

### src/components/auth/RequiredPinChange.tsx

| Source | Element | Handler | Disabled condition / title |
|---|---|---|---|
| [src/components/auth/RequiredPinChange.tsx:15](../src/components/auth/RequiredPinChange.tsx#L15) | form | {async e => { e.preventDefault(); if (!user \|\| busy) return; if (next !== confirmation) { setError("New PINs do not match"); return; } setBusy(true); setError(""); try { await changePin(user.id, current, next); await logout(); } catch (error) { setError(error instanceof Error ? error.message : "PIN  |  |
| [src/components/auth/RequiredPinChange.tsx:28](../src/components/auth/RequiredPinChange.tsx#L28) | Button | {() => void logout()} | {busy} |

### src/components/categories/CategoryCleanupPanel.tsx

| Source | Element | Handler | Disabled condition / title |
|---|---|---|---|
| [src/components/categories/CategoryCleanupPanel.tsx:154](../src/components/categories/CategoryCleanupPanel.tsx#L154) | Button | {() => void mergeCategories()} | {busy \|\| !fromId \|\| !toId} |

### src/components/explain/ExplainMetricDrawer.tsx

| Source | Element | Handler | Disabled condition / title |
|---|---|---|---|
| [src/components/explain/ExplainMetricDrawer.tsx:27](../src/components/explain/ExplainMetricDrawer.tsx#L27) | Button | {(e) => { e.stopPropagation(); onOpenChange(true); }} | {'Explain ${spec.title}'} |

### src/components/finance/CardEmiSimulatorDialog.tsx

| Source | Element | Handler | Disabled condition / title |
|---|---|---|---|
| [src/components/finance/CardEmiSimulatorDialog.tsx:103](../src/components/finance/CardEmiSimulatorDialog.tsx#L103) | Button | {() => onOpenChange(false)} |  |

### src/components/finance/PaydayCashflowPanel.tsx

| Source | Element | Handler | Disabled condition / title |
|---|---|---|---|
| [src/components/finance/PaydayCashflowPanel.tsx:33](../src/components/finance/PaydayCashflowPanel.tsx#L33) | button | {props.onOpenBills} |  |

### src/components/forms/QuickAddDialog.tsx

| Source | Element | Handler | Disabled condition / title |
|---|---|---|---|
| [src/components/forms/QuickAddDialog.tsx:77](../src/components/forms/QuickAddDialog.tsx#L77) | Button | {() => setDirection("out")} |  |
| [src/components/forms/QuickAddDialog.tsx:84](../src/components/forms/QuickAddDialog.tsx#L84) | Button | {() => setDirection("in")} |  |
| [src/components/forms/QuickAddDialog.tsx:92](../src/components/forms/QuickAddDialog.tsx#L92) | Button | {() => setStep("intent")} | {!direction \|\| amount === "" \|\| Number(amount) <= 0} |
| [src/components/forms/QuickAddDialog.tsx:105](../src/components/forms/QuickAddDialog.tsx#L105) | Button | {() => { setSelectedIntent(id); setStep("form"); }} |  |
| [src/components/forms/QuickAddDialog.tsx:118](../src/components/forms/QuickAddDialog.tsx#L118) | Button | {() => setStep("amount")} |  |

### src/components/forms/TransactionForm.tsx

| Source | Element | Handler | Disabled condition / title |
|---|---|---|---|
| [src/components/forms/TransactionForm.tsx:263](../src/components/forms/TransactionForm.tsx#L263) | form | {submit} |  |
| [src/components/forms/TransactionForm.tsx:720](../src/components/forms/TransactionForm.tsx#L720) | Button | {onCancel} |  |

### src/components/layout/AdminAppShell.tsx

| Source | Element | Handler | Disabled condition / title |
|---|---|---|---|
| [src/components/layout/AdminAppShell.tsx:99](../src/components/layout/AdminAppShell.tsx#L99) | button | {() => setActive(item.key)} |  |
| [src/components/layout/AdminAppShell.tsx:121](../src/components/layout/AdminAppShell.tsx#L121) | Button | {() => logout()} |  |
| [src/components/layout/AdminAppShell.tsx:131](../src/components/layout/AdminAppShell.tsx#L131) | button | {() => setActive(item.key)} |  |

### src/components/layout/AlertsDrawer.tsx

| Source | Element | Handler | Disabled condition / title |
|---|---|---|---|
| [src/components/layout/AlertsDrawer.tsx:57](../src/components/layout/AlertsDrawer.tsx#L57) | Button | {dismissAll} |  |
| [src/components/layout/AlertsDrawer.tsx:109](../src/components/layout/AlertsDrawer.tsx#L109) | Button | {() => dismiss(a.id)} | "Dismiss" |
| [src/components/layout/AlertsDrawer.tsx:135](../src/components/layout/AlertsDrawer.tsx#L135) | Button | {() => restore(a.id)} |  |
| [src/components/layout/AlertsDrawer.tsx:138](../src/components/layout/AlertsDrawer.tsx#L138) | Button | {() => removeAlert(a.id)} |  |

### src/components/layout/CommandPalette.tsx

| Source | Element | Handler | Disabled condition / title |
|---|---|---|---|
| [src/components/layout/CommandPalette.tsx:178](../src/components/layout/CommandPalette.tsx#L178) | button | {it.action} |  |

### src/components/layout/Header.tsx

| Source | Element | Handler | Disabled condition / title |
|---|---|---|---|
| [src/components/layout/Header.tsx:39](../src/components/layout/Header.tsx#L39) | button | {() => setCommandOpen(true)} | "Search sections" |
| [src/components/layout/Header.tsx:53](../src/components/layout/Header.tsx#L53) | Button | {() => setStatementOpen(true)} | "Upload bank statement"; "Upload bank statement" |
| [src/components/layout/Header.tsx:75](../src/components/layout/Header.tsx#L75) | Button | {() => setAlertsOpen(true)} | "Alerts" |

### src/components/layout/Sidebar.tsx

| Source | Element | Handler | Disabled condition / title |
|---|---|---|---|
| [src/components/layout/Sidebar.tsx:138](../src/components/layout/Sidebar.tsx#L138) | button | {() => setActive(it.key)} | {collapsed ? it.label : undefined} |
| [src/components/layout/Sidebar.tsx:161](../src/components/layout/Sidebar.tsx#L161) | Button | {() => setCollapsed(!collapsed)} | {collapsed ? "Expand" : "Collapse"} |
| [src/components/layout/Sidebar.tsx:197](../src/components/layout/Sidebar.tsx#L197) | button | {() => setActive(it.key)} |  |

### src/components/layout/SyncOutboxBadge.tsx

| Source | Element | Handler | Disabled condition / title |
|---|---|---|---|
| [src/components/layout/SyncOutboxBadge.tsx:61](../src/components/layout/SyncOutboxBadge.tsx#L61) | Button | {() => setOpen(true)} | "Review pending changes"; {'${pending.length} pending changes'} |
| [src/components/layout/SyncOutboxBadge.tsx:73](../src/components/layout/SyncOutboxBadge.tsx#L73) | Button | {download} | {!pending.length}; "Download pending changes"; "Download pending changes" |
| [src/components/layout/SyncOutboxBadge.tsx:74](../src/components/layout/SyncOutboxBadge.tsx#L74) | Button | {() => void run(() => replayMutations(getDB(), user!.id, () => useAuthStore.getState().currentUser?.id === user!.id))} | {busy \|\| !user}; "Retry synchronization"; "Retry synchronization" |
| [src/components/layout/SyncOutboxBadge.tsx:87](../src/components/layout/SyncOutboxBadge.tsx#L87) | Button | {() => void run(async () => { const confirmed = await requestConfirm({ title: "Discard local changes?", description: "All pending changes for this record will be replaced with the server version. Download pending changes first to retain a copy.", destructive: true, confirmLabel: "Use server version" | {busy} |

### src/components/pages/AccountsPage.tsx

| Source | Element | Handler | Disabled condition / title |
|---|---|---|---|
| [src/components/pages/AccountsPage.tsx:86](../src/components/pages/AccountsPage.tsx#L86) | Button | {() => setAdding(true)} |  |
| [src/components/pages/AccountsPage.tsx:127](../src/components/pages/AccountsPage.tsx#L127) | Button | {() => setAdding(true)} |  |
| [src/components/pages/AccountsPage.tsx:169](../src/components/pages/AccountsPage.tsx#L169) | Button | {() => setEditing(a)} |  |
| [src/components/pages/AccountsPage.tsx:176](../src/components/pages/AccountsPage.tsx#L176) | Button | {() => handleDelete(a.id)} |  |
| [src/components/pages/AccountsPage.tsx:279](../src/components/pages/AccountsPage.tsx#L279) | form | {submit} |  |
| [src/components/pages/AccountsPage.tsx:334](../src/components/pages/AccountsPage.tsx#L334) | Button | {onClose} |  |

### src/components/pages/AlertsPage.tsx

| Source | Element | Handler | Disabled condition / title |
|---|---|---|---|
| [src/components/pages/AlertsPage.tsx:79](../src/components/pages/AlertsPage.tsx#L79) | Button | {rerun} |  |
| [src/components/pages/AlertsPage.tsx:83](../src/components/pages/AlertsPage.tsx#L83) | Button | {dismissAll} |  |
| [src/components/pages/AlertsPage.tsx:150](../src/components/pages/AlertsPage.tsx#L150) | Button | {() => setActive(pathToNav(a.linkHref!), "user")} |  |
| [src/components/pages/AlertsPage.tsx:158](../src/components/pages/AlertsPage.tsx#L158) | Button | {() => dismiss(a.id)} |  |
| [src/components/pages/AlertsPage.tsx:189](../src/components/pages/AlertsPage.tsx#L189) | Button | {() => restore(a.id)} |  |
| [src/components/pages/AlertsPage.tsx:192](../src/components/pages/AlertsPage.tsx#L192) | Button | {() => hardDelete(a.id)} |  |

### src/components/pages/AuditPage.tsx

| Source | Element | Handler | Disabled condition / title |
|---|---|---|---|
| [src/components/pages/AuditPage.tsx:95](../src/components/pages/AuditPage.tsx#L95) | Button | {exportLogs} |  |

### src/components/pages/BudgetsPage.tsx

| Source | Element | Handler | Disabled condition / title |
|---|---|---|---|
| [src/components/pages/BudgetsPage.tsx:110](../src/components/pages/BudgetsPage.tsx#L110) | Button | {() => setAdding(true)} |  |
| [src/components/pages/BudgetsPage.tsx:183](../src/components/pages/BudgetsPage.tsx#L183) | Button | {() => setAdding(true)} |  |
| [src/components/pages/BudgetsPage.tsx:250](../src/components/pages/BudgetsPage.tsx#L250) | Button | {() => setEditing(s.budget)} |  |
| [src/components/pages/BudgetsPage.tsx:257](../src/components/pages/BudgetsPage.tsx#L257) | Button | {() => handleDelete(s.budget.id)} |  |
| [src/components/pages/BudgetsPage.tsx:375](../src/components/pages/BudgetsPage.tsx#L375) | form | {submit} |  |
| [src/components/pages/BudgetsPage.tsx:475](../src/components/pages/BudgetsPage.tsx#L475) | Button | {onClose} |  |

### src/components/pages/CardsPage.tsx

| Source | Element | Handler | Disabled condition / title |
|---|---|---|---|
| [src/components/pages/CardsPage.tsx:202](../src/components/pages/CardsPage.tsx#L202) | Button | {() => setAdding(true)} |  |
| [src/components/pages/CardsPage.tsx:226](../src/components/pages/CardsPage.tsx#L226) | Button | {() => setAdding(true)} |  |
| [src/components/pages/CardsPage.tsx:441](../src/components/pages/CardsPage.tsx#L441) | Button | {() => setExpandedId(expandedId === c.id ? null : c.id)} |  |
| [src/components/pages/CardsPage.tsx:482](../src/components/pages/CardsPage.tsx#L482) | Button | {() => setEmiSimCard(c)} |  |
| [src/components/pages/CardsPage.tsx:490](../src/components/pages/CardsPage.tsx#L490) | Button | {() => setEditing(c)} |  |
| [src/components/pages/CardsPage.tsx:497](../src/components/pages/CardsPage.tsx#L497) | Button | {() => handleDelete(c.id)} |  |
| [src/components/pages/CardsPage.tsx:523](../src/components/pages/CardsPage.tsx#L523) | Button | {() => setAdding(true)} |  |
| [src/components/pages/CardsPage.tsx:550](../src/components/pages/CardsPage.tsx#L550) | Button | {() => setEditing(c)} |  |
| [src/components/pages/CardsPage.tsx:557](../src/components/pages/CardsPage.tsx#L557) | Button | {() => handleDelete(c.id)} |  |
| [src/components/pages/CardsPage.tsx:641](../src/components/pages/CardsPage.tsx#L641) | Button | {() => setRepairTxn(t)} |  |
| [src/components/pages/CardsPage.tsx:645](../src/components/pages/CardsPage.tsx#L645) | Button | {() => setEditing(issue.card ?? null)} |  |
| [src/components/pages/CardsPage.tsx:686](../src/components/pages/CardsPage.tsx#L686) | Button | {() => void applyRepairLinkCard()} | {!repairCardId \|\| repairSaving} |
| [src/components/pages/CardsPage.tsx:710](../src/components/pages/CardsPage.tsx#L710) | Button | {() => void applyRepairConvertUpi()} | {!repairAccountId \|\| repairSaving} |
| [src/components/pages/CardsPage.tsx:719](../src/components/pages/CardsPage.tsx#L719) | Button | {() => void applyRepairMarkLegacy()} | {repairSaving} |
| [src/components/pages/CardsPage.tsx:732](../src/components/pages/CardsPage.tsx#L732) | Button | {() => setRepairTxn(null)} |  |
| [src/components/pages/CardsPage.tsx:847](../src/components/pages/CardsPage.tsx#L847) | form | {submit} |  |
| [src/components/pages/CardsPage.tsx:975](../src/components/pages/CardsPage.tsx#L975) | Button | {onClose} |  |

### src/components/pages/CategoriesPage.tsx

| Source | Element | Handler | Disabled condition / title |
|---|---|---|---|
| [src/components/pages/CategoriesPage.tsx:108](../src/components/pages/CategoriesPage.tsx#L108) | Button | {() => setAdding(true)} |  |
| [src/components/pages/CategoriesPage.tsx:158](../src/components/pages/CategoriesPage.tsx#L158) | Button | {() => setAdding(true)} |  |
| [src/components/pages/CategoriesPage.tsx:197](../src/components/pages/CategoriesPage.tsx#L197) | Button | {() => setEditing(c)} |  |
| [src/components/pages/CategoriesPage.tsx:204](../src/components/pages/CategoriesPage.tsx#L204) | Button | {() => handleArchive(c)} |  |
| [src/components/pages/CategoriesPage.tsx:215](../src/components/pages/CategoriesPage.tsx#L215) | Button | {() => handleDelete(c)} |  |
| [src/components/pages/CategoriesPage.tsx:360](../src/components/pages/CategoriesPage.tsx#L360) | form | {submit} |  |
| [src/components/pages/CategoriesPage.tsx:395](../src/components/pages/CategoriesPage.tsx#L395) | button | {() => setState({ ...state, icon: i })} |  |
| [src/components/pages/CategoriesPage.tsx:409](../src/components/pages/CategoriesPage.tsx#L409) | button | {() => setState({ ...state, color: c })} |  |
| [src/components/pages/CategoriesPage.tsx:454](../src/components/pages/CategoriesPage.tsx#L454) | Button | {onClose} |  |

### src/components/pages/DashboardPage.tsx

| Source | Element | Handler | Disabled condition / title |
|---|---|---|---|
| [src/components/pages/DashboardPage.tsx:426](../src/components/pages/DashboardPage.tsx#L426) | Button | {() => setActive("reports")} |  |
| [src/components/pages/DashboardPage.tsx:429](../src/components/pages/DashboardPage.tsx#L429) | Button | {() => setActive("export")} |  |
| [src/components/pages/DashboardPage.tsx:446](../src/components/pages/DashboardPage.tsx#L446) | Button | {() => setActive("accounts")} |  |
| [src/components/pages/DashboardPage.tsx:447](../src/components/pages/DashboardPage.tsx#L447) | Button | {() => setActive("categories")} |  |
| [src/components/pages/DashboardPage.tsx:448](../src/components/pages/DashboardPage.tsx#L448) | Button | {() => setActive("transactions")} |  |
| [src/components/pages/DashboardPage.tsx:511](../src/components/pages/DashboardPage.tsx#L511) | button | {() => setActive("loans")} |  |
| [src/components/pages/DashboardPage.tsx:521](../src/components/pages/DashboardPage.tsx#L521) | button | {() => setActive("cards")} |  |
| [src/components/pages/DashboardPage.tsx:531](../src/components/pages/DashboardPage.tsx#L531) | button | {() => setActive("udhari")} |  |
| [src/components/pages/DashboardPage.tsx:553](../src/components/pages/DashboardPage.tsx#L553) | Button | {() => setActive("suggestions")} |  |
| [src/components/pages/DashboardPage.tsx:560](../src/components/pages/DashboardPage.tsx#L560) | button | {() => setActive("suggestions")} |  |
| [src/components/pages/DashboardPage.tsx:574](../src/components/pages/DashboardPage.tsx#L574) | KpiCard | {() => setActive("income")} |  |
| [src/components/pages/DashboardPage.tsx:593](../src/components/pages/DashboardPage.tsx#L593) | KpiCard | {() => setActive("expenses")} |  |
| [src/components/pages/DashboardPage.tsx:632](../src/components/pages/DashboardPage.tsx#L632) | KpiCard | {() => setActive("accounts")} |  |
| [src/components/pages/DashboardPage.tsx:861](../src/components/pages/DashboardPage.tsx#L861) | Button | {() => setActive("goals")} |  |
| [src/components/pages/DashboardPage.tsx:960](../src/components/pages/DashboardPage.tsx#L960) | DueRow | {() => setActive("loans")} |  |
| [src/components/pages/DashboardPage.tsx:966](../src/components/pages/DashboardPage.tsx#L966) | DueRow | {() => setActive("cards")} |  |
| [src/components/pages/DashboardPage.tsx:977](../src/components/pages/DashboardPage.tsx#L977) | DueRow | {() => setActive("udhari")} |  |
| [src/components/pages/DashboardPage.tsx:983](../src/components/pages/DashboardPage.tsx#L983) | DueRow | {() => setActive("udhari")} |  |
| [src/components/pages/DashboardPage.tsx:1004](../src/components/pages/DashboardPage.tsx#L1004) | Button | {() => setActive("reports")} |  |
| [src/components/pages/DashboardPage.tsx:1022](../src/components/pages/DashboardPage.tsx#L1022) | Pie | {(e) => { const row = e?.payload as (typeof stats.catBreak)[number] \| undefined; if (row) drillCategorySpend(row); }} |  |
| [src/components/pages/DashboardPage.tsx:1046](../src/components/pages/DashboardPage.tsx#L1046) | button | {() => drillCategorySpend(c)} |  |
| [src/components/pages/DashboardPage.tsx:1080](../src/components/pages/DashboardPage.tsx#L1080) | Button | {() => setActive("goals")} |  |
| [src/components/pages/DashboardPage.tsx:1107](../src/components/pages/DashboardPage.tsx#L1107) | button | {() => setActive("goals")} |  |
| [src/components/pages/DashboardPage.tsx:1131](../src/components/pages/DashboardPage.tsx#L1131) | Button | {() => setActive("budgets")} |  |
| [src/components/pages/DashboardPage.tsx:1183](../src/components/pages/DashboardPage.tsx#L1183) | Button | {() => setActive("transactions")} |  |
| [src/components/pages/DashboardPage.tsx:1269](../src/components/pages/DashboardPage.tsx#L1269) | Card | {onClick} |  |
| [src/components/pages/DashboardPage.tsx:1283](../src/components/pages/DashboardPage.tsx#L1283) | div | {(e) => e.stopPropagation()} |  |
| [src/components/pages/DashboardPage.tsx:1319](../src/components/pages/DashboardPage.tsx#L1319) | button | {onClick} |  |
| [src/components/pages/DashboardPage.tsx:1439](../src/components/pages/DashboardPage.tsx#L1439) | button | {() => setActive("budgets")} |  |

### src/components/pages/ExportPage.tsx

| Source | Element | Handler | Disabled condition / title |
|---|---|---|---|
| [src/components/pages/ExportPage.tsx:274](../src/components/pages/ExportPage.tsx#L274) | Button | {caExport} |  |
| [src/components/pages/ExportPage.tsx:439](../src/components/pages/ExportPage.tsx#L439) | Button | {requestFullBackup} |  |
| [src/components/pages/ExportPage.tsx:496](../src/components/pages/ExportPage.tsx#L496) | Button | {() => setBackupPinOpen(false)} |  |
| [src/components/pages/ExportPage.tsx:499](../src/components/pages/ExportPage.tsx#L499) | Button | {confirmFullBackup} | {!backupPin} |
| [src/components/pages/ExportPage.tsx:536](../src/components/pages/ExportPage.tsx#L536) | Button | {onExport} |  |

### src/components/pages/GoalsPage.tsx

| Source | Element | Handler | Disabled condition / title |
|---|---|---|---|
| [src/components/pages/GoalsPage.tsx:115](../src/components/pages/GoalsPage.tsx#L115) | Button | {() => setAdding(true)} |  |
| [src/components/pages/GoalsPage.tsx:129](../src/components/pages/GoalsPage.tsx#L129) | Button | {() => setAdding(true)} |  |
| [src/components/pages/GoalsPage.tsx:221](../src/components/pages/GoalsPage.tsx#L221) | Button | {() => setContributing(g)} | {isComplete} |
| [src/components/pages/GoalsPage.tsx:230](../src/components/pages/GoalsPage.tsx#L230) | Button | {() => setEditing(g)} |  |
| [src/components/pages/GoalsPage.tsx:237](../src/components/pages/GoalsPage.tsx#L237) | Button | {() => handleDelete(g.id)} |  |
| [src/components/pages/GoalsPage.tsx:269](../src/components/pages/GoalsPage.tsx#L269) | ContributeDialog | {(amt) => contributing && contribute(contributing, amt)} |  |
| [src/components/pages/GoalsPage.tsx:308](../src/components/pages/GoalsPage.tsx#L308) | Button | {onClose} |  |
| [src/components/pages/GoalsPage.tsx:311](../src/components/pages/GoalsPage.tsx#L311) | Button | {() => amount > 0 && onSubmit(amount)} | {amount <= 0} |
| [src/components/pages/GoalsPage.tsx:422](../src/components/pages/GoalsPage.tsx#L422) | form | {submit} |  |
| [src/components/pages/GoalsPage.tsx:492](../src/components/pages/GoalsPage.tsx#L492) | button | {() => setState({ ...state, icon })} |  |
| [src/components/pages/GoalsPage.tsx:508](../src/components/pages/GoalsPage.tsx#L508) | button | {() => setState({ ...state, color })} |  |
| [src/components/pages/GoalsPage.tsx:527](../src/components/pages/GoalsPage.tsx#L527) | Button | {onClose} |  |

### src/components/pages/HouseholdDashboardPage.tsx

| Source | Element | Handler | Disabled condition / title |
|---|---|---|---|
| [src/components/pages/HouseholdDashboardPage.tsx:133](../src/components/pages/HouseholdDashboardPage.tsx#L133) | Button | {createHousehold} |  |
| [src/components/pages/HouseholdDashboardPage.tsx:161](../src/components/pages/HouseholdDashboardPage.tsx#L161) | Button | {addMember} |  |

### src/components/pages/ImportPage.tsx

| Source | Element | Handler | Disabled condition / title |
|---|---|---|---|
| [src/components/pages/ImportPage.tsx:541](../src/components/pages/ImportPage.tsx#L541) | Button | {downloadTemplate} |  |
| [src/components/pages/ImportPage.tsx:555](../src/components/pages/ImportPage.tsx#L555) | div | {() => fileInput.current?.click()} |  |
| [src/components/pages/ImportPage.tsx:590](../src/components/pages/ImportPage.tsx#L590) | Button | {() => { setRows([]); setHeaders([]); setMapping({}); }} |  |
| [src/components/pages/ImportPage.tsx:688](../src/components/pages/ImportPage.tsx#L688) | Button | {performImport} | {valid === 0} |
| [src/components/pages/ImportPage.tsx:750](../src/components/pages/ImportPage.tsx#L750) | Button | {() => restoreInput.current?.click()} |  |
| [src/components/pages/ImportPage.tsx:777](../src/components/pages/ImportPage.tsx#L777) | Button | {downloadTemplate} |  |
| [src/components/pages/ImportPage.tsx:800](../src/components/pages/ImportPage.tsx#L800) | Button | {rollbackLastImport} |  |
| [src/components/pages/ImportPage.tsx:818](../src/components/pages/ImportPage.tsx#L818) | Button | {() => { setRestoreConfirmOpen(false); setPendingRestoreFile(null); }} |  |
| [src/components/pages/ImportPage.tsx:827](../src/components/pages/ImportPage.tsx#L827) | Button | {confirmRestore} |  |

### src/components/pages/InvestmentsPage.tsx

| Source | Element | Handler | Disabled condition / title |
|---|---|---|---|
| [src/components/pages/InvestmentsPage.tsx:133](../src/components/pages/InvestmentsPage.tsx#L133) | Button | {() => setAdding(true)} |  |
| [src/components/pages/InvestmentsPage.tsx:140](../src/components/pages/InvestmentsPage.tsx#L140) | Button | {() => setAdding(true)} |  |
| [src/components/pages/InvestmentsPage.tsx:191](../src/components/pages/InvestmentsPage.tsx#L191) | Button | {() => setAdding(true)} |  |
| [src/components/pages/InvestmentsPage.tsx:271](../src/components/pages/InvestmentsPage.tsx#L271) | Button | {() => setContributing(inv)} |  |
| [src/components/pages/InvestmentsPage.tsx:279](../src/components/pages/InvestmentsPage.tsx#L279) | Button | {() => setEditing(inv)} |  |
| [src/components/pages/InvestmentsPage.tsx:282](../src/components/pages/InvestmentsPage.tsx#L282) | Button | {() => handleDelete(inv.id)} |  |
| [src/components/pages/InvestmentsPage.tsx:317](../src/components/pages/InvestmentsPage.tsx#L317) | ContribDialog | {(amt) => contributing && contribute(contributing, amt)} |  |
| [src/components/pages/InvestmentsPage.tsx:350](../src/components/pages/InvestmentsPage.tsx#L350) | Button | {onClose} |  |
| [src/components/pages/InvestmentsPage.tsx:353](../src/components/pages/InvestmentsPage.tsx#L353) | Button | {() => amount > 0 && onSubmit(amount)} | {amount <= 0} |
| [src/components/pages/InvestmentsPage.tsx:453](../src/components/pages/InvestmentsPage.tsx#L453) | form | {submit} |  |
| [src/components/pages/InvestmentsPage.tsx:533](../src/components/pages/InvestmentsPage.tsx#L533) | Button | {onClose} |  |

### src/components/pages/LoansPage.tsx

| Source | Element | Handler | Disabled condition / title |
|---|---|---|---|
| [src/components/pages/LoansPage.tsx:189](../src/components/pages/LoansPage.tsx#L189) | Button | {() => setAdding(true)} |  |
| [src/components/pages/LoansPage.tsx:305](../src/components/pages/LoansPage.tsx#L305) | Button | {() => setAdding(true)} |  |
| [src/components/pages/LoansPage.tsx:478](../src/components/pages/LoansPage.tsx#L478) | Button | {() => setViewing(l)} |  |
| [src/components/pages/LoansPage.tsx:483](../src/components/pages/LoansPage.tsx#L483) | Button | {() => void handleCloseLoan(l)} | "Close loan" |
| [src/components/pages/LoansPage.tsx:492](../src/components/pages/LoansPage.tsx#L492) | Button | {() => setEditing(l)} |  |
| [src/components/pages/LoansPage.tsx:495](../src/components/pages/LoansPage.tsx#L495) | Button | {() => handleDelete(l.id)} |  |
| [src/components/pages/LoansPage.tsx:764](../src/components/pages/LoansPage.tsx#L764) | form | {submit} |  |
| [src/components/pages/LoansPage.tsx:984](../src/components/pages/LoansPage.tsx#L984) | Button | {onClose} |  |

### src/components/pages/ProfilePage.tsx

| Source | Element | Handler | Disabled condition / title |
|---|---|---|---|
| [src/components/pages/ProfilePage.tsx:183](../src/components/pages/ProfilePage.tsx#L183) | Button | {() => lock()} |  |
| [src/components/pages/ProfilePage.tsx:186](../src/components/pages/ProfilePage.tsx#L186) | Button | {() => logout()} |  |
| [src/components/pages/ProfilePage.tsx:227](../src/components/pages/ProfilePage.tsx#L227) | button | {() => setForm({ ...form, avatarEmoji: e })} |  |
| [src/components/pages/ProfilePage.tsx:245](../src/components/pages/ProfilePage.tsx#L245) | button | {() => setForm({ ...form, avatarColor: c })} |  |
| [src/components/pages/ProfilePage.tsx:281](../src/components/pages/ProfilePage.tsx#L281) | Button | {saveSecurityRecovery} |  |
| [src/components/pages/ProfilePage.tsx:284](../src/components/pages/ProfilePage.tsx#L284) | Button | {saveProfile} |  |
| [src/components/pages/ProfilePage.tsx:329](../src/components/pages/ProfilePage.tsx#L329) | Button | {savePin} |  |
| [src/components/pages/ProfilePage.tsx:374](../src/components/pages/ProfilePage.tsx#L374) | Button | {recoverPin} |  |

### src/components/pages/ReconciliationPage.tsx

| Source | Element | Handler | Disabled condition / title |
|---|---|---|---|
| [src/components/pages/ReconciliationPage.tsx:41](../src/components/pages/ReconciliationPage.tsx#L41) | Button | {() => { setActive("transactions"); toast({ title: "Opened Transactions — find this row by date/amount", kind: "info" }); }} |  |
| [src/components/pages/ReconciliationPage.tsx:66](../src/components/pages/ReconciliationPage.tsx#L66) | Button | {() => { setActive("transactions"); toast({ title: "Review transfer pair in Transactions", description: s.label, kind: "info", }); }} |  |

### src/components/pages/ReportsPage.tsx

| Source | Element | Handler | Disabled condition / title |
|---|---|---|---|
| [src/components/pages/ReportsPage.tsx:385](../src/components/pages/ReportsPage.tsx#L385) | Button | {() => { const { buffer, filename } = buildCAWorkbook({ transactions, categories, accounts, cards, budgets, goals, goalContribs, loans, emis, udhari, investments, savingsContribs, }); downloadBuffer(buffer, filename); }} |  |
| [src/components/pages/ReportsPage.tsx:635](../src/components/pages/ReportsPage.tsx#L635) | Button | {() => exportModuleToSheet("YoY_Summary", yoy)} |  |

### src/components/pages/SettingsPage.tsx

| Source | Element | Handler | Disabled condition / title |
|---|---|---|---|
| [src/components/pages/SettingsPage.tsx:186](../src/components/pages/SettingsPage.tsx#L186) | Button | {save} |  |
| [src/components/pages/SettingsPage.tsx:428](../src/components/pages/SettingsPage.tsx#L428) | Button | {() => { if (!customMode.trim()) return; setForm({ ...form, customPaymentModes: [ ...(form.customPaymentModes ?? []), customMode.trim(), ], }); setCustomMode(""); }} |  |
| [src/components/pages/SettingsPage.tsx:453](../src/components/pages/SettingsPage.tsx#L453) | button | {() => setForm({ ...form, customPaymentModes: (form.customPaymentModes ?? []).filter( (_, j) => j !== i, ), }) } |  |
| [src/components/pages/SettingsPage.tsx:503](../src/components/pages/SettingsPage.tsx#L503) | Button | {() => setConfirmResetOpen(true)} |  |
| [src/components/pages/SettingsPage.tsx:506](../src/components/pages/SettingsPage.tsx#L506) | Button | {() => setConfirmWipeOpen(true)} |  |
| [src/components/pages/SettingsPage.tsx:523](../src/components/pages/SettingsPage.tsx#L523) | Button | {() => setConfirmResetOpen(false)} |  |
| [src/components/pages/SettingsPage.tsx:526](../src/components/pages/SettingsPage.tsx#L526) | Button | {resetDemo} |  |
| [src/components/pages/SettingsPage.tsx:547](../src/components/pages/SettingsPage.tsx#L547) | Button | {() => { setConfirmWipeOpen(false); setWipeInput(""); }} |  |
| [src/components/pages/SettingsPage.tsx:556](../src/components/pages/SettingsPage.tsx#L556) | Button | {wipeAll} |  |

### src/components/pages/SubscriptionPage.tsx

| Source | Element | Handler | Disabled condition / title |
|---|---|---|---|
| [src/components/pages/SubscriptionPage.tsx:98](../src/components/pages/SubscriptionPage.tsx#L98) | Button | {() => buyPlan(Number(plan.id))} |  |

### src/components/pages/SuggestionsPage.tsx

| Source | Element | Handler | Disabled condition / title |
|---|---|---|---|
| [src/components/pages/SuggestionsPage.tsx:308](../src/components/pages/SuggestionsPage.tsx#L308) | Button | {() => void runSync()} | {syncing \|\| !user} |
| [src/components/pages/SuggestionsPage.tsx:572](../src/components/pages/SuggestionsPage.tsx#L572) | Button | {onUseful} |  |
| [src/components/pages/SuggestionsPage.tsx:575](../src/components/pages/SuggestionsPage.tsx#L575) | Button | {onDismiss} |  |
| [src/components/pages/SuggestionsPage.tsx:578](../src/components/pages/SuggestionsPage.tsx#L578) | Button | {onNotUseful} |  |
| [src/components/pages/SuggestionsPage.tsx:581](../src/components/pages/SuggestionsPage.tsx#L581) | Button | {onLater} |  |
| [src/components/pages/SuggestionsPage.tsx:584](../src/components/pages/SuggestionsPage.tsx#L584) | Button | {onAction} |  |
| [src/components/pages/SuggestionsPage.tsx:587](../src/components/pages/SuggestionsPage.tsx#L587) | Button | {onAi} | {aiBusy} |

### src/components/pages/TransactionsPage.tsx

| Source | Element | Handler | Disabled condition / title |
|---|---|---|---|
| [src/components/pages/TransactionsPage.tsx:242](../src/components/pages/TransactionsPage.tsx#L242) | Button | {() => setAdding(true)} |  |
| [src/components/pages/TransactionsPage.tsx:258](../src/components/pages/TransactionsPage.tsx#L258) | Button | {() => setFiltersOpen((v) => !v)} |  |
| [src/components/pages/TransactionsPage.tsx:370](../src/components/pages/TransactionsPage.tsx#L370) | Button | {resetFilters} |  |
| [src/components/pages/TransactionsPage.tsx:393](../src/components/pages/TransactionsPage.tsx#L393) | Button | {bulkDelete} |  |
| [src/components/pages/TransactionsPage.tsx:396](../src/components/pages/TransactionsPage.tsx#L396) | Button | {() => setSelected(new Set())} |  |
| [src/components/pages/TransactionsPage.tsx:411](../src/components/pages/TransactionsPage.tsx#L411) | Button | {() => setAdding(true)} |  |
| [src/components/pages/TransactionsPage.tsx:520](../src/components/pages/TransactionsPage.tsx#L520) | Button | {() => setContributing(t)} | {expenseRecovery(t, transactions).remainingPaise === 0}; "Record contribution return"; "Record contribution return" |
| [src/components/pages/TransactionsPage.tsx:521](../src/components/pages/TransactionsPage.tsx#L521) | Button | {() => setEditing(t)} | "Edit" |
| [src/components/pages/TransactionsPage.tsx:529](../src/components/pages/TransactionsPage.tsx#L529) | Button | {() => handleDuplicate(t)} | "Duplicate" |
| [src/components/pages/TransactionsPage.tsx:537](../src/components/pages/TransactionsPage.tsx#L537) | Button | {() => handleDelete(t.id)} | "Delete" |

### src/components/pages/UdhariPage.tsx

| Source | Element | Handler | Disabled condition / title |
|---|---|---|---|
| [src/components/pages/UdhariPage.tsx:273](../src/components/pages/UdhariPage.tsx#L273) | Button | {() => setAdding(true)} |  |
| [src/components/pages/UdhariPage.tsx:367](../src/components/pages/UdhariPage.tsx#L367) | Button | {() => { void navigator.clipboard.writeText(wa); toast({ title: "Reminder copied", kind: "success" }); }} |  |
| [src/components/pages/UdhariPage.tsx:528](../src/components/pages/UdhariPage.tsx#L528) | Button | {() => setSettling(u)} | "Settle with cash" |
| [src/components/pages/UdhariPage.tsx:541](../src/components/pages/UdhariPage.tsx#L541) | Button | {() => setWriteOff(u)} | "Write off receivable" |
| [src/components/pages/UdhariPage.tsx:551](../src/components/pages/UdhariPage.tsx#L551) | Button | {() => { void navigator.clipboard.writeText(waText); toast({ title: "Copied", kind: "success" }); }} | "Copy WhatsApp reminder" |
| [src/components/pages/UdhariPage.tsx:563](../src/components/pages/UdhariPage.tsx#L563) | Button | {() => setEditing(u)} |  |
| [src/components/pages/UdhariPage.tsx:570](../src/components/pages/UdhariPage.tsx#L570) | Button | {() => handleDelete(u.id)} |  |
| [src/components/pages/UdhariPage.tsx:651](../src/components/pages/UdhariPage.tsx#L651) | SettleDialog | {(amt, accountId) => settling && settle(settling, amt, accountId)} |  |
| [src/components/pages/UdhariPage.tsx:658](../src/components/pages/UdhariPage.tsx#L658) | WriteOffDialog | {(amt, categoryId, reason) => writeOff && recordWriteOff(writeOff, amt, categoryId, reason)} |  |
| [src/components/pages/UdhariPage.tsx:725](../src/components/pages/UdhariPage.tsx#L725) | Button | {() => setAmount(remaining)} |  |
| [src/components/pages/UdhariPage.tsx:728](../src/components/pages/UdhariPage.tsx#L728) | Button | {() => setAmount(Math.round(remaining / 2))} |  |
| [src/components/pages/UdhariPage.tsx:737](../src/components/pages/UdhariPage.tsx#L737) | Button | {onClose} |  |
| [src/components/pages/UdhariPage.tsx:740](../src/components/pages/UdhariPage.tsx#L740) | Button | {() => amount > 0 && accountId && onSubmit(amount, accountId)} | {amount <= 0 \|\| amount > remaining \|\| !accountId} |
| [src/components/pages/UdhariPage.tsx:814](../src/components/pages/UdhariPage.tsx#L814) | Button | {onClose} |  |
| [src/components/pages/UdhariPage.tsx:817](../src/components/pages/UdhariPage.tsx#L817) | Button | {() => amount > 0 && categoryId && !validateWriteOffReason(reason) && onSubmit(amount, categoryId, reason)} | {amount <= 0 \|\| amount > remaining \|\| !categoryId \|\| !!validateWriteOffReason(reason)} |
| [src/components/pages/UdhariPage.tsx:917](../src/components/pages/UdhariPage.tsx#L917) | form | {submit} |  |
| [src/components/pages/UdhariPage.tsx:1012](../src/components/pages/UdhariPage.tsx#L1012) | Button | {onClose} |  |

### src/components/pages/WealthHubPage.tsx

| Source | Element | Handler | Disabled condition / title |
|---|---|---|---|
| [src/components/pages/WealthHubPage.tsx:222](../src/components/pages/WealthHubPage.tsx#L222) | Button | {addFd} |  |
| [src/components/pages/WealthHubPage.tsx:260](../src/components/pages/WealthHubPage.tsx#L260) | Button | {addInsurance} |  |
| [src/components/pages/WealthHubPage.tsx:309](../src/components/pages/WealthHubPage.tsx#L309) | Button | {addValuation} |  |

### src/components/pages/admin/AdminDashboardPage.tsx

| Source | Element | Handler | Disabled condition / title |
|---|---|---|---|
| [src/components/pages/admin/AdminDashboardPage.tsx:104](../src/components/pages/admin/AdminDashboardPage.tsx#L104) | Button | {load} |  |
| [src/components/pages/admin/AdminDashboardPage.tsx:114](../src/components/pages/admin/AdminDashboardPage.tsx#L114) | Button | {load} |  |

### src/components/pages/admin/BrandingSettingsPage.tsx

| Source | Element | Handler | Disabled condition / title |
|---|---|---|---|
| [src/components/pages/admin/BrandingSettingsPage.tsx:89](../src/components/pages/admin/BrandingSettingsPage.tsx#L89) | Button | {load} |  |
| [src/components/pages/admin/BrandingSettingsPage.tsx:92](../src/components/pages/admin/BrandingSettingsPage.tsx#L92) | Button | {handleSave} |  |
| [src/components/pages/admin/BrandingSettingsPage.tsx:111](../src/components/pages/admin/BrandingSettingsPage.tsx#L111) | Button | {load} |  |

### src/components/pages/admin/FeatureFlagsPage.tsx

| Source | Element | Handler | Disabled condition / title |
|---|---|---|---|
| [src/components/pages/admin/FeatureFlagsPage.tsx:84](../src/components/pages/admin/FeatureFlagsPage.tsx#L84) | Button | {load} |  |
| [src/components/pages/admin/FeatureFlagsPage.tsx:87](../src/components/pages/admin/FeatureFlagsPage.tsx#L87) | Button | {handleSave} | {loading} |
| [src/components/pages/admin/FeatureFlagsPage.tsx:106](../src/components/pages/admin/FeatureFlagsPage.tsx#L106) | Button | {load} |  |

### src/components/pages/admin/PlanManagementPage.tsx

| Source | Element | Handler | Disabled condition / title |
|---|---|---|---|
| [src/components/pages/admin/PlanManagementPage.tsx:111](../src/components/pages/admin/PlanManagementPage.tsx#L111) | Button | {load} |  |
| [src/components/pages/admin/PlanManagementPage.tsx:121](../src/components/pages/admin/PlanManagementPage.tsx#L121) | Button | {load} |  |
| [src/components/pages/admin/PlanManagementPage.tsx:138](../src/components/pages/admin/PlanManagementPage.tsx#L138) | form | {handleSubmit} |  |
| [src/components/pages/admin/PlanManagementPage.tsx:225](../src/components/pages/admin/PlanManagementPage.tsx#L225) | Button | {() => setEditing(null)} |  |
| [src/components/pages/admin/PlanManagementPage.tsx:276](../src/components/pages/admin/PlanManagementPage.tsx#L276) | Button | {() => setEditing({ ...p })} |  |

### src/components/pages/admin/SubscriptionManagementPage.tsx

| Source | Element | Handler | Disabled condition / title |
|---|---|---|---|
| [src/components/pages/admin/SubscriptionManagementPage.tsx:136](../src/components/pages/admin/SubscriptionManagementPage.tsx#L136) | Button | {load} |  |
| [src/components/pages/admin/SubscriptionManagementPage.tsx:146](../src/components/pages/admin/SubscriptionManagementPage.tsx#L146) | Button | {load} |  |
| [src/components/pages/admin/SubscriptionManagementPage.tsx:247](../src/components/pages/admin/SubscriptionManagementPage.tsx#L247) | Button | {() => mutateSubscription(s.id, "manual_extend")} |  |
| [src/components/pages/admin/SubscriptionManagementPage.tsx:255](../src/components/pages/admin/SubscriptionManagementPage.tsx#L255) | Button | {() => mutateSubscription(s.id, "cancel")} |  |

### src/components/pages/admin/UserManagementPage.tsx

| Source | Element | Handler | Disabled condition / title |
|---|---|---|---|
| [src/components/pages/admin/UserManagementPage.tsx:166](../src/components/pages/admin/UserManagementPage.tsx#L166) | Button | {loadData} |  |
| [src/components/pages/admin/UserManagementPage.tsx:176](../src/components/pages/admin/UserManagementPage.tsx#L176) | Button | {loadData} |  |
| [src/components/pages/admin/UserManagementPage.tsx:287](../src/components/pages/admin/UserManagementPage.tsx#L287) | Button | {() => handleToggle(u.id)} |  |
| [src/components/pages/admin/UserManagementPage.tsx:295](../src/components/pages/admin/UserManagementPage.tsx#L295) | Button | {() => { setPinUser(u); setNewPin(""); setConfirmPin(""); }} |  |
| [src/components/pages/admin/UserManagementPage.tsx:366](../src/components/pages/admin/UserManagementPage.tsx#L366) | Button | {() => setPinUser(null)} |  |
| [src/components/pages/admin/UserManagementPage.tsx:369](../src/components/pages/admin/UserManagementPage.tsx#L369) | Button | {handleResetPin} |  |

### src/components/statements/StatementImportDialog.tsx

| Source | Element | Handler | Disabled condition / title |
|---|---|---|---|
| [src/components/statements/StatementImportDialog.tsx:51](../src/components/statements/StatementImportDialog.tsx#L51) | Button | {() => setZoom(z => z - 0.5)} | {zoom <= 1}; "Zoom out PDF"; "Zoom out PDF" |
| [src/components/statements/StatementImportDialog.tsx:51](../src/components/statements/StatementImportDialog.tsx#L51) | Button | {() => setZoom(z => z + 0.5)} | {zoom >= 3}; "Zoom in PDF"; "Zoom in PDF" |
| [src/components/statements/StatementImportDialog.tsx:184](../src/components/statements/StatementImportDialog.tsx#L184) | Button | {() => { onClose(); useNavStore.getState().setActive("accounts"); }} |  |
| [src/components/statements/StatementImportDialog.tsx:188](../src/components/statements/StatementImportDialog.tsx#L188) | Button | {() => fileInput.current?.click()} | {busy} |
| [src/components/statements/StatementImportDialog.tsx:192](../src/components/statements/StatementImportDialog.tsx#L192) | form | {event => { event.preventDefault(); if (!password) return; const resolve = passwordResolve.current; passwordResolve.current = null; setPasswordState(null); const value = password; setPassword(""); resolve?.(value); }} |  |
| [src/components/statements/StatementImportDialog.tsx:197](../src/components/statements/StatementImportDialog.tsx#L197) | Button | {() => { controller.current?.abort(); passwordResolve.current?.(null); }} |  |
| [src/components/statements/StatementImportDialog.tsx:197](../src/components/statements/StatementImportDialog.tsx#L197) | Button | {() => void analyze()} | {busy \|\| !file \|\| !accountId \|\| !dataReady} |
| [src/components/statements/StatementImportDialog.tsx:201](../src/components/statements/StatementImportDialog.tsx#L201) | Button | {() => setShowSource(value => !value)} | "View source PDF"; "View source PDF" |
| [src/components/statements/StatementImportDialog.tsx:201](../src/components/statements/StatementImportDialog.tsx#L201) | Button | {downloadReview} | "Download statement review"; "Download statement review" |
| [src/components/statements/StatementImportDialog.tsx:201](../src/components/statements/StatementImportDialog.tsx#L201) | Button | {() => void reset()} | {saving}; "Replace statement"; "Replace statement" |
| [src/components/statements/StatementImportDialog.tsx:228](../src/components/statements/StatementImportDialog.tsx#L228) | button | {() => { setSourcePage(row.page); setShowSource(true); }} |  |
| [src/components/statements/StatementImportDialog.tsx:239](../src/components/statements/StatementImportDialog.tsx#L239) | Button | {() => setPage(p => p - 1)} | {page <= 1}; "Previous page"; "Previous transaction page" |
| [src/components/statements/StatementImportDialog.tsx:239](../src/components/statements/StatementImportDialog.tsx#L239) | Button | {() => setPage(p => p + 1)} | {page >= pageCount}; "Next page"; "Next transaction page" |
| [src/components/statements/StatementImportDialog.tsx:241](../src/components/statements/StatementImportDialog.tsx#L241) | Button | {() => setSourcePage(p => p - 1)} | {sourcePage <= 1}; "Previous PDF page"; "Previous PDF page" |
| [src/components/statements/StatementImportDialog.tsx:241](../src/components/statements/StatementImportDialog.tsx#L241) | Button | {() => setSourcePage(p => p + 1)} | {sourcePage >= analysis.pageCount}; "Next PDF page"; "Next PDF page" |
| [src/components/statements/StatementImportDialog.tsx:245](../src/components/statements/StatementImportDialog.tsx#L245) | Button | {() => setDecisions(current => Object.fromEntries(Object.entries(current).map(([id, d]) => { const row = rows.find(r => r.id === id)!; return [id, d.include && !decisionProblems(row, { ...d, reviewed: true }, accountId).length ? { ...d, reviewed: true } : d]; })))} | {saving \|\| !included.length} |
| [src/components/statements/StatementImportDialog.tsx:245](../src/components/statements/StatementImportDialog.tsx#L245) | Button | {onClose} |  |
| [src/components/statements/StatementImportDialog.tsx:245](../src/components/statements/StatementImportDialog.tsx#L245) | Button | {() => void save()} | {!ready} |

### src/components/ui/ConfirmDialog.tsx

| Source | Element | Handler | Disabled condition / title |
|---|---|---|---|
| [src/components/ui/ConfirmDialog.tsx:44](../src/components/ui/ConfirmDialog.tsx#L44) | Button | {() => resolveConfirm(false)} |  |
| [src/components/ui/ConfirmDialog.tsx:47](../src/components/ui/ConfirmDialog.tsx#L47) | Button | {() => resolveConfirm(true)} |  |

### src/components/ui/Toast.tsx

| Source | Element | Handler | Disabled condition / title |
|---|---|---|---|
| [src/components/ui/Toast.tsx:59](../src/components/ui/Toast.tsx#L59) | button | {() => dismiss(t.id)} | "Dismiss notification" |

## Field and Control Definitions

| Source | Element | Label / name / placeholder | Type / required / range |
|---|---|---|---|
| [src/components/auth/AdminAuth.tsx:60](../src/components/auth/AdminAuth.tsx#L60) | Field | "Admin username" |  |
| [src/components/auth/AdminAuth.tsx:61](../src/components/auth/AdminAuth.tsx#L61) | Input |  |  |
| [src/components/auth/AdminAuth.tsx:63](../src/components/auth/AdminAuth.tsx#L63) | Field | "PIN" |  |
| [src/components/auth/AdminAuth.tsx:64](../src/components/auth/AdminAuth.tsx#L64) | Input | "Enter admin PIN" | "password" |
| [src/components/auth/CloudAuth.tsx:219](../src/components/auth/CloudAuth.tsx#L219) | Field | "Username" |  |
| [src/components/auth/CloudAuth.tsx:220](../src/components/auth/CloudAuth.tsx#L220) | Input | "your.username" |  |
| [src/components/auth/CloudAuth.tsx:227](../src/components/auth/CloudAuth.tsx#L227) | Field | "PIN" |  |
| [src/components/auth/CloudAuth.tsx:229](../src/components/auth/CloudAuth.tsx#L229) | Input | "Enter PIN" | "password" |
| [src/components/auth/CloudAuth.tsx:282](../src/components/auth/CloudAuth.tsx#L282) | Field | "Display name" |  |
| [src/components/auth/CloudAuth.tsx:283](../src/components/auth/CloudAuth.tsx#L283) | Input | "User Name" |  |
| [src/components/auth/CloudAuth.tsx:290](../src/components/auth/CloudAuth.tsx#L290) | Field | "Username" |  |
| [src/components/auth/CloudAuth.tsx:291](../src/components/auth/CloudAuth.tsx#L291) | Input | "amit" |  |
| [src/components/auth/CloudAuth.tsx:297](../src/components/auth/CloudAuth.tsx#L297) | Field | "PIN" |  |
| [src/components/auth/CloudAuth.tsx:298](../src/components/auth/CloudAuth.tsx#L298) | Input | "••••" | "password" |
| [src/components/auth/CloudAuth.tsx:306](../src/components/auth/CloudAuth.tsx#L306) | Field | "Confirm PIN" |  |
| [src/components/auth/CloudAuth.tsx:307](../src/components/auth/CloudAuth.tsx#L307) | Input | "••••" | "password" |
| [src/components/auth/CloudAuth.tsx:316](../src/components/auth/CloudAuth.tsx#L316) | input |  | "checkbox" |
| [src/components/auth/LockScreen.tsx:53](../src/components/auth/LockScreen.tsx#L53) | Field | "Enter PIN" |  |
| [src/components/auth/LockScreen.tsx:54](../src/components/auth/LockScreen.tsx#L54) | Input | "Enter your PIN" | "password" |
| [src/components/auth/ProfileLogin.tsx:95](../src/components/auth/ProfileLogin.tsx#L95) | Field | {'PIN for @${selected.username}'} |  |
| [src/components/auth/ProfileLogin.tsx:97](../src/components/auth/ProfileLogin.tsx#L97) | Input | "Enter PIN" | "password" |
| [src/components/auth/RequiredPinChange.tsx:24](../src/components/auth/RequiredPinChange.tsx#L24) | Input |  | "password" |
| [src/components/auth/RequiredPinChange.tsx:25](../src/components/auth/RequiredPinChange.tsx#L25) | Input |  | "password" |
| [src/components/auth/RequiredPinChange.tsx:26](../src/components/auth/RequiredPinChange.tsx#L26) | Input |  | "password" |
| [src/components/categories/CategoryCleanupPanel.tsx:126](../src/components/categories/CategoryCleanupPanel.tsx#L126) | Select |  |  |
| [src/components/categories/CategoryCleanupPanel.tsx:141](../src/components/categories/CategoryCleanupPanel.tsx#L141) | Select |  |  |
| [src/components/finance/CardEmiSimulatorDialog.tsx:56](../src/components/finance/CardEmiSimulatorDialog.tsx#L56) | Field | "Purchase amount (₹)" |  |
| [src/components/finance/CardEmiSimulatorDialog.tsx:57](../src/components/finance/CardEmiSimulatorDialog.tsx#L57) | Input |  | "number" |
| [src/components/finance/CardEmiSimulatorDialog.tsx:59](../src/components/finance/CardEmiSimulatorDialog.tsx#L59) | Field | "Annual rate %" |  |
| [src/components/finance/CardEmiSimulatorDialog.tsx:60](../src/components/finance/CardEmiSimulatorDialog.tsx#L60) | Input |  | "number" |
| [src/components/finance/CardEmiSimulatorDialog.tsx:62](../src/components/finance/CardEmiSimulatorDialog.tsx#L62) | Field | "Processing fee (₹)" |  |
| [src/components/finance/CardEmiSimulatorDialog.tsx:63](../src/components/finance/CardEmiSimulatorDialog.tsx#L63) | Input |  | "number" |
| [src/components/forms/QuickAddDialog.tsx:69](../src/components/forms/QuickAddDialog.tsx#L69) | Input | "Amount (₹)" | "number"; min={0} |
| [src/components/forms/TransactionForm.tsx:264](../src/components/forms/TransactionForm.tsx#L264) | Field | "Type" |  |
| [src/components/forms/TransactionForm.tsx:265](../src/components/forms/TransactionForm.tsx#L265) | Select |  |  |
| [src/components/forms/TransactionForm.tsx:292](../src/components/forms/TransactionForm.tsx#L292) | Field | "Original shared expense" |  |
| [src/components/forms/TransactionForm.tsx:293](../src/components/forms/TransactionForm.tsx#L293) | select | "Original shared expense" |  |
| [src/components/forms/TransactionForm.tsx:303](../src/components/forms/TransactionForm.tsx#L303) | Field | "Date" |  |
| [src/components/forms/TransactionForm.tsx:304](../src/components/forms/TransactionForm.tsx#L304) | Input | "Transaction date" | "date" |
| [src/components/forms/TransactionForm.tsx:311](../src/components/forms/TransactionForm.tsx#L311) | Field | "Amount (₹)" |  |
| [src/components/forms/TransactionForm.tsx:312](../src/components/forms/TransactionForm.tsx#L312) | Input | "Transaction amount"; "0.00" | "number" |
| [src/components/forms/TransactionForm.tsx:325](../src/components/forms/TransactionForm.tsx#L325) | Field | "Payment Mode" |  |
| [src/components/forms/TransactionForm.tsx:326](../src/components/forms/TransactionForm.tsx#L326) | Select |  |  |
| [src/components/forms/TransactionForm.tsx:343](../src/components/forms/TransactionForm.tsx#L343) | Field | { (state.type === "expense" \|\| state.type === "refund") && state.paymentMode === "credit_card" ? "Tag account (optional — does not move cash)" : "Account" } | required |
| [src/components/forms/TransactionForm.tsx:357](../src/components/forms/TransactionForm.tsx#L357) | Select |  |  |
| [src/components/forms/TransactionForm.tsx:392](../src/components/forms/TransactionForm.tsx#L392) | Field | "To Account" |  |
| [src/components/forms/TransactionForm.tsx:393](../src/components/forms/TransactionForm.tsx#L393) | Select |  |  |
| [src/components/forms/TransactionForm.tsx:412](../src/components/forms/TransactionForm.tsx#L412) | Field | "Category" | required |
| [src/components/forms/TransactionForm.tsx:422](../src/components/forms/TransactionForm.tsx#L422) | Select |  |  |
| [src/components/forms/TransactionForm.tsx:442](../src/components/forms/TransactionForm.tsx#L442) | Field | "Credit Card" |  |
| [src/components/forms/TransactionForm.tsx:443](../src/components/forms/TransactionForm.tsx#L443) | Select |  |  |
| [src/components/forms/TransactionForm.tsx:461](../src/components/forms/TransactionForm.tsx#L461) | Field | "Loan" |  |
| [src/components/forms/TransactionForm.tsx:462](../src/components/forms/TransactionForm.tsx#L462) | Select |  |  |
| [src/components/forms/TransactionForm.tsx:480](../src/components/forms/TransactionForm.tsx#L480) | Field | "Loan" |  |
| [src/components/forms/TransactionForm.tsx:481](../src/components/forms/TransactionForm.tsx#L481) | Select |  |  |
| [src/components/forms/TransactionForm.tsx:499](../src/components/forms/TransactionForm.tsx#L499) | Field | "Goal" |  |
| [src/components/forms/TransactionForm.tsx:500](../src/components/forms/TransactionForm.tsx#L500) | Select |  |  |
| [src/components/forms/TransactionForm.tsx:518](../src/components/forms/TransactionForm.tsx#L518) | Field | "Investment" |  |
| [src/components/forms/TransactionForm.tsx:519](../src/components/forms/TransactionForm.tsx#L519) | Select |  |  |
| [src/components/forms/TransactionForm.tsx:539](../src/components/forms/TransactionForm.tsx#L539) | Field | "Credit card used" |  |
| [src/components/forms/TransactionForm.tsx:540](../src/components/forms/TransactionForm.tsx#L540) | Select |  |  |
| [src/components/forms/TransactionForm.tsx:563](../src/components/forms/TransactionForm.tsx#L563) | Field | "Udhari Record" |  |
| [src/components/forms/TransactionForm.tsx:564](../src/components/forms/TransactionForm.tsx#L564) | Select |  |  |
| [src/components/forms/TransactionForm.tsx:582](../src/components/forms/TransactionForm.tsx#L582) | Field | "Merchant / Person" | required |
| [src/components/forms/TransactionForm.tsx:593](../src/components/forms/TransactionForm.tsx#L593) | Input | "e.g. Swiggy, HDFC, Rahul" |  |
| [src/components/forms/TransactionForm.tsx:600](../src/components/forms/TransactionForm.tsx#L600) | Field | "Description" |  |
| [src/components/forms/TransactionForm.tsx:601](../src/components/forms/TransactionForm.tsx#L601) | Input | "Short description" |  |
| [src/components/forms/TransactionForm.tsx:608](../src/components/forms/TransactionForm.tsx#L608) | Field | "Tags (comma-separated)" |  |
| [src/components/forms/TransactionForm.tsx:609](../src/components/forms/TransactionForm.tsx#L609) | Input | "e.g. family, festive" |  |
| [src/components/forms/TransactionForm.tsx:624](../src/components/forms/TransactionForm.tsx#L624) | Field | "Notes" |  |
| [src/components/forms/TransactionForm.tsx:635](../src/components/forms/TransactionForm.tsx#L635) | Checkbox |  |  |
| [src/components/forms/TransactionForm.tsx:642](../src/components/forms/TransactionForm.tsx#L642) | Checkbox |  |  |
| [src/components/forms/TransactionForm.tsx:649](../src/components/forms/TransactionForm.tsx#L649) | Checkbox |  |  |
| [src/components/forms/TransactionForm.tsx:656](../src/components/forms/TransactionForm.tsx#L656) | Checkbox |  |  |
| [src/components/forms/TransactionForm.tsx:666](../src/components/forms/TransactionForm.tsx#L666) | Field | "Need / Want" |  |
| [src/components/forms/TransactionForm.tsx:667](../src/components/forms/TransactionForm.tsx#L667) | Select |  |  |
| [src/components/forms/TransactionForm.tsx:684](../src/components/forms/TransactionForm.tsx#L684) | Field | "Fixed / Variable" |  |
| [src/components/forms/TransactionForm.tsx:685](../src/components/forms/TransactionForm.tsx#L685) | Select |  |  |
| [src/components/layout/CommandPalette.tsx:158](../src/components/layout/CommandPalette.tsx#L158) | input | "Type a command, search transactions, jump to page…" |  |
| [src/components/pages/AccountsPage.tsx:280](../src/components/pages/AccountsPage.tsx#L280) | Field | "Name" |  |
| [src/components/pages/AccountsPage.tsx:281](../src/components/pages/AccountsPage.tsx#L281) | Input | "HDFC Savings" |  |
| [src/components/pages/AccountsPage.tsx:287](../src/components/pages/AccountsPage.tsx#L287) | Field | "Type" |  |
| [src/components/pages/AccountsPage.tsx:288](../src/components/pages/AccountsPage.tsx#L288) | Select |  |  |
| [src/components/pages/AccountsPage.tsx:304](../src/components/pages/AccountsPage.tsx#L304) | Field | "Institution" |  |
| [src/components/pages/AccountsPage.tsx:305](../src/components/pages/AccountsPage.tsx#L305) | Input | "HDFC Bank" |  |
| [src/components/pages/AccountsPage.tsx:311](../src/components/pages/AccountsPage.tsx#L311) | Field | "Opening balance (₹)" |  |
| [src/components/pages/AccountsPage.tsx:312](../src/components/pages/AccountsPage.tsx#L312) | Input |  | "number" |
| [src/components/pages/AccountsPage.tsx:320](../src/components/pages/AccountsPage.tsx#L320) | Field | "Color" |  |
| [src/components/pages/AccountsPage.tsx:321](../src/components/pages/AccountsPage.tsx#L321) | Input |  | "color" |
| [src/components/pages/AuditPage.tsx:141](../src/components/pages/AuditPage.tsx#L141) | Input | "Search details, entity, ID…" |  |
| [src/components/pages/AuditPage.tsx:147](../src/components/pages/AuditPage.tsx#L147) | Select |  |  |
| [src/components/pages/AuditPage.tsx:160](../src/components/pages/AuditPage.tsx#L160) | Select |  |  |
| [src/components/pages/BudgetsPage.tsx:117](../src/components/pages/BudgetsPage.tsx#L117) | Select |  |  |
| [src/components/pages/BudgetsPage.tsx:129](../src/components/pages/BudgetsPage.tsx#L129) | Select |  |  |
| [src/components/pages/BudgetsPage.tsx:376](../src/components/pages/BudgetsPage.tsx#L376) | Field | "Period" |  |
| [src/components/pages/BudgetsPage.tsx:377](../src/components/pages/BudgetsPage.tsx#L377) | Select |  |  |
| [src/components/pages/BudgetsPage.tsx:392](../src/components/pages/BudgetsPage.tsx#L392) | Field | "Category" |  |
| [src/components/pages/BudgetsPage.tsx:393](../src/components/pages/BudgetsPage.tsx#L393) | Select |  |  |
| [src/components/pages/BudgetsPage.tsx:409](../src/components/pages/BudgetsPage.tsx#L409) | Field | "Year" |  |
| [src/components/pages/BudgetsPage.tsx:410](../src/components/pages/BudgetsPage.tsx#L410) | Input |  | "number" |
| [src/components/pages/BudgetsPage.tsx:417](../src/components/pages/BudgetsPage.tsx#L417) | Field | "Month" |  |
| [src/components/pages/BudgetsPage.tsx:418](../src/components/pages/BudgetsPage.tsx#L418) | Input |  | "number"; min={1}; max={12} |
| [src/components/pages/BudgetsPage.tsx:429](../src/components/pages/BudgetsPage.tsx#L429) | Field | "Amount (₹)" |  |
| [src/components/pages/BudgetsPage.tsx:430](../src/components/pages/BudgetsPage.tsx#L430) | Input |  | "number" |
| [src/components/pages/BudgetsPage.tsx:437](../src/components/pages/BudgetsPage.tsx#L437) | Field | "Mode" |  |
| [src/components/pages/BudgetsPage.tsx:438](../src/components/pages/BudgetsPage.tsx#L438) | Select |  |  |
| [src/components/pages/BudgetsPage.tsx:452](../src/components/pages/BudgetsPage.tsx#L452) | Checkbox |  |  |
| [src/components/pages/BudgetsPage.tsx:461](../src/components/pages/BudgetsPage.tsx#L461) | Checkbox |  |  |
| [src/components/pages/CardsPage.tsx:671](../src/components/pages/CardsPage.tsx#L671) | Field | "Link to credit card" |  |
| [src/components/pages/CardsPage.tsx:672](../src/components/pages/CardsPage.tsx#L672) | Select |  |  |
| [src/components/pages/CardsPage.tsx:696](../src/components/pages/CardsPage.tsx#L696) | Field | "Account (cash source)" |  |
| [src/components/pages/CardsPage.tsx:697](../src/components/pages/CardsPage.tsx#L697) | Select |  |  |
| [src/components/pages/CardsPage.tsx:848](../src/components/pages/CardsPage.tsx#L848) | Field | "Type" |  |
| [src/components/pages/CardsPage.tsx:849](../src/components/pages/CardsPage.tsx#L849) | Select |  |  |
| [src/components/pages/CardsPage.tsx:862](../src/components/pages/CardsPage.tsx#L862) | Field | "Bank" |  |
| [src/components/pages/CardsPage.tsx:863](../src/components/pages/CardsPage.tsx#L863) | Select |  |  |
| [src/components/pages/CardsPage.tsx:876](../src/components/pages/CardsPage.tsx#L876) | Field | "Nickname" |  |
| [src/components/pages/CardsPage.tsx:877](../src/components/pages/CardsPage.tsx#L877) | Input | "HDFC Regalia" |  |
| [src/components/pages/CardsPage.tsx:883](../src/components/pages/CardsPage.tsx#L883) | Field | "Last 4 digits" |  |
| [src/components/pages/CardsPage.tsx:884](../src/components/pages/CardsPage.tsx#L884) | Input | "1234" |  |
| [src/components/pages/CardsPage.tsx:893](../src/components/pages/CardsPage.tsx#L893) | Field | "Color" |  |
| [src/components/pages/CardsPage.tsx:894](../src/components/pages/CardsPage.tsx#L894) | Input |  | "color" |
| [src/components/pages/CardsPage.tsx:902](../src/components/pages/CardsPage.tsx#L902) | Field | "Linked account" |  |
| [src/components/pages/CardsPage.tsx:903](../src/components/pages/CardsPage.tsx#L903) | Select |  |  |
| [src/components/pages/CardsPage.tsx:921](../src/components/pages/CardsPage.tsx#L921) | Field | "Credit limit (₹)" |  |
| [src/components/pages/CardsPage.tsx:922](../src/components/pages/CardsPage.tsx#L922) | Input |  | "number" |
| [src/components/pages/CardsPage.tsx:928](../src/components/pages/CardsPage.tsx#L928) | Field | "Interest rate % (APR)" |  |
| [src/components/pages/CardsPage.tsx:929](../src/components/pages/CardsPage.tsx#L929) | Input |  | "number" |
| [src/components/pages/CardsPage.tsx:935](../src/components/pages/CardsPage.tsx#L935) | Field | "Statement day" |  |
| [src/components/pages/CardsPage.tsx:936](../src/components/pages/CardsPage.tsx#L936) | Input |  | "number"; min={1}; max={31} |
| [src/components/pages/CardsPage.tsx:944](../src/components/pages/CardsPage.tsx#L944) | Field | "Due day" |  |
| [src/components/pages/CardsPage.tsx:945](../src/components/pages/CardsPage.tsx#L945) | Input |  | "number"; min={1}; max={31} |
| [src/components/pages/CardsPage.tsx:953](../src/components/pages/CardsPage.tsx#L953) | Field | "Annual fee (₹)" |  |
| [src/components/pages/CardsPage.tsx:954](../src/components/pages/CardsPage.tsx#L954) | Input |  | "number" |
| [src/components/pages/CardsPage.tsx:960](../src/components/pages/CardsPage.tsx#L960) | Field | "Reward note" |  |
| [src/components/pages/CardsPage.tsx:961](../src/components/pages/CardsPage.tsx#L961) | Input | "2x on dining, 4% on fuel" |  |
| [src/components/pages/CategoriesPage.tsx:128](../src/components/pages/CategoriesPage.tsx#L128) | Select |  |  |
| [src/components/pages/CategoriesPage.tsx:139](../src/components/pages/CategoriesPage.tsx#L139) | Checkbox |  |  |
| [src/components/pages/CategoriesPage.tsx:361](../src/components/pages/CategoriesPage.tsx#L361) | Field | "Name" |  |
| [src/components/pages/CategoriesPage.tsx:362](../src/components/pages/CategoriesPage.tsx#L362) | Input | "Groceries" |  |
| [src/components/pages/CategoriesPage.tsx:368](../src/components/pages/CategoriesPage.tsx#L368) | Field | "Applies to" |  |
| [src/components/pages/CategoriesPage.tsx:369](../src/components/pages/CategoriesPage.tsx#L369) | Select |  |  |
| [src/components/pages/CategoriesPage.tsx:392](../src/components/pages/CategoriesPage.tsx#L392) | Field | "Icon" |  |
| [src/components/pages/CategoriesPage.tsx:406](../src/components/pages/CategoriesPage.tsx#L406) | Field | "Color" |  |
| [src/components/pages/CategoriesPage.tsx:427](../src/components/pages/CategoriesPage.tsx#L427) | Checkbox |  |  |
| [src/components/pages/CategoriesPage.tsx:434](../src/components/pages/CategoriesPage.tsx#L434) | Checkbox |  |  |
| [src/components/pages/CategoriesPage.tsx:441](../src/components/pages/CategoriesPage.tsx#L441) | Checkbox |  |  |
| [src/components/pages/DashboardPage.tsx:413](../src/components/pages/DashboardPage.tsx#L413) | Select |  |  |
| [src/components/pages/ExportPage.tsx:228](../src/components/pages/ExportPage.tsx#L228) | Field | "From" |  |
| [src/components/pages/ExportPage.tsx:229](../src/components/pages/ExportPage.tsx#L229) | Input |  | "date" |
| [src/components/pages/ExportPage.tsx:231](../src/components/pages/ExportPage.tsx#L231) | Field | "To" |  |
| [src/components/pages/ExportPage.tsx:232](../src/components/pages/ExportPage.tsx#L232) | Input |  | "date" |
| [src/components/pages/ExportPage.tsx:234](../src/components/pages/ExportPage.tsx#L234) | Field | "Format" |  |
| [src/components/pages/ExportPage.tsx:235](../src/components/pages/ExportPage.tsx#L235) | Select |  |  |
| [src/components/pages/ExportPage.tsx:487](../src/components/pages/ExportPage.tsx#L487) | Field | "PIN" |  |
| [src/components/pages/ExportPage.tsx:488](../src/components/pages/ExportPage.tsx#L488) | Input | "Enter PIN" | "password" |
| [src/components/pages/GoalsPage.tsx:296](../src/components/pages/GoalsPage.tsx#L296) | Field | "Amount (₹)" |  |
| [src/components/pages/GoalsPage.tsx:299](../src/components/pages/GoalsPage.tsx#L299) | Input |  | "number" |
| [src/components/pages/GoalsPage.tsx:423](../src/components/pages/GoalsPage.tsx#L423) | Field | "Title" |  |
| [src/components/pages/GoalsPage.tsx:424](../src/components/pages/GoalsPage.tsx#L424) | Input | "iPhone 17 Pro" |  |
| [src/components/pages/GoalsPage.tsx:430](../src/components/pages/GoalsPage.tsx#L430) | Field | "Goal type" |  |
| [src/components/pages/GoalsPage.tsx:431](../src/components/pages/GoalsPage.tsx#L431) | Select |  |  |
| [src/components/pages/GoalsPage.tsx:449](../src/components/pages/GoalsPage.tsx#L449) | Field | "Priority (1 high — 5 low)" |  |
| [src/components/pages/GoalsPage.tsx:450](../src/components/pages/GoalsPage.tsx#L450) | Input |  | "number"; min={1}; max={5} |
| [src/components/pages/GoalsPage.tsx:460](../src/components/pages/GoalsPage.tsx#L460) | Field | "Target amount (₹)" |  |
| [src/components/pages/GoalsPage.tsx:461](../src/components/pages/GoalsPage.tsx#L461) | Input |  | "number" |
| [src/components/pages/GoalsPage.tsx:467](../src/components/pages/GoalsPage.tsx#L467) | Field | "Target date" |  |
| [src/components/pages/GoalsPage.tsx:468](../src/components/pages/GoalsPage.tsx#L468) | Input |  | "date" |
| [src/components/pages/GoalsPage.tsx:474](../src/components/pages/GoalsPage.tsx#L474) | Field | "Current saved" |  |
| [src/components/pages/GoalsPage.tsx:475](../src/components/pages/GoalsPage.tsx#L475) | Input |  | "number" |
| [src/components/pages/GoalsPage.tsx:481](../src/components/pages/GoalsPage.tsx#L481) | Field | "Icon" |  |
| [src/components/pages/GoalsPage.tsx:482](../src/components/pages/GoalsPage.tsx#L482) | Input | "🎯" |  |
| [src/components/pages/GoalsPage.tsx:488](../src/components/pages/GoalsPage.tsx#L488) | Field | "Goal style" |  |
| [src/components/pages/HouseholdDashboardPage.tsx:129](../src/components/pages/HouseholdDashboardPage.tsx#L129) | Field | "Household name" |  |
| [src/components/pages/HouseholdDashboardPage.tsx:130](../src/components/pages/HouseholdDashboardPage.tsx#L130) | Input | "Home" |  |
| [src/components/pages/HouseholdDashboardPage.tsx:157](../src/components/pages/HouseholdDashboardPage.tsx#L157) | Field | "Add partner / member" |  |
| [src/components/pages/HouseholdDashboardPage.tsx:158](../src/components/pages/HouseholdDashboardPage.tsx#L158) | Input |  |  |
| [src/components/pages/ImportPage.tsx:564](../src/components/pages/ImportPage.tsx#L564) | input |  | "file" |
| [src/components/pages/ImportPage.tsx:604](../src/components/pages/ImportPage.tsx#L604) | Field | {tf.label + (tf.required ? " *" : "")} |  |
| [src/components/pages/ImportPage.tsx:608](../src/components/pages/ImportPage.tsx#L608) | Select |  |  |
| [src/components/pages/ImportPage.tsx:673](../src/components/pages/ImportPage.tsx#L673) | Field | "Duplicates" |  |
| [src/components/pages/ImportPage.tsx:674](../src/components/pages/ImportPage.tsx#L674) | Select |  |  |
| [src/components/pages/ImportPage.tsx:757](../src/components/pages/ImportPage.tsx#L757) | input |  | "file" |
| [src/components/pages/InvestmentsPage.tsx:342](../src/components/pages/InvestmentsPage.tsx#L342) | Field | "Amount (₹)" |  |
| [src/components/pages/InvestmentsPage.tsx:343](../src/components/pages/InvestmentsPage.tsx#L343) | Input |  | "number" |
| [src/components/pages/InvestmentsPage.tsx:454](../src/components/pages/InvestmentsPage.tsx#L454) | Field | "Name" |  |
| [src/components/pages/InvestmentsPage.tsx:455](../src/components/pages/InvestmentsPage.tsx#L455) | Input | "Axis Bluechip SIP" |  |
| [src/components/pages/InvestmentsPage.tsx:461](../src/components/pages/InvestmentsPage.tsx#L461) | Field | "Type" |  |
| [src/components/pages/InvestmentsPage.tsx:462](../src/components/pages/InvestmentsPage.tsx#L462) | Select |  |  |
| [src/components/pages/InvestmentsPage.tsx:478](../src/components/pages/InvestmentsPage.tsx#L478) | Field | "Frequency" |  |
| [src/components/pages/InvestmentsPage.tsx:479](../src/components/pages/InvestmentsPage.tsx#L479) | Select |  |  |
| [src/components/pages/InvestmentsPage.tsx:496](../src/components/pages/InvestmentsPage.tsx#L496) | Field | "Start date" |  |
| [src/components/pages/InvestmentsPage.tsx:497](../src/components/pages/InvestmentsPage.tsx#L497) | Input |  | "date" |
| [src/components/pages/InvestmentsPage.tsx:503](../src/components/pages/InvestmentsPage.tsx#L503) | Field | "Maturity date" |  |
| [src/components/pages/InvestmentsPage.tsx:504](../src/components/pages/InvestmentsPage.tsx#L504) | Input |  | "date" |
| [src/components/pages/InvestmentsPage.tsx:510](../src/components/pages/InvestmentsPage.tsx#L510) | Field | "Monthly target (₹)" |  |
| [src/components/pages/InvestmentsPage.tsx:511](../src/components/pages/InvestmentsPage.tsx#L511) | Input |  | "number" |
| [src/components/pages/InvestmentsPage.tsx:517](../src/components/pages/InvestmentsPage.tsx#L517) | Field | "Expected return %" |  |
| [src/components/pages/InvestmentsPage.tsx:518](../src/components/pages/InvestmentsPage.tsx#L518) | Input |  | "number" |
| [src/components/pages/LoansPage.tsx:420](../src/components/pages/LoansPage.tsx#L420) | Field | "Prepayment simulator (₹)" |  |
| [src/components/pages/LoansPage.tsx:421](../src/components/pages/LoansPage.tsx#L421) | Input | "e.g. 50000" |  |
| [src/components/pages/LoansPage.tsx:765](../src/components/pages/LoansPage.tsx#L765) | Field | "Lender" |  |
| [src/components/pages/LoansPage.tsx:766](../src/components/pages/LoansPage.tsx#L766) | Input | "HDFC Bank" |  |
| [src/components/pages/LoansPage.tsx:772](../src/components/pages/LoansPage.tsx#L772) | Field | "Loan type" |  |
| [src/components/pages/LoansPage.tsx:773](../src/components/pages/LoansPage.tsx#L773) | Select |  |  |
| [src/components/pages/LoansPage.tsx:791](../src/components/pages/LoansPage.tsx#L791) | Field | "Tracking mode" |  |
| [src/components/pages/LoansPage.tsx:792](../src/components/pages/LoansPage.tsx#L792) | Select |  |  |
| [src/components/pages/LoansPage.tsx:808](../src/components/pages/LoansPage.tsx#L808) | Field | "Interest method" |  |
| [src/components/pages/LoansPage.tsx:809](../src/components/pages/LoansPage.tsx#L809) | Select |  |  |
| [src/components/pages/LoansPage.tsx:824](../src/components/pages/LoansPage.tsx#L824) | Field | "Start date" |  |
| [src/components/pages/LoansPage.tsx:825](../src/components/pages/LoansPage.tsx#L825) | Input |  | "date" |
| [src/components/pages/LoansPage.tsx:831](../src/components/pages/LoansPage.tsx#L831) | Field | "Principal (₹)" |  |
| [src/components/pages/LoansPage.tsx:832](../src/components/pages/LoansPage.tsx#L832) | Input |  | "number" |
| [src/components/pages/LoansPage.tsx:838](../src/components/pages/LoansPage.tsx#L838) | Field | "Disbursed amount (INR)" |  |
| [src/components/pages/LoansPage.tsx:839](../src/components/pages/LoansPage.tsx#L839) | Input |  | "number"; min={0} |
| [src/components/pages/LoansPage.tsx:846](../src/components/pages/LoansPage.tsx#L846) | Field | "First EMI date" |  |
| [src/components/pages/LoansPage.tsx:847](../src/components/pages/LoansPage.tsx#L847) | Input |  | "date" |
| [src/components/pages/LoansPage.tsx:853](../src/components/pages/LoansPage.tsx#L853) | Field | "Tenure (months)" |  |
| [src/components/pages/LoansPage.tsx:854](../src/components/pages/LoansPage.tsx#L854) | Input |  | "number" |
| [src/components/pages/LoansPage.tsx:860](../src/components/pages/LoansPage.tsx#L860) | Field | "Interest %" |  |
| [src/components/pages/LoansPage.tsx:861](../src/components/pages/LoansPage.tsx#L861) | Input |  | "number" |
| [src/components/pages/LoansPage.tsx:870](../src/components/pages/LoansPage.tsx#L870) | Field | "EMI due day (1-28)" |  |
| [src/components/pages/LoansPage.tsx:871](../src/components/pages/LoansPage.tsx#L871) | Input |  | "number"; min={1}; max={28} |
| [src/components/pages/LoansPage.tsx:879](../src/components/pages/LoansPage.tsx#L879) | Field | "Processing fee (₹)" |  |
| [src/components/pages/LoansPage.tsx:880](../src/components/pages/LoansPage.tsx#L880) | Input |  | "number" |
| [src/components/pages/LoansPage.tsx:888](../src/components/pages/LoansPage.tsx#L888) | Field | "Completed EMIs" |  |
| [src/components/pages/LoansPage.tsx:889](../src/components/pages/LoansPage.tsx#L889) | Input |  | "number"; min={0} |
| [src/components/pages/LoansPage.tsx:896](../src/components/pages/LoansPage.tsx#L896) | Field | "Remaining EMIs" |  |
| [src/components/pages/LoansPage.tsx:897](../src/components/pages/LoansPage.tsx#L897) | Input |  | "number"; min={0} |
| [src/components/pages/LoansPage.tsx:904](../src/components/pages/LoansPage.tsx#L904) | Field | "Outstanding principal (INR)" |  |
| [src/components/pages/LoansPage.tsx:905](../src/components/pages/LoansPage.tsx#L905) | Input |  | "number"; min={0} |
| [src/components/pages/LoansPage.tsx:914](../src/components/pages/LoansPage.tsx#L914) | Field | "Next due date" |  |
| [src/components/pages/LoansPage.tsx:915](../src/components/pages/LoansPage.tsx#L915) | Input |  | "date" |
| [src/components/pages/LoansPage.tsx:921](../src/components/pages/LoansPage.tsx#L921) | Field | "EMI override (optional)" |  |
| [src/components/pages/LoansPage.tsx:922](../src/components/pages/LoansPage.tsx#L922) | Input |  | "number"; min={0} |
| [src/components/pages/LoansPage.tsx:931](../src/components/pages/LoansPage.tsx#L931) | Field | "Foreclosure charges %" |  |
| [src/components/pages/LoansPage.tsx:932](../src/components/pages/LoansPage.tsx#L932) | Input |  | "number" |
| [src/components/pages/LoansPage.tsx:940](../src/components/pages/LoansPage.tsx#L940) | Field | "Linked credit card" |  |
| [src/components/pages/LoansPage.tsx:941](../src/components/pages/LoansPage.tsx#L941) | Select |  |  |
| [src/components/pages/LoansPage.tsx:960](../src/components/pages/LoansPage.tsx#L960) | Field | "Blocked amount on card (INR)" |  |
| [src/components/pages/LoansPage.tsx:961](../src/components/pages/LoansPage.tsx#L961) | Input |  | "number"; min={0} |
| [src/components/pages/ProfilePage.tsx:204](../src/components/pages/ProfilePage.tsx#L204) | Field | "Display name" |  |
| [src/components/pages/ProfilePage.tsx:205](../src/components/pages/ProfilePage.tsx#L205) | Input |  |  |
| [src/components/pages/ProfilePage.tsx:210](../src/components/pages/ProfilePage.tsx#L210) | Field | "Mobile" |  |
| [src/components/pages/ProfilePage.tsx:211](../src/components/pages/ProfilePage.tsx#L211) | Input | "+91…" |  |
| [src/components/pages/ProfilePage.tsx:217](../src/components/pages/ProfilePage.tsx#L217) | Field | "Email" |  |
| [src/components/pages/ProfilePage.tsx:218](../src/components/pages/ProfilePage.tsx#L218) | Input |  | "email" |
| [src/components/pages/ProfilePage.tsx:224](../src/components/pages/ProfilePage.tsx#L224) | Field | "Avatar emoji" |  |
| [src/components/pages/ProfilePage.tsx:242](../src/components/pages/ProfilePage.tsx#L242) | Field | "Avatar color" |  |
| [src/components/pages/ProfilePage.tsx:259](../src/components/pages/ProfilePage.tsx#L259) | Field | "Security question" |  |
| [src/components/pages/ProfilePage.tsx:260](../src/components/pages/ProfilePage.tsx#L260) | Input | "Your mother's first school" |  |
| [src/components/pages/ProfilePage.tsx:268](../src/components/pages/ProfilePage.tsx#L268) | Field | "Current PIN for recovery changes" |  |
| [src/components/pages/ProfilePage.tsx:269](../src/components/pages/ProfilePage.tsx#L269) | Input | "Current PIN for recovery changes" | "password" |
| [src/components/pages/ProfilePage.tsx:271](../src/components/pages/ProfilePage.tsx#L271) | Field | "Security answer (hidden hash)" |  |
| [src/components/pages/ProfilePage.tsx:272](../src/components/pages/ProfilePage.tsx#L272) | Input | "Enter your secret answer" | "password" |
| [src/components/pages/ProfilePage.tsx:301](../src/components/pages/ProfilePage.tsx#L301) | Field | "Current PIN" |  |
| [src/components/pages/ProfilePage.tsx:302](../src/components/pages/ProfilePage.tsx#L302) | Input |  | "password" |
| [src/components/pages/ProfilePage.tsx:308](../src/components/pages/ProfilePage.tsx#L308) | Field | "New PIN" |  |
| [src/components/pages/ProfilePage.tsx:309](../src/components/pages/ProfilePage.tsx#L309) | Input |  | "password" |
| [src/components/pages/ProfilePage.tsx:315](../src/components/pages/ProfilePage.tsx#L315) | Field | "Confirm new" |  |
| [src/components/pages/ProfilePage.tsx:316](../src/components/pages/ProfilePage.tsx#L316) | Input |  | "password" |
| [src/components/pages/ProfilePage.tsx:346](../src/components/pages/ProfilePage.tsx#L346) | Field | "Security answer" |  |
| [src/components/pages/ProfilePage.tsx:347](../src/components/pages/ProfilePage.tsx#L347) | Input |  | "password" |
| [src/components/pages/ProfilePage.tsx:353](../src/components/pages/ProfilePage.tsx#L353) | Field | "New PIN" |  |
| [src/components/pages/ProfilePage.tsx:354](../src/components/pages/ProfilePage.tsx#L354) | Input |  | "password" |
| [src/components/pages/ProfilePage.tsx:360](../src/components/pages/ProfilePage.tsx#L360) | Field | "Confirm new PIN" |  |
| [src/components/pages/ProfilePage.tsx:361](../src/components/pages/ProfilePage.tsx#L361) | Input |  | "password" |
| [src/components/pages/ReportsPage.tsx:344](../src/components/pages/ReportsPage.tsx#L344) | Select |  |  |
| [src/components/pages/SettingsPage.tsx:208](../src/components/pages/SettingsPage.tsx#L208) | Field | "Theme" |  |
| [src/components/pages/SettingsPage.tsx:209](../src/components/pages/SettingsPage.tsx#L209) | Select |  |  |
| [src/components/pages/SettingsPage.tsx:220](../src/components/pages/SettingsPage.tsx#L220) | Field | "Date format" |  |
| [src/components/pages/SettingsPage.tsx:221](../src/components/pages/SettingsPage.tsx#L221) | Select |  |  |
| [src/components/pages/SettingsPage.tsx:246](../src/components/pages/SettingsPage.tsx#L246) | Field | "Default dashboard mode" |  |
| [src/components/pages/SettingsPage.tsx:247](../src/components/pages/SettingsPage.tsx#L247) | Select |  |  |
| [src/components/pages/SettingsPage.tsx:261](../src/components/pages/SettingsPage.tsx#L261) | Field | "Chart colors" |  |
| [src/components/pages/SettingsPage.tsx:262](../src/components/pages/SettingsPage.tsx#L262) | Select |  |  |
| [src/components/pages/SettingsPage.tsx:288](../src/components/pages/SettingsPage.tsx#L288) | Field | "Start month" |  |
| [src/components/pages/SettingsPage.tsx:289](../src/components/pages/SettingsPage.tsx#L289) | Select |  |  |
| [src/components/pages/SettingsPage.tsx:318](../src/components/pages/SettingsPage.tsx#L318) | Field | "Warning %" |  |
| [src/components/pages/SettingsPage.tsx:319](../src/components/pages/SettingsPage.tsx#L319) | Input |  | "number"; min={0}; max={200} |
| [src/components/pages/SettingsPage.tsx:335](../src/components/pages/SettingsPage.tsx#L335) | Field | "Critical %" |  |
| [src/components/pages/SettingsPage.tsx:336](../src/components/pages/SettingsPage.tsx#L336) | Input |  | "number"; min={0}; max={200} |
| [src/components/pages/SettingsPage.tsx:377](../src/components/pages/SettingsPage.tsx#L377) | Switch |  |  |
| [src/components/pages/SettingsPage.tsx:410](../src/components/pages/SettingsPage.tsx#L410) | Input | "e.g. Paytm QR, PhonePe Business, Store Credit" |  |
| [src/components/pages/SettingsPage.tsx:539](../src/components/pages/SettingsPage.tsx#L539) | Field | "Confirmation text" |  |
| [src/components/pages/SettingsPage.tsx:540](../src/components/pages/SettingsPage.tsx#L540) | Input | {user ? 'DELETE ${user.username}' : "DELETE username"} |  |
| [src/components/pages/SuggestionsPage.tsx:414](../src/components/pages/SuggestionsPage.tsx#L414) | Select |  |  |
| [src/components/pages/TransactionsPage.tsx:251](../src/components/pages/TransactionsPage.tsx#L251) | Input | "Search merchant, description, notes, tags, category…" |  |
| [src/components/pages/TransactionsPage.tsx:270](../src/components/pages/TransactionsPage.tsx#L270) | Select |  |  |
| [src/components/pages/TransactionsPage.tsx:288](../src/components/pages/TransactionsPage.tsx#L288) | Select |  |  |
| [src/components/pages/TransactionsPage.tsx:305](../src/components/pages/TransactionsPage.tsx#L305) | Select |  |  |
| [src/components/pages/TransactionsPage.tsx:321](../src/components/pages/TransactionsPage.tsx#L321) | Select |  |  |
| [src/components/pages/TransactionsPage.tsx:337](../src/components/pages/TransactionsPage.tsx#L337) | Select |  |  |
| [src/components/pages/TransactionsPage.tsx:353](../src/components/pages/TransactionsPage.tsx#L353) | Input | "From" | "date" |
| [src/components/pages/TransactionsPage.tsx:359](../src/components/pages/TransactionsPage.tsx#L359) | Input | "To" | "date" |
| [src/components/pages/TransactionsPage.tsx:438](../src/components/pages/TransactionsPage.tsx#L438) | input |  | "checkbox" |
| [src/components/pages/UdhariPage.tsx:702](../src/components/pages/UdhariPage.tsx#L702) | Field | "Account (cash in/out)" |  |
| [src/components/pages/UdhariPage.tsx:703](../src/components/pages/UdhariPage.tsx#L703) | Select |  |  |
| [src/components/pages/UdhariPage.tsx:716](../src/components/pages/UdhariPage.tsx#L716) | Field | "Amount to settle (₹)" |  |
| [src/components/pages/UdhariPage.tsx:717](../src/components/pages/UdhariPage.tsx#L717) | Input |  | "number"; max={remaining} |
| [src/components/pages/UdhariPage.tsx:784](../src/components/pages/UdhariPage.tsx#L784) | Field | "Expense category" |  |
| [src/components/pages/UdhariPage.tsx:785](../src/components/pages/UdhariPage.tsx#L785) | Select |  |  |
| [src/components/pages/UdhariPage.tsx:798](../src/components/pages/UdhariPage.tsx#L798) | Field | "Amount (₹)" |  |
| [src/components/pages/UdhariPage.tsx:799](../src/components/pages/UdhariPage.tsx#L799) | Input |  | "number"; max={remaining} |
| [src/components/pages/UdhariPage.tsx:806](../src/components/pages/UdhariPage.tsx#L806) | Field | "Reason" |  |
| [src/components/pages/UdhariPage.tsx:807](../src/components/pages/UdhariPage.tsx#L807) | Input | "e.g. unrecoverable, waived, refused" |  |
| [src/components/pages/UdhariPage.tsx:918](../src/components/pages/UdhariPage.tsx#L918) | Field | "Person" |  |
| [src/components/pages/UdhariPage.tsx:919](../src/components/pages/UdhariPage.tsx#L919) | Input |  |  |
| [src/components/pages/UdhariPage.tsx:924](../src/components/pages/UdhariPage.tsx#L924) | Field | "Phone" |  |
| [src/components/pages/UdhariPage.tsx:925](../src/components/pages/UdhariPage.tsx#L925) | Input | "+91 …" |  |
| [src/components/pages/UdhariPage.tsx:931](../src/components/pages/UdhariPage.tsx#L931) | Field | "Type" |  |
| [src/components/pages/UdhariPage.tsx:932](../src/components/pages/UdhariPage.tsx#L932) | Select |  |  |
| [src/components/pages/UdhariPage.tsx:945](../src/components/pages/UdhariPage.tsx#L945) | Field | "Amount (₹)" |  |
| [src/components/pages/UdhariPage.tsx:946](../src/components/pages/UdhariPage.tsx#L946) | Input |  | "number" |
| [src/components/pages/UdhariPage.tsx:952](../src/components/pages/UdhariPage.tsx#L952) | Field | "Context" |  |
| [src/components/pages/UdhariPage.tsx:953](../src/components/pages/UdhariPage.tsx#L953) | Select |  |  |
| [src/components/pages/UdhariPage.tsx:969](../src/components/pages/UdhariPage.tsx#L969) | Field | "Given date" |  |
| [src/components/pages/UdhariPage.tsx:970](../src/components/pages/UdhariPage.tsx#L970) | Input |  | "date" |
| [src/components/pages/UdhariPage.tsx:976](../src/components/pages/UdhariPage.tsx#L976) | Field | "Due date" |  |
| [src/components/pages/UdhariPage.tsx:977](../src/components/pages/UdhariPage.tsx#L977) | Input |  | "date" |
| [src/components/pages/UdhariPage.tsx:983](../src/components/pages/UdhariPage.tsx#L983) | Field | "Reminder" |  |
| [src/components/pages/UdhariPage.tsx:984](../src/components/pages/UdhariPage.tsx#L984) | Select |  |  |
| [src/components/pages/UdhariPage.tsx:999](../src/components/pages/UdhariPage.tsx#L999) | Field | "Notes" |  |
| [src/components/pages/UdhariPage.tsx:1000](../src/components/pages/UdhariPage.tsx#L1000) | Input | "Optional" |  |
| [src/components/pages/WealthHubPage.tsx:197](../src/components/pages/WealthHubPage.tsx#L197) | Field | "Name" |  |
| [src/components/pages/WealthHubPage.tsx:198](../src/components/pages/WealthHubPage.tsx#L198) | Input | "SBI FD 2026" |  |
| [src/components/pages/WealthHubPage.tsx:200](../src/components/pages/WealthHubPage.tsx#L200) | Field | "Type" |  |
| [src/components/pages/WealthHubPage.tsx:201](../src/components/pages/WealthHubPage.tsx#L201) | Select |  |  |
| [src/components/pages/WealthHubPage.tsx:209](../src/components/pages/WealthHubPage.tsx#L209) | Field | "Principal (₹)" |  |
| [src/components/pages/WealthHubPage.tsx:210](../src/components/pages/WealthHubPage.tsx#L210) | Input |  | "number"; min={0} |
| [src/components/pages/WealthHubPage.tsx:212](../src/components/pages/WealthHubPage.tsx#L212) | Field | "Annual rate %" |  |
| [src/components/pages/WealthHubPage.tsx:213](../src/components/pages/WealthHubPage.tsx#L213) | Input |  | "number" |
| [src/components/pages/WealthHubPage.tsx:215](../src/components/pages/WealthHubPage.tsx#L215) | Field | "Start date" |  |
| [src/components/pages/WealthHubPage.tsx:216](../src/components/pages/WealthHubPage.tsx#L216) | Input |  | "date" |
| [src/components/pages/WealthHubPage.tsx:218](../src/components/pages/WealthHubPage.tsx#L218) | Field | "Maturity date" |  |
| [src/components/pages/WealthHubPage.tsx:219](../src/components/pages/WealthHubPage.tsx#L219) | Input |  | "date" |
| [src/components/pages/WealthHubPage.tsx:244](../src/components/pages/WealthHubPage.tsx#L244) | Field | "Policy name" |  |
| [src/components/pages/WealthHubPage.tsx:245](../src/components/pages/WealthHubPage.tsx#L245) | Input |  |  |
| [src/components/pages/WealthHubPage.tsx:247](../src/components/pages/WealthHubPage.tsx#L247) | Field | "Insurer" |  |
| [src/components/pages/WealthHubPage.tsx:248](../src/components/pages/WealthHubPage.tsx#L248) | Input | "LIC / HDFC Life" |  |
| [src/components/pages/WealthHubPage.tsx:250](../src/components/pages/WealthHubPage.tsx#L250) | Field | "Premium (₹)" |  |
| [src/components/pages/WealthHubPage.tsx:251](../src/components/pages/WealthHubPage.tsx#L251) | Input |  | "number" |
| [src/components/pages/WealthHubPage.tsx:253](../src/components/pages/WealthHubPage.tsx#L253) | Field | "Coverage (₹)" |  |
| [src/components/pages/WealthHubPage.tsx:254](../src/components/pages/WealthHubPage.tsx#L254) | Input |  | "number" |
| [src/components/pages/WealthHubPage.tsx:256](../src/components/pages/WealthHubPage.tsx#L256) | Field | "Premium due day (1–28)" |  |
| [src/components/pages/WealthHubPage.tsx:257](../src/components/pages/WealthHubPage.tsx#L257) | Input |  | "number"; min={1}; max={28} |
| [src/components/pages/WealthHubPage.tsx:291](../src/components/pages/WealthHubPage.tsx#L291) | Field | "Label" |  |
| [src/components/pages/WealthHubPage.tsx:292](../src/components/pages/WealthHubPage.tsx#L292) | Input | "Gold jewellery" |  |
| [src/components/pages/WealthHubPage.tsx:294](../src/components/pages/WealthHubPage.tsx#L294) | Field | "Type" |  |
| [src/components/pages/WealthHubPage.tsx:295](../src/components/pages/WealthHubPage.tsx#L295) | Select |  |  |
| [src/components/pages/WealthHubPage.tsx:305](../src/components/pages/WealthHubPage.tsx#L305) | Field | "Value (₹)" |  |
| [src/components/pages/WealthHubPage.tsx:306](../src/components/pages/WealthHubPage.tsx#L306) | Input |  | "number" |
| [src/components/pages/admin/BrandingSettingsPage.tsx:131](../src/components/pages/admin/BrandingSettingsPage.tsx#L131) | Field | {f.label} |  |
| [src/components/pages/admin/BrandingSettingsPage.tsx:132](../src/components/pages/admin/BrandingSettingsPage.tsx#L132) | Input | {f.placeholder} | {f.type} |
| [src/components/pages/admin/BrandingSettingsPage.tsx:166](../src/components/pages/admin/BrandingSettingsPage.tsx#L166) | Field | {f.label} |  |
| [src/components/pages/admin/BrandingSettingsPage.tsx:167](../src/components/pages/admin/BrandingSettingsPage.tsx#L167) | Input | {f.placeholder} | {f.type} |
| [src/components/pages/admin/FeatureFlagsPage.tsx:155](../src/components/pages/admin/FeatureFlagsPage.tsx#L155) | Switch |  |  |
| [src/components/pages/admin/PlanManagementPage.tsx:139](../src/components/pages/admin/PlanManagementPage.tsx#L139) | Field | "Plan name" |  |
| [src/components/pages/admin/PlanManagementPage.tsx:140](../src/components/pages/admin/PlanManagementPage.tsx#L140) | Input | "e.g. Pro Monthly" |  |
| [src/components/pages/admin/PlanManagementPage.tsx:153](../src/components/pages/admin/PlanManagementPage.tsx#L153) | Field | "Plan code" |  |
| [src/components/pages/admin/PlanManagementPage.tsx:154](../src/components/pages/admin/PlanManagementPage.tsx#L154) | Input | "e.g. PRO_MONTHLY" |  |
| [src/components/pages/admin/PlanManagementPage.tsx:165](../src/components/pages/admin/PlanManagementPage.tsx#L165) | Field | "Price (₹ INR)" |  |
| [src/components/pages/admin/PlanManagementPage.tsx:166](../src/components/pages/admin/PlanManagementPage.tsx#L166) | Input | "299.00" | "number"; min="0" |
| [src/components/pages/admin/PlanManagementPage.tsx:175](../src/components/pages/admin/PlanManagementPage.tsx#L175) | Field | "Billing interval" |  |
| [src/components/pages/admin/PlanManagementPage.tsx:176](../src/components/pages/admin/PlanManagementPage.tsx#L176) | Select |  |  |
| [src/components/pages/admin/PlanManagementPage.tsx:191](../src/components/pages/admin/PlanManagementPage.tsx#L191) | Field | "Trial days" |  |
| [src/components/pages/admin/PlanManagementPage.tsx:192](../src/components/pages/admin/PlanManagementPage.tsx#L192) | Input |  | "number"; min="0"; max="90" |
| [src/components/pages/admin/PlanManagementPage.tsx:200](../src/components/pages/admin/PlanManagementPage.tsx#L200) | Field | "Description (optional)" |  |
| [src/components/pages/admin/PlanManagementPage.tsx:201](../src/components/pages/admin/PlanManagementPage.tsx#L201) | Input | "Short description for users" |  |
| [src/components/pages/admin/PlanManagementPage.tsx:208](../src/components/pages/admin/PlanManagementPage.tsx#L208) | Switch |  |  |
| [src/components/pages/admin/SubscriptionManagementPage.tsx:156](../src/components/pages/admin/SubscriptionManagementPage.tsx#L156) | Input | "Search by user or plan…" |  |
| [src/components/pages/admin/SubscriptionManagementPage.tsx:163](../src/components/pages/admin/SubscriptionManagementPage.tsx#L163) | Select |  |  |
| [src/components/pages/admin/UserManagementPage.tsx:186](../src/components/pages/admin/UserManagementPage.tsx#L186) | Input | "Search by name or username…" |  |
| [src/components/pages/admin/UserManagementPage.tsx:193](../src/components/pages/admin/UserManagementPage.tsx#L193) | Select |  |  |
| [src/components/pages/admin/UserManagementPage.tsx:203](../src/components/pages/admin/UserManagementPage.tsx#L203) | Select |  |  |
| [src/components/pages/admin/UserManagementPage.tsx:308](../src/components/pages/admin/UserManagementPage.tsx#L308) | Select |  |  |
| [src/components/pages/admin/UserManagementPage.tsx:347](../src/components/pages/admin/UserManagementPage.tsx#L347) | Field | "New PIN (4–8 digits, avoid 1234 / 0000)" |  |
| [src/components/pages/admin/UserManagementPage.tsx:348](../src/components/pages/admin/UserManagementPage.tsx#L348) | Input |  | "password" |
| [src/components/pages/admin/UserManagementPage.tsx:356](../src/components/pages/admin/UserManagementPage.tsx#L356) | Field | "Confirm PIN" |  |
| [src/components/pages/admin/UserManagementPage.tsx:357](../src/components/pages/admin/UserManagementPage.tsx#L357) | Input |  | "password" |
| [src/components/statements/StatementImportDialog.tsx:181](../src/components/statements/StatementImportDialog.tsx#L181) | select | "Statement bank" |  |
| [src/components/statements/StatementImportDialog.tsx:182](../src/components/statements/StatementImportDialog.tsx#L182) | select | "Statement account" |  |
| [src/components/statements/StatementImportDialog.tsx:187](../src/components/statements/StatementImportDialog.tsx#L187) | input | "Statement PDF" | "file" |
| [src/components/statements/StatementImportDialog.tsx:191](../src/components/statements/StatementImportDialog.tsx#L191) | select | "PDF extraction mode" |  |
| [src/components/statements/StatementImportDialog.tsx:193](../src/components/statements/StatementImportDialog.tsx#L193) | Input | "PDF password" | "password" |
| [src/components/statements/StatementImportDialog.tsx:211](../src/components/statements/StatementImportDialog.tsx#L211) | input |  | "checkbox" |
| [src/components/statements/StatementImportDialog.tsx:213](../src/components/statements/StatementImportDialog.tsx#L213) | Input | "Statement opening balance" |  |
| [src/components/statements/StatementImportDialog.tsx:214](../src/components/statements/StatementImportDialog.tsx#L214) | Input | "Statement closing balance" |  |
| [src/components/statements/StatementImportDialog.tsx:215](../src/components/statements/StatementImportDialog.tsx#L215) | input |  | "checkbox" |
| [src/components/statements/StatementImportDialog.tsx:219](../src/components/statements/StatementImportDialog.tsx#L219) | Input | "Search statement narration"; "Search narration" |  |
| [src/components/statements/StatementImportDialog.tsx:219](../src/components/statements/StatementImportDialog.tsx#L219) | select | "Statement month" |  |
| [src/components/statements/StatementImportDialog.tsx:219](../src/components/statements/StatementImportDialog.tsx#L219) | select | "Statement row filter" |  |
| [src/components/statements/StatementImportDialog.tsx:219](../src/components/statements/StatementImportDialog.tsx#L219) | select | "Scope for selected rows" |  |
| [src/components/statements/StatementImportDialog.tsx:227](../src/components/statements/StatementImportDialog.tsx#L227) | input | {'Include row ${row.id}'} | "checkbox" |
| [src/components/statements/StatementImportDialog.tsx:230](../src/components/statements/StatementImportDialog.tsx#L230) | select | {'Purpose row ${row.id}'} |  |
| [src/components/statements/StatementImportDialog.tsx:231](../src/components/statements/StatementImportDialog.tsx#L231) | select | {'Category row ${row.id}'} |  |
| [src/components/statements/StatementImportDialog.tsx:232](../src/components/statements/StatementImportDialog.tsx#L232) | select | {'Linked record row ${row.id}'} |  |
| [src/components/statements/StatementImportDialog.tsx:233](../src/components/statements/StatementImportDialog.tsx#L233) | select | {'Scope row ${row.id}'} |  |
| [src/components/statements/StatementImportDialog.tsx:234](../src/components/statements/StatementImportDialog.tsx#L234) | input | {'Reviewed row ${row.id}'} | "checkbox" |
| [src/components/ui/Input.tsx:6](../src/components/ui/Input.tsx#L6) | input |  | {type} |
| [src/components/ui/Input.tsx:27](../src/components/ui/Input.tsx#L27) | textarea |  |  |

## Named TypeScript Function Definitions

This is not call-graph or branch coverage. Anonymous callbacks are not counted as named functions.

| Source | Function |
|---|---|
| [src/App.tsx:21](../src/App.tsx#L21) | App |
| [src/App.tsx:38](../src/App.tsx#L38) | replay |
| [src/App.tsx:39](../src/App.tsx#L39) | isActive |
| [src/App.tsx:57](../src/App.tsx#L57) | onPopState |
| [src/components/auth/AdminAuth.tsx:13](../src/components/auth/AdminAuth.tsx#L13) | AdminAuth |
| [src/components/auth/AdminAuth.tsx:23](../src/components/auth/AdminAuth.tsx#L23) | submit |
| [src/components/auth/AuthShell.tsx:5](../src/components/auth/AuthShell.tsx#L5) | AuthShell |
| [src/components/auth/CloudAuth.tsx:15](../src/components/auth/CloudAuth.tsx#L15) | validatePin |
| [src/components/auth/CloudAuth.tsx:24](../src/components/auth/CloudAuth.tsx#L24) | CloudAuth |
| [src/components/auth/CloudAuth.tsx:58](../src/components/auth/CloudAuth.tsx#L58) | finishLogin |
| [src/components/auth/CloudAuth.tsx:74](../src/components/auth/CloudAuth.tsx#L74) | handleSignIn |
| [src/components/auth/CloudAuth.tsx:104](../src/components/auth/CloudAuth.tsx#L104) | handleRegister |
| [src/components/auth/LockScreen.tsx:10](../src/components/auth/LockScreen.tsx#L10) | LockScreen |
| [src/components/auth/LockScreen.tsx:19](../src/components/auth/LockScreen.tsx#L19) | submit |
| [src/components/auth/ProfileLogin.tsx:12](../src/components/auth/ProfileLogin.tsx#L12) | ProfileLogin |
| [src/components/auth/ProfileLogin.tsx:39](../src/components/auth/ProfileLogin.tsx#L39) | submit |
| [src/components/auth/RequiredPinChange.tsx:7](../src/components/auth/RequiredPinChange.tsx#L7) | RequiredPinChange |
| [src/components/categories/CategoryCleanupPanel.tsx:19](../src/components/categories/CategoryCleanupPanel.tsx#L19) | CategoryCleanupPanel |
| [src/components/categories/CategoryCleanupPanel.tsx:40](../src/components/categories/CategoryCleanupPanel.tsx#L40) | mergeCategories |
| [src/components/charts/SafeChart.tsx:4](../src/components/charts/SafeChart.tsx#L4) | SafeChart |
| [src/components/explain/ExplainMetricDrawer.tsx:16](../src/components/explain/ExplainMetricDrawer.tsx#L16) | ExplainMetricTrigger |
| [src/components/finance/CardEmiSimulatorDialog.tsx:17](../src/components/finance/CardEmiSimulatorDialog.tsx#L17) | CardEmiSimulatorDialog |
| [src/components/finance/DataConfidenceBadge.tsx:30](../src/components/finance/DataConfidenceBadge.tsx#L30) | DataConfidenceBadge |
| [src/components/finance/PaydayCashflowPanel.tsx:6](../src/components/finance/PaydayCashflowPanel.tsx#L6) | PaydayCashflowPanel |
| [src/components/forms/QuickAddDialog.tsx:24](../src/components/forms/QuickAddDialog.tsx#L24) | QuickAddDialog |
| [src/components/forms/QuickAddDialog.tsx:34](../src/components/forms/QuickAddDialog.tsx#L34) | reset |
| [src/components/forms/QuickAddDialog.tsx:41](../src/components/forms/QuickAddDialog.tsx#L41) | handleClose |
| [src/components/forms/TransactionForm.tsx:40](../src/components/forms/TransactionForm.tsx#L40) | nowDateInput |
| [src/components/forms/TransactionForm.tsx:44](../src/components/forms/TransactionForm.tsx#L44) | TransactionForm |
| [src/components/forms/TransactionForm.tsx:120](../src/components/forms/TransactionForm.tsx#L120) | openish |
| [src/components/forms/TransactionForm.tsx:195](../src/components/forms/TransactionForm.tsx#L195) | submit |
| [src/components/forms/TransactionForm.tsx:254](../src/components/forms/TransactionForm.tsx#L254) | fieldError |
| [src/components/layout/AdminAppShell.tsx:56](../src/components/layout/AdminAppShell.tsx#L56) | AdminAppShell |
| [src/components/layout/AdminAppShell.tsx:69](../src/components/layout/AdminAppShell.tsx#L69) | scrollToTop |
| [src/components/layout/AlertsDrawer.tsx:12](../src/components/layout/AlertsDrawer.tsx#L12) | AlertsDrawer |
| [src/components/layout/AlertsDrawer.tsx:23](../src/components/layout/AlertsDrawer.tsx#L23) | dismiss |
| [src/components/layout/AlertsDrawer.tsx:28](../src/components/layout/AlertsDrawer.tsx#L28) | restore |
| [src/components/layout/AlertsDrawer.tsx:33](../src/components/layout/AlertsDrawer.tsx#L33) | removeAlert |
| [src/components/layout/AlertsDrawer.tsx:37](../src/components/layout/AlertsDrawer.tsx#L37) | dismissAll |
| [src/components/layout/AppShell.tsx:79](../src/components/layout/AppShell.tsx#L79) | AppShell |
| [src/components/layout/AppShell.tsx:93](../src/components/layout/AppShell.tsx#L93) | onKey |
| [src/components/layout/AppShell.tsx:110](../src/components/layout/AppShell.tsx#L110) | scrollToTop |
| [src/components/layout/CommandPalette.tsx:61](../src/components/layout/CommandPalette.tsx#L61) | CommandPalette |
| [src/components/layout/Header.tsx:21](../src/components/layout/Header.tsx#L21) | Header |
| [src/components/layout/PageHeader.tsx:3](../src/components/layout/PageHeader.tsx#L3) | PageHeader |
| [src/components/layout/Sidebar.tsx:73](../src/components/layout/Sidebar.tsx#L73) | Sidebar |
| [src/components/layout/Sidebar.tsx:181](../src/components/layout/Sidebar.tsx#L181) | MobileNav |
| [src/components/layout/SyncOutboxBadge.tsx:21](../src/components/layout/SyncOutboxBadge.tsx#L21) | SyncOutboxBadge |
| [src/components/layout/SyncOutboxBadge.tsx:40](../src/components/layout/SyncOutboxBadge.tsx#L40) | run |
| [src/components/layout/SyncOutboxBadge.tsx:47](../src/components/layout/SyncOutboxBadge.tsx#L47) | download |
| [src/components/layout/ThemeSwitch.tsx:13](../src/components/layout/ThemeSwitch.tsx#L13) | ThemeSwitch |
| [src/components/pages/AccountsPage.tsx:37](../src/components/pages/AccountsPage.tsx#L37) | AccountsPage |
| [src/components/pages/AccountsPage.tsx:58](../src/components/pages/AccountsPage.tsx#L58) | handleDelete |
| [src/components/pages/AccountsPage.tsx:213](../src/components/pages/AccountsPage.tsx#L213) | AccountForm |
| [src/components/pages/AccountsPage.tsx:250](../src/components/pages/AccountsPage.tsx#L250) | submit |
| [src/components/pages/AlertsPage.tsx:24](../src/components/pages/AlertsPage.tsx#L24) | AlertsPage |
| [src/components/pages/AlertsPage.tsx:41](../src/components/pages/AlertsPage.tsx#L41) | dismiss |
| [src/components/pages/AlertsPage.tsx:45](../src/components/pages/AlertsPage.tsx#L45) | restore |
| [src/components/pages/AlertsPage.tsx:49](../src/components/pages/AlertsPage.tsx#L49) | hardDelete |
| [src/components/pages/AlertsPage.tsx:54](../src/components/pages/AlertsPage.tsx#L54) | rerun |
| [src/components/pages/AlertsPage.tsx:66](../src/components/pages/AlertsPage.tsx#L66) | dismissAll |
| [src/components/pages/AlertsPage.tsx:212](../src/components/pages/AlertsPage.tsx#L212) | StatCard |
| [src/components/pages/AlertsPage.tsx:239](../src/components/pages/AlertsPage.tsx#L239) | sevScore |
| [src/components/pages/AlertsPage.tsx:242](../src/components/pages/AlertsPage.tsx#L242) | sevVariant |
| [src/components/pages/AlertsPage.tsx:251](../src/components/pages/AlertsPage.tsx#L251) | sevBg |
| [src/components/pages/AuditPage.tsx:46](../src/components/pages/AuditPage.tsx#L46) | AuditPage |
| [src/components/pages/AuditPage.tsx:75](../src/components/pages/AuditPage.tsx#L75) | exportLogs |
| [src/components/pages/BillCalendarPage.tsx:15](../src/components/pages/BillCalendarPage.tsx#L15) | BillCalendarPage |
| [src/components/pages/BudgetsPage.tsx:39](../src/components/pages/BudgetsPage.tsx#L39) | BudgetsPage |
| [src/components/pages/BudgetsPage.tsx:79](../src/components/pages/BudgetsPage.tsx#L79) | handleDelete |
| [src/components/pages/BudgetsPage.tsx:298](../src/components/pages/BudgetsPage.tsx#L298) | BudgetForm |
| [src/components/pages/BudgetsPage.tsx:348](../src/components/pages/BudgetsPage.tsx#L348) | submit |
| [src/components/pages/CardsPage.tsx:45](../src/components/pages/CardsPage.tsx#L45) | CardsPage |
| [src/components/pages/CardsPage.tsx:90](../src/components/pages/CardsPage.tsx#L90) | applyRepairLinkCard |
| [src/components/pages/CardsPage.tsx:112](../src/components/pages/CardsPage.tsx#L112) | applyRepairConvertUpi |
| [src/components/pages/CardsPage.tsx:138](../src/components/pages/CardsPage.tsx#L138) | applyRepairMarkLegacy |
| [src/components/pages/CardsPage.tsx:163](../src/components/pages/CardsPage.tsx#L163) | handleDelete |
| [src/components/pages/CardsPage.tsx:768](../src/components/pages/CardsPage.tsx#L768) | CardForm |
| [src/components/pages/CardsPage.tsx:818](../src/components/pages/CardsPage.tsx#L818) | submit |
| [src/components/pages/CategoriesPage.tsx:44](../src/components/pages/CategoriesPage.tsx#L44) | CategoriesPage |
| [src/components/pages/CategoriesPage.tsx:62](../src/components/pages/CategoriesPage.tsx#L62) | usageCount |
| [src/components/pages/CategoriesPage.tsx:66](../src/components/pages/CategoriesPage.tsx#L66) | handleArchive |
| [src/components/pages/CategoriesPage.tsx:79](../src/components/pages/CategoriesPage.tsx#L79) | handleDelete |
| [src/components/pages/CategoriesPage.tsx:258](../src/components/pages/CategoriesPage.tsx#L258) | CategoryForm |
| [src/components/pages/CategoriesPage.tsx:321](../src/components/pages/CategoriesPage.tsx#L321) | submit |
| [src/components/pages/DashboardPage.tsx:93](../src/components/pages/DashboardPage.tsx#L93) | DashboardPage |
| [src/components/pages/DashboardPage.tsx:388](../src/components/pages/DashboardPage.tsx#L388) | drillCategorySpend |
| [src/components/pages/DashboardPage.tsx:1240](../src/components/pages/DashboardPage.tsx#L1240) | KpiCard |
| [src/components/pages/DashboardPage.tsx:1303](../src/components/pages/DashboardPage.tsx#L1303) | DueRow |
| [src/components/pages/DashboardPage.tsx:1349](../src/components/pages/DashboardPage.tsx#L1349) | HealthCard |
| [src/components/pages/DashboardPage.tsx:1419](../src/components/pages/DashboardPage.tsx#L1419) | BudgetList |
| [src/components/pages/ExpensesPage.tsx:3](../src/components/pages/ExpensesPage.tsx#L3) | ExpensesPage |
| [src/components/pages/ExportPage.tsx:50](../src/components/pages/ExportPage.tsx#L50) | ExportPage |
| [src/components/pages/ExportPage.tsx:71](../src/components/pages/ExportPage.tsx#L71) | logExport |
| [src/components/pages/ExportPage.tsx:86](../src/components/pages/ExportPage.tsx#L86) | caExport |
| [src/components/pages/ExportPage.tsx:114](../src/components/pages/ExportPage.tsx#L114) | filterTx |
| [src/components/pages/ExportPage.tsx:127](../src/components/pages/ExportPage.tsx#L127) | quickExport |
| [src/components/pages/ExportPage.tsx:163](../src/components/pages/ExportPage.tsx#L163) | requestFullBackup |
| [src/components/pages/ExportPage.tsx:169](../src/components/pages/ExportPage.tsx#L169) | confirmFullBackup |
| [src/components/pages/ExportPage.tsx:509](../src/components/pages/ExportPage.tsx#L509) | ExportCard |
| [src/components/pages/GoalsPage.tsx:50](../src/components/pages/GoalsPage.tsx#L50) | GoalsPage |
| [src/components/pages/GoalsPage.tsx:63](../src/components/pages/GoalsPage.tsx#L63) | handleDelete |
| [src/components/pages/GoalsPage.tsx:85](../src/components/pages/GoalsPage.tsx#L85) | contribute |
| [src/components/pages/GoalsPage.tsx:279](../src/components/pages/GoalsPage.tsx#L279) | ContributeDialog |
| [src/components/pages/GoalsPage.tsx:323](../src/components/pages/GoalsPage.tsx#L323) | GoalForm |
| [src/components/pages/GoalsPage.tsx:377](../src/components/pages/GoalsPage.tsx#L377) | submit |
| [src/components/pages/HouseholdDashboardPage.tsx:18](../src/components/pages/HouseholdDashboardPage.tsx#L18) | HouseholdDashboardPage |
| [src/components/pages/HouseholdDashboardPage.tsx:36](../src/components/pages/HouseholdDashboardPage.tsx#L36) | reload |
| [src/components/pages/HouseholdDashboardPage.tsx:50](../src/components/pages/HouseholdDashboardPage.tsx#L50) | createHousehold |
| [src/components/pages/HouseholdDashboardPage.tsx:76](../src/components/pages/HouseholdDashboardPage.tsx#L76) | addMember |
| [src/components/pages/ImportPage.tsx:88](../src/components/pages/ImportPage.tsx#L88) | ImportPage |
| [src/components/pages/ImportPage.tsx:142](../src/components/pages/ImportPage.tsx#L142) | handleFile |
| [src/components/pages/ImportPage.tsx:164](../src/components/pages/ImportPage.tsx#L164) | validRowCount |
| [src/components/pages/ImportPage.tsx:176](../src/components/pages/ImportPage.tsx#L176) | performImport |
| [src/components/pages/ImportPage.tsx:346](../src/components/pages/ImportPage.tsx#L346) | rollbackLastImport |
| [src/components/pages/ImportPage.tsx:380](../src/components/pages/ImportPage.tsx#L380) | downloadTemplate |
| [src/components/pages/ImportPage.tsx:402](../src/components/pages/ImportPage.tsx#L402) | handleRestoreFile |
| [src/components/pages/ImportPage.tsx:408](../src/components/pages/ImportPage.tsx#L408) | confirmRestore |
| [src/components/pages/ImportPage.tsx:432](../src/components/pages/ImportPage.tsx#L432) | bulk |
| [src/components/pages/ImportPage.tsx:835](../src/components/pages/ImportPage.tsx#L835) | RepairQueueGrid |
| [src/components/pages/ImportPage.tsx:889](../src/components/pages/ImportPage.tsx#L889) | truthy |
| [src/components/pages/ImportPage.tsx:895](../src/components/pages/ImportPage.tsx#L895) | normalizeType |
| [src/components/pages/ImportPage.tsx:916](../src/components/pages/ImportPage.tsx#L916) | normalizeDate |
| [src/components/pages/ImportPage.tsx:932](../src/components/pages/ImportPage.tsx#L932) | normalizePaymentMode |
| [src/components/pages/ImportPage.tsx:946](../src/components/pages/ImportPage.tsx#L946) | stableSignature |
| [src/components/pages/ImportPage.tsx:956](../src/components/pages/ImportPage.tsx#L956) | sortForSignature |
| [src/components/pages/IncomePage.tsx:3](../src/components/pages/IncomePage.tsx#L3) | IncomePage |
| [src/components/pages/InvestmentsPage.tsx:43](../src/components/pages/InvestmentsPage.tsx#L43) | InvestmentsPage |
| [src/components/pages/InvestmentsPage.tsx:76](../src/components/pages/InvestmentsPage.tsx#L76) | handleDelete |
| [src/components/pages/InvestmentsPage.tsx:98](../src/components/pages/InvestmentsPage.tsx#L98) | contribute |
| [src/components/pages/InvestmentsPage.tsx:326](../src/components/pages/InvestmentsPage.tsx#L326) | ContribDialog |
| [src/components/pages/InvestmentsPage.tsx:362](../src/components/pages/InvestmentsPage.tsx#L362) | InvestmentForm |
| [src/components/pages/InvestmentsPage.tsx:406](../src/components/pages/InvestmentsPage.tsx#L406) | submit |
| [src/components/pages/LoansPage.tsx:67](../src/components/pages/LoansPage.tsx#L67) | LoansPage |
| [src/components/pages/LoansPage.tsx:146](../src/components/pages/LoansPage.tsx#L146) | handleCloseLoan |
| [src/components/pages/LoansPage.tsx:161](../src/components/pages/LoansPage.tsx#L161) | handleDelete |
| [src/components/pages/LoansPage.tsx:533](../src/components/pages/LoansPage.tsx#L533) | AmortDialog |
| [src/components/pages/LoansPage.tsx:615](../src/components/pages/LoansPage.tsx#L615) | LoanForm |
| [src/components/pages/LoansPage.tsx:703](../src/components/pages/LoansPage.tsx#L703) | submit |
| [src/components/pages/ProfilePage.tsx:20](../src/components/pages/ProfilePage.tsx#L20) | validatePin |
| [src/components/pages/ProfilePage.tsx:29](../src/components/pages/ProfilePage.tsx#L29) | ProfilePage |
| [src/components/pages/ProfilePage.tsx:62](../src/components/pages/ProfilePage.tsx#L62) | saveProfile |
| [src/components/pages/ProfilePage.tsx:76](../src/components/pages/ProfilePage.tsx#L76) | savePin |
| [src/components/pages/ProfilePage.tsx:107](../src/components/pages/ProfilePage.tsx#L107) | saveSecurityRecovery |
| [src/components/pages/ProfilePage.tsx:123](../src/components/pages/ProfilePage.tsx#L123) | recoverPin |
| [src/components/pages/ProfilePage.tsx:386](../src/components/pages/ProfilePage.tsx#L386) | InfoRow |
| [src/components/pages/ReconciliationPage.tsx:12](../src/components/pages/ReconciliationPage.tsx#L12) | ReconciliationPage |
| [src/components/pages/ReportsPage.tsx:65](../src/components/pages/ReportsPage.tsx#L65) | ReportsPage |
| [src/components/pages/ReportsPage.tsx:944](../src/components/pages/ReportsPage.tsx#L944) | KpiRow |
| [src/components/pages/ReportsPage.tsx:974](../src/components/pages/ReportsPage.tsx#L974) | SplitBar |
| [src/components/pages/ReportsPage.tsx:1010](../src/components/pages/ReportsPage.tsx#L1010) | RatioCard |
| [src/components/pages/SettingsPage.tsx:51](../src/components/pages/SettingsPage.tsx#L51) | SettingsPage |
| [src/components/pages/SettingsPage.tsx:75](../src/components/pages/SettingsPage.tsx#L75) | save |
| [src/components/pages/SettingsPage.tsx:118](../src/components/pages/SettingsPage.tsx#L118) | defaultSettingsPayload |
| [src/components/pages/SettingsPage.tsx:138](../src/components/pages/SettingsPage.tsx#L138) | resetDemo |
| [src/components/pages/SettingsPage.tsx:147](../src/components/pages/SettingsPage.tsx#L147) | wipeAll |
| [src/components/pages/SubscriptionPage.tsx:14](../src/components/pages/SubscriptionPage.tsx#L14) | SubscriptionPage |
| [src/components/pages/SubscriptionPage.tsx:25](../src/components/pages/SubscriptionPage.tsx#L25) | ensureRazorpayScript |
| [src/components/pages/SubscriptionPage.tsx:36](../src/components/pages/SubscriptionPage.tsx#L36) | buyPlan |
| [src/components/pages/SuggestionsPage.tsx:66](../src/components/pages/SuggestionsPage.tsx#L66) | severityOrder |
| [src/components/pages/SuggestionsPage.tsx:79](../src/components/pages/SuggestionsPage.tsx#L79) | activeSuggestion |
| [src/components/pages/SuggestionsPage.tsx:88](../src/components/pages/SuggestionsPage.tsx#L88) | historySuggestion |
| [src/components/pages/SuggestionsPage.tsx:100](../src/components/pages/SuggestionsPage.tsx#L100) | bucketForActive |
| [src/components/pages/SuggestionsPage.tsx:118](../src/components/pages/SuggestionsPage.tsx#L118) | typeBadge |
| [src/components/pages/SuggestionsPage.tsx:122](../src/components/pages/SuggestionsPage.tsx#L122) | SuggestionsPage |
| [src/components/pages/SuggestionsPage.tsx:248](../src/components/pages/SuggestionsPage.tsx#L248) | patchStatus |
| [src/components/pages/SuggestionsPage.tsx:258](../src/components/pages/SuggestionsPage.tsx#L258) | markViewed |
| [src/components/pages/SuggestionsPage.tsx:266](../src/components/pages/SuggestionsPage.tsx#L266) | runAi |
| [src/components/pages/SuggestionsPage.tsx:379](../src/components/pages/SuggestionsPage.tsx#L379) | PersonaCoachPanel |
| [src/components/pages/SuggestionsPage.tsx:457](../src/components/pages/SuggestionsPage.tsx#L457) | CoachMiniCard |
| [src/components/pages/SuggestionsPage.tsx:487](../src/components/pages/SuggestionsPage.tsx#L487) | SuggestionCard |
| [src/components/pages/TransactionsPage.tsx:50](../src/components/pages/TransactionsPage.tsx#L50) | TransactionsPage |
| [src/components/pages/TransactionsPage.tsx:153](../src/components/pages/TransactionsPage.tsx#L153) | handleDelete |
| [src/components/pages/TransactionsPage.tsx:167](../src/components/pages/TransactionsPage.tsx#L167) | handleDuplicate |
| [src/components/pages/TransactionsPage.tsx:188](../src/components/pages/TransactionsPage.tsx#L188) | bulkDelete |
| [src/components/pages/TransactionsPage.tsx:206](../src/components/pages/TransactionsPage.tsx#L206) | resetFilters |
| [src/components/pages/UdhariPage.tsx:54](../src/components/pages/UdhariPage.tsx#L54) | ageingShort |
| [src/components/pages/UdhariPage.tsx:75](../src/components/pages/UdhariPage.tsx#L75) | UdhariPage |
| [src/components/pages/UdhariPage.tsx:137](../src/components/pages/UdhariPage.tsx#L137) | handleDelete |
| [src/components/pages/UdhariPage.tsx:159](../src/components/pages/UdhariPage.tsx#L159) | settle |
| [src/components/pages/UdhariPage.tsx:213](../src/components/pages/UdhariPage.tsx#L213) | recordWriteOff |
| [src/components/pages/UdhariPage.tsx:668](../src/components/pages/UdhariPage.tsx#L668) | SettleDialog |
| [src/components/pages/UdhariPage.tsx:752](../src/components/pages/UdhariPage.tsx#L752) | WriteOffDialog |
| [src/components/pages/UdhariPage.tsx:829](../src/components/pages/UdhariPage.tsx#L829) | UdhariForm |
| [src/components/pages/UdhariPage.tsx:875](../src/components/pages/UdhariPage.tsx#L875) | submit |
| [src/components/pages/WealthHubPage.tsx:28](../src/components/pages/WealthHubPage.tsx#L28) | localToday |
| [src/components/pages/WealthHubPage.tsx:36](../src/components/pages/WealthHubPage.tsx#L36) | WealthHubPage |
| [src/components/pages/WealthHubPage.tsx:58](../src/components/pages/WealthHubPage.tsx#L58) | reload |
| [src/components/pages/WealthHubPage.tsx:78](../src/components/pages/WealthHubPage.tsx#L78) | addFd |
| [src/components/pages/WealthHubPage.tsx:113](../src/components/pages/WealthHubPage.tsx#L113) | addInsurance |
| [src/components/pages/WealthHubPage.tsx:145](../src/components/pages/WealthHubPage.tsx#L145) | addValuation |
| [src/components/pages/admin/AdminDashboardPage.tsx:19](../src/components/pages/admin/AdminDashboardPage.tsx#L19) | AdminDashboardPage |
| [src/components/pages/admin/AdminDashboardPage.tsx:24](../src/components/pages/admin/AdminDashboardPage.tsx#L24) | load |
| [src/components/pages/admin/BrandingSettingsPage.tsx:38](../src/components/pages/admin/BrandingSettingsPage.tsx#L38) | BrandingSettingsPage |
| [src/components/pages/admin/BrandingSettingsPage.tsx:46](../src/components/pages/admin/BrandingSettingsPage.tsx#L46) | load |
| [src/components/pages/admin/BrandingSettingsPage.tsx:68](../src/components/pages/admin/BrandingSettingsPage.tsx#L68) | handleSave |
| [src/components/pages/admin/FeatureFlagsPage.tsx:26](../src/components/pages/admin/FeatureFlagsPage.tsx#L26) | flagMeta |
| [src/components/pages/admin/FeatureFlagsPage.tsx:33](../src/components/pages/admin/FeatureFlagsPage.tsx#L33) | FeatureFlagsPage |
| [src/components/pages/admin/FeatureFlagsPage.tsx:41](../src/components/pages/admin/FeatureFlagsPage.tsx#L41) | load |
| [src/components/pages/admin/FeatureFlagsPage.tsx:56](../src/components/pages/admin/FeatureFlagsPage.tsx#L56) | handleSave |
| [src/components/pages/admin/PlanManagementPage.tsx:40](../src/components/pages/admin/PlanManagementPage.tsx#L40) | PlanManagementPage |
| [src/components/pages/admin/PlanManagementPage.tsx:49](../src/components/pages/admin/PlanManagementPage.tsx#L49) | load |
| [src/components/pages/admin/PlanManagementPage.tsx:64](../src/components/pages/admin/PlanManagementPage.tsx#L64) | autoCode |
| [src/components/pages/admin/PlanManagementPage.tsx:71](../src/components/pages/admin/PlanManagementPage.tsx#L71) | handleSubmit |
| [src/components/pages/admin/SubscriptionManagementPage.tsx:46](../src/components/pages/admin/SubscriptionManagementPage.tsx#L46) | StatusBadge |
| [src/components/pages/admin/SubscriptionManagementPage.tsx:56](../src/components/pages/admin/SubscriptionManagementPage.tsx#L56) | fmt |
| [src/components/pages/admin/SubscriptionManagementPage.tsx:61](../src/components/pages/admin/SubscriptionManagementPage.tsx#L61) | SubscriptionManagementPage |
| [src/components/pages/admin/SubscriptionManagementPage.tsx:69](../src/components/pages/admin/SubscriptionManagementPage.tsx#L69) | load |
| [src/components/pages/admin/SubscriptionManagementPage.tsx:84](../src/components/pages/admin/SubscriptionManagementPage.tsx#L84) | mutateSubscription |
| [src/components/pages/admin/UserManagementPage.tsx:48](../src/components/pages/admin/UserManagementPage.tsx#L48) | UserManagementPage |
| [src/components/pages/admin/UserManagementPage.tsx:63](../src/components/pages/admin/UserManagementPage.tsx#L63) | loadData |
| [src/components/pages/admin/UserManagementPage.tsx:95](../src/components/pages/admin/UserManagementPage.tsx#L95) | handleToggle |
| [src/components/pages/admin/UserManagementPage.tsx:108](../src/components/pages/admin/UserManagementPage.tsx#L108) | handleAssignPlan |
| [src/components/pages/admin/UserManagementPage.tsx:122](../src/components/pages/admin/UserManagementPage.tsx#L122) | handleResetPin |
| [src/components/providers/AppProviders.tsx:7](../src/components/providers/AppProviders.tsx#L7) | AppProviders |
| [src/components/statements/StatementImportDialog.tsx:19](../src/components/statements/StatementImportDialog.tsx#L19) | money |
| [src/components/statements/StatementImportDialog.tsx:24](../src/components/statements/StatementImportDialog.tsx#L24) | SourcePage |
| [src/components/statements/StatementImportDialog.tsx:54](../src/components/statements/StatementImportDialog.tsx#L54) | StatementImportDialog |
| [src/components/statements/StatementImportDialog.tsx:115](../src/components/statements/StatementImportDialog.tsx#L115) | close |
| [src/components/statements/StatementImportDialog.tsx:120](../src/components/statements/StatementImportDialog.tsx#L120) | reset |
| [src/components/statements/StatementImportDialog.tsx:126](../src/components/statements/StatementImportDialog.tsx#L126) | changeDecision |
| [src/components/statements/StatementImportDialog.tsx:129](../src/components/statements/StatementImportDialog.tsx#L129) | analyze |
| [src/components/statements/StatementImportDialog.tsx:149](../src/components/statements/StatementImportDialog.tsx#L149) | downloadReview |
| [src/components/statements/StatementImportDialog.tsx:153](../src/components/statements/StatementImportDialog.tsx#L153) | save |
| [src/components/theme/ThemeProvider.tsx:16](../src/components/theme/ThemeProvider.tsx#L16) | getSystemPref |
| [src/components/theme/ThemeProvider.tsx:21](../src/components/theme/ThemeProvider.tsx#L21) | applyHtmlClass |
| [src/components/theme/ThemeProvider.tsx:28](../src/components/theme/ThemeProvider.tsx#L28) | ThemeProvider |
| [src/components/theme/ThemeProvider.tsx:43](../src/components/theme/ThemeProvider.tsx#L43) | handler |
| [src/components/theme/ThemeProvider.tsx:71](../src/components/theme/ThemeProvider.tsx#L71) | useTheme |
| [src/components/ui/Badge.tsx:40](../src/components/ui/Badge.tsx#L40) | Badge |
| [src/components/ui/ConfirmDialog.tsx:13](../src/components/ui/ConfirmDialog.tsx#L13) | ConfirmHost |
| [src/components/ui/Dialog.tsx:66](../src/components/ui/Dialog.tsx#L66) | DialogHeader |
| [src/components/ui/Dialog.tsx:78](../src/components/ui/Dialog.tsx#L78) | DialogFooter |
| [src/components/ui/Label.tsx:20](../src/components/ui/Label.tsx#L20) | Field |
| [src/components/ui/Progress.tsx:4](../src/components/ui/Progress.tsx#L4) | Progress |
| [src/components/ui/Sheet.tsx:89](../src/components/ui/Sheet.tsx#L89) | SheetHeader |
| [src/components/ui/Sheet.tsx:92](../src/components/ui/Sheet.tsx#L92) | SheetFooter |
| [src/components/ui/Table.tsx:83](../src/components/ui/Table.tsx#L83) | EmptyState |
| [src/components/ui/Toast.tsx:6](../src/components/ui/Toast.tsx#L6) | ToastHost |
| [src/config/syncContracts.ts:65](../src/config/syncContracts.ts#L65) | contract |
| [src/db/database.ts:271](../src/db/database.ts#L271) | getDB |
| [src/db/database.ts:282](../src/db/database.ts#L282) | isDBReady |
| [src/exports/xlsxExporter.ts:47](../src/exports/xlsxExporter.ts#L47) | mapTransactionRow |
| [src/exports/xlsxExporter.ts:87](../src/exports/xlsxExporter.ts#L87) | autoWidth |
| [src/exports/xlsxExporter.ts:99](../src/exports/xlsxExporter.ts#L99) | addSheet |
| [src/exports/xlsxExporter.ts:125](../src/exports/xlsxExporter.ts#L125) | buildCAWorkbook |
| [src/exports/xlsxExporter.ts:449](../src/exports/xlsxExporter.ts#L449) | downloadBuffer |
| [src/exports/xlsxExporter.ts:465](../src/exports/xlsxExporter.ts#L465) | exportModuleToSheet |
| [src/i18n/useMessages.ts:3](../src/i18n/useMessages.ts#L3) | useMessages |
| [src/lib/apiClient.ts:13](../src/lib/apiClient.ts#L13) | isRetryableApiError |
| [src/lib/apiClient.ts:18](../src/lib/apiClient.ts#L18) | getBaseUrl |
| [src/lib/apiClient.ts:27](../src/lib/apiClient.ts#L27) | getCloudToken |
| [src/lib/apiClient.ts:32](../src/lib/apiClient.ts#L32) | setCloudToken |
| [src/lib/apiClient.ts:44](../src/lib/apiClient.ts#L44) | clearCloudToken |
| [src/lib/apiClient.ts:49](../src/lib/apiClient.ts#L49) | setCsrfToken |
| [src/lib/apiClient.ts:59](../src/lib/apiClient.ts#L59) | readCsrfCookie |
| [src/lib/apiClient.ts:65](../src/lib/apiClient.ts#L65) | readCsrfToken |
| [src/lib/apiClient.ts:79](../src/lib/apiClient.ts#L79) | maybeCaptureCsrfFromData |
| [src/lib/apiClient.ts:86](../src/lib/apiClient.ts#L86) | apiRequest |
| [src/lib/cloud/auth.ts:15](../src/lib/cloud/auth.ts#L15) | assertCloudAuthConfigured |
| [src/lib/cloud/auth.ts:21](../src/lib/cloud/auth.ts#L21) | createPinSalt |
| [src/lib/cloud/auth.ts:25](../src/lib/cloud/auth.ts#L25) | hashSecret |
| [src/lib/cloud/auth.ts:29](../src/lib/cloud/auth.ts#L29) | verifySecret |
| [src/lib/cloud/auth.ts:33](../src/lib/cloud/auth.ts#L33) | signCloudToken |
| [src/lib/cloud/auth.ts:38](../src/lib/cloud/auth.ts#L38) | verifyCloudToken |
| [src/lib/cloud/auth.ts:47](../src/lib/cloud/auth.ts#L47) | getBearerToken |
| [src/lib/cloud/client.ts:5](../src/lib/cloud/client.ts#L5) | cloudRegister |
| [src/lib/cloud/client.ts:20](../src/lib/cloud/client.ts#L20) | cloudLogin |
| [src/lib/cloud/client.ts:30](../src/lib/cloud/client.ts#L30) | fetchPolicyVersions |
| [src/lib/cloud/client.ts:37](../src/lib/cloud/client.ts#L37) | acceptPolicies |
| [src/lib/cloud/client.ts:45](../src/lib/cloud/client.ts#L45) | cloudAdminLogin |
| [src/lib/cloud/client.ts:55](../src/lib/cloud/client.ts#L55) | cloudMe |
| [src/lib/cloud/client.ts:77](../src/lib/cloud/client.ts#L77) | cloudLogout |
| [src/lib/cloud/client.ts:90](../src/lib/cloud/client.ts#L90) | cloudSyncPush |
| [src/lib/cloud/client.ts:104](../src/lib/cloud/client.ts#L104) | cloudSyncPull |
| [src/lib/cloud/client.ts:121](../src/lib/cloud/client.ts#L121) | buildCloudCollectionsFromDataStore |
| [src/lib/cloud/collections.ts:7](../src/lib/cloud/collections.ts#L7) | isCloudCollectionKey |
| [src/lib/cloud/http.ts:4](../src/lib/cloud/http.ts#L4) | jsonError |
| [src/lib/cloud/http.ts:8](../src/lib/cloud/http.ts#L8) | jsonOk |
| [src/lib/cloud/http.ts:12](../src/lib/cloud/http.ts#L12) | requireCloudUser |
| [src/lib/cloud/repoClient.ts:5](../src/lib/cloud/repoClient.ts#L5) | canUseCloudRepo |
| [src/lib/cloud/repoClient.ts:9](../src/lib/cloud/repoClient.ts#L9) | pull |
| [src/lib/cloud/repoClient.ts:13](../src/lib/cloud/repoClient.ts#L13) | push |
| [src/lib/cloud/repoClient.ts:17](../src/lib/cloud/repoClient.ts#L17) | cloudRepoCreate |
| [src/lib/cloud/repoClient.ts:33](../src/lib/cloud/repoClient.ts#L33) | cloudRepoGet |
| [src/lib/cloud/repoClient.ts:41](../src/lib/cloud/repoClient.ts#L41) | cloudRepoList |
| [src/lib/cloud/repoClient.ts:52](../src/lib/cloud/repoClient.ts#L52) | cloudRepoUpdate |
| [src/lib/cloud/repoClient.ts:70](../src/lib/cloud/repoClient.ts#L70) | cloudRepoUpdateMany |
| [src/lib/cloud/repoClient.ts:90](../src/lib/cloud/repoClient.ts#L90) | cloudRepoSoftDelete |
| [src/lib/cloud/repoClient.ts:98](../src/lib/cloud/repoClient.ts#L98) | cloudRepoHardDelete |
| [src/lib/cloud/repoClient.ts:108](../src/lib/cloud/repoClient.ts#L108) | cloudRepoHardDeleteAll |
| [src/lib/cloud/repoClient.ts:115](../src/lib/cloud/repoClient.ts#L115) | cloudRepoSoftDeleteMany |
| [src/lib/cloud/saasClient.ts:3](../src/lib/cloud/saasClient.ts#L3) | getCloudToken |
| [src/lib/cloud/saasClient.ts:7](../src/lib/cloud/saasClient.ts#L7) | fetchPublicConfig |
| [src/lib/cloud/saasClient.ts:13](../src/lib/cloud/saasClient.ts#L13) | fetchViewer |
| [src/lib/cloud/saasClient.ts:20](../src/lib/cloud/saasClient.ts#L20) | fetchPlans |
| [src/lib/cloud/saasClient.ts:24](../src/lib/cloud/saasClient.ts#L24) | createSubscriptionOrder |
| [src/lib/cloud/saasClient.ts:41](../src/lib/cloud/saasClient.ts#L41) | getMySubscription |
| [src/lib/cloud/saasClient.ts:48](../src/lib/cloud/saasClient.ts#L48) | confirmSubscriptionPayment |
| [src/lib/cloud/saasClient.ts:60](../src/lib/cloud/saasClient.ts#L60) | getAdminDashboard |
| [src/lib/cloud/saasClient.ts:64](../src/lib/cloud/saasClient.ts#L64) | getAdminUsers |
| [src/lib/cloud/saasClient.ts:68](../src/lib/cloud/saasClient.ts#L68) | getAdminPlans |
| [src/lib/cloud/saasClient.ts:72](../src/lib/cloud/saasClient.ts#L72) | saveAdminPlan |
| [src/lib/cloud/saasClient.ts:80](../src/lib/cloud/saasClient.ts#L80) | getAdminFeatureFlags |
| [src/lib/cloud/saasClient.ts:84](../src/lib/cloud/saasClient.ts#L84) | saveAdminFeatureFlags |
| [src/lib/cloud/saasClient.ts:92](../src/lib/cloud/saasClient.ts#L92) | getAdminSettings |
| [src/lib/cloud/saasClient.ts:96](../src/lib/cloud/saasClient.ts#L96) | saveAdminSettings |
| [src/lib/cloud/saasClient.ts:104](../src/lib/cloud/saasClient.ts#L104) | getAdminSubscriptions |
| [src/lib/cloud/saasClient.ts:108](../src/lib/cloud/saasClient.ts#L108) | adminSubscriptionAction |
| [src/lib/cloud/saasClient.ts:121](../src/lib/cloud/saasClient.ts#L121) | assignUserPlan |
| [src/lib/cloud/saasClient.ts:129](../src/lib/cloud/saasClient.ts#L129) | toggleUserActive |
| [src/lib/cloud/saasClient.ts:138](../src/lib/cloud/saasClient.ts#L138) | adminResetUserPin |
| [src/lib/crypto.ts:5](../src/lib/crypto.ts#L5) | bufToHex |
| [src/lib/crypto.ts:14](../src/lib/crypto.ts#L14) | randomHex |
| [src/lib/crypto.ts:26](../src/lib/crypto.ts#L26) | generateSalt |
| [src/lib/crypto.ts:30](../src/lib/crypto.ts#L30) | hashPin |
| [src/lib/crypto.ts:43](../src/lib/crypto.ts#L43) | verifyPin |
| [src/lib/format.ts:6](../src/lib/format.ts#L6) | formatINR |
| [src/lib/format.ts:26](../src/lib/format.ts#L26) | formatINRCompact |
| [src/lib/format.ts:36](../src/lib/format.ts#L36) | formatNumberIN |
| [src/lib/format.ts:44](../src/lib/format.ts#L44) | formatPercent |
| [src/lib/format.ts:49](../src/lib/format.ts#L49) | formatDate |
| [src/lib/format.ts:59](../src/lib/format.ts#L59) | formatDateShort |
| [src/lib/format.ts:63](../src/lib/format.ts#L63) | formatDateLong |
| [src/lib/format.ts:67](../src/lib/format.ts#L67) | formatMonthYear |
| [src/lib/format.ts:71](../src/lib/format.ts#L71) | formatRelativeDue |
| [src/lib/format.ts:90](../src/lib/format.ts#L90) | localDateToIso |
| [src/lib/format.ts:98](../src/lib/format.ts#L98) | isoToLocalDate |
| [src/lib/format.ts:105](../src/lib/format.ts#L105) | formatPaymentMode |
| [src/lib/format.ts:120](../src/lib/format.ts#L120) | formatTxType |
| [src/lib/migrateLegacyKeys.ts:12](../src/lib/migrateLegacyKeys.ts#L12) | migrateLegacyLocalStorageKeys |
| [src/lib/navRoutes.ts:44](../src/lib/navRoutes.ts#L44) | navToPath |
| [src/lib/navRoutes.ts:48](../src/lib/navRoutes.ts#L48) | pathToNav |
| [src/lib/utils.ts:4](../src/lib/utils.ts#L4) | cn |
| [src/lib/utils.ts:8](../src/lib/utils.ts#L8) | uid |
| [src/lib/utils.ts:10](../src/lib/utils.ts#L10) | rand |
| [src/lib/utils.ts:15](../src/lib/utils.ts#L15) | nowIso |
| [src/lib/utils.ts:19](../src/lib/utils.ts#L19) | sleep |
| [src/lib/utils.ts:23](../src/lib/utils.ts#L23) | clamp |
| [src/lib/utils.ts:27](../src/lib/utils.ts#L27) | safeNumber |
| [src/lib/utils.ts:32](../src/lib/utils.ts#L32) | range |
| [src/lib/utils.ts:40](../src/lib/utils.ts#L40) | groupBy |
| [src/lib/utils.ts:53](../src/lib/utils.ts#L53) | sumBy |
| [src/lib/utils.ts:59](../src/lib/utils.ts#L59) | percent |
| [src/lib/utils.ts:64](../src/lib/utils.ts#L64) | isBrowser |
| [src/repositories/baseRepo.ts:19](../src/repositories/baseRepo.ts#L19) | canRemote |
| [src/repositories/baseRepo.ts:23](../src/repositories/baseRepo.ts#L23) | create |
| [src/repositories/baseRepo.ts:37](../src/repositories/baseRepo.ts#L37) | createMany |
| [src/repositories/baseRepo.ts:48](../src/repositories/baseRepo.ts#L48) | get |
| [src/repositories/baseRepo.ts:77](../src/repositories/baseRepo.ts#L77) | list |
| [src/repositories/baseRepo.ts:91](../src/repositories/baseRepo.ts#L91) | listIncludingDeleted |
| [src/repositories/baseRepo.ts:95](../src/repositories/baseRepo.ts#L95) | update |
| [src/repositories/baseRepo.ts:114](../src/repositories/baseRepo.ts#L114) | updateMany |
| [src/repositories/baseRepo.ts:123](../src/repositories/baseRepo.ts#L123) | softDelete |
| [src/repositories/baseRepo.ts:127](../src/repositories/baseRepo.ts#L127) | softDeleteMany |
| [src/repositories/baseRepo.ts:131](../src/repositories/baseRepo.ts#L131) | restore |
| [src/repositories/baseRepo.ts:135](../src/repositories/baseRepo.ts#L135) | hardDelete |
| [src/repositories/baseRepo.ts:148](../src/repositories/baseRepo.ts#L148) | hardDeleteAllForUser |
| [src/repositories/baseRepo.ts:158](../src/repositories/baseRepo.ts#L158) | count |
| [src/services/__tests__/acceptanceMatrix.test.ts:13](../src/services/__tests__/acceptanceMatrix.test.ts#L13) | cat |
| [src/services/__tests__/acceptanceMatrix.test.ts:35](../src/services/__tests__/acceptanceMatrix.test.ts#L35) | tx |
| [src/services/__tests__/acceptanceMatrix.test.ts:62](../src/services/__tests__/acceptanceMatrix.test.ts#L62) | netCash |
| [src/services/__tests__/accountBalanceEngine.test.ts:9](../src/services/__tests__/accountBalanceEngine.test.ts#L9) | tx |
| [src/services/__tests__/businessPersonalSplit.test.ts:5](../src/services/__tests__/businessPersonalSplit.test.ts#L5) | t |
| [src/services/__tests__/calculations.characterization.test.ts:32](../src/services/__tests__/calculations.characterization.test.ts#L32) | tx |
| [src/services/__tests__/cardEmiLifecycle.t126.test.ts:20](../src/services/__tests__/cardEmiLifecycle.t126.test.ts#L20) | baseTx |
| [src/services/__tests__/cardEmiLifecycle.t126.test.ts:74](../src/services/__tests__/cardEmiLifecycle.t126.test.ts#L74) | sumComponent |
| [src/services/__tests__/cardEngine.test.ts:14](../src/services/__tests__/cardEngine.test.ts#L14) | card |
| [src/services/__tests__/cardEngine.test.ts:35](../src/services/__tests__/cardEngine.test.ts#L35) | eff |
| [src/services/__tests__/cardRefundLifecycle.fullMatrix.test.ts:30](../src/services/__tests__/cardRefundLifecycle.fullMatrix.test.ts#L30) | base |
| [src/services/__tests__/cardRefundLifecycle.fullMatrix.test.ts:59](../src/services/__tests__/cardRefundLifecycle.fullMatrix.test.ts#L59) | views |
| [src/services/__tests__/cashflowSurvivalEngine.test.ts:27](../src/services/__tests__/cashflowSurvivalEngine.test.ts#L27) | recurringRule |
| [src/services/__tests__/debtQa.test.ts:8](../src/services/__tests__/debtQa.test.ts#L8) | creditCard |
| [src/services/__tests__/debtQa.test.ts:31](../src/services/__tests__/debtQa.test.ts#L31) | loan |
| [src/services/__tests__/debtQa.test.ts:58](../src/services/__tests__/debtQa.test.ts#L58) | effect |
| [src/services/__tests__/emergencyFundEngine.test.ts:15](../src/services/__tests__/emergencyFundEngine.test.ts#L15) | expense |
| [src/services/__tests__/eventReversal.golden.test.ts:13](../src/services/__tests__/eventReversal.golden.test.ts#L13) | ctx |
| [src/services/__tests__/eventReversal.golden.test.ts:15](../src/services/__tests__/eventReversal.golden.test.ts#L15) | tx |
| [src/services/__tests__/financeInvariants.test.ts:8](../src/services/__tests__/financeInvariants.test.ts#L8) | cat |
| [src/services/__tests__/financeInvariants.test.ts:30](../src/services/__tests__/financeInvariants.test.ts#L30) | tx |
| [src/services/__tests__/financeKpiEngine.test.ts:12](../src/services/__tests__/financeKpiEngine.test.ts#L12) | cat |
| [src/services/__tests__/financeKpiEngine.test.ts:34](../src/services/__tests__/financeKpiEngine.test.ts#L34) | tx |
| [src/services/__tests__/financeSequenceFuzz.test.ts:12](../src/services/__tests__/financeSequenceFuzz.test.ts#L12) | mulberry32 |
| [src/services/__tests__/financeSequenceFuzz.test.ts:21](../src/services/__tests__/financeSequenceFuzz.test.ts#L21) | mk |
| [src/services/__tests__/fourCardIsolation.fcr005.test.ts:9](../src/services/__tests__/fourCardIsolation.fcr005.test.ts#L9) | tx |
| [src/services/__tests__/fourCardIsolation.fcr005.test.ts:53](../src/services/__tests__/fourCardIsolation.fcr005.test.ts#L53) | outstanding |
| [src/services/__tests__/goalEngine.test.ts:15](../src/services/__tests__/goalEngine.test.ts#L15) | goal |
| [src/services/__tests__/ledger.scenarios.test.ts:23](../src/services/__tests__/ledger.scenarios.test.ts#L23) | cat |
| [src/services/__tests__/ledger.scenarios.test.ts:40](../src/services/__tests__/ledger.scenarios.test.ts#L40) | tx |
| [src/services/__tests__/ledger.scenarios.test.ts:62](../src/services/__tests__/ledger.scenarios.test.ts#L62) | ctx |
| [src/services/__tests__/ledger.scenarios.test.ts:65](../src/services/__tests__/ledger.scenarios.test.ts#L65) | has |
| [src/services/__tests__/loanEngine.test.ts:17](../src/services/__tests__/loanEngine.test.ts#L17) | baseLoan |
| [src/services/__tests__/obligationEngine.test.ts:9](../src/services/__tests__/obligationEngine.test.ts#L9) | rule |
| [src/services/__tests__/personaEngine.test.ts:12](../src/services/__tests__/personaEngine.test.ts#L12) | t |
| [src/services/__tests__/personaEngine.test.ts:35](../src/services/__tests__/personaEngine.test.ts#L35) | suggestion |
| [src/services/__tests__/transactionFormRules.test.ts:5](../src/services/__tests__/transactionFormRules.test.ts#L5) | base |
| [src/services/__tests__/transactionPreview.test.ts:20](../src/services/__tests__/transactionPreview.test.ts#L20) | account |
| [src/services/__tests__/transactionPreview.test.ts:35](../src/services/__tests__/transactionPreview.test.ts#L35) | category |
| [src/services/__tests__/transactionPreview.test.ts:53](../src/services/__tests__/transactionPreview.test.ts#L53) | card |
| [src/services/__tests__/transactionPreview.test.ts:69](../src/services/__tests__/transactionPreview.test.ts#L69) | loan |
| [src/services/__tests__/transactionPreview.test.ts:91](../src/services/__tests__/transactionPreview.test.ts#L91) | emi |
| [src/services/__tests__/transactionPreview.test.ts:111](../src/services/__tests__/transactionPreview.test.ts#L111) | goal |
| [src/services/__tests__/transactionPreview.test.ts:131](../src/services/__tests__/transactionPreview.test.ts#L131) | udhari |
| [src/services/__tests__/transactionPreview.test.ts:149](../src/services/__tests__/transactionPreview.test.ts#L149) | baseState |
| [src/services/__tests__/transactionPreview.test.ts:175](../src/services/__tests__/transactionPreview.test.ts#L175) | ctx |
| [src/services/__tests__/transactionPreview.test.ts:189](../src/services/__tests__/transactionPreview.test.ts#L189) | lines |
| [src/services/__tests__/transferReceivedMoney.test.ts:8](../src/services/__tests__/transferReceivedMoney.test.ts#L8) | cat |
| [src/services/__tests__/transferReceivedMoney.test.ts:30](../src/services/__tests__/transferReceivedMoney.test.ts#L30) | tx |
| [src/services/__tests__/udhariEngine.test.ts:14](../src/services/__tests__/udhariEngine.test.ts#L14) | rec |
| [src/services/accountBalanceEngine.ts:9](../src/services/accountBalanceEngine.ts#L9) | isCashInflow |
| [src/services/accountBalanceEngine.ts:15](../src/services/accountBalanceEngine.ts#L15) | isCashOutflow |
| [src/services/accountBalanceEngine.ts:48](../src/services/accountBalanceEngine.ts#L48) | emptyBreakdown |
| [src/services/accountBalanceEngine.ts:73](../src/services/accountBalanceEngine.ts#L73) | computeAccountCashClosingPaise |
| [src/services/accountBalanceEngine.ts:85](../src/services/accountBalanceEngine.ts#L85) | computeAccountBalanceBreakdown |
| [src/services/adaptiveModeEngine.ts:19](../src/services/adaptiveModeEngine.ts#L19) | recommendAdaptiveMode |
| [src/services/adaptiveModeEngine.ts:58](../src/services/adaptiveModeEngine.ts#L58) | calculateFreeCashUntilIncome |
| [src/services/alertPriority.ts:6](../src/services/alertPriority.ts#L6) | alertPriorityFromSeverity |
| [src/services/alertsEngine.ts:28](../src/services/alertsEngine.ts#L28) | recurringRuleAmountPaise |
| [src/services/alertsEngine.ts:34](../src/services/alertsEngine.ts#L34) | runAlertEngine |
| [src/services/alertsEngine.ts:494](../src/services/alertsEngine.ts#L494) | sameMonth |
| [src/services/authService.ts:16](../src/services/authService.ts#L16) | getLocalSession |
| [src/services/authService.ts:27](../src/services/authService.ts#L27) | setLocalSession |
| [src/services/authService.ts:37](../src/services/authService.ts#L37) | getLastUserId |
| [src/services/authService.ts:42](../src/services/authService.ts#L42) | listProfiles |
| [src/services/authService.ts:66](../src/services/authService.ts#L66) | loginProfile |
| [src/services/authService.ts:96](../src/services/authService.ts#L96) | logoutProfile |
| [src/services/authService.ts:109](../src/services/authService.ts#L109) | lockSession |
| [src/services/authService.ts:126](../src/services/authService.ts#L126) | unlockSession |
| [src/services/authService.ts:150](../src/services/authService.ts#L150) | changePin |
| [src/services/authService.ts:162](../src/services/authService.ts#L162) | setSecurityAnswer |
| [src/services/authService.ts:179](../src/services/authService.ts#L179) | resetPinWithSecurityAnswer |
| [src/services/authService.ts:194](../src/services/authService.ts#L194) | updateUserProfile |
| [src/services/businessPersonalSplit.ts:33](../src/services/businessPersonalSplit.ts#L33) | splitTransaction |
| [src/services/businessPersonalSplit.ts:79](../src/services/businessPersonalSplit.ts#L79) | sumSplit |
| [src/services/businessPersonalSplit.ts:91](../src/services/businessPersonalSplit.ts#L91) | sumExpenseSplit |
| [src/services/caReports.ts:55](../src/services/caReports.ts#L55) | isLive |
| [src/services/caReports.ts:57](../src/services/caReports.ts#L57) | cardDisplayName |
| [src/services/caReports.ts:100](../src/services/caReports.ts#L100) | reportTransactionMaster |
| [src/services/caReports.ts:172](../src/services/caReports.ts#L172) | reportMonthlyCashflow |
| [src/services/caReports.ts:205](../src/services/caReports.ts#L205) | reportCategoryLedger |
| [src/services/caReports.ts:235](../src/services/caReports.ts#L235) | reportAccountLedger |
| [src/services/caReports.ts:265](../src/services/caReports.ts#L265) | reportCardLedger |
| [src/services/caReports.ts:293](../src/services/caReports.ts#L293) | reportInterestPaid |
| [src/services/caReports.ts:331](../src/services/caReports.ts#L331) | reportUdhariAgeing |
| [src/services/caReports.ts:354](../src/services/caReports.ts#L354) | reportBusinessExpense |
| [src/services/caReports.ts:365](../src/services/caReports.ts#L365) | reportPersonalExpense |
| [src/services/caReports.ts:379](../src/services/caReports.ts#L379) | reportTaxFlag |
| [src/services/caReports.ts:393](../src/services/caReports.ts#L393) | reportGstMissingBill |
| [src/services/caReports.ts:419](../src/services/caReports.ts#L419) | reportLoanAmortization |
| [src/services/caReports.ts:443](../src/services/caReports.ts#L443) | reportNetWorth |
| [src/services/caReports.ts:479](../src/services/caReports.ts#L479) | reportDebtSummary |
| [src/services/caReports.ts:511](../src/services/caReports.ts#L511) | reportReceivablePayableSummary |
| [src/services/caReports.ts:536](../src/services/caReports.ts#L536) | reportFinancingCostPaise |
| [src/services/caReports.ts:564](../src/services/caReports.ts#L564) | reportAccountReconciliation |
| [src/services/caReports.ts:634](../src/services/caReports.ts#L634) | maskUserId |
| [src/services/caReports.ts:639](../src/services/caReports.ts#L639) | buildReportFooter |
| [src/services/caReports.ts:659](../src/services/caReports.ts#L659) | buildCAReportBundle |
| [src/services/calculations.ts:60](../src/services/calculations.ts#L60) | sumBy |
| [src/services/calculations.ts:66](../src/services/calculations.ts#L66) | percent |
| [src/services/calculations.ts:71](../src/services/calculations.ts#L71) | clamp |
| [src/services/calculations.ts:87](../src/services/calculations.ts#L87) | isIncomeTx |
| [src/services/calculations.ts:90](../src/services/calculations.ts#L90) | isExpenseTx |
| [src/services/calculations.ts:93](../src/services/calculations.ts#L93) | isCashOutflow |
| [src/services/calculations.ts:105](../src/services/calculations.ts#L105) | isCashInflow |
| [src/services/calculations.ts:111](../src/services/calculations.ts#L111) | sumIncome |
| [src/services/calculations.ts:115](../src/services/calculations.ts#L115) | sumExpense |
| [src/services/calculations.ts:119](../src/services/calculations.ts#L119) | expenseAmountPaise |
| [src/services/calculations.ts:125](../src/services/calculations.ts#L125) | expenseReportTransactions |
| [src/services/calculations.ts:134](../src/services/calculations.ts#L134) | sumByType |
| [src/services/calculations.ts:141](../src/services/calculations.ts#L141) | filterByMonth |
| [src/services/calculations.ts:152](../src/services/calculations.ts#L152) | filterByDateRange |
| [src/services/calculations.ts:163](../src/services/calculations.ts#L163) | netMonthlySavings |
| [src/services/calculations.ts:172](../src/services/calculations.ts#L172) | savingsRate |
| [src/services/calculations.ts:177](../src/services/calculations.ts#L177) | budgetUsagePercent |
| [src/services/calculations.ts:181](../src/services/calculations.ts#L181) | projectMonthEndSpend |
| [src/services/calculations.ts:200](../src/services/calculations.ts#L200) | computeGoalProgress |
| [src/services/calculations.ts:236](../src/services/calculations.ts#L236) | amortizationSchedule |
| [src/services/calculations.ts:258](../src/services/calculations.ts#L258) | summarizeLoan |
| [src/services/calculations.ts:320](../src/services/calculations.ts#L320) | summarizeCardHealth |
| [src/services/calculations.ts:362](../src/services/calculations.ts#L362) | totalUdhariReceivable |
| [src/services/calculations.ts:368](../src/services/calculations.ts#L368) | totalUdhariPayable |
| [src/services/calculations.ts:376](../src/services/calculations.ts#L376) | projectedCorpus |
| [src/services/calculations.ts:388](../src/services/calculations.ts#L388) | emergencyMonthsCoverage |
| [src/services/calculations.ts:419](../src/services/calculations.ts#L419) | computeFinancialHealth |
| [src/services/calculations.ts:462](../src/services/calculations.ts#L462) | deriveAccountBalance |
| [src/services/calculations.ts:470](../src/services/calculations.ts#L470) | deriveAccountBalanceFromAccount |
| [src/services/calculations.ts:487](../src/services/calculations.ts#L487) | monthlyTrend |
| [src/services/calculations.ts:517](../src/services/calculations.ts#L517) | categoryBreakdown |
| [src/services/calculations.ts:557](../src/services/calculations.ts#L557) | budgetStatuses |
| [src/services/calculations.ts:610](../src/services/calculations.ts#L610) | totalInvested |
| [src/services/cardEmiEngine.ts:11](../src/services/cardEmiEngine.ts#L11) | localDateKey |
| [src/services/cardEmiEngine.ts:39](../src/services/cardEmiEngine.ts#L39) | buildCardEmiSchedule |
| [src/services/cardEmiEngine.ts:90](../src/services/cardEmiEngine.ts#L90) | scheduleToInstallmentEntities |
| [src/services/cardEmiEngine.ts:117](../src/services/cardEmiEngine.ts#L117) | totalPrincipalInSchedule |
| [src/services/cardEmiEngine.ts:121](../src/services/cardEmiEngine.ts#L121) | createCardEmiPlanFromPurchase |
| [src/services/cardEmiEngine.ts:168](../src/services/cardEmiEngine.ts#L168) | calculateNetFinancingCostPaise |
| [src/services/cardEmiEngine.ts:196](../src/services/cardEmiEngine.ts#L196) | estimateCardEmiForeclosurePaise |
| [src/services/cardEmiEngine.ts:220](../src/services/cardEmiEngine.ts#L220) | compareCardEmiTenures |
| [src/services/cardEngine.ts:20](../src/services/cardEngine.ts#L20) | filterCardLiabilityEffects |
| [src/services/cardEngine.ts:35](../src/services/cardEngine.ts#L35) | calculateCardNetLiability |
| [src/services/cardEngine.ts:49](../src/services/cardEngine.ts#L49) | calculateCardOutstanding |
| [src/services/cardEngine.ts:54](../src/services/cardEngine.ts#L54) | calculateCardCreditBalance |
| [src/services/cardEngine.ts:64](../src/services/cardEngine.ts#L64) | calculateCardOutstandingFromTransactions |
| [src/services/cardEngine.ts:83](../src/services/cardEngine.ts#L83) | resolveCardOutstandingPaise |
| [src/services/cardEngine.ts:102](../src/services/cardEngine.ts#L102) | calculateAvailableLimit |
| [src/services/cardEngine.ts:111](../src/services/cardEngine.ts#L111) | calculateSharedLimitAvailablePaise |
| [src/services/cardEngine.ts:120](../src/services/cardEngine.ts#L120) | calculateUtilization |
| [src/services/cardEngine.ts:126](../src/services/cardEngine.ts#L126) | lastStatementDateForCard |
| [src/services/cardEngine.ts:135](../src/services/cardEngine.ts#L135) | calculateStatementWindow |
| [src/services/cardEngine.ts:143](../src/services/cardEngine.ts#L143) | calculateNextDueDate |
| [src/services/cardEngine.ts:158](../src/services/cardEngine.ts#L158) | calculateMinimumDue |
| [src/services/cardEngine.ts:165](../src/services/cardEngine.ts#L165) | calculateCardRisk |
| [src/services/cardEngine.ts:198](../src/services/cardEngine.ts#L198) | formatShort |
| [src/services/cardEngine.ts:202](../src/services/cardEngine.ts#L202) | buildCreditCardIntel |
| [src/services/cardEngine.ts:298](../src/services/cardEngine.ts#L298) | calculatePaymentToReachUtilization |
| [src/services/cardEngine.ts:310](../src/services/cardEngine.ts#L310) | findOrphanCreditCardExpenses |
| [src/services/cardEngine.ts:334](../src/services/cardEngine.ts#L334) | buildCardRepairQueue |
| [src/services/cardPaymentAllocator.ts:14](../src/services/cardPaymentAllocator.ts#L14) | allocatePaymentsToStatement |
| [src/services/cardStatementEngine.ts:14](../src/services/cardStatementEngine.ts#L14) | buildOpenCardStatement |
| [src/services/cardStatementEngine.ts:60](../src/services/cardStatementEngine.ts#L60) | remainingDuePaise |
| [src/services/cardStatementEngine.ts:64](../src/services/cardStatementEngine.ts#L64) | nextStatementCloseDate |
| [src/services/cashflowSurvivalEngine.ts:51](../src/services/cashflowSurvivalEngine.ts#L51) | spendableAccountTypes |
| [src/services/cashflowSurvivalEngine.ts:66](../src/services/cashflowSurvivalEngine.ts#L66) | nextIncomeFromRecurring |
| [src/services/cashflowSurvivalEngine.ts:84](../src/services/cashflowSurvivalEngine.ts#L84) | buildCashflowSurvivalReport |
| [src/services/cashflowSurvivalEngine.ts:206](../src/services/cashflowSurvivalEngine.ts#L206) | fmt |
| [src/services/categoryColorEngine.ts:80](../src/services/categoryColorEngine.ts#L80) | moduleColor |
| [src/services/categoryColorEngine.ts:84](../src/services/categoryColorEngine.ts#L84) | expensePalette |
| [src/services/categoryColorEngine.ts:88](../src/services/categoryColorEngine.ts#L88) | incomePalette |
| [src/services/categoryColorEngine.ts:92](../src/services/categoryColorEngine.ts#L92) | normHex |
| [src/services/categoryColorEngine.ts:97](../src/services/categoryColorEngine.ts#L97) | activeCategoriesForColoring |
| [src/services/categoryColorEngine.ts:105](../src/services/categoryColorEngine.ts#L105) | expenseBreakdownWithDistinctChartColors |
| [src/services/categoryColorEngine.ts:147](../src/services/categoryColorEngine.ts#L147) | attachCategoryIcons |
| [src/services/categoryColorEngine.ts:159](../src/services/categoryColorEngine.ts#L159) | hideDeletedCategorySlices |
| [src/services/categoryColorEngine.ts:168](../src/services/categoryColorEngine.ts#L168) | usedColorsForAppliesTo |
| [src/services/categoryColorEngine.ts:180](../src/services/categoryColorEngine.ts#L180) | suggestNextCategoryColor |
| [src/services/categoryColorEngine.ts:202](../src/services/categoryColorEngine.ts#L202) | findDuplicateCategoryColors |
| [src/services/categoryColorEngine.ts:229](../src/services/categoryColorEngine.ts#L229) | findDuplicateCategoryNames |
| [src/services/defaultsService.ts:8](../src/services/defaultsService.ts#L8) | seedDefaultCategories |
| [src/services/defaultsService.ts:55](../src/services/defaultsService.ts#L55) | seedDefaultAccounts |
| [src/services/demoData.ts:23](../src/services/demoData.ts#L23) | iso |
| [src/services/demoData.ts:27](../src/services/demoData.ts#L27) | seedDemoData |
| [src/services/demoData.ts:38](../src/services/demoData.ts#L38) | catByName |
| [src/services/durableOutbox.ts:29](../src/services/durableOutbox.ts#L29) | mutationTable |
| [src/services/durableOutbox.ts:33](../src/services/durableOutbox.ts#L33) | pendingMutations |
| [src/services/durableOutbox.ts:39](../src/services/durableOutbox.ts#L39) | preserveLegacyPending |
| [src/services/durableOutbox.ts:59](../src/services/durableOutbox.ts#L59) | enqueueMutation |
| [src/services/durableOutbox.ts:79](../src/services/durableOutbox.ts#L79) | replayMutations |
| [src/services/durableOutbox.ts:83](../src/services/durableOutbox.ts#L83) | drain |
| [src/services/durableOutbox.ts:127](../src/services/durableOutbox.ts#L127) | commitMutation |
| [src/services/durableOutbox.ts:136](../src/services/durableOutbox.ts#L136) | mergeRemoteList |
| [src/services/durableOutbox.ts:162](../src/services/durableOutbox.ts#L162) | requireEmptyOutbox |
| [src/services/durableOutbox.ts:167](../src/services/durableOutbox.ts#L167) | useServerVersion |
| [src/services/emergencyFundEngine.ts:40](../src/services/emergencyFundEngine.ts#L40) | isEssentialCategoryName |
| [src/services/emergencyFundEngine.ts:45](../src/services/emergencyFundEngine.ts#L45) | essentialCategoryIds |
| [src/services/emergencyFundEngine.ts:56](../src/services/emergencyFundEngine.ts#L56) | averageMonthlyEssentialPaise |
| [src/services/emergencyFundEngine.ts:94](../src/services/emergencyFundEngine.ts#L94) | buildEmergencyFundIntel |
| [src/services/expenseContributions.ts:4](../src/services/expenseContributions.ts#L4) | isExpenseContribution |
| [src/services/expenseContributions.ts:7](../src/services/expenseContributions.ts#L7) | expenseRecovery |
| [src/services/expenseContributions.ts:18](../src/services/expenseContributions.ts#L18) | contributionError |
| [src/services/exportSafety.ts:22](../src/services/exportSafety.ts#L22) | ownRows |
| [src/services/exportSafety.ts:45](../src/services/exportSafety.ts#L45) | buildUserOwnedFullExportPayload |
| [src/services/financeEventBuilder.ts:38](../src/services/financeEventBuilder.ts#L38) | txDateKey |
| [src/services/financeEventBuilder.ts:48](../src/services/financeEventBuilder.ts#L48) | eff |
| [src/services/financeEventBuilder.ts:70](../src/services/financeEventBuilder.ts#L70) | expenseEventType |
| [src/services/financeEventBuilder.ts:74](../src/services/financeEventBuilder.ts#L74) | buildFinanceEventBuilderContext |
| [src/services/financeEventBuilder.ts:87](../src/services/financeEventBuilder.ts#L87) | buildLedgerForTransaction |
| [src/services/financeEventBuilder.ts:101](../src/services/financeEventBuilder.ts#L101) | baseEvent |
| [src/services/financeEventBuilder.ts:122](../src/services/financeEventBuilder.ts#L122) | pushEx |
| [src/services/financeEventBuilder.ts:645](../src/services/financeEventBuilder.ts#L645) | buildFullLedger |
| [src/services/financeKpiEngine.ts:43](../src/services/financeKpiEngine.ts#L43) | calculateFinanceMonthKpis |
| [src/services/financeKpiEngine.ts:78](../src/services/financeKpiEngine.ts#L78) | explainFinanceMonthKpis |
| [src/services/financeKpiEngine.ts:101](../src/services/financeKpiEngine.ts#L101) | operatingSurplusRate |
| [src/services/financeKpiEngine.ts:107](../src/services/financeKpiEngine.ts#L107) | calculateConsolidatedNetWorthPaise |
| [src/services/financeLedgerExplain.ts:9](../src/services/financeLedgerExplain.ts#L9) | inMonth |
| [src/services/financeLedgerExplain.ts:24](../src/services/financeLedgerExplain.ts#L24) | explainCategorySpend |
| [src/services/financeLedgerExplain.ts:71](../src/services/financeLedgerExplain.ts#L71) | explainCashflowMonth |
| [src/services/financeLedgerExplain.ts:103](../src/services/financeLedgerExplain.ts#L103) | explainTransactionLedgerCoverage |
| [src/services/financeLedgerExplain.ts:113](../src/services/financeLedgerExplain.ts#L113) | sumExcludedExpenseTransactionsPaise |
| [src/services/financialChecksum.ts:23](../src/services/financialChecksum.ts#L23) | buildFinancialChecksum |
| [src/services/financialChecksum.ts:79](../src/services/financialChecksum.ts#L79) | checksumsEqual |
| [src/services/financialChecksum.ts:84](../src/services/financialChecksum.ts#L84) | sumActiveTransactionPaise |
| [src/services/goalEngine.ts:13](../src/services/goalEngine.ts#L13) | goalPriorityTier |
| [src/services/goalEngine.ts:38](../src/services/goalEngine.ts#L38) | buildGoalIntel |
| [src/services/goalEngine.ts:92](../src/services/goalEngine.ts#L92) | summarizeGoalsAtRisk |
| [src/services/importExportRepair.ts:107](../src/services/importExportRepair.ts#L107) | normalizeImportType |
| [src/services/importExportRepair.ts:134](../src/services/importExportRepair.ts#L134) | normalizeImportDate |
| [src/services/importExportRepair.ts:154](../src/services/importExportRepair.ts#L154) | normalizeImportPaymentMode |
| [src/services/importExportRepair.ts:170](../src/services/importExportRepair.ts#L170) | truthy |
| [src/services/importExportRepair.ts:175](../src/services/importExportRepair.ts#L175) | norm |
| [src/services/importExportRepair.ts:179](../src/services/importExportRepair.ts#L179) | getMapped |
| [src/services/importExportRepair.ts:184](../src/services/importExportRepair.ts#L184) | buildImportPreview |
| [src/services/importExportRepair.ts:329](../src/services/importExportRepair.ts#L329) | createImportBatchRecord |
| [src/services/importExportRepair.ts:350](../src/services/importExportRepair.ts#L350) | buildImportRollbackPlan |
| [src/services/importExportRepair.ts:360](../src/services/importExportRepair.ts#L360) | buildDataRepairQueue |
| [src/services/issuerSchedulePrecedence.ts:20](../src/services/issuerSchedulePrecedence.ts#L20) | pickAuthoritativeScheduleAmount |
| [src/services/issuerSchedulePrecedence.ts:31](../src/services/issuerSchedulePrecedence.ts#L31) | scheduleSourceRank |
| [src/services/issuerSchedulePrecedence.ts:38](../src/services/issuerSchedulePrecedence.ts#L38) | resolveEmiObligationPaise |
| [src/services/ledgerCalculations.ts:9](../src/services/ledgerCalculations.ts#L9) | inMonth |
| [src/services/ledgerCalculations.ts:18](../src/services/ledgerCalculations.ts#L18) | eventIdsForMonth |
| [src/services/ledgerCalculations.ts:31](../src/services/ledgerCalculations.ts#L31) | filterEffectsForMonth |
| [src/services/ledgerCalculations.ts:42](../src/services/ledgerCalculations.ts#L42) | calculateExpenseView |
| [src/services/ledgerCalculations.ts:66](../src/services/ledgerCalculations.ts#L66) | calculateIncomeView |
| [src/services/ledgerCalculations.ts:81](../src/services/ledgerCalculations.ts#L81) | hasUsableLedger |
| [src/services/ledgerCalculations.ts:88](../src/services/ledgerCalculations.ts#L88) | calculateLedgerMonthKpis |
| [src/services/ledgerCalculations.ts:110](../src/services/ledgerCalculations.ts#L110) | calculateCashflowView |
| [src/services/ledgerCalculations.ts:128](../src/services/ledgerCalculations.ts#L128) | calculateNetWorthView |
| [src/services/ledgerCalculations.ts:152](../src/services/ledgerCalculations.ts#L152) | calculateDebtView |
| [src/services/ledgerCalculations.ts:169](../src/services/ledgerCalculations.ts#L169) | calculateReceivablesPayables |
| [src/services/ledgerCalculations.ts:187](../src/services/ledgerCalculations.ts#L187) | calculateCategorySpend |
| [src/services/ledgerCalculations.ts:212](../src/services/ledgerCalculations.ts#L212) | calculateFinancingCostView |
| [src/services/ledgerCalculations.ts:235](../src/services/ledgerCalculations.ts#L235) | calculateDebtPrincipalRepaidView |
| [src/services/ledgerCalculations.ts:252](../src/services/ledgerCalculations.ts#L252) | calculateNetLiquidChangeView |
| [src/services/ledgerDiagnostics.ts:42](../src/services/ledgerDiagnostics.ts#L42) | active |
| [src/services/ledgerDiagnostics.ts:46](../src/services/ledgerDiagnostics.ts#L46) | setOf |
| [src/services/ledgerDiagnostics.ts:50](../src/services/ledgerDiagnostics.ts#L50) | diagnoseLedgerCoverage |
| [src/services/ledgerDiagnostics.ts:66](../src/services/ledgerDiagnostics.ts#L66) | targetExists |
| [src/services/ledgerDiagnostics.ts:120](../src/services/ledgerDiagnostics.ts#L120) | ledgerDiagnosticTotal |
| [src/services/loanEngine.ts:25](../src/services/loanEngine.ts#L25) | loanInterestType |
| [src/services/loanEngine.ts:29](../src/services/loanEngine.ts#L29) | loanInterestMethodLabel |
| [src/services/loanEngine.ts:37](../src/services/loanEngine.ts#L37) | isImportedLoanLifecycle |
| [src/services/loanEngine.ts:43](../src/services/loanEngine.ts#L43) | calculateEMIPaise |
| [src/services/loanEngine.ts:61](../src/services/loanEngine.ts#L61) | remainingTenureMonthsForLoan |
| [src/services/loanEngine.ts:76](../src/services/loanEngine.ts#L76) | openingPrincipalForSchedulePaise |
| [src/services/loanEngine.ts:82](../src/services/loanEngine.ts#L82) | buildAmortizationSchedule |
| [src/services/loanEngine.ts:137](../src/services/loanEngine.ts#L137) | openingPrincipalForScheduleMonthPaise |
| [src/services/loanEngine.ts:179](../src/services/loanEngine.ts#L179) | buildEmiPaymentIntelligence |
| [src/services/loanEngine.ts:223](../src/services/loanEngine.ts#L223) | splitPaymentPrincipalInterest |
| [src/services/loanEngine.ts:246](../src/services/loanEngine.ts#L246) | calculatePrincipalPaid |
| [src/services/loanEngine.ts:260](../src/services/loanEngine.ts#L260) | calculateInterestPaid |
| [src/services/loanEngine.ts:269](../src/services/loanEngine.ts#L269) | calculateOutstandingPrincipal |
| [src/services/loanEngine.ts:276](../src/services/loanEngine.ts#L276) | sumScheduleInterestFrom |
| [src/services/loanEngine.ts:304](../src/services/loanEngine.ts#L304) | calculateRemainingInterest |
| [src/services/loanEngine.ts:314](../src/services/loanEngine.ts#L314) | countPaidScheduleMonths |
| [src/services/loanEngine.ts:332](../src/services/loanEngine.ts#L332) | calculateRemainingTenure |
| [src/services/loanEngine.ts:348](../src/services/loanEngine.ts#L348) | calculateOverdueEMIs |
| [src/services/loanEngine.ts:386](../src/services/loanEngine.ts#L386) | simulatePayoffMonthsAndInterest |
| [src/services/loanEngine.ts:415](../src/services/loanEngine.ts#L415) | calculatePrepaymentImpact |
| [src/services/loanEngine.ts:440](../src/services/loanEngine.ts#L440) | simulatePrepaymentOptions |
| [src/services/loanEngine.ts:472](../src/services/loanEngine.ts#L472) | calculateForeclosureEstimate |
| [src/services/loanEngine.ts:489](../src/services/loanEngine.ts#L489) | calculateForeclosureBreakdown |
| [src/services/loanEngine.ts:516](../src/services/loanEngine.ts#L516) | importedLoanConfidence |
| [src/services/loanEngine.ts:539](../src/services/loanEngine.ts#L539) | buildDebtSummary |
| [src/services/loanEngine.ts:585](../src/services/loanEngine.ts#L585) | buildFriendlyLoanSummaryLine |
| [src/services/loanEngine.ts:605](../src/services/loanEngine.ts#L605) | ru |
| [src/services/loanEngine.ts:613](../src/services/loanEngine.ts#L613) | formatDueEnIn |
| [src/services/loanPaymentSync.ts:16](../src/services/loanPaymentSync.ts#L16) | pickClosestEmiRow |
| [src/services/loanPaymentSync.ts:36](../src/services/loanPaymentSync.ts#L36) | monthIndexForEmiRow |
| [src/services/loanPaymentSync.ts:47](../src/services/loanPaymentSync.ts#L47) | syncEmiPaymentFromTransaction |
| [src/services/obligationEngine.ts:9](../src/services/obligationEngine.ts#L9) | recurringRuleAmountPaise |
| [src/services/obligationEngine.ts:14](../src/services/obligationEngine.ts#L14) | obligationOccurrenceKey |
| [src/services/obligationEngine.ts:18](../src/services/obligationEngine.ts#L18) | materializeRecurringObligations |
| [src/services/obligationEngine.ts:55](../src/services/obligationEngine.ts#L55) | materializeLoanEmiObligations |
| [src/services/obligationEngine.ts:90](../src/services/obligationEngine.ts#L90) | mergeObligationsUnique |
| [src/services/obligationEngine.ts:99](../src/services/obligationEngine.ts#L99) | obligationsDueBefore |
| [src/services/obligationEngine.ts:106](../src/services/obligationEngine.ts#L106) | totalDuePaise |
| [src/services/obligationEngine.ts:111](../src/services/obligationEngine.ts#L111) | obligationCalendarSummary |
| [src/services/personaEngine.ts:58](../src/services/personaEngine.ts#L58) | activeRecord |
| [src/services/personaEngine.ts:62](../src/services/personaEngine.ts#L62) | buildPersonaSignals |
| [src/services/personaEngine.ts:124](../src/services/personaEngine.ts#L124) | inferPersona |
| [src/services/personaEngine.ts:199](../src/services/personaEngine.ts#L199) | rankTopicsForPersona |
| [src/services/personaEngine.ts:203](../src/services/personaEngine.ts#L203) | topicForSuggestionType |
| [src/services/personaEngine.ts:225](../src/services/personaEngine.ts#L225) | severityRank |
| [src/services/personaEngine.ts:232](../src/services/personaEngine.ts#L232) | rankSuggestionsForPersona |
| [src/services/personaEngine.ts:294](../src/services/personaEngine.ts#L294) | riskFromSeverity |
| [src/services/personaEngine.ts:301](../src/services/personaEngine.ts#L301) | coachMessageFromSuggestion |
| [src/services/personaEngine.ts:320](../src/services/personaEngine.ts#L320) | summaryMessage |
| [src/services/personaEngine.ts:351](../src/services/personaEngine.ts#L351) | buildPersonaCoachSurfaces |
| [src/services/personaEngine.ts:430](../src/services/personaEngine.ts#L430) | normalizeNumberToken |
| [src/services/personaEngine.ts:434](../src/services/personaEngine.ts#L434) | aiGuardrails |
| [src/services/planFeatureGate.ts:40](../src/services/planFeatureGate.ts#L40) | isFeatureUnlocked |
| [src/services/planFeatureGate.ts:53](../src/services/planFeatureGate.ts#L53) | remainingQuota |
| [src/services/planFeatureGate.ts:69](../src/services/planFeatureGate.ts#L69) | lockReason |
| [src/services/planFeatureGate.ts:76](../src/services/planFeatureGate.ts#L76) | humanLabel |
| [src/services/reconciliationEngine.ts:9](../src/services/reconciliationEngine.ts#L9) | findOrphanTransactions |
| [src/services/reconciliationEngine.ts:30](../src/services/reconciliationEngine.ts#L30) | suggestTransferMatches |
| [src/services/refIntegrity.ts:9](../src/services/refIntegrity.ts#L9) | refsForAccount |
| [src/services/refIntegrity.ts:27](../src/services/refIntegrity.ts#L27) | refsForCard |
| [src/services/refIntegrity.ts:37](../src/services/refIntegrity.ts#L37) | refsForLoan |
| [src/services/refIntegrity.ts:52](../src/services/refIntegrity.ts#L52) | refsForGoal |
| [src/services/refIntegrity.ts:67](../src/services/refIntegrity.ts#L67) | refsForInvestment |
| [src/services/refIntegrity.ts:82](../src/services/refIntegrity.ts#L82) | refsForUdhari |
| [src/services/refIntegrity.ts:97](../src/services/refIntegrity.ts#L97) | refsForCategory |
| [src/services/sinkingFundEngine.ts:8](../src/services/sinkingFundEngine.ts#L8) | monthlyRequiredPaise |
| [src/services/sinkingFundEngine.ts:17](../src/services/sinkingFundEngine.ts#L17) | sinkingFundProgressPaise |
| [src/services/smartBudgetEngine.ts:19](../src/services/smartBudgetEngine.ts#L19) | recurringRuleAmountPaise |
| [src/services/smartBudgetEngine.ts:27](../src/services/smartBudgetEngine.ts#L27) | isPaidRecurringThisMonth |
| [src/services/smartBudgetEngine.ts:44](../src/services/smartBudgetEngine.ts#L44) | fixedRecurringPaidForCategory |
| [src/services/smartBudgetEngine.ts:70](../src/services/smartBudgetEngine.ts#L70) | variableDailyAveragePaise |
| [src/services/smartBudgetEngine.ts:107](../src/services/smartBudgetEngine.ts#L107) | smartBudgetStatuses |
| [src/services/statements/classification.ts:17](../src/services/statements/classification.ts#L17) | suggestStatementDecision |
| [src/services/statements/classification.ts:29](../src/services/statements/classification.ts#L29) | statementDuplicate |
| [src/services/statements/classification.ts:30](../src/services/statements/classification.ts#L30) | normalized |
| [src/services/statements/classification.ts:42](../src/services/statements/classification.ts#L42) | decisionProblems |
| [src/services/statements/classification.ts:56](../src/services/statements/classification.ts#L56) | monthlyStatementTotals |
| [src/services/statements/ocr.ts:7](../src/services/statements/ocr.ts#L7) | createStatementOcr |
| [src/services/statements/ocr.ts:10](../src/services/statements/ocr.ts#L10) | terminate |
| [src/services/statements/ocr.ts:11](../src/services/statements/ocr.ts#L11) | abort |
| [src/services/statements/ocr.ts:30](../src/services/statements/ocr.ts#L30) | read |
| [src/services/statements/ocr.ts:42](../src/services/statements/ocr.ts#L42) | cancelRender |
| [src/services/statements/ocr.ts:61](../src/services/statements/ocr.ts#L61) | destroy |
| [src/services/statements/parser.ts:8](../src/services/statements/parser.ts#L8) | statementDate |
| [src/services/statements/parser.ts:28](../src/services/statements/parser.ts#L28) | statementPaise |
| [src/services/statements/parser.ts:47](../src/services/statements/parser.ts#L47) | lines |
| [src/services/statements/parser.ts:56](../src/services/statements/parser.ts#L56) | column |
| [src/services/statements/parser.ts:70](../src/services/statements/parser.ts#L70) | header |
| [src/services/statements/parser.ts:82](../src/services/statements/parser.ts#L82) | cells |
| [src/services/statements/parser.ts:107](../src/services/statements/parser.ts#L107) | blankAmount |
| [src/services/statements/parser.ts:108](../src/services/statements/parser.ts#L108) | summaryAmount |
| [src/services/statements/parser.ts:117](../src/services/statements/parser.ts#L117) | isKotakNumberedHeader |
| [src/services/statements/parser.ts:122](../src/services/statements/parser.ts#L122) | kotakAccountSummary |
| [src/services/statements/parser.ts:131](../src/services/statements/parser.ts#L131) | amount |
| [src/services/statements/parser.ts:136](../src/services/statements/parser.ts#L136) | reconcileStatement |
| [src/services/statements/parser.ts:156](../src/services/statements/parser.ts#L156) | analyzeStatement |
| [src/services/statements/pdf.ts:8](../src/services/statements/pdf.ts#L8) | sha256 |
| [src/services/statements/pdf.ts:20](../src/services/statements/pdf.ts#L20) | openStatementPdf |
| [src/services/statements/pdf.ts:35](../src/services/statements/pdf.ts#L35) | armTimeout |
| [src/services/statements/pdf.ts:37](../src/services/statements/pdf.ts#L37) | abort |
| [src/services/suggestionAiExplain.ts:20](../src/services/suggestionAiExplain.ts#L20) | numericTokens |
| [src/services/suggestionAiExplain.ts:28](../src/services/suggestionAiExplain.ts#L28) | buildSuggestionAiRewriteRequest |
| [src/services/suggestionAiExplain.ts:40](../src/services/suggestionAiExplain.ts#L40) | validateSuggestionAiRewrite |
| [src/services/suggestionAiExplain.ts:61](../src/services/suggestionAiExplain.ts#L61) | explainSuggestionInSimpleLanguage |
| [src/services/suggestionEngine.ts:86](../src/services/suggestionEngine.ts#L86) | stableCalculationJson |
| [src/services/suggestionEngine.ts:87](../src/services/suggestionEngine.ts#L87) | sort |
| [src/services/suggestionEngine.ts:99](../src/services/suggestionEngine.ts#L99) | validateSuggestionDraft |
| [src/services/suggestionEngine.ts:120](../src/services/suggestionEngine.ts#L120) | draft |
| [src/services/suggestionEngine.ts:124](../src/services/suggestionEngine.ts#L124) | monthKey |
| [src/services/suggestionEngine.ts:128](../src/services/suggestionEngine.ts#L128) | expiresEndOfMonthIso |
| [src/services/suggestionEngine.ts:132](../src/services/suggestionEngine.ts#L132) | categoryName |
| [src/services/suggestionEngine.ts:136](../src/services/suggestionEngine.ts#L136) | median |
| [src/services/suggestionEngine.ts:143](../src/services/suggestionEngine.ts#L143) | buildSuggestionDrafts |
| [src/services/suggestionSync.ts:14](../src/services/suggestionSync.ts#L14) | sameCalendarMonth |
| [src/services/suggestionSync.ts:19](../src/services/suggestionSync.ts#L19) | asCalcRecord |
| [src/services/suggestionSync.ts:25](../src/services/suggestionSync.ts#L25) | appendSuggestionHistory |
| [src/services/suggestionSync.ts:35](../src/services/suggestionSync.ts#L35) | historyTypeForStatus |
| [src/services/suggestionSync.ts:41](../src/services/suggestionSync.ts#L41) | shouldSkipSuggestionDraft |
| [src/services/suggestionSync.ts:51](../src/services/suggestionSync.ts#L51) | syncSuggestionsForUser |
| [src/services/suggestionSync.ts:149](../src/services/suggestionSync.ts#L149) | buildSuggestionEngineInput |
| [src/services/syncOutbox.ts:21](../src/services/syncOutbox.ts#L21) | loadMap |
| [src/services/syncOutbox.ts:40](../src/services/syncOutbox.ts#L40) | persist |
| [src/services/syncOutbox.ts:50](../src/services/syncOutbox.ts#L50) | subscribeSyncOutbox |
| [src/services/syncOutbox.ts:55](../src/services/syncOutbox.ts#L55) | enqueueSyncOutbox |
| [src/services/syncOutbox.ts:69](../src/services/syncOutbox.ts#L69) | markSyncOutboxState |
| [src/services/syncOutbox.ts:90](../src/services/syncOutbox.ts#L90) | listPendingSyncOutbox |
| [src/services/syncOutbox.ts:96](../src/services/syncOutbox.ts#L96) | pendingSyncCount |
| [src/services/syncOutbox.ts:100](../src/services/syncOutbox.ts#L100) | clearSyncedOutbox |
| [src/services/syncOutbox.ts:108](../src/services/syncOutbox.ts#L108) | resetSyncOutboxForTests |
| [src/services/transactionFormRules.ts:47](../src/services/transactionFormRules.ts#L47) | needsCategory |
| [src/services/transactionFormRules.ts:51](../src/services/transactionFormRules.ts#L51) | trimPerson |
| [src/services/transactionFormRules.ts:59](../src/services/transactionFormRules.ts#L59) | getTransactionFormPhase6Errors |
| [src/services/transactionFormRules.ts:197](../src/services/transactionFormRules.ts#L197) | isTransactionFormPhase6Valid |
| [src/services/transactionIntent.ts:46](../src/services/transactionIntent.ts#L46) | intentToTransactionType |
| [src/services/transactionIntent.ts:53](../src/services/transactionIntent.ts#L53) | isOutgoingIntent |
| [src/services/transactionIntent.ts:57](../src/services/transactionIntent.ts#L57) | transactionTypeToDefaultIntent |
| [src/services/transactionIntent.ts:123](../src/services/transactionIntent.ts#L123) | inferChannelAndInstrument |
| [src/services/transactionPreview.ts:56](../src/services/transactionPreview.ts#L56) | accountName |
| [src/services/transactionPreview.ts:60](../src/services/transactionPreview.ts#L60) | cardLabel |
| [src/services/transactionPreview.ts:65](../src/services/transactionPreview.ts#L65) | goalTitle |
| [src/services/transactionPreview.ts:69](../src/services/transactionPreview.ts#L69) | loanLabel |
| [src/services/transactionPreview.ts:73](../src/services/transactionPreview.ts#L73) | invName |
| [src/services/transactionPreview.ts:77](../src/services/transactionPreview.ts#L77) | udhariPerson |
| [src/services/transactionPreview.ts:81](../src/services/transactionPreview.ts#L81) | categoryName |
| [src/services/transactionPreview.ts:86](../src/services/transactionPreview.ts#L86) | accountBalancePreview |
| [src/services/transactionPreview.ts:100](../src/services/transactionPreview.ts#L100) | effectSummary |
| [src/services/transactionPreview.ts:108](../src/services/transactionPreview.ts#L108) | stateToDraftTransaction |
| [src/services/transactionPreview.ts:151](../src/services/transactionPreview.ts#L151) | estimateEmiSplitForPreview |
| [src/services/transactionPreview.ts:196](../src/services/transactionPreview.ts#L196) | buildTransactionPreview |
| [src/services/transactionPreview.ts:206](../src/services/transactionPreview.ts#L206) | ru |
| [src/services/transactionPreview.ts:389](../src/services/transactionPreview.ts#L389) | newPreviewTransactionId |
| [src/services/udhariEngine.ts:13](../src/services/udhariEngine.ts#L13) | udhariPersonKey |
| [src/services/udhariEngine.ts:20](../src/services/udhariEngine.ts#L20) | opaquePhoneHash |
| [src/services/udhariEngine.ts:30](../src/services/udhariEngine.ts#L30) | udhariRemainingPaise |
| [src/services/udhariEngine.ts:57](../src/services/udhariEngine.ts#L57) | bucketForEntry |
| [src/services/udhariEngine.ts:71](../src/services/udhariEngine.ts#L71) | riskFromIntel |
| [src/services/udhariEngine.ts:82](../src/services/udhariEngine.ts#L82) | buildUdhariPeopleIntel |
| [src/services/udhariEngine.ts:170](../src/services/udhariEngine.ts#L170) | buildUdhariWhatsAppReminder |
| [src/services/udhariEngine.ts:196](../src/services/udhariEngine.ts#L196) | validateWriteOffReason |
| [src/services/udhariEngine.ts:203](../src/services/udhariEngine.ts#L203) | udhariSettlementTxnLabel |
| [src/store/authStore.ts:32](../src/store/authStore.ts#L32) | getStoredSession |
| [src/store/authStore.ts:43](../src/store/authStore.ts#L43) | setStoredSession |
| [src/store/authStore.ts:52](../src/store/authStore.ts#L52) | getUnlockGuard |
| [src/store/authStore.ts:63](../src/store/authStore.ts#L63) | setUnlockGuard |
| [src/store/authStore.ts:72](../src/store/authStore.ts#L72) | toUserShape |
| [src/store/dataStore.ts:55](../src/store/dataStore.ts#L55) | computeLedgerSlice |
| [src/store/uiStore.ts:15](../src/store/uiStore.ts#L15) | readLs |
| [src/store/uiStore.ts:137](../src/store/uiStore.ts#L137) | confirm |
| [src/utils/money.ts:20](../src/utils/money.ts#L20) | assertValidPaise |
| [src/utils/money.ts:46](../src/utils/money.ts#L46) | normalizeMoneyInputText |
| [src/utils/money.ts:55](../src/utils/money.ts#L55) | parseMoneyInputToPaise |
| [src/utils/money.ts:122](../src/utils/money.ts#L122) | safeParseMoneyInput |
| [src/utils/money.ts:134](../src/utils/money.ts#L134) | rupeesToPaise |
| [src/utils/money.ts:143](../src/utils/money.ts#L143) | paiseToRupees |
| [src/utils/money.ts:155](../src/utils/money.ts#L155) | formatMoney |
| [src/utils/money.ts:162](../src/utils/money.ts#L162) | addMoney |
| [src/utils/money.ts:171](../src/utils/money.ts#L171) | subtractMoney |
| [src/utils/money.ts:179](../src/utils/money.ts#L179) | calculateEMI |
| [src/utils/money.ts:198](../src/utils/money.ts#L198) | paiseOrFromRupee |
| [src/utils/money.ts:205](../src/utils/money.ts#L205) | transactionAmountPaise |
| [src/utils/money.ts:209](../src/utils/money.ts#L209) | accountOpeningBalancePaise |
| [src/utils/money.ts:213](../src/utils/money.ts#L213) | cardCreditLimitPaise |
| [src/utils/money.ts:217](../src/utils/money.ts#L217) | budgetLimitPaise |
| [src/utils/money.ts:221](../src/utils/money.ts#L221) | loanPrincipalPaise |
| [src/utils/money.ts:225](../src/utils/money.ts#L225) | loanOutstandingPrincipalPaise |
| [src/utils/money.ts:238](../src/utils/money.ts#L238) | loanEmiPaise |
| [src/utils/money.ts:274](../src/utils/money.ts#L274) | emiPaymentAmountPaise |
| [src/utils/money.ts:278](../src/utils/money.ts#L278) | emiPaymentPaidPaise |
| [src/utils/money.ts:282](../src/utils/money.ts#L282) | emiPaymentOutstandingPaise |
| [src/utils/money.ts:288](../src/utils/money.ts#L288) | emiPaymentPrincipalPaidPaise |
| [src/utils/money.ts:294](../src/utils/money.ts#L294) | emiPaymentInterestPaise |
| [src/utils/money.ts:300](../src/utils/money.ts#L300) | goalTargetPaise |
| [src/utils/money.ts:304](../src/utils/money.ts#L304) | goalSavedPaise |
| [src/utils/money.ts:308](../src/utils/money.ts#L308) | udhariAmountPaise |
| [src/utils/money.ts:312](../src/utils/money.ts#L312) | udhariSettledPaise |
| [src/utils/money.ts:316](../src/utils/money.ts#L316) | investmentMonthlyPaise |
| [src/utils/money.ts:320](../src/utils/money.ts#L320) | investmentTotalContributedPaise |
| [src/utils/moneyEntityNormalize.ts:12](../src/utils/moneyEntityNormalize.ts#L12) | roundRupeeMirror |
| [src/utils/moneyEntityNormalize.ts:17](../src/utils/moneyEntityNormalize.ts#L17) | pullTransactions |
| [src/utils/moneyEntityNormalize.ts:23](../src/utils/moneyEntityNormalize.ts#L23) | pushTransactions |
| [src/utils/moneyEntityNormalize.ts:32](../src/utils/moneyEntityNormalize.ts#L32) | pullAccounts |
| [src/utils/moneyEntityNormalize.ts:38](../src/utils/moneyEntityNormalize.ts#L38) | pushAccounts |
| [src/utils/moneyEntityNormalize.ts:47](../src/utils/moneyEntityNormalize.ts#L47) | pullCards |
| [src/utils/moneyEntityNormalize.ts:53](../src/utils/moneyEntityNormalize.ts#L53) | pushCards |
| [src/utils/moneyEntityNormalize.ts:64](../src/utils/moneyEntityNormalize.ts#L64) | pullBudgets |
| [src/utils/moneyEntityNormalize.ts:70](../src/utils/moneyEntityNormalize.ts#L70) | pushBudgets |
| [src/utils/moneyEntityNormalize.ts:79](../src/utils/moneyEntityNormalize.ts#L79) | pullLoans |
| [src/utils/moneyEntityNormalize.ts:91](../src/utils/moneyEntityNormalize.ts#L91) | pushLoans |
| [src/utils/moneyEntityNormalize.ts:118](../src/utils/moneyEntityNormalize.ts#L118) | pullEmis |
| [src/utils/moneyEntityNormalize.ts:148](../src/utils/moneyEntityNormalize.ts#L148) | pushEmis |
| [src/utils/moneyEntityNormalize.ts:196](../src/utils/moneyEntityNormalize.ts#L196) | pullGoals |
| [src/utils/moneyEntityNormalize.ts:205](../src/utils/moneyEntityNormalize.ts#L205) | pushGoals |
| [src/utils/moneyEntityNormalize.ts:220](../src/utils/moneyEntityNormalize.ts#L220) | pullUdhari |
| [src/utils/moneyEntityNormalize.ts:229](../src/utils/moneyEntityNormalize.ts#L229) | pushUdhari |
| [src/utils/moneyEntityNormalize.ts:244](../src/utils/moneyEntityNormalize.ts#L244) | pullUdhariSettlements |
| [src/utils/moneyEntityNormalize.ts:250](../src/utils/moneyEntityNormalize.ts#L250) | pushUdhariSettlements |
| [src/utils/moneyEntityNormalize.ts:259](../src/utils/moneyEntityNormalize.ts#L259) | pullInvestments |
| [src/utils/moneyEntityNormalize.ts:268](../src/utils/moneyEntityNormalize.ts#L268) | pushInvestments |
| [src/utils/moneyEntityNormalize.ts:283](../src/utils/moneyEntityNormalize.ts#L283) | pullGoalContribs |
| [src/utils/moneyEntityNormalize.ts:289](../src/utils/moneyEntityNormalize.ts#L289) | pushGoalContribs |
| [src/utils/moneyEntityNormalize.ts:298](../src/utils/moneyEntityNormalize.ts#L298) | pullSavingsContribs |
| [src/utils/moneyEntityNormalize.ts:304](../src/utils/moneyEntityNormalize.ts#L304) | pushSavingsContribs |
| [src/utils/moneyEntityNormalize.ts:313](../src/utils/moneyEntityNormalize.ts#L313) | pullRecurring |
| [src/utils/moneyEntityNormalize.ts:319](../src/utils/moneyEntityNormalize.ts#L319) | pushRecurring |
| [src/utils/moneyEntityNormalize.ts:360](../src/utils/moneyEntityNormalize.ts#L360) | normalizeMoneyEntity |
| [src/utils/moneyEntityNormalize.ts:370](../src/utils/moneyEntityNormalize.ts#L370) | normalizeMoneyEntityDeep |
| [src/utils/moneyEntityNormalize.ts:381](../src/utils/moneyEntityNormalize.ts#L381) | formatMoneyRupeeLabel |
