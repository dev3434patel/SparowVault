# Current Full A-to-Z Audit Report

## Current Update - 11 September 2026

The fresh current-working-tree audit is [FULL-PROJECT-AUDIT-2026-09-11.md](FULL-PROJECT-AUDIT-2026-09-11.md), with [endpoint details](API-AUDIT-2026-09-11.md), [function/action/field/collection catalog](FULL-AUDIT-CATALOG-2026-09-11.md) and [executed evidence](audit-evidence/2026-09-11-full/README.md). It records 410 passing unit tests and repaired core integrity/session/statement paths, but **27 current findings: 0 confirmed Critical, 15 High, 10 Medium and 2 Low**. Production and unreviewed CA sharing remain **NO-GO**. Historical totals and runtime versions below describe 10 September, not today's tested build. They are preserved for traceability and must not be combined with the new totals.

---

## Historical Audit - 10 September 2026

Audit date: 10 September 2026 (Asia/Kolkata). Repository: SparowVault. Baseline HEAD: `54eec068a37cceb9cccc2a63dca824e1e092f52e`. Scope includes the pre-existing local modifications. This is an audit-only deliverable, not a remediation or production certificate.

## 1. Executive Summary

**Verdict: NOT PRODUCTION READY.** This is the supplied SparowVault repository, but it is a personal-finance product, not the complete SparowFinanceOS agency system described in the brief. The user explicitly approved auditing this repository against that brief. Missing agency modules are recorded as missing, not silently substituted with personal-finance analogues.

The audit identified **39 findings: 2 Critical, 21 High, 14 Medium and 2 Low**. The most serious are unsynced-data loss, duplicate concurrent mutations, partial sync commits, broken restore links, incomplete wipes, PIN/session failures and incorrect CA/report outputs. Severity totals count distinct findings once; dependency advisories and feature gaps are separate inventories.

Typecheck/build/PHP syntax pass. The clean real unit run has **307 passing and 4 failing tests across 49 suites**. Core API tests pass 65/65, but custom probes reproduce failures those tests missed. Thirty routes were inspected at ten widths each with gated states identified. No honest finite audit can guarantee perfection or claim unexecuted combinations are covered.

**Change boundary:** no application fixes, tracked source/config changes, commits, pushes, deployment, real database reset or real payment were performed during this audit. New reports/evidence and temporary test harnesses were created, the production build output was regenerated, and a disposable local audit database was used. Existing uncommitted user changes and historical reports were preserved.

Supporting reports:

- [docs/MODULE-WISE-AUDIT.md](</Volumes/ssd12/SparowVault/230826 SparowVault/docs/MODULE-WISE-AUDIT.md>)
- [docs/API-AUDIT.md](</Volumes/ssd12/SparowVault/230826 SparowVault/docs/API-AUDIT.md>)
- [docs/UI-UX-AUDIT.md](</Volumes/ssd12/SparowVault/230826 SparowVault/docs/UI-UX-AUDIT.md>)
- [docs/FINANCE-CALCULATION-AUDIT.md](</Volumes/ssd12/SparowVault/230826 SparowVault/docs/FINANCE-CALCULATION-AUDIT.md>)
- [docs/RBAC-SECURITY-AUDIT.md](</Volumes/ssd12/SparowVault/230826 SparowVault/docs/RBAC-SECURITY-AUDIT.md>)
- [docs/BUGS-AND-GAPS-REPORT.md](</Volumes/ssd12/SparowVault/230826 SparowVault/docs/BUGS-AND-GAPS-REPORT.md>)
- [docs/TESTING-COVERAGE-REPORT.md](</Volumes/ssd12/SparowVault/230826 SparowVault/docs/TESTING-COVERAGE-REPORT.md>)
- [docs/PRODUCTION-READINESS-REPORT.md](</Volumes/ssd12/SparowVault/230826 SparowVault/docs/PRODUCTION-READINESS-REPORT.md>)

## 2. Project Identity

| Item | Observed value |
| --- | --- |
| Requested product/company | SparowFinanceOS / SparowTech Solution LLP, supplied in the brief. Company-wide ERP behavior is not evidenced by this repo. |
| Repository product | SparowVault / Personal Finance OS; package sparowvault version 0.1.0. |
| Repository | https://github.com/dev3434patel/SparowVault.git |
| Workspace | /Volumes/ssd12/SparowVault/230826 SparowVault |
| Branch / commit | master / 54eec068a37cceb9cccc2a63dca824e1e092f52e |
| Latest remote verification | git ls-remote origin refs/heads/master returned the same 54eec068a37cceb9cccc2a63dca824e1e092f52e during this audit. No newer master commit to pull. Other branches were not merged. |
| Local modifications present before audit | README.md; docs/HOSTING_DEPLOY.md; package.json; scripts/package-hosting.mjs; scripts/sql-dry-run.mjs; sql/HOSTING_READY_CLEAN_IMPORT.sql; tests/sql-smoke.php; vite.config.ts. Untracked SQL and AppleDouble files also pre-existed. |
| Runtime versions observed | Node 20.20.2; PHP 8.5.4; MariaDB 10.4.28; React 19.2.4; Vite 5.4.21; Vitest 2.1.9. |
| Current local app | http://localhost:5173/ and API http://localhost:8080/api/health.php; health database status ok. |
| XAMPP | Apache/ProFTPD reported running. MySQL PID status command lacked permission; actual database connection through API succeeded. |
| Production URL | No verified public production endpoint in this audit; no public deployment claim. |
| Documented local seed login | Admin username admin, PIN 12345678 in docs/HOSTING_DEPLOY.md; verified only against isolated test seed. Never treat this as a production credential or safe deployment default. |
| Earlier user login context | A codexdemo local account with PIN 583921 was reported by preceding setup work. It was not needed or reverified for this audit; use the known local login flow or create a fresh local profile. |

## 3. Architecture Audit

| Area | Observed design and assessment |
| --- | --- |
| Frontend | React 19 / TypeScript / Vite 5, Tailwind 4, Radix UI, Lucide, Recharts, Zustand. Manual pathname/pushState navigation with a canonical route registry and shell switches. |
| Backend | PHP controllers/helpers via api/*.php wrappers and legacy dispatcher. PDO to MariaDB. Express/JWT JS dependencies do not make the active server an Express backend. |
| Data | 37 cloud contracts stored primarily in JSON rows with indexed hot fields; separate relational auth/billing/policy/audit/financial ledger tables. Dexie class declares 40 stores: cloud-related stores plus users, sessions and AI suggestions. |
| Authentication | JWT + database active-user lookup, bcrypt PIN hash, HttpOnly cookie and bearer API transport; weak revocation/recovery/forced-rotation semantics confirmed. |
| RBAC | Platform user/admin and limited household roles only; no organization/agency permission system. |
| Uploads/storage | Browser spreadsheet/JSON input; attachment metadata contract. No Vercel Blob integration or complete private document storage service found. |
| Exports | SheetJS client XLSX/CSV, JSON profile backup, server account-data export; these are separate formats/contracts and cannot substitute for each other. |
| AI | Deterministic finance suggestion engines; optional VITE_SUGGESTION_EXPLAIN_URL rewrites validated explanations. No external LLM call made. |
| Notifications | Computed in-app alerts/reminders. No verified mail/SMS/push worker/provider workflow. |
| Testing | Vitest pure-function tests plus Node/Playwright/PHP/SQL/custom phase scripts. Some tests are static checks or flawed smoke assertions. |
| Deployment | Vite build + PHP/Apache packaging, .htaccess protections, env guards and local XAMPP DB. Actual public hosting security not verified. |
| Main risks | Dual financial representations, non-atomic generic writes, incomplete client sync/recovery, partial contract enforcement, mutable user audit and report-definition duplication. |

### Source inventory

| Inventory metric | Count / definition |
| --- | --- |
| Scanned code/schema/test/config files | 393 under src/api/php/tests/scripts/sql; metadata/dependencies/build/release artifacts excluded. |
| Runtime/script source files | 282 in that scan; not a count of every repository file. |
| Page components | 31; 30 routes plus Investments child page. |
| API entry files | 40 PHP files; 58 method/file pairs plus legacy path aliases. |
| Services / PHP helpers | 45 service files; 19 PHP helper files. |
| Named function definitions | 987 TS/PHP named declarations; anonymous callbacks excluded. |
| Source action definitions | 313; rendered repeated rows not multiplied. |
| Tests | 49 real unit files; 66 detected unit/runtime/PHP smoke entries. |
| Sync / local stores | 37 cloud contracts; 40 declared Dexie tables. |
| Current database metadata | 30 tables and 351 columns, metadata only. |
| TODO/FIXME/HACK markers | 0 matches in scanned sources; zero markers does not mean zero unfinished features. |

Source hashes and AST inventory: [source-inventory.json](</Volumes/ssd12/SparowVault/230826 SparowVault/docs/audit-evidence/2026-09-10/source-inventory.json>). Functions: [FUNCTION-INVENTORY.md](</Volumes/ssd12/SparowVault/230826 SparowVault/docs/audit-evidence/2026-09-10/FUNCTION-INVENTORY.md>). Actions: [ACTION-INVENTORY.md](</Volumes/ssd12/SparowVault/230826 SparowVault/docs/audit-evidence/2026-09-10/ACTION-INVENTORY.md>). Keyword leads including placeholders/demo/localStorage: [KEYWORD-INVENTORY.md](</Volumes/ssd12/SparowVault/230826 SparowVault/docs/audit-evidence/2026-09-10/KEYWORD-INVENTORY.md>). Keyword matches are not automatically defects.

### Data flow and ownership

User action -> page/dialog validation -> repository -> PHP auth/tenant/validation -> JSON row and optional financial event/effect helpers -> response -> IndexedDB mirror -> Zustand/derived views. Some failures fall back to local success, and subsequent cloud list replacement deletes unsynced data. There is no reliable payload replay queue. The frontend computes ledger effects while SQL also stores financial events/effects; consistency must be transactional and cross-implementation tested.

## 4. Full Module Inventory

| Brief module | Status against brief | Actual implementation / gap | Primary UI |
| --- | --- | --- | --- |
| Dashboard | Partial | Personal cashflow/debt/goals overview exists, not an agency accrual/GST/project dashboard. | [src/components/pages/DashboardPage.tsx](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/DashboardPage.tsx>) |
| AI Insights | Partial | Deterministic suggestions and optional external explanation endpoint; not an autonomous agency finance assistant. | [src/components/pages/SuggestionsPage.tsx](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/SuggestionsPage.tsx>) |
| Clients | Not implemented | No client master, GSTIN/contact lifecycle or client-specific ACL. | No matching route/model/API found |
| Quotations | Not implemented | No quotation model, wizard, pricing lifecycle, acceptance or conversion. | No matching route/model/API found |
| Invoices | Not implemented | No invoice numbering, line items, GST totals, invoice lifecycle or PDF/DOCX. | No matching route/model/API found |
| Receipts | Not implemented | Transactions are not numbered payment receipts linked to invoices. | No matching route/model/API found |
| Receivables | Partial analogue | Udhari supports informal lending/settlements, not invoice receivables. | [src/components/pages/UdhariPage.tsx](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/UdhariPage.tsx>) |
| Projects | Not implemented | No project, milestone, scope, cost-center or project-margin ledger. | No matching route/model/API found |
| Payments | Partial analogue | Personal payment transactions and separate SaaS subscription checkout; no client payment approval/proof workflow. | [src/components/pages/TransactionsPage.tsx](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/TransactionsPage.tsx>) |
| Expenses | Partial | Personal expense CRUD, classification and flags exist; no draft/submit/approve/pay agency lifecycle. | [src/components/pages/ExpensesPage.tsx](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/ExpensesPage.tsx>) |
| Vendors | Not implemented | Merchant text is not a vendor master, payable schedule or vendor ledger. | No matching route/model/API found |
| GST Register | Partial flags only | GST/bill flags and export sheet; no tax computation, input credit, return ledger or payment proof. | [src/components/pages/ExportPage.tsx](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/ExportPage.tsx>) |
| Partner Profit | Not implemented | Household members are not equity partners or distribution snapshots. | No matching route/model/API found |
| Partner Payouts | Not implemented | No profit/cash eligibility engine, approval or payout ledger. | No matching route/model/API found |
| Subscriptions | Partial analogue | Platform plans/subscriptions and personal recurring rules; not agency AMC/retainer invoicing. | [src/components/pages/SubscriptionPage.tsx](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/SubscriptionPage.tsx>) |
| Other Income | Partial | Generic income classification exists without agency revenue recognition. | [src/components/pages/IncomePage.tsx](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/IncomePage.tsx>) |
| Adjustments | Partial | Transaction adjustment intent exists; no approved journal voucher or close-period controls. | [src/components/pages/TransactionsPage.tsx](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/TransactionsPage.tsx>) |
| Admin Usage | Partial analogue | Platform administration and billing limits; no allocatable administrative-charge ledger. | [src/components/pages/admin/AdminDashboardPage.tsx](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/admin/AdminDashboardPage.tsx>) |
| Budgets | Partial | Personal category budgets and recommendations exist, not project/cost-center approval budgets. | [src/components/pages/BudgetsPage.tsx](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/BudgetsPage.tsx>) |
| Reports | Partial with defects | Personal reports implemented and plan-gated; known finance/export inconsistencies. | [src/components/pages/ReportsPage.tsx](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/ReportsPage.tsx>) |
| CA Export Center | Partial with defects | Client-generated Excel/CSV/JSON and history; no signed CA pack/wizard/document ZIP. | [src/components/pages/ExportPage.tsx](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/ExportPage.tsx>) |
| Documents | Metadata only | Attachment collection exists; no complete private upload/download/document lifecycle. | No matching route/model/API found |
| Month Close | Not implemented | No period lock, reopen approval or immutable close snapshot. | No matching route/model/API found |
| Approvals | Not implemented | No maker-checker workflow, approval queue or separation of duties. | No matching route/model/API found |
| Audit Logs | Partial with integrity gap | User activity collection and separate SQL security/admin logs; not an immutable unified audit UI. | [src/components/pages/AuditPage.tsx](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/AuditPage.tsx>) |
| Settings | Implemented for personal scope | Preferences, backups/demo/reset-related flows; agency company/tax/approval settings absent. | [src/components/pages/SettingsPage.tsx](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/SettingsPage.tsx>) |
| Users / Roles | Partial | Platform user/admin management plus limited household role records; not the nine-role agency model. | [src/components/pages/admin/UserManagementPage.tsx](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/admin/UserManagementPage.tsx>) |
| Notification Center | Partial | In-app computed alerts/reminders; no verified email/SMS/push delivery service. | [src/components/pages/AlertsPage.tsx](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/AlertsPage.tsx>) |
| Global Search / Command Palette | Partial | Navigation/actions and text search over first 80 loaded transactions; no complete indexed global search. | [src/components/pages/../layout/CommandPalette.tsx](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/layout/CommandPalette.tsx>) |
| Hidden / Internal | Implemented services, partial wiring | 37 sync contracts, card/EMI/refund engines, wealth/household/reconciliation data, admin feature flags. | [src/components/pages/WealthHubPage.tsx](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/WealthHubPage.tsx>) |

## 5. Module-Wise Deep Audit

[docs/MODULE-WISE-AUDIT.md](</Volumes/ssd12/SparowVault/230826 SparowVault/docs/MODULE-WISE-AUDIT.md>) contains 31 concrete page/component profiles covering purpose/status, data sources, imports, selectors, UI sections, fields, action handlers, validation, empty/loading/error behavior, permissions, PIN, audit, mobile evidence, bugs, missing features and existing/missing tests. All 37 sync contracts are tabulated with required/hot fields and migration metadata. These are source traces and observed states, not a claim that every rendered action was completed.

## 6. Page-Wise UI Audit

| Route | State actually observed | Viewport observations |
| --- | --- | --- |
| / | Good afternoon, Audit. | 10 |
| /transactions | All Transactions | 10 |
| /income | Income | 10 |
| /expenses | Expenses | 10 |
| /budgets | Budget Planner | 10 |
| /goals | Goals & Planned Purchases | 10 |
| /accounts | Accounts | 10 |
| /cards | Cards | 10 |
| /loans | Loans & EMI | 10 |
| /udhari | Udhari & Advances | 10 |
| /savings | Wealth & assets | 10 |
| /categories | Categories | 10 |
| /reports | Reports & Analytics (upgrade gate) | 10 |
| /suggestions | Suggestion center; Top 3 actions today; Urgent; Dismissed & history | 10 |
| /export | Export Center | 10 |
| /import | Import Center | 10 |
| /bills | Bill calendar | 10 |
| /reconciliation | Reconciliation | 10 |
| /household | Household dashboard | 10 |
| /alerts | Alerts Center | 10 |
| /settings | Settings | 10 |
| /profile | Profile & Security | 10 |
| /audit | Audit & Backup | 10 |
| /subscription | Good afternoon, Audit. (feature-disabled fallback) | 10 |
| /admin | Admin Dashboard | 10 |
| /admin/users | User Management | 10 |
| /admin/plans | Plan Management | 10 |
| /admin/subscriptions | Admin Dashboard (feature-disabled fallback) | 10 |
| /admin/flags | Feature Flags | 10 |
| /admin/branding | Branding Settings | 10 |

All sampled document widths fit; see [docs/UI-UX-AUDIT.md](</Volumes/ssd12/SparowVault/230826 SparowVault/docs/UI-UX-AUDIT.md>) for screen sizes, screenshots, accessible-name candidates and explicit visual limitations. The paid populated Reports interface was not certified by its gated screenshot.

## 7. Button and Action Audit

[ACTION-INVENTORY.md](</Volumes/ssd12/SparowVault/230826 SparowVault/docs/audit-evidence/2026-09-10/ACTION-INVENTORY.md>) lists all 313 extracted action definitions. Per-page action/field/persistence tables are in the module report. Actual completed browser checks included registration, one account creation, XLSX download/parse, command palette inspection, mobile quick-add open/Escape and real repository offline-loss behavior. Extra tests used the actual backup-restore and profile-wipe UI and found B38/B39. Existing smoke suites add selected transaction/profile paths, but some assertions are click-only.

Financial/destructive actions need final-state assertions across API, SQL ledger, local cache and audit, not just a toast. No blanket claim of every-button success is made.

## 8. API Audit

| Path | Methods | Authorization | Controller functions | CSRF helper reachable |
| --- | --- | --- | --- | --- |
| /api/admin/dashboard.php | GET | admin | admin_dashboard | No |
| /api/admin/feature-flags.php | GET, PUT, POST | admin | admin_feature_flags_get, admin_feature_flags_put | No |
| /api/admin/plans.php | GET, POST, PUT | admin | admin_plans_list, admin_plans_upsert | No |
| /api/admin/settings.php | GET, PUT, POST | admin | admin_settings_get, admin_settings_put | No |
| /api/admin/subscriptions.php | GET, POST | admin | admin_subscriptions_list, admin_subscription_action | No |
| /api/admin/users-assign-plan.php | POST | admin | admin_assign_plan | No |
| /api/admin/users-reset-pin.php | POST | admin | admin_reset_user_pin | No |
| /api/admin/users-toggle-active.php | POST | admin | admin_toggle_user_active | No |
| /api/admin/users.php | GET | admin | admin_users_list | No |
| /api/auth/account.php | DELETE, POST | active user | account_delete | No |
| /api/auth/admin-login.php | POST | public (admin-login verifies admin credentials) | cloud_admin_login | No |
| /api/auth/change-pin.php | POST | active user | cloud_change_pin | No |
| /api/auth/data-export.php | POST | active user | account_data_export | No |
| /api/auth/login.php | POST | public (admin-login verifies admin credentials) | cloud_login | No |
| /api/auth/logout.php | POST | active user | cloud_logout | No |
| /api/auth/me.php | GET | active user | cloud_me | No |
| /api/auth/profile.php | PATCH | active user | cloud_profile_update | No |
| /api/auth/register.php | POST | public (admin-login verifies admin credentials) | cloud_register | No |
| /api/auth/reset-pin.php | POST | active user | cloud_reset_pin_with_security | No |
| /api/auth/security-recovery.php | POST | active user | cloud_set_security_recovery | No |
| /api/cloud/entity-item.php | GET, PATCH, DELETE | active user | cloud_entity_get_one, cloud_entity_patch_one, cloud_entity_delete_one | No |
| /api/cloud/entity.php | GET, POST, PATCH, DELETE | active user | cloud_entity_list, cloud_entity_create, cloud_entity_delete_bulk, cloud_entity_patch_many | No |
| /api/cloud/login.php | POST | public (admin-login verifies admin credentials) | cloud_login | No |
| /api/cloud/me.php | GET | active user | cloud_me | No |
| /api/cloud/register.php | POST | public (admin-login verifies admin credentials) | cloud_register | No |
| /api/cloud/sync/pull.php | GET | active user | cloud_sync_pull | No |
| /api/cloud/sync/push.php | POST | active user | cloud_sync_push | Yes on at least one branch; see caveats |
| /api/data/entity-item.php | GET, PATCH, DELETE | active user | cloud_entity_get_one, cloud_entity_patch_one, cloud_entity_delete_one | No |
| /api/data/entity.php | GET, POST, PATCH, DELETE | active user | cloud_entity_list, cloud_entity_create, cloud_entity_delete_bulk, cloud_entity_patch_many | No |
| /api/health.php | GET | public (admin-login verifies admin credentials) | health_check_get | No |
| /api/import/transactions.php | POST | active user | imports_transactions_bulk | No |
| /api/payments/razorpay/webhook.php | POST | public signed provider request | razorpay_webhook | No |
| /api/policies/accept.php | POST | active user | policies_accept | No |
| /api/policies/current.php | GET | public (admin-login verifies admin credentials) | policies_current | No |
| /api/public/config.php | GET | public (admin-login verifies admin credentials) | public_config_get | No |
| /api/subscriptions/cancel.php | POST | active user | subscriptions_cancel | No |
| /api/subscriptions/confirm-payment.php | POST | active user | subscriptions_confirm_payment | No |
| /api/subscriptions/create-order.php | POST | active user | subscriptions_create_order | No |
| /api/subscriptions/my.php | GET | active user | subscriptions_my | No |
| /api/subscriptions/plans.php | GET | public (admin-login verifies admin credentials) | subscriptions_list_plans | No |

[docs/API-AUDIT.md](</Volumes/ssd12/SparowVault/230826 SparowVault/docs/API-AUDIT.md>) provides per-endpoint method/path/source, controller, auth/PIN, body/query references, response, affected tables, audit/CSRF/rate reachability, errors, candidate tests and gaps. The reviewed method map supersedes naïve default-GET literal extraction. There are no invoice/quotation/agency approval APIs to exercise.

## 9. Data Model Audit

| SQL table | Columns | Declared key fields |
| --- | --- | --- |
| admin_audit_logs | 11 | id (PRI), actor_user_id (MUL), action_key (MUL), entity_type (MUL), created_at (MUL) |
| ai_suggestions | 19 | id (PRI), user_id (MUL) |
| api_rate_limits | 5 | id (PRI), bucket_key (UNI), window_start (MUL) |
| app_settings | 7 | id (PRI), setting_key (UNI), updated_by_user_id (MUL) |
| audit_logs | 11 | id (PRI), actor_user_id (MUL), action_key (MUL), entity_type (MUL) |
| cloud_collection_rows | 23 | id (PRI), user_id (MUL), deleted_at (MUL) |
| cloud_users | 7 | id (PRI), username (UNI) |
| feature_flags_global | 7 | id (PRI), feature_key (UNI), updated_by_user_id (MUL) |
| financial_effects | 9 | id (PRI), event_id (MUL), user_id (MUL) |
| financial_events | 14 | id (PRI), user_id (MUL) |
| financial_mutation_keys | 7 | id (PRI), user_id (MUL) |
| login_attempts | 7 | id (PRI), username (MUL), locked_until (MUL), updated_at (MUL) |
| payments | 17 | id (PRI), user_id (MUL), subscription_id (MUL), provider (MUL), provider_order_id (MUL), provider_payment_id (MUL), paid_at (MUL) |
| plan_features | 8 | id (PRI), plan_id (MUL), feature_key (MUL) |
| plan_prices | 9 | id (PRI), plan_id (MUL) |
| plans | 11 | id (PRI), code (UNI), is_active (MUL), sort_order (MUL) |
| retention_jobs | 8 | id (PRI), job_key (MUL) |
| schema_version | 2 | version_key (PRI) |
| subscriptions | 20 | id (PRI), user_id (MUL), plan_id (MUL), status (MUL), current_period_end (MUL), provider_subscription_id (MUL), provider_order_id (MUL) |
| udhari_entries | 10 | id (PRI), user_id (MUL), person_id (MUL) |
| udhari_people | 11 | id (PRI), user_id (MUL) |
| udhari_settlements | 9 | id (PRI), user_id (MUL), person_id (MUL), udhari_entry_id (MUL) |
| user_audit_logs | 11 | id (PRI), user_id (MUL), action_key (MUL), entity_type (MUL) |
| user_credit_cards | 20 | id (PRI), user_id (MUL) |
| user_loan_payments | 18 | id (PRI), user_id (MUL), loan_id (MUL) |
| user_loans | 25 | id (PRI), user_id (MUL) |
| user_policy_acceptances | 9 | id (PRI), user_id (MUL) |
| user_security_recovery | 5 | user_id (PRI) |
| users | 20 | id (PRI), username (UNI), role (MUL), deleted_at (MUL), created_at (MUL) |
| webhook_events | 11 | id (PRI), provider (MUL), event_id (UNI), created_at (MUL) |

Detailed columns and keys: [database-schema.json](</Volumes/ssd12/SparowVault/230826 SparowVault/docs/audit-evidence/2026-09-10/database-schema.json>). No existing user financial rows were copied into this metadata artifact. [docs/MODULE-WISE-AUDIT.md](</Volumes/ssd12/SparowVault/230826 SparowVault/docs/MODULE-WISE-AUDIT.md>) contains the 37 contract/store mappings.

- IDs are generated client/server-side; uniqueness by tenant/collection/entity does not make mutationId retries atomic.
- JSON hot fields improve queryability but do not provide relational foreign keys inside payloads. X04 stored a transaction referencing nonexistent account/category IDs.
- Sync migration metadata says merge-by-id/soft-delete-aware, but stale pushes can restore deleted records. Declared behavior is not implemented conflict control.
- SQL schema/migration scripts and Dexie version upgrades exist. Only a clean isolated schema/reset path was run; every historical upgrade/rollback was not. Lazy runtime DDL requires additional deployment review.
- Delete paths differ: soft delete, per-row removal, collection hard-delete, Settings wipe and account soft-deletion have different semantics. Financial reversals and retention must be explicit.
- The full JSON backup omits newer contracts; restore also generates new IDs without remapping links; wipe clears only a legacy subset. B15/B38/B39 block reliable recovery/deletion claims.
- Account deletion intentionally retains billing/finance rows while disabling the user; it is not equivalent to deleting all data. Scheduled retention/purge execution is unverified.
- There is no Vercel Blob store to audit here. Attachment metadata is not evidence that file bytes are stored privately or backed up.

## 10. Finance Calculation Audit

| # | Required agency calculation | Status | Source / test conclusion |
| --- | --- | --- | --- |
| 1 | Project GST calculation | Not implemented as the agency formula requested; no source calculation to certify. | No agency entity/engine/API. Future specification and tests required. |
| 2 | No GST mode | Not implemented as the agency formula requested; no source calculation to certify. | No agency entity/engine/API. Future specification and tests required. |
| 3 | Including GST mode | Not implemented as the agency formula requested; no source calculation to certify. | No agency entity/engine/API. Future specification and tests required. |
| 4 | Excluding GST mode | Not implemented as the agency formula requested; no source calculation to certify. | No agency entity/engine/API. Future specification and tests required. |
| 5 | CGST/SGST calculation | Not implemented as the agency formula requested; no source calculation to certify. | No agency entity/engine/API. Future specification and tests required. |
| 6 | IGST calculation | Not implemented as the agency formula requested; no source calculation to certify. | No agency entity/engine/API. Future specification and tests required. |
| 7 | Invoice line-item GST | Not implemented as the agency formula requested; no source calculation to certify. | No agency entity/engine/API. Future specification and tests required. |
| 8 | Invoice discount | Not implemented as the agency formula requested; no source calculation to certify. | No agency entity/engine/API. Future specification and tests required. |
| 9 | Invoice round-off | Not implemented as the agency formula requested; no source calculation to certify. | No agency entity/engine/API. Future specification and tests required. |
| 10 | Invoice grand total | Not implemented as the agency formula requested; no source calculation to certify. | No agency entity/engine/API. Future specification and tests required. |
| 11 | Amount in words | Not implemented as the agency formula requested; no source calculation to certify. | No agency entity/engine/API. Future specification and tests required. |
| 12 | Quotation pricing | Not implemented as the agency formula requested; no source calculation to certify. | No agency entity/engine/API. Future specification and tests required. |
| 13 | Package pricing | Not implemented as the agency formula requested; no source calculation to certify. | No agency entity/engine/API. Future specification and tests required. |
| 14 | Payment received | Personal cash/payment/surplus analogue only; no agency verified/accrual/eligibility formula. | See actual engine inventory and F-series probes. A similar personal metric is not proof of equivalence. |
| 15 | Verified paid amount | Not implemented as the agency formula requested; no source calculation to certify. | No agency entity/engine/API. Future specification and tests required. |
| 16 | Pending payment | Personal cash/payment/surplus analogue only; no agency verified/accrual/eligibility formula. | See actual engine inventory and F-series probes. A similar personal metric is not proof of equivalence. |
| 17 | Remaining amount | Personal cash/payment/surplus analogue only; no agency verified/accrual/eligibility formula. | See actual engine inventory and F-series probes. A similar personal metric is not proof of equivalence. |
| 18 | Approved expenses | Not implemented as the agency formula requested; no source calculation to certify. | No agency entity/engine/API. Future specification and tests required. |
| 19 | Paid expenses | Not implemented as the agency formula requested; no source calculation to certify. | No agency entity/engine/API. Future specification and tests required. |
| 20 | Admin charges | Not implemented as the agency formula requested; no source calculation to certify. | No agency entity/engine/API. Future specification and tests required. |
| 21 | Admin usage | Not implemented as the agency formula requested; no source calculation to certify. | No agency entity/engine/API. Future specification and tests required. |
| 22 | Net profit | Personal cash/payment/surplus analogue only; no agency verified/accrual/eligibility formula. | See actual engine inventory and F-series probes. A similar personal metric is not proof of equivalence. |
| 23 | Distributable profit | Not implemented as the agency formula requested; no source calculation to certify. | No agency entity/engine/API. Future specification and tests required. |
| 24 | Retained reserve | Not implemented as the agency formula requested; no source calculation to certify. | No agency entity/engine/API. Future specification and tests required. |
| 25 | Cash profit | Not implemented as the agency formula requested; no source calculation to certify. | No agency entity/engine/API. Future specification and tests required. |
| 26 | Cash eligible payout | Not implemented as the agency formula requested; no source calculation to certify. | No agency entity/engine/API. Future specification and tests required. |
| 27 | Blocked payout | Not implemented as the agency formula requested; no source calculation to certify. | No agency entity/engine/API. Future specification and tests required. |
| 28 | Partner payable | Not implemented as the agency formula requested; no source calculation to certify. | No agency entity/engine/API. Future specification and tests required. |
| 29 | Partner paid | Not implemented as the agency formula requested; no source calculation to certify. | No agency entity/engine/API. Future specification and tests required. |
| 30 | Partner pending | Not implemented as the agency formula requested; no source calculation to certify. | No agency entity/engine/API. Future specification and tests required. |
| 31 | Partner allocation snapshot | Not implemented as the agency formula requested; no source calculation to certify. | No agency entity/engine/API. Future specification and tests required. |
| 32 | Partner payout validation | Not implemented as the agency formula requested; no source calculation to certify. | No agency entity/engine/API. Future specification and tests required. |
| 33 | Company balance | Personal cash/payment/surplus analogue only; no agency verified/accrual/eligibility formula. | See actual engine inventory and F-series probes. A similar personal metric is not proof of equivalence. |
| 34 | Free available balance | Personal cash/payment/surplus analogue only; no agency verified/accrual/eligibility formula. | See actual engine inventory and F-series probes. A similar personal metric is not proof of equivalence. |
| 35 | GST collected | Not implemented as the agency formula requested; no source calculation to certify. | No agency entity/engine/API. Future specification and tests required. |
| 36 | GST paid | Not implemented as the agency formula requested; no source calculation to certify. | No agency entity/engine/API. Future specification and tests required. |
| 37 | GST pending | Not implemented as the agency formula requested; no source calculation to certify. | No agency entity/engine/API. Future specification and tests required. |
| 38 | Input GST if any | Not implemented as the agency formula requested; no source calculation to certify. | No agency entity/engine/API. Future specification and tests required. |
| 39 | Receivable aging | Udhari analogue exists; canonical field test fails (B17). | See actual engine inventory and F-series probes. A similar personal metric is not proof of equivalence. |
| 40 | Subscription due status | Personal-finance analogue exists; partial or failing, see engines/probes below. | See actual engine inventory and F-series probes. A similar personal metric is not proof of equivalence. |
| 41 | Budget actual | Personal-finance analogue exists; partial or failing, see engines/probes below. | See actual engine inventory and F-series probes. A similar personal metric is not proof of equivalence. |
| 42 | Budget variance | Personal-finance analogue exists; partial or failing, see engines/probes below. | See actual engine inventory and F-series probes. A similar personal metric is not proof of equivalence. |
| 43 | Vendor ledger totals | Not implemented as the agency formula requested; no source calculation to certify. | No agency entity/engine/API. Future specification and tests required. |
| 44 | CA export totals | Personal-finance analogue exists; partial or failing, see engines/probes below. | See actual engine inventory and F-series probes. A similar personal metric is not proof of equivalence. |
| 45 | Report totals | Personal-finance analogue exists; partial or failing, see engines/probes below. | See actual engine inventory and F-series probes. A similar personal metric is not proof of equivalence. |
| 46 | Dashboard KPI totals | Personal-finance analogue exists; partial or failing, see engines/probes below. | See actual engine inventory and F-series probes. A similar personal metric is not proof of equivalence. |

[docs/FINANCE-CALCULATION-AUDIT.md](</Volumes/ssd12/SparowVault/230826 SparowVault/docs/FINANCE-CALCULATION-AUDIT.md>) contains 25 actual engine/domain assessments, all 16 executed custom probes, the requested edge-case inventory, units/invariants and performance boundaries. Twelve custom assertions fail despite substantial existing helper coverage. The correct response is to reconcile definitions and lifecycles, not to add presentation-only totals.

## 11. Invoice Maker Audit

**Not implemented.** Generic transactions and GST flags do not provide invoice lines, financial-year series, legal/tax identity, payment allocation, credit/debit notes or printable documents. No invoice-generated PDF/DOCX was found or tested. All requested invoice audit areas are accounted for below.

| Requested invoice audit area | Finding |
| --- | --- |
| Invoice module status | Not implemented as an invoice feature. No invoice model, route, controller or document renderer found. Related generic transactions/GST flags do not satisfy this requirement. |
| Invoice UI fields | Not implemented as an invoice feature. No invoice model, route, controller or document renderer found. Related generic transactions/GST flags do not satisfy this requirement. |
| Invoice types supported | Not implemented as an invoice feature. No invoice model, route, controller or document renderer found. Related generic transactions/GST flags do not satisfy this requirement. |
| Invoice lifecycle statuses | Not implemented as an invoice feature. No invoice model, route, controller or document renderer found. Related generic transactions/GST flags do not satisfy this requirement. |
| Invoice number generation | Not implemented as an invoice feature. No invoice model, route, controller or document renderer found. Related generic transactions/GST flags do not satisfy this requirement. |
| Financial year series | Not implemented as an invoice feature. No invoice model, route, controller or document renderer found. Related generic transactions/GST flags do not satisfy this requirement. |
| Duplicate invoice number protection | Not implemented as an invoice feature. No invoice model, route, controller or document renderer found. Related generic transactions/GST flags do not satisfy this requirement. |
| Revised invoice logic | Not implemented as an invoice feature. No invoice model, route, controller or document renderer found. Related generic transactions/GST flags do not satisfy this requirement. |
| Cancelled invoice logic | Not implemented as an invoice feature. No invoice model, route, controller or document renderer found. Related generic transactions/GST flags do not satisfy this requirement. |
| Credit note logic | Not implemented as an invoice feature. No invoice model, route, controller or document renderer found. Related generic transactions/GST flags do not satisfy this requirement. |
| Debit note logic | Not implemented as an invoice feature. No invoice model, route, controller or document renderer found. Related generic transactions/GST flags do not satisfy this requirement. |
| Payment receipt logic | Not implemented as an invoice feature. No invoice model, route, controller or document renderer found. Related generic transactions/GST flags do not satisfy this requirement. |
| Seller block | Not implemented as an invoice feature. No invoice model, route, controller or document renderer found. Related generic transactions/GST flags do not satisfy this requirement. |
| Buyer block | Not implemented as an invoice feature. No invoice model, route, controller or document renderer found. Related generic transactions/GST flags do not satisfy this requirement. |
| Client prefill | Not implemented as an invoice feature. No invoice model, route, controller or document renderer found. Related generic transactions/GST flags do not satisfy this requirement. |
| Project prefill | Not implemented as an invoice feature. No invoice model, route, controller or document renderer found. Related generic transactions/GST flags do not satisfy this requirement. |
| Quotation prefill | Not implemented as an invoice feature. No invoice model, route, controller or document renderer found. Related generic transactions/GST flags do not satisfy this requirement. |
| Payment linking | Not implemented as an invoice feature. No invoice model, route, controller or document renderer found. Related generic transactions/GST flags do not satisfy this requirement. |
| Line items | Not implemented as an invoice feature. No invoice model, route, controller or document renderer found. Related generic transactions/GST flags do not satisfy this requirement. |
| Feature description/list | Not implemented as an invoice feature. No invoice model, route, controller or document renderer found. Related generic transactions/GST flags do not satisfy this requirement. |
| HSN/SAC | Not implemented as an invoice feature. No invoice model, route, controller or document renderer found. Related generic transactions/GST flags do not satisfy this requirement. |
| GST mode | Not implemented as an invoice feature. No invoice model, route, controller or document renderer found. Related generic transactions/GST flags do not satisfy this requirement. |
| CGST/SGST/IGST | Not implemented as an invoice feature. No invoice model, route, controller or document renderer found. Related generic transactions/GST flags do not satisfy this requirement. |
| Discount | Not implemented as an invoice feature. No invoice model, route, controller or document renderer found. Related generic transactions/GST flags do not satisfy this requirement. |
| Round-off | Not implemented as an invoice feature. No invoice model, route, controller or document renderer found. Related generic transactions/GST flags do not satisfy this requirement. |
| Amount in words | Not implemented as an invoice feature. No invoice model, route, controller or document renderer found. Related generic transactions/GST flags do not satisfy this requirement. |
| PDF export | Not implemented as an invoice feature. No invoice model, route, controller or document renderer found. Related generic transactions/GST flags do not satisfy this requirement. |
| DOCX export | Not implemented as an invoice feature. No invoice model, route, controller or document renderer found. Related generic transactions/GST flags do not satisfy this requirement. |
| Print view | Not implemented as an invoice feature. No invoice model, route, controller or document renderer found. Related generic transactions/GST flags do not satisfy this requirement. |
| Branding/template | Not implemented as an invoice feature. No invoice model, route, controller or document renderer found. Related generic transactions/GST flags do not satisfy this requirement. |
| Attachment handling | Not implemented as an invoice feature. No invoice model, route, controller or document renderer found. Related generic transactions/GST flags do not satisfy this requirement. |
| Audit logs | Not implemented as an invoice feature. No invoice model, route, controller or document renderer found. Related generic transactions/GST flags do not satisfy this requirement. |
| RBAC | Not implemented as an invoice feature. No invoice model, route, controller or document renderer found. Related generic transactions/GST flags do not satisfy this requirement. |
| PIN requirements | Not implemented as an invoice feature. No invoice model, route, controller or document renderer found. Related generic transactions/GST flags do not satisfy this requirement. |
| Bugs | Not implemented as an invoice feature. No invoice model, route, controller or document renderer found. Related generic transactions/GST flags do not satisfy this requirement. |
| Missing tests | Not implemented as an invoice feature. No invoice model, route, controller or document renderer found. Related generic transactions/GST flags do not satisfy this requirement. |
| Improvement suggestions | Not implemented as an invoice feature. No invoice model, route, controller or document renderer found. Related generic transactions/GST flags do not satisfy this requirement. |

Implementation prerequisite: agree a versioned invoice/receipt/tax/journal contract and accountant-reviewed fixtures; enforce unique numbering and immutable posted revisions server-side. Then render/verify documents and test payment/reversal/close-period behavior. This audit does not invent tax-law compliance or a finished invoice feature.

## 12. Quotation Maker Audit

**Not implemented.** There is no quotation wizard, package pricing, acceptance or controlled conversion lifecycle.

| Requested quotation audit area | Finding |
| --- | --- |
| Quotation module status | Not implemented as a quotation feature. No quotation model, wizard, lifecycle, pricing snapshot, conversion or generated document flow found. |
| Wizard steps | Not implemented as a quotation feature. No quotation model, wizard, lifecycle, pricing snapshot, conversion or generated document flow found. |
| Form fields | Not implemented as a quotation feature. No quotation model, wizard, lifecycle, pricing snapshot, conversion or generated document flow found. |
| Quotation types | Not implemented as a quotation feature. No quotation model, wizard, lifecycle, pricing snapshot, conversion or generated document flow found. |
| Status lifecycle | Not implemented as a quotation feature. No quotation model, wizard, lifecycle, pricing snapshot, conversion or generated document flow found. |
| Client picker | Not implemented as a quotation feature. No quotation model, wizard, lifecycle, pricing snapshot, conversion or generated document flow found. |
| New client quick create | Not implemented as a quotation feature. No quotation model, wizard, lifecycle, pricing snapshot, conversion or generated document flow found. |
| Project scope | Not implemented as a quotation feature. No quotation model, wizard, lifecycle, pricing snapshot, conversion or generated document flow found. |
| Feature groups | Not implemented as a quotation feature. No quotation model, wizard, lifecycle, pricing snapshot, conversion or generated document flow found. |
| Out of scope | Not implemented as a quotation feature. No quotation model, wizard, lifecycle, pricing snapshot, conversion or generated document flow found. |
| Assumptions | Not implemented as a quotation feature. No quotation model, wizard, lifecycle, pricing snapshot, conversion or generated document flow found. |
| Timeline | Not implemented as a quotation feature. No quotation model, wizard, lifecycle, pricing snapshot, conversion or generated document flow found. |
| Milestones | Not implemented as a quotation feature. No quotation model, wizard, lifecycle, pricing snapshot, conversion or generated document flow found. |
| Package comparison | Not implemented as a quotation feature. No quotation model, wizard, lifecycle, pricing snapshot, conversion or generated document flow found. |
| Basic/Standard/Premium/Custom | Not implemented as a quotation feature. No quotation model, wizard, lifecycle, pricing snapshot, conversion or generated document flow found. |
| Pricing modes | Not implemented as a quotation feature. No quotation model, wizard, lifecycle, pricing snapshot, conversion or generated document flow found. |
| GST logic | Not implemented as a quotation feature. No quotation model, wizard, lifecycle, pricing snapshot, conversion or generated document flow found. |
| Payment schedule | Not implemented as a quotation feature. No quotation model, wizard, lifecycle, pricing snapshot, conversion or generated document flow found. |
| Terms and conditions | Not implemented as a quotation feature. No quotation model, wizard, lifecycle, pricing snapshot, conversion or generated document flow found. |
| Validity date | Not implemented as a quotation feature. No quotation model, wizard, lifecycle, pricing snapshot, conversion or generated document flow found. |
| Acceptance block | Not implemented as a quotation feature. No quotation model, wizard, lifecycle, pricing snapshot, conversion or generated document flow found. |
| PDF export | Not implemented as a quotation feature. No quotation model, wizard, lifecycle, pricing snapshot, conversion or generated document flow found. |
| DOCX export | Not implemented as a quotation feature. No quotation model, wizard, lifecycle, pricing snapshot, conversion or generated document flow found. |
| Convert to project | Not implemented as a quotation feature. No quotation model, wizard, lifecycle, pricing snapshot, conversion or generated document flow found. |
| Convert to invoice | Not implemented as a quotation feature. No quotation model, wizard, lifecycle, pricing snapshot, conversion or generated document flow found. |
| Audit logs | Not implemented as a quotation feature. No quotation model, wizard, lifecycle, pricing snapshot, conversion or generated document flow found. |
| RBAC | Not implemented as a quotation feature. No quotation model, wizard, lifecycle, pricing snapshot, conversion or generated document flow found. |
| Bugs | Not implemented as a quotation feature. No quotation model, wizard, lifecycle, pricing snapshot, conversion or generated document flow found. |
| Missing tests | Not implemented as a quotation feature. No quotation model, wizard, lifecycle, pricing snapshot, conversion or generated document flow found. |
| Improvement suggestions | Not implemented as a quotation feature. No quotation model, wizard, lifecycle, pricing snapshot, conversion or generated document flow found. |

Implementation prerequisite: versioned scope/pricing, explicit accepted snapshot, controlled project/invoice conversion and separately verified PDF/DOCX rendering. The presence of a docx package dependency is not a quotation feature.

## 13. CA Export Audit

| Audit area | Observed status |
| --- | --- |
| Module status | Partial client-generated export center, with confirmed defects. |
| Wizard steps | No complete multi-step CA job wizard; direct date/format selection and download cards. |
| Available sections | 21 baseline workbook sheets, optional per-loan amortization; section manifest listed below. |
| Period filters | From/to filter transactions; linked event/effect context not filtered consistently (B16). |
| Financial-year filters | Settings has FY start month, but export uses date range and calendar-year aggregation; agency FY policy not fully implemented. |
| GST filters | GST/tax/bill flags and flagged sheets; not input/output GST calculation or filing readiness. |
| Include documents | No complete attachment-bytes inclusion or ZIP pack. |
| Include audit trail | Export history/user audit separate; no immutable selectable audit-trail pack. |
| Preview totals | No complete validated preflight snapshot with all cross-sheet totals. |
| Warning engine | Some missing-bill/report notes exist; no complete invoice/GSTIN/HSN-SAC/proof/number-gap checker. |
| Formats | XLSX/CSV/JSON; CA workbook is XLSX. |
| PDF | No agency CA PDF generation workflow. |
| Excel | Actual download parsed successfully; arithmetic/type/period/name defects remain. |
| DOCX | No agency CA DOCX workflow; dependency presence is not a user feature. |
| ZIP | No CA ZIP job/artifact lifecycle. |
| Export history | exportHistory collection and logExport exist; client mutation not immutable server artifact registry. |
| Download security | Browser Blob download, no private hosted artifact with revocable signed access. Account data-export is a separate PIN-authenticated API. |
| PIN requirement | Full profile backup asks PIN via login; ordinary CA download is not separately PIN challenged. |
| Audit logging | Client export/activity history plus separate server account-export logs; not one authoritative artifact audit. |
| Bugs | B15-B24, B35 and B38. |
| Missing tests | All section combinations, byte-inclusive documents, actual spreadsheet applications, encrypted all-collection round-trip and production downloads. |
| Improvement | Canonical snapshots, validated warnings, numeric cells, unique sheet names, safe CSV, reliable restore and versioned export manifest. |

### Downloaded baseline worksheet manifest

1. `Transactions_Master`
2. `Income_Summary_Monthly`
3. `Expense_Summary_Monthly`
4. `Expense_By_Category`
5. `Expense_By_Subcategory`
6. `Expense_By_Payment_Mode`
7. `Loan_EMI_Register`
8. `Credit_Card_Register`
9. `Udhari_Register`
10. `Savings_Investments_Register`
11. `Goal_Contribution_Register`
12. `Annual_Personal_Financial_Summa`
13. `Tax_Flagged_Transactions`
14. `GST_Bill_Entries`
15. `Account_Ledger`
16. `Account_Reconciliation`
17. `Interest_Paid_Report`
18. `Business_Personal_Split`
19. `Bills_Missing_Report`
20. `Export_Footer`
21. `CA_Notes`

Conditional amortization sheets add to this list; duplicate lender names currently collide. Expense_By_Subcategory is a note placeholder, not a computed subcategory ledger. A generated workbook opening successfully does not establish its accounting correctness.

## 14. Reports and Export Audit

| Requested report | Actual scope / gap |
| --- | --- |
| Dashboard report | Personal-finance analogue exists; see module/report engine and known cross-view defects. |
| Profit and loss | Personal income/expense/surplus analogue, not company accrual P&L. |
| Project profitability | Agency report absent; no underlying entity/ledger. |
| Client receivables | Agency report absent; no underlying entity/ledger. |
| Payment report | Personal-finance analogue exists; see module/report engine and known cross-view defects. |
| Expense report | Personal-finance analogue exists; see module/report engine and known cross-view defects. |
| Expense category report | Personal-finance analogue exists; see module/report engine and known cross-view defects. |
| Vendor ledger | Agency report absent; no underlying entity/ledger. |
| Partner profit | Agency report absent; no underlying entity/ledger. |
| Partner payout | Agency report absent; no underlying entity/ledger. |
| GST summary | Flags-only export analogue, not a tax register or liability/ITC report. |
| GST register | Flags-only export analogue, not a tax register or liability/ITC report. |
| Invoice register | Agency report absent; no underlying entity/ledger. |
| Quotation report | Agency report absent; no underlying entity/ledger. |
| Receipt report | Agency report absent; no underlying entity/ledger. |
| Subscription report | Platform subscription view, not client AMC/retainer report. |
| Admin usage report | Agency report absent; no underlying entity/ledger. |
| Adjustment report | Personal-finance analogue exists; see module/report engine and known cross-view defects. |
| Budget report | Personal-finance analogue exists; see module/report engine and known cross-view defects. |
| Audit report | User activity collection is mutable; separate SQL security logs are not a unified immutable report. |
| CA export report | XLSX implemented but fails period/type/allocation/reconciliation probes. |

Known failures include out-of-period ledger rows, empty summaries from one caller, opening-balance/ageing field mismatch, gross-versus-net refund inconsistency, false matched reconciliation, mixed expense allocation, duplicate worksheet names, string-valued money and unsafe CSV text. All have evidence in the findings/finance reports. Date filtering must distinguish opening balance from period movement rather than simply dropping every earlier event.

## 15. Documents Audit

| Requested document capability | Status |
| --- | --- |
| Attachment metadata | Contract/repository exists; ownership is generic user scope. |
| Private file bytes / Vercel Blob | No complete storage integration found. |
| Upload validation | No complete MIME/type/size/malware/quota server upload pipeline. Spreadsheet import is a separate local parser surface. |
| Preview/download | No complete authorized document preview/download lifecycle or signed object-store URL flow. |
| Invoice/quotation PDF/DOCX | No corresponding feature route/model/generator flow. |
| Proof links and approval | Flags/metadata are not a verified proof-of-payment or approved expense evidence workflow. |
| Document bundles / ZIP | No project/CA document bundle job with manifest and included bytes. |
| Retention/deletion/backup | No proven all-file-byte lifecycle; metadata-only backup cannot certify document recovery. |

No files were sent to external storage. Generated test XLSX files contain synthetic finance fixtures. Future document work must include per-object authorization, versioned metadata, private bytes, retention and render/parse verification.

## 16. RBAC and Role Audit

| Requested role | Status | Assessment |
| --- | --- | --- |
| Super Admin | Absent as distinct role | No protected super-admin-only role management or security boundary. |
| Admin | Present platform role | User/plan/subscription/flag/branding administration, not an agency finance approval role. |
| Finance Manager | Absent | No permission-specific approvals, finance dashboard or close access. |
| Accountant | Absent | No accountant-only books/CA exports with restricted mutation. |
| Partner | Absent as agency role | Household partner is not company equity/profit allocation membership. |
| Auditor | Absent | No immutable read-only company audit scope. |
| Project Manager | Absent | No project ownership or expense permission model. |
| Employee | Absent | No own-expense submit/proof workflow. |
| Viewer | Absent as platform role | Household viewer exists as local record with bypassable mutation-path restrictions. |

[docs/RBAC-SECURITY-AUDIT.md](</Volumes/ssd12/SparowVault/230826 SparowVault/docs/RBAC-SECURITY-AUDIT.md>) contains the actual principal/operation matrix. Existing covered tenant-isolation checks pass, but B12 shows household batch-update bypass and B37 permits nonexistent references. Agency organization ownership and nine-role separation do not exist.

## 17. PIN and Security Audit

| Security blocker | Evidence |
| --- | --- |
| B06 Changing a PIN invalidates the configured recovery answer | security-probes.json S05 |
| B07 PIN changes and logout do not revoke bearer sessions | security-probes.json S06-S07 |
| B08 Forced PIN rotation is not enforced for privileged access | extra-probes.json X01; security-probes.json S08 |
| B09 Recovery settings allow a session holder to replace the PIN without the existing PIN | extra-probes.json X02 |
| B10 CSRF enforcement is inconsistent across cookie-authenticated mutations | security-probes.json S02-S03 |
| B11 Spoofed forwarded IP addresses evade the login throttle | security-probes.json S12 |
| B12 Household role restrictions can be bypassed through batch PATCH | security-probes.json S11 |
| B25 The reachable spreadsheet parser has high-severity advisories | dependency-audit.log |
| B32 The PHP development router serves repository internals | security-probes.json HTTP checks |
| B33 Authorization and unexpected errors use misleading/raw 500 responses | security-probes.json S01 |

PIN hashing and cookie/JWT checks exist, but a correct old PIN is not required to replace recovery and then reset the credential. Changing the PIN breaks the previous recovery answer, and old tokens remain usable after logout/PIN change. Forced rotation is not server-enforced even when flagged. These are tested defects, not hypothetical checklist items. Follow the dedicated security report for CSRF and deployment-exposure caveats.

## 18. Audit Log Audit

There are separate user-facing activity records (generic auditLogs), user/security audit helpers and SQL admin/security logs. S13 accepts a fabricated activity record. This does not prove the separate SQL logs are writable through that route. The user-facing trail must not be presented as immutable accounting evidence.

Audit completeness is not guaranteed across all mutations or failures. Whole-collection deletion leaves ledger state behind; client-side export history is not an authoritative artifact log. Required design: server-derived actor/time/action, before/after or reversible references, correlation/mutation ID, role/tenant scope, transactional commit and read-only audit access. Hash chaining is optional defense-in-depth, not a substitute for authorization/append-only storage.

## 19. UI/UX and Mobile Audit

The completed browser sweep recorded 300 route/width observations with zero root overflow and no pageerror events in sampled states. It found missing mobile Categories/Audit access and shared label/name issues. Screenshots were visually reviewed for selected desktop/mobile states. Reports was gated, subscription views disabled, and not every dialog or populated table was exercised. See [docs/UI-UX-AUDIT.md](</Volumes/ssd12/SparowVault/230826 SparowVault/docs/UI-UX-AUDIT.md>).

## 20. Testing Audit

| Layer | Observed result | Interpretation |
| --- | --- | --- |
| TypeScript | PASS | No TypeScript diagnostics; not runtime assurance. |
| ESLint normal | FAIL: 279 parsing errors | Filesystem AppleDouble metadata was picked up by eslint . |
| ESLint diagnostic exclusions | PASS | Ignoring **/._* and generated audit evidence isolates actual lint baseline; app/config not changed. |
| Unit normal | 98 discovered suites: 51 failed / 47 passed | 49 extra metadata files are not legitimate test suites. 311 real assertions still execute. |
| Unit diagnostic clean run | 49 suites: 47 passed / 2 failed; 311 tests: 307 passed / 4 failed | Two missing secret-fixture files and two powershell ENOENT failures. |
| Coverage | 56.51% lines/statements, 68.24% branches, 70.4% functions | Only configured src/services + src/lib. Not UI/store/repo/PHP coverage. |
| PHP syntax | PASS: runner reports 150 paths | Includes metadata files interpreted as plain text; 75 nonmetadata PHP paths are the meaningful syntax scope. |
| SQL static | PASS with 8 warnings | 24 root SQL paths include 12 metadata files; initial live phase skipped. Separate isolated schema reset succeeded. |
| Build | PASS; 3453 modules | Large single JS asset and mixed import warnings remain. |
| Dependencies | FAIL: 19 advisory nodes | 4 critical / 7 high / 7 moderate / 1 low; runtime vs dev exposure separated. |
| Isolated database reset | PASS | Created/reset only sparowvault_audit_test_20260910; not current user database. |
| Core API | 65/65 PASS | Covered positive/negative cases only; custom probes still expose significant failures. |
| vNext collections API | 11 PASS lines | Smoke + ownership/idempotent sequential cases, not parallel semantics. |
| Account endpoints | 9 PASS, 1 FAIL | Own-data missing-row failure caused by unverified CSRF-blocked seed. Extra X05 passes with valid seeding. |
| Validation API | 10 PASS, 2 FAIL | 8 rejection lines received CSRF 403 before intended schema checks. Do not claim validator coverage from them. |
| Webhook replay | Fixture error; no replay assertions reached | ER_DATA_TOO_LONG username fixture >20 characters. |
| Webhook ownership | 9 PASS lines | Synthetic signature/ownership/amount/replay controls checked. |
| Existing browser smoke | 37/37 PASS | Some checks are click-only; reset outcome and import completion not fully asserted. |
| Existing finance browser | 6 PASS lines | Page smoke, not full financial posting journeys. |
| Existing offline browser | 10 PASS lines | Synthetic outbox marker persists; not a real durable offline financial write. |
| Custom browser | 30 routes x 10 widths; 5 PASS / 3 FAIL; 0 fatal/page errors | Failures: missing mobile Categories/Audit and unsynced local account loss. Gated/disabled views explicitly identified. |
| Custom finance | 16 assertions: 4 PASS / 12 FAIL | Includes one conservation property with 14443 sampled allocations. |
| Custom security | 20 assertions: 5 PASS / 15 FAIL | Includes 5 local file-exposure checks. A positive denial still has a wrong status defect. |
| Extra security/data | 7 assertions: 1 PASS / 6 FAIL | Confirms flag=1 bypass, recovery takeover, malformed schema, orphan references, broken restore links and incomplete wipe; correctly seeded own export passes. |

Exact commands, logs, coverage per file and limitations: [docs/TESTING-COVERAGE-REPORT.md](</Volumes/ssd12/SparowVault/230826 SparowVault/docs/TESTING-COVERAGE-REPORT.md>). The evidence retains corrected harness attempts separately rather than misclassifying harness failures as application failures.

## 21. Exhaustive Test Matrix

| Domain | Cases required | Evidence now | Status | Release proof still needed |
| --- | --- | --- | --- | --- |
| Authentication | Registration, policy versions, wrong PIN, admin login, inactive/deleted user, recovery, rotation, old sessions | Existing API + S01-S08/S12 + X01-X02 | Partially tested; recovery/revocation/forced rotation fail | Every role/session transport, all reset paths, brute force, session device list and stale-cookie tests |
| Ownership / RBAC | Anonymous/owner/other-user/admin/household roles by method | Core API, S11, X04 | Cross-user covered cases pass; household batch and missing-reference checks fail | 37 collections x all aliases x role and owner boundaries, deleted references and feature gates |
| Write durability | Single/bulk/import/sync/offline/concurrent retry | S09-S10/S14-S15 and real repository browser probe | Fail | Atomic entity/effect/audit, payload-bearing outbox, durable reload and conflict outcomes |
| Transactions | Income/expense/transfer/debt/refund/reversal/adjustment types | 311-test unit run plus API smoke | Partial; not every UI intent completed | All sources, destinations, currencies, invalid links, cancellation and report equality |
| Cards / loans | Four cards, EMI lifecycle, fees, tax, refund, payment order | Existing pure-function suites | Covered helpers pass; end-to-end issuer/SQL parity unverified | Realistic statement fixtures, duplicate/late payment, partial refund, closed/deleted instrument and settlement reconciliation |
| Budgets / goals / wealth | Create/edit/contribute/delete and totals | Unit suites and route smoke | Partial | Cash coupling, all vNext collections, investment valuations, maturity and backup restoration |
| Exports | Period, numeric types, worksheets, CSV, backup, isolation | F09-F16, browser XLSX, X05 | Multiple failures | Every module/format/filter, large/corrupt data, round-trip restore and target spreadsheet applications |
| Agency invoices | Number series, GST modes, discount, payment links, PDF/DOCX | No implementation | Blocked by feature gap | Versioned requirements, arithmetic golden cases, unique numbering under concurrency and document rendering |
| Agency quotations | Packages, scope, GST, validity, acceptance and conversion | No implementation | Blocked by feature gap | All 30 requested quotation audit areas and immutable accepted snapshots |
| Partner / month close | Cash eligibility, shares, snapshots, approve/pay/reverse/lock | No implementation | Blocked by feature gap | Allocation conservation, closed-period enforcement, dual control and rollback tests |
| Documents | Upload/type/size/ownership/preview/download/delete/retention | Metadata collection only | Not implemented end-to-end | Private storage, signed downloads, malware/quota policy and document/export inclusion |
| Responsive UI | 30 routes x 10 widths, selected screenshots | Completed Chromium sweep | No root overflow in sampled states; accessibility/navigation defects | Paid populated charts, all dialogs, long data, keyboard, zoom, Safari/Firefox and real touch devices |
| Performance | Pure ledger build at 1k/10k/25k | 16/150/508 ms observed | Not a throughput or SLA benchmark | CPU/network throttling, memory, API/SQL concurrency, export size, pagination and p95/p99 targets |
| Deployment / ops | Secrets, HTTPS, headers, artifacts, backups, monitoring | Source review, syntax/build, local health | Not production certified | Staging deploy, header/proxy audit, restore drill, rollout/rollback, alert delivery and RPO/RTO |

The detailed finance report also inventories every requested calculation edge case. The testing report expands money/date/lifecycle/role/concurrency/failure/UI/export dimensions and includes a regression requirement for every finding. This is the release matrix to complete, not a claim of all-combination execution.

## 22. Bugs and Errors

| ID | Severity | Finding | Evidence level |
| --- | --- | --- | --- |
| B01 | Critical | Unsynced financial data is erased by a successful cloud refresh | Reproduced |
| B02 | Critical | Concurrent retries can persist several entities for one mutation ID | Reproduced |
| B03 | High | Rejected sync batches leave partial financial writes | Reproduced |
| B04 | High | Stale sync data resurrects soft-deleted records | Reproduced |
| B05 | High | Collection hard-delete leaves posted SQL ledger events | Reproduced |
| B06 | High | Changing a PIN invalidates the configured recovery answer | Reproduced |
| B07 | High | PIN changes and logout do not revoke bearer sessions | Reproduced |
| B08 | High | Forced PIN rotation is not enforced for privileged access | Reproduced |
| B09 | High | Recovery settings allow a session holder to replace the PIN without the existing PIN | Reproduced |
| B10 | High | CSRF enforcement is inconsistent across cookie-authenticated mutations | Reproduced server-side; browser exploit not demonstrated |
| B11 | High | Spoofed forwarded IP addresses evade the login throttle | Reproduced |
| B12 | High | Household role restrictions can be bypassed through batch PATCH | Reproduced |
| B14 | High | Non-transaction collection contracts are not enforced as schemas | Reproduced |
| B15 | High | Full profile backup omits newer collections | Reproduced |
| B16 | High | CA workbook sheets use inconsistent period and ledger contexts | Reproduced |
| B17 | High | CA report helpers read noncanonical balance and Udhari fields | Reproduced |
| B18 | High | Some report totals ignore reversals and refunds | Reproduced |
| B23 | High | Reconciliation can report matched without an independent statement balance | Reproduced |
| B24 | High | Workbook business/personal summary ignores mixed allocations | Reproduced |
| B25 | High | The reachable spreadsheet parser has high-severity advisories | Dependency advisory plus source reachability; no exploit executed |
| B37 | High | Financial references are checked for presence but not existence | Reproduced |
| B38 | High | Backup restore breaks linked account and category references | Reproduced through the actual restore UI |
| B39 | High | Wipe all profile data leaves newer profile collections behind | Reproduced through the actual Settings UI |
| B13 | Medium | The user-visible audit collection accepts fabricated records | Reproduced |
| B19 | Medium | Oversized explicit mixed split can produce a negative component | Reproduced |
| B20 | Medium | Two loans with the same lender stop the CA export | Reproduced |
| B21 | Medium | Excel master money cells are formatted strings | Reproduced |
| B22 | Medium | CSV export does not neutralize formula-like user text | Reproduced serialization; spreadsheet execution not tested |
| B26 | Medium | Development dependency security baseline is not clean | Dependency scan |
| B27 | Medium | Standard quality commands fail on metadata and environment assumptions | Reproduced |
| B28 | Medium | Several existing tests can pass without exercising the claimed behavior | Reproduced and source review |
| B29 | Medium | Shared form labels and several icon controls lack accessible names | Source and browser scan |
| B30 | Medium | Mobile navigation omits Categories and Audit | Reproduced |
| B31 | Medium | The initial application bundle is large and largely unsplit | Measured build; user latency not benchmarked |
| B32 | Medium | The PHP development router serves repository internals | Reproduced locally |
| B33 | Medium | Authorization and unexpected errors use misleading/raw 500 responses | Reproduced and source review |
| B34 | Medium | Concurrent default seeding creates duplicate accounts/categories | Observed browser fixture; source race confirmed |
| B35 | Low | Export description lists the wrong workbook sheet count | Reproduced UI/content mismatch |
| B36 | Low | Seed branding/contact content remains placeholder-like | Observed test seed and source; production content unverified |

Full reproduction steps, expected/actual, impact, source links, recommendations and regression tests: [docs/BUGS-AND-GAPS-REPORT.md](</Volumes/ssd12/SparowVault/230826 SparowVault/docs/BUGS-AND-GAPS-REPORT.md>). Findings are not fixes. Missing agency modules are separately counted as scope gaps.

## 23. Production Readiness

| Gate | Status | Reason |
| --- | --- | --- |
| Repository identity | Verified | origin is the supplied GitHub repository; live master ref equals local HEAD. Existing local modifications remain. |
| Build/type/syntax | Partial pass | Typecheck/build/PHP syntax pass; normal lint/unit gates fail. |
| Core API happy/negative cases | Partial pass | 65/65 core API assertions passed; custom durability/security probes fail. |
| Financial data integrity | BLOCKED | Lost offline data, duplicate mutations, stale resurrection, partial batches, orphan references/effects. |
| Backup / restore / wipe | BLOCKED | Incomplete full backup, broken restored links and incomplete wipe. |
| Authentication and authorization | BLOCKED | Recovery, revocation, forced rotation, throttle and household endpoint parity failures. |
| Reports / CA exports | BLOCKED | Period/field/reversal/allocation/reconciliation and workbook defects. |
| Agency feature scope | NOT IMPLEMENTED IN FULL | Core client/project/invoice/quotation/approval/GST/partner/close/document workflows absent. |
| Mobile / accessibility | PARTIAL | 300 route/width observations; missing mobile routes and label defects; real-device/paid/populated states untested. |
| Dependencies | BLOCKED UNTIL TRIAGED | Reachable vulnerable spreadsheet parser plus development dependency advisories. |
| Live database migrations | PARTIAL | Isolated schema reset succeeds; historical migration/rollback/backup restore matrix not run. |
| Deployment security | UNVERIFIED | Source guards and .htaccess exist; actual public TLS/CSP/proxy/deny rules not validated. |
| Payments and notifications | UNVERIFIED | Synthetic webhook ownership tests pass; real provider lifecycle and message delivery untested. |
| Monitoring / recovery | UNVERIFIED | Scripts/docs exist; no production alert delivery, recovery-time or recovery-point drill. |
| Performance | UNVERIFIED FOR PRODUCTION | Build size and pure-function timings measured; not end-to-end load or memory certification. |

**NO-GO for production finance use and for the complete agency brief.** [docs/PRODUCTION-READINESS-REPORT.md](</Volumes/ssd12/SparowVault/230826 SparowVault/docs/PRODUCTION-READINESS-REPORT.md>) specifies release gates, operational limits and sequencing. No production data or deployment was certified.

## 24. Improvement Roadmap

| ID | Feature | Priority | Effort | Impact |
| --- | --- | --- | --- | --- |
| R01 | Reliable financial writes | P0 | Large | Protects all financial data |
| R02 | Account security and session devices | P0 | Medium-large | Reduces account takeover and access-control risk |
| R03 | Verified backup, restore and wipe | P0 | Large | Prevents misleading recovery and privacy guarantees |
| R04 | Canonical reports and CA pack validation | P0 | Medium-large | Makes numbers and exports explainable |
| R05 | Portable release gates and dependency maintenance | P0 | Medium | Makes later changes measurable |
| R06 | Agency organization and role foundation | P1 | Large | Prerequisite for agency workflows |
| R07 | Clients, vendors and receivable recovery | P1 | Large | Improves cash collection and vendor payment control |
| R08 | Quotation packages and controlled conversion | P1 | Large | Reduces scope and pricing disputes |
| R09 | Invoices, milestones, retainers and renewals | P1 | Very large | Enables agency revenue operations |
| R10 | Cash versus accrual and GST reserve | P1 | Large | Avoids distributing cash needed for obligations |
| R11 | Expense approvals, project margins and budget burn | P1 | Large | Improves expense control and project profitability |
| R12 | Partner snapshots and payout eligibility | P1 | Large | Prevents over-distribution and retroactive share drift |
| R13 | Monthly close and immutable audit | P1 | Large | Creates accountable accounting periods |
| R14 | CA filing readiness and document bundle | P1 | Large | Reduces accountant cleanup and missing evidence |
| R15 | Complete mobile navigation and accessible operations | P1 | Medium | Broad usability and accessibility improvement |
| R16 | Read-only finance AI with evidence | P2 | Medium-large | Useful assistance after the ledger is trustworthy |
| R17 | Production operations and large-data performance | P1 | Medium-large | Reduces outage and incident recovery risk |

The production-readiness report provides the requested why/user-flow/modules/APIs/UI/security/tests/priority/effort/impact details for all 17 recommendations, including agency billing, GST/CA validation, partner eligibility, mobile workflows and read-only AI. Reliability precedes feature expansion.

### Recommended next implementation prompt

> Implement only the P0 reliability fixes from docs/CURRENT-FULL-A-TO-Z-AUDIT-REPORT.md, beginning with B01-B05 and B37. Preserve existing local changes and real user data. Add failing regression tests first, use an isolated test database, make entity/effect/audit writes atomic and idempotent, implement a payload-bearing user-scoped outbox with conflict handling, and prove retry/offline/concurrency behavior. Do not build new agency modules, reset the real database, deploy or push until the fixes and test evidence are reviewed. Then proceed separately through authentication, backup/restore/wipe and report correctness findings.

## 25. Final Verdict

SparowVault is a substantial personal-finance codebase with functioning local startup, many useful engines and meaningful automated coverage. It is not yet a reliable production financial system and is not the full SparowFinanceOS agency product. The audit-only work is complete as a documented, evidence-backed assessment; untested areas remain explicitly listed. No claim of perfection, universal test coverage, regulatory compliance or production readiness is made.

Use the failing probes and prioritized roadmap to drive scoped remediation. Re-run and review evidence after fixes before expanding into invoices, GST, approvals, partner payouts and month close.
