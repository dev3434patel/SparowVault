# SparowVault — Phase 2: Structure + Schema Inventory

| Field | Value |
|---|---|
| Generated | 2026-05-14 |
| Total code files | 300+ (excluding `node_modules`, `dist`, `release/hosting-bundle*`, `data/`, `backups/`) |
| DB tables | 29 |
| FK relationships | 24 |
| Indexes | 95+ |

This document is the structural map. For functions see `PROJECT_AUDIT_FUNCTIONS.md`. For the deep-dive audit see `PROJECT_AUDIT_FULL.md`.

---

## A. PROJECT ROOT — top-level files

| File | Purpose |
|---|---|
| `README.md` | Main project documentation |
| `package.json` | npm scripts (60+), dependencies, devDependencies |
| `tsconfig.json` | TypeScript strict config, `@/*` path alias |
| `vite.config.ts` | Vite build + dev proxy `/api → localhost:5000` |
| `vitest.config.mts` | Vitest test runner, `node` environment |
| `eslint.config.mjs` | ESLint config (some rules disabled — audit C1) |
| `.htaccess` | Apache: HTTPS redirect + 6 security headers + deny rules for `.env*`/`sql/`/`data/`/`php/config/` |
| `index.html` | Vite entry HTML template |
| `.env.example`, `.env.host.example`, `.env.test.example` | Templates (committed) |
| `.env`, `.env.local`, `.env.host`, `.env.staging`, `.env.production` | Actual env files (gitignored) |
| `PHASE_00_COMPLETION_REPORT.md` … `PHASE_17_COMPLETION_REPORT.md` | Per-phase completion reports |
| `PHASE_01_GATE_REPORT.md` | Phase 1 gate-run detailed result |
| `PHASE_GATE_INDEX.md` | (Auto-generated) master phase status |
| `STATUS_REPORT.md` | Top-level phase status report |
| `SYSTEM_TEST_REPORT.md` | Latest system test findings (from current session) |
| `AUDIT_REPORT_MVP.html` | First-pass MVP audit (deprecated) |
| `AUDIT_REPORT.html` | Current comprehensive audit |
| `PROJECT_AUDIT_FUNCTIONS.md` | (This audit pack) Phase 1 inventory |
| `PROJECT_AUDIT_STRUCTURE.md` | (This audit pack) Phase 2 — this file |
| `PROJECT_AUDIT_FULL.md` | (This audit pack) Phase 3 deep-dive |

---

## B. `src/` — Frontend application (94 files)

### `src/` root (2 files)
- `main.tsx` — React entry; mounts `ThemeProvider` → `AppProviders` → `App`
- `App.tsx` — auth gating + `AppShell`/`AdminAppShell`/`AuthShell`/`CloudAuth`/`LockScreen` switch

### `src/components/pages/` (21 user pages)
| File | Purpose |
|---|---|
| `DashboardPage.tsx` | Main user dashboard — KPIs, charts, alerts, suggestions, top categories, account balances, card health, cashflow survival, emergency fund |
| `TransactionsPage.tsx` | Full transaction list with filters + bulk actions |
| `IncomePage.tsx` | Income-only filtered view |
| `ExpensesPage.tsx` | Expenses-only filtered view |
| `AccountsPage.tsx` | Bank/wallet account CRUD + balance breakdown |
| `CardsPage.tsx` | Credit card management — outstanding, available, utilization, statement, due date, risk |
| `LoansPage.tsx` | Personal loan tracking, EMI schedule, prepayment simulator |
| `UdhariPage.tsx` | Informal lending — people, given/received, ageing, WhatsApp reminders |
| `GoalsPage.tsx` | Savings goal CRUD + progress + monthly required |
| `BudgetsPage.tsx` | Budget envelopes + smart projections (Phase 10) |
| `InvestmentsPage.tsx` | Investment portfolio (nav key `savings`) |
| `CategoriesPage.tsx` | Category CRUD + cleanup panel + duplicate detection |
| `ReportsPage.tsx` | Custom reports + export tools |
| `AlertsPage.tsx` | Notifications + alert history |
| `ProfilePage.tsx` | User profile, mobile, email, avatar, security recovery |
| `SettingsPage.tsx` | App preferences, dashboard mode, chart accessibility, theme |
| `SubscriptionPage.tsx` | SaaS subscription + Razorpay checkout |
| `ExportPage.tsx` | Excel/JSON export wizard |
| `ImportPage.tsx` | Transaction import wizard (CSV/Excel) |
| `SuggestionsPage.tsx` | AI-suggestion list with severity + dismiss |
| `AuditPage.tsx` | Full transaction audit trail |

### `src/components/pages/admin/` (6 admin pages)
| File | Purpose |
|---|---|
| `AdminDashboardPage.tsx` | Admin overview KPIs |
| `UserManagementPage.tsx` | User list + toggle active + assign plan |
| `SubscriptionManagementPage.tsx` | Active subscriptions admin |
| `PlanManagementPage.tsx` | Plan CRUD + feature toggle |
| `BrandingSettingsPage.tsx` | App title, logo, theme colors |
| `FeatureFlagsPage.tsx` | Global feature flag toggler |

### `src/components/layout/` (8 files)
| File | Purpose |
|---|---|
| `AppShell.tsx` | User app shell — Sidebar + Header + page router + alerts drawer + command palette |
| `AdminAppShell.tsx` | Admin app shell — separate nav + admin pages |
| `Header.tsx` | Top bar — profile menu, alerts bell, theme switch, logout |
| `Sidebar.tsx` | Nav list + mobile nav |
| `PageHeader.tsx` | Per-page header (title, subtitle, actions) |
| `CommandPalette.tsx` | Cmd+K search |
| `AlertsDrawer.tsx` | Slide-out alerts panel |
| `ThemeSwitch.tsx` | Light/dark toggle |

### `src/components/ui/` (16 Radix-based primitives)
`Button`, `Card` (+ CardContent/Header/Title/Description/Footer), `Input`, `Label`, `Select`, `Dropdown`, `Checkbox`, `Switch`, `Tabs`, `Table`, `Badge`, `Progress`, `Toast`, `Dialog`, `ConfirmDialog`, `Sheet`.

### `src/components/forms/` (2 files)
- `QuickAddDialog.tsx` — fast modal entry (Phase 6 smart fields)
- `TransactionForm.tsx` — full conditional form with category/account/card requirements

### `src/components/auth/` (5 files)
`AuthShell` (wrapper), `CloudAuth` (sign-in + create-account), `AdminAuth`, `LockScreen` (PIN re-entry on resume), `ProfileLogin`.

### `src/components/{providers, charts, explain, theme, categories}/` (5 files)
- `providers/AppProviders.tsx` — global provider composition
- `charts/SafeChart.tsx` — recharts wrapper with error boundary
- `explain/ExplainMetricDrawer.tsx` — Phase 12 explain-this-number panel
- `theme/ThemeProvider.tsx` — theme context
- `categories/CategoryCleanupPanel.tsx` — Phase 12 dedupe / merge UI

### `src/services/` (29 files + `__tests__/`)
Pure business logic — see Phase 1 inventory for function list. Each engine: `calculations`, `financeEventBuilder`, `financeLedgerExplain`, `ledgerCalculations`, `accountBalanceEngine`, `cardEngine`, `loanEngine`, `loanPaymentSync`, `udhariEngine`, `goalEngine`, `emergencyFundEngine`, `smartBudgetEngine`, `cashflowSurvivalEngine`, `suggestionEngine`, `suggestionSync`, `suggestionAiExplain`, `categoryColorEngine`, `alertsEngine`, `businessPersonalSplit`, `caReports`, `personaEngine`, `planFeatureGate`, `transactionFormRules`, `transactionPreview`, `authService`, `defaultsService`, `demoData`, `refIntegrity`, `validators`.

### `src/lib/` (6 root files + `cloud/` 6 files)
- Root: `utils.ts`, `crypto.ts`, `format.ts`, `navRoutes.ts`, `apiClient.ts`, `migrateLegacyKeys.ts`
- `cloud/`: `auth.ts`, `http.ts`, `client.ts`, `repoClient.ts`, `saasClient.ts`, `collections.ts`

### `src/utils/` (3 files)
- `money.ts` — Phase 3 paise math + entity helpers
- `moneyEntityNormalize.ts` — Phase 3 entity migration normalizer
- `__tests__/money.test.ts` — Phase 3 unit tests

### `src/store/` (5 Zustand stores)
`authStore`, `dataStore`, `uiStore`, `navStore`, `cloudAppStore`.

### `src/db/` (1 file)
- `database.ts` — Dexie schema with 24 IndexedDB stores

### `src/types/` (1 file)
- `index.ts` — 40+ TS interfaces/types (Transaction, Account, Card, Loan, EMIPayment, Goal, GoalContribution, UdhariRecord, UdhariSettlement, Investment, SavingsContribution, Budget, Category, RecurringRule, AppAlert, AuditLog, AiSuggestion, FinancialEvent, FinancialEffect, etc.)

### `src/constants/` (1 file)
- `index.ts` — `PAYMENT_MODES`, `TRANSACTION_TYPES`, `DEFAULT_EXPENSE_CATEGORIES` (25 categories), `DEFAULT_INCOME_CATEGORIES` (12 categories), `AVATAR_EMOJIS`

### `src/exports/` (1 file)
- `xlsxExporter.ts` — `mapTransactionRow`, `buildCAWorkbook`, `buildFullDataWorkbook`, `downloadWorkbook`

### `src/styles/` (1 file)
- `globals.css` — Tailwind CSS base + custom utility classes

---

## C. `php/` — Backend (30 files)

### `php/` root (4 files)
- `index.php` — main router; dispatches to `routes.php`
- `routes.php` — `dispatch_request()` — long if/else mapping URIs to handlers
- `bootstrap_api.php` — boot sequence: request_id → security/CORS → http helpers → app config validate
- `dev-router.php` — dev `php -S` router; redirects non-API to Vite

### `php/config/` (2 files)
- `db.php` — `db_conn()` PDO factory
- `env.php` — `.env` parser + `env_value()` + `db_dsn()`

### `php/helpers/` (17 files)
| File | Purpose |
|---|---|
| `auth.php` | JWT HS256 + bcrypt PIN + login throttle |
| `app.php` | env validation + production secret guard + settings/flags helpers |
| `security.php` | CORS allow-list + client_ip detection + MySQL rate limit |
| `payments.php` | Razorpay client + HMAC verifications |
| `audit.php` | actor IP/UA + `audit_log_action()` |
| `http.php` | JSON request/response + bearer-token extract |
| `validate.php` | string/enum/decimal validators |
| `validator.php` | required-fields/enum/string-length helpers |
| `observability.php` | `request_log()` |
| `request_id.php` | `ensure_request_id()` + `structured_log()` (Phase 17) |
| `utils.php` | now_iso, uid, payload encode/decode, collection allowlist |
| `money_paise.php` | paise validation |
| `cloud_payload.php` | Phase 4 payload validation + hot-field extraction + UPSERT builders |
| `finance_events.php` | Phase 5 server-side ledger sync helpers |
| `billing.php` | Phase 14 renewal-start math + active price lookup + quotas + feature gate |
| `policy.php` | Phase 13 policy version + acceptance |
| `user_audit.php` | Phase 13 `user_audit_log()` (tolerates missing table) |

### `php/controllers/` (9 files)
| File | Purpose |
|---|---|
| `cloud.php` | register, login, admin-login, me, profile update, change-pin, security recovery setup/reset |
| `cloud_data.php` | sync pull/push + entity CRUD over `cloud_collection_rows` |
| `subscriptions.php` | plan list, create-order, confirm-payment, my, cancel |
| `payments.php` | `razorpay_webhook()` (Phase 1 hardened) |
| `admin.php` | dashboard, plans CRUD, settings, feature flags, users, subscriptions |
| `account.php` | Phase 1 data-export + account-delete |
| `policies.php` | Phase 13 current + accept |
| `public_config.php` | `/api/public/config` + `/api/health.php` |
| `imports.php` | bulk transaction import |

---

## D. `api/` — 40+ endpoint shims

Each `.php` file in `api/` is a 10-line dispatcher to one controller function. See Phase 1 inventory for the dispatch map.

| Subdirectory | Endpoints |
|---|---|
| `api/auth/` | login, register, admin-login, me, profile, change-pin, reset-pin, security-recovery, data-export, account |
| `api/cloud/` | register, login, me, entity, entity-item, sync/push, sync/pull |
| `api/subscriptions/` | plans, create-order, confirm-payment, my, cancel |
| `api/payments/razorpay/` | webhook |
| `api/admin/` | dashboard, users, users-assign-plan, users-toggle-active, plans, subscriptions, settings, feature-flags |
| `api/policies/` | current, accept |
| `api/public/` | config |
| `api/import/` | transactions |
| `api/` (root) | health.php |

---

## E. `sql/` — Database schema + migrations

### `sql/` root (9 files)
- `SPAROWVAULT_FULL_DATABASE.sql` — **The complete bootstrap file** (29 tables + seed data + 12 phase markers)
- `SPAROWVAULT_FULL_DATABASE_GUIDE.md` — step-by-step phpMyAdmin import guide
- `production_schema.sql` — earlier production schema (now superseded)
- `final_schema.sql` — compatibility layer with `audit_logs` + `schema_version`
- `schema.sql` — original bootstrap schema
- `20260427_p0_saas_mvp.sql` — Phase 0 MVP base
- `20260427_p0_seed.sql` — Phase 0 seed (plans, flags, settings)
- `20260427_p0_rollback.sql` — Phase 0 rollback
- `20260427_all_in_one.sql` — Phase 0 + 1 (deprecated)
- `20260501_sql_only_full.sql` — single-file full schema (deprecated)

### `sql/migrations/` (17 files)
Per-phase migrations + rollbacks:
- `phase_01_security.sql` + `_rollback.sql`
- `phase_03_cloud_amount_paise.sql`
- `phase_04_indexed_sync_fields.sql`
- `phase_05_financial_ledger.sql`
- `phase_07_user_credit_cards.sql`
- `phase_08_user_loans.sql`
- `phase_09_udhari_engine.sql`
- `phase_11_ai_suggestions.sql`
- `phase_13_privacy_audit.sql` + `_rollback.sql`
- `phase_14_saas_billing.sql` + `_rollback.sql`
- `all_phases_combined.sql` + `_rollback.sql` — DELIMITER-using combined migration
- `IMPORT_VIA_PHPMYADMIN.sql` — V1 (had IF() parser bug)
- `IMPORT_VIA_PHPMYADMIN_V2.sql` — V2 (uses native `ADD COLUMN IF NOT EXISTS`)
- `PHPMYADMIN_IMPORT_GUIDE.md` + `PHPMYADMIN_FIX_GUIDE.md` + `README.md` — guides

---

## F. `scripts/` — Build / test / migrate (30 files)

### `scripts/` root
- `clean-build.mjs` — prebuild cleanup
- `package-hosting.mjs` — Phase 1 hardened bundle packager (strips secrets, source maps, node_modules)
- `generate-audit-docx.mjs` — Word audit report builder
- `check-php-syntax.mjs` — walks `php/` + `api/` running `php -l`
- `sql-dry-run.mjs` — static SQL report + optional live BEGIN/ROLLBACK
- `db-test-reset.mjs` — drop + re-apply schema to `*_test` DB
- `db-test-seed.mjs` — load 8 fixture users
- `test-browser-auto.mjs` — automated browser test
- `restore-drill.mjs` — Phase 17 backup restore drill
- `backup_db.php`, `backup_json.php`, `reset_admin_pin.php`, `retention-sweeper.php`, `backfill_financial_ledger.php`

### Phase gate runners (18 files)
- `phase-00-gate.mjs` … `phase-17-gate.mjs` — per-phase code-side gates
- `phase-all-gates.mjs` — orchestrator (stops on first failure or `--continue`)
- `scripts/lib/gate-runner.mjs` — shared helpers (`fileExists`, `vitestFile`, `runGate`)

---

## G. `tests/` — Test harness

### `tests/` root (e2e)
- `api-e2e.mjs` — REST API regression
- `webhook-replay-e2e.mjs` — Razorpay webhook replay/idempotency
- `webhook-ownership-e2e.mjs` — Phase 1 ownership validation matrix (5 scenarios)
- `account-endpoints-e2e.mjs` — Phase 1 export/delete (5 scenarios)
- `browser-e2e.mjs`, `browser-cloud-e2e.mjs`, `browser-deep-e2e.mjs` — Playwright browser tests
- `phase-04-validation-e2e.mjs` — Phase 4 payload validation matrix (11 scenarios)

### `tests/unit/` (Vitest)
- `smoke.test.ts` — harness smoke
- `phase-01-secrets.test.ts` — Phase 1 verification
- `categoryColorEngine.test.ts` — Phase 12 color uniqueness
- `suggestionEngine.test.ts` — Phase 11 suggestion correctness

### `src/services/__tests__/` (Vitest)
- `calculations.characterization.test.ts` — Phase 0 baseline
- `cardEngine.test.ts`, `loanEngine.test.ts`, `accountBalanceEngine.test.ts`, `transactionFormRules.test.ts`, `phase10Engines.test.ts`, `ledger.scenarios.test.ts`, `businessPersonalSplit.test.ts`, `personaEngine.test.ts`, `planFeatureGate.test.ts`

### `src/utils/__tests__/`
- `money.test.ts` — Phase 3 paise round-trip + EMI textbook values

### `tests/fixtures/users/` (Phase 0 fixtures)
- `_types.ts`, `index.ts`, `01-cash-account.ts`, `02-bank-account.ts`, `03-credit-card.ts`, `04-personal-loan.ts`, `05-udhari-receivable.ts`, `06-udhari-payable.ts`, `07-goal.ts`, `08-income-and-budgets.ts`

---

## H. `docs/` — Documentation

### `docs/` root
- `incident-playbook.md` — on-call incident response
- `setup-and-launch-guide.md` — deploy steps
- `mobile-android-ios-plan.md` — mobile roadmap
- `phase-completion-template.md` — phase report template
- `finance-correctness-test-plan.md` — money-correctness contract
- `backup-checklist.md` — A-F backup rituals
- `production-secrets.md` — Phase 1 secret rotation guide
- `launch-checklist.md` — Phase 17 launch checklist (11 sections)
- `staging-setup.md` — Phase 17 staging mirror recipe

### `docs/phase-reports/`
- `INDEX.md`, `phase-00.md`, `phase-01-manual-checklist.md`

---

## I. `.github/workflows/`
- `ci.yml` — typecheck + lint + Vitest + PHP `-l` + Vite build + bundle scan + Phase 0/1/2 gate + Phase 3-17 gates + `required:` blocker
- `phase-e2e.yml` — manual-dispatch staging e2e workflow

---

## J. `public/` (6 static assets)
`favicon.ico`, `file.svg`, `globe.svg`, `next.svg`, `vercel.svg`, `window.svg`

---

## K. Other / gitignored
- `data/` — local SQLite (legacy), rate limit cache
- `node_modules/` — deps
- `dist/` — Vite build output
- `release/hosting-bundle*/` — shipped artifacts (copies of php/)
- `backups/` — local DB backups
- `.claude/` — Claude session artifacts

---

## DATABASE SCHEMA — 29 tables

### CORE IDENTITY + ENTITY STORAGE (2)

#### 1. `users` — Central user store (24 columns)
PK `id` VARCHAR(191) · UNIQUE `username` VARCHAR(24) · `display_name`, `pin_hash`, `pin_salt`, `role` ENUM(user/admin), `is_active`, `mobile`, `email`, `avatar_emoji`, `avatar_color`, `must_change_pin`, `deleted_at`, `deleted_reason`, `last_policy_check_at`, `mobile_e164`, `email_lc`, `last_login_at`, `created_at`, `updated_at`.
Indexes: PK · uq_users_username · idx_users_role_active · idx_users_created_at · idx_users_deleted.

#### 2. `cloud_collection_rows` — Generic JSON entity store + Phase 3+4 hot columns (24 columns)
PK `id` · FK `user_id` → users · `collection_name`, `entity_id`, `payload LONGTEXT`, `amount_paise BIGINT`, 14 hot columns (`schema_version`, `txn_local_date`, `txn_month`, `txn_type`, `payment_mode`, `category_id`, `account_id`, `card_id`, `loan_id`, `goal_id`, `udhari_id`, `business_or_personal`, `source_device_id`, `payload_hash`), `updated_at`, `deleted_at`, `created_at`.
12 indexes including UNIQUE(user_id, collection_name, entity_id) + 6 hot-field composite indexes.

### PHASE 5 — FINANCIAL LEDGER (2)

#### 3. `financial_events` — Canonical money-movement ledger (14 columns)
PK `id` · FK `user_id` · UNIQUE(user_id, source_transaction_id) · `event_type`, `event_date`, `amount_paise`, `currency CHAR(3)`, `description`, `source`, `status`, `reversal_of_event_id`, audit timestamps.

#### 4. `financial_effects` — Per-target deltas per event (9 columns)
PK `id` · FK `event_id` → financial_events · FK `user_id` · `target_type` (account/credit_card/loan/goal/udhari_person/investment/income_category/expense_category/fee/tax) · `target_id`, `effect_direction` ENUM(increase/decrease), `amount_paise`, `component` (cash/income/expense/principal/interest/penalty/fee/tax/liability/asset/receivable/payable).

### PHASE 7 — CARD SHADOW (1)

#### 5. `user_credit_cards` (19 columns) — credit_limit_paise, current_outstanding_paise, unbilled, statement_balance, minimum_due, statement_day, due_day, last_statement_date, next_due_date, interest_rate_bps, annual_fee_paise, is_active, deleted_at.

### PHASE 8 — LOAN SHADOW + EMI LEDGER (2)

#### 6. `user_loans` (24 columns) — principal_sanctioned_paise, disbursed, current_principal, annual_interest_bps, interest_type, emi_amount_paise, tenure months, start/first_emi/due_day, processing/insurance fees, prepayment flags, status, lifecycle_mode, soft-delete.

#### 7. `user_loan_payments` (18 columns) — per-month EMI line: due_month CHAR(7), due_date, paid_date, scheduled_emi, actual_paid, principal/interest components, penalty, fee, extra_principal, opening/closing principal, status.

### PHASE 9 — UDHARI (3)

#### 8. `udhari_people` (11 columns) — display_name, phone_hash (opaque), relationship, total_receivable/payable_paise, risk_level.

#### 9. `udhari_entries` (10 columns) — direction ENUM(given/received), amount_paise, due_date, settlement_status, notes, linked_transaction_id.

#### 10. `udhari_settlements` (9 columns) — settlement_date, account_id (NULL=write-off), notes; FK to people + entries.

### PHASE 11 — AI SUGGESTIONS (1)

#### 11. `ai_suggestions` (19 columns) — dedupe_key, suggestion_type, severity, title, reason, calculation_inputs_json JSON, recommended_action, expected_impact_json JSON, confidence_score DECIMAL(4,3), source_module, status, ai_explanation, remind_at, expires_at, soft-delete.

### BILLING (5)

#### 12. `plans` (10 columns) — code UNIQUE, name, description, price_inr DECIMAL(10,2), billing_interval ENUM(monthly/yearly), trial_days, is_active, sort_order.

#### 13. `plan_features` (8 columns) — plan_id FK, feature_key, is_enabled, limit_value BIGINT (Phase 14 quota), limit_unit (per_month/per_day/total/mb/seconds).

#### 14. `plan_prices` (8 columns) — Phase 14 append-only price history: plan_id FK, amount_paise, currency, billing_interval, starts_at, ends_at, notes.

#### 15. `subscriptions` (21 columns) — status ENUM(pending/trial/active/past_due/cancelled/expired), period start/end, **Phase 14 fairness fields** (`previous_period_end`, `renewed_from_subscription_id`, `scheduled_plan_id`, `scheduled_change_at`), cancel_at_period_end, cancelled_at, provider, provider_subscription/customer/order_id, notes. FK user + plan.

#### 16. `payments` (16 columns) — user_id, subscription_id, amount_inr, currency, **Phase 1 `expected_amount_paise`**, status ENUM(created/authorized/captured/failed/refunded), provider, provider_order/payment/signature, failure_reason, refund_id, paid_at. **Phase 1 UNIQUE indexes**: (provider, provider_order_id) and (provider, provider_payment_id).

#### 17. `webhook_events` (11 columns) — provider, **UNIQUE event_id** (idempotency), event_type, signature_valid, payload_json LONGTEXT, processing_status ENUM(pending/processed/failed), processed_at, error_message, retry_count.

### CONFIG + FLAGS + AUDIT (4)

#### 18. `app_settings` (7 columns) — setting_key UNIQUE, setting_value LONGTEXT JSON, is_public, updated_by_user_id FK.

#### 19. `feature_flags_global` (7 columns) — feature_key UNIQUE, is_enabled, description, updated_by_user_id FK.

#### 20. `admin_audit_logs` (11 columns) — actor_user_id (NULL = system), actor_role, action_key, entity_type/id, before/after_json LONGTEXT, ip_address, user_agent, created_at. **Immutable** (no DELETE path in code).

#### 21. `audit_logs` (11 columns) — same shape as admin_audit_logs. General-purpose action log used by `audit_log_action()`. Phase 13 cover for environments seeded from older schemas.

### SECURITY UTILITY (3)

#### 22. `login_attempts` (7 columns) — username + ip_address (UNIQUE composite), attempt_count, locked_until, first_attempt_at, updated_at. Brute-force protection.

#### 23. `api_rate_limits` (5 columns) — bucket_key UNIQUE (`bucket_name|ip`), hit_count, window_start, updated_at. Phase 1 atomic ON DUPLICATE KEY UPDATE.

#### 24. `user_security_recovery` (5 columns) — user_id PK + FK, security_question, security_answer_hash, audit timestamps.

### PHASE 13 — PRIVACY + AUDIT (3)

#### 25. `user_policy_acceptances` (9 columns) — user_id FK, policy_key (terms/privacy/cookie/data_processing), version (semver or date), accepted_at, ip_address, user_agent, withdrawn_at. UNIQUE(user_id, policy_key, version).

#### 26. `user_audit_logs` (11 columns) — per-user state-change trail; identical shape to admin_audit_logs but FK to users (not actor). request_id field added for traceability.

#### 27. `retention_jobs` (7 columns) — job_key, started_at, finished_at, rows_swept, status ENUM(running/ok/failed), error_message, notes_json. Used by `scripts/retention-sweeper.php`.

### LEGACY + BOOKKEEPING (2)

#### 28. `cloud_users` (7 columns) — legacy table preserved for migration. Bootstrap SQL copies missing rows into `users`.

#### 29. `schema_version` (2 columns) — version_key PK, applied_at TIMESTAMP. **12 phase markers seeded**:
`phase_00_baseline_2026_05_13`, `phase_01_security`, `phase_03_cloud_amount_paise`, `phase_04_indexed_sync_fields`, `phase_05_financial_ledger`, `phase_07_user_credit_cards`, `phase_08_user_loans`, `phase_09_udhari_engine`, `phase_11_ai_suggestions`, `phase_13_privacy_audit`, `phase_14_saas_billing`, `phase_full_database_bootstrap`.

---

## DB SEED DATA

| Table | Rows seeded | Notes |
|---|---|---|
| `plans` | 4 — FREE (₹0), BASIC (₹299/mo), PRO (₹799/mo), PRO_YEARLY (₹7,999/yr) | trial_days: 0/7/7/14 |
| `plan_features` | 24 base rows + 8 quota rows | exports/advanced_reports/alerts/import/udhari/ca_reports + max_transactions_per_month + max_exports_per_month |
| `plan_prices` | 4 — one snapshot per plan, in paise | append-only history |
| `feature_flags_global` | 9 — exports, advanced_reports, alerts, admin_panel, branding, import, subscriptions, ca_reports, ai_suggestions | |
| `app_settings` | 8 — app_title, logo_url, favicon_url, support_email, privacy_url, terms_url, theme_accent, theme_primary | |
| `users` (seed admin) | 1 — `admin`/`12345678`/`must_change_pin=1` | bcrypt hash baked in |
| `schema_version` | 12 phase markers | |
| `cloud_users` migration | INSERT … SELECT into `users` WHERE NOT EXISTS | zero-downtime legacy cutover |

---

## Engine + charset

Every table: `ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`.

## Foreign key count

24 FK relationships. Cascade-on-delete for user-owned tables; SET NULL for `updated_by_user_id`; RESTRICT for `subscriptions.plan_id` to prevent orphan billing.

## Index count

95+ composite/single-column indexes. Hot paths covered: per-user transaction filtering, monthly category aggregation, due-date sweeps, webhook idempotency, brute-force tracking.
