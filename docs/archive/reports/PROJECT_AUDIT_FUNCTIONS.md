# SparowVault — Phase 1: Function Inventory

| Field | Value |
|---|---|
| Generated | 2026-05-14 |
| Scope | Every exported function, const, class, type, and interface across the codebase |
| Frontend total | ~600+ exports across 94 TS/TSX files |
| Backend total | 171 PHP functions across 30 files |

This is the raw function-level inventory. For file structure see `PROJECT_AUDIT_STRUCTURE.md`. For the full audit report (features, flows, cross-links) see `PROJECT_AUDIT_FULL.md`.

---

## FRONTEND — TypeScript / React

### 1. Services (`src/services/*`)

#### `src/services/calculations.ts` — pure financial calculation engine (paise integers)
- `INCOME_TYPES: TransactionType[]`
- `EXPENSE_TYPES: TransactionType[]`
- `isIncomeTx(t: Transaction): boolean`
- `isExpenseTx(t: Transaction): boolean`
- `isCashOutflow(t: Transaction): boolean`
- `isCashInflow(t: Transaction): boolean`
- `sumIncome(txs)`, `sumExpense(txs)`, `sumByType(txs, types)`
- `filterByMonth(txs, year, month)`, `filterByDateRange(txs, from, to)`
- `netMonthlySavings(txs): number`
- `savingsRate(netPaise, incomePaise): number`
- `budgetUsagePercent(spentPaise, budgetPaise): number`
- `projectMonthEndSpend(spentSoFarPaise, today?): number`
- `computeGoalProgress(goal, today?): GoalProgress`
- `amortizationSchedule(loan): AmortizationRow[]`
- `summarizeLoan(loan, emiPayments): LoanSummary`
- `summarizeCardHealth(card, txs, today?, effects?): CardHealth`
- `totalUdhariReceivable(records)`, `totalUdhariPayable(records)`
- `projectedCorpus(monthlyPaise, annualReturnPct, months)`
- `emergencyMonthsCoverage(fundPaise, monthlyExpensePaise)`
- `computeFinancialHealth(i: HealthInputs): FinancialHealthBreakdown`
- `deriveAccountBalance(...)`, `deriveAccountBalanceFromAccount(...)`
- `monthlyTrend(txs, monthsBack, today?): MonthlyBucket[]`
- `categoryBreakdown(txs, categories): CategorySlice[]`
- `budgetStatuses(budgets, txs, today?): BudgetStatus[]`
- `totalInvested(investments)`

#### `src/services/financeEventBuilder.ts` — Phase 5 ledger event/effect construction
- `buildFinanceEventBuilderContext(categories, emis): FinanceEventBuilderContext`
- `buildLedgerForTransaction(tx, ctx, source?): LedgerTransactionBuild`
- `buildFullLedger(userId, txs, ctx): { events, effects }`

#### `src/services/financeLedgerExplain.ts` — explain-this-number drawers
- `explainCategorySpend(categoryId, year, month, transactions, events, effects): ExplainCategorySpendResult`
- `explainCashflowMonth(year, month, events, effects): { included, excluded }`
- `explainTransactionLedgerCoverage(t, events): { covered, event?, note? }`
- `sumExcludedExpenseTransactionsPaise(excluded, transactions): number`

#### `src/services/ledgerCalculations.ts` — Phase 5 ledger views
- `calculateExpenseView(events, effects, year, month): number`
- `calculateCashflowView(events, effects, year, month): { inflowPaise, outflowPaise }`
- `calculateNetWorthView(effects): number`
- `calculateDebtView(effects): { cardLiabilityPaise, loanPrincipalPaise }`
- `calculateReceivablesPayables(effects): { receivablePaise, payablePaise }`
- `calculateCategorySpend(events, effects, categoryId, year, month): number`

#### `src/services/accountBalanceEngine.ts` — Phase 6 cash balance computation
- `computeAccountCashClosingPaise(accountId, openingPaise, txs): number`
- `computeAccountBalanceBreakdown(accountId, openingPaise, txs): AccountBalanceBreakdown`

#### `src/services/cardEngine.ts` — Phase 7 credit card intelligence
- `filterCardLiabilityEffects(effects, cardId, userId?)`
- `calculateCardOutstanding(cardId, effects, userId?)`
- `calculateCardOutstandingFromTransactions(card, txs)`
- `resolveCardOutstandingPaise(card, txs, effects): { outstandingPaise, source }`
- `calculateAvailableLimit(card, outstandingPaise)`
- `calculateUtilization(card, outstandingPaise)`
- `lastStatementDateForCard(card, today)`
- `calculateStatementWindow(card, today): StatementWindow`
- `calculateNextDueDate(card, today): Date | null`
- `calculateMinimumDue(statementBalancePaise)`
- `calculateCardRisk(card, outstandingPaise): CardRiskLevel`
- `buildCreditCardIntel(card, txs, effects, today): CreditCardIntel | null`

#### `src/services/loanEngine.ts` — Phase 8 loan / EMI intelligence
- `isImportedLoanLifecycle(loan): boolean`
- `calculateEMIPaise(principalPaise, annualRatePct, tenureMonths): number`
- `remainingTenureMonthsForLoan(loan): number`
- `openingPrincipalForSchedulePaise(loan): number`
- `buildAmortizationSchedule(loan): AmortizationRow[]`
- `openingPrincipalForScheduleMonthPaise(schedule, monthIndex, loanOpeningPaise)`
- `splitPaymentPrincipalInterest(openingPrincipalPaise, paymentPaise, annualRatePct, opts?): PaymentSplitResult`
- `calculatePrincipalPaid(emiPayments)`, `calculateInterestPaid(emiPayments)`
- `calculateOutstandingPrincipal(loan, emiPayments)`
- `calculateRemainingInterest(loan, emiPayments)`
- `calculateRemainingTenure(loan, emiPayments)`
- `countPaidScheduleMonths(schedule, emiPayments)`
- `calculateOverdueEMIs(loan, emiPayments): { count, amountPaise }`
- `calculateForeclosureEstimate(outstandingPaise, chargesPct)`
- `buildFriendlyLoanSummaryLine(loan, emiPayments): string`

#### `src/services/loanPaymentSync.ts` — EMI transaction sync
- `syncEmiPaymentFromTransaction(tx, loan, emis): Promise<EMIPayment | null>`

#### `src/services/udhariEngine.ts` — Phase 9 informal lending intelligence
- `udhariPersonKey(personName, phone?)`
- `opaquePhoneHash(phone)`
- `udhariRemainingPaise(r)`
- `buildUdhariPeopleIntel(records, settlements, today?): UdhariPersonIntel[]`
- `buildUdhariWhatsAppReminder(record, outstandingPaise): string`
- `udhariSettlementTxnLabel(type): string`

#### `src/services/goalEngine.ts` — Phase 10 goal pace + priority
- `goalPriorityTier(priority): GoalPriorityTier`
- `buildGoalIntel(goal, today?): GoalIntel`
- `summarizeGoalsAtRisk(goals, today?, max?): GoalIntel[]`

#### `src/services/emergencyFundEngine.ts` — Phase 10 emergency fund coverage
- `isEssentialCategoryName(name): boolean`
- `averageMonthlyEssentialPaise(transactions, categories, today?, months?): number`
- `buildEmergencyFundIntel(transactions, categories, investments, goals, today?, targetMonths?): EmergencyFundIntel`

#### `src/services/smartBudgetEngine.ts` — Phase 10 anti-false-panic budgets
- `smartBudgetStatuses(budgets, txs, recurringRules, today?): SmartBudgetStatus[]`

#### `src/services/cashflowSurvivalEngine.ts` — Phase 10 safe daily spend
- `buildCashflowSurvivalReport(accounts, transactions, recurringRules, loans, emis, cards, goals, udhari, ledgerEffects, today?): CashflowSurvivalReport`

#### `src/services/suggestionEngine.ts` — Phase 11 deterministic suggestions
- `stableCalculationJson(obj): string`
- `buildSuggestionDrafts(input: SuggestionEngineInput): SuggestionDraft[]`

#### `src/services/suggestionSync.ts` — Phase 11 idempotent persistence
- `syncSuggestionsForUser(userId, engineIn): Promise<{ created, updated, expired }>`

#### `src/services/suggestionAiExplain.ts` — optional LLM rephrase
- `explainSuggestionInSimpleLanguage(payload): Promise<string | null>`

#### `src/services/categoryColorEngine.ts` — Phase 12 chart color management
- `EXPENSE_CHART_PALETTE_DEFAULT`, `INCOME_CHART_PALETTE_DEFAULT`
- `EXPENSE_CHART_PALETTE_COLORBLIND`, `INCOME_CHART_PALETTE_COLORBLIND`
- `CHART_OTHERS_COLOR`, `MODULE_COLOR`
- `expensePalette(accessibility)`, `incomePalette(accessibility)`
- `activeCategoriesForColoring(categories)`
- `expenseBreakdownWithDistinctChartColors(slices, accessibility, topN?)`
- `attachCategoryIcons(rows, categories)`
- `usedColorsForAppliesTo(categories, appliesTo)`
- `suggestNextCategoryColor(appliesTo, categories, accessibility)`
- `findDuplicateCategoryColors(categories): DuplicateColorGroup[]`
- `findDuplicateCategoryNames(categories): DuplicateNameGroup[]`

#### `src/services/alertsEngine.ts` — alert rule evaluation
- `runAlertEngine(user): Promise<void>`

#### `src/services/businessPersonalSplit.ts` — Phase 15 split
- `splitTransaction(tx): SplitParts`
- `sumSplit(txs): SplitParts`

#### `src/services/caReports.ts` — Phase 15 CA report generators
- `reportTransactionMaster(ctx): TransactionMasterRow[]`
- `reportMonthlyCashflow(ctx): MonthlyCashflowRow[]`
- `reportCategoryLedger(ctx)`, `reportAccountLedger(ctx)`, `reportCardLedger(ctx)`
- `reportInterestPaid(ctx)`, `reportUdhariAgeing(ctx, today?)`
- `reportBusinessExpense(ctx)`, `reportPersonalExpense(ctx)`
- `reportTaxFlag(ctx)`, `reportGstMissingBill(ctx)`
- `reportNetWorth(ctx): NetWorthSummary`

#### `src/services/personaEngine.ts` — Phase 16 persona inference + AI guardrails
- `buildPersonaSignals(input): PersonaSignals`
- `inferPersona(signals): PersonaResult`
- `rankTopicsForPersona(persona): SuggestionTopic[]`
- `rankSuggestionsForPersona<T>(suggestions, persona): T[]`
- `aiGuardrails(text): AiGuardResult`

#### `src/services/planFeatureGate.ts` — Phase 14 client-side feature gate
- `isFeatureUnlocked(snapshot, key): boolean`
- `remainingQuota(snapshot, key, usedInWindow): number`
- `lockReason(snapshot, key): string`
- `humanLabel(key): string`

#### `src/services/transactionFormRules.ts` — Phase 6 conditional fields
- `EXPENSE_CASH_LIKE_PAYMENT_MODES`
- `getTransactionFormPhase6Errors(state): Record<string, string>`

#### `src/services/transactionPreview.ts` — Phase 6 ledger preview
- `stateToDraftTransaction(state, ctx): Transaction | null`
- `previewTransactionLedger(draft, ctx): LedgerTransactionBuild`
- `buildTransactionPreview(draft, ctx): TransactionPreviewSummary`

#### `src/services/authService.ts` — local profile auth
- `getLocalSession()`, `setLocalSession(session)`, `getLastUserId()`
- `listProfiles()`, `loginProfile(userId, pin)`, `logoutProfile(userId)`
- `lockSession(userId)`, `unlockSession(userId, pin)`
- `changePin(userId, oldPin, newPin)`
- `setSecurityAnswer(userId, question, answer)`
- `resetPinWithSecurityAnswer(userId, answer, newPin)`
- `updateUserProfile(userId, patch)`

#### `src/services/defaultsService.ts` — seed defaults
- `seedDefaultCategories(user)`, `seedDefaultAccounts(user)`

#### `src/services/demoData.ts` — demo seeder
- `seedDemoData(user): Promise<void>`

#### `src/services/refIntegrity.ts` — referential integrity checks
- `refsForAccount(accountId)`, `refsForCard(cardId)`, `refsForLoan(loanId)`
- `refsForGoal(goalId)`, `refsForInvestment(investmentId)`, `refsForUdhari(udhariId)`
- `refsForCategory(categoryId)`

#### `src/services/validators.ts` — Zod schemas
- `createUserSchema`, `transactionSchema`, `accountSchema`, `cardSchema`
- `categorySchema`, `budgetSchema`, `goalSchema`, `investmentSchema`
- `loanSchema`, `udhariSchema`, `recurringRuleSchema`

---

### 2. Lib (`src/lib/*`)

#### `src/lib/utils.ts` — generic utilities
- `cn(...inputs)`, `uid(prefix?)`, `nowIso()`, `sleep(ms)`, `clamp(n, min, max)`
- `safeNumber(v, fallback?)`, `range(start, end, step?)`
- `groupBy<T,K>(arr, keyFn)`, `sumBy<T>(arr, valFn)`
- `percent(numerator, denominator)`, `isBrowser()`

#### `src/lib/crypto.ts` — local PIN hashing
- `generateSalt()`, `hashPin(pin, salt)`, `verifyPin(pin, salt, expectedHash)`

#### `src/lib/format.ts` — INR / date formatting
- `formatINR(amount, options?)`, `formatINRCompact(amount, showSymbol?)`
- `formatNumberIN(n, decimals?)`, `formatPercent(n, decimals?)`
- `formatDate(iso, pattern?)`, `formatDateShort(iso)`, `formatDateLong(iso)`
- `formatMonthYear(iso)`, `formatRelativeDue(iso?)`
- `localDateToIso(localDate)`, `isoToLocalDate(iso)`
- `formatPaymentMode(pm)`, `formatTxType(type)`

#### `src/lib/navRoutes.ts` — routing
- `navToPath(nav)`, `pathToNav(pathname)`

#### `src/lib/apiClient.ts` — HTTP client
- `getCloudToken()`, `setCloudToken(token)`, `clearCloudToken()`
- `apiRequest<T>(path, init?)`

#### `src/lib/cloud/auth.ts` — cloud auth flow
- `requestCloudLogin(username)`, `verifyCloudLogin(sessionId, code)`, `cloudLogout()`

#### `src/lib/cloud/http.ts` — cloud HTTP
- `cloudFetch<T>(path, init?)`

#### `src/lib/cloud/client.ts` — main cloud client
- `cloudLogin(username, password)`, `cloudMe()`, `cloudLogout()`, `cloudAdminLogin(username, password)`

#### `src/lib/cloud/collections.ts`
- `CloudCollectionKey` type
- `CLOUD_COLLECTIONS: Record<CloudCollectionKey, {...}>`

#### `src/lib/cloud/saasClient.ts`
- `fetchPublicConfig()`, `fetchViewer()`, `getMySubscription()`
- `createSubscriptionOrder(planId)`, `confirmSubscriptionPayment(orderId, paymentId, signature)`
- `fetchPlans()`

#### `src/lib/cloud/repoClient.ts`
- `syncFromCloudRepo(userId)`, `pushToCloudRepo(collection, records)`

#### `src/lib/migrateLegacyKeys.ts`
- `migrateLegacyKeysToPhase3(db)`

---

### 3. Utils (`src/utils/*`)

#### `src/utils/money.ts` — Phase 3 integer paise math
- `MAX_ABS_PAISE`, `assertValidPaise(value, field?)`
- `rupeesToPaise(value)`, `paiseToRupees(paise)`
- `formatMoney(paise, currency?)`, `addMoney(...parts)`, `subtractMoney(a, b)`
- `safeParseMoneyInput(input)`
- `calculateEMI(principalPaise, annualRate, tenureMonths)`
- Entity helpers: `transactionAmountPaise`, `accountOpeningBalancePaise`, `cardCreditLimitPaise`, `budgetLimitPaise`, `loanPrincipalPaise`, `loanOutstandingPrincipalPaise`, `loanEmiPaise`, `emiPaymentAmountPaise`, `emiPaymentPaidPaise`, `emiPaymentOutstandingPaise`, `emiPaymentPrincipalPaidPaise`, `emiPaymentInterestPaise`, `goalSavedPaise`, `goalTargetPaise`, `investmentTotalContributedPaise`, `investmentMonthlyPaise`, `udhariAmountPaise`, `udhariSettledPaise`

#### `src/utils/moneyEntityNormalize.ts`
- `normalizeMoneyEntity(collection, row, direction)`

---

### 4. Store (Zustand)

- `useDataStore` — `loadAll`, `loadBootstrap`, `ensureCollections`, `clear`, `refreshOne`, `upsertLocal`, `removeLocal`, `setSettings`, `recomputeLedger`
- `useNavStore` — `setActive`, `syncFromUrl` + `NavKey` type
- `useAuthStore` — `hydrate`, `refreshProfiles`, `login`, `logout`, `lock`, `unlock`, `switchProfile`, `setError`
- `useUIStore` — `setSidebarCollapsed`, `openQuickAdd`, `closeQuickAdd`, `setAlertsOpen`, `setCommandOpen`, `setDashboardMode`, `setChartAccessibility`, `setPendingTransactionFilters`, `consumePendingTransactionFilters`, `toast`, `dismissToast`, `requestConfirm`, `resolveConfirm`
- `useCloudAppStore` — `hydrate`, `viewerRole`, `settings`, feature flags

---

### 5. Database

- `src/db/database.ts` — `SparowVaultDB extends Dexie` (24 tables) + `getDB()`

---

### 6. Components — public exports

- **Layout**: `AppShell`, `AdminAppShell`, `Header`, `Sidebar`, `PageHeader`, `CommandPalette`, `AlertsDrawer`, `ThemeSwitch`
- **Auth**: `AuthShell`, `CloudAuth`, `AdminAuth`, `LockScreen`, `ProfileLogin`
- **Pages (user)**: `DashboardPage`, `TransactionsPage`, `IncomePage`, `ExpensesPage`, `AccountsPage`, `CardsPage`, `LoansPage`, `UdhariPage`, `GoalsPage`, `BudgetsPage`, `InvestmentsPage`, `CategoriesPage`, `ReportsPage`, `AlertsPage`, `ProfilePage`, `SettingsPage`, `SubscriptionPage`, `ExportPage`, `ImportPage`, `SuggestionsPage`, `AuditPage`
- **Pages (admin)**: `AdminDashboardPage`, `UserManagementPage`, `SubscriptionManagementPage`, `PlanManagementPage`, `BrandingSettingsPage`, `FeatureFlagsPage`
- **Forms**: `QuickAddDialog`, `TransactionForm`
- **UI primitives**: `Button`, `Card`, `Input`, `Label`, `Select`, `Dropdown`, `Checkbox`, `Switch`, `Tabs`, `Table`, `Badge`, `Progress`, `Toast`, `Dialog`, `ConfirmDialog`, `Sheet`
- **Charts**: `SafeChart`
- **Specialized**: `App`, `ThemeProvider`, `AppProviders`, `CategoryCleanupPanel`, `ExplainMetricDrawer`

---

## BACKEND — PHP

### Config (`php/config/`)
- `env.php` → `read_env_file_value`, `load_env_file`, `env_value`, `db_dsn`
- `db.php` → `db_conn(): PDO`

### Helpers (`php/helpers/`)
- `auth.php` (17 functions) — `jwt_secret`, `jwt_expires_in_seconds`, `base64url_encode/decode`, `sign_cloud_token`, `verify_cloud_token`, `create_pin_salt`, `hash_secret`, `verify_secret`, `require_cloud_user`, `db_user_by_username`, `db_user_by_id`, `auth_require_active_user`, `auth_require_admin`, `login_throttle_status`, `record_login_failure`, `clear_login_failures`
- `app.php` (7 functions) — `app_env`, `require_env_values`, `known_bad_jwt_secret_hashes`, `require_safe_production_secrets`, `validate_runtime_config`, `setting_get_map`, `flag_get_map`
- `security.php` (6 functions) — `cors_allowed_origins`, `apply_cors_headers`, `client_ip`, `rate_limit_guard`, `rate_limit_guard_memory`, `rate_limit_cleanup`
- `payments.php` (6 functions) — `razorpay_key_id/secret/webhook_secret`, `razorpay_request`, `razorpay_verify_signature`, `razorpay_verify_webhook_signature`
- `audit.php` (3 functions) — `actor_ip_address`, `actor_user_agent`, `audit_log_action`
- `http.php` (5 functions) — `json_input`, `json_ok`, `json_error`, `require_json_body`, `get_bearer_token`
- `validate.php` — `validate_string_field`, `validate_enum`, `validate_decimal_string`
- `validator.php` — `validate_required_fields`, `validate_enum_field`, `validate_string_length`
- `observability.php` — `request_log`
- `request_id.php` (2 functions) — `ensure_request_id`, `structured_log`
- `utils.php` (6 functions) — `now_iso`, `uid`, `encode_payload`, `decode_payload`, `cloud_collections`, `is_cloud_collection`
- `money_paise.php` (4 functions) — `cloud_money_max_abs_paise`, `cloud_validate_integer_paise_field`, `cloud_validate_money_fields`, `cloud_entity_primary_amount_paise`
- `cloud_payload.php` (18 functions) — `cloud_max_*_bytes`, `cloud_collection_allowlist`, `cloud_is_allowed_collection`, `cloud_validate_encoded_payload_size`, `cloud_validate_sync_push_raw_size`, `cloud_assert_entity_user_id`, `cloud_ccr_compute_indexed`, `cloud_str_id`, `cloud_transaction_types`, `cloud_transaction_payment_modes`, `cloud_validate_transaction_payload`, `cloud_validate_entity_for_collection`, `cloud_ccr_indexed_column_sql`, `cloud_ccr_upsert_on_duplicate_sql`, `cloud_ccr_build_upsert`, `cloud_ccr_build_update_by_table_id`
- `finance_events.php` (9 functions) — `fe_amount_paise`, `fe_emis_by_transaction_id`, `fe_event_id_for_transaction`, `fe_clear_effects_for_event`, `fe_void_ledger_for_transaction`, `fe_upsert_posted_ledger`, `fe_principal_interest_paise`, `finance_events_sync_transaction`, `finance_events_sync_transaction_safe`
- `billing.php` (5 functions) — `billing_renewal_start`, `billing_period_end_sql`, `billing_active_price_paise`, `billing_user_quotas`, `billing_user_has_feature`
- `policy.php` (4 functions) — `policy_current_versions`, `policy_user_outstanding_keys`, `policy_record_acceptance`, `policy_mark_user_checked`
- `user_audit.php` — `user_audit_log`

### Controllers (`php/controllers/`)
- `cloud.php` (14 functions) — register/login/admin-login/me, throttle, profile update, ensure recovery table, change pin, security recovery setup + reset
- `cloud_data.php` (12 functions) — sync pull/push, entity list/create/delete bulk/get/patch/delete, denied-field check
- `subscriptions.php` (8 functions) — paise conversion, effective features, period end SQL, list plans, create order, confirm payment, my subscription, cancel
- `payments.php` — `razorpay_webhook()`
- `admin.php` (12 functions) — dashboard, plans list/upsert, settings get/put, feature flags get/put, users list, subscriptions list, toggle active, assign plan, period end SQL
- `account.php` (3 functions) — `account_verify_pin_reentry`, `account_data_export`, `account_delete`
- `policies.php` (2 functions) — `policies_current`, `policies_accept`
- `public_config.php` (2 functions) — `public_config_get`, `health_check_get`
- `imports.php` — `imports_transactions_bulk()`

### Routing
- `php/routes.php` — `dispatch_request()`
- `php/index.php`, `php/bootstrap_api.php`, `php/dev-router.php` — entry/bootstrap

### API endpoint dispatch (`api/`)
Each file is a thin wrapper that dispatches to its controller function:
- `api/auth/login.php → cloud_login()`
- `api/auth/register.php → cloud_register()`
- `api/auth/admin-login.php → cloud_admin_login()`
- `api/auth/me.php → cloud_me()`
- `api/auth/profile.php → cloud_profile_update()`
- `api/auth/change-pin.php → cloud_change_pin()`
- `api/auth/reset-pin.php → cloud_reset_pin_with_security()`
- `api/auth/security-recovery.php → cloud_set_security_recovery()`
- `api/auth/data-export.php → account_data_export()`
- `api/auth/account.php → account_delete()`
- `api/cloud/sync/push.php → cloud_sync_push()`
- `api/cloud/sync/pull.php → cloud_sync_pull()`
- `api/cloud/entity.php → cloud_entity_*` (list/create/delete)
- `api/cloud/entity-item.php → cloud_entity_*_one`
- `api/subscriptions/plans.php → subscriptions_list_plans()`
- `api/subscriptions/create-order.php → subscriptions_create_order()`
- `api/subscriptions/confirm-payment.php → subscriptions_confirm_payment()`
- `api/subscriptions/my.php → subscriptions_my()`
- `api/subscriptions/cancel.php → subscriptions_cancel()`
- `api/payments/razorpay/webhook.php → razorpay_webhook()`
- `api/admin/dashboard.php → admin_dashboard()`
- `api/admin/users.php → admin_users_list()`
- `api/admin/users-assign-plan.php → admin_assign_plan()`
- `api/admin/users-toggle-active.php → admin_toggle_user_active()`
- `api/admin/plans.php → admin_plans_list / upsert`
- `api/admin/subscriptions.php → admin_subscriptions_list()`
- `api/admin/settings.php → admin_settings_get / put`
- `api/admin/feature-flags.php → admin_feature_flags_get / put`
- `api/policies/current.php → policies_current()`
- `api/policies/accept.php → policies_accept()`
- `api/public/config.php → public_config_get()`
- `api/health.php → health_check_get()`
- `api/import/transactions.php → imports_transactions_bulk()`

### Scripts (`scripts/*.php`)
- `backup_db.php` — mysqldump-style DB dump
- `backup_json.php` — anonymized JSON export
- `reset_admin_pin.php` — Phase 1 hardened: refuses prod without `--force`, sets `must_change_pin=1`
- `retention-sweeper.php` — Phase 13 daily sweep (6 jobs: user_audit cleanup, login_attempts cleanup, api_rate_limits cleanup, soft-delete purge, expired suggestions, expired export files)
- `backfill_financial_ledger.php` — backfills Phase 5 events/effects from existing transactions

---

## Grand Totals

| Layer | Files | Functions/Exports |
|---|---|---|
| `src/services/` | 36 | ~380 |
| `src/lib/` | 12 | ~75 |
| `src/utils/` | 3 | ~60 |
| `src/store/` | 5 | 5 Zustand hooks + ~40 actions |
| `src/db/` | 1 | 1 class + 24 stores |
| `src/types/` | 1 | 40+ types/interfaces |
| `src/constants/` | 1 | 5+ const arrays |
| `src/exports/` | 1 | 4 builders |
| `src/components/*` | ~80 | 65+ components |
| `php/helpers/` | 17 | 95 |
| `php/controllers/` | 9 | 53 |
| `php/config/` + entry | 6 | 7 |
| `api/*` | 40+ endpoint shims | 1 dispatch per endpoint |
| `scripts/*.php` | 5 | 8 |
| **TOTAL** | **~220+** | **~800+** |
