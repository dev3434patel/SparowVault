# Module-Wise Audit

## Update - 11 September 2026

See the [fresh module/workflow audit](FULL-PROJECT-AUDIT-2026-09-11.md#5-module-wise-audit) and [complete static catalog](FULL-AUDIT-CATALOG-2026-09-11.md). Earlier findings below remain historical; current save/reload tests include a confirmed fresh-loan creation failure.

Audit date: 10 September 2026 (Asia/Kolkata). Repository: SparowVault. Baseline HEAD: `54eec068a37cceb9cccc2a63dca824e1e092f52e`. Scope includes the pre-existing local modifications. This is an audit-only deliverable, not a remediation or production certificate.

## Product-scope decision

The user explicitly chose to audit this SparowVault repository against the SparowFinanceOS brief. The current product is a personal-finance application, not an agency ERP. Similar names such as income, household partner, receipt-like transaction or subscription must not be treated as the requested agency feature.

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

## Shared behavior and coverage definitions

Most pages read Zustand data populated by repositories; cloud-mapped repositories use PHP generic APIs and mirror to IndexedDB. Therefore B01-B05/B14/B37 have cross-module reach even where a page itself has no local defect. User pages are authenticated-user scope; admin pages require the server admin role. Feature flags and plan gates are separate from authorization. A button being visible or statically wired is not proof that its full save/retry/reload lifecycle works.

Source extraction covers 313 action definitions and 987 named TS/PHP functions. See [ACTION-INVENTORY.md](</Volumes/ssd12/SparowVault/230826 SparowVault/docs/audit-evidence/2026-09-10/ACTION-INVENTORY.md>) and [FUNCTION-INVENTORY.md](</Volumes/ssd12/SparowVault/230826 SparowVault/docs/audit-evidence/2026-09-10/FUNCTION-INVENTORY.md>). No anonymous-callback or rendered-row multiplier is included.

## Dashboard: /

| Audit dimension | Observed implementation / assessment |
| --- | --- |
| 1-4 Identity, group, purpose, status | Overview. Cashflow, debt, balances, goals and next actions. Implemented for current personal/platform scope, partial against the agency brief; page state audited. |
| 5 Source | [src/components/pages/DashboardPage.tsx](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/DashboardPage.tsx>) |
| 6-8 Data source, APIs, stores | Zustand plus repositories; generic /api/data/entity.php and entity-item.php where cloud-mapped. Source selectors: dashboardMode, setDashboardMode, chartAccessibility, setPendingTransactionFilters, transactions, budgets, categories, accounts, cards, loans, emis, udhari, goals, investments, recurringRules, alerts, ledgerEvents, ledgerEffects, aiSuggestions, outstandingPrincipalPaise, status, isDeleted, expiresAt. Exact imports below. |
| 9-10 UI sections and forms | {`${greeting}, ${user?.displayName?.split(" ")[0] ?? "there"}.`}; Start with three basics; Bills & dues; Top suggestion; Cashflow survival; Safety &amp; goals; Income vs Expense; Upcoming & overdue; Top spending categories; Goal progress; Budget usage — this month; Alerts; Recent transactions; Financial Health Score |
| 11-12 Available actions and behavior | 29 source action definitions. Read-only derived KPI panels and navigation; onboarding/default seeding can duplicate (B34). Full handler/disabled/visibility inventory is linked below. |
| 13 Form fields | 1 field/control declarations in this file. Exact labels, binding props and validation hooks listed below; child dialog declarations are in the global inventory. |
| 14 Validation | Inline checks and/or delegated dialog validation. Frontend validation is not authoritative; backend transaction validation is stronger than other collection schemas (B14/B37). |
| 15 Empty state | Empty/no-data branches or delegated empty-state components exist. Fresh-user/seeded data were used, not every table empty condition. |
| 16 Loading state | Loading/busy state references exist; exact disabled bindings in action inventory. Slow-network/failure injection was selective, not every control. |
| 17 Error state | No explicit per-page error handling located. Repository fallback can turn server rejection into apparent success (B01); presence of toast code is not proof of correct failure semantics. |
| 18 Role permissions | Active user owns the dataset. Plan/feature gates may hide controls; generic writes are constrained to the authenticated tenant, not agency roles. |
| 19 PIN requirement | No independent action PIN found in this page. Normal authentication is not a per-action authorization challenge. |
| 20 Audit creation | No direct page audit writer found; repository/server helpers may log some operations. No complete per-action audit proof. |
| 21 Mobile behavior | 10 widths sampled; maximum root overflow 0px. This is layout screening, not every dialog/table state. |
| 22 Bugs found | B01, B17, B18 |
| 23 Missing features | Personal cashflow/debt/goals overview exists, not an agency accrual/GST/project dashboard. |
| 24 Suggested improvements | Resolve listed integrity/security defects first; then add typed contracts, explicit failure states and complete mobile/action coverage before agency expansion. |
| 25 Existing test coverage | Authenticated route rendered in custom browser audit. Textually related test files: tests/browser-e2e.mjs, tests/local-phase-09-ui-browser-e2e.mjs. These references are candidates, not measured branch coverage. |
| 26 Missing test coverage | Every enabled/disabled action, negative field, cancel/PIN failure, server error, reload persistence, role matrix and populated large-data state has not been executed. Add these to the release matrix, including child dialogs. |

### Data and service wiring

| Import | Bindings |
| --- | --- |
| @/store/dataStore | { useDataStore } |
| @/store/authStore | { useAuthStore } |
| @/services/calculations | {   budgetStatuses,   categoryBreakdown,   computeFinancialHealth,   deriveAccountBalanceFromAccount,   emergencyMonthsCoverage,   filterByMonth,   monthlyTrend,   savingsRate,   summarizeCardHealth,   summarizeLoan,   sumIncome,   sumExpense,   totalUdhariPayable,   totalUdhariReceivable, } |
| @/services/ledgerCalculations | { calculateLedgerMonthKpis, hasUsableLedger } |
| @/services/financeKpiEngine | {   calculateFinanceMonthKpis,   calculateConsolidatedNetWorthPaise,   operatingSurplusRate, } |
| @/services/cashflowSurvivalEngine | { buildCashflowSurvivalReport } |
| @/services/emergencyFundEngine | { buildEmergencyFundIntel } |
| @/services/goalEngine | { summarizeGoalsAtRisk } |
| @/services/smartBudgetEngine | { smartBudgetStatuses } |
| @/store/uiStore | { useUIStore } |
| @/services/categoryColorEngine | {   attachCategoryIcons,   expenseBreakdownWithDistinctChartColors,   hideDeletedCategorySlices, } |
| @/store/navStore | { useNavStore } |

### Fields and controls

| Source | Control | Label / props |
| --- | --- | --- |
| [src/components/pages/DashboardPage.tsx:417](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/DashboardPage.tsx:417>) | Select | {"value":"{dashboardMode}","onValueChange":"{(v) => setDashboardMode(v as typeof dashboardMode)}"} |

### Action trace

| Source | Label | Handler | Disabled |
| --- | --- | --- | --- |
| [src/components/pages/DashboardPage.tsx:430](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/DashboardPage.tsx:430>) | Reports | {() => setActive("reports")} | none on element |
| [src/components/pages/DashboardPage.tsx:433](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/DashboardPage.tsx:433>) | Export | {() => setActive("export")} | none on element |
| [src/components/pages/DashboardPage.tsx:450](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/DashboardPage.tsx:450>) | Add account | {() => setActive("accounts")} | none on element |
| [src/components/pages/DashboardPage.tsx:451](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/DashboardPage.tsx:451>) | Review categories | {() => setActive("categories")} | none on element |
| [src/components/pages/DashboardPage.tsx:452](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/DashboardPage.tsx:452>) | Add transaction | {() => setActive("transactions")} | none on element |
| [src/components/pages/DashboardPage.tsx:515](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/DashboardPage.tsx:515>) | {formatINR(paiseToRupees(stats.emiThisMonth))} | {() => setActive("loans")} | none on element |
| [src/components/pages/DashboardPage.tsx:525](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/DashboardPage.tsx:525>) | {formatINR(paiseToRupees(stats.upcomingCCDue))} | {() => setActive("cards")} | none on element |
| [src/components/pages/DashboardPage.tsx:535](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/DashboardPage.tsx:535>) | {formatINR(paiseToRupees(stats.udhariPayable))} | {() => setActive("udhari")} | none on element |
| [src/components/pages/DashboardPage.tsx:557](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/DashboardPage.tsx:557>) | Open suggestions | {() => setActive("suggestions")} | none on element |
| [src/components/pages/DashboardPage.tsx:564](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/DashboardPage.tsx:564>) | Refresh suggestions | {() => setActive("suggestions")} | none on element |
| [src/components/pages/DashboardPage.tsx:578](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/DashboardPage.tsx:578>) | (icon/dynamic) | {() => setActive("income")} | none on element |
| [src/components/pages/DashboardPage.tsx:597](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/DashboardPage.tsx:597>) | (icon/dynamic) | {() => setActive("expenses")} | none on element |
| [src/components/pages/DashboardPage.tsx:636](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/DashboardPage.tsx:636>) | (icon/dynamic) | {() => setActive("accounts")} | none on element |
| [src/components/pages/DashboardPage.tsx:865](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/DashboardPage.tsx:865>) | Open goals | {() => setActive("goals")} | none on element |
| [src/components/pages/DashboardPage.tsx:964](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/DashboardPage.tsx:964>) | (icon/dynamic) | {() => setActive("loans")} | none on element |
| [src/components/pages/DashboardPage.tsx:970](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/DashboardPage.tsx:970>) | (icon/dynamic) | {() => setActive("cards")} | none on element |
| [src/components/pages/DashboardPage.tsx:981](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/DashboardPage.tsx:981>) | (icon/dynamic) | {() => setActive("udhari")} | none on element |
| [src/components/pages/DashboardPage.tsx:987](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/DashboardPage.tsx:987>) | (icon/dynamic) | {() => setActive("udhari")} | none on element |
| [src/components/pages/DashboardPage.tsx:1008](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/DashboardPage.tsx:1008>) | View all | {() => setActive("reports")} | none on element |
| [src/components/pages/DashboardPage.tsx:1026](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/DashboardPage.tsx:1026>) | {stats.catBreak.map((d, i) => ( <Cell key={i} fill={d.color} /> ))} | {(e) => {                           const row = e?.payload as (typeof stats.catBreak)[number] \| undefined;                           if (row) drillCategorySpend(row);                         }} | none on element |
| [src/components/pages/DashboardPage.tsx:1050](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/DashboardPage.tsx:1050>) | (icon/dynamic) | {() => drillCategorySpend(c)} | none on element |
| [src/components/pages/DashboardPage.tsx:1084](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/DashboardPage.tsx:1084>) | View | {() => setActive("goals")} | none on element |
| [src/components/pages/DashboardPage.tsx:1111](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/DashboardPage.tsx:1111>) | Create one | {() => setActive("goals")} | none on element |
| [src/components/pages/DashboardPage.tsx:1135](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/DashboardPage.tsx:1135>) | Manage | {() => setActive("budgets")} | none on element |
| [src/components/pages/DashboardPage.tsx:1187](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/DashboardPage.tsx:1187>) | View all | {() => setActive("transactions")} | none on element |
| [src/components/pages/DashboardPage.tsx:1273](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/DashboardPage.tsx:1273>) | (icon/dynamic) | {onClick} | none on element |
| [src/components/pages/DashboardPage.tsx:1287](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/DashboardPage.tsx:1287>) | (icon/dynamic) | {(e) => e.stopPropagation()} | none on element |
| [src/components/pages/DashboardPage.tsx:1323](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/DashboardPage.tsx:1323>) | (icon/dynamic) | {onClick} | none on element |
| [src/components/pages/DashboardPage.tsx:1443](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/DashboardPage.tsx:1443>) | Create one | {() => setActive("budgets")} | none on element |

### Validation / persistence / feedback call sites

| Source | Call | Arguments (source expression) |
| --- | --- | --- |
| [src/components/pages/DashboardPage.tsx:219](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/DashboardPage.tsx:219>) | goalSavedPaise | g |
| [src/components/pages/DashboardPage.tsx:269](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/DashboardPage.tsx:269>) | hideDeletedCategorySlices | categoryBreakdown(curTx, categories), categories |
| [src/components/pages/DashboardPage.tsx:284](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/DashboardPage.tsx:284>) | investments       .filter((i) => i.isDeleted !== 1 && i.status === "active")       .reduce | (a, i) => a + investmentTotalContributedPaise(i), 0 |
| [src/components/pages/DashboardPage.tsx:1092](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/DashboardPage.tsx:1092>) | goalSavedPaise | g |

## Transactions: /transactions

| Audit dimension | Observed implementation / assessment |
| --- | --- |
| 1-4 Identity, group, purpose, status | Ledger. Unified transaction list, filters and editors. Implemented for current personal/platform scope, partial against the agency brief; page state audited. |
| 5 Source | [src/components/pages/TransactionsPage.tsx](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/TransactionsPage.tsx>) |
| 6-8 Data source, APIs, stores | Zustand plus repositories; generic /api/data/entity.php and entity-item.php where cloud-mapped. Source selectors: transactions, categories, accounts, consumePendingTransactionFilters, add, delete. Exact imports below. |
| 9-10 UI sections and forms | {           fixedType === "income"             ? "Income"             : fixedType === "expense"               ? "Expenses"               : "All Transactions"         }; Add transaction; Edit transaction |
| 11-12 Available actions and behavior | 9 source action definitions. Quick add, edit/delete/bulk operations and exports; financial effects are recomputed locally and also stored in SQL. Full handler/disabled/visibility inventory is linked below. |
| 13 Form fields | 9 field/control declarations in this file. Exact labels, binding props and validation hooks listed below; child dialog declarations are in the global inventory. |
| 14 Validation | Inline checks and/or delegated dialog validation. Frontend validation is not authoritative; backend transaction validation is stronger than other collection schemas (B14/B37). |
| 15 Empty state | Empty/no-data branches or delegated empty-state components exist. Fresh-user/seeded data were used, not every table empty condition. |
| 16 Loading state | No explicit loading/busy declaration in this page; shared shell may load data. Slow-network/failure injection was selective, not every control. |
| 17 Error state | No explicit per-page error handling located. Repository fallback can turn server rejection into apparent success (B01); presence of toast code is not proof of correct failure semantics. |
| 18 Role permissions | Active user owns the dataset. Plan/feature gates may hide controls; generic writes are constrained to the authenticated tenant, not agency roles. |
| 19 PIN requirement | No independent action PIN found in this page. Normal authentication is not a per-action authorization challenge. |
| 20 Audit creation | No direct page audit writer found; repository/server helpers may log some operations. No complete per-action audit proof. |
| 21 Mobile behavior | 10 widths sampled; maximum root overflow 0px. This is layout screening, not every dialog/table state. |
| 22 Bugs found | B01, B02, B03, B04, B05, B37 |
| 23 Missing features | Personal payment transactions and separate SaaS subscription checkout; no client payment approval/proof workflow. Transaction adjustment intent exists; no approved journal voucher or close-period controls. |
| 24 Suggested improvements | Resolve listed integrity/security defects first; then add typed contracts, explicit failure states and complete mobile/action coverage before agency expansion. |
| 25 Existing test coverage | Authenticated route rendered in custom browser audit. Textually related test files: tests/local-phase-09-ui-browser-e2e.mjs. These references are candidates, not measured branch coverage. |
| 26 Missing test coverage | Every enabled/disabled action, negative field, cancel/PIN failure, server error, reload persistence, role matrix and populated large-data state has not been executed. Add these to the release matrix, including child dialogs. |

### Data and service wiring

| Import | Bindings |
| --- | --- |
| @/store/dataStore | { useDataStore } |
| @/store/uiStore | { useUIStore } |
| @/store/uiStore | { confirm } |
| @/repositories | { transactionRepo } |
| @/store/authStore | { useAuthStore } |
| @/services/calculations | { isIncomeTx, sumExpense, sumIncome } |

### Fields and controls

| Source | Control | Label / props |
| --- | --- | --- |
| [src/components/pages/TransactionsPage.tsx:248](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/TransactionsPage.tsx:248>) | Input | {"placeholder":"\"Search merchant, description, notes, tags, category…\"","value":"{search}","onChange":"{(e) => setSearch(e.target.value)}","className":"\"pl-8\""} |
| [src/components/pages/TransactionsPage.tsx:267](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/TransactionsPage.tsx:267>) | Select | {"value":"{sort}","onValueChange":"{(v) => setSort(v as typeof sort)}"} |
| [src/components/pages/TransactionsPage.tsx:285](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/TransactionsPage.tsx:285>) | Select | {"value":"{typeFilter}","onValueChange":"{(v) => setTypeFilter(v as typeof typeFilter)}"} |
| [src/components/pages/TransactionsPage.tsx:302](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/TransactionsPage.tsx:302>) | Select | {"value":"{paymentFilter}","onValueChange":"{(v) => setPaymentFilter(v as typeof paymentFilter)}"} |
| [src/components/pages/TransactionsPage.tsx:318](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/TransactionsPage.tsx:318>) | Select | {"value":"{categoryFilter}","onValueChange":"{(v) => setCategoryFilter(v)}"} |
| [src/components/pages/TransactionsPage.tsx:334](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/TransactionsPage.tsx:334>) | Select | {"value":"{accountFilter}","onValueChange":"{(v) => setAccountFilter(v)}"} |
| [src/components/pages/TransactionsPage.tsx:350](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/TransactionsPage.tsx:350>) | Input | {"type":"\"date\"","value":"{dateFrom}","onChange":"{(e) => setDateFrom(e.target.value)}","placeholder":"\"From\""} |
| [src/components/pages/TransactionsPage.tsx:356](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/TransactionsPage.tsx:356>) | Input | {"type":"\"date\"","value":"{dateTo}","onChange":"{(e) => setDateTo(e.target.value)}","placeholder":"\"To\""} |
| [src/components/pages/TransactionsPage.tsx:435](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/TransactionsPage.tsx:435>) | input | {"type":"\"checkbox\"","className":"\"h-4 w-4 rounded border-border-strong\"","checked":"{selected.has(t.id)}","onChange":"{(e) => {\n                            const s = new Set(selected);\n                            if (e.target.checked) s.add(t.id);\n                            else s.delete(t.id);\n                            setSelected(s);\n                          }}"} |

### Action trace

| Source | Label | Handler | Disabled |
| --- | --- | --- | --- |
| [src/components/pages/TransactionsPage.tsx:239](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/TransactionsPage.tsx:239>) | Add | {() => setAdding(true)} | none on element |
| [src/components/pages/TransactionsPage.tsx:255](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/TransactionsPage.tsx:255>) | Filters {activeFilters > 0 ? ( <Badge variant="info" className="ml-1"> {activeFilters} </Badge> ) : null} | {() => setFiltersOpen((v) => !v)} | none on element |
| [src/components/pages/TransactionsPage.tsx:367](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/TransactionsPage.tsx:367>) | Reset | {resetFilters} | none on element |
| [src/components/pages/TransactionsPage.tsx:390](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/TransactionsPage.tsx:390>) | Delete | {bulkDelete} | none on element |
| [src/components/pages/TransactionsPage.tsx:393](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/TransactionsPage.tsx:393>) | Clear | {() => setSelected(new Set())} | none on element |
| [src/components/pages/TransactionsPage.tsx:408](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/TransactionsPage.tsx:408>) | Add transaction | {() => setAdding(true)} | none on element |
| [src/components/pages/TransactionsPage.tsx:516](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/TransactionsPage.tsx:516>) | "Edit" | {() => setEditing(t)} | none on element |
| [src/components/pages/TransactionsPage.tsx:524](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/TransactionsPage.tsx:524>) | "Duplicate" | {() => handleDuplicate(t)} | none on element |
| [src/components/pages/TransactionsPage.tsx:532](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/TransactionsPage.tsx:532>) | "Delete" | {() => handleDelete(t.id)} | none on element |

### Validation / persistence / feedback call sites

| Source | Call | Arguments (source expression) |
| --- | --- | --- |
| [src/components/pages/TransactionsPage.tsx:152](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/TransactionsPage.tsx:152>) | confirm | { title: "Delete this transaction?", description: "This transaction will be removed permanently.", destructive: true, confirmLabel: "Delete transaction", } |
| [src/components/pages/TransactionsPage.tsx:159](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/TransactionsPage.tsx:159>) | transactionRepo.softDelete | id |
| [src/components/pages/TransactionsPage.tsx:161](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/TransactionsPage.tsx:161>) | toast | { title: "Transaction deleted", kind: "info" } |
| [src/components/pages/TransactionsPage.tsx:177](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/TransactionsPage.tsx:177>) | transactionRepo.create | { userId: user.id, data: { ...rest, description: `${t.description} (copy)` } as Transaction, } |
| [src/components/pages/TransactionsPage.tsx:182](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/TransactionsPage.tsx:182>) | toast | { title: "Duplicated", kind: "success" } |
| [src/components/pages/TransactionsPage.tsx:187](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/TransactionsPage.tsx:187>) | confirm | { title: `Delete ${selected.size} transactions?`, description: "Selected transactions will be removed permanently.", destructive: true, confirmLabel: "Delete selected", } |
| [src/components/pages/TransactionsPage.tsx:195](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/TransactionsPage.tsx:195>) | transactionRepo.softDeleteMany | ids |
| [src/components/pages/TransactionsPage.tsx:199](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/TransactionsPage.tsx:199>) | toast | { title: `Deleted ${selected.size} transactions`, kind: "info" } |
| [src/components/pages/TransactionsPage.tsx:442](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/TransactionsPage.tsx:442>) | s.delete | t.id |
| [src/components/pages/TransactionsPage.tsx:535](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/TransactionsPage.tsx:535>) | handleDelete | t.id |

## Income: /income

| Audit dimension | Observed implementation / assessment |
| --- | --- |
| 1-4 Identity, group, purpose, status | Ledger. Income-focused ledger view. Implemented for current personal/platform scope, partial against the agency brief; page state audited. |
| 5 Source | [src/components/pages/IncomePage.tsx](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/IncomePage.tsx>) |
| 6-8 Data source, APIs, stores | Zustand plus repositories; generic /api/data/entity.php and entity-item.php where cloud-mapped. Source selectors: See imported store and child components. Exact imports below. |
| 9-10 UI sections and forms | See delegated page/header and child components. |
| 11-12 Available actions and behavior | 0 source action definitions. Type-filtered transaction grid and transaction dialog; income is not verified invoice revenue. Full handler/disabled/visibility inventory is linked below. |
| 13 Form fields | 0 field/control declarations in this file. Exact labels, binding props and validation hooks listed below; child dialog declarations are in the global inventory. |
| 14 Validation | Inline checks and/or delegated dialog validation. Frontend validation is not authoritative; backend transaction validation is stronger than other collection schemas (B14/B37). |
| 15 Empty state | No explicit empty-state primitive found in this file; inspect children. Fresh-user/seeded data were used, not every table empty condition. |
| 16 Loading state | No explicit loading/busy declaration in this page; shared shell may load data. Slow-network/failure injection was selective, not every control. |
| 17 Error state | No explicit per-page error handling located. Repository fallback can turn server rejection into apparent success (B01); presence of toast code is not proof of correct failure semantics. |
| 18 Role permissions | Active user owns the dataset. Plan/feature gates may hide controls; generic writes are constrained to the authenticated tenant, not agency roles. |
| 19 PIN requirement | No independent action PIN found in this page. Normal authentication is not a per-action authorization challenge. |
| 20 Audit creation | No direct page audit writer found; repository/server helpers may log some operations. No complete per-action audit proof. |
| 21 Mobile behavior | 10 widths sampled; maximum root overflow 0px. This is layout screening, not every dialog/table state. |
| 22 Bugs found | B01, B37 |
| 23 Missing features | Generic income classification exists without agency revenue recognition. |
| 24 Suggested improvements | Resolve listed integrity/security defects first; then add typed contracts, explicit failure states and complete mobile/action coverage before agency expansion. |
| 25 Existing test coverage | Authenticated route rendered in custom browser audit. Textually related test files: No direct page-name/route test reference found. These references are candidates, not measured branch coverage. |
| 26 Missing test coverage | Every enabled/disabled action, negative field, cancel/PIN failure, server error, reload persistence, role matrix and populated large-data state has not been executed. Add these to the release matrix, including child dialogs. |

### Data and service wiring

| Import | Bindings |
| --- | --- |


### Fields and controls

| Source | Control | Label / props |
| --- | --- | --- |


### Action trace

| Source | Label | Handler | Disabled |
| --- | --- | --- | --- |


### Validation / persistence / feedback call sites

| Source | Call | Arguments (source expression) |
| --- | --- | --- |


## Expenses: /expenses

| Audit dimension | Observed implementation / assessment |
| --- | --- |
| 1-4 Identity, group, purpose, status | Ledger. Expense-focused ledger view. Implemented for current personal/platform scope, partial against the agency brief; page state audited. |
| 5 Source | [src/components/pages/ExpensesPage.tsx](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/ExpensesPage.tsx>) |
| 6-8 Data source, APIs, stores | Zustand plus repositories; generic /api/data/entity.php and entity-item.php where cloud-mapped. Source selectors: See imported store and child components. Exact imports below. |
| 9-10 UI sections and forms | See delegated page/header and child components. |
| 11-12 Available actions and behavior | 0 source action definitions. Expense classification and transaction editing; no submitted/approved/paid workflow. Full handler/disabled/visibility inventory is linked below. |
| 13 Form fields | 0 field/control declarations in this file. Exact labels, binding props and validation hooks listed below; child dialog declarations are in the global inventory. |
| 14 Validation | Inline checks and/or delegated dialog validation. Frontend validation is not authoritative; backend transaction validation is stronger than other collection schemas (B14/B37). |
| 15 Empty state | No explicit empty-state primitive found in this file; inspect children. Fresh-user/seeded data were used, not every table empty condition. |
| 16 Loading state | No explicit loading/busy declaration in this page; shared shell may load data. Slow-network/failure injection was selective, not every control. |
| 17 Error state | No explicit per-page error handling located. Repository fallback can turn server rejection into apparent success (B01); presence of toast code is not proof of correct failure semantics. |
| 18 Role permissions | Active user owns the dataset. Plan/feature gates may hide controls; generic writes are constrained to the authenticated tenant, not agency roles. |
| 19 PIN requirement | No independent action PIN found in this page. Normal authentication is not a per-action authorization challenge. |
| 20 Audit creation | No direct page audit writer found; repository/server helpers may log some operations. No complete per-action audit proof. |
| 21 Mobile behavior | 10 widths sampled; maximum root overflow 0px. This is layout screening, not every dialog/table state. |
| 22 Bugs found | B01, B18, B19, B37 |
| 23 Missing features | Personal expense CRUD, classification and flags exist; no draft/submit/approve/pay agency lifecycle. |
| 24 Suggested improvements | Resolve listed integrity/security defects first; then add typed contracts, explicit failure states and complete mobile/action coverage before agency expansion. |
| 25 Existing test coverage | Authenticated route rendered in custom browser audit. Textually related test files: No direct page-name/route test reference found. These references are candidates, not measured branch coverage. |
| 26 Missing test coverage | Every enabled/disabled action, negative field, cancel/PIN failure, server error, reload persistence, role matrix and populated large-data state has not been executed. Add these to the release matrix, including child dialogs. |

### Data and service wiring

| Import | Bindings |
| --- | --- |


### Fields and controls

| Source | Control | Label / props |
| --- | --- | --- |


### Action trace

| Source | Label | Handler | Disabled |
| --- | --- | --- | --- |


### Validation / persistence / feedback call sites

| Source | Call | Arguments (source expression) |
| --- | --- | --- |


## Budgets: /budgets

| Audit dimension | Observed implementation / assessment |
| --- | --- |
| 1-4 Identity, group, purpose, status | Planning. Category budget planning and actuals. Implemented for current personal/platform scope, partial against the agency brief; page state audited. |
| 5 Source | [src/components/pages/BudgetsPage.tsx](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/BudgetsPage.tsx>) |
| 6-8 Data source, APIs, stores | Zustand plus repositories; generic /api/data/entity.php and entity-item.php where cloud-mapped. Source selectors: budgets, categories, transactions, recurringRules, budget, spentPaise, level, burnRisk, percentUsed, dayProgressPct, adjustedMonthEndProjectedPaise, projectedMonthEndPaise, projectedOverrun. Exact imports below. |
| 9-10 UI sections and forms | "Budget Planner"; {formatINR(paiseToRupees(totalBudget))}; {formatINR(paiseToRupees(totalSpent))}; {formatINR(paiseToRupees(Math.max(0, totalBudget - totalSpent)))}; {formatINR(paiseToRupees(overallProjected))}; {budget ? "Edit Budget" : "New Budget"} |
| 11-12 Available actions and behavior | 9 source action definitions. Budget creation/update, smart allocation and progress; no agency budget approval or close lock. Full handler/disabled/visibility inventory is linked below. |
| 13 Form fields | 14 field/control declarations in this file. Exact labels, binding props and validation hooks listed below; child dialog declarations are in the global inventory. |
| 14 Validation | budgetSchema.safeParse. Frontend validation is not authoritative; backend transaction validation is stronger than other collection schemas (B14/B37). |
| 15 Empty state | Empty/no-data branches or delegated empty-state components exist. Fresh-user/seeded data were used, not every table empty condition. |
| 16 Loading state | Loading/busy state references exist; exact disabled bindings in action inventory. Slow-network/failure injection was selective, not every control. |
| 17 Error state | Error/validation handling references exist. Repository fallback can turn server rejection into apparent success (B01); presence of toast code is not proof of correct failure semantics. |
| 18 Role permissions | Active user owns the dataset. Plan/feature gates may hide controls; generic writes are constrained to the authenticated tenant, not agency roles. |
| 19 PIN requirement | No independent action PIN found in this page. Normal authentication is not a per-action authorization challenge. |
| 20 Audit creation | No direct page audit writer found; repository/server helpers may log some operations. No complete per-action audit proof. |
| 21 Mobile behavior | 10 widths sampled; maximum root overflow 0px. This is layout screening, not every dialog/table state. |
| 22 Bugs found | B01, B14 |
| 23 Missing features | Personal category budgets and recommendations exist, not project/cost-center approval budgets. |
| 24 Suggested improvements | Resolve listed integrity/security defects first; then add typed contracts, explicit failure states and complete mobile/action coverage before agency expansion. |
| 25 Existing test coverage | Authenticated route rendered in custom browser audit. Textually related test files: tests/local-phase-09-ui-browser-e2e.mjs. These references are candidates, not measured branch coverage. |
| 26 Missing test coverage | Every enabled/disabled action, negative field, cancel/PIN failure, server error, reload persistence, role matrix and populated large-data state has not been executed. Add these to the release matrix, including child dialogs. |

### Data and service wiring

| Import | Bindings |
| --- | --- |
| @/store/dataStore | { useDataStore } |
| @/store/authStore | { useAuthStore } |
| @/repositories | { budgetRepo } |
| @/store/uiStore | { useUIStore } |
| @/store/uiStore | { confirm } |
| @/services/calculations | { projectMonthEndSpend } |
| @/services/smartBudgetEngine | { smartBudgetStatuses } |
| @/services/validators | { budgetSchema } |
| @/services/refIntegrity | { refsForCategory } |

### Fields and controls

| Source | Control | Label / props |
| --- | --- | --- |
| [src/components/pages/BudgetsPage.tsx:117](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/BudgetsPage.tsx:117>) | Select | {"value":"{String(month)}","onValueChange":"{(v) => setMonth(+v)}"} |
| [src/components/pages/BudgetsPage.tsx:129](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/BudgetsPage.tsx:129>) | Select | {"value":"{String(year)}","onValueChange":"{(v) => setYear(+v)}"} |
| [src/components/pages/BudgetsPage.tsx:376](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/BudgetsPage.tsx:376>) | Field | {"label":"\"Period\""} |
| [src/components/pages/BudgetsPage.tsx:377](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/BudgetsPage.tsx:377>) | Select | {"value":"{state.period}","onValueChange":"{(v) =>\n                setState({ ...state, period: v as typeof state.period })\n              }"} |
| [src/components/pages/BudgetsPage.tsx:392](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/BudgetsPage.tsx:392>) | Field | {"label":"\"Category\"","required":"true"} |
| [src/components/pages/BudgetsPage.tsx:393](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/BudgetsPage.tsx:393>) | Select | {"value":"{state.categoryId \|\| undefined}","onValueChange":"{(v) => setState({ ...state, categoryId: v })}"} |
| [src/components/pages/BudgetsPage.tsx:409](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/BudgetsPage.tsx:409>) | Field | {"label":"\"Year\""} |
| [src/components/pages/BudgetsPage.tsx:410](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/BudgetsPage.tsx:410>) | Input | {"type":"\"number\"","value":"{state.year}","onChange":"{(e) => setState({ ...state, year: +e.target.value })}"} |
| [src/components/pages/BudgetsPage.tsx:417](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/BudgetsPage.tsx:417>) | Field | {"label":"\"Month\""} |
| [src/components/pages/BudgetsPage.tsx:418](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/BudgetsPage.tsx:418>) | Input | {"type":"\"number\"","min":"{1}","max":"{12}","value":"{state.month}","onChange":"{(e) => setState({ ...state, month: +e.target.value })}"} |
| [src/components/pages/BudgetsPage.tsx:429](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/BudgetsPage.tsx:429>) | Field | {"label":"\"Amount (₹)\"","required":"true","className":"\"col-span-2\""} |
| [src/components/pages/BudgetsPage.tsx:430](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/BudgetsPage.tsx:430>) | Input | {"type":"\"number\"","step":"\"0.01\"","value":"{state.amount}","onChange":"{(e) => setState({ ...state, amount: +e.target.value })}"} |
| [src/components/pages/BudgetsPage.tsx:437](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/BudgetsPage.tsx:437>) | Field | {"label":"\"Mode\"","className":"\"col-span-2\""} |
| [src/components/pages/BudgetsPage.tsx:438](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/BudgetsPage.tsx:438>) | Select | {"value":"{state.mode}","onValueChange":"{(v) => setState({ ...state, mode: v as typeof state.mode })}"} |

### Action trace

| Source | Label | Handler | Disabled |
| --- | --- | --- | --- |
| [src/components/pages/BudgetsPage.tsx:110](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/BudgetsPage.tsx:110>) | New Budget | {() => setAdding(true)} | none on element |
| [src/components/pages/BudgetsPage.tsx:183](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/BudgetsPage.tsx:183>) | Create Budget | {() => setAdding(true)} | none on element |
| [src/components/pages/BudgetsPage.tsx:250](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/BudgetsPage.tsx:250>) | (icon/dynamic) | {() => setEditing(s.budget)} | none on element |
| [src/components/pages/BudgetsPage.tsx:257](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/BudgetsPage.tsx:257>) | (icon/dynamic) | {() => handleDelete(s.budget.id)} | none on element |
| [src/components/pages/BudgetsPage.tsx:375](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/BudgetsPage.tsx:375>) | {state.period === "monthly" ? ( <Field label="Month"> <Input type="number" min={1} max={12} value={state.month} onChange={(e) => setState({ ...state, month: +e.target.value })} /> </Field> ) : ( <div /> )} {err ? ( <div className="col-span-2 rounded-md bg-expense-soft p-2 text-xs text-danger"> {err} </div> ) : null} | {submit} | none on element |
| [src/components/pages/BudgetsPage.tsx:452](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/BudgetsPage.tsx:452>) | (icon/dynamic) | {(v) =>                 setState({ ...state, carryForward: v ? 1 : 0 })               } | none on element |
| [src/components/pages/BudgetsPage.tsx:461](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/BudgetsPage.tsx:461>) | (icon/dynamic) | {(v) =>                 setState({ ...state, rolloverSavings: v ? 1 : 0 })               } | none on element |
| [src/components/pages/BudgetsPage.tsx:475](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/BudgetsPage.tsx:475>) | Cancel | {onClose} | none on element |
| [src/components/pages/BudgetsPage.tsx:478](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/BudgetsPage.tsx:478>) | Save | parent/trigger | none on element |

### Validation / persistence / feedback call sites

| Source | Call | Arguments (source expression) |
| --- | --- | --- |
| [src/components/pages/BudgetsPage.tsx:85](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/BudgetsPage.tsx:85>) | toast | { title: "Budget has linked category activity", description: refs.message, kind: "info", } |
| [src/components/pages/BudgetsPage.tsx:92](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/BudgetsPage.tsx:92>) | confirm | { title: "Delete this budget?", description: "This budget will be removed permanently.", destructive: true, confirmLabel: "Delete budget", } |
| [src/components/pages/BudgetsPage.tsx:99](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/BudgetsPage.tsx:99>) | budgetRepo.softDelete | id |
| [src/components/pages/BudgetsPage.tsx:101](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/BudgetsPage.tsx:101>) | toast | { title: "Budget removed", kind: "info" } |
| [src/components/pages/BudgetsPage.tsx:260](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/BudgetsPage.tsx:260>) | handleDelete | s.budget.id |
| [src/components/pages/BudgetsPage.tsx:286](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/BudgetsPage.tsx:286>) | toast | { title: editing ? "Budget updated" : "Budget created", kind: "success", } |
| [src/components/pages/BudgetsPage.tsx:351](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/BudgetsPage.tsx:351>) | budgetSchema.safeParse | state |
| [src/components/pages/BudgetsPage.tsx:358](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/BudgetsPage.tsx:358>) | budgetRepo.update | budget.id, parse.data |
| [src/components/pages/BudgetsPage.tsx:359](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/BudgetsPage.tsx:359>) | onSaved | updated |
| [src/components/pages/BudgetsPage.tsx:361](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/BudgetsPage.tsx:361>) | budgetRepo.create | { userId, data: parse.data as unknown as Budget, } |
| [src/components/pages/BudgetsPage.tsx:365](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/BudgetsPage.tsx:365>) | onSaved | created |

## Goals: /goals

| Audit dimension | Observed implementation / assessment |
| --- | --- |
| 1-4 Identity, group, purpose, status | Planning. Savings goals and planned purchases. Implemented for current personal/platform scope, partial against the agency brief; page state audited. |
| 5 Source | [src/components/pages/GoalsPage.tsx](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/GoalsPage.tsx>) |
| 6-8 Data source, APIs, stores | Zustand plus repositories; generic /api/data/entity.php and entity-item.php where cloud-mapped. Source selectors: goals, accounts, targetDate, autoContributionEnabled, autoContributionAmount, autoContributionDay. Exact imports below. |
| 9-10 UI sections and forms | "Goals & Planned Purchases"; Contribute to {goal?.title}; {goal ? "Edit Goal" : "New Goal"} |
| 11-12 Available actions and behavior | 13 source action definitions. Create/edit goals and contributions; verify linked cash/event lifecycle before relying on aggregate balances. Full handler/disabled/visibility inventory is linked below. |
| 13 Form fields | 17 field/control declarations in this file. Exact labels, binding props and validation hooks listed below; child dialog declarations are in the global inventory. |
| 14 Validation | goalSchema.safeParse. Frontend validation is not authoritative; backend transaction validation is stronger than other collection schemas (B14/B37). |
| 15 Empty state | Empty/no-data branches or delegated empty-state components exist. Fresh-user/seeded data were used, not every table empty condition. |
| 16 Loading state | Loading/busy state references exist; exact disabled bindings in action inventory. Slow-network/failure injection was selective, not every control. |
| 17 Error state | Error/validation handling references exist. Repository fallback can turn server rejection into apparent success (B01); presence of toast code is not proof of correct failure semantics. |
| 18 Role permissions | Active user owns the dataset. Plan/feature gates may hide controls; generic writes are constrained to the authenticated tenant, not agency roles. |
| 19 PIN requirement | No independent action PIN found in this page. Normal authentication is not a per-action authorization challenge. |
| 20 Audit creation | No direct page audit writer found; repository/server helpers may log some operations. No complete per-action audit proof. |
| 21 Mobile behavior | 10 widths sampled; maximum root overflow 0px. This is layout screening, not every dialog/table state. |
| 22 Bugs found | B01, B14 |
| 23 Missing features | No agency lifecycle/role/close-period equivalence is implied by this personal-finance view. |
| 24 Suggested improvements | Resolve listed integrity/security defects first; then add typed contracts, explicit failure states and complete mobile/action coverage before agency expansion. |
| 25 Existing test coverage | Authenticated route rendered in custom browser audit. Textually related test files: tests/local-phase-09-ui-browser-e2e.mjs. These references are candidates, not measured branch coverage. |
| 26 Missing test coverage | Every enabled/disabled action, negative field, cancel/PIN failure, server error, reload persistence, role matrix and populated large-data state has not been executed. Add these to the release matrix, including child dialogs. |

### Data and service wiring

| Import | Bindings |
| --- | --- |
| @/store/dataStore | { useDataStore } |
| @/store/authStore | { useAuthStore } |
| @/repositories | { goalRepo, goalContribRepo } |
| @/store/uiStore | { useUIStore } |
| @/store/uiStore | { confirm } |
| @/services/validators | { goalSchema } |
| @/services/goalEngine | { buildGoalIntel, goalPriorityTier } |
| @/services/refIntegrity | { refsForGoal } |

### Fields and controls

| Source | Control | Label / props |
| --- | --- | --- |
| [src/components/pages/GoalsPage.tsx:296](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/GoalsPage.tsx:296>) | Field | {"label":"\"Amount (₹)\"","required":"true"} |
| [src/components/pages/GoalsPage.tsx:299](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/GoalsPage.tsx:299>) | Input | {"type":"\"number\"","className":"\"pl-8\"","value":"{amount}","onChange":"{(e) => setAmount(+e.target.value)}"} |
| [src/components/pages/GoalsPage.tsx:423](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/GoalsPage.tsx:423>) | Field | {"label":"\"Title\"","required":"true","className":"\"col-span-2\""} |
| [src/components/pages/GoalsPage.tsx:424](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/GoalsPage.tsx:424>) | Input | {"value":"{state.title}","onChange":"{(e) => setState({ ...state, title: e.target.value })}","placeholder":"\"iPhone 17 Pro\""} |
| [src/components/pages/GoalsPage.tsx:430](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/GoalsPage.tsx:430>) | Field | {"label":"\"Goal type\""} |
| [src/components/pages/GoalsPage.tsx:431](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/GoalsPage.tsx:431>) | Select | {"value":"{state.goalType}","onValueChange":"{(v) =>\n                setState({ ...state, goalType: v as typeof state.goalType })\n              }"} |
| [src/components/pages/GoalsPage.tsx:449](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/GoalsPage.tsx:449>) | Field | {"label":"\"Priority (1 high — 5 low)\""} |
| [src/components/pages/GoalsPage.tsx:450](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/GoalsPage.tsx:450>) | Input | {"type":"\"number\"","min":"{1}","max":"{5}","value":"{state.priority}","onChange":"{(e) =>\n                setState({ ...state, priority: +e.target.value as 1 \| 2 \| 3 \| 4 \| 5 })\n              }"} |
| [src/components/pages/GoalsPage.tsx:460](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/GoalsPage.tsx:460>) | Field | {"label":"\"Target amount (₹)\"","required":"true"} |
| [src/components/pages/GoalsPage.tsx:461](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/GoalsPage.tsx:461>) | Input | {"type":"\"number\"","value":"{state.targetAmount}","onChange":"{(e) => setState({ ...state, targetAmount: +e.target.value })}"} |
| [src/components/pages/GoalsPage.tsx:467](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/GoalsPage.tsx:467>) | Field | {"label":"\"Target date\"","required":"true"} |
| [src/components/pages/GoalsPage.tsx:468](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/GoalsPage.tsx:468>) | Input | {"type":"\"date\"","value":"{state.targetDate}","onChange":"{(e) => setState({ ...state, targetDate: e.target.value })}"} |
| [src/components/pages/GoalsPage.tsx:474](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/GoalsPage.tsx:474>) | Field | {"label":"\"Current saved\""} |
| [src/components/pages/GoalsPage.tsx:475](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/GoalsPage.tsx:475>) | Input | {"type":"\"number\"","value":"{state.currentSaved}","onChange":"{(e) => setState({ ...state, currentSaved: +e.target.value })}"} |
| [src/components/pages/GoalsPage.tsx:481](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/GoalsPage.tsx:481>) | Field | {"label":"\"Icon\""} |
| [src/components/pages/GoalsPage.tsx:482](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/GoalsPage.tsx:482>) | Input | {"value":"{state.icon}","onChange":"{(e) => setState({ ...state, icon: e.target.value })}","placeholder":"\"🎯\""} |
| [src/components/pages/GoalsPage.tsx:488](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/GoalsPage.tsx:488>) | Field | {"label":"\"Goal style\"","className":"\"col-span-2\""} |

### Action trace

| Source | Label | Handler | Disabled |
| --- | --- | --- | --- |
| [src/components/pages/GoalsPage.tsx:115](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/GoalsPage.tsx:115>) | New Goal | {() => setAdding(true)} | none on element |
| [src/components/pages/GoalsPage.tsx:129](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/GoalsPage.tsx:129>) | New Goal | {() => setAdding(true)} | none on element |
| [src/components/pages/GoalsPage.tsx:221](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/GoalsPage.tsx:221>) | Contribute | {() => setContributing(g)} | {isComplete} |
| [src/components/pages/GoalsPage.tsx:230](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/GoalsPage.tsx:230>) | (icon/dynamic) | {() => setEditing(g)} | none on element |
| [src/components/pages/GoalsPage.tsx:237](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/GoalsPage.tsx:237>) | (icon/dynamic) | {() => handleDelete(g.id)} | none on element |
| [src/components/pages/GoalsPage.tsx:269](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/GoalsPage.tsx:269>) | (icon/dynamic) | {(amt) => contributing && contribute(contributing, amt)} | none on element |
| [src/components/pages/GoalsPage.tsx:308](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/GoalsPage.tsx:308>) | Cancel | {onClose} | none on element |
| [src/components/pages/GoalsPage.tsx:311](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/GoalsPage.tsx:311>) | Add contribution | {() => amount > 0 && onSubmit(amount)} | {amount <= 0} |
| [src/components/pages/GoalsPage.tsx:422](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/GoalsPage.tsx:422>) | {err ? ( <div className="col-span-2 rounded-md bg-expense-soft p-2 text-xs text-danger"> {err} </div> ) : null} | {submit} | none on element |
| [src/components/pages/GoalsPage.tsx:492](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/GoalsPage.tsx:492>) | {icon} | {() => setState({ ...state, icon })} | none on element |
| [src/components/pages/GoalsPage.tsx:508](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/GoalsPage.tsx:508>) | (icon/dynamic) | {() => setState({ ...state, color })} | none on element |
| [src/components/pages/GoalsPage.tsx:527](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/GoalsPage.tsx:527>) | Cancel | {onClose} | none on element |
| [src/components/pages/GoalsPage.tsx:530](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/GoalsPage.tsx:530>) | Save | parent/trigger | none on element |

### Validation / persistence / feedback call sites

| Source | Call | Arguments (source expression) |
| --- | --- | --- |
| [src/components/pages/GoalsPage.tsx:66](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/GoalsPage.tsx:66>) | toast | { title: "Cannot delete goal", description: refs.message, kind: "warning", } |
| [src/components/pages/GoalsPage.tsx:73](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/GoalsPage.tsx:73>) | confirm | { title: "Delete this goal?", description: "This goal will be removed permanently.", destructive: true, confirmLabel: "Delete goal", } |
| [src/components/pages/GoalsPage.tsx:80](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/GoalsPage.tsx:80>) | goalRepo.softDelete | id |
| [src/components/pages/GoalsPage.tsx:82](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/GoalsPage.tsx:82>) | toast | { title: "Goal removed", kind: "info" } |
| [src/components/pages/GoalsPage.tsx:87](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/GoalsPage.tsx:87>) | goalRepo.update | g.id, { currentSaved: g.currentSaved + amount, status: g.currentSaved + amount >= g.targetAmount ? "completed" : g.status, } |
| [src/components/pages/GoalsPage.tsx:92](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/GoalsPage.tsx:92>) | goalContribRepo.create | { userId: user.id, data: { goalId: g.id, date: new Date().toISOString(), amount, }, } |
| [src/components/pages/GoalsPage.tsx:101](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/GoalsPage.tsx:101>) | toast | { title: "Contribution added", description: `${formatINR(amount)} to ${g.title}`, kind: "success", } |
| [src/components/pages/GoalsPage.tsx:140](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/GoalsPage.tsx:140>) | goalSavedPaise | g |
| [src/components/pages/GoalsPage.tsx:168](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/GoalsPage.tsx:168>) | goalSavedPaise | g |
| [src/components/pages/GoalsPage.tsx:240](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/GoalsPage.tsx:240>) | handleDelete | g.id |
| [src/components/pages/GoalsPage.tsx:263](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/GoalsPage.tsx:263>) | toast | { title: editing ? "Goal updated" : "Goal created", kind: "success" } |
| [src/components/pages/GoalsPage.tsx:380](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/GoalsPage.tsx:380>) | goalSchema.safeParse | state |
| [src/components/pages/GoalsPage.tsx:400](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/GoalsPage.tsx:400>) | goalRepo.update | goal.id, payload as unknown as Partial<Goal> |
| [src/components/pages/GoalsPage.tsx:401](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/GoalsPage.tsx:401>) | onSaved | updated |
| [src/components/pages/GoalsPage.tsx:403](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/GoalsPage.tsx:403>) | goalRepo.create | { userId, data: payload as unknown as Goal, } |
| [src/components/pages/GoalsPage.tsx:407](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/GoalsPage.tsx:407>) | onSaved | created |

## Accounts: /accounts

| Audit dimension | Observed implementation / assessment |
| --- | --- |
| 1-4 Identity, group, purpose, status | Money. Cash/bank/UPI/wallet containers. Implemented for current personal/platform scope, partial against the agency brief; page state audited. |
| 5 Source | [src/components/pages/AccountsPage.tsx](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/AccountsPage.tsx>) |
| 6-8 Data source, APIs, stores | Zustand plus repositories; generic /api/data/entity.php and entity-item.php where cloud-mapped. Source selectors: accounts, transactions. Exact imports below. |
| 9-10 UI sections and forms | "Accounts"; {formatINR(paiseToRupees(totalBalance))}; {accounts.length}; {accounts.filter((a) => !a.isInactive).length}; {transactions.length}; {account ? "Edit Account" : "New Account"} |
| 11-12 Available actions and behavior | 7 source action definitions. Create/edit/soft-delete with client reference checks; one account created in the browser audit. Default containers duplicated on fresh registration. Full handler/disabled/visibility inventory is linked below. |
| 13 Form fields | 10 field/control declarations in this file. Exact labels, binding props and validation hooks listed below; child dialog declarations are in the global inventory. |
| 14 Validation | accountSchema.safeParse. Frontend validation is not authoritative; backend transaction validation is stronger than other collection schemas (B14/B37). |
| 15 Empty state | Empty/no-data branches or delegated empty-state components exist. Fresh-user/seeded data were used, not every table empty condition. |
| 16 Loading state | Loading/busy state references exist; exact disabled bindings in action inventory. Slow-network/failure injection was selective, not every control. |
| 17 Error state | Error/validation handling references exist. Repository fallback can turn server rejection into apparent success (B01); presence of toast code is not proof of correct failure semantics. |
| 18 Role permissions | Active user owns the dataset. Plan/feature gates may hide controls; generic writes are constrained to the authenticated tenant, not agency roles. |
| 19 PIN requirement | No independent action PIN found in this page. Normal authentication is not a per-action authorization challenge. |
| 20 Audit creation | No direct page audit writer found; repository/server helpers may log some operations. No complete per-action audit proof. |
| 21 Mobile behavior | 10 widths sampled; maximum root overflow 0px. This is layout screening, not every dialog/table state. |
| 22 Bugs found | B01, B34, B37 |
| 23 Missing features | No agency lifecycle/role/close-period equivalence is implied by this personal-finance view. |
| 24 Suggested improvements | Resolve listed integrity/security defects first; then add typed contracts, explicit failure states and complete mobile/action coverage before agency expansion. |
| 25 Existing test coverage | Authenticated route rendered in custom browser audit. Textually related test files: tests/local-phase-09-ui-browser-e2e.mjs. These references are candidates, not measured branch coverage. |
| 26 Missing test coverage | Every enabled/disabled action, negative field, cancel/PIN failure, server error, reload persistence, role matrix and populated large-data state has not been executed. Add these to the release matrix, including child dialogs. |

### Data and service wiring

| Import | Bindings |
| --- | --- |
| @/store/dataStore | { useDataStore } |
| @/store/authStore | { useAuthStore } |
| @/repositories | { accountRepo } |
| @/store/uiStore | { useUIStore } |
| @/store/uiStore | { confirm } |
| @/services/validators | { accountSchema } |
| @/services/calculations | { deriveAccountBalanceFromAccount } |
| @/services/refIntegrity | { refsForAccount } |

### Fields and controls

| Source | Control | Label / props |
| --- | --- | --- |
| [src/components/pages/AccountsPage.tsx:280](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/AccountsPage.tsx:280>) | Field | {"label":"\"Name\"","required":"true","className":"\"col-span-2\""} |
| [src/components/pages/AccountsPage.tsx:281](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/AccountsPage.tsx:281>) | Input | {"value":"{state.name}","onChange":"{(e) => setState({ ...state, name: e.target.value })}","placeholder":"\"HDFC Savings\""} |
| [src/components/pages/AccountsPage.tsx:287](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/AccountsPage.tsx:287>) | Field | {"label":"\"Type\""} |
| [src/components/pages/AccountsPage.tsx:288](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/AccountsPage.tsx:288>) | Select | {"value":"{state.type}","onValueChange":"{(v) => setState({ ...state, type: v as Account[\"type\"] })}"} |
| [src/components/pages/AccountsPage.tsx:304](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/AccountsPage.tsx:304>) | Field | {"label":"\"Institution\""} |
| [src/components/pages/AccountsPage.tsx:305](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/AccountsPage.tsx:305>) | Input | {"value":"{state.institution}","onChange":"{(e) => setState({ ...state, institution: e.target.value })}","placeholder":"\"HDFC Bank\""} |
| [src/components/pages/AccountsPage.tsx:311](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/AccountsPage.tsx:311>) | Field | {"label":"\"Opening balance (₹)\"","className":"\"col-span-2\""} |
| [src/components/pages/AccountsPage.tsx:312](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/AccountsPage.tsx:312>) | Input | {"type":"\"number\"","value":"{state.openingBalance}","onChange":"{(e) =>\n                setState({ ...state, openingBalance: +e.target.value })\n              }"} |
| [src/components/pages/AccountsPage.tsx:320](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/AccountsPage.tsx:320>) | Field | {"label":"\"Color\""} |
| [src/components/pages/AccountsPage.tsx:321](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/AccountsPage.tsx:321>) | Input | {"type":"\"color\"","value":"{state.color}","onChange":"{(e) => setState({ ...state, color: e.target.value })}","className":"\"h-9 p-1\""} |

### Action trace

| Source | Label | Handler | Disabled |
| --- | --- | --- | --- |
| [src/components/pages/AccountsPage.tsx:86](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/AccountsPage.tsx:86>) | New Account | {() => setAdding(true)} | none on element |
| [src/components/pages/AccountsPage.tsx:127](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/AccountsPage.tsx:127>) | Add Account | {() => setAdding(true)} | none on element |
| [src/components/pages/AccountsPage.tsx:169](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/AccountsPage.tsx:169>) | (icon/dynamic) | {() => setEditing(a)} | none on element |
| [src/components/pages/AccountsPage.tsx:176](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/AccountsPage.tsx:176>) | (icon/dynamic) | {() => handleDelete(a.id)} | none on element |
| [src/components/pages/AccountsPage.tsx:279](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/AccountsPage.tsx:279>) | {err ? ( <div className="col-span-2 rounded-md bg-expense-soft p-2 text-xs text-danger"> {err} </div> ) : null} | {submit} | none on element |
| [src/components/pages/AccountsPage.tsx:334](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/AccountsPage.tsx:334>) | Cancel | {onClose} | none on element |
| [src/components/pages/AccountsPage.tsx:337](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/AccountsPage.tsx:337>) | Save | parent/trigger | none on element |

### Validation / persistence / feedback call sites

| Source | Call | Arguments (source expression) |
| --- | --- | --- |
| [src/components/pages/AccountsPage.tsx:61](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/AccountsPage.tsx:61>) | toast | { title: "Cannot delete account", description: refs.message, kind: "warning", } |
| [src/components/pages/AccountsPage.tsx:68](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/AccountsPage.tsx:68>) | confirm | { title: "Delete this account?", description: "This account will be removed permanently.", destructive: true, confirmLabel: "Delete account", } |
| [src/components/pages/AccountsPage.tsx:75](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/AccountsPage.tsx:75>) | accountRepo.softDelete | id |
| [src/components/pages/AccountsPage.tsx:77](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/AccountsPage.tsx:77>) | toast | { title: "Account removed", kind: "info" } |
| [src/components/pages/AccountsPage.tsx:179](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/AccountsPage.tsx:179>) | handleDelete | a.id |
| [src/components/pages/AccountsPage.tsx:201](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/AccountsPage.tsx:201>) | toast | { title: editing ? "Account updated" : "Account created", kind: "success", } |
| [src/components/pages/AccountsPage.tsx:253](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/AccountsPage.tsx:253>) | accountSchema.safeParse | state |
| [src/components/pages/AccountsPage.tsx:259](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/AccountsPage.tsx:259>) | accountRepo.update | account.id, parse.data |
| [src/components/pages/AccountsPage.tsx:260](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/AccountsPage.tsx:260>) | onSaved | updated |
| [src/components/pages/AccountsPage.tsx:262](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/AccountsPage.tsx:262>) | accountRepo.create | { userId, data: { ...parse.data, isInactive: 0, } as Account, } |
| [src/components/pages/AccountsPage.tsx:269](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/AccountsPage.tsx:269>) | onSaved | created |

## Cards: /cards

| Audit dimension | Observed implementation / assessment |
| --- | --- |
| 1-4 Identity, group, purpose, status | Money. Cards, statement dates, debt and EMI management. Implemented for current personal/platform scope, partial against the agency brief; page state audited. |
| 5 Source | [src/components/pages/CardsPage.tsx](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/CardsPage.tsx>) |
| 6-8 Data source, APIs, stores | Zustand plus repositories; generic /api/data/entity.php and entity-item.php where cloud-mapped. Source selectors: cards, transactions, accounts, ledgerEffects. Exact imports below. |
| 9-10 UI sections and forms | "Cards"; {c.nickname}; Credit-card repair queue; Repair transaction; {card ? "Edit Card" : "New Card"} |
| 11-12 Available actions and behavior | 21 source action definitions. Multiple card/refund/EMI engines exist; no real bank integration or issuer-authoritative live balance was tested. Full handler/disabled/visibility inventory is linked below. |
| 13 Form fields | 28 field/control declarations in this file. Exact labels, binding props and validation hooks listed below; child dialog declarations are in the global inventory. |
| 14 Validation | cardSchema.safeParse. Frontend validation is not authoritative; backend transaction validation is stronger than other collection schemas (B14/B37). |
| 15 Empty state | Empty/no-data branches or delegated empty-state components exist. Fresh-user/seeded data were used, not every table empty condition. |
| 16 Loading state | Loading/busy state references exist; exact disabled bindings in action inventory. Slow-network/failure injection was selective, not every control. |
| 17 Error state | Error/validation handling references exist. Repository fallback can turn server rejection into apparent success (B01); presence of toast code is not proof of correct failure semantics. |
| 18 Role permissions | Active user owns the dataset. Plan/feature gates may hide controls; generic writes are constrained to the authenticated tenant, not agency roles. |
| 19 PIN requirement | No independent action PIN found in this page. Normal authentication is not a per-action authorization challenge. |
| 20 Audit creation | No direct page audit writer found; repository/server helpers may log some operations. No complete per-action audit proof. |
| 21 Mobile behavior | 10 widths sampled; maximum root overflow 0px. This is layout screening, not every dialog/table state. |
| 22 Bugs found | B01, B02, B14 |
| 23 Missing features | No agency lifecycle/role/close-period equivalence is implied by this personal-finance view. |
| 24 Suggested improvements | Resolve listed integrity/security defects first; then add typed contracts, explicit failure states and complete mobile/action coverage before agency expansion. |
| 25 Existing test coverage | Authenticated route rendered in custom browser audit. Textually related test files: tests/local-phase-09-ui-browser-e2e.mjs. These references are candidates, not measured branch coverage. |
| 26 Missing test coverage | Every enabled/disabled action, negative field, cancel/PIN failure, server error, reload persistence, role matrix and populated large-data state has not been executed. Add these to the release matrix, including child dialogs. |

### Data and service wiring

| Import | Bindings |
| --- | --- |
| @/store/dataStore | { useDataStore } |
| @/store/authStore | { useAuthStore } |
| @/repositories | { cardRepo, transactionRepo } |
| @/store/uiStore | { useUIStore } |
| @/store/uiStore | { confirm } |
| @/services/validators | { cardSchema } |
| @/services/calculations | { summarizeCardHealth } |
| @/services/refIntegrity | { refsForCard } |
| @/services/cardEngine | {   buildCardRepairQueue,   buildCreditCardIntel,   type CreditCardIntel, } |

### Fields and controls

| Source | Control | Label / props |
| --- | --- | --- |
| [src/components/pages/CardsPage.tsx:671](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/CardsPage.tsx:671>) | Field | {"label":"\"Link to credit card\""} |
| [src/components/pages/CardsPage.tsx:672](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/CardsPage.tsx:672>) | Select | {"value":"{repairCardId \|\| undefined}","onValueChange":"{setRepairCardId}"} |
| [src/components/pages/CardsPage.tsx:696](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/CardsPage.tsx:696>) | Field | {"label":"\"Account (cash source)\""} |
| [src/components/pages/CardsPage.tsx:697](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/CardsPage.tsx:697>) | Select | {"value":"{repairAccountId \|\| undefined}","onValueChange":"{setRepairAccountId}"} |
| [src/components/pages/CardsPage.tsx:848](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/CardsPage.tsx:848>) | Field | {"label":"\"Type\""} |
| [src/components/pages/CardsPage.tsx:849](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/CardsPage.tsx:849>) | Select | {"value":"{state.type}","onValueChange":"{(v) => setState({ ...state, type: v as \"credit\" \| \"debit\" })}"} |
| [src/components/pages/CardsPage.tsx:862](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/CardsPage.tsx:862>) | Field | {"label":"\"Bank\""} |
| [src/components/pages/CardsPage.tsx:863](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/CardsPage.tsx:863>) | Select | {"value":"{state.bank}","onValueChange":"{(v) => setState({ ...state, bank: v })}"} |
| [src/components/pages/CardsPage.tsx:876](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/CardsPage.tsx:876>) | Field | {"label":"\"Nickname\"","required":"true","className":"\"col-span-2\""} |
| [src/components/pages/CardsPage.tsx:877](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/CardsPage.tsx:877>) | Input | {"value":"{state.nickname}","onChange":"{(e) => setState({ ...state, nickname: e.target.value })}","placeholder":"\"HDFC Regalia\""} |
| [src/components/pages/CardsPage.tsx:883](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/CardsPage.tsx:883>) | Field | {"label":"\"Last 4 digits\""} |
| [src/components/pages/CardsPage.tsx:884](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/CardsPage.tsx:884>) | Input | {"value":"{state.last4}","maxLength":"{4}","onChange":"{(e) =>\n                setState({ ...state, last4: e.target.value.replace(/\\D/g, \"\").slice(0, 4) })\n              }","placeholder":"\"1234\""} |
| [src/components/pages/CardsPage.tsx:893](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/CardsPage.tsx:893>) | Field | {"label":"\"Color\""} |
| [src/components/pages/CardsPage.tsx:894](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/CardsPage.tsx:894>) | Input | {"type":"\"color\"","value":"{state.color}","onChange":"{(e) => setState({ ...state, color: e.target.value })}","className":"\"h-9 p-1\""} |
| [src/components/pages/CardsPage.tsx:902](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/CardsPage.tsx:902>) | Field | {"label":"\"Linked account\"","className":"\"col-span-2\""} |
| [src/components/pages/CardsPage.tsx:903](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/CardsPage.tsx:903>) | Select | {"value":"{state.linkedAccountId}","onValueChange":"{(v) => setState({ ...state, linkedAccountId: v })}"} |
| [src/components/pages/CardsPage.tsx:921](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/CardsPage.tsx:921>) | Field | {"label":"\"Credit limit (₹)\"","required":"true"} |
| [src/components/pages/CardsPage.tsx:922](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/CardsPage.tsx:922>) | Input | {"type":"\"number\"","value":"{state.creditLimit}","onChange":"{(e) => setState({ ...state, creditLimit: +e.target.value })}"} |
| [src/components/pages/CardsPage.tsx:928](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/CardsPage.tsx:928>) | Field | {"label":"\"Interest rate % (APR)\""} |
| [src/components/pages/CardsPage.tsx:929](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/CardsPage.tsx:929>) | Input | {"type":"\"number\"","value":"{state.interestRate}","onChange":"{(e) => setState({ ...state, interestRate: +e.target.value })}"} |
| [src/components/pages/CardsPage.tsx:935](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/CardsPage.tsx:935>) | Field | {"label":"\"Statement day\"","required":"true"} |
| [src/components/pages/CardsPage.tsx:936](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/CardsPage.tsx:936>) | Input | {"type":"\"number\"","min":"{1}","max":"{31}","value":"{state.statementDay}","onChange":"{(e) => setState({ ...state, statementDay: +e.target.value })}"} |
| [src/components/pages/CardsPage.tsx:944](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/CardsPage.tsx:944>) | Field | {"label":"\"Due day\"","required":"true"} |
| [src/components/pages/CardsPage.tsx:945](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/CardsPage.tsx:945>) | Input | {"type":"\"number\"","min":"{1}","max":"{31}","value":"{state.dueDay}","onChange":"{(e) => setState({ ...state, dueDay: +e.target.value })}"} |
| [src/components/pages/CardsPage.tsx:953](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/CardsPage.tsx:953>) | Field | {"label":"\"Annual fee (₹)\""} |
| [src/components/pages/CardsPage.tsx:954](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/CardsPage.tsx:954>) | Input | {"type":"\"number\"","value":"{state.annualFee}","onChange":"{(e) => setState({ ...state, annualFee: +e.target.value })}"} |
| [src/components/pages/CardsPage.tsx:960](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/CardsPage.tsx:960>) | Field | {"label":"\"Reward note\""} |
| [src/components/pages/CardsPage.tsx:961](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/CardsPage.tsx:961>) | Input | {"value":"{state.rewardNote}","onChange":"{(e) => setState({ ...state, rewardNote: e.target.value })}","placeholder":"\"2x on dining, 4% on fuel\""} |

### Action trace

| Source | Label | Handler | Disabled |
| --- | --- | --- | --- |
| [src/components/pages/CardsPage.tsx:202](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/CardsPage.tsx:202>) | New Card | {() => setAdding(true)} | none on element |
| [src/components/pages/CardsPage.tsx:210](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/CardsPage.tsx:210>) | Credit Cards ( {creditCards.length} ) | parent/trigger | none on element |
| [src/components/pages/CardsPage.tsx:211](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/CardsPage.tsx:211>) | Debit Cards ( {debitCards.length} ) | parent/trigger | none on element |
| [src/components/pages/CardsPage.tsx:212](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/CardsPage.tsx:212>) | Review {repairQueue.length ? ` (${repairQueue.length})` : ""} | parent/trigger | none on element |
| [src/components/pages/CardsPage.tsx:226](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/CardsPage.tsx:226>) | Add Card | {() => setAdding(true)} | none on element |
| [src/components/pages/CardsPage.tsx:441](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/CardsPage.tsx:441>) | {expandedId === c.id ? "Hide" : "Show"} linked transactions ( {linked.length} ) | {() => setExpandedId(expandedId === c.id ? null : c.id)} | none on element |
| [src/components/pages/CardsPage.tsx:482](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/CardsPage.tsx:482>) | EMI | {() => setEmiSimCard(c)} | none on element |
| [src/components/pages/CardsPage.tsx:490](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/CardsPage.tsx:490>) | (icon/dynamic) | {() => setEditing(c)} | none on element |
| [src/components/pages/CardsPage.tsx:497](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/CardsPage.tsx:497>) | (icon/dynamic) | {() => handleDelete(c.id)} | none on element |
| [src/components/pages/CardsPage.tsx:523](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/CardsPage.tsx:523>) | Add Card | {() => setAdding(true)} | none on element |
| [src/components/pages/CardsPage.tsx:550](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/CardsPage.tsx:550>) | (icon/dynamic) | {() => setEditing(c)} | none on element |
| [src/components/pages/CardsPage.tsx:557](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/CardsPage.tsx:557>) | (icon/dynamic) | {() => handleDelete(c.id)} | none on element |
| [src/components/pages/CardsPage.tsx:641](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/CardsPage.tsx:641>) | Fix transaction | {() => setRepairTxn(t)} | none on element |
| [src/components/pages/CardsPage.tsx:645](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/CardsPage.tsx:645>) | Edit card | {() => setEditing(issue.card ?? null)} | none on element |
| [src/components/pages/CardsPage.tsx:686](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/CardsPage.tsx:686>) | Save card link | {() => void applyRepairLinkCard()} | {!repairCardId \|\| repairSaving} |
| [src/components/pages/CardsPage.tsx:710](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/CardsPage.tsx:710>) | Convert to UPI | {() => void applyRepairConvertUpi()} | {!repairAccountId \|\| repairSaving} |
| [src/components/pages/CardsPage.tsx:719](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/CardsPage.tsx:719>) | Mark legacy / manual | {() => void applyRepairMarkLegacy()} | {repairSaving} |
| [src/components/pages/CardsPage.tsx:732](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/CardsPage.tsx:732>) | Close | {() => setRepairTxn(null)} | none on element |
| [src/components/pages/CardsPage.tsx:847](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/CardsPage.tsx:847>) | {!isCredit ? ( <Field label="Linked account" className="col-span-2"> <Select value={state.linkedAccountId} onValueChange={(v) => setState({ ...state, linkedAccountId: v })} > <SelectTrigger> <SelectValue placeholder="Select account" /> </SelectTrigger> <SelectContent> {accounts.map((a) => ( <SelectItem key={a.id} value={a.id}> {a.name} </SelectItem> ))} </SelectContent> </Select> </Field> ) : ( <> <Field label="Credit limit (₹)" required> <Input type="number" value={state.creditLimit} onChange={(e) => setState({ ...state, creditLimit: +e.target.value })} /> </Field> <Field label="Interest rate % (APR)"> <Input type="number" value={state.interestRate} onChange={(e) => setState({ ...state, interestRate: +e.target.value })} /> </Field> <Field label="Statement day" required> <Input type="number" min={1} max={31} value={state.statementDay} onChange={(e) => setState({ ...state, statementDay: +e.target.value })} /> </Field> <Field label="Due day" required> <Input type="number" min={1} max={31} value={state.dueDay} onChange={(e) => setState({ ...state, dueDay: +e.target.value })} /> </Field> <Field label="Annual fee (₹)"> <Input type="number" value={state.annualFee} onChange={(e) => setState({ ...state, annualFee: +e.target.value })} /> </Field> <Field label="Reward note"> <Input value={state.rewardNote} onChange={(e) => setState({ ...state, rewardNote: e.target.value })} placeholder="2x on dining, 4% on fuel" /> </Field> </> )} {err ? ( <div className="col-span-2 rounded-md bg-expense-soft p-2 text-xs text-danger"> {err} </div> ) : null} | {submit} | none on element |
| [src/components/pages/CardsPage.tsx:975](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/CardsPage.tsx:975>) | Cancel | {onClose} | none on element |
| [src/components/pages/CardsPage.tsx:978](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/CardsPage.tsx:978>) | Save | parent/trigger | none on element |

### Validation / persistence / feedback call sites

| Source | Call | Arguments (source expression) |
| --- | --- | --- |
| [src/components/pages/CardsPage.tsx:94](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/CardsPage.tsx:94>) | transactionRepo.update | repairTxn.id, { linkedCardId: repairCardId } |
| [src/components/pages/CardsPage.tsx:97](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/CardsPage.tsx:97>) | toast | { title: "Card linked", kind: "success" } |
| [src/components/pages/CardsPage.tsx:102](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/CardsPage.tsx:102>) | toast | { title: "Update failed", description: e instanceof Error ? e.message : "Try again", kind: "error", } |
| [src/components/pages/CardsPage.tsx:116](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/CardsPage.tsx:116>) | transactionRepo.update | repairTxn.id, { paymentMode: "upi", linkedCardId: undefined, accountId: repairAccountId, } |
| [src/components/pages/CardsPage.tsx:123](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/CardsPage.tsx:123>) | toast | { title: "Converted to UPI / bank", kind: "success" } |
| [src/components/pages/CardsPage.tsx:128](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/CardsPage.tsx:128>) | toast | { title: "Update failed", description: e instanceof Error ? e.message : "Try again", kind: "error", } |
| [src/components/pages/CardsPage.tsx:146](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/CardsPage.tsx:146>) | transactionRepo.update | repairTxn.id, { notes, tags } |
| [src/components/pages/CardsPage.tsx:149](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/CardsPage.tsx:149>) | toast | { title: "Marked as legacy / manual", kind: "info" } |
| [src/components/pages/CardsPage.tsx:153](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/CardsPage.tsx:153>) | toast | { title: "Update failed", description: e instanceof Error ? e.message : "Try again", kind: "error", } |
| [src/components/pages/CardsPage.tsx:166](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/CardsPage.tsx:166>) | cardRepo.update | id, { isInactive: 1 } as Partial<CardT> |
| [src/components/pages/CardsPage.tsx:169](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/CardsPage.tsx:169>) | toast | { title: "Card archived", description: "Referenced cards are archived instead of removed so old transactions keep their card name.", kind: "info", } |
| [src/components/pages/CardsPage.tsx:177](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/CardsPage.tsx:177>) | confirm | { title: "Delete this card?", description: "This card will be removed permanently.", destructive: true, confirmLabel: "Delete card", } |
| [src/components/pages/CardsPage.tsx:184](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/CardsPage.tsx:184>) | cardRepo.softDelete | id |
| [src/components/pages/CardsPage.tsx:186](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/CardsPage.tsx:186>) | toast | { title: "Card removed", kind: "info" } |
| [src/components/pages/CardsPage.tsx:264](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/CardsPage.tsx:264>) | (() => {                         const intel = intelMap.get(c.id);                         const risk = intel?.risk ?? "safe";                         const riskTone =                           risk === "over_limit" \|\| risk === "danger"                             ? "danger"                             : risk === "risky"                               ? "warning"                               : risk === "watch"                                 ? "info"                                 : "success";                         const linked = transactions                           .filter(                             (t) =>                               t.isDeleted !== 1 &&                               t.linkedCardId === c.id &&                               (t.type === "expense" \|\| t.type === "cc_payment"),                           )                           .sort((a, b) => b.date.localeCompare(a.date))                           .slice(0, 12);                         return (                           <>                             <div className="grid grid-cols-2 gap-3 text-xs md:grid-cols-3">                               <div>                                 <div className="text-muted-foreground">Total limit</div>                                 <div className="tabular-nums font-semibold">                                   {formatINR(paiseToRupees(intel?.limitPaise ?? 0), { decimals: 0 })}                                 </div>                               </div>                               <div>                                 <div className="text-muted-foreground">Used (outstanding)</div>                                 <div className="tabular-nums font-semibold text-expense">                                   {formatINR(                                     paiseToRupees(intel?.outstandingPaise ?? h?.outstandingBalancePaise ?? 0),                                     { decimals: 0 },                                   )}                                   {intel && intel.creditBalancePaise > 0 && (                                     <span className="ml-2 text-xs text-emerald-600">                                       Credit bal {formatINR(paiseToRupees(intel.creditBalancePaise))}                                     </span>                                   )}                                 </div>                               </div>                               <div>                                 <div className="text-muted-foreground">Available</div>                                 <div className="tabular-nums font-semibold">                                   {formatINR(paiseToRupees(intel?.availablePaise ?? 0), { decimals: 0 })}                                 </div>                               </div>                               <div>                                 <div className="text-muted-foreground">Billed (statement)</div>                                 <div className="tabular-nums">                                   {formatINR(                                     paiseToRupees(intel?.statementBalancePaise ?? h?.statementBalancePaise ?? 0),                                     { decimals: 0 },                                   )}                                 </div>                               </div>                               <div>                                 <div className="text-muted-foreground">Unbilled</div>                                 <div className="tabular-nums">                                   {formatINR(paiseToRupees(intel?.unbilledPaise ?? 0), { decimals: 0 })}                                 </div>                               </div>                               <div>                                 <div className="text-muted-foreground">Utilization</div>                                 <div className="tabular-nums font-medium">                                   {formatPercent(intel?.utilizationPct ?? h?.utilization ?? 0, 1)}                                 </div>                               </div>                               <div>                                 <div className="text-muted-foreground">Next due</div>                                 <div className="font-medium">                                   {intel?.nextDueDateIso                                     ? formatDate(intel.nextDueDateIso)                                     : h?.nextDueDate                                       ? formatDate(h.nextDueDate)                                       : "—"}                                 </div>                               </div>                               <div>                                 <div className="text-muted-foreground">Minimum due</div>                                 <div className="tabular-nums">                                   {formatINR(paiseToRupees(intel?.minimumDuePaise ?? 0), { decimals: 0 })}                                 </div>                               </div>                               <div>                                 <div className="text-muted-foreground">Full due (PIF)</div>                                 <div className="tabular-nums">                                   {formatINR(paiseToRupees(intel?.fullDuePaise ?? 0), { decimals: 0 })}                                 </div>                               </div>                             </div>                             {intel?.statementPeriodLabel ? (                               <p className="mt-2 text-[11px] text-muted-foreground">                                 {intel.statementPeriodLabel}                                 {intel.outstandingSource === "effects" ? (                                   <Badge className="ml-2" variant="outline">                                     Ledger                                   </Badge>                                 ) : intel.outstandingSource === "shadow" ? (                                   <Badge className="ml-2" variant="outline">                                     SQL shadow                                   </Badge>                                 ) : (                                   <Badge className="ml-2" variant="secondary">                                     Transactions                                   </Badge>                                 )}                               </p>                             ) : null}                             {intel?.sourceWarning ? (                               <div className="mt-2 rounded-md border border-warning/30 bg-warning/10 p-2 text-[11px] text-warning">                                 {intel.sourceWarning}                               </div>                             ) : null}                              <div className="mt-3">                               <div className="mb-1 flex items-center justify-between text-xs">                                 <span className="text-muted-foreground">                                   Card used amount vs limit (risk band)                                 </span>                                 <Badge variant={riskTone}>                                   {formatPercent(intel?.utilizationPct ?? h?.utilization ?? 0, 1)} · {risk.replace("_", " ")}                                 </Badge>                               </div>                               <Progress                                 value={Math.min(100, intel?.utilizationPct ?? h?.utilization ?? 0)}                                 tone={                                   riskTone === "danger"                                     ? "expense"                                     : riskTone === "warning"                                       ? "warning"                                       : riskTone === "info"                                         ? "primary"                                         : "income"                                 }                               />                               <p className="mt-1 text-[11px] text-muted-foreground">                                 Safe: below 30%, watch: 30-50%, risky: 50-80%, danger: 80%+.                               </p>                             </div>                             {intel ? (                               <div className="mt-3 grid gap-2 rounded-md border border-border p-2 text-[11px] md:grid-cols-3">                                 <div>                                   <span className="text-muted-foreground">Pay below 80%: </span>                                   <span className="tabular-nums font-medium">                                     {formatINR(paiseToRupees(intel.payBelow80Paise), { decimals: 0 })}                                   </span>                                 </div>                                 <div>                                   <span className="text-muted-foreground">Pay below 50%: </span>                                   <span className="tabular-nums font-medium">                                     {formatINR(paiseToRupees(intel.payBelow50Paise), { decimals: 0 })}                                   </span>                                 </div>                                 <div>                                   <span className="text-muted-foreground">Pay below 30%: </span>                                   <span className="tabular-nums font-medium">                                     {formatINR(paiseToRupees(intel.payBelow30Paise), { decimals: 0 })}                                   </span>                                 </div>                               </div>                             ) : null}                             {intel?.minimumDueWarning ? (                               <div className="mt-2 rounded-md border border-warning/30 bg-warning/10 p-2 text-[11px] text-warning">                                 {intel.minimumDueWarning}                               </div>                             ) : null}                             {intel && intel.fullDuePaise > 0 ? (                               <div className="mt-2 rounded-md border border-border bg-muted/40 p-2 text-[11px] text-muted-foreground">                                 Full due means paying the complete statement balance by the due date. It                                 clears the billed card liability and is not counted as a new expense.                               </div>                             ) : null}                              <div className="mt-2">                               <Button                                 type="button"                                 variant="ghost"                                 size="sm"                                 className="h-7 px-2 text-xs"                                 onClick={() => setExpandedId(expandedId === c.id ? null : c.id)}                               >                                 {expandedId === c.id ? "Hide" : "Show"} linked transactions ({linked.length})                               </Button>                               {expandedId === c.id ? (                                 <ul className="mt-1 max-h-40 space-y-1 overflow-y-auto rounded border border-border p-2 text-[11px]">                                   {linked.length === 0 ? (                                     <li className="text-muted-foreground">No linked card movements yet.</li>                                   ) : (                                     linked.map((t) => (                                       <li key={t.id} className="flex justify-between gap-2">                                         <span>                                           {t.date.slice(0, 10)} · {t.type}                                         </span>                                         <span className="tabular-nums">                                           {formatINR(                                             paiseToRupees(transactionAmountPaise(t)),                                             { decimals: 0 },                                           )}                                         </span>                                       </li>                                     ))                                   )}                                 </ul>                               ) : null}                             </div>                           </>                         );                       }) |  |
| [src/components/pages/CardsPage.tsx:275](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/CardsPage.tsx:275>) | transactions                           .filter(                             (t) =>                               t.isDeleted !== 1 &&                               t.linkedCardId === c.id &&                               (t.type === "expense" \|\| t.type === "cc_payment"),                           )                           .sort((a, b) => b.date.localeCompare(a.date))                           .slice | 0, 12 |
| [src/components/pages/CardsPage.tsx:275](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/CardsPage.tsx:275>) | transactions                           .filter(                             (t) =>                               t.isDeleted !== 1 &&                               t.linkedCardId === c.id &&                               (t.type === "expense" \|\| t.type === "cc_payment"),                           )                           .sort | (a, b) => b.date.localeCompare(a.date) |
| [src/components/pages/CardsPage.tsx:500](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/CardsPage.tsx:500>) | handleDelete | c.id |
| [src/components/pages/CardsPage.tsx:560](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/CardsPage.tsx:560>) | handleDelete | c.id |
| [src/components/pages/CardsPage.tsx:750](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/CardsPage.tsx:750>) | toast | { title: editing ? "Card updated" : "Card added", kind: "success", } |
| [src/components/pages/CardsPage.tsx:821](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/CardsPage.tsx:821>) | cardSchema.safeParse | state |
| [src/components/pages/CardsPage.tsx:828](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/CardsPage.tsx:828>) | cardRepo.update | card.id, payload as unknown as Partial<CardT> |
| [src/components/pages/CardsPage.tsx:829](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/CardsPage.tsx:829>) | onSaved | updated |
| [src/components/pages/CardsPage.tsx:831](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/CardsPage.tsx:831>) | cardRepo.create | { userId, data: { ...payload, isInactive: 0 } as unknown as CardT, } |
| [src/components/pages/CardsPage.tsx:835](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/CardsPage.tsx:835>) | onSaved | created |

## Loans: /loans

| Audit dimension | Observed implementation / assessment |
| --- | --- |
| 1-4 Identity, group, purpose, status | Money. Loans, amortization and EMI payments. Implemented for current personal/platform scope, partial against the agency brief; page state audited. |
| 5 Source | [src/components/pages/LoansPage.tsx](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/LoansPage.tsx>) |
| 6-8 Data source, APIs, stores | Zustand plus repositories; generic /api/data/entity.php and entity-item.php where cloud-mapped. Source selectors: loans, emis, cards, udhari, transactions, ledgerEffects, outstandingPrincipalPaise, emiPaise, totalInterestPaise, nextDueDate, originalPrincipalPaise, principalPaidPaise, friendlySummaryLine, interestPaidPaise, remainingInterestEstimatePaise, overdueEmiCount, overdueAmountPaise, monthsPending, foreclosureEstimatePaise, lifecycleMode, startDate, firstEmiDate, linkedCardId, emiAmountOverride, outstandingPrincipal, remainingEmis, completedEmis, blockedAmount. Exact imports below. |
| 9-10 UI sections and forms | "Loans & EMI"; {formatINR(paiseToRupees(totals.outstanding))}; {formatINR(paiseToRupees(totals.monthlyEMI))}; {formatINR(paiseToRupees(totals.totalInterest))}; {loans.filter((l) => l.status === "active").length}; Debt summary; Amortization — {loan?.lender}; {loan ? "Edit Loan" : "New Loan"} |
| 11-12 Available actions and behavior | 9 source action definitions. Loan form, repayment recording and schedules; duplicate lender workbook sheet failure confirmed. Full handler/disabled/visibility inventory is linked below. |
| 13 Form fields | 42 field/control declarations in this file. Exact labels, binding props and validation hooks listed below; child dialog declarations are in the global inventory. |
| 14 Validation | loanSchema.safeParse. Frontend validation is not authoritative; backend transaction validation is stronger than other collection schemas (B14/B37). |
| 15 Empty state | Empty/no-data branches or delegated empty-state components exist. Fresh-user/seeded data were used, not every table empty condition. |
| 16 Loading state | Loading/busy state references exist; exact disabled bindings in action inventory. Slow-network/failure injection was selective, not every control. |
| 17 Error state | Error/validation handling references exist. Repository fallback can turn server rejection into apparent success (B01); presence of toast code is not proof of correct failure semantics. |
| 18 Role permissions | Active user owns the dataset. Plan/feature gates may hide controls; generic writes are constrained to the authenticated tenant, not agency roles. |
| 19 PIN requirement | No independent action PIN found in this page. Normal authentication is not a per-action authorization challenge. |
| 20 Audit creation | No direct page audit writer found; repository/server helpers may log some operations. No complete per-action audit proof. |
| 21 Mobile behavior | 10 widths sampled; maximum root overflow 0px. This is layout screening, not every dialog/table state. |
| 22 Bugs found | B01, B20, B37 |
| 23 Missing features | No agency lifecycle/role/close-period equivalence is implied by this personal-finance view. |
| 24 Suggested improvements | Resolve listed integrity/security defects first; then add typed contracts, explicit failure states and complete mobile/action coverage before agency expansion. |
| 25 Existing test coverage | Authenticated route rendered in custom browser audit. Textually related test files: tests/local-phase-09-ui-browser-e2e.mjs. These references are candidates, not measured branch coverage. |
| 26 Missing test coverage | Every enabled/disabled action, negative field, cancel/PIN failure, server error, reload persistence, role matrix and populated large-data state has not been executed. Add these to the release matrix, including child dialogs. |

### Data and service wiring

| Import | Bindings |
| --- | --- |
| @/store/dataStore | { useDataStore } |
| @/store/authStore | { useAuthStore } |
| @/repositories | { loanRepo } |
| @/store/uiStore | { useUIStore } |
| @/store/uiStore | { confirm } |
| @/services/validators | { loanSchema } |
| @/services/calculations | {   amortizationSchedule,   calculateEMI,   sumIncome,   summarizeLoan, } |
| @/services/cardEngine | { buildCreditCardIntel } |
| @/services/loanEngine | {   buildDebtSummary,   buildEmiPaymentIntelligence,   calculateForeclosureBreakdown,   importedLoanConfidence,   isImportedLoanLifecycle,   loanInterestMethodLabel,   simulatePrepaymentOptions, } |
| @/services/refIntegrity | { refsForLoan } |

### Fields and controls

| Source | Control | Label / props |
| --- | --- | --- |
| [src/components/pages/LoansPage.tsx:420](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/LoansPage.tsx:420>) | Field | {"label":"\"Prepayment simulator (₹)\"","className":"\"min-w-[140px] flex-1\""} |
| [src/components/pages/LoansPage.tsx:421](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/LoansPage.tsx:421>) | Input | {"inputMode":"\"decimal\"","placeholder":"\"e.g. 50000\"","value":"{prepKey}","onChange":"{(e) =>\n                            setPrepayByLoan((m) => ({ ...m, [l.id]: e.target.value }))\n                          }"} |
| [src/components/pages/LoansPage.tsx:765](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/LoansPage.tsx:765>) | Field | {"label":"\"Lender\"","required":"true","className":"\"col-span-2\""} |
| [src/components/pages/LoansPage.tsx:766](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/LoansPage.tsx:766>) | Input | {"value":"{state.lender}","onChange":"{(e) => setState({ ...state, lender: e.target.value })}","placeholder":"\"HDFC Bank\""} |
| [src/components/pages/LoansPage.tsx:772](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/LoansPage.tsx:772>) | Field | {"label":"\"Loan type\""} |
| [src/components/pages/LoansPage.tsx:773](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/LoansPage.tsx:773>) | Select | {"value":"{state.loanType}","onValueChange":"{(v) =>\n                setState({ ...state, loanType: v as typeof state.loanType })\n              }"} |
| [src/components/pages/LoansPage.tsx:791](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/LoansPage.tsx:791>) | Field | {"label":"\"Tracking mode\""} |
| [src/components/pages/LoansPage.tsx:792](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/LoansPage.tsx:792>) | Select | {"value":"{state.lifecycleMode}","onValueChange":"{(v) =>\n                setState({ ...state, lifecycleMode: v as typeof state.lifecycleMode })\n              }"} |
| [src/components/pages/LoansPage.tsx:808](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/LoansPage.tsx:808>) | Field | {"label":"\"Interest method\""} |
| [src/components/pages/LoansPage.tsx:809](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/LoansPage.tsx:809>) | Select | {"value":"{state.interestType}","onValueChange":"{(v) => setState({ ...state, interestType: v as typeof state.interestType })}"} |
| [src/components/pages/LoansPage.tsx:824](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/LoansPage.tsx:824>) | Field | {"label":"\"Start date\"","required":"true"} |
| [src/components/pages/LoansPage.tsx:825](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/LoansPage.tsx:825>) | Input | {"type":"\"date\"","value":"{state.startDate}","onChange":"{(e) => setState({ ...state, startDate: e.target.value })}"} |
| [src/components/pages/LoansPage.tsx:831](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/LoansPage.tsx:831>) | Field | {"label":"\"Principal (₹)\"","required":"true"} |
| [src/components/pages/LoansPage.tsx:832](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/LoansPage.tsx:832>) | Input | {"type":"\"number\"","value":"{state.principal}","onChange":"{(e) => setState({ ...state, principal: +e.target.value })}"} |
| [src/components/pages/LoansPage.tsx:838](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/LoansPage.tsx:838>) | Field | {"label":"\"Disbursed amount (INR)\""} |
| [src/components/pages/LoansPage.tsx:839](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/LoansPage.tsx:839>) | Input | {"type":"\"number\"","min":"{0}","value":"{state.disbursedAmount}","onChange":"{(e) => setState({ ...state, disbursedAmount: +e.target.value })}"} |
| [src/components/pages/LoansPage.tsx:846](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/LoansPage.tsx:846>) | Field | {"label":"\"First EMI date\""} |
| [src/components/pages/LoansPage.tsx:847](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/LoansPage.tsx:847>) | Input | {"type":"\"date\"","value":"{state.firstEmiDate}","onChange":"{(e) => setState({ ...state, firstEmiDate: e.target.value })}"} |
| [src/components/pages/LoansPage.tsx:853](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/LoansPage.tsx:853>) | Field | {"label":"\"Tenure (months)\"","required":"true"} |
| [src/components/pages/LoansPage.tsx:854](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/LoansPage.tsx:854>) | Input | {"type":"\"number\"","value":"{state.tenureMonths}","onChange":"{(e) => setState({ ...state, tenureMonths: +e.target.value })}"} |
| [src/components/pages/LoansPage.tsx:860](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/LoansPage.tsx:860>) | Field | {"label":"\"Interest %\""} |
| [src/components/pages/LoansPage.tsx:861](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/LoansPage.tsx:861>) | Input | {"type":"\"number\"","step":"\"0.01\"","value":"{state.annualInterestRate}","onChange":"{(e) =>\n                setState({ ...state, annualInterestRate: +e.target.value })\n              }"} |
| [src/components/pages/LoansPage.tsx:870](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/LoansPage.tsx:870>) | Field | {"label":"\"EMI due day (1-28)\""} |
| [src/components/pages/LoansPage.tsx:871](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/LoansPage.tsx:871>) | Input | {"type":"\"number\"","min":"{1}","max":"{28}","value":"{state.emiDueDay}","onChange":"{(e) => setState({ ...state, emiDueDay: +e.target.value })}"} |
| [src/components/pages/LoansPage.tsx:879](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/LoansPage.tsx:879>) | Field | {"label":"\"Processing fee (₹)\""} |
| [src/components/pages/LoansPage.tsx:880](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/LoansPage.tsx:880>) | Input | {"type":"\"number\"","value":"{state.processingFee}","onChange":"{(e) => setState({ ...state, processingFee: +e.target.value })}"} |
| [src/components/pages/LoansPage.tsx:888](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/LoansPage.tsx:888>) | Field | {"label":"\"Completed EMIs\""} |
| [src/components/pages/LoansPage.tsx:889](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/LoansPage.tsx:889>) | Input | {"type":"\"number\"","min":"{0}","value":"{state.completedEmis}","onChange":"{(e) => setState({ ...state, completedEmis: +e.target.value })}"} |
| [src/components/pages/LoansPage.tsx:896](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/LoansPage.tsx:896>) | Field | {"label":"\"Remaining EMIs\""} |
| [src/components/pages/LoansPage.tsx:897](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/LoansPage.tsx:897>) | Input | {"type":"\"number\"","min":"{0}","value":"{state.remainingEmis}","onChange":"{(e) => setState({ ...state, remainingEmis: +e.target.value })}"} |
| [src/components/pages/LoansPage.tsx:904](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/LoansPage.tsx:904>) | Field | {"label":"\"Outstanding principal (INR)\""} |
| [src/components/pages/LoansPage.tsx:905](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/LoansPage.tsx:905>) | Input | {"type":"\"number\"","min":"{0}","value":"{state.outstandingPrincipal}","onChange":"{(e) =>\n                    setState({ ...state, outstandingPrincipal: +e.target.value })\n                  }"} |
| [src/components/pages/LoansPage.tsx:914](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/LoansPage.tsx:914>) | Field | {"label":"\"Next due date\""} |
| [src/components/pages/LoansPage.tsx:915](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/LoansPage.tsx:915>) | Input | {"type":"\"date\"","value":"{state.nextDueDate}","onChange":"{(e) => setState({ ...state, nextDueDate: e.target.value })}"} |
| [src/components/pages/LoansPage.tsx:921](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/LoansPage.tsx:921>) | Field | {"label":"\"EMI override (optional)\""} |
| [src/components/pages/LoansPage.tsx:922](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/LoansPage.tsx:922>) | Input | {"type":"\"number\"","min":"{0}","value":"{state.emiAmountOverride}","onChange":"{(e) => setState({ ...state, emiAmountOverride: +e.target.value })}"} |
| [src/components/pages/LoansPage.tsx:931](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/LoansPage.tsx:931>) | Field | {"label":"\"Foreclosure charges %\""} |
| [src/components/pages/LoansPage.tsx:932](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/LoansPage.tsx:932>) | Input | {"type":"\"number\"","value":"{state.foreclosureCharges}","onChange":"{(e) =>\n                setState({ ...state, foreclosureCharges: +e.target.value })\n              }"} |
| [src/components/pages/LoansPage.tsx:940](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/LoansPage.tsx:940>) | Field | {"label":"\"Linked credit card\""} |
| [src/components/pages/LoansPage.tsx:941](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/LoansPage.tsx:941>) | Select | {"value":"{state.linkedCardId \|\| \"__none__\"}","onValueChange":"{(v) =>\n                setState({ ...state, linkedCardId: v === \"__none__\" ? \"\" : v })\n              }"} |
| [src/components/pages/LoansPage.tsx:960](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/LoansPage.tsx:960>) | Field | {"label":"\"Blocked amount on card (INR)\""} |
| [src/components/pages/LoansPage.tsx:961](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/LoansPage.tsx:961>) | Input | {"type":"\"number\"","min":"{0}","value":"{state.blockedAmount}","onChange":"{(e) => setState({ ...state, blockedAmount: +e.target.value })}"} |

### Action trace

| Source | Label | Handler | Disabled |
| --- | --- | --- | --- |
| [src/components/pages/LoansPage.tsx:189](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/LoansPage.tsx:189>) | New Loan | {() => setAdding(true)} | none on element |
| [src/components/pages/LoansPage.tsx:305](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/LoansPage.tsx:305>) | Add Loan | {() => setAdding(true)} | none on element |
| [src/components/pages/LoansPage.tsx:478](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/LoansPage.tsx:478>) | Schedule &amp; history | {() => setViewing(l)} | none on element |
| [src/components/pages/LoansPage.tsx:483](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/LoansPage.tsx:483>) | "Close loan" | {() => void handleCloseLoan(l)} | none on element |
| [src/components/pages/LoansPage.tsx:492](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/LoansPage.tsx:492>) | (icon/dynamic) | {() => setEditing(l)} | none on element |
| [src/components/pages/LoansPage.tsx:495](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/LoansPage.tsx:495>) | (icon/dynamic) | {() => handleDelete(l.id)} | none on element |
| [src/components/pages/LoansPage.tsx:764](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/LoansPage.tsx:764>) | {importedLifecycle ? ( <> <Field label="Completed EMIs"> <Input type="number" min={0} value={state.completedEmis} onChange={(e) => setState({ ...state, completedEmis: +e.target.value })} /> </Field> <Field label="Remaining EMIs"> <Input type="number" min={0} value={state.remainingEmis} onChange={(e) => setState({ ...state, remainingEmis: +e.target.value })} /> </Field> <Field label="Outstanding principal (INR)"> <Input type="number" min={0} value={state.outstandingPrincipal} onChange={(e) => setState({ ...state, outstandingPrincipal: +e.target.value }) } /> </Field> <Field label="Next due date"> <Input type="date" value={state.nextDueDate} onChange={(e) => setState({ ...state, nextDueDate: e.target.value })} /> </Field> <Field label="EMI override (optional)"> <Input type="number" min={0} value={state.emiAmountOverride} onChange={(e) => setState({ ...state, emiAmountOverride: +e.target.value })} /> </Field> </> ) : null} {err ? ( <div className="col-span-2 rounded-md bg-expense-soft p-2 text-xs text-danger"> {err} </div> ) : null} | {submit} | none on element |
| [src/components/pages/LoansPage.tsx:984](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/LoansPage.tsx:984>) | Cancel | {onClose} | none on element |
| [src/components/pages/LoansPage.tsx:987](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/LoansPage.tsx:987>) | Save | parent/trigger | none on element |

### Validation / persistence / feedback call sites

| Source | Call | Arguments (source expression) |
| --- | --- | --- |
| [src/components/pages/LoansPage.tsx:148](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/LoansPage.tsx:148>) | confirm | { title: "Close this loan?", description: "Marks the loan as closed in your records. You can reopen it from edit if needed.", confirmLabel: "Close loan", } |
| [src/components/pages/LoansPage.tsx:154](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/LoansPage.tsx:154>) | loanRepo.update | l.id, { status: "closed" } |
| [src/components/pages/LoansPage.tsx:157](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/LoansPage.tsx:157>) | toast | { title: "Loan closed", kind: "success" } |
| [src/components/pages/LoansPage.tsx:164](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/LoansPage.tsx:164>) | toast | { title: "Cannot delete loan", description: refs.message, kind: "warning", } |
| [src/components/pages/LoansPage.tsx:171](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/LoansPage.tsx:171>) | confirm | { title: "Delete this loan?", description: "This loan will be removed permanently.", destructive: true, confirmLabel: "Delete loan", } |
| [src/components/pages/LoansPage.tsx:178](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/LoansPage.tsx:178>) | loanRepo.softDelete | id |
| [src/components/pages/LoansPage.tsx:180](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/LoansPage.tsx:180>) | toast | { title: "Loan removed", kind: "info" } |
| [src/components/pages/LoansPage.tsx:495](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/LoansPage.tsx:495>) | handleDelete | l.id |
| [src/components/pages/LoansPage.tsx:518](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/LoansPage.tsx:518>) | toast | { title: editing ? "Loan updated" : "Loan added", kind: "success" } |
| [src/components/pages/LoansPage.tsx:706](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/LoansPage.tsx:706>) | loanSchema.safeParse | state |
| [src/components/pages/LoansPage.tsx:742](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/LoansPage.tsx:742>) | loanRepo.update | loan.id, payload as unknown as Partial<Loan> |
| [src/components/pages/LoansPage.tsx:743](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/LoansPage.tsx:743>) | onSaved | updated |
| [src/components/pages/LoansPage.tsx:745](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/LoansPage.tsx:745>) | loanRepo.create | { userId, data: { ...payload, status: "active" } as unknown as Loan, } |
| [src/components/pages/LoansPage.tsx:749](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/LoansPage.tsx:749>) | onSaved | created |

## Udhari: /udhari

| Audit dimension | Observed implementation / assessment |
| --- | --- |
| 1-4 Identity, group, purpose, status | Money. Informal receivable/payable and settlement tracking. Implemented for current personal/platform scope, partial against the agency brief; page state audited. |
| 5 Source | [src/components/pages/UdhariPage.tsx](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/UdhariPage.tsx>) |
| 6-8 Data source, APIs, stores | Zustand plus repositories; generic /api/data/entity.php and entity-item.php where cloud-mapped. Source selectors: udhari, accounts, udhariSettlements, categories, isDeleted, udhariId, id, date, kind, amount, givenDate, dueDate. Exact imports below. |
| 9-10 UI sections and forms | "Udhari & Advances"; {formatINR(receivable)}; {formatINR(payable)}; {formatINR(net)}; {udhari.filter((u) => u.status !== "settled" && u.status !== "written_off").length}; Settlement &amp; write-off log; Settle — {record?.personName}; Write off receivable — {record?.personName}; {record ? "Edit Udhari" : "New Udhari"} |
| 11-12 Available actions and behavior | 25 source action definitions. Record lending/borrowing and settlements; not client invoice ageing. CA helper canonical-field mismatch confirmed. Full handler/disabled/visibility inventory is linked below. |
| 13 Form fields | 28 field/control declarations in this file. Exact labels, binding props and validation hooks listed below; child dialog declarations are in the global inventory. |
| 14 Validation | udhariSchema.safeParse. Frontend validation is not authoritative; backend transaction validation is stronger than other collection schemas (B14/B37). |
| 15 Empty state | Empty/no-data branches or delegated empty-state components exist. Fresh-user/seeded data were used, not every table empty condition. |
| 16 Loading state | Loading/busy state references exist; exact disabled bindings in action inventory. Slow-network/failure injection was selective, not every control. |
| 17 Error state | Error/validation handling references exist. Repository fallback can turn server rejection into apparent success (B01); presence of toast code is not proof of correct failure semantics. |
| 18 Role permissions | Active user owns the dataset. Plan/feature gates may hide controls; generic writes are constrained to the authenticated tenant, not agency roles. |
| 19 PIN requirement | No independent action PIN found in this page. Normal authentication is not a per-action authorization challenge. |
| 20 Audit creation | No direct page audit writer found; repository/server helpers may log some operations. No complete per-action audit proof. |
| 21 Mobile behavior | 10 widths sampled; maximum root overflow 0px. This is layout screening, not every dialog/table state. |
| 22 Bugs found | B01, B17 |
| 23 Missing features | Udhari supports informal lending/settlements, not invoice receivables. |
| 24 Suggested improvements | Resolve listed integrity/security defects first; then add typed contracts, explicit failure states and complete mobile/action coverage before agency expansion. |
| 25 Existing test coverage | Authenticated route rendered in custom browser audit. Textually related test files: tests/local-phase-09-ui-browser-e2e.mjs. These references are candidates, not measured branch coverage. |
| 26 Missing test coverage | Every enabled/disabled action, negative field, cancel/PIN failure, server error, reload persistence, role matrix and populated large-data state has not been executed. Add these to the release matrix, including child dialogs. |

### Data and service wiring

| Import | Bindings |
| --- | --- |
| @/store/dataStore | { useDataStore } |
| @/store/authStore | { useAuthStore } |
| @/repositories | { transactionRepo, udhariRepo, udhariSettlementRepo } |
| @/store/uiStore | { useUIStore } |
| @/store/uiStore | { confirm } |
| @/services/validators | { udhariSchema } |
| @/services/calculations | { totalUdhariPayable, totalUdhariReceivable } |
| @/services/udhariEngine | {   buildUdhariPeopleIntel,   buildUdhariWhatsAppReminder,   udhariRemainingPaise,   udhariSettlementTxnLabel,   validateWriteOffReason, } |
| @/services/refIntegrity | { refsForUdhari } |

### Fields and controls

| Source | Control | Label / props |
| --- | --- | --- |
| [src/components/pages/UdhariPage.tsx:702](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/UdhariPage.tsx:702>) | Field | {"label":"\"Account (cash in/out)\"","required":"true"} |
| [src/components/pages/UdhariPage.tsx:703](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/UdhariPage.tsx:703>) | Select | {"value":"{accountId \|\| undefined}","onValueChange":"{(v) => setAccountId(v)}"} |
| [src/components/pages/UdhariPage.tsx:716](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/UdhariPage.tsx:716>) | Field | {"label":"\"Amount to settle (₹)\"","required":"true"} |
| [src/components/pages/UdhariPage.tsx:717](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/UdhariPage.tsx:717>) | Input | {"type":"\"number\"","value":"{amount \|\| \"\"}","onChange":"{(e) => setAmount(+e.target.value)}","max":"{remaining}"} |
| [src/components/pages/UdhariPage.tsx:784](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/UdhariPage.tsx:784>) | Field | {"label":"\"Expense category\"","required":"true"} |
| [src/components/pages/UdhariPage.tsx:785](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/UdhariPage.tsx:785>) | Select | {"value":"{categoryId \|\| undefined}","onValueChange":"{(v) => setCategoryId(v)}"} |
| [src/components/pages/UdhariPage.tsx:798](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/UdhariPage.tsx:798>) | Field | {"label":"\"Amount (₹)\"","required":"true"} |
| [src/components/pages/UdhariPage.tsx:799](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/UdhariPage.tsx:799>) | Input | {"type":"\"number\"","value":"{amount \|\| \"\"}","onChange":"{(e) => setAmount(+e.target.value)}","max":"{remaining}"} |
| [src/components/pages/UdhariPage.tsx:806](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/UdhariPage.tsx:806>) | Field | {"label":"\"Reason\"","required":"true"} |
| [src/components/pages/UdhariPage.tsx:807](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/UdhariPage.tsx:807>) | Input | {"value":"{reason}","onChange":"{(e) => setReason(e.target.value)}","placeholder":"\"e.g. unrecoverable, waived, refused\""} |
| [src/components/pages/UdhariPage.tsx:918](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/UdhariPage.tsx:918>) | Field | {"label":"\"Person\"","required":"true","className":"\"col-span-2\""} |
| [src/components/pages/UdhariPage.tsx:919](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/UdhariPage.tsx:919>) | Input | {"value":"{state.personName}","onChange":"{(e) => setState({ ...state, personName: e.target.value })}"} |
| [src/components/pages/UdhariPage.tsx:924](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/UdhariPage.tsx:924>) | Field | {"label":"\"Phone\""} |
| [src/components/pages/UdhariPage.tsx:925](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/UdhariPage.tsx:925>) | Input | {"value":"{state.phone}","onChange":"{(e) => setState({ ...state, phone: e.target.value })}","placeholder":"\"+91 …\""} |
| [src/components/pages/UdhariPage.tsx:931](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/UdhariPage.tsx:931>) | Field | {"label":"\"Type\""} |
| [src/components/pages/UdhariPage.tsx:932](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/UdhariPage.tsx:932>) | Select | {"value":"{state.type}","onValueChange":"{(v) => setState({ ...state, type: v as UdhariRecord[\"type\"] })}"} |
| [src/components/pages/UdhariPage.tsx:945](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/UdhariPage.tsx:945>) | Field | {"label":"\"Amount (₹)\"","required":"true"} |
| [src/components/pages/UdhariPage.tsx:946](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/UdhariPage.tsx:946>) | Input | {"type":"\"number\"","value":"{state.amount}","onChange":"{(e) => setState({ ...state, amount: +e.target.value })}"} |
| [src/components/pages/UdhariPage.tsx:952](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/UdhariPage.tsx:952>) | Field | {"label":"\"Context\""} |
| [src/components/pages/UdhariPage.tsx:953](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/UdhariPage.tsx:953>) | Select | {"value":"{state.context}","onValueChange":"{(v) => setState({ ...state, context: v as UdhariRecord[\"context\"] })}"} |
| [src/components/pages/UdhariPage.tsx:969](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/UdhariPage.tsx:969>) | Field | {"label":"\"Given date\"","required":"true"} |
| [src/components/pages/UdhariPage.tsx:970](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/UdhariPage.tsx:970>) | Input | {"type":"\"date\"","value":"{state.givenDate}","onChange":"{(e) => setState({ ...state, givenDate: e.target.value })}"} |
| [src/components/pages/UdhariPage.tsx:976](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/UdhariPage.tsx:976>) | Field | {"label":"\"Due date\""} |
| [src/components/pages/UdhariPage.tsx:977](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/UdhariPage.tsx:977>) | Input | {"type":"\"date\"","value":"{state.dueDate}","onChange":"{(e) => setState({ ...state, dueDate: e.target.value })}"} |
| [src/components/pages/UdhariPage.tsx:983](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/UdhariPage.tsx:983>) | Field | {"label":"\"Reminder\""} |
| [src/components/pages/UdhariPage.tsx:984](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/UdhariPage.tsx:984>) | Select | {"value":"{String(state.reminderOn)}","onValueChange":"{(v) =>\n                setState({ ...state, reminderOn: (v === \"1\" ? 1 : 0) as 0 \| 1 })\n              }"} |
| [src/components/pages/UdhariPage.tsx:999](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/UdhariPage.tsx:999>) | Field | {"label":"\"Notes\"","className":"\"col-span-2\""} |
| [src/components/pages/UdhariPage.tsx:1000](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/UdhariPage.tsx:1000>) | Input | {"value":"{state.notes}","onChange":"{(e) => setState({ ...state, notes: e.target.value })}","placeholder":"\"Optional\""} |

### Action trace

| Source | Label | Handler | Disabled |
| --- | --- | --- | --- |
| [src/components/pages/UdhariPage.tsx:273](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/UdhariPage.tsx:273>) | New Entry | {() => setAdding(true)} | none on element |
| [src/components/pages/UdhariPage.tsx:281](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/UdhariPage.tsx:281>) | People | parent/trigger | none on element |
| [src/components/pages/UdhariPage.tsx:284](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/UdhariPage.tsx:284>) | Entries | parent/trigger | none on element |
| [src/components/pages/UdhariPage.tsx:287](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/UdhariPage.tsx:287>) | History | parent/trigger | none on element |
| [src/components/pages/UdhariPage.tsx:367](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/UdhariPage.tsx:367>) | Copy | {() => {                                   void navigator.clipboard.writeText(wa);                                   toast({ title: "Reminder copied", kind: "success" });                                 }} | none on element |
| [src/components/pages/UdhariPage.tsx:431](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/UdhariPage.tsx:431>) | All ( {udhari.length} ) | parent/trigger | none on element |
| [src/components/pages/UdhariPage.tsx:432](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/UdhariPage.tsx:432>) | Receivable ( {udhari.filter((u) => u.type === "receivable").length} ) | parent/trigger | none on element |
| [src/components/pages/UdhariPage.tsx:435](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/UdhariPage.tsx:435>) | Payable ( {udhari.filter((u) => u.type === "payable").length} ) | parent/trigger | none on element |
| [src/components/pages/UdhariPage.tsx:438](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/UdhariPage.tsx:438>) | Overdue | parent/trigger | none on element |
| [src/components/pages/UdhariPage.tsx:528](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/UdhariPage.tsx:528>) | "Settle with cash" | {() => setSettling(u)} | none on element |
| [src/components/pages/UdhariPage.tsx:541](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/UdhariPage.tsx:541>) | "Write off receivable" | {() => setWriteOff(u)} | none on element |
| [src/components/pages/UdhariPage.tsx:551](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/UdhariPage.tsx:551>) | "Copy WhatsApp reminder" | {() => {                                         void navigator.clipboard.writeText(waText);                                         toast({ title: "Copied", kind: "success" });                                       }} | none on element |
| [src/components/pages/UdhariPage.tsx:563](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/UdhariPage.tsx:563>) | (icon/dynamic) | {() => setEditing(u)} | none on element |
| [src/components/pages/UdhariPage.tsx:570](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/UdhariPage.tsx:570>) | (icon/dynamic) | {() => handleDelete(u.id)} | none on element |
| [src/components/pages/UdhariPage.tsx:651](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/UdhariPage.tsx:651>) | (icon/dynamic) | {(amt, accountId) => settling && settle(settling, amt, accountId)} | none on element |
| [src/components/pages/UdhariPage.tsx:658](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/UdhariPage.tsx:658>) | (icon/dynamic) | {(amt, categoryId, reason) => writeOff && recordWriteOff(writeOff, amt, categoryId, reason)} | none on element |
| [src/components/pages/UdhariPage.tsx:725](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/UdhariPage.tsx:725>) | Settle full | {() => setAmount(remaining)} | none on element |
| [src/components/pages/UdhariPage.tsx:728](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/UdhariPage.tsx:728>) | Half | {() => setAmount(Math.round(remaining / 2))} | none on element |
| [src/components/pages/UdhariPage.tsx:737](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/UdhariPage.tsx:737>) | Cancel | {onClose} | none on element |
| [src/components/pages/UdhariPage.tsx:740](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/UdhariPage.tsx:740>) | Record settlement | {() => amount > 0 && accountId && onSubmit(amount, accountId)} | {amount <= 0 \|\| amount > remaining \|\| !accountId} |
| [src/components/pages/UdhariPage.tsx:814](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/UdhariPage.tsx:814>) | Cancel | {onClose} | none on element |
| [src/components/pages/UdhariPage.tsx:817](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/UdhariPage.tsx:817>) | Record write-off | {() => amount > 0 && categoryId && !validateWriteOffReason(reason) && onSubmit(amount, categoryId, reason)} | {amount <= 0 \|\| amount > remaining \|\| !categoryId \|\| !!validateWriteOffReason(reason)} |
| [src/components/pages/UdhariPage.tsx:917](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/UdhariPage.tsx:917>) | {err ? ( <div className="col-span-2 rounded-md bg-expense-soft p-2 text-xs text-danger"> {err} </div> ) : null} | {submit} | none on element |
| [src/components/pages/UdhariPage.tsx:1012](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/UdhariPage.tsx:1012>) | Cancel | {onClose} | none on element |
| [src/components/pages/UdhariPage.tsx:1015](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/UdhariPage.tsx:1015>) | Save | parent/trigger | none on element |

### Validation / persistence / feedback call sites

| Source | Call | Arguments (source expression) |
| --- | --- | --- |
| [src/components/pages/UdhariPage.tsx:100](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/UdhariPage.tsx:100>) | [...udhariSettlements]       .filter((s) => s.isDeleted !== 1)       .sort((a, b) => +new Date(b.date) - +new Date(a.date))       .map | (s) => ({ s, person: byId.get(s.udhariId)?.personName ?? "—", entryType: byId.get(s.udhariId)?.type, }) |
| [src/components/pages/UdhariPage.tsx:100](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/UdhariPage.tsx:100>) | [...udhariSettlements]       .filter((s) => s.isDeleted !== 1)       .sort | (a, b) => +new Date(b.date) - +new Date(a.date) |
| [src/components/pages/UdhariPage.tsx:140](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/UdhariPage.tsx:140>) | toast | { title: "Cannot delete entry", description: refs.message, kind: "warning", } |
| [src/components/pages/UdhariPage.tsx:147](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/UdhariPage.tsx:147>) | confirm | { title: "Delete this udhari entry?", description: "This entry will be removed permanently.", destructive: true, confirmLabel: "Delete entry", } |
| [src/components/pages/UdhariPage.tsx:154](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/UdhariPage.tsx:154>) | udhariRepo.softDelete | id |
| [src/components/pages/UdhariPage.tsx:156](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/UdhariPage.tsx:156>) | toast | { title: "Udhari removed", kind: "info" } |
| [src/components/pages/UdhariPage.tsx:165](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/UdhariPage.tsx:165>) | transactionRepo.create | { userId: user.id, data: { date: new Date().toISOString(), type: txnType, amount: amtRupee, amountPaise: rupeesToPaise(amtRupee), accountId, linkedUdhariId: u.id, paymentMode: "bank_transfer", merchantOrPerson: u.personName.trim() \|\| "Udhari", description: udhariSettlementTxnLabel(txnType), billAvailable: 0, gstApplicable: 0, taxFlag: 0, businessOr |
| [src/components/pages/UdhariPage.tsx:188](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/UdhariPage.tsx:188>) | udhariRepo.update | u.id, { amountSettled: newSettled, status, } |
| [src/components/pages/UdhariPage.tsx:193](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/UdhariPage.tsx:193>) | udhariSettlementRepo.create | { userId: user.id, data: { udhariId: u.id, date: new Date().toISOString(), amount: amtRupee, amountPaise: rupeesToPaise(amtRupee), transactionId: saved.id, accountId, kind: "cash", } as unknown as UdhariSettlement, } |
| [src/components/pages/UdhariPage.tsx:206](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/UdhariPage.tsx:206>) | toast | { title: status === "settled" ? "Fully settled" : "Partial settlement recorded", kind: "success", } |
| [src/components/pages/UdhariPage.tsx:217](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/UdhariPage.tsx:217>) | toast | { title: "Reason required", description: reasonError, kind: "error" } |
| [src/components/pages/UdhariPage.tsx:223](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/UdhariPage.tsx:223>) | transactionRepo.create | { userId: user.id, data: { date: new Date().toISOString(), type: "udhari_write_off", amount: amtRupee, amountPaise: rupeesToPaise(amtRupee), categoryId, linkedUdhariId: u.id, paymentMode: "other", merchantOrPerson: u.personName.trim() \|\| "Udhari", description: `Udhari receivable written off (bad debt / loss): ${reason.trim()}`, billAvailable: 0, gs |
| [src/components/pages/UdhariPage.tsx:245](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/UdhariPage.tsx:245>) | udhariRepo.update | u.id, { amountSettled: newSettled, status, } |
| [src/components/pages/UdhariPage.tsx:250](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/UdhariPage.tsx:250>) | udhariSettlementRepo.create | { userId: user.id, data: { udhariId: u.id, date: new Date().toISOString(), amount: amtRupee, amountPaise: rupeesToPaise(amtRupee), transactionId: saved.id, kind: "write_off", reason: reason.trim(), } as unknown as UdhariSettlement, } |
| [src/components/pages/UdhariPage.tsx:263](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/UdhariPage.tsx:263>) | toast | { title: "Write-off recorded", kind: "success" } |
| [src/components/pages/UdhariPage.tsx:372](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/UdhariPage.tsx:372>) | toast | { title: "Reminder copied", kind: "success" } |
| [src/components/pages/UdhariPage.tsx:557](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/UdhariPage.tsx:557>) | toast | { title: "Copied", kind: "success" } |
| [src/components/pages/UdhariPage.tsx:573](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/UdhariPage.tsx:573>) | handleDelete | u.id |
| [src/components/pages/UdhariPage.tsx:645](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/UdhariPage.tsx:645>) | toast | { title: editing ? "Updated" : "Added", kind: "success" } |
| [src/components/pages/UdhariPage.tsx:878](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/UdhariPage.tsx:878>) | udhariSchema.safeParse | state |
| [src/components/pages/UdhariPage.tsx:891](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/UdhariPage.tsx:891>) | udhariRepo.update | record.id, payload as unknown as Partial<UdhariRecord> |
| [src/components/pages/UdhariPage.tsx:892](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/UdhariPage.tsx:892>) | onSaved | updated |
| [src/components/pages/UdhariPage.tsx:894](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/UdhariPage.tsx:894>) | udhariRepo.create | { userId, data: { ...payload, amountSettled: 0, status: "open", } as unknown as UdhariRecord, } |
| [src/components/pages/UdhariPage.tsx:902](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/UdhariPage.tsx:902>) | onSaved | created |

## WealthHub: /savings

| Audit dimension | Observed implementation / assessment |
| --- | --- |
| 1-4 Identity, group, purpose, status | Planning. Investments, fixed-income assets, insurance and valuations. Implemented for current personal/platform scope, partial against the agency brief; page state audited. |
| 5 Source | [src/components/pages/WealthHubPage.tsx](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/WealthHubPage.tsx>) |
| 6-8 Data source, APIs, stores | Zustand plus repositories; generic /api/data/entity.php and entity-item.php where cloud-mapped. Source selectors: See imported store and child components. Exact imports below. |
| 9-10 UI sections and forms | "Wealth & assets"; Add FD/RD; Add insurance policy; Manual valuation |
| 11-12 Available actions and behavior | 7 source action definitions. Investment child view and vNext wealth forms; incomplete full-backup coverage matters for these records. Full handler/disabled/visibility inventory is linked below. |
| 13 Form fields | 28 field/control declarations in this file. Exact labels, binding props and validation hooks listed below; child dialog declarations are in the global inventory. |
| 14 Validation | Inline checks and/or delegated dialog validation. Frontend validation is not authoritative; backend transaction validation is stronger than other collection schemas (B14/B37). |
| 15 Empty state | No explicit empty-state primitive found in this file; inspect children. Fresh-user/seeded data were used, not every table empty condition. |
| 16 Loading state | Loading/busy state references exist; exact disabled bindings in action inventory. Slow-network/failure injection was selective, not every control. |
| 17 Error state | Error/validation handling references exist. Repository fallback can turn server rejection into apparent success (B01); presence of toast code is not proof of correct failure semantics. |
| 18 Role permissions | Active user owns the dataset. Plan/feature gates may hide controls; generic writes are constrained to the authenticated tenant, not agency roles. |
| 19 PIN requirement | No independent action PIN found in this page. Normal authentication is not a per-action authorization challenge. |
| 20 Audit creation | No direct page audit writer found; repository/server helpers may log some operations. No complete per-action audit proof. |
| 21 Mobile behavior | 10 widths sampled; maximum root overflow 0px. This is layout screening, not every dialog/table state. |
| 22 Bugs found | B01, B14, B15 |
| 23 Missing features | 37 sync contracts, card/EMI/refund engines, wealth/household/reconciliation data, admin feature flags. |
| 24 Suggested improvements | Resolve listed integrity/security defects first; then add typed contracts, explicit failure states and complete mobile/action coverage before agency expansion. |
| 25 Existing test coverage | Authenticated route rendered in custom browser audit. Textually related test files: No direct page-name/route test reference found. These references are candidates, not measured branch coverage. |
| 26 Missing test coverage | Every enabled/disabled action, negative field, cancel/PIN failure, server error, reload persistence, role matrix and populated large-data state has not been executed. Add these to the release matrix, including child dialogs. |

### Data and service wiring

| Import | Bindings |
| --- | --- |
| @/store/authStore | { useAuthStore } |
| @/store/uiStore | { useUIStore } |
| @/repositories | {   assetValuationRepo,   fixedIncomeAssetRepo,   insurancePolicyRepo, } |

### Fields and controls

| Source | Control | Label / props |
| --- | --- | --- |
| [src/components/pages/WealthHubPage.tsx:197](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/WealthHubPage.tsx:197>) | Field | {"label":"\"Name\""} |
| [src/components/pages/WealthHubPage.tsx:198](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/WealthHubPage.tsx:198>) | Input | {"value":"{fdName}","onChange":"{(e) => setFdName(e.target.value)}","placeholder":"\"SBI FD 2026\""} |
| [src/components/pages/WealthHubPage.tsx:200](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/WealthHubPage.tsx:200>) | Field | {"label":"\"Type\""} |
| [src/components/pages/WealthHubPage.tsx:201](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/WealthHubPage.tsx:201>) | Select | {"value":"{fdType}","onValueChange":"{(v) => setFdType(v as \"fd\" \| \"rd\")}"} |
| [src/components/pages/WealthHubPage.tsx:209](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/WealthHubPage.tsx:209>) | Field | {"label":"\"Principal (₹)\""} |
| [src/components/pages/WealthHubPage.tsx:210](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/WealthHubPage.tsx:210>) | Input | {"type":"\"number\"","min":"{0}","value":"{fdPrincipal}","onChange":"{(e) => setFdPrincipal(e.target.value)}"} |
| [src/components/pages/WealthHubPage.tsx:212](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/WealthHubPage.tsx:212>) | Field | {"label":"\"Annual rate %\""} |
| [src/components/pages/WealthHubPage.tsx:213](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/WealthHubPage.tsx:213>) | Input | {"type":"\"number\"","step":"\"0.01\"","value":"{fdRate}","onChange":"{(e) => setFdRate(e.target.value)}"} |
| [src/components/pages/WealthHubPage.tsx:215](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/WealthHubPage.tsx:215>) | Field | {"label":"\"Start date\""} |
| [src/components/pages/WealthHubPage.tsx:216](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/WealthHubPage.tsx:216>) | Input | {"type":"\"date\"","value":"{fdStart}","onChange":"{(e) => setFdStart(e.target.value)}"} |
| [src/components/pages/WealthHubPage.tsx:218](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/WealthHubPage.tsx:218>) | Field | {"label":"\"Maturity date\""} |
| [src/components/pages/WealthHubPage.tsx:219](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/WealthHubPage.tsx:219>) | Input | {"type":"\"date\"","value":"{fdMaturity}","onChange":"{(e) => setFdMaturity(e.target.value)}"} |
| [src/components/pages/WealthHubPage.tsx:244](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/WealthHubPage.tsx:244>) | Field | {"label":"\"Policy name\""} |
| [src/components/pages/WealthHubPage.tsx:245](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/WealthHubPage.tsx:245>) | Input | {"value":"{insName}","onChange":"{(e) => setInsName(e.target.value)}"} |
| [src/components/pages/WealthHubPage.tsx:247](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/WealthHubPage.tsx:247>) | Field | {"label":"\"Insurer\""} |
| [src/components/pages/WealthHubPage.tsx:248](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/WealthHubPage.tsx:248>) | Input | {"value":"{insurer}","onChange":"{(e) => setInsurer(e.target.value)}","placeholder":"\"LIC / HDFC Life\""} |
| [src/components/pages/WealthHubPage.tsx:250](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/WealthHubPage.tsx:250>) | Field | {"label":"\"Premium (₹)\""} |
| [src/components/pages/WealthHubPage.tsx:251](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/WealthHubPage.tsx:251>) | Input | {"type":"\"number\"","value":"{insPremium}","onChange":"{(e) => setInsPremium(e.target.value)}"} |
| [src/components/pages/WealthHubPage.tsx:253](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/WealthHubPage.tsx:253>) | Field | {"label":"\"Coverage (₹)\""} |
| [src/components/pages/WealthHubPage.tsx:254](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/WealthHubPage.tsx:254>) | Input | {"type":"\"number\"","value":"{insCoverage}","onChange":"{(e) => setInsCoverage(e.target.value)}"} |
| [src/components/pages/WealthHubPage.tsx:256](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/WealthHubPage.tsx:256>) | Field | {"label":"\"Premium due day (1–28)\""} |
| [src/components/pages/WealthHubPage.tsx:257](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/WealthHubPage.tsx:257>) | Input | {"type":"\"number\"","min":"{1}","max":"{28}","value":"{insDueDay}","onChange":"{(e) => setInsDueDay(e.target.value)}"} |
| [src/components/pages/WealthHubPage.tsx:291](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/WealthHubPage.tsx:291>) | Field | {"label":"\"Label\""} |
| [src/components/pages/WealthHubPage.tsx:292](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/WealthHubPage.tsx:292>) | Input | {"value":"{valLabel}","onChange":"{(e) => setValLabel(e.target.value)}","placeholder":"\"Gold jewellery\""} |
| [src/components/pages/WealthHubPage.tsx:294](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/WealthHubPage.tsx:294>) | Field | {"label":"\"Type\""} |
| [src/components/pages/WealthHubPage.tsx:295](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/WealthHubPage.tsx:295>) | Select | {"value":"{valType}","onValueChange":"{(v) => setValType(v as typeof valType)}"} |
| [src/components/pages/WealthHubPage.tsx:305](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/WealthHubPage.tsx:305>) | Field | {"label":"\"Value (₹)\""} |
| [src/components/pages/WealthHubPage.tsx:306](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/WealthHubPage.tsx:306>) | Input | {"type":"\"number\"","value":"{valAmount}","onChange":"{(e) => setValAmount(e.target.value)}"} |

### Action trace

| Source | Label | Handler | Disabled |
| --- | --- | --- | --- |
| [src/components/pages/WealthHubPage.tsx:181](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/WealthHubPage.tsx:181>) | Investments | parent/trigger | none on element |
| [src/components/pages/WealthHubPage.tsx:182](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/WealthHubPage.tsx:182>) | FD / RD | parent/trigger | none on element |
| [src/components/pages/WealthHubPage.tsx:183](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/WealthHubPage.tsx:183>) | Insurance | parent/trigger | none on element |
| [src/components/pages/WealthHubPage.tsx:184](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/WealthHubPage.tsx:184>) | Valuations | parent/trigger | none on element |
| [src/components/pages/WealthHubPage.tsx:222](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/WealthHubPage.tsx:222>) | Save | {addFd} | none on element |
| [src/components/pages/WealthHubPage.tsx:260](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/WealthHubPage.tsx:260>) | Save | {addInsurance} | none on element |
| [src/components/pages/WealthHubPage.tsx:309](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/WealthHubPage.tsx:309>) | Save | {addValuation} | none on element |

### Validation / persistence / feedback call sites

| Source | Call | Arguments (source expression) |
| --- | --- | --- |
| [src/components/pages/WealthHubPage.tsx:62](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/WealthHubPage.tsx:62>) | fixedIncomeAssetRepo.list | user.id |
| [src/components/pages/WealthHubPage.tsx:63](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/WealthHubPage.tsx:63>) | insurancePolicyRepo.list | user.id |
| [src/components/pages/WealthHubPage.tsx:64](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/WealthHubPage.tsx:64>) | assetValuationRepo.list | user.id |
| [src/components/pages/WealthHubPage.tsx:70](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/WealthHubPage.tsx:70>) | toast | { title: e instanceof Error ? e.message : "Failed to load wealth data", kind: "error" } |
| [src/components/pages/WealthHubPage.tsx:81](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/WealthHubPage.tsx:81>) | toast | { title: "Enter name and principal amount", kind: "error" } |
| [src/components/pages/WealthHubPage.tsx:85](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/WealthHubPage.tsx:85>) | toast | { title: "Maturity date must be on/after start date", kind: "error" } |
| [src/components/pages/WealthHubPage.tsx:90](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/WealthHubPage.tsx:90>) | fixedIncomeAssetRepo.create | { userId: user.id, data: { name: fdName.trim(), type: fdType, principalPaise: rupeesToPaise(Number(fdPrincipal)), rateBps: Math.round(Number(fdRate \|\| 0) * 100), startDate: fdStart, maturityDate: fdMaturity, status: "active", }, } |
| [src/components/pages/WealthHubPage.tsx:104](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/WealthHubPage.tsx:104>) | toast | { title: `${fdType.toUpperCase()} saved`, kind: "success" } |
| [src/components/pages/WealthHubPage.tsx:107](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/WealthHubPage.tsx:107>) | toast | { title: e instanceof Error ? e.message : "Could not save FD/RD", kind: "error" } |
| [src/components/pages/WealthHubPage.tsx:116](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/WealthHubPage.tsx:116>) | toast | { title: "Enter policy name, insurer, and premium", kind: "error" } |
| [src/components/pages/WealthHubPage.tsx:121](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/WealthHubPage.tsx:121>) | insurancePolicyRepo.create | { userId: user.id, data: { name: insName.trim(), insurer: insurer.trim(), premiumPaise: rupeesToPaise(Number(insPremium)), premiumDueDay: Math.min(28, Math.max(1, Number(insDueDay) \|\| 1)), coveragePaise: rupeesToPaise(Number(insCoverage) \|\| 0), status: "active", }, } |
| [src/components/pages/WealthHubPage.tsx:136](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/WealthHubPage.tsx:136>) | toast | { title: "Insurance policy saved", kind: "success" } |
| [src/components/pages/WealthHubPage.tsx:139](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/WealthHubPage.tsx:139>) | toast | { title: e instanceof Error ? e.message : "Could not save policy", kind: "error" } |
| [src/components/pages/WealthHubPage.tsx:148](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/WealthHubPage.tsx:148>) | toast | { title: "Enter label and value", kind: "error" } |
| [src/components/pages/WealthHubPage.tsx:153](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/WealthHubPage.tsx:153>) | assetValuationRepo.create | { userId: user.id, data: { assetType: valType, label: valLabel.trim(), valuePaise: rupeesToPaise(Number(valAmount)), asOfDate: localToday(), }, } |
| [src/components/pages/WealthHubPage.tsx:164](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/WealthHubPage.tsx:164>) | toast | { title: "Valuation saved", kind: "success" } |
| [src/components/pages/WealthHubPage.tsx:167](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/WealthHubPage.tsx:167>) | toast | { title: e instanceof Error ? e.message : "Could not save valuation", kind: "error" } |

## Investments: /savings (child)

| Audit dimension | Observed implementation / assessment |
| --- | --- |
| 1-4 Identity, group, purpose, status | Planning. Investment/savings contribution management. Implemented for current personal/platform scope, partial against the agency brief; page state audited. |
| 5 Source | [src/components/pages/InvestmentsPage.tsx](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/InvestmentsPage.tsx>) |
| 6-8 Data source, APIs, stores | Zustand plus repositories; generic /api/data/entity.php and entity-item.php where cloud-mapped. Source selectors: investments, transactions, startDate, maturityDate. Exact imports below. |
| 9-10 UI sections and forms | "Savings & Investments"; {formatINR(paiseToRupees(totals.totalContributed))}; {formatINR(paiseToRupees(totals.monthlyTarget))}; {formatINR(paiseToRupees(totals.emergency))}; {totals.emergencyMonths.toFixed(1)} mo; Contribute to {investment?.name}; {investment ? "Edit Investment" : "New Investment"} |
| 11-12 Available actions and behavior | 12 source action definitions. Nested rendered page, not a 31st distinct route; contribution data is not market-price integration. Full handler/disabled/visibility inventory is linked below. |
| 13 Form fields | 16 field/control declarations in this file. Exact labels, binding props and validation hooks listed below; child dialog declarations are in the global inventory. |
| 14 Validation | investmentSchema.safeParse. Frontend validation is not authoritative; backend transaction validation is stronger than other collection schemas (B14/B37). |
| 15 Empty state | Empty/no-data branches or delegated empty-state components exist. Fresh-user/seeded data were used, not every table empty condition. |
| 16 Loading state | Loading/busy state references exist; exact disabled bindings in action inventory. Slow-network/failure injection was selective, not every control. |
| 17 Error state | Error/validation handling references exist. Repository fallback can turn server rejection into apparent success (B01); presence of toast code is not proof of correct failure semantics. |
| 18 Role permissions | Active user owns the dataset. Plan/feature gates may hide controls; generic writes are constrained to the authenticated tenant, not agency roles. |
| 19 PIN requirement | No independent action PIN found in this page. Normal authentication is not a per-action authorization challenge. |
| 20 Audit creation | No direct page audit writer found; repository/server helpers may log some operations. No complete per-action audit proof. |
| 21 Mobile behavior | Child view not independently traversed as a route. |
| 22 Bugs found | B01, B15 |
| 23 Missing features | No agency lifecycle/role/close-period equivalence is implied by this personal-finance view. |
| 24 Suggested improvements | Resolve listed integrity/security defects first; then add typed contracts, explicit failure states and complete mobile/action coverage before agency expansion. |
| 25 Existing test coverage | Textually related test files: No direct page-name/route test reference found. These references are candidates, not measured branch coverage. |
| 26 Missing test coverage | Every enabled/disabled action, negative field, cancel/PIN failure, server error, reload persistence, role matrix and populated large-data state has not been executed. Add these to the release matrix, including child dialogs. |

### Data and service wiring

| Import | Bindings |
| --- | --- |
| @/store/dataStore | { useDataStore } |
| @/store/authStore | { useAuthStore } |
| @/repositories | { investmentRepo, savingsContribRepo } |
| @/store/uiStore | { useUIStore } |
| @/store/uiStore | { confirm } |
| @/services/validators | { investmentSchema } |
| @/services/calculations | { projectedCorpus, emergencyMonthsCoverage, sumExpense } |
| @/services/refIntegrity | { refsForInvestment } |

### Fields and controls

| Source | Control | Label / props |
| --- | --- | --- |
| [src/components/pages/InvestmentsPage.tsx:342](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/InvestmentsPage.tsx:342>) | Field | {"label":"\"Amount (₹)\"","required":"true"} |
| [src/components/pages/InvestmentsPage.tsx:343](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/InvestmentsPage.tsx:343>) | Input | {"type":"\"number\"","value":"{amount}","onChange":"{(e) => setAmount(+e.target.value)}"} |
| [src/components/pages/InvestmentsPage.tsx:454](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/InvestmentsPage.tsx:454>) | Field | {"label":"\"Name\"","required":"true","className":"\"col-span-2\""} |
| [src/components/pages/InvestmentsPage.tsx:455](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/InvestmentsPage.tsx:455>) | Input | {"value":"{state.name}","onChange":"{(e) => setState({ ...state, name: e.target.value })}","placeholder":"\"Axis Bluechip SIP\""} |
| [src/components/pages/InvestmentsPage.tsx:461](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/InvestmentsPage.tsx:461>) | Field | {"label":"\"Type\""} |
| [src/components/pages/InvestmentsPage.tsx:462](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/InvestmentsPage.tsx:462>) | Select | {"value":"{state.type}","onValueChange":"{(v) => setState({ ...state, type: v as Investment[\"type\"] })}"} |
| [src/components/pages/InvestmentsPage.tsx:478](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/InvestmentsPage.tsx:478>) | Field | {"label":"\"Frequency\""} |
| [src/components/pages/InvestmentsPage.tsx:479](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/InvestmentsPage.tsx:479>) | Select | {"value":"{state.frequency}","onValueChange":"{(v) =>\n                setState({ ...state, frequency: v as Investment[\"frequency\"] })\n              }"} |
| [src/components/pages/InvestmentsPage.tsx:496](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/InvestmentsPage.tsx:496>) | Field | {"label":"\"Start date\"","required":"true"} |
| [src/components/pages/InvestmentsPage.tsx:497](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/InvestmentsPage.tsx:497>) | Input | {"type":"\"date\"","value":"{state.startDate}","onChange":"{(e) => setState({ ...state, startDate: e.target.value })}"} |
| [src/components/pages/InvestmentsPage.tsx:503](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/InvestmentsPage.tsx:503>) | Field | {"label":"\"Maturity date\""} |
| [src/components/pages/InvestmentsPage.tsx:504](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/InvestmentsPage.tsx:504>) | Input | {"type":"\"date\"","value":"{state.maturityDate}","onChange":"{(e) => setState({ ...state, maturityDate: e.target.value })}"} |
| [src/components/pages/InvestmentsPage.tsx:510](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/InvestmentsPage.tsx:510>) | Field | {"label":"\"Monthly target (₹)\""} |
| [src/components/pages/InvestmentsPage.tsx:511](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/InvestmentsPage.tsx:511>) | Input | {"type":"\"number\"","value":"{state.monthlyTarget}","onChange":"{(e) => setState({ ...state, monthlyTarget: +e.target.value })}"} |
| [src/components/pages/InvestmentsPage.tsx:517](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/InvestmentsPage.tsx:517>) | Field | {"label":"\"Expected return %\""} |
| [src/components/pages/InvestmentsPage.tsx:518](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/InvestmentsPage.tsx:518>) | Input | {"type":"\"number\"","step":"\"0.1\"","value":"{state.expectedReturnRate}","onChange":"{(e) =>\n                setState({ ...state, expectedReturnRate: +e.target.value })\n              }"} |

### Action trace

| Source | Label | Handler | Disabled |
| --- | --- | --- | --- |
| [src/components/pages/InvestmentsPage.tsx:133](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/InvestmentsPage.tsx:133>) | New Bucket | {() => setAdding(true)} | none on element |
| [src/components/pages/InvestmentsPage.tsx:140](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/InvestmentsPage.tsx:140>) | New Bucket | {() => setAdding(true)} | none on element |
| [src/components/pages/InvestmentsPage.tsx:191](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/InvestmentsPage.tsx:191>) | Add Investment | {() => setAdding(true)} | none on element |
| [src/components/pages/InvestmentsPage.tsx:271](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/InvestmentsPage.tsx:271>) | Contribute | {() => setContributing(inv)} | none on element |
| [src/components/pages/InvestmentsPage.tsx:279](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/InvestmentsPage.tsx:279>) | (icon/dynamic) | {() => setEditing(inv)} | none on element |
| [src/components/pages/InvestmentsPage.tsx:282](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/InvestmentsPage.tsx:282>) | (icon/dynamic) | {() => handleDelete(inv.id)} | none on element |
| [src/components/pages/InvestmentsPage.tsx:317](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/InvestmentsPage.tsx:317>) | (icon/dynamic) | {(amt) => contributing && contribute(contributing, amt)} | none on element |
| [src/components/pages/InvestmentsPage.tsx:350](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/InvestmentsPage.tsx:350>) | Cancel | {onClose} | none on element |
| [src/components/pages/InvestmentsPage.tsx:353](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/InvestmentsPage.tsx:353>) | Record contribution | {() => amount > 0 && onSubmit(amount)} | {amount <= 0} |
| [src/components/pages/InvestmentsPage.tsx:453](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/InvestmentsPage.tsx:453>) | {err ? ( <div className="col-span-2 rounded-md bg-expense-soft p-2 text-xs text-danger"> {err} </div> ) : null} | {submit} | none on element |
| [src/components/pages/InvestmentsPage.tsx:533](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/InvestmentsPage.tsx:533>) | Cancel | {onClose} | none on element |
| [src/components/pages/InvestmentsPage.tsx:536](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/InvestmentsPage.tsx:536>) | Save | parent/trigger | none on element |

### Validation / persistence / feedback call sites

| Source | Call | Arguments (source expression) |
| --- | --- | --- |
| [src/components/pages/InvestmentsPage.tsx:79](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/InvestmentsPage.tsx:79>) | toast | { title: "Cannot delete investment", description: refs.message, kind: "warning", } |
| [src/components/pages/InvestmentsPage.tsx:86](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/InvestmentsPage.tsx:86>) | confirm | { title: "Delete this investment?", description: "This investment will be removed permanently.", destructive: true, confirmLabel: "Delete investment", } |
| [src/components/pages/InvestmentsPage.tsx:93](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/InvestmentsPage.tsx:93>) | investmentRepo.softDelete | id |
| [src/components/pages/InvestmentsPage.tsx:95](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/InvestmentsPage.tsx:95>) | toast | { title: "Investment removed", kind: "info" } |
| [src/components/pages/InvestmentsPage.tsx:100](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/InvestmentsPage.tsx:100>) | investmentRepo.update | inv.id, { totalContributedPaise: investmentTotalContributedPaise(inv) + rupeesToPaise(amount), totalContributed: paiseToRupees( investmentTotalContributedPaise(inv) + rupeesToPaise(amount), ), } |
| [src/components/pages/InvestmentsPage.tsx:108](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/InvestmentsPage.tsx:108>) | savingsContribRepo.create | { userId: user.id, data: { investmentId: inv.id, date: new Date().toISOString(), amount, amountPaise: rupeesToPaise(amount), }, } |
| [src/components/pages/InvestmentsPage.tsx:118](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/InvestmentsPage.tsx:118>) | toast | { title: "Contribution added", description: `${formatINR(amount)} to ${inv.name}`, kind: "success", } |
| [src/components/pages/InvestmentsPage.tsx:285](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/InvestmentsPage.tsx:285>) | handleDelete | inv.id |
| [src/components/pages/InvestmentsPage.tsx:308](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/InvestmentsPage.tsx:308>) | toast | { title: editing ? "Updated" : "Added", kind: "success", } |
| [src/components/pages/InvestmentsPage.tsx:409](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/InvestmentsPage.tsx:409>) | investmentSchema.safeParse | state |
| [src/components/pages/InvestmentsPage.tsx:424](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/InvestmentsPage.tsx:424>) | investmentRepo.update | investment.id, payload as unknown as Partial<Investment> |
| [src/components/pages/InvestmentsPage.tsx:428](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/InvestmentsPage.tsx:428>) | onSaved | updated |
| [src/components/pages/InvestmentsPage.tsx:430](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/InvestmentsPage.tsx:430>) | investmentRepo.create | { userId, data: { ...payload, totalContributed: 0, status: "active", } as unknown as Investment, } |
| [src/components/pages/InvestmentsPage.tsx:438](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/InvestmentsPage.tsx:438>) | onSaved | created |

## Categories: /categories

| Audit dimension | Observed implementation / assessment |
| --- | --- |
| 1-4 Identity, group, purpose, status | Ledger. Income/expense classification hierarchy. Implemented for current personal/platform scope, partial against the agency brief; page state audited. |
| 5 Source | [src/components/pages/CategoriesPage.tsx](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/CategoriesPage.tsx>) |
| 6-8 Data source, APIs, stores | Zustand plus repositories; generic /api/data/entity.php and entity-item.php where cloud-mapped. Source selectors: categories, transactions, chartAccessibility. Exact imports below. |
| 9-10 UI sections and forms | "Categories"; {category ? "Edit category" : "New category"} |
| 11-12 Available actions and behavior | 16 source action definitions. Category editing, colors, defaults and removal; malformed enum accepted by API; icon actions have unnamed-control candidates. Full handler/disabled/visibility inventory is linked below. |
| 13 Form fields | 7 field/control declarations in this file. Exact labels, binding props and validation hooks listed below; child dialog declarations are in the global inventory. |
| 14 Validation | categorySchema.safeParse. Frontend validation is not authoritative; backend transaction validation is stronger than other collection schemas (B14/B37). |
| 15 Empty state | Empty/no-data branches or delegated empty-state components exist. Fresh-user/seeded data were used, not every table empty condition. |
| 16 Loading state | Loading/busy state references exist; exact disabled bindings in action inventory. Slow-network/failure injection was selective, not every control. |
| 17 Error state | Error/validation handling references exist. Repository fallback can turn server rejection into apparent success (B01); presence of toast code is not proof of correct failure semantics. |
| 18 Role permissions | Active user owns the dataset. Plan/feature gates may hide controls; generic writes are constrained to the authenticated tenant, not agency roles. |
| 19 PIN requirement | No independent action PIN found in this page. Normal authentication is not a per-action authorization challenge. |
| 20 Audit creation | No direct page audit writer found; repository/server helpers may log some operations. No complete per-action audit proof. |
| 21 Mobile behavior | 10 widths sampled; maximum root overflow 0px. This is layout screening, not every dialog/table state. |
| 22 Bugs found | B14, B29, B30, B34 |
| 23 Missing features | No agency lifecycle/role/close-period equivalence is implied by this personal-finance view. |
| 24 Suggested improvements | Resolve listed integrity/security defects first; then add typed contracts, explicit failure states and complete mobile/action coverage before agency expansion. |
| 25 Existing test coverage | Authenticated route rendered in custom browser audit. Textually related test files: No direct page-name/route test reference found. These references are candidates, not measured branch coverage. |
| 26 Missing test coverage | Every enabled/disabled action, negative field, cancel/PIN failure, server error, reload persistence, role matrix and populated large-data state has not been executed. Add these to the release matrix, including child dialogs. |

### Data and service wiring

| Import | Bindings |
| --- | --- |
| @/store/dataStore | { useDataStore } |
| @/store/authStore | { useAuthStore } |
| @/repositories | { categoryRepo } |
| @/services/validators | { categorySchema } |
| @/services/categoryColorEngine | { suggestNextCategoryColor } |
| @/store/uiStore | { useUIStore } |
| @/store/uiStore | { confirm } |
| @/services/categoryColorEngine | { findDuplicateCategoryColors } |

### Fields and controls

| Source | Control | Label / props |
| --- | --- | --- |
| [src/components/pages/CategoriesPage.tsx:128](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/CategoriesPage.tsx:128>) | Select | {"value":"{filter}","onValueChange":"{(v) => setFilter(v as typeof filter)}"} |
| [src/components/pages/CategoriesPage.tsx:361](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/CategoriesPage.tsx:361>) | Field | {"label":"\"Name\"","required":"true"} |
| [src/components/pages/CategoriesPage.tsx:362](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/CategoriesPage.tsx:362>) | Input | {"value":"{state.name}","onChange":"{(e) => setState({ ...state, name: e.target.value })}","placeholder":"\"Groceries\""} |
| [src/components/pages/CategoriesPage.tsx:368](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/CategoriesPage.tsx:368>) | Field | {"label":"\"Applies to\""} |
| [src/components/pages/CategoriesPage.tsx:369](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/CategoriesPage.tsx:369>) | Select | {"value":"{state.appliesTo}","onValueChange":"{(v) => {\n                const appliesTo = v as typeof state.appliesTo;\n                setState((prev) => ({\n                  ...prev,\n                  appliesTo,\n                  color: category\n                    ? prev.color\n                    : suggestNextCategoryColor(appliesTo, allCategories, chartAccessibility),\n                }));\n              }}"} |
| [src/components/pages/CategoriesPage.tsx:392](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/CategoriesPage.tsx:392>) | Field | {"label":"\"Icon\""} |
| [src/components/pages/CategoriesPage.tsx:406](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/CategoriesPage.tsx:406>) | Field | {"label":"\"Color\""} |

### Action trace

| Source | Label | Handler | Disabled |
| --- | --- | --- | --- |
| [src/components/pages/CategoriesPage.tsx:108](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/CategoriesPage.tsx:108>) | New Category | {() => setAdding(true)} | none on element |
| [src/components/pages/CategoriesPage.tsx:116](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/CategoriesPage.tsx:116>) | List | parent/trigger | none on element |
| [src/components/pages/CategoriesPage.tsx:117](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/CategoriesPage.tsx:117>) | Cleanup &amp; merge | parent/trigger | none on element |
| [src/components/pages/CategoriesPage.tsx:139](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/CategoriesPage.tsx:139>) | (icon/dynamic) | {(c) => setShowArchived(!!c)} | none on element |
| [src/components/pages/CategoriesPage.tsx:158](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/CategoriesPage.tsx:158>) | New Category | {() => setAdding(true)} | none on element |
| [src/components/pages/CategoriesPage.tsx:197](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/CategoriesPage.tsx:197>) | (icon/dynamic) | {() => setEditing(c)} | none on element |
| [src/components/pages/CategoriesPage.tsx:204](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/CategoriesPage.tsx:204>) | {c.archived ? ( <ArchiveRestore className="h-3.5 w-3.5" /> ) : ( <Archive className="h-3.5 w-3.5" /> )} | {() => handleArchive(c)} | none on element |
| [src/components/pages/CategoriesPage.tsx:215](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/CategoriesPage.tsx:215>) | (icon/dynamic) | {() => handleDelete(c)} | none on element |
| [src/components/pages/CategoriesPage.tsx:360](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/CategoriesPage.tsx:360>) | {err ? ( <div className="rounded-md bg-expense-soft p-2 text-xs text-danger"> {err} </div> ) : null} | {submit} | none on element |
| [src/components/pages/CategoriesPage.tsx:395](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/CategoriesPage.tsx:395>) | {i} | {() => setState({ ...state, icon: i })} | none on element |
| [src/components/pages/CategoriesPage.tsx:409](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/CategoriesPage.tsx:409>) | (icon/dynamic) | {() => setState({ ...state, color: c })} | none on element |
| [src/components/pages/CategoriesPage.tsx:427](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/CategoriesPage.tsx:427>) | (icon/dynamic) | {(v) => setState({ ...state, budgetable: v ? 1 : 0 })} | none on element |
| [src/components/pages/CategoriesPage.tsx:434](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/CategoriesPage.tsx:434>) | (icon/dynamic) | {(v) => setState({ ...state, taxRelevant: v ? 1 : 0 })} | none on element |
| [src/components/pages/CategoriesPage.tsx:441](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/CategoriesPage.tsx:441>) | (icon/dynamic) | {(v) => setState({ ...state, gstRelevant: v ? 1 : 0 })} | none on element |
| [src/components/pages/CategoriesPage.tsx:454](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/CategoriesPage.tsx:454>) | Cancel | {onClose} | none on element |
| [src/components/pages/CategoriesPage.tsx:457](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/CategoriesPage.tsx:457>) | Save | parent/trigger | {saving} |

### Validation / persistence / feedback call sites

| Source | Call | Arguments (source expression) |
| --- | --- | --- |
| [src/components/pages/CategoriesPage.tsx:67](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/CategoriesPage.tsx:67>) | categoryRepo.update | c.id, { archived: c.archived ? 0 : 1, } |
| [src/components/pages/CategoriesPage.tsx:72](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/CategoriesPage.tsx:72>) | toast | { title: updated.archived ? "Category archived" : "Category restored", kind: "info", } |
| [src/components/pages/CategoriesPage.tsx:81](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/CategoriesPage.tsx:81>) | toast | { title: "Cannot delete", description: `${usageCount(c)} transaction(s) use this category. Archive instead or remap records first.`, kind: "warning", } |
| [src/components/pages/CategoriesPage.tsx:88](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/CategoriesPage.tsx:88>) | confirm | { title: "Delete this category?", description: "This category will be removed permanently.", destructive: true, confirmLabel: "Delete category", } |
| [src/components/pages/CategoriesPage.tsx:95](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/CategoriesPage.tsx:95>) | categoryRepo.softDelete | c.id |
| [src/components/pages/CategoriesPage.tsx:97](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/CategoriesPage.tsx:97>) | toast | { title: "Category deleted", kind: "info" } |
| [src/components/pages/CategoriesPage.tsx:218](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/CategoriesPage.tsx:218>) | handleDelete | c |
| [src/components/pages/CategoriesPage.tsx:245](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/CategoriesPage.tsx:245>) | toast | { title: editing ? "Category updated" : "Category created", kind: "success", } |
| [src/components/pages/CategoriesPage.tsx:324](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/CategoriesPage.tsx:324>) | categorySchema.safeParse | state |
| [src/components/pages/CategoriesPage.tsx:333](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/CategoriesPage.tsx:333>) | categoryRepo.update | category.id, parse.data |
| [src/components/pages/CategoriesPage.tsx:334](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/CategoriesPage.tsx:334>) | onSaved | updated |
| [src/components/pages/CategoriesPage.tsx:336](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/CategoriesPage.tsx:336>) | categoryRepo.create | { userId, data: { ...parse.data, parentId: null, sortOrder: 999, archived: 0, }, } |
| [src/components/pages/CategoriesPage.tsx:345](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/CategoriesPage.tsx:345>) | onSaved | created |

## Reports: /reports

| Audit dimension | Observed implementation / assessment |
| --- | --- |
| 1-4 Identity, group, purpose, status | Insights. Personal trends, spending, debt and CA workbook. Implemented for current personal/platform scope, partial against the agency brief; upgrade-gated state audited. |
| 5 Source | [src/components/pages/ReportsPage.tsx](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/ReportsPage.tsx>) |
| 6-8 Data source, APIs, stores | Zustand plus repositories; generic /api/data/entity.php and entity-item.php where cloud-mapped. Source selectors: transactions, categories, cards, loans, emis, ledgerEvents, ledgerEffects, accounts, recurringRules, goals, goalContribs, budgets, savingsContribs, udhari, investments, emiPaise. Exact imports below. |
| 9-10 UI sections and forms | "Reports & Analytics"; "Reports & Analytics"; Report library; Cashflow &amp; resilience (Phase 10); Ledger (Phase 5); Ledger Coverage Diagnostic; Income vs Expense; Month-over-Month; Year-over-Year Summary; Top Categories; Top Merchants; Need vs Want; Fixed vs Variable; Payment Mode Split; Net Cashflow Trend; {value} |
| 11-12 Available actions and behavior | 6 source action definitions. Free fixture reaches the upgrade gate, not all chart content. Source and pure finance tests cover report helpers; paid populated chart interaction remains untested. Full handler/disabled/visibility inventory is linked below. |
| 13 Form fields | 1 field/control declarations in this file. Exact labels, binding props and validation hooks listed below; child dialog declarations are in the global inventory. |
| 14 Validation | Inline checks and/or delegated dialog validation. Frontend validation is not authoritative; backend transaction validation is stronger than other collection schemas (B14/B37). |
| 15 Empty state | Empty/no-data branches or delegated empty-state components exist. Fresh-user/seeded data were used, not every table empty condition. |
| 16 Loading state | Loading/busy state references exist; exact disabled bindings in action inventory. Slow-network/failure injection was selective, not every control. |
| 17 Error state | No explicit per-page error handling located. Repository fallback can turn server rejection into apparent success (B01); presence of toast code is not proof of correct failure semantics. |
| 18 Role permissions | Active user owns the dataset. Plan/feature gates may hide controls; generic writes are constrained to the authenticated tenant, not agency roles. |
| 19 PIN requirement | No independent action PIN found in this page. Normal authentication is not a per-action authorization challenge. |
| 20 Audit creation | No direct page audit writer found; repository/server helpers may log some operations. No complete per-action audit proof. |
| 21 Mobile behavior | 10 widths sampled; maximum root overflow 0px. This is layout screening, not every dialog/table state. |
| 22 Bugs found | B16, B17, B18, B23, B24 |
| 23 Missing features | Personal reports implemented and plan-gated; known finance/export inconsistencies. |
| 24 Suggested improvements | Resolve listed integrity/security defects first; then add typed contracts, explicit failure states and complete mobile/action coverage before agency expansion. |
| 25 Existing test coverage | Authenticated route rendered in custom browser audit. Textually related test files: tests/local-phase-09-ui-browser-e2e.mjs. These references are candidates, not measured branch coverage. |
| 26 Missing test coverage | Every enabled/disabled action, negative field, cancel/PIN failure, server error, reload persistence, role matrix and populated large-data state has not been executed. Add these to the release matrix, including child dialogs. |

### Data and service wiring

| Import | Bindings |
| --- | --- |
| @/store/dataStore | { useDataStore } |
| @/store/authStore | { useAuthStore } |
| @/services/calculations | {   categoryBreakdown,   filterByMonth,   monthlyTrend,   summarizeLoan,   sumExpense,   sumIncome, } |
| @/services/ledgerCalculations | {   calculateExpenseView,   calculateLedgerMonthKpis,   hasUsableLedger, } |
| @/services/ledgerDiagnostics | {   diagnoseLedgerCoverage,   ledgerDiagnosticTotal, } |
| @/services/financeLedgerExplain | { explainCategorySpend } |
| @/exports/xlsxExporter | { exportModuleToSheet, buildCAWorkbook, downloadBuffer } |
| @/store/cloudAppStore | { useCloudAppStore } |
| @/services/cashflowSurvivalEngine | { buildCashflowSurvivalReport } |
| @/services/emergencyFundEngine | { buildEmergencyFundIntel } |

### Fields and controls

| Source | Control | Label / props |
| --- | --- | --- |
| [src/components/pages/ReportsPage.tsx:343](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/ReportsPage.tsx:343>) | Select | {"value":"{String(monthsBack)}","onValueChange":"{(v) => setMonthsBack(+v)}"} |

### Action trace

| Source | Label | Handler | Disabled |
| --- | --- | --- | --- |
| [src/components/pages/ReportsPage.tsx:384](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/ReportsPage.tsx:384>) | Download CA workbook | {() => {                 const { buffer, filename } = buildCAWorkbook({                   transactions,                   categories,                   accounts,                   cards,                   budgets,                   goals,                   goalContribs,                   loans,                   emis,                   udhari,                   investments,                   savingsContribs,                 });                 downloadBuffer(buffer, filename);               }} | none on element |
| [src/components/pages/ReportsPage.tsx:536](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/ReportsPage.tsx:536>) | Overview | parent/trigger | none on element |
| [src/components/pages/ReportsPage.tsx:537](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/ReportsPage.tsx:537>) | Spending | parent/trigger | none on element |
| [src/components/pages/ReportsPage.tsx:538](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/ReportsPage.tsx:538>) | Trends | parent/trigger | none on element |
| [src/components/pages/ReportsPage.tsx:539](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/ReportsPage.tsx:539>) | Ratios | parent/trigger | none on element |
| [src/components/pages/ReportsPage.tsx:634](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/ReportsPage.tsx:634>) | Export | {() => exportModuleToSheet("YoY_Summary", yoy)} | none on element |

### Validation / persistence / feedback call sites

| Source | Call | Arguments (source expression) |
| --- | --- | --- |
| [src/components/pages/ReportsPage.tsx:65](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/ReportsPage.tsx:65>) | useCloudAppStore | (s) => s.effectiveFeatures |
| [src/components/pages/ReportsPage.tsx:637](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/ReportsPage.tsx:637>) | exportModuleToSheet | "YoY_Summary", yoy |

## Suggestions: /suggestions

| Audit dimension | Observed implementation / assessment |
| --- | --- |
| 1-4 Identity, group, purpose, status | Insights. Rule-based prioritized finance recommendations. Implemented for current personal/platform scope, partial against the agency brief; page state audited. |
| 5 Source | [src/components/pages/SuggestionsPage.tsx](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/SuggestionsPage.tsx>) |
| 6-8 Data source, APIs, stores | Zustand plus repositories; generic /api/data/entity.php and entity-item.php where cloud-mapped. Source selectors: status, expiresAt, severity, suggestionType, calculationInputsJson, refreshOne, accounts, cards, loans, emis, goals, budgets, udhari, recurringRules, categories, transactions, ledgerEvents, ledgerEffects, aiSuggestions, id, title, reason, aiExplanation, recommendedAction. Exact imports below. |
| 9-10 UI sections and forms | "Suggestion center"; Educational guidance; {SECTION_LABEL[key]}; {SECTION_LABEL.history}; Persona-aware money coach {coach.persona.secondary ? ( <Badge variant="secondary">Also watch: {PERSONA_LABELS[coach.persona.secondary]}</Badge> ) : null}; Top 3 actions today; {item.title}; {s.title} |
| 11-12 Available actions and behavior | 7 source action definitions. Apply/dismiss/history and optional AI explanation; no external model call was made. Full handler/disabled/visibility inventory is linked below. |
| 13 Form fields | 1 field/control declarations in this file. Exact labels, binding props and validation hooks listed below; child dialog declarations are in the global inventory. |
| 14 Validation | Inline checks and/or delegated dialog validation. Frontend validation is not authoritative; backend transaction validation is stronger than other collection schemas (B14/B37). |
| 15 Empty state | Empty/no-data branches or delegated empty-state components exist. Fresh-user/seeded data were used, not every table empty condition. |
| 16 Loading state | Loading/busy state references exist; exact disabled bindings in action inventory. Slow-network/failure injection was selective, not every control. |
| 17 Error state | Error/validation handling references exist. Repository fallback can turn server rejection into apparent success (B01); presence of toast code is not proof of correct failure semantics. |
| 18 Role permissions | Active user owns the dataset. Plan/feature gates may hide controls; generic writes are constrained to the authenticated tenant, not agency roles. |
| 19 PIN requirement | PIN-related control/reference appears; use API and security report for which sensitive action is actually reauthenticated. |
| 20 Audit creation | No direct page audit writer found; repository/server helpers may log some operations. No complete per-action audit proof. |
| 21 Mobile behavior | 10 widths sampled; maximum root overflow 0px. This is layout screening, not every dialog/table state. |
| 22 Bugs found | B01, B14 |
| 23 Missing features | Deterministic suggestions and optional external explanation endpoint; not an autonomous agency finance assistant. |
| 24 Suggested improvements | Resolve listed integrity/security defects first; then add typed contracts, explicit failure states and complete mobile/action coverage before agency expansion. |
| 25 Existing test coverage | Authenticated route rendered in custom browser audit. Textually related test files: tests/local-phase-09-ui-browser-e2e.mjs. These references are candidates, not measured branch coverage. |
| 26 Missing test coverage | Every enabled/disabled action, negative field, cancel/PIN failure, server error, reload persistence, role matrix and populated large-data state has not been executed. Add these to the release matrix, including child dialogs. |

### Data and service wiring

| Import | Bindings |
| --- | --- |
| @/store/dataStore | { useDataStore } |
| @/store/authStore | { useAuthStore } |
| @/repositories | { aiSuggestionRepo } |
| @/store/uiStore | { useUIStore } |
| @/services/suggestionSync | {   appendSuggestionHistory,   buildSuggestionEngineInput,   historyTypeForStatus,   syncSuggestionsForUser, } |
| @/services/suggestionAiExplain | { explainSuggestionInSimpleLanguage } |
| @/services/personaEngine | {   buildPersonaCoachSurfaces,   buildPersonaSignals,   inferPersona,   PERSONA_LABELS,   type CoachMessage,   type Persona, } |

### Fields and controls

| Source | Control | Label / props |
| --- | --- | --- |
| [src/components/pages/SuggestionsPage.tsx:414](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/SuggestionsPage.tsx:414>) | Select | {"value":"{personaMode}","onValueChange":"{(value) => onPersonaModeChange(value as Persona \| \"auto\")}"} |

### Action trace

| Source | Label | Handler | Disabled |
| --- | --- | --- | --- |
| [src/components/pages/SuggestionsPage.tsx:308](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/SuggestionsPage.tsx:308>) | {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Refresh | {() => void runSync()} | {syncing \|\| !user} |
| [src/components/pages/SuggestionsPage.tsx:572](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/SuggestionsPage.tsx:572>) | Useful | {onUseful} | none on element |
| [src/components/pages/SuggestionsPage.tsx:575](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/SuggestionsPage.tsx:575>) | Dismiss | {onDismiss} | none on element |
| [src/components/pages/SuggestionsPage.tsx:578](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/SuggestionsPage.tsx:578>) | Not useful | {onNotUseful} | none on element |
| [src/components/pages/SuggestionsPage.tsx:581](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/SuggestionsPage.tsx:581>) | Remind later | {onLater} | none on element |
| [src/components/pages/SuggestionsPage.tsx:584](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/SuggestionsPage.tsx:584>) | Action taken | {onAction} | none on element |
| [src/components/pages/SuggestionsPage.tsx:587](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/SuggestionsPage.tsx:587>) | {aiBusy ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Wrench className="mr-1 h-3.5 w-3.5" />} Simplify wording | {onAi} | {aiBusy} |

### Validation / persistence / feedback call sites

| Source | Call | Arguments (source expression) |
| --- | --- | --- |
| [src/components/pages/SuggestionsPage.tsx:213](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/SuggestionsPage.tsx:213>) | toast | { title: "Suggestions refreshed", description: `Created ${r.created}, updated ${r.updated}, expired ${r.expired}.`, kind: "success", } |
| [src/components/pages/SuggestionsPage.tsx:220](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/SuggestionsPage.tsx:220>) | toast | { title: "Could not refresh suggestions", kind: "error" } |
| [src/components/pages/SuggestionsPage.tsx:250](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/SuggestionsPage.tsx:250>) | aiSuggestionRepo.update | s.id, { status, remindAt: remindAt ?? null, historyJson: appendSuggestionHistory(s, historyTypeForStatus(status)), } as Partial<AiSuggestion> |
| [src/components/pages/SuggestionsPage.tsx:260](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/SuggestionsPage.tsx:260>) | aiSuggestionRepo.update | s.id, { historyJson: appendSuggestionHistory(s, "viewed"), } as Partial<AiSuggestion> |
| [src/components/pages/SuggestionsPage.tsx:278](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/SuggestionsPage.tsx:278>) | toast | { title: "Plain-language AI not configured", description: "Set VITE_SUGGESTION_EXPLAIN_URL to a trusted rewrite endpoint.", kind: "info", } |
| [src/components/pages/SuggestionsPage.tsx:285](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/SuggestionsPage.tsx:285>) | aiSuggestionRepo.update | s.id, { aiExplanation: text } as Partial<AiSuggestion> |

## Export: /export

| Audit dimension | Observed implementation / assessment |
| --- | --- |
| 1-4 Identity, group, purpose, status | Data. Module exports, CA workbook and full profile backup. Implemented for current personal/platform scope, partial against the agency brief; page state audited. |
| 5 Source | [src/components/pages/ExportPage.tsx](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/ExportPage.tsx>) |
| 6-8 Data source, APIs, stores | Zustand plus repositories; generic /api/data/entity.php and entity-item.php where cloud-mapped. Source selectors: categories, accounts, cards, budgets, goals, goalContribs, loans, emis, udhari, investments, savingsContribs, ledgerEvents, ledgerEffects, transactions, settings, udhariSettlements, reminders, recurringRules, exportHistory. Exact imports below. |
| 9-10 UI sections and forms | "Export Center"; "Export Center"; Export options; CA Workbook; Full Backup; Recent exports; Confirm full export; {title} |
| 11-12 Available actions and behavior | 5 source action definitions. Actual XLSX downloaded and parsed; date filter/context, numeric cells, split and backup defects reproduced. Full handler/disabled/visibility inventory is linked below. |
| 13 Form fields | 8 field/control declarations in this file. Exact labels, binding props and validation hooks listed below; child dialog declarations are in the global inventory. |
| 14 Validation | Inline checks and/or delegated dialog validation. Frontend validation is not authoritative; backend transaction validation is stronger than other collection schemas (B14/B37). |
| 15 Empty state | Empty/no-data branches or delegated empty-state components exist. Fresh-user/seeded data were used, not every table empty condition. |
| 16 Loading state | Loading/busy state references exist; exact disabled bindings in action inventory. Slow-network/failure injection was selective, not every control. |
| 17 Error state | Error/validation handling references exist. Repository fallback can turn server rejection into apparent success (B01); presence of toast code is not proof of correct failure semantics. |
| 18 Role permissions | Active user owns the dataset. Plan/feature gates may hide controls; generic writes are constrained to the authenticated tenant, not agency roles. |
| 19 PIN requirement | PIN-related control/reference appears; use API and security report for which sensitive action is actually reauthenticated. |
| 20 Audit creation | Client audit/export-history references appear; these are not the separate append-only server log. |
| 21 Mobile behavior | 10 widths sampled; maximum root overflow 0px. This is layout screening, not every dialog/table state. |
| 22 Bugs found | B15, B16, B20, B21, B22, B23, B24, B35 |
| 23 Missing features | GST/bill flags and export sheet; no tax computation, input credit, return ledger or payment proof. Client-generated Excel/CSV/JSON and history; no signed CA pack/wizard/document ZIP. |
| 24 Suggested improvements | Resolve listed integrity/security defects first; then add typed contracts, explicit failure states and complete mobile/action coverage before agency expansion. |
| 25 Existing test coverage | Authenticated route rendered in custom browser audit. Textually related test files: tests/local-phase-09-ui-browser-e2e.mjs. These references are candidates, not measured branch coverage. |
| 26 Missing test coverage | Every enabled/disabled action, negative field, cancel/PIN failure, server error, reload persistence, role matrix and populated large-data state has not been executed. Add these to the release matrix, including child dialogs. |

### Data and service wiring

| Import | Bindings |
| --- | --- |
| @/store/dataStore | { useDataStore } |
| @/store/authStore | { useAuthStore } |
| @/store/uiStore | { useUIStore } |
| @/exports/xlsxExporter | {   buildCAWorkbook,   downloadBuffer,   exportModuleToSheet,   mapTransactionRow, } |
| @/repositories | { exportHistoryRepo } |
| @/store/cloudAppStore | { useCloudAppStore } |
| @/lib/cloud/client | { cloudLogin } |
| @/services/exportSafety | { buildUserOwnedFullExportPayload } |

### Fields and controls

| Source | Control | Label / props |
| --- | --- | --- |
| [src/components/pages/ExportPage.tsx:228](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/ExportPage.tsx:228>) | Field | {"label":"\"From\""} |
| [src/components/pages/ExportPage.tsx:229](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/ExportPage.tsx:229>) | Input | {"type":"\"date\"","value":"{from}","onChange":"{(e) => setFrom(e.target.value)}"} |
| [src/components/pages/ExportPage.tsx:231](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/ExportPage.tsx:231>) | Field | {"label":"\"To\""} |
| [src/components/pages/ExportPage.tsx:232](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/ExportPage.tsx:232>) | Input | {"type":"\"date\"","value":"{to}","onChange":"{(e) => setTo(e.target.value)}"} |
| [src/components/pages/ExportPage.tsx:234](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/ExportPage.tsx:234>) | Field | {"label":"\"Format\""} |
| [src/components/pages/ExportPage.tsx:235](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/ExportPage.tsx:235>) | Select | {"value":"{format}","onValueChange":"{(v) => setFormat(v as \"xlsx\" \| \"csv\" \| \"json\")}"} |
| [src/components/pages/ExportPage.tsx:487](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/ExportPage.tsx:487>) | Field | {"label":"\"PIN\""} |
| [src/components/pages/ExportPage.tsx:488](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/ExportPage.tsx:488>) | Input | {"type":"\"password\"","value":"{backupPin}","onChange":"{(e) => setBackupPin(e.target.value)}","placeholder":"\"Enter PIN\""} |

### Action trace

| Source | Label | Handler | Disabled |
| --- | --- | --- | --- |
| [src/components/pages/ExportPage.tsx:274](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/ExportPage.tsx:274>) | Download CA Workbook | {caExport} | none on element |
| [src/components/pages/ExportPage.tsx:439](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/ExportPage.tsx:439>) | Download Backup | {requestFullBackup} | none on element |
| [src/components/pages/ExportPage.tsx:496](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/ExportPage.tsx:496>) | Cancel | {() => setBackupPinOpen(false)} | none on element |
| [src/components/pages/ExportPage.tsx:499](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/ExportPage.tsx:499>) | Confirm export | {confirmFullBackup} | {!backupPin} |
| [src/components/pages/ExportPage.tsx:536](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/ExportPage.tsx:536>) | Export | {onExport} | none on element |

### Validation / persistence / feedback call sites

| Source | Call | Arguments (source expression) |
| --- | --- | --- |
| [src/components/pages/ExportPage.tsx:61](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/ExportPage.tsx:61>) | useCloudAppStore | (s) => s.effectiveFeatures |
| [src/components/pages/ExportPage.tsx:73](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/ExportPage.tsx:73>) | exportHistoryRepo.create | { userId: user.id, data: { scope, format: format === "json" ? "json" : format, fileName, rowCount: rows, fromDate: from \|\| undefined, toDate: to \|\| undefined, }, } |
| [src/components/pages/ExportPage.tsx:88](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/ExportPage.tsx:88>) | setExporting | "ca" |
| [src/components/pages/ExportPage.tsx:109](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/ExportPage.tsx:109>) | logExport | "ca_workbook", filename, data.transactions.length |
| [src/components/pages/ExportPage.tsx:110](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/ExportPage.tsx:110>) | toast | { title: "CA workbook downloaded", kind: "success" } |
| [src/components/pages/ExportPage.tsx:111](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/ExportPage.tsx:111>) | setExporting | null |
| [src/components/pages/ExportPage.tsx:132](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/ExportPage.tsx:132>) | setExporting | scope |
| [src/components/pages/ExportPage.tsx:149](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/ExportPage.tsx:149>) | exportModuleToSheet | label, rows, format |
| [src/components/pages/ExportPage.tsx:151](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/ExportPage.tsx:151>) | logExport | scope, fileName, rows.length |
| [src/components/pages/ExportPage.tsx:152](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/ExportPage.tsx:152>) | toast | { title: `${label} exported`, kind: "success" } |
| [src/components/pages/ExportPage.tsx:154](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/ExportPage.tsx:154>) | toast | { title: e instanceof Error ? e.message : "Export failed", kind: "error", } |
| [src/components/pages/ExportPage.tsx:159](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/ExportPage.tsx:159>) | setExporting | null |
| [src/components/pages/ExportPage.tsx:171](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/ExportPage.tsx:171>) | setExporting | "backup" |
| [src/components/pages/ExportPage.tsx:173](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/ExportPage.tsx:173>) | cloudLogin | { username: user.username, pin: backupPin } |
| [src/components/pages/ExportPage.tsx:175](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/ExportPage.tsx:175>) | buildUserOwnedFullExportPayload | user, { settings: data.settings, accounts: data.accounts, cards: data.cards, categories: data.categories, transactions: data.transactions, budgets: data.budgets, goals: data.goals, goalContribs: data.goalContribs, loans: data.loans, emis: data.emis, udhari: data.udhari, udhariSettlements: data.udhariSettlements, investments: data.investments, savingsCont |
| [src/components/pages/ExportPage.tsx:202](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/ExportPage.tsx:202>) | logExport | "full_backup", a.download, data.transactions.length |
| [src/components/pages/ExportPage.tsx:203](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/ExportPage.tsx:203>) | toast | { title: "Backup ready", description: "Keep the JSON file safe.", kind: "success" } |
| [src/components/pages/ExportPage.tsx:205](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/ExportPage.tsx:205>) | toast | { title: e instanceof Error ? e.message : "PIN verification failed", kind: "error", } |
| [src/components/pages/ExportPage.tsx:210](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/ExportPage.tsx:210>) | setExporting | null |
| [src/components/pages/ExportPage.tsx:289](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/ExportPage.tsx:289>) | quickExport | "transactions", "Transactions", () => filterTx().map((t) => mapTransactionRow(t, { categories: data.categories, accounts: data.accounts, cards: data.cards, }), ) |
| [src/components/pages/ExportPage.tsx:307](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/ExportPage.tsx:307>) | quickExport | "accounts", "Accounts", () => data.accounts.map((a) => ({ Name: a.name, Type: a.type, Institution: a.institution ?? "", OpeningBalance: a.openingBalance, Inactive: a.isInactive ? "Yes" : "No", })) |
| [src/components/pages/ExportPage.tsx:325](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/ExportPage.tsx:325>) | quickExport | "cards", "Cards", () => data.cards.map((c) => ({ Nickname: c.nickname, Bank: c.bank, Type: c.type, Last4: c.last4, CreditLimit: c.creditLimit ?? "", StatementDay: c.statementDay ?? "", DueDay: c.dueDay ?? "", })) |
| [src/components/pages/ExportPage.tsx:345](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/ExportPage.tsx:345>) | quickExport | "loans", "Loans", () => data.loans.map((l) => ({ Lender: l.lender, Type: l.loanType, Principal: l.principal, Tenure: l.tenureMonths, Rate: l.annualInterestRate, DueDay: l.emiDueDay, StartDate: l.startDate.slice(0, 10), Status: l.status, })) |
| [src/components/pages/ExportPage.tsx:366](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/ExportPage.tsx:366>) | quickExport | "udhari", "Udhari", () => data.udhari.map((u) => ({ Person: u.personName, Phone: u.phone ?? "", Type: u.type, Amount: u.amount, Settled: u.amountSettled, Remaining: u.amount - u.amountSettled, Status: u.status, Given: u.givenDate.slice(0, 10), Due: u.dueDate?.slice(0, 10) ?? "", })) |
| [src/components/pages/ExportPage.tsx:388](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/ExportPage.tsx:388>) | quickExport | "goals", "Goals", () => data.goals.map((g) => ({ Title: g.title, Type: g.goalType, TargetAmount: g.targetAmount, CurrentSaved: g.currentSaved, TargetDate: g.targetDate.slice(0, 10), Status: g.status, })) |
| [src/components/pages/ExportPage.tsx:407](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/ExportPage.tsx:407>) | quickExport | "investments", "Investments", () => data.investments.map((i) => ({ Name: i.name, Type: i.type, MonthlyTarget: i.monthlyTarget, TotalContributed: i.totalContributed, Start: i.startDate.slice(0, 10), Maturity: i.maturityDate?.slice(0, 10) ?? "", Status: i.status, })) |
| [src/components/pages/ExportPage.tsx:458](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/ExportPage.tsx:458>) | data.exportHistory.slice(0, 10).map | (e) => ( <div key={e.id} className="flex items-center justify-between py-2 text-sm" > <div> <div className="font-medium">{e.fileName}</div> <div className="text-xs text-muted-foreground"> {e.scope} · {e.format} · {e.rowCount} rows </div> </div> <div className="text-xs text-muted-foreground"> {formatDate(e.createdAt)} </div> </div> ) |
| [src/components/pages/ExportPage.tsx:458](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/ExportPage.tsx:458>) | data.exportHistory.slice | 0, 10 |

## Import: /import

| Audit dimension | Observed implementation / assessment |
| --- | --- |
| 1-4 Identity, group, purpose, status | Data. Spreadsheet/CSV/JSON import, preview and repair. Implemented for current personal/platform scope, partial against the agency brief; page state audited. |
| 5 Source | [src/components/pages/ImportPage.tsx](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/ImportPage.tsx>) |
| 6-8 Data source, APIs, stores | Zustand plus repositories; generic /api/data/entity.php and entity-item.php where cloud-mapped. Source selectors: categories, accounts, cards, loans, udhari, transactions, goals, investments, ledgerEvents, ledgerEffects, refreshOne, includes. Exact imports below. |
| 9-10 UI sections and forms | "Import Center"; Import transactions; Restore backup; Repair Center; Confirm backup restore |
| 11-12 Available actions and behavior | 9 source action definitions. Local file parse, mapping/validation and repository writes; actual restore UI breaks linked account/category references. Full handler/disabled/visibility inventory is linked below. |
| 13 Form fields | 6 field/control declarations in this file. Exact labels, binding props and validation hooks listed below; child dialog declarations are in the global inventory. |
| 14 Validation | Inline checks and/or delegated dialog validation. Frontend validation is not authoritative; backend transaction validation is stronger than other collection schemas (B14/B37). |
| 15 Empty state | Empty/no-data branches or delegated empty-state components exist. Fresh-user/seeded data were used, not every table empty condition. |
| 16 Loading state | Loading/busy state references exist; exact disabled bindings in action inventory. Slow-network/failure injection was selective, not every control. |
| 17 Error state | Error/validation handling references exist. Repository fallback can turn server rejection into apparent success (B01); presence of toast code is not proof of correct failure semantics. |
| 18 Role permissions | Active user owns the dataset. Plan/feature gates may hide controls; generic writes are constrained to the authenticated tenant, not agency roles. |
| 19 PIN requirement | PIN-related control/reference appears; use API and security report for which sensitive action is actually reauthenticated. |
| 20 Audit creation | Client audit/export-history references appear; these are not the separate append-only server log. |
| 21 Mobile behavior | 10 widths sampled; maximum root overflow 0px. This is layout screening, not every dialog/table state. |
| 22 Bugs found | B01, B03, B14, B15, B25, B38 |
| 23 Missing features | No agency lifecycle/role/close-period equivalence is implied by this personal-finance view. |
| 24 Suggested improvements | Resolve listed integrity/security defects first; then add typed contracts, explicit failure states and complete mobile/action coverage before agency expansion. |
| 25 Existing test coverage | Authenticated route rendered in custom browser audit. Textually related test files: tests/local-phase-09-ui-browser-e2e.mjs. These references are candidates, not measured branch coverage. |
| 26 Missing test coverage | Every enabled/disabled action, negative field, cancel/PIN failure, server error, reload persistence, role matrix and populated large-data state has not been executed. Add these to the release matrix, including child dialogs. |

### Data and service wiring

| Import | Bindings |
| --- | --- |
| @/store/dataStore | { useDataStore } |
| @/store/authStore | { useAuthStore } |
| @/repositories | { auditRepo, transactionRepo } |
| @/store/uiStore | { useUIStore } |
| @/exports/xlsxExporter | { exportModuleToSheet } |
| @/services/importExportRepair | {   buildImportPreview,   buildDataRepairQueue,   createImportBatchRecord,   buildImportRollbackPlan,   type ImportMapping,   type ImportBatchRecord,   type DataRepairQueue, } |

### Fields and controls

| Source | Control | Label / props |
| --- | --- | --- |
| [src/components/pages/ImportPage.tsx:564](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/ImportPage.tsx:564>) | input | {"ref":"{fileInput}","type":"\"file\"","accept":"\".xlsx,.xls,.csv\"","className":"\"hidden\"","onChange":"{(e) => {\n                    const f = e.target.files?.[0];\n                    if (f) handleFile(f);\n                  }}"} |
| [src/components/pages/ImportPage.tsx:604](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/ImportPage.tsx:604>) | Field | {"key":"{tf.key}","label":"{tf.label + (tf.required ? \" *\" : \"\")}"} |
| [src/components/pages/ImportPage.tsx:608](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/ImportPage.tsx:608>) | Select | {"value":"{mapping[tf.key] ?? \"none\"}","onValueChange":"{(v) =>\n                          setMapping({\n                            ...mapping,\n                            [tf.key]: v === \"none\" ? undefined : v,\n                          })\n                        }"} |
| [src/components/pages/ImportPage.tsx:673](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/ImportPage.tsx:673>) | Field | {"label":"\"Duplicates\""} |
| [src/components/pages/ImportPage.tsx:674](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/ImportPage.tsx:674>) | Select | {"value":"{duplicateMode}","onValueChange":"{(v) => setDuplicateMode(v as \"skip\" \| \"allow\")}"} |
| [src/components/pages/ImportPage.tsx:757](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/ImportPage.tsx:757>) | input | {"ref":"{restoreInput}","type":"\"file\"","accept":"\".json\"","className":"\"hidden\"","onChange":"{(e) => {\n                const f = e.target.files?.[0];\n                if (f) handleRestoreFile(f);\n              }}"} |

### Action trace

| Source | Label | Handler | Disabled |
| --- | --- | --- | --- |
| [src/components/pages/ImportPage.tsx:541](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/ImportPage.tsx:541>) | Template | {downloadTemplate} | none on element |
| [src/components/pages/ImportPage.tsx:555](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/ImportPage.tsx:555>) | (icon/dynamic) | {() => fileInput.current?.click()} | none on element |
| [src/components/pages/ImportPage.tsx:590](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/ImportPage.tsx:590>) | Reset | {() => {                       setRows([]);                       setHeaders([]);                       setMapping({});                     }} | none on element |
| [src/components/pages/ImportPage.tsx:688](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/ImportPage.tsx:688>) | Import {valid} rows | {performImport} | {valid === 0} |
| [src/components/pages/ImportPage.tsx:750](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/ImportPage.tsx:750>) | Select backup file | {() => restoreInput.current?.click()} | none on element |
| [src/components/pages/ImportPage.tsx:777](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/ImportPage.tsx:777>) | Download template | {downloadTemplate} | none on element |
| [src/components/pages/ImportPage.tsx:800](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/ImportPage.tsx:800>) | Rollback last import | {rollbackLastImport} | none on element |
| [src/components/pages/ImportPage.tsx:818](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/ImportPage.tsx:818>) | Cancel | {() => {                 setRestoreConfirmOpen(false);                 setPendingRestoreFile(null);               }} | none on element |
| [src/components/pages/ImportPage.tsx:827](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/ImportPage.tsx:827>) | Continue restore | {confirmRestore} | none on element |

### Validation / persistence / feedback call sites

| Source | Call | Arguments (source expression) |
| --- | --- | --- |
| [src/components/pages/ImportPage.tsx:148](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/ImportPage.tsx:148>) | toast | { title: "Empty file", kind: "warning" } |
| [src/components/pages/ImportPage.tsx:179](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/ImportPage.tsx:179>) | toast | { title: "Mapping incomplete", description: "Date, Type, and Amount are required", kind: "warning", } |
| [src/components/pages/ImportPage.tsx:291](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/ImportPage.tsx:291>) | transactionRepo.create | { userId: user.id, data: row as unknown as Transaction, } |
| [src/components/pages/ImportPage.tsx:300](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/ImportPage.tsx:300>) | auditRepo.create | { userId: user.id, data: { action: "import", entity: "import_batch", entityId: importBatchId, detail: JSON.stringify({ rowCount: rows.length, imported, skipped, duplicateMode, }), }, } |
| [src/components/pages/ImportPage.tsx:331](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/ImportPage.tsx:331>) | toast | { title: "Import complete", description: `Imported ${imported}, skipped ${skipped}`, kind: imported > 0 ? "success" : "warning", } |
| [src/components/pages/ImportPage.tsx:337](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/ImportPage.tsx:337>) | toast | { title: e instanceof Error ? e.message : "Import failed", kind: "error", } |
| [src/components/pages/ImportPage.tsx:352](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/ImportPage.tsx:352>) | transactionRepo.softDelete | id |
| [src/components/pages/ImportPage.tsx:355](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/ImportPage.tsx:355>) | auditRepo.create | { userId: user.id, data: { action: "soft_delete", entity: "import_batch", entityId: lastImportBatch.importBatchId, detail: JSON.stringify(plan), }, } |
| [src/components/pages/ImportPage.tsx:364](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/ImportPage.tsx:364>) | toast | { title: "Import rolled back", description: `${plan.transactionIdsToSoftDelete.length} imported transactions were soft-deleted.`, kind: "success", } |
| [src/components/pages/ImportPage.tsx:371](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/ImportPage.tsx:371>) | toast | { title: e instanceof Error ? e.message : "Rollback failed", kind: "error", } |
| [src/components/pages/ImportPage.tsx:381](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/ImportPage.tsx:381>) | exportModuleToSheet | "Transactions_Template", [ { Date: "2026-04-01", Type: "expense", Amount: 1200, Category: "Groceries", Account: "HDFC Savings", Description: "Monthly groceries", MerchantOrPerson: "BigBasket", PaymentMode: "UPI", Notes: "", TaxFlag: "No", GSTFlag: "No", BillAvailable: "Yes", }, ] |
| [src/components/pages/ImportPage.tsx:405](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/ImportPage.tsx:405>) | setRestoreConfirmOpen | true |
| [src/components/pages/ImportPage.tsx:411](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/ImportPage.tsx:411>) | setRestoreConfirmOpen | false |
| [src/components/pages/ImportPage.tsx:493](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/ImportPage.tsx:493>) | repo.create | { userId: user!.id, data: rest as unknown as T, } |
| [src/components/pages/ImportPage.tsx:521](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/ImportPage.tsx:521>) | toast | { title: "Backup restored", description: `${merged} merged, ${skipped} skipped (${total} in file)`, kind: merged > 0 ? "success" : "warning", } |
| [src/components/pages/ImportPage.tsx:528](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/ImportPage.tsx:528>) | toast | { title: "Invalid backup file", kind: "error" } |
| [src/components/pages/ImportPage.tsx:821](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/ImportPage.tsx:821>) | setRestoreConfirmOpen | false |

## BillCalendar: /bills

| Audit dimension | Observed implementation / assessment |
| --- | --- |
| 1-4 Identity, group, purpose, status | Planning. Upcoming bills and recurring obligations. Implemented for current personal/platform scope, partial against the agency brief; page state audited. |
| 5 Source | [src/components/pages/BillCalendarPage.tsx](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/BillCalendarPage.tsx>) |
| 6-8 Data source, APIs, stores | Zustand plus repositories; generic /api/data/entity.php and entity-item.php where cloud-mapped. Source selectors: recurringRules, loans, emis. Exact imports below. |
| 9-10 UI sections and forms | "Bill calendar"; Next 7 days; Next 30 days; Upcoming |
| 11-12 Available actions and behavior | 0 source action definitions. Read/derive and obligation interactions; not a durable scheduler or bank autopay. Full handler/disabled/visibility inventory is linked below. |
| 13 Form fields | 0 field/control declarations in this file. Exact labels, binding props and validation hooks listed below; child dialog declarations are in the global inventory. |
| 14 Validation | Inline checks and/or delegated dialog validation. Frontend validation is not authoritative; backend transaction validation is stronger than other collection schemas (B14/B37). |
| 15 Empty state | Empty/no-data branches or delegated empty-state components exist. Fresh-user/seeded data were used, not every table empty condition. |
| 16 Loading state | No explicit loading/busy declaration in this page; shared shell may load data. Slow-network/failure injection was selective, not every control. |
| 17 Error state | No explicit per-page error handling located. Repository fallback can turn server rejection into apparent success (B01); presence of toast code is not proof of correct failure semantics. |
| 18 Role permissions | Active user owns the dataset. Plan/feature gates may hide controls; generic writes are constrained to the authenticated tenant, not agency roles. |
| 19 PIN requirement | No independent action PIN found in this page. Normal authentication is not a per-action authorization challenge. |
| 20 Audit creation | No direct page audit writer found; repository/server helpers may log some operations. No complete per-action audit proof. |
| 21 Mobile behavior | 10 widths sampled; maximum root overflow 0px. This is layout screening, not every dialog/table state. |
| 22 Bugs found | B01, B14 |
| 23 Missing features | No agency lifecycle/role/close-period equivalence is implied by this personal-finance view. |
| 24 Suggested improvements | Resolve listed integrity/security defects first; then add typed contracts, explicit failure states and complete mobile/action coverage before agency expansion. |
| 25 Existing test coverage | Authenticated route rendered in custom browser audit. Textually related test files: No direct page-name/route test reference found. These references are candidates, not measured branch coverage. |
| 26 Missing test coverage | Every enabled/disabled action, negative field, cancel/PIN failure, server error, reload persistence, role matrix and populated large-data state has not been executed. Add these to the release matrix, including child dialogs. |

### Data and service wiring

| Import | Bindings |
| --- | --- |
| @/store/dataStore | { useDataStore } |
| @/store/authStore | { useAuthStore } |
| @/services/obligationEngine | {   materializeLoanEmiObligations,   materializeRecurringObligations,   mergeObligationsUnique,   obligationCalendarSummary, } |

### Fields and controls

| Source | Control | Label / props |
| --- | --- | --- |


### Action trace

| Source | Label | Handler | Disabled |
| --- | --- | --- | --- |


### Validation / persistence / feedback call sites

| Source | Call | Arguments (source expression) |
| --- | --- | --- |


## Reconciliation: /reconciliation

| Audit dimension | Observed implementation / assessment |
| --- | --- |
| 1-4 Identity, group, purpose, status | Data. Match/import and finance reconciliation helpers. Implemented for current personal/platform scope, partial against the agency brief; page state audited. |
| 5 Source | [src/components/pages/ReconciliationPage.tsx](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/ReconciliationPage.tsx>) |
| 6-8 Data source, APIs, stores | Zustand plus repositories; generic /api/data/entity.php and entity-item.php where cloud-mapped. Source selectors: transactions, accounts, id, label. Exact imports below. |
| 9-10 UI sections and forms | "Reconciliation"; Orphan transactions; Transfer match suggestions; Accounts |
| 11-12 Available actions and behavior | 2 source action definitions. Reconciliation records exist; independent evidence and final accounting signoff not complete. Full handler/disabled/visibility inventory is linked below. |
| 13 Form fields | 0 field/control declarations in this file. Exact labels, binding props and validation hooks listed below; child dialog declarations are in the global inventory. |
| 14 Validation | Inline checks and/or delegated dialog validation. Frontend validation is not authoritative; backend transaction validation is stronger than other collection schemas (B14/B37). |
| 15 Empty state | Empty/no-data branches or delegated empty-state components exist. Fresh-user/seeded data were used, not every table empty condition. |
| 16 Loading state | No explicit loading/busy declaration in this page; shared shell may load data. Slow-network/failure injection was selective, not every control. |
| 17 Error state | No explicit per-page error handling located. Repository fallback can turn server rejection into apparent success (B01); presence of toast code is not proof of correct failure semantics. |
| 18 Role permissions | Active user owns the dataset. Plan/feature gates may hide controls; generic writes are constrained to the authenticated tenant, not agency roles. |
| 19 PIN requirement | No independent action PIN found in this page. Normal authentication is not a per-action authorization challenge. |
| 20 Audit creation | No direct page audit writer found; repository/server helpers may log some operations. No complete per-action audit proof. |
| 21 Mobile behavior | 10 widths sampled; maximum root overflow 0px. This is layout screening, not every dialog/table state. |
| 22 Bugs found | B01, B14, B23 |
| 23 Missing features | No agency lifecycle/role/close-period equivalence is implied by this personal-finance view. |
| 24 Suggested improvements | Resolve listed integrity/security defects first; then add typed contracts, explicit failure states and complete mobile/action coverage before agency expansion. |
| 25 Existing test coverage | Authenticated route rendered in custom browser audit. Textually related test files: No direct page-name/route test reference found. These references are candidates, not measured branch coverage. |
| 26 Missing test coverage | Every enabled/disabled action, negative field, cancel/PIN failure, server error, reload persistence, role matrix and populated large-data state has not been executed. Add these to the release matrix, including child dialogs. |

### Data and service wiring

| Import | Bindings |
| --- | --- |
| @/store/dataStore | { useDataStore } |
| @/store/navStore | { useNavStore } |
| @/store/uiStore | { useUIStore } |
| @/services/reconciliationEngine | { suggestTransferMatches, findOrphanTransactions } |

### Fields and controls

| Source | Control | Label / props |
| --- | --- | --- |


### Action trace

| Source | Label | Handler | Disabled |
| --- | --- | --- | --- |
| [src/components/pages/ReconciliationPage.tsx:41](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/ReconciliationPage.tsx:41>) | Open | {() => {                       setActive("transactions");                       toast({ title: "Opened Transactions — find this row by date/amount", kind: "info" });                     }} | none on element |
| [src/components/pages/ReconciliationPage.tsx:66](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/ReconciliationPage.tsx:66>) | Review | {() => {                     setActive("transactions");                     toast({                       title: "Review transfer pair in Transactions",                       description: s.label,                       kind: "info",                     });                   }} | none on element |

### Validation / persistence / feedback call sites

| Source | Call | Arguments (source expression) |
| --- | --- | --- |
| [src/components/pages/ReconciliationPage.tsx:46](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/ReconciliationPage.tsx:46>) | toast | { title: "Opened Transactions — find this row by date/amount", kind: "info" } |
| [src/components/pages/ReconciliationPage.tsx:71](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/ReconciliationPage.tsx:71>) | toast | { title: "Review transfer pair in Transactions", description: s.label, kind: "info", } |

## HouseholdDashboard: /household

| Audit dimension | Observed implementation / assessment |
| --- | --- |
| 1-4 Identity, group, purpose, status | Planning. Household members, permissions and shared obligations. Implemented for current personal/platform scope, partial against the agency brief; page state audited. |
| 5 Source | [src/components/pages/HouseholdDashboardPage.tsx](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/HouseholdDashboardPage.tsx>) |
| 6-8 Data source, APIs, stores | Zustand plus repositories; generic /api/data/entity.php and entity-item.php where cloud-mapped. Source selectors: transactions, ledgerEvents, ledgerEffects. Exact imports below. |
| 9-10 UI sections and forms | "Household dashboard"; Household income; Household expense; Operating surplus; Create household; {active.name} |
| 11-12 Available actions and behavior | 2 source action definitions. Record-level household UI; membership is not a verified cross-user invitation/agency authorization system. Full handler/disabled/visibility inventory is linked below. |
| 13 Form fields | 4 field/control declarations in this file. Exact labels, binding props and validation hooks listed below; child dialog declarations are in the global inventory. |
| 14 Validation | Inline checks and/or delegated dialog validation. Frontend validation is not authoritative; backend transaction validation is stronger than other collection schemas (B14/B37). |
| 15 Empty state | No explicit empty-state primitive found in this file; inspect children. Fresh-user/seeded data were used, not every table empty condition. |
| 16 Loading state | No explicit loading/busy declaration in this page; shared shell may load data. Slow-network/failure injection was selective, not every control. |
| 17 Error state | Error/validation handling references exist. Repository fallback can turn server rejection into apparent success (B01); presence of toast code is not proof of correct failure semantics. |
| 18 Role permissions | Active user owns the dataset. Plan/feature gates may hide controls; generic writes are constrained to the authenticated tenant, not agency roles. |
| 19 PIN requirement | No independent action PIN found in this page. Normal authentication is not a per-action authorization challenge. |
| 20 Audit creation | No direct page audit writer found; repository/server helpers may log some operations. No complete per-action audit proof. |
| 21 Mobile behavior | 10 widths sampled; maximum root overflow 0px. This is layout screening, not every dialog/table state. |
| 22 Bugs found | B01, B12, B14, B15 |
| 23 Missing features | No agency lifecycle/role/close-period equivalence is implied by this personal-finance view. |
| 24 Suggested improvements | Resolve listed integrity/security defects first; then add typed contracts, explicit failure states and complete mobile/action coverage before agency expansion. |
| 25 Existing test coverage | Authenticated route rendered in custom browser audit. Textually related test files: No direct page-name/route test reference found. These references are candidates, not measured branch coverage. |
| 26 Missing test coverage | Every enabled/disabled action, negative field, cancel/PIN failure, server error, reload persistence, role matrix and populated large-data state has not been executed. Add these to the release matrix, including child dialogs. |

### Data and service wiring

| Import | Bindings |
| --- | --- |
| @/store/dataStore | { useDataStore } |
| @/store/authStore | { useAuthStore } |
| @/store/uiStore | { useUIStore } |
| @/repositories | { householdMemberRepo, householdRepo } |
| @/services/financeKpiEngine | { calculateFinanceMonthKpis } |
| @/services/calculations | { filterByMonth } |

### Fields and controls

| Source | Control | Label / props |
| --- | --- | --- |
| [src/components/pages/HouseholdDashboardPage.tsx:129](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/HouseholdDashboardPage.tsx:129>) | Field | {"label":"\"Household name\"","className":"\"min-w-[200px] flex-1\""} |
| [src/components/pages/HouseholdDashboardPage.tsx:130](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/HouseholdDashboardPage.tsx:130>) | Input | {"value":"{name}","onChange":"{(e) => setName(e.target.value)}","placeholder":"\"Home\""} |
| [src/components/pages/HouseholdDashboardPage.tsx:157](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/HouseholdDashboardPage.tsx:157>) | Field | {"label":"\"Add partner / member\"","className":"\"min-w-[200px] flex-1\""} |
| [src/components/pages/HouseholdDashboardPage.tsx:158](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/HouseholdDashboardPage.tsx:158>) | Input | {"value":"{memberName}","onChange":"{(e) => setMemberName(e.target.value)}"} |

### Action trace

| Source | Label | Handler | Disabled |
| --- | --- | --- | --- |
| [src/components/pages/HouseholdDashboardPage.tsx:133](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/HouseholdDashboardPage.tsx:133>) | Create | {createHousehold} | none on element |
| [src/components/pages/HouseholdDashboardPage.tsx:161](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/HouseholdDashboardPage.tsx:161>) | Add member | {addMember} | none on element |

### Validation / persistence / feedback call sites

| Source | Call | Arguments (source expression) |
| --- | --- | --- |
| [src/components/pages/HouseholdDashboardPage.tsx:39](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/HouseholdDashboardPage.tsx:39>) | householdRepo.list | user.id |
| [src/components/pages/HouseholdDashboardPage.tsx:40](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/HouseholdDashboardPage.tsx:40>) | householdMemberRepo.list | user.id |
| [src/components/pages/HouseholdDashboardPage.tsx:52](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/HouseholdDashboardPage.tsx:52>) | toast | { title: "Enter a household name", kind: "error" } |
| [src/components/pages/HouseholdDashboardPage.tsx:56](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/HouseholdDashboardPage.tsx:56>) | householdRepo.create | { userId: user.id, data: { name: name.trim(), defaultCurrency: "INR" }, } |
| [src/components/pages/HouseholdDashboardPage.tsx:60](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/HouseholdDashboardPage.tsx:60>) | householdMemberRepo.create | { userId: user.id, data: { householdId: h.id, displayName: user.displayName \|\| user.username, role: "owner", }, } |
| [src/components/pages/HouseholdDashboardPage.tsx:69](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/HouseholdDashboardPage.tsx:69>) | toast | { title: "Household created", kind: "success" } |
| [src/components/pages/HouseholdDashboardPage.tsx:72](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/HouseholdDashboardPage.tsx:72>) | toast | { title: e instanceof Error ? e.message : "Could not create household", kind: "error" } |
| [src/components/pages/HouseholdDashboardPage.tsx:78](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/HouseholdDashboardPage.tsx:78>) | toast | { title: "Enter member display name", kind: "error" } |
| [src/components/pages/HouseholdDashboardPage.tsx:82](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/HouseholdDashboardPage.tsx:82>) | householdMemberRepo.create | { userId: user.id, data: { householdId: active.id, displayName: memberName.trim(), role: "partner", }, } |
| [src/components/pages/HouseholdDashboardPage.tsx:91](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/HouseholdDashboardPage.tsx:91>) | toast | { title: "Member added (partner)", kind: "success" } |
| [src/components/pages/HouseholdDashboardPage.tsx:94](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/HouseholdDashboardPage.tsx:94>) | toast | { title: e instanceof Error ? e.message : "Could not add member", kind: "error" } |

## Alerts: /alerts

| Audit dimension | Observed implementation / assessment |
| --- | --- |
| 1-4 Identity, group, purpose, status | Insights. Computed alerts and in-app notification state. Implemented for current personal/platform scope, partial against the agency brief; page state audited. |
| 5 Source | [src/components/pages/AlertsPage.tsx](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/AlertsPage.tsx>) |
| 6-8 Data source, APIs, stores | Zustand plus repositories; generic /api/data/entity.php and entity-item.php where cloud-mapped. Source selectors: alerts. Exact imports below. |
| 9-10 UI sections and forms | "Alerts Center"; {value} |
| 11-12 Available actions and behavior | 8 source action definitions. Read/dismiss/generate local reminders; no tested outbound notification provider. Full handler/disabled/visibility inventory is linked below. |
| 13 Form fields | 0 field/control declarations in this file. Exact labels, binding props and validation hooks listed below; child dialog declarations are in the global inventory. |
| 14 Validation | Inline checks and/or delegated dialog validation. Frontend validation is not authoritative; backend transaction validation is stronger than other collection schemas (B14/B37). |
| 15 Empty state | Empty/no-data branches or delegated empty-state components exist. Fresh-user/seeded data were used, not every table empty condition. |
| 16 Loading state | Loading/busy state references exist; exact disabled bindings in action inventory. Slow-network/failure injection was selective, not every control. |
| 17 Error state | No explicit per-page error handling located. Repository fallback can turn server rejection into apparent success (B01); presence of toast code is not proof of correct failure semantics. |
| 18 Role permissions | Active user owns the dataset. Plan/feature gates may hide controls; generic writes are constrained to the authenticated tenant, not agency roles. |
| 19 PIN requirement | No independent action PIN found in this page. Normal authentication is not a per-action authorization challenge. |
| 20 Audit creation | No direct page audit writer found; repository/server helpers may log some operations. No complete per-action audit proof. |
| 21 Mobile behavior | 10 widths sampled; maximum root overflow 0px. This is layout screening, not every dialog/table state. |
| 22 Bugs found | B01, B14 |
| 23 Missing features | In-app computed alerts/reminders; no verified email/SMS/push delivery service. |
| 24 Suggested improvements | Resolve listed integrity/security defects first; then add typed contracts, explicit failure states and complete mobile/action coverage before agency expansion. |
| 25 Existing test coverage | Authenticated route rendered in custom browser audit. Textually related test files: No direct page-name/route test reference found. These references are candidates, not measured branch coverage. |
| 26 Missing test coverage | Every enabled/disabled action, negative field, cancel/PIN failure, server error, reload persistence, role matrix and populated large-data state has not been executed. Add these to the release matrix, including child dialogs. |

### Data and service wiring

| Import | Bindings |
| --- | --- |
| @/store/dataStore | { useDataStore } |
| @/store/authStore | { useAuthStore } |
| @/repositories | { alertRepo } |
| @/store/uiStore | { useUIStore } |
| @/services/alertsEngine | { runAlertEngine } |
| @/store/navStore | { useNavStore } |

### Fields and controls

| Source | Control | Label / props |
| --- | --- | --- |


### Action trace

| Source | Label | Handler | Disabled |
| --- | --- | --- | --- |
| [src/components/pages/AlertsPage.tsx:79](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/AlertsPage.tsx:79>) | Refresh | {rerun} | none on element |
| [src/components/pages/AlertsPage.tsx:83](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/AlertsPage.tsx:83>) | Dismiss all | {dismissAll} | none on element |
| [src/components/pages/AlertsPage.tsx:100](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/AlertsPage.tsx:100>) | Active ( {active.length} ) | parent/trigger | none on element |
| [src/components/pages/AlertsPage.tsx:101](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/AlertsPage.tsx:101>) | Dismissed ( {dismissed.length} ) | parent/trigger | none on element |
| [src/components/pages/AlertsPage.tsx:150](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/AlertsPage.tsx:150>) | Open | {() => setActive(pathToNav(a.linkHref!), "user")} | none on element |
| [src/components/pages/AlertsPage.tsx:158](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/AlertsPage.tsx:158>) | Dismiss | {() => dismiss(a.id)} | none on element |
| [src/components/pages/AlertsPage.tsx:189](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/AlertsPage.tsx:189>) | Restore | {() => restore(a.id)} | none on element |
| [src/components/pages/AlertsPage.tsx:192](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/AlertsPage.tsx:192>) | (icon/dynamic) | {() => hardDelete(a.id)} | none on element |

### Validation / persistence / feedback call sites

| Source | Call | Arguments (source expression) |
| --- | --- | --- |
| [src/components/pages/AlertsPage.tsx:42](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/AlertsPage.tsx:42>) | alertRepo.update | id, { dismissed: 1 } |
| [src/components/pages/AlertsPage.tsx:46](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/AlertsPage.tsx:46>) | alertRepo.update | id, { dismissed: 0 } |
| [src/components/pages/AlertsPage.tsx:50](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/AlertsPage.tsx:50>) | alertRepo.hardDelete | id |
| [src/components/pages/AlertsPage.tsx:57](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/AlertsPage.tsx:57>) | alertRepo.list | user.id |
| [src/components/pages/AlertsPage.tsx:63](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/AlertsPage.tsx:63>) | toast | { title: "Alerts refreshed", kind: "success" } |
| [src/components/pages/AlertsPage.tsx:68](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/AlertsPage.tsx:68>) | alertRepo.updateMany | ids, { dismissed: 1 } |
| [src/components/pages/AlertsPage.tsx:195](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/AlertsPage.tsx:195>) | hardDelete | a.id |

## Settings: /settings

| Audit dimension | Observed implementation / assessment |
| --- | --- |
| 1-4 Identity, group, purpose, status | System. App preferences and data-management actions. Implemented for current personal/platform scope, partial against the agency brief; page state audited. |
| 5 Source | [src/components/pages/SettingsPage.tsx](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/SettingsPage.tsx>) |
| 6-8 Data source, APIs, stores | Zustand plus repositories; generic /api/data/entity.php and entity-item.php where cloud-mapped. Source selectors: settings, setSettings, dashboardMode, setDashboardMode, chartAccessibility, setChartAccessibility, transactions, categories, accounts, budgets, goals, loans. Exact imports below. |
| 9-10 UI sections and forms | "Settings"; Appearance; Charts &amp; dashboard; Financial Year; Budget thresholds; Warnings &amp; alerts; Custom payment modes; Data management; Re-seed demo data?; Confirm profile wipe |
| 11-12 Available actions and behavior | 10 source action definitions. Preferences, demo/backup/reset-related controls; actual Wipe all data UI leaves household data behind. Full handler/disabled/visibility inventory is linked below. |
| 13 Form fields | 17 field/control declarations in this file. Exact labels, binding props and validation hooks listed below; child dialog declarations are in the global inventory. |
| 14 Validation | Inline checks and/or delegated dialog validation. Frontend validation is not authoritative; backend transaction validation is stronger than other collection schemas (B14/B37). |
| 15 Empty state | Empty/no-data branches or delegated empty-state components exist. Fresh-user/seeded data were used, not every table empty condition. |
| 16 Loading state | Loading/busy state references exist; exact disabled bindings in action inventory. Slow-network/failure injection was selective, not every control. |
| 17 Error state | Error/validation handling references exist. Repository fallback can turn server rejection into apparent success (B01); presence of toast code is not proof of correct failure semantics. |
| 18 Role permissions | Active user owns the dataset. Plan/feature gates may hide controls; generic writes are constrained to the authenticated tenant, not agency roles. |
| 19 PIN requirement | No independent action PIN found in this page. Normal authentication is not a per-action authorization challenge. |
| 20 Audit creation | No direct page audit writer found; repository/server helpers may log some operations. No complete per-action audit proof. |
| 21 Mobile behavior | 10 widths sampled; maximum root overflow 0px. This is layout screening, not every dialog/table state. |
| 22 Bugs found | B01, B05, B15, B29, B39 |
| 23 Missing features | Preferences, backups/demo/reset-related flows; agency company/tax/approval settings absent. |
| 24 Suggested improvements | Resolve listed integrity/security defects first; then add typed contracts, explicit failure states and complete mobile/action coverage before agency expansion. |
| 25 Existing test coverage | Authenticated route rendered in custom browser audit. Textually related test files: tests/local-phase-09-ui-browser-e2e.mjs. These references are candidates, not measured branch coverage. |
| 26 Missing test coverage | Every enabled/disabled action, negative field, cancel/PIN failure, server error, reload persistence, role matrix and populated large-data state has not been executed. Add these to the release matrix, including child dialogs. |

### Data and service wiring

| Import | Bindings |
| --- | --- |
| @/store/dataStore | { useDataStore } |
| @/store/authStore | { useAuthStore } |
| @/repositories | { settingsRepo } |
| @/store/uiStore | { useUIStore } |
| @/services/demoData | { seedDemoData } |
| @/repositories | {   accountRepo,   alertRepo,   budgetRepo,   cardRepo,   categoryRepo,   emiRepo,   exportHistoryRepo,   goalContribRepo,   goalRepo,   investmentRepo,   loanRepo,   recurringRepo,   reminderRepo,   savingsContribRepo,   transactionRepo,   udhariRepo,   udhariSettlementRepo, } |

### Fields and controls

| Source | Control | Label / props |
| --- | --- | --- |
| [src/components/pages/SettingsPage.tsx:208](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/SettingsPage.tsx:208>) | Field | {"label":"\"Theme\""} |
| [src/components/pages/SettingsPage.tsx:209](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/SettingsPage.tsx:209>) | Select | {"value":"{mode}","onValueChange":"{(v) => setMode(v as typeof mode)}"} |
| [src/components/pages/SettingsPage.tsx:220](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/SettingsPage.tsx:220>) | Field | {"label":"\"Date format\""} |
| [src/components/pages/SettingsPage.tsx:221](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/SettingsPage.tsx:221>) | Select | {"value":"{form.dateFormat ?? \"dd/MM/yyyy\"}","onValueChange":"{(v) =>\n                  setForm({ ...form, dateFormat: v as ProfileSettings[\"dateFormat\"] })\n                }"} |
| [src/components/pages/SettingsPage.tsx:246](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/SettingsPage.tsx:246>) | Field | {"label":"\"Default dashboard mode\""} |
| [src/components/pages/SettingsPage.tsx:247](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/SettingsPage.tsx:247>) | Select | {"value":"{dashboardMode}","onValueChange":"{(v) => setDashboardMode(v as typeof dashboardMode)}"} |
| [src/components/pages/SettingsPage.tsx:261](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/SettingsPage.tsx:261>) | Field | {"label":"\"Chart colors\""} |
| [src/components/pages/SettingsPage.tsx:262](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/SettingsPage.tsx:262>) | Select | {"value":"{chartAccessibility}","onValueChange":"{(v) => setChartAccessibility(v as typeof chartAccessibility)}"} |
| [src/components/pages/SettingsPage.tsx:288](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/SettingsPage.tsx:288>) | Field | {"label":"\"Start month\""} |
| [src/components/pages/SettingsPage.tsx:289](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/SettingsPage.tsx:289>) | Select | {"value":"{String(form.financialYearStartMonth ?? 4)}","onValueChange":"{(v) => setForm({ ...form, financialYearStartMonth: +v })}"} |
| [src/components/pages/SettingsPage.tsx:318](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/SettingsPage.tsx:318>) | Field | {"label":"\"Warning %\"","hint":"\"Show warning badge when spent reaches this %\""} |
| [src/components/pages/SettingsPage.tsx:319](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/SettingsPage.tsx:319>) | Input | {"type":"\"number\"","min":"{0}","max":"{200}","value":"{form.budgetThresholds?.warning ?? 80}","onChange":"{(e) =>\n                  setForm({\n                    ...form,\n                    budgetThresholds: {\n                      warning: +e.target.value,\n                      critical: form.budgetThresholds?.critical ?? 100,\n                    },\n                  })\n                }"} |
| [src/components/pages/SettingsPage.tsx:335](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/SettingsPage.tsx:335>) | Field | {"label":"\"Critical %\"","hint":"\"Show danger badge when spent reaches this %\""} |
| [src/components/pages/SettingsPage.tsx:336](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/SettingsPage.tsx:336>) | Input | {"type":"\"number\"","min":"{0}","max":"{200}","value":"{form.budgetThresholds?.critical ?? 100}","onChange":"{(e) =>\n                  setForm({\n                    ...form,\n                    budgetThresholds: {\n                      warning: form.budgetThresholds?.warning ?? 80,\n                      critical: +e.target.value,\n                    },\n                  })\n                }"} |
| [src/components/pages/SettingsPage.tsx:410](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/SettingsPage.tsx:410>) | Input | {"className":"\"min-w-0\"","value":"{customMode}","onChange":"{(e) => setCustomMode(e.target.value)}","placeholder":"\"e.g. Paytm QR, PhonePe Business, Store Credit\"","onKeyDown":"{(e) => {\n                  if (e.key === \"Enter\" && customMode.trim()) {\n                    setForm({\n                      ...form,\n                      customPaymentModes: [\n                        ...(form.customPaymentModes ?? []),\n                        customMode.trim(),\n                      ],\n                    });\n                    setCustomMode(\"\");\n                  }\n                }}"} |
| [src/components/pages/SettingsPage.tsx:539](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/SettingsPage.tsx:539>) | Field | {"label":"\"Confirmation text\""} |
| [src/components/pages/SettingsPage.tsx:540](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/SettingsPage.tsx:540>) | Input | {"value":"{wipeInput}","onChange":"{(e) => setWipeInput(e.target.value)}","placeholder":"{user ? `DELETE ${user.username}` : \"DELETE username\"}"} |

### Action trace

| Source | Label | Handler | Disabled |
| --- | --- | --- | --- |
| [src/components/pages/SettingsPage.tsx:186](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/SettingsPage.tsx:186>) | {saved ? ( <> <CheckCircle2 className="h-4 w-4 text-income" /> Saved </> ) : ( <> <Save className="h-4 w-4" /> Save changes </> )} | {save} | none on element |
| [src/components/pages/SettingsPage.tsx:377](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/SettingsPage.tsx:377>) | (icon/dynamic) | {(v) =>                     setForm({                       ...form,                       warningPreferences: {                         budgetAlerts: true,                         dueAlerts: true,                         udhariAlerts: true,                         savingsAlerts: true,                         unusualSpendAlerts: true,                         duplicateAlerts: true,                         ...(form.warningPreferences ?? {}),                         [key]: v,                       },                     })                   } | none on element |
| [src/components/pages/SettingsPage.tsx:428](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/SettingsPage.tsx:428>) | Add | {() => {                   if (!customMode.trim()) return;                   setForm({                     ...form,                     customPaymentModes: [                       ...(form.customPaymentModes ?? []),                       customMode.trim(),                     ],                   });                   setCustomMode("");                 }} | none on element |
| [src/components/pages/SettingsPage.tsx:453](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/SettingsPage.tsx:453>) | × | {() =>                       setForm({                         ...form,                         customPaymentModes: (form.customPaymentModes ?? []).filter(                           (_, j) => j !== i,                         ),                       })                     } | none on element |
| [src/components/pages/SettingsPage.tsx:503](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/SettingsPage.tsx:503>) | Re-seed demo data | {() => setConfirmResetOpen(true)} | none on element |
| [src/components/pages/SettingsPage.tsx:506](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/SettingsPage.tsx:506>) | Wipe all profile data | {() => setConfirmWipeOpen(true)} | none on element |
| [src/components/pages/SettingsPage.tsx:523](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/SettingsPage.tsx:523>) | Cancel | {() => setConfirmResetOpen(false)} | none on element |
| [src/components/pages/SettingsPage.tsx:526](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/SettingsPage.tsx:526>) | Continue | {resetDemo} | none on element |
| [src/components/pages/SettingsPage.tsx:547](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/SettingsPage.tsx:547>) | Cancel | {() => {                 setConfirmWipeOpen(false);                 setWipeInput("");               }} | none on element |
| [src/components/pages/SettingsPage.tsx:556](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/SettingsPage.tsx:556>) | Delete all data | {wipeAll} | none on element |

### Validation / persistence / feedback call sites

| Source | Call | Arguments (source expression) |
| --- | --- | --- |
| [src/components/pages/SettingsPage.tsx:99](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/SettingsPage.tsx:99>) | settingsRepo.update | settings.id, payload |
| [src/components/pages/SettingsPage.tsx:102](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/SettingsPage.tsx:102>) | settingsRepo.create | { userId: user.id, data: payload as ProfileSettings, } |
| [src/components/pages/SettingsPage.tsx:108](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/SettingsPage.tsx:108>) | setSaved | true |
| [src/components/pages/SettingsPage.tsx:109](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/SettingsPage.tsx:109>) | setSaved | false |
| [src/components/pages/SettingsPage.tsx:110](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/SettingsPage.tsx:110>) | toast | { title: "Settings saved", kind: "success" } |
| [src/components/pages/SettingsPage.tsx:112](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/SettingsPage.tsx:112>) | toast | { title: e instanceof Error ? e.message : "Failed to save settings", kind: "error" } |
| [src/components/pages/SettingsPage.tsx:143](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/SettingsPage.tsx:143>) | toast | { title: "Demo data added", kind: "success" } |
| [src/components/pages/SettingsPage.tsx:144](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/SettingsPage.tsx:144>) | setConfirmResetOpen | false |
| [src/components/pages/SettingsPage.tsx:150](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/SettingsPage.tsx:150>) | toast | { title: "Cancelled", kind: "info" } |
| [src/components/pages/SettingsPage.tsx:172](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/SettingsPage.tsx:172>) | r.hardDeleteAllForUser | user.id |
| [src/components/pages/SettingsPage.tsx:175](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/SettingsPage.tsx:175>) | toast | { title: "Profile data wiped", kind: "warning" } |
| [src/components/pages/SettingsPage.tsx:176](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/SettingsPage.tsx:176>) | setConfirmWipeOpen | false |
| [src/components/pages/SettingsPage.tsx:503](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/SettingsPage.tsx:503>) | setConfirmResetOpen | true |
| [src/components/pages/SettingsPage.tsx:506](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/SettingsPage.tsx:506>) | setConfirmWipeOpen | true |
| [src/components/pages/SettingsPage.tsx:523](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/SettingsPage.tsx:523>) | setConfirmResetOpen | false |
| [src/components/pages/SettingsPage.tsx:550](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/SettingsPage.tsx:550>) | setConfirmWipeOpen | false |

## Profile: /profile

| Audit dimension | Observed implementation / assessment |
| --- | --- |
| 1-4 Identity, group, purpose, status | System. Profile, PIN, recovery, lock/logout and account operations. Implemented for current personal/platform scope, partial against the agency brief; page state audited. |
| 5 Source | [src/components/pages/ProfilePage.tsx](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/ProfilePage.tsx>) |
| 6-8 Data source, APIs, stores | Zustand plus repositories; generic /api/data/entity.php and entity-item.php where cloud-mapped. Source selectors: refreshProfiles, lock, logout. Exact imports below. |
| 9-10 UI sections and forms | "Profile & Security"; Personal details; Change PIN; Forgot PIN recovery |
| 11-12 Available actions and behavior | 8 source action definitions. Recovery/PIN security probes fail; profile update, PIN-guarded account export/delete have distinct contracts. Full handler/disabled/visibility inventory is linked below. |
| 13 Form fields | 24 field/control declarations in this file. Exact labels, binding props and validation hooks listed below; child dialog declarations are in the global inventory. |
| 14 Validation | Inline checks and/or delegated dialog validation. Frontend validation is not authoritative; backend transaction validation is stronger than other collection schemas (B14/B37). |
| 15 Empty state | No explicit empty-state primitive found in this file; inspect children. Fresh-user/seeded data were used, not every table empty condition. |
| 16 Loading state | Loading/busy state references exist; exact disabled bindings in action inventory. Slow-network/failure injection was selective, not every control. |
| 17 Error state | Error/validation handling references exist. Repository fallback can turn server rejection into apparent success (B01); presence of toast code is not proof of correct failure semantics. |
| 18 Role permissions | Active user owns the dataset. Plan/feature gates may hide controls; generic writes are constrained to the authenticated tenant, not agency roles. |
| 19 PIN requirement | PIN-related control/reference appears; use API and security report for which sensitive action is actually reauthenticated. |
| 20 Audit creation | No direct page audit writer found; repository/server helpers may log some operations. No complete per-action audit proof. |
| 21 Mobile behavior | 10 widths sampled; maximum root overflow 0px. This is layout screening, not every dialog/table state. |
| 22 Bugs found | B06, B07, B08, B09, B10, B29 |
| 23 Missing features | No agency lifecycle/role/close-period equivalence is implied by this personal-finance view. |
| 24 Suggested improvements | Resolve listed integrity/security defects first; then add typed contracts, explicit failure states and complete mobile/action coverage before agency expansion. |
| 25 Existing test coverage | Authenticated route rendered in custom browser audit. Textually related test files: tests/local-phase-09-ui-browser-e2e.mjs. These references are candidates, not measured branch coverage. |
| 26 Missing test coverage | Every enabled/disabled action, negative field, cancel/PIN failure, server error, reload persistence, role matrix and populated large-data state has not been executed. Add these to the release matrix, including child dialogs. |

### Data and service wiring

| Import | Bindings |
| --- | --- |
| @/store/authStore | { useAuthStore } |
| @/store/uiStore | { useUIStore } |
| @/services/authService | {   changePin,   resetPinWithSecurityAnswer,   setSecurityAnswer as saveSecurityAnswerService,   updateUserProfile, } |

### Fields and controls

| Source | Control | Label / props |
| --- | --- | --- |
| [src/components/pages/ProfilePage.tsx:200](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/ProfilePage.tsx:200>) | Field | {"label":"\"Display name\"","className":"\"col-span-2\""} |
| [src/components/pages/ProfilePage.tsx:201](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/ProfilePage.tsx:201>) | Input | {"value":"{form.displayName}","onChange":"{(e) => setForm({ ...form, displayName: e.target.value })}"} |
| [src/components/pages/ProfilePage.tsx:206](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/ProfilePage.tsx:206>) | Field | {"label":"\"Mobile\""} |
| [src/components/pages/ProfilePage.tsx:207](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/ProfilePage.tsx:207>) | Input | {"value":"{form.mobile}","onChange":"{(e) => setForm({ ...form, mobile: e.target.value })}","placeholder":"\"+91…\""} |
| [src/components/pages/ProfilePage.tsx:213](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/ProfilePage.tsx:213>) | Field | {"label":"\"Email\""} |
| [src/components/pages/ProfilePage.tsx:214](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/ProfilePage.tsx:214>) | Input | {"type":"\"email\"","value":"{form.email}","onChange":"{(e) => setForm({ ...form, email: e.target.value })}"} |
| [src/components/pages/ProfilePage.tsx:220](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/ProfilePage.tsx:220>) | Field | {"label":"\"Avatar emoji\"","className":"\"col-span-2\""} |
| [src/components/pages/ProfilePage.tsx:238](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/ProfilePage.tsx:238>) | Field | {"label":"\"Avatar color\"","className":"\"col-span-2\""} |
| [src/components/pages/ProfilePage.tsx:255](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/ProfilePage.tsx:255>) | Field | {"label":"\"Security question\"","className":"\"col-span-2\""} |
| [src/components/pages/ProfilePage.tsx:256](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/ProfilePage.tsx:256>) | Input | {"value":"{form.securityQuestion}","onChange":"{(e) =>\n                      setForm({ ...form, securityQuestion: e.target.value })\n                    }","placeholder":"\"Your mother's first school\""} |
| [src/components/pages/ProfilePage.tsx:264](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/ProfilePage.tsx:264>) | Field | {"label":"\"Security answer (hidden hash)\"","className":"\"col-span-2\""} |
| [src/components/pages/ProfilePage.tsx:265](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/ProfilePage.tsx:265>) | Input | {"type":"\"password\"","value":"{securityAnswer}","onChange":"{(e) => setSecurityAnswer(e.target.value)}","placeholder":"\"Enter your secret answer\""} |
| [src/components/pages/ProfilePage.tsx:294](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/ProfilePage.tsx:294>) | Field | {"label":"\"Current PIN\"","required":"true"} |
| [src/components/pages/ProfilePage.tsx:295](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/ProfilePage.tsx:295>) | Input | {"type":"\"password\"","value":"{oldPin}","onChange":"{(e) => setOldPin(e.target.value)}"} |
| [src/components/pages/ProfilePage.tsx:301](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/ProfilePage.tsx:301>) | Field | {"label":"\"New PIN\"","required":"true"} |
| [src/components/pages/ProfilePage.tsx:302](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/ProfilePage.tsx:302>) | Input | {"type":"\"password\"","value":"{newPin}","onChange":"{(e) => setNewPin(e.target.value)}"} |
| [src/components/pages/ProfilePage.tsx:308](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/ProfilePage.tsx:308>) | Field | {"label":"\"Confirm new\"","required":"true"} |
| [src/components/pages/ProfilePage.tsx:309](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/ProfilePage.tsx:309>) | Input | {"type":"\"password\"","value":"{confirmNew}","onChange":"{(e) => setConfirmNew(e.target.value)}"} |
| [src/components/pages/ProfilePage.tsx:339](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/ProfilePage.tsx:339>) | Field | {"label":"\"Security answer\"","required":"true"} |
| [src/components/pages/ProfilePage.tsx:340](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/ProfilePage.tsx:340>) | Input | {"type":"\"password\"","value":"{recoveryAnswer}","onChange":"{(e) => setRecoveryAnswer(e.target.value)}"} |
| [src/components/pages/ProfilePage.tsx:346](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/ProfilePage.tsx:346>) | Field | {"label":"\"New PIN\"","required":"true"} |
| [src/components/pages/ProfilePage.tsx:347](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/ProfilePage.tsx:347>) | Input | {"type":"\"password\"","value":"{recoveryNewPin}","onChange":"{(e) => setRecoveryNewPin(e.target.value)}"} |
| [src/components/pages/ProfilePage.tsx:353](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/ProfilePage.tsx:353>) | Field | {"label":"\"Confirm new PIN\"","required":"true"} |
| [src/components/pages/ProfilePage.tsx:354](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/ProfilePage.tsx:354>) | Input | {"type":"\"password\"","value":"{recoveryConfirmPin}","onChange":"{(e) => setRecoveryConfirmPin(e.target.value)}"} |

### Action trace

| Source | Label | Handler | Disabled |
| --- | --- | --- | --- |
| [src/components/pages/ProfilePage.tsx:179](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/ProfilePage.tsx:179>) | Lock | {() => lock()} | none on element |
| [src/components/pages/ProfilePage.tsx:182](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/ProfilePage.tsx:182>) | Logout | {() => logout()} | none on element |
| [src/components/pages/ProfilePage.tsx:223](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/ProfilePage.tsx:223>) | {e} | {() => setForm({ ...form, avatarEmoji: e })} | none on element |
| [src/components/pages/ProfilePage.tsx:241](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/ProfilePage.tsx:241>) | (icon/dynamic) | {() => setForm({ ...form, avatarColor: c })} | none on element |
| [src/components/pages/ProfilePage.tsx:274](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/ProfilePage.tsx:274>) | Save security recovery | {saveSecurityRecovery} | none on element |
| [src/components/pages/ProfilePage.tsx:277](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/ProfilePage.tsx:277>) | Save profile | {saveProfile} | none on element |
| [src/components/pages/ProfilePage.tsx:322](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/ProfilePage.tsx:322>) | Update PIN | {savePin} | none on element |
| [src/components/pages/ProfilePage.tsx:367](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/ProfilePage.tsx:367>) | Reset PIN via recovery | {recoverPin} | none on element |

### Validation / persistence / feedback call sites

| Source | Call | Arguments (source expression) |
| --- | --- | --- |
| [src/components/pages/ProfilePage.tsx:67](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/ProfilePage.tsx:67>) | toast | { title: "Profile updated", kind: "success" } |
| [src/components/pages/ProfilePage.tsx:69](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/ProfilePage.tsx:69>) | toast | { title: e instanceof Error ? e.message : "Failed to save profile", kind: "error" } |
| [src/components/pages/ProfilePage.tsx:96](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/ProfilePage.tsx:96>) | setConfirmNew | "" |
| [src/components/pages/ProfilePage.tsx:97](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/ProfilePage.tsx:97>) | toast | { title: "PIN changed", kind: "success" } |
| [src/components/pages/ProfilePage.tsx:109](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/ProfilePage.tsx:109>) | saveSecurityAnswerService | user.id, form.securityQuestion, securityAnswer |
| [src/components/pages/ProfilePage.tsx:111](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/ProfilePage.tsx:111>) | toast | { title: "Security recovery updated", kind: "success" } |
| [src/components/pages/ProfilePage.tsx:114](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/ProfilePage.tsx:114>) | toast | { title: e instanceof Error ? e.message : "Failed to update recovery", kind: "error" } |
| [src/components/pages/ProfilePage.tsx:137](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/ProfilePage.tsx:137>) | setRecoveryConfirmPin | "" |
| [src/components/pages/ProfilePage.tsx:138](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/ProfilePage.tsx:138>) | toast | { title: "PIN reset successful", kind: "success" } |
| [src/components/pages/ProfilePage.tsx:312](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/ProfilePage.tsx:312>) | setConfirmNew | e.target.value |
| [src/components/pages/ProfilePage.tsx:357](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/ProfilePage.tsx:357>) | setRecoveryConfirmPin | e.target.value |

## Audit: /audit

| Audit dimension | Observed implementation / assessment |
| --- | --- |
| 1-4 Identity, group, purpose, status | System. User activity, export history and backup-related view. Implemented for current personal/platform scope, partial against the agency brief; page state audited. |
| 5 Source | [src/components/pages/AuditPage.tsx](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/AuditPage.tsx>) |
| 6-8 Data source, APIs, stores | Zustand plus repositories; generic /api/data/entity.php and entity-item.php where cloud-mapped. Source selectors: auditLogs. Exact imports below. |
| 9-10 UI sections and forms | "Audit & Backup"; {logs.length}; {logs.filter((l) => l.action === "create").length}; {logs.filter((l) => l.action === "update").length}; {logs.filter( (l) => l.action === "soft_delete" \|\| l.action === "hard_delete", ).length} |
| 11-12 Available actions and behavior | 1 source action definitions. Editable generic audit collection is distinct from server security logs; search/filter not immutable evidence. Full handler/disabled/visibility inventory is linked below. |
| 13 Form fields | 3 field/control declarations in this file. Exact labels, binding props and validation hooks listed below; child dialog declarations are in the global inventory. |
| 14 Validation | Inline checks and/or delegated dialog validation. Frontend validation is not authoritative; backend transaction validation is stronger than other collection schemas (B14/B37). |
| 15 Empty state | Empty/no-data branches or delegated empty-state components exist. Fresh-user/seeded data were used, not every table empty condition. |
| 16 Loading state | No explicit loading/busy declaration in this page; shared shell may load data. Slow-network/failure injection was selective, not every control. |
| 17 Error state | No explicit per-page error handling located. Repository fallback can turn server rejection into apparent success (B01); presence of toast code is not proof of correct failure semantics. |
| 18 Role permissions | Active user owns the dataset. Plan/feature gates may hide controls; generic writes are constrained to the authenticated tenant, not agency roles. |
| 19 PIN requirement | No independent action PIN found in this page. Normal authentication is not a per-action authorization challenge. |
| 20 Audit creation | Client audit/export-history references appear; these are not the separate append-only server log. |
| 21 Mobile behavior | 10 widths sampled; maximum root overflow 0px. This is layout screening, not every dialog/table state. |
| 22 Bugs found | B13, B15, B30 |
| 23 Missing features | User activity collection and separate SQL security/admin logs; not an immutable unified audit UI. |
| 24 Suggested improvements | Resolve listed integrity/security defects first; then add typed contracts, explicit failure states and complete mobile/action coverage before agency expansion. |
| 25 Existing test coverage | Authenticated route rendered in custom browser audit. Textually related test files: tests/local-phase-09-ui-browser-e2e.mjs. These references are candidates, not measured branch coverage. |
| 26 Missing test coverage | Every enabled/disabled action, negative field, cancel/PIN failure, server error, reload persistence, role matrix and populated large-data state has not been executed. Add these to the release matrix, including child dialogs. |

### Data and service wiring

| Import | Bindings |
| --- | --- |
| @/store/dataStore | { useDataStore } |
| @/store/uiStore | { useUIStore } |
| @/exports/xlsxExporter | { exportModuleToSheet } |

### Fields and controls

| Source | Control | Label / props |
| --- | --- | --- |
| [src/components/pages/AuditPage.tsx:141](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/AuditPage.tsx:141>) | Input | {"placeholder":"\"Search details, entity, ID…\"","value":"{search}","onChange":"{(e) => setSearch(e.target.value)}","className":"\"max-w-xs\""} |
| [src/components/pages/AuditPage.tsx:147](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/AuditPage.tsx:147>) | Select | {"value":"{action}","onValueChange":"{setAction}"} |
| [src/components/pages/AuditPage.tsx:160](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/AuditPage.tsx:160>) | Select | {"value":"{entity}","onValueChange":"{setEntity}"} |

### Action trace

| Source | Label | Handler | Disabled |
| --- | --- | --- | --- |
| [src/components/pages/AuditPage.tsx:95](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/AuditPage.tsx:95>) | Export log | {exportLogs} | none on element |

### Validation / persistence / feedback call sites

| Source | Call | Arguments (source expression) |
| --- | --- | --- |
| [src/components/pages/AuditPage.tsx:76](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/AuditPage.tsx:76>) | exportModuleToSheet | "Audit_Log", filtered.map((l) => ({ Timestamp: l.createdAt, Action: l.action, Entity: l.entity, EntityId: l.entityId ?? "", Detail: l.detail, })) |
| [src/components/pages/AuditPage.tsx:86](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/AuditPage.tsx:86>) | toast | { title: "Audit log exported", kind: "success" } |

## Subscription: /subscription

| Audit dimension | Observed implementation / assessment |
| --- | --- |
| 1-4 Identity, group, purpose, status | System. Platform membership plans and Razorpay checkout. Implemented for current personal/platform scope, partial against the agency brief; disabled feature-state audited. |
| 5 Source | [src/components/pages/SubscriptionPage.tsx](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/SubscriptionPage.tsx>) |
| 6-8 Data source, APIs, stores | Zustand plus repositories; generic /api/data/entity.php and entity-item.php where cloud-mapped. Source selectors: See imported store and child components. Exact imports below. |
| 9-10 UI sections and forms | "Subscription"; Current plan; {String(plan.name)} |
| 11-12 Available actions and behavior | 1 source action definitions. Feature disabled in audit configuration; route renders Dashboard. Real checkout not exercised and no payment was sent. Full handler/disabled/visibility inventory is linked below. |
| 13 Form fields | 0 field/control declarations in this file. Exact labels, binding props and validation hooks listed below; child dialog declarations are in the global inventory. |
| 14 Validation | Inline checks and/or delegated dialog validation. Frontend validation is not authoritative; backend transaction validation is stronger than other collection schemas (B14/B37). |
| 15 Empty state | No explicit empty-state primitive found in this file; inspect children. Fresh-user/seeded data were used, not every table empty condition. |
| 16 Loading state | Loading/busy state references exist; exact disabled bindings in action inventory. Slow-network/failure injection was selective, not every control. |
| 17 Error state | Error/validation handling references exist. Repository fallback can turn server rejection into apparent success (B01); presence of toast code is not proof of correct failure semantics. |
| 18 Role permissions | Active user owns the dataset. Plan/feature gates may hide controls; generic writes are constrained to the authenticated tenant, not agency roles. |
| 19 PIN requirement | No independent action PIN found in this page. Normal authentication is not a per-action authorization challenge. |
| 20 Audit creation | No direct page audit writer found; repository/server helpers may log some operations. No complete per-action audit proof. |
| 21 Mobile behavior | 10 widths sampled; maximum root overflow 0px. This is layout screening, not every dialog/table state. |
| 22 Bugs found | B26 |
| 23 Missing features | Platform plans/subscriptions and personal recurring rules; not agency AMC/retainer invoicing. |
| 24 Suggested improvements | Resolve listed integrity/security defects first; then add typed contracts, explicit failure states and complete mobile/action coverage before agency expansion. |
| 25 Existing test coverage | Authenticated route rendered in custom browser audit. Textually related test files: tests/local-phase-09-ui-browser-e2e.mjs. These references are candidates, not measured branch coverage. |
| 26 Missing test coverage | Every enabled/disabled action, negative field, cancel/PIN failure, server error, reload persistence, role matrix and populated large-data state has not been executed. Add these to the release matrix, including child dialogs. |

### Data and service wiring

| Import | Bindings |
| --- | --- |
| @/lib/cloud/saasClient | { confirmSubscriptionPayment, createSubscriptionOrder, fetchPlans, getMySubscription } |
| @/store/uiStore | { useUIStore } |

### Fields and controls

| Source | Control | Label / props |
| --- | --- | --- |


### Action trace

| Source | Label | Handler | Disabled |
| --- | --- | --- | --- |
| [src/components/pages/SubscriptionPage.tsx:98](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/SubscriptionPage.tsx:98>) | Buy {String(plan.code)} | {() => buyPlan(Number(plan.id))} | none on element |

### Validation / persistence / feedback call sites

| Source | Call | Arguments (source expression) |
| --- | --- | --- |
| [src/components/pages/SubscriptionPage.tsx:43](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/SubscriptionPage.tsx:43>) | toast | { title: "Downgrade scheduled", description: out.message ?? "Your current paid period stays active until renewal.", kind: "success", } |
| [src/components/pages/SubscriptionPage.tsx:62](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/SubscriptionPage.tsx:62>) | confirmSubscriptionPayment | { razorpay_order_id: resp.razorpay_order_id, razorpay_payment_id: resp.razorpay_payment_id, razorpay_signature: resp.razorpay_signature, } |
| [src/components/pages/SubscriptionPage.tsx:69](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/SubscriptionPage.tsx:69>) | toast | { title: "Subscription activated", kind: "success" } |
| [src/components/pages/SubscriptionPage.tsx:74](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/SubscriptionPage.tsx:74>) | toast | { title: e instanceof Error ? e.message : "Unable to create order", kind: "error" } |

## AdminDashboard: /admin

| Audit dimension | Observed implementation / assessment |
| --- | --- |
| 1-4 Identity, group, purpose, status | Admin. Platform user/subscription metrics. Implemented for current personal/platform scope, partial against the agency brief; page state audited. |
| 5 Source | [src/components/pages/admin/AdminDashboardPage.tsx](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/admin/AdminDashboardPage.tsx>) |
| 6-8 Data source, APIs, stores | Dedicated admin PHP controllers over SQL. Source selectors: See imported store and child components. Exact imports below. |
| 9-10 UI sections and forms | "Admin Dashboard"; {c.value} |
| 11-12 Available actions and behavior | 2 source action definitions. Admin session required; business overview is platform SaaS, not company profit. Full handler/disabled/visibility inventory is linked below. |
| 13 Form fields | 0 field/control declarations in this file. Exact labels, binding props and validation hooks listed below; child dialog declarations are in the global inventory. |
| 14 Validation | Inline checks and/or delegated dialog validation. Frontend validation is not authoritative; backend transaction validation is stronger than other collection schemas (B14/B37). |
| 15 Empty state | No explicit empty-state primitive found in this file; inspect children. Fresh-user/seeded data were used, not every table empty condition. |
| 16 Loading state | Loading/busy state references exist; exact disabled bindings in action inventory. Slow-network/failure injection was selective, not every control. |
| 17 Error state | Error/validation handling references exist. Repository fallback can turn server rejection into apparent success (B01); presence of toast code is not proof of correct failure semantics. |
| 18 Role permissions | Platform admin server role. No separate super-admin/finance-manager/auditor permission model. |
| 19 PIN requirement | PIN-related control/reference appears; use API and security report for which sensitive action is actually reauthenticated. |
| 20 Audit creation | No direct page audit writer found; repository/server helpers may log some operations. No complete per-action audit proof. |
| 21 Mobile behavior | 10 widths sampled; maximum root overflow 0px. This is layout screening, not every dialog/table state. |
| 22 Bugs found | B08, B33 |
| 23 Missing features | Platform administration and billing limits; no allocatable administrative-charge ledger. |
| 24 Suggested improvements | Resolve listed integrity/security defects first; then add typed contracts, explicit failure states and complete mobile/action coverage before agency expansion. |
| 25 Existing test coverage | Authenticated route rendered in custom browser audit. Textually related test files: tests/local-phase-09-ui-browser-e2e.mjs. These references are candidates, not measured branch coverage. |
| 26 Missing test coverage | Every enabled/disabled action, negative field, cancel/PIN failure, server error, reload persistence, role matrix and populated large-data state has not been executed. Add these to the release matrix, including child dialogs. |

### Data and service wiring

| Import | Bindings |
| --- | --- |
| @/lib/cloud/saasClient | { getAdminDashboard } |

### Fields and controls

| Source | Control | Label / props |
| --- | --- | --- |


### Action trace

| Source | Label | Handler | Disabled |
| --- | --- | --- | --- |
| [src/components/pages/admin/AdminDashboardPage.tsx:104](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/admin/AdminDashboardPage.tsx:104>) | Refresh | {load} | none on element |
| [src/components/pages/admin/AdminDashboardPage.tsx:114](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/admin/AdminDashboardPage.tsx:114>) | Retry | {load} | none on element |

### Validation / persistence / feedback call sites

| Source | Call | Arguments (source expression) |
| --- | --- | --- |


## UserManagement: /admin/users

| Audit dimension | Observed implementation / assessment |
| --- | --- |
| 1-4 Identity, group, purpose, status | Admin. Platform account listing, activation, plan assignment and PIN reset. Implemented for current personal/platform scope, partial against the agency brief; page state audited. |
| 5 Source | [src/components/pages/admin/UserManagementPage.tsx](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/admin/UserManagementPage.tsx>) |
| 6-8 Data source, APIs, stores | Dedicated admin PHP controllers over SQL. Source selectors: See imported store and child components. Exact imports below. |
| 9-10 UI sections and forms | "User Management"; Set PIN for @ {pinUser?.username} |
| 11-12 Available actions and behavior | 6 source action definitions. Admin read route verified; sensitive mutation workflows have no fine-grained agency role separation. Full handler/disabled/visibility inventory is linked below. |
| 13 Form fields | 8 field/control declarations in this file. Exact labels, binding props and validation hooks listed below; child dialog declarations are in the global inventory. |
| 14 Validation | Inline checks and/or delegated dialog validation. Frontend validation is not authoritative; backend transaction validation is stronger than other collection schemas (B14/B37). |
| 15 Empty state | Empty/no-data branches or delegated empty-state components exist. Fresh-user/seeded data were used, not every table empty condition. |
| 16 Loading state | Loading/busy state references exist; exact disabled bindings in action inventory. Slow-network/failure injection was selective, not every control. |
| 17 Error state | Error/validation handling references exist. Repository fallback can turn server rejection into apparent success (B01); presence of toast code is not proof of correct failure semantics. |
| 18 Role permissions | Platform admin server role. No separate super-admin/finance-manager/auditor permission model. |
| 19 PIN requirement | PIN-related control/reference appears; use API and security report for which sensitive action is actually reauthenticated. |
| 20 Audit creation | No direct page audit writer found; repository/server helpers may log some operations. No complete per-action audit proof. |
| 21 Mobile behavior | 10 widths sampled; maximum root overflow 0px. This is layout screening, not every dialog/table state. |
| 22 Bugs found | B07, B08, B10, B33 |
| 23 Missing features | Platform user/admin management plus limited household role records; not the nine-role agency model. |
| 24 Suggested improvements | Resolve listed integrity/security defects first; then add typed contracts, explicit failure states and complete mobile/action coverage before agency expansion. |
| 25 Existing test coverage | Authenticated route rendered in custom browser audit. Textually related test files: tests/local-phase-09-ui-browser-e2e.mjs. These references are candidates, not measured branch coverage. |
| 26 Missing test coverage | Every enabled/disabled action, negative field, cancel/PIN failure, server error, reload persistence, role matrix and populated large-data state has not been executed. Add these to the release matrix, including child dialogs. |

### Data and service wiring

| Import | Bindings |
| --- | --- |
| @/lib/cloud/saasClient | { assignUserPlan, getAdminPlans, getAdminUsers, toggleUserActive, adminResetUserPin } |
| @/store/uiStore | { useUIStore } |

### Fields and controls

| Source | Control | Label / props |
| --- | --- | --- |
| [src/components/pages/admin/UserManagementPage.tsx:186](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/admin/UserManagementPage.tsx:186>) | Input | {"className":"\"pl-8\"","placeholder":"\"Search by name or username…\"","value":"{search}","onChange":"{(e) => setSearch(e.target.value)}"} |
| [src/components/pages/admin/UserManagementPage.tsx:193](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/admin/UserManagementPage.tsx:193>) | Select | {"value":"{roleFilter}","onValueChange":"{(v) => setRoleFilter(v as typeof roleFilter)}"} |
| [src/components/pages/admin/UserManagementPage.tsx:203](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/admin/UserManagementPage.tsx:203>) | Select | {"value":"{statusFilter}","onValueChange":"{(v) => setStatusFilter(v as typeof statusFilter)}"} |
| [src/components/pages/admin/UserManagementPage.tsx:308](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/admin/UserManagementPage.tsx:308>) | Select | {"key":"{`${planSelectKey}:${u.id}`}","onValueChange":"{(planId) => {\n                                const plan = plans.find((p) => String(p.id) === planId);\n                                if (plan) handleAssignPlan(u.id, plan.id, plan.code);\n                              }}"} |
| [src/components/pages/admin/UserManagementPage.tsx:347](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/admin/UserManagementPage.tsx:347>) | Field | {"label":"\"New PIN (4–8 digits, avoid 1234 / 0000)\""} |
| [src/components/pages/admin/UserManagementPage.tsx:348](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/admin/UserManagementPage.tsx:348>) | Input | {"type":"\"password\"","inputMode":"\"numeric\"","autoComplete":"\"new-password\"","value":"{newPin}","onChange":"{(e) => setNewPin(e.target.value.replace(/\\D/g, \"\").slice(0, 8))}"} |
| [src/components/pages/admin/UserManagementPage.tsx:356](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/admin/UserManagementPage.tsx:356>) | Field | {"label":"\"Confirm PIN\""} |
| [src/components/pages/admin/UserManagementPage.tsx:357](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/admin/UserManagementPage.tsx:357>) | Input | {"type":"\"password\"","inputMode":"\"numeric\"","autoComplete":"\"new-password\"","value":"{confirmPin}","onChange":"{(e) => setConfirmPin(e.target.value.replace(/\\D/g, \"\").slice(0, 8))}"} |

### Action trace

| Source | Label | Handler | Disabled |
| --- | --- | --- | --- |
| [src/components/pages/admin/UserManagementPage.tsx:166](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/admin/UserManagementPage.tsx:166>) | Refresh | {loadData} | none on element |
| [src/components/pages/admin/UserManagementPage.tsx:176](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/admin/UserManagementPage.tsx:176>) | Retry | {loadData} | none on element |
| [src/components/pages/admin/UserManagementPage.tsx:287](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/admin/UserManagementPage.tsx:287>) | {isActive ? "Deactivate" : "Activate"} | {() => handleToggle(u.id)} | none on element |
| [src/components/pages/admin/UserManagementPage.tsx:295](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/admin/UserManagementPage.tsx:295>) | Set PIN | {() => {                               setPinUser(u);                               setNewPin("");                               setConfirmPin("");                             }} | none on element |
| [src/components/pages/admin/UserManagementPage.tsx:366](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/admin/UserManagementPage.tsx:366>) | Cancel | {() => setPinUser(null)} | none on element |
| [src/components/pages/admin/UserManagementPage.tsx:369](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/admin/UserManagementPage.tsx:369>) | Save PIN | {handleResetPin} | none on element |

### Validation / persistence / feedback call sites

| Source | Call | Arguments (source expression) |
| --- | --- | --- |
| [src/components/pages/admin/UserManagementPage.tsx:100](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/admin/UserManagementPage.tsx:100>) | toast | { title: "User status updated", kind: "success" } |
| [src/components/pages/admin/UserManagementPage.tsx:102](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/admin/UserManagementPage.tsx:102>) | toast | { title: e instanceof Error ? e.message : "Unable to update user", kind: "error" } |
| [src/components/pages/admin/UserManagementPage.tsx:114](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/admin/UserManagementPage.tsx:114>) | toast | { title: `Assigned ${planCode} plan successfully`, kind: "success" } |
| [src/components/pages/admin/UserManagementPage.tsx:116](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/admin/UserManagementPage.tsx:116>) | toast | { title: e instanceof Error ? e.message : "Unable to assign plan", kind: "error" } |
| [src/components/pages/admin/UserManagementPage.tsx:126](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/admin/UserManagementPage.tsx:126>) | toast | { title: "PIN must be 4–8 digits", kind: "error" } |
| [src/components/pages/admin/UserManagementPage.tsx:130](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/admin/UserManagementPage.tsx:130>) | toast | { title: "Choose a less common PIN", kind: "error" } |
| [src/components/pages/admin/UserManagementPage.tsx:134](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/admin/UserManagementPage.tsx:134>) | toast | { title: "PIN confirmation does not match", kind: "error" } |
| [src/components/pages/admin/UserManagementPage.tsx:140](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/admin/UserManagementPage.tsx:140>) | toast | { title: `PIN updated for @${pinUser.username}`, description: res.mustChangePin ? "User will be asked to change PIN on next login." : "Share the temporary PIN securely with the user.", kind: "success", } |
| [src/components/pages/admin/UserManagementPage.tsx:149](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/admin/UserManagementPage.tsx:149>) | setConfirmPin | "" |
| [src/components/pages/admin/UserManagementPage.tsx:151](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/admin/UserManagementPage.tsx:151>) | toast | { title: e instanceof Error ? e.message : "Unable to reset PIN", kind: "error" } |
| [src/components/pages/admin/UserManagementPage.tsx:301](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/admin/UserManagementPage.tsx:301>) | setConfirmPin | "" |
| [src/components/pages/admin/UserManagementPage.tsx:362](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/admin/UserManagementPage.tsx:362>) | setConfirmPin | e.target.value.replace(/\D/g, "").slice(0, 8) |

## PlanManagement: /admin/plans

| Audit dimension | Observed implementation / assessment |
| --- | --- |
| 1-4 Identity, group, purpose, status | Admin. Platform plan definitions and feature quotas. Implemented for current personal/platform scope, partial against the agency brief; page state audited. |
| 5 Source | [src/components/pages/admin/PlanManagementPage.tsx](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/admin/PlanManagementPage.tsx>) |
| 6-8 Data source, APIs, stores | Dedicated admin PHP controllers over SQL. Source selectors: See imported store and child components. Exact imports below. |
| 9-10 UI sections and forms | "Plan Management"; {editing ? `Edit Plan: ${editing.name}` : "New Plan"} |
| 11-12 Available actions and behavior | 7 source action definitions. Read/create/update pricing/limits; actual paid gateway lifecycle is not certified. Full handler/disabled/visibility inventory is linked below. |
| 13 Form fields | 12 field/control declarations in this file. Exact labels, binding props and validation hooks listed below; child dialog declarations are in the global inventory. |
| 14 Validation | Inline checks and/or delegated dialog validation. Frontend validation is not authoritative; backend transaction validation is stronger than other collection schemas (B14/B37). |
| 15 Empty state | Empty/no-data branches or delegated empty-state components exist. Fresh-user/seeded data were used, not every table empty condition. |
| 16 Loading state | Loading/busy state references exist; exact disabled bindings in action inventory. Slow-network/failure injection was selective, not every control. |
| 17 Error state | Error/validation handling references exist. Repository fallback can turn server rejection into apparent success (B01); presence of toast code is not proof of correct failure semantics. |
| 18 Role permissions | Platform admin server role. No separate super-admin/finance-manager/auditor permission model. |
| 19 PIN requirement | PIN-related control/reference appears; use API and security report for which sensitive action is actually reauthenticated. |
| 20 Audit creation | No direct page audit writer found; repository/server helpers may log some operations. No complete per-action audit proof. |
| 21 Mobile behavior | 10 widths sampled; maximum root overflow 0px. This is layout screening, not every dialog/table state. |
| 22 Bugs found | B10, B33 |
| 23 Missing features | No agency lifecycle/role/close-period equivalence is implied by this personal-finance view. |
| 24 Suggested improvements | Resolve listed integrity/security defects first; then add typed contracts, explicit failure states and complete mobile/action coverage before agency expansion. |
| 25 Existing test coverage | Authenticated route rendered in custom browser audit. Textually related test files: tests/local-phase-09-ui-browser-e2e.mjs. These references are candidates, not measured branch coverage. |
| 26 Missing test coverage | Every enabled/disabled action, negative field, cancel/PIN failure, server error, reload persistence, role matrix and populated large-data state has not been executed. Add these to the release matrix, including child dialogs. |

### Data and service wiring

| Import | Bindings |
| --- | --- |
| @/lib/cloud/saasClient | { getAdminPlans, saveAdminPlan } |
| @/store/uiStore | { useUIStore } |

### Fields and controls

| Source | Control | Label / props |
| --- | --- | --- |
| [src/components/pages/admin/PlanManagementPage.tsx:139](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/admin/PlanManagementPage.tsx:139>) | Field | {"label":"\"Plan name\"","required":"true"} |
| [src/components/pages/admin/PlanManagementPage.tsx:140](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/admin/PlanManagementPage.tsx:140>) | Input | {"value":"{activeForm.name}","onChange":"{(e) => {\n                  const name = e.target.value;\n                  setActiveForm({\n                    ...activeForm,\n                    name,\n                    code: activeForm.id ? activeForm.code : autoCode(name),\n                  } as PlanRow);\n                }}","placeholder":"\"e.g. Pro Monthly\""} |
| [src/components/pages/admin/PlanManagementPage.tsx:153](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/admin/PlanManagementPage.tsx:153>) | Field | {"label":"\"Plan code\"","required":"true","hint":"\"Uppercase letters, numbers and _ only\""} |
| [src/components/pages/admin/PlanManagementPage.tsx:154](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/admin/PlanManagementPage.tsx:154>) | Input | {"value":"{activeForm.code}","onChange":"{(e) =>\n                  setActiveForm({\n                    ...activeForm,\n                    code: e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, \"\"),\n                  } as PlanRow)\n                }","placeholder":"\"e.g. PRO_MONTHLY\""} |
| [src/components/pages/admin/PlanManagementPage.tsx:165](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/admin/PlanManagementPage.tsx:165>) | Field | {"label":"\"Price (₹ INR)\"","required":"true"} |
| [src/components/pages/admin/PlanManagementPage.tsx:166](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/admin/PlanManagementPage.tsx:166>) | Input | {"type":"\"number\"","min":"\"0\"","step":"\"0.01\"","value":"{activeForm.price_inr}","onChange":"{(e) => setActiveForm({ ...activeForm, price_inr: e.target.value } as PlanRow)}","placeholder":"\"299.00\""} |
| [src/components/pages/admin/PlanManagementPage.tsx:175](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/admin/PlanManagementPage.tsx:175>) | Field | {"label":"\"Billing interval\""} |
| [src/components/pages/admin/PlanManagementPage.tsx:176](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/admin/PlanManagementPage.tsx:176>) | Select | {"value":"{activeForm.billing_interval}","onValueChange":"{(v) =>\n                  setActiveForm({ ...activeForm, billing_interval: v as \"monthly\" \| \"yearly\" } as PlanRow)\n                }"} |
| [src/components/pages/admin/PlanManagementPage.tsx:191](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/admin/PlanManagementPage.tsx:191>) | Field | {"label":"\"Trial days\"","hint":"\"0 = no trial\""} |
| [src/components/pages/admin/PlanManagementPage.tsx:192](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/admin/PlanManagementPage.tsx:192>) | Input | {"type":"\"number\"","min":"\"0\"","max":"\"90\"","value":"{activeForm.trial_days}","onChange":"{(e) => setActiveForm({ ...activeForm, trial_days: +e.target.value } as PlanRow)}"} |
| [src/components/pages/admin/PlanManagementPage.tsx:200](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/admin/PlanManagementPage.tsx:200>) | Field | {"label":"\"Description (optional)\""} |
| [src/components/pages/admin/PlanManagementPage.tsx:201](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/admin/PlanManagementPage.tsx:201>) | Input | {"value":"{activeForm.description ?? \"\"}","onChange":"{(e) => setActiveForm({ ...activeForm, description: e.target.value } as PlanRow)}","placeholder":"\"Short description for users\""} |

### Action trace

| Source | Label | Handler | Disabled |
| --- | --- | --- | --- |
| [src/components/pages/admin/PlanManagementPage.tsx:111](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/admin/PlanManagementPage.tsx:111>) | Refresh | {load} | none on element |
| [src/components/pages/admin/PlanManagementPage.tsx:121](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/admin/PlanManagementPage.tsx:121>) | Retry | {load} | none on element |
| [src/components/pages/admin/PlanManagementPage.tsx:138](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/admin/PlanManagementPage.tsx:138>) | (icon/dynamic) | {handleSubmit} | none on element |
| [src/components/pages/admin/PlanManagementPage.tsx:208](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/admin/PlanManagementPage.tsx:208>) | (icon/dynamic) | {(v) => setActiveForm({ ...activeForm, is_active: v ? 1 : 0 } as PlanRow)} | none on element |
| [src/components/pages/admin/PlanManagementPage.tsx:220](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/admin/PlanManagementPage.tsx:220>) | {editing ? "Update plan" : "Create plan"} | parent/trigger | none on element |
| [src/components/pages/admin/PlanManagementPage.tsx:225](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/admin/PlanManagementPage.tsx:225>) | Cancel | {() => setEditing(null)} | none on element |
| [src/components/pages/admin/PlanManagementPage.tsx:276](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/admin/PlanManagementPage.tsx:276>) | Edit | {() => setEditing({ ...p })} | none on element |

### Validation / persistence / feedback call sites

| Source | Call | Arguments (source expression) |
| --- | --- | --- |
| [src/components/pages/admin/PlanManagementPage.tsx:75](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/admin/PlanManagementPage.tsx:75>) | toast | { title: "Name and code are required", kind: "warning" } |
| [src/components/pages/admin/PlanManagementPage.tsx:79](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/admin/PlanManagementPage.tsx:79>) | toast | { title: "Price must be a valid number", kind: "warning" } |
| [src/components/pages/admin/PlanManagementPage.tsx:84](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/admin/PlanManagementPage.tsx:84>) | saveAdminPlan | { ...(payload.id ? { id: payload.id } : {}), code: payload.code, name: payload.name, description: payload.description ?? "", price_inr: String(Number(payload.price_inr).toFixed(2)), billing_interval: payload.billing_interval, trial_days: Number(payload.trial_days), is_active: payload.is_active, } |
| [src/components/pages/admin/PlanManagementPage.tsx:94](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/admin/PlanManagementPage.tsx:94>) | toast | { title: editing ? "Plan updated" : "Plan created", kind: "success" } |
| [src/components/pages/admin/PlanManagementPage.tsx:99](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/admin/PlanManagementPage.tsx:99>) | toast | { title: e instanceof Error ? e.message : "Failed to save plan", kind: "error" } |

## SubscriptionManagement: /admin/subscriptions

| Audit dimension | Observed implementation / assessment |
| --- | --- |
| 1-4 Identity, group, purpose, status | Admin. Platform subscriptions and manual adjustment. Implemented for current personal/platform scope, partial against the agency brief; disabled feature-state audited. |
| 5 Source | [src/components/pages/admin/SubscriptionManagementPage.tsx](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/admin/SubscriptionManagementPage.tsx>) |
| 6-8 Data source, APIs, stores | Dedicated admin PHP controllers over SQL. Source selectors: bg, text, dot, status, display_name, username, plan_code, plan_name, id, started_at, trial_ends_at, expires_at, amount_inr, latest_payment_status, failed_webhook_count, scheduled_plan_id, scheduled_change_at. Exact imports below. |
| 9-10 UI sections and forms | "Subscription Management" |
| 11-12 Available actions and behavior | 4 source action definitions. Feature-gated in this runtime; manual extend/cancel APIs exist, not recurring client billing. Full handler/disabled/visibility inventory is linked below. |
| 13 Form fields | 2 field/control declarations in this file. Exact labels, binding props and validation hooks listed below; child dialog declarations are in the global inventory. |
| 14 Validation | Inline checks and/or delegated dialog validation. Frontend validation is not authoritative; backend transaction validation is stronger than other collection schemas (B14/B37). |
| 15 Empty state | Empty/no-data branches or delegated empty-state components exist. Fresh-user/seeded data were used, not every table empty condition. |
| 16 Loading state | Loading/busy state references exist; exact disabled bindings in action inventory. Slow-network/failure injection was selective, not every control. |
| 17 Error state | Error/validation handling references exist. Repository fallback can turn server rejection into apparent success (B01); presence of toast code is not proof of correct failure semantics. |
| 18 Role permissions | Platform admin server role. No separate super-admin/finance-manager/auditor permission model. |
| 19 PIN requirement | PIN-related control/reference appears; use API and security report for which sensitive action is actually reauthenticated. |
| 20 Audit creation | No direct page audit writer found; repository/server helpers may log some operations. No complete per-action audit proof. |
| 21 Mobile behavior | 10 widths sampled; maximum root overflow 0px. This is layout screening, not every dialog/table state. |
| 22 Bugs found | B10, B33 |
| 23 Missing features | No agency lifecycle/role/close-period equivalence is implied by this personal-finance view. |
| 24 Suggested improvements | Resolve listed integrity/security defects first; then add typed contracts, explicit failure states and complete mobile/action coverage before agency expansion. |
| 25 Existing test coverage | Authenticated route rendered in custom browser audit. Textually related test files: tests/local-phase-09-ui-browser-e2e.mjs. These references are candidates, not measured branch coverage. |
| 26 Missing test coverage | Every enabled/disabled action, negative field, cancel/PIN failure, server error, reload persistence, role matrix and populated large-data state has not been executed. Add these to the release matrix, including child dialogs. |

### Data and service wiring

| Import | Bindings |
| --- | --- |
| @/lib/cloud/saasClient | { adminSubscriptionAction, getAdminSubscriptions } |

### Fields and controls

| Source | Control | Label / props |
| --- | --- | --- |
| [src/components/pages/admin/SubscriptionManagementPage.tsx:156](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/admin/SubscriptionManagementPage.tsx:156>) | Input | {"className":"\"pl-8\"","placeholder":"\"Search by user or plan…\"","value":"{search}","onChange":"{(e) => setSearch(e.target.value)}"} |
| [src/components/pages/admin/SubscriptionManagementPage.tsx:163](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/admin/SubscriptionManagementPage.tsx:163>) | Select | {"value":"{statusFilter}","onValueChange":"{(v) => setStatusFilter(v as StatusFilter)}"} |

### Action trace

| Source | Label | Handler | Disabled |
| --- | --- | --- | --- |
| [src/components/pages/admin/SubscriptionManagementPage.tsx:136](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/admin/SubscriptionManagementPage.tsx:136>) | Refresh | {load} | none on element |
| [src/components/pages/admin/SubscriptionManagementPage.tsx:146](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/admin/SubscriptionManagementPage.tsx:146>) | Retry | {load} | none on element |
| [src/components/pages/admin/SubscriptionManagementPage.tsx:247](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/admin/SubscriptionManagementPage.tsx:247>) | Extend 30d | {() => mutateSubscription(s.id, "manual_extend")} | none on element |
| [src/components/pages/admin/SubscriptionManagementPage.tsx:255](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/admin/SubscriptionManagementPage.tsx:255>) | Cancel | {() => mutateSubscription(s.id, "cancel")} | none on element |

### Validation / persistence / feedback call sites

| Source | Call | Arguments (source expression) |
| --- | --- | --- |


## FeatureFlags: /admin/flags

| Audit dimension | Observed implementation / assessment |
| --- | --- |
| 1-4 Identity, group, purpose, status | Admin. Platform feature switches. Implemented for current personal/platform scope, partial against the agency brief; page state audited. |
| 5 Source | [src/components/pages/admin/FeatureFlagsPage.tsx](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/admin/FeatureFlagsPage.tsx>) |
| 6-8 Data source, APIs, stores | Dedicated admin PHP controllers over SQL. Source selectors: See imported store and child components. Exact imports below. |
| 9-10 UI sections and forms | "Feature Flags"; Flags |
| 11-12 Available actions and behavior | 4 source action definitions. Read/save flags; server authorization must not depend on UI hiding. Full handler/disabled/visibility inventory is linked below. |
| 13 Form fields | 0 field/control declarations in this file. Exact labels, binding props and validation hooks listed below; child dialog declarations are in the global inventory. |
| 14 Validation | Inline checks and/or delegated dialog validation. Frontend validation is not authoritative; backend transaction validation is stronger than other collection schemas (B14/B37). |
| 15 Empty state | Empty/no-data branches or delegated empty-state components exist. Fresh-user/seeded data were used, not every table empty condition. |
| 16 Loading state | Loading/busy state references exist; exact disabled bindings in action inventory. Slow-network/failure injection was selective, not every control. |
| 17 Error state | Error/validation handling references exist. Repository fallback can turn server rejection into apparent success (B01); presence of toast code is not proof of correct failure semantics. |
| 18 Role permissions | Platform admin server role. No separate super-admin/finance-manager/auditor permission model. |
| 19 PIN requirement | PIN-related control/reference appears; use API and security report for which sensitive action is actually reauthenticated. |
| 20 Audit creation | No direct page audit writer found; repository/server helpers may log some operations. No complete per-action audit proof. |
| 21 Mobile behavior | 10 widths sampled; maximum root overflow 0px. This is layout screening, not every dialog/table state. |
| 22 Bugs found | B10, B33 |
| 23 Missing features | No agency lifecycle/role/close-period equivalence is implied by this personal-finance view. |
| 24 Suggested improvements | Resolve listed integrity/security defects first; then add typed contracts, explicit failure states and complete mobile/action coverage before agency expansion. |
| 25 Existing test coverage | Authenticated route rendered in custom browser audit. Textually related test files: tests/local-phase-09-ui-browser-e2e.mjs. These references are candidates, not measured branch coverage. |
| 26 Missing test coverage | Every enabled/disabled action, negative field, cancel/PIN failure, server error, reload persistence, role matrix and populated large-data state has not been executed. Add these to the release matrix, including child dialogs. |

### Data and service wiring

| Import | Bindings |
| --- | --- |
| @/lib/cloud/saasClient | { getAdminFeatureFlags, saveAdminFeatureFlags } |
| @/store/uiStore | { useUIStore } |

### Fields and controls

| Source | Control | Label / props |
| --- | --- | --- |


### Action trace

| Source | Label | Handler | Disabled |
| --- | --- | --- | --- |
| [src/components/pages/admin/FeatureFlagsPage.tsx:84](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/admin/FeatureFlagsPage.tsx:84>) | Refresh | {load} | none on element |
| [src/components/pages/admin/FeatureFlagsPage.tsx:87](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/admin/FeatureFlagsPage.tsx:87>) | {saved ? ( <> <CheckCircle2 className="h-4 w-4 text-income" /> Saved </> ) : ( <> <Save className="h-4 w-4" /> Save changes </> )} | {handleSave} | {loading} |
| [src/components/pages/admin/FeatureFlagsPage.tsx:106](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/admin/FeatureFlagsPage.tsx:106>) | Retry | {load} | none on element |
| [src/components/pages/admin/FeatureFlagsPage.tsx:155](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/admin/FeatureFlagsPage.tsx:155>) | (icon/dynamic) | {(v) => setFlags((f) => ({ ...f, [key]: v }))} | none on element |

### Validation / persistence / feedback call sites

| Source | Call | Arguments (source expression) |
| --- | --- | --- |
| [src/components/pages/admin/FeatureFlagsPage.tsx:59](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/admin/FeatureFlagsPage.tsx:59>) | saveAdminFeatureFlags | flags |
| [src/components/pages/admin/FeatureFlagsPage.tsx:60](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/admin/FeatureFlagsPage.tsx:60>) | setSaved | true |
| [src/components/pages/admin/FeatureFlagsPage.tsx:61](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/admin/FeatureFlagsPage.tsx:61>) | setSaved | false |
| [src/components/pages/admin/FeatureFlagsPage.tsx:62](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/admin/FeatureFlagsPage.tsx:62>) | toast | { title: "Feature flags saved", kind: "success" } |
| [src/components/pages/admin/FeatureFlagsPage.tsx:64](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/admin/FeatureFlagsPage.tsx:64>) | toast | { title: e instanceof Error ? e.message : "Failed to save flags", kind: "error" } |

## BrandingSettings: /admin/branding

| Audit dimension | Observed implementation / assessment |
| --- | --- |
| 1-4 Identity, group, purpose, status | Admin. Product identity, support and legal configuration. Implemented for current personal/platform scope, partial against the agency brief; page state audited. |
| 5 Source | [src/components/pages/admin/BrandingSettingsPage.tsx](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/admin/BrandingSettingsPage.tsx>) |
| 6-8 Data source, APIs, stores | Dedicated admin PHP controllers over SQL. Source selectors: See imported store and child components. Exact imports below. |
| 9-10 UI sections and forms | "Branding Settings"; Identity; Contact &amp; Legal |
| 11-12 Available actions and behavior | 5 source action definitions. Refresh/save settings; test seed still has example support content. Full handler/disabled/visibility inventory is linked below. |
| 13 Form fields | 4 field/control declarations in this file. Exact labels, binding props and validation hooks listed below; child dialog declarations are in the global inventory. |
| 14 Validation | Inline checks and/or delegated dialog validation. Frontend validation is not authoritative; backend transaction validation is stronger than other collection schemas (B14/B37). |
| 15 Empty state | No explicit empty-state primitive found in this file; inspect children. Fresh-user/seeded data were used, not every table empty condition. |
| 16 Loading state | Loading/busy state references exist; exact disabled bindings in action inventory. Slow-network/failure injection was selective, not every control. |
| 17 Error state | Error/validation handling references exist. Repository fallback can turn server rejection into apparent success (B01); presence of toast code is not proof of correct failure semantics. |
| 18 Role permissions | Platform admin server role. No separate super-admin/finance-manager/auditor permission model. |
| 19 PIN requirement | PIN-related control/reference appears; use API and security report for which sensitive action is actually reauthenticated. |
| 20 Audit creation | No direct page audit writer found; repository/server helpers may log some operations. No complete per-action audit proof. |
| 21 Mobile behavior | 10 widths sampled; maximum root overflow 0px. This is layout screening, not every dialog/table state. |
| 22 Bugs found | B10, B29, B36 |
| 23 Missing features | No agency lifecycle/role/close-period equivalence is implied by this personal-finance view. |
| 24 Suggested improvements | Resolve listed integrity/security defects first; then add typed contracts, explicit failure states and complete mobile/action coverage before agency expansion. |
| 25 Existing test coverage | Authenticated route rendered in custom browser audit. Textually related test files: tests/local-phase-09-ui-browser-e2e.mjs. These references are candidates, not measured branch coverage. |
| 26 Missing test coverage | Every enabled/disabled action, negative field, cancel/PIN failure, server error, reload persistence, role matrix and populated large-data state has not been executed. Add these to the release matrix, including child dialogs. |

### Data and service wiring

| Import | Bindings |
| --- | --- |
| @/lib/cloud/saasClient | { getAdminSettings, saveAdminSettings } |
| @/store/uiStore | { useUIStore } |

### Fields and controls

| Source | Control | Label / props |
| --- | --- | --- |
| [src/components/pages/admin/BrandingSettingsPage.tsx:131](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/admin/BrandingSettingsPage.tsx:131>) | Field | {"key":"{f.key}","label":"{f.label}","hint":"{f.hint}"} |
| [src/components/pages/admin/BrandingSettingsPage.tsx:132](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/admin/BrandingSettingsPage.tsx:132>) | Input | {"type":"{f.type}","value":"{fields[f.key]}","onChange":"{(e) => setFields((prev) => ({ ...prev, [f.key]: e.target.value }))}","placeholder":"{f.placeholder}"} |
| [src/components/pages/admin/BrandingSettingsPage.tsx:166](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/admin/BrandingSettingsPage.tsx:166>) | Field | {"key":"{f.key}","label":"{f.label}","hint":"{f.hint}"} |
| [src/components/pages/admin/BrandingSettingsPage.tsx:167](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/admin/BrandingSettingsPage.tsx:167>) | Input | {"type":"{f.type}","value":"{fields[f.key]}","onChange":"{(e) => setFields((prev) => ({ ...prev, [f.key]: e.target.value }))}","placeholder":"{f.placeholder}"} |

### Action trace

| Source | Label | Handler | Disabled |
| --- | --- | --- | --- |
| [src/components/pages/admin/BrandingSettingsPage.tsx:89](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/admin/BrandingSettingsPage.tsx:89>) | Refresh | {load} | none on element |
| [src/components/pages/admin/BrandingSettingsPage.tsx:92](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/admin/BrandingSettingsPage.tsx:92>) | {saved ? ( <> <CheckCircle2 className="h-4 w-4 text-income" /> Saved </> ) : ( <> <Save className="h-4 w-4" /> Save changes </> )} | {handleSave} | none on element |
| [src/components/pages/admin/BrandingSettingsPage.tsx:111](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/admin/BrandingSettingsPage.tsx:111>) | Retry | {load} | none on element |
| [src/components/pages/admin/BrandingSettingsPage.tsx:181](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/admin/BrandingSettingsPage.tsx:181>) | Privacy → {fields.privacy_url} | parent/trigger | none on element |
| [src/components/pages/admin/BrandingSettingsPage.tsx:186](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/admin/BrandingSettingsPage.tsx:186>) | Terms → {fields.terms_url} | parent/trigger | none on element |

### Validation / persistence / feedback call sites

| Source | Call | Arguments (source expression) |
| --- | --- | --- |
| [src/components/pages/admin/BrandingSettingsPage.tsx:71](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/admin/BrandingSettingsPage.tsx:71>) | saveAdminSettings | fields as Record<string, unknown> |
| [src/components/pages/admin/BrandingSettingsPage.tsx:72](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/admin/BrandingSettingsPage.tsx:72>) | setSaved | true |
| [src/components/pages/admin/BrandingSettingsPage.tsx:73](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/admin/BrandingSettingsPage.tsx:73>) | setSaved | false |
| [src/components/pages/admin/BrandingSettingsPage.tsx:74](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/admin/BrandingSettingsPage.tsx:74>) | toast | { title: "Branding settings saved", kind: "success" } |
| [src/components/pages/admin/BrandingSettingsPage.tsx:76](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/admin/BrandingSettingsPage.tsx:76>) | toast | { title: e instanceof Error ? e.message : "Failed to save settings", kind: "error" } |

## Internal collections and contract coverage

All 37 cloud contracts are listed below. Required-fields metadata is a declaration, not proof that the PHP server enforces it (B14). Dexie local names and wire names differ for EMI/contribution collections.

| Wire collection | Dexie store | Required fields | Hot fields | Migration metadata |
| --- | --- | --- | --- | --- |
| accounts | accounts | id, userId, createdAt, updatedAt, isDeleted, version, name, type, openingBalancePaise, color, icon | source_device_id, payload_hash, schema_version, account_id | merge-by-id, soft-delete-aware |
| cards | cards | id, userId, createdAt, updatedAt, isDeleted, version, nickname, bank, last4, type, color | source_device_id, payload_hash, schema_version, card_id, account_id | merge-by-id, soft-delete-aware |
| categories | categories | id, userId, createdAt, updatedAt, isDeleted, version, name, appliesTo, icon, color | source_device_id, payload_hash, schema_version, category_id | merge-by-id, soft-delete-aware |
| transactions | transactions | id, userId, createdAt, updatedAt, isDeleted, version, date, type, amountPaise, paymentMode, businessOrPersonal | amount_paise, txn_local_date, txn_month, txn_type, payment_mode, category_id, account_id, card_id, loan_id, goal_id, udhari_id, business_or_personal, source_device_id, payload_hash, schema_version | merge-by-id, soft-delete-aware |
| budgets | budgets | id, userId, createdAt, updatedAt, isDeleted, version, period, year, categoryId, limitPaise, mode | source_device_id, payload_hash, schema_version, category_id, amount_paise | merge-by-id, soft-delete-aware |
| loans | loans | id, userId, createdAt, updatedAt, isDeleted, version, lender, loanType, principalPaise, startDate, tenureMonths, annualInterestRate, emiDueDay, status | source_device_id, payload_hash, schema_version, loan_id, account_id, card_id, amount_paise | merge-by-id, soft-delete-aware |
| emis | emiPayments | id, userId, createdAt, updatedAt, isDeleted, version, loanId, dueDate, amountPaise, status | source_device_id, payload_hash, schema_version, loan_id, amount_paise, txn_local_date, txn_month | merge-by-id, soft-delete-aware |
| udhari | udhari | id, userId, createdAt, updatedAt, isDeleted, version, personName, type, amountPaise, givenDate, status | source_device_id, payload_hash, schema_version, udhari_id, amount_paise, txn_local_date | merge-by-id, soft-delete-aware |
| udhariSettlements | udhariSettlements | id, userId, createdAt, updatedAt, isDeleted, version, udhariId, date, amountPaise | source_device_id, payload_hash, schema_version, udhari_id, account_id, amount_paise, txn_local_date, txn_month | merge-by-id, soft-delete-aware |
| investments | investments | id, userId, createdAt, updatedAt, isDeleted, version, name, type, startDate, frequency, amountPaise, status | source_device_id, payload_hash, schema_version, account_id, amount_paise | merge-by-id, soft-delete-aware |
| savingsContribs | savingsContributions | id, userId, createdAt, updatedAt, isDeleted, version, investmentId, date, amountPaise | source_device_id, payload_hash, schema_version, amount_paise, txn_local_date, txn_month | merge-by-id, soft-delete-aware |
| goals | goals | id, userId, createdAt, updatedAt, isDeleted, version, title, goalType, targetAmountPaise, targetDate, startedAt, savedAmountPaise, priority, icon, color, status | source_device_id, payload_hash, schema_version, goal_id, account_id, amount_paise | merge-by-id, soft-delete-aware |
| goalContribs | goalContributions | id, userId, createdAt, updatedAt, isDeleted, version, goalId, date, amountPaise | source_device_id, payload_hash, schema_version, goal_id, account_id, amount_paise, txn_local_date, txn_month | merge-by-id, soft-delete-aware |
| reminders | reminders | id, userId, createdAt, updatedAt, isDeleted, version, kind, title, dueDate, done | source_device_id, payload_hash, schema_version, txn_local_date | merge-by-id, soft-delete-aware |
| alerts | alerts | id, userId, createdAt, updatedAt, isDeleted, version, kind, severity, title, message, dismissed, triggeredAt | source_device_id, payload_hash, schema_version | merge-by-id, soft-delete-aware |
| recurringRules | recurringRules | id, userId, createdAt, updatedAt, isDeleted, version, title, type, amountPaise, paymentMode, frequency, nextRunDate, active | source_device_id, payload_hash, schema_version, category_id, account_id, amount_paise, txn_type, payment_mode | merge-by-id, soft-delete-aware |
| attachments | attachments | id, userId, createdAt, updatedAt, isDeleted, version, fileName, mimeType, sizeBytes, linkedType, linkedId | source_device_id, payload_hash, schema_version | merge-by-id, soft-delete-aware |
| auditLogs | auditLogs | id, userId, createdAt, updatedAt, isDeleted, version, action, entity, detail | source_device_id, payload_hash, schema_version | merge-by-id, soft-delete-aware |
| snapshots | snapshots | id, userId, createdAt, updatedAt, isDeleted, version, periodKey | source_device_id, payload_hash, schema_version, txn_month | merge-by-id, soft-delete-aware |
| exportHistory | exportHistory | id, userId, createdAt, updatedAt, isDeleted, version, scope, format, fileName, rowCount | source_device_id, payload_hash, schema_version | merge-by-id, soft-delete-aware |
| settings | settings | id, userId, createdAt, updatedAt, isDeleted, version, theme, financialYearStartMonth, dateFormat, currency | source_device_id, payload_hash, schema_version | merge-by-id, soft-delete-aware |
| transferLinks | transferLinks | id, userId, createdAt, updatedAt, isDeleted, version, fromAccountId, toAccountId, amountPaise, transactionId, status | source_device_id, payload_hash, schema_version, account_id, amount_paise | merge-by-id, soft-delete-aware |
| creditLimitGroups | creditLimitGroups | id, userId, createdAt, updatedAt, isDeleted, version, name, totalLimitPaise | source_device_id, payload_hash, schema_version, amount_paise | merge-by-id, soft-delete-aware |
| cardStatements | cardStatements | id, userId, createdAt, updatedAt, isDeleted, version, cardId, cycleStartDate, cycleEndDate, statementDate, openingBalancePaise, closingBalancePaise, minimumDuePaise, retailSpendPaise, feesPaise, interestPaise, paymentsPaise, creditsPaise, status | source_device_id, payload_hash, schema_version, card_id, amount_paise, txn_local_date, txn_month | merge-by-id, soft-delete-aware |
| cardPaymentAllocations | cardPaymentAllocations | id, userId, createdAt, updatedAt, isDeleted, version, cardId, transactionId, amountPaise, allocatedAt | source_device_id, payload_hash, schema_version, card_id, amount_paise | merge-by-id, soft-delete-aware |
| cardEmiPlans | cardEmiPlans | id, userId, createdAt, updatedAt, isDeleted, version, cardId, purchaseTransactionIds, principalPaise, annualRateBps, tenureMonths, emiPaise, startDate, status, scheduleStrategy, calculationVersion | source_device_id, payload_hash, schema_version, card_id, amount_paise, txn_local_date | merge-by-id, soft-delete-aware |
| cardEmiInstallments | cardEmiInstallments | id, userId, createdAt, updatedAt, isDeleted, version, planId, installmentNo, dueDate, emiPaise, principalPaise, interestPaise, feePaise, taxPaise, status, source | source_device_id, payload_hash, schema_version, amount_paise, txn_local_date, txn_month | merge-by-id, soft-delete-aware |
| obligations | obligations | id, userId, createdAt, updatedAt, isDeleted, version, sourceType, sourceId, occurrenceKey, title, dueDate, amountPaise, status | source_device_id, payload_hash, schema_version, category_id, account_id, card_id, amount_paise, txn_local_date, txn_month | merge-by-id, soft-delete-aware |
| sinkingFunds | sinkingFunds | id, userId, createdAt, updatedAt, isDeleted, version, name, targetPaise, targetDate | source_device_id, payload_hash, schema_version, category_id, amount_paise, txn_local_date | merge-by-id, soft-delete-aware |
| households | households | id, userId, createdAt, updatedAt, isDeleted, version, name, defaultCurrency | source_device_id, payload_hash, schema_version | merge-by-id, soft-delete-aware |
| householdMembers | householdMembers | id, userId, createdAt, updatedAt, isDeleted, version, householdId, role, displayName | source_device_id, payload_hash, schema_version | merge-by-id, soft-delete-aware |
| householdPermissions | householdPermissions | id, userId, createdAt, updatedAt, isDeleted, version, householdId, memberId, canViewTransactions, canEditTransactions, canViewBalances | source_device_id, payload_hash, schema_version | merge-by-id, soft-delete-aware |
| fixedIncomeAssets | fixedIncomeAssets | id, userId, createdAt, updatedAt, isDeleted, version, name, type, principalPaise, rateBps, startDate, maturityDate, status | source_device_id, payload_hash, schema_version, account_id, amount_paise | merge-by-id, soft-delete-aware |
| insurancePolicies | insurancePolicies | id, userId, createdAt, updatedAt, isDeleted, version, name, insurer, premiumPaise, premiumDueDay, coveragePaise, status | source_device_id, payload_hash, schema_version, amount_paise | merge-by-id, soft-delete-aware |
| assetValuations | assetValuations | id, userId, createdAt, updatedAt, isDeleted, version, assetType, label, valuePaise, asOfDate | source_device_id, payload_hash, schema_version, amount_paise, txn_local_date | merge-by-id, soft-delete-aware |
| importSources | importSources | id, userId, createdAt, updatedAt, isDeleted, version, name, kind | source_device_id, payload_hash, schema_version | merge-by-id, soft-delete-aware |
| reconciliationMatches | reconciliationMatches | id, userId, createdAt, updatedAt, isDeleted, version, leftTransactionId, status, confidence | source_device_id, payload_hash, schema_version | merge-by-id, soft-delete-aware |
