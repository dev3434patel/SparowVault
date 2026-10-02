# Personal OS — current functionality

**Date:** 30 Sep 2026  
**Weighted complete:** 70% (25 shipped, 13 partial, 8 schema-only, 1 not built)  
**Entry:** `src/main.tsx` mounts theme, then `App`. `src/App.tsx` sends `/company` to the company app and `/admin` to the admin shell. Everyone else gets the personal shell.

Books are IndexedDB `sparowvault_v1`. Types are `src/types/index.ts`. Repositories are `src/repositories/index.ts`. Currency on the profile type is INR only.

## Routes

| Path | Page | Sidebar |
|---|---|---|
| `/` | `src/components/pages/DashboardPage.tsx` | Dashboard |
| `/transactions` | `TransactionsPage.tsx` | Transactions |
| `/income` | `IncomePage.tsx` | Income |
| `/expenses` | `ExpensesPage.tsx` | Expenses |
| `/categories` | `CategoriesPage.tsx` | Categories |
| `/budgets` | `BudgetsPage.tsx` | Budgets |
| `/goals` | `GoalsPage.tsx` | Goals |
| `/savings` | `WealthHubPage.tsx` | Savings & Investments |
| `/accounts` | `AccountsPage.tsx` | Accounts |
| `/cards` | `CardsPage.tsx` | Cards |
| `/loans` | `LoansPage.tsx` | Loans & EMI |
| `/udhari` | `UdhariPage.tsx` | Udhari & Advances |
| `/bills` | `BillCalendarPage.tsx` | Bill calendar |
| `/household` | `HouseholdDashboardPage.tsx` | Household |
| `/reports` | `ReportsPage.tsx` | Reports |
| `/reconciliation` | `ReconciliationPage.tsx` | Reconciliation |
| `/suggestions` | `SuggestionsPage.tsx` | Suggestions |
| `/alerts` | `AlertsPage.tsx` | Alerts Center |
| `/export` | `ExportPage.tsx` | Export Center |
| `/import` | `ImportPage.tsx` | Import Center |
| `/settings` | `SettingsPage.tsx` | Settings |
| `/profile` | `ProfilePage.tsx` | Profile & Security |
| `/audit` | `AuditPage.tsx` | Audit & Backup |
| `/subscription` | `SubscriptionPage.tsx` | Subscription, hidden unless Razorpay is on |

`InvestmentsPage.tsx` is a tab inside Wealth Hub, not its own route. Unknown paths open the dashboard (`pathToNav` in `src/lib/navRoutes.ts`).

Admin routes, only when the path starts with `/admin`: `/admin`, `/admin/plans`, `/admin/subscriptions`, `/admin/flags`, `/admin/branding`, `/admin/users`.

Auth screens that are not nav pages: `CloudAuth.tsx`, `LockScreen.tsx`, `RequiredPinChange.tsx`. `ProfileLogin.tsx` exists and is not mounted.

Sidebar groups in `Sidebar.tsx`: Overview, Ledger, Planning, Money, Insights, Data, System, plus a footer link to Company Books. Mobile bar (`MobileNav.tsx`): Home, Ledger, Budget, Goals, Reports.

---

## Shell — 63%

### App shell and history routing — Shipped

`AppShell.tsx` maps the active nav key to a page. Navigation uses `history.pushState`. The company app is a separate tree and is not rendered inside this shell.

**Remains:** nothing on the shell itself.

**Code:** `src/App.tsx`, `src/lib/navRoutes.ts`, `src/components/layout/AppShell.tsx`, `src/store/navStore.ts`.

### Desktop sidebar — Shipped

Every personal route above is in the desktop sidebar except that Export disappears when the cloud flag `flags.exports` is false. If the URL is still `/export`, the page component still exists.

**Remains:** flags for goals, investments, udhari, import, and recurring do not hide their pages. Only `flags.exports` is read by the sidebar, plus the Razorpay env flag for Subscription.

**Code:** `src/components/layout/Sidebar.tsx`.

### Mobile bar — Partial

Five destinations: Home, Ledger, Budget, Goals, Reports.

**Remains:** Cards, loans, udhari, bills, household, accounts, import, export, settings, and the rest are not on the mobile bar. They are still reachable by URL or the desktop sidebar.

**Code:** `src/components/layout/MobileNav.tsx`.

### Command palette and quick add — Partial

Ctrl or Cmd+K opens `CommandPalette.tsx`. It jumps to dashboard, transactions, income, expenses, budgets, goals, accounts, cards, loans, udhari, savings, bills, household, reconciliation, reports, suggestions, export, import, alerts, and settings. It can start quick-add income, expense, or transfer, and it can search transactions.

The header also has search, a pending-sync badge, PDF statement upload, Quick Add (income, expense, transfer), the alerts bell, theme, and a profile menu (profile, settings, lock, logout).

**Remains:** the palette does not list categories, profile, audit, or subscription.

**Code:** `CommandPalette.tsx`, `Header.tsx`, `QuickAddDialog.tsx`.

### Personal language pack — Schema only

`src/i18n/messages/en.ts` has dashboard KPI labels, nav group names, and mode names. `useMessages()` returns English only. No personal page imports it. Sidebar, forms, and pages are hardcoded English. Company English/Gujarati is a different product (`src/company/i18n`).

**Remains:** wire the message file into pages, or treat hardcoded English as the product.

---

## Dashboard — 88%

### Month snapshot, charts, recent activity — Shipped

Greeting, mode switch, and an empty state (“Start with three basics”). On a non-basic mode the page shows true income, consumption expense, operating surplus, bank and cash, cashflow survival, emergency-fund months, goal risk, an income-vs-expense chart, a top-categories pie, budget bars, goal progress, upcoming EMI / cards / udhari, the top suggestion, recent transactions, and alerts. KPI cards open `ExplainMetricDrawer.tsx`.

**Code:** `DashboardPage.tsx`, `src/services/financeKpiEngine.ts`, `cashflowSurvivalEngine.ts`, `emergencyFundEngine.ts`, `SafeChart.tsx`.

### Modes basic, normal, premium — Shipped

Settings can select these three.

- **basic:** three KPIs (money left, safe daily, bills checklist) plus the payday panel. The rest of the snapshot is hidden.
- **normal:** full snapshot, no payday panel.
- **premium:** full snapshot plus net worth, debt-to-assets, tax-flagged count, and business vs personal spend.

**Code:** `DashboardPage.tsx`, `SettingsPage.tsx`.

### Modes essential, family, wealth — Partial

The dashboard dropdown lists them. Essential and family add the payday panel on top of the full snapshot. Wealth uses the same layout as normal.

**Remains:** Settings cannot select these three. They are not separate products.

### Payday cashflow panel — Shipped

Shown for basic, essential, and family. **Code:** `src/components/finance/PaydayCashflowPanel.tsx`.

---

## Ledger — 80%

### Transactions — Shipped

Search and filters by type, payment mode, category, account, and date. Add, edit, copy, soft-delete, and bulk delete. A contribution-return can be recorded on a personal expense.

Transaction types in `src/constants/index.ts`:

income, expense, transfer, loan disbursement, EMI payment, loan prepayment, card payment, udhari given, udhari received, udhari collected, udhari repaid, udhari write-off, savings, goal withdrawal, investment, investment sell, refund, adjustment, card EMI conversion, card EMI charge.

**Code:** `TransactionsPage.tsx`, `src/components/forms/TransactionForm.tsx`, `transactionRepo`.

### Income and expense pages — Shipped

Same ledger, locked to `fixedType="income"` or `fixedType="expense"`. **Code:** `IncomePage.tsx`, `ExpensesPage.tsx`.

### Tags on a transaction — Shipped

The form can mark need / want / luxury, fixed / variable, business vs personal, and a tax flag. Payment modes: cash, UPI, bank transfer, cheque, debit card, credit card, wallet, auto debit, other, plus custom modes saved in Settings.

Business vs personal is used again on reports and on the premium dashboard (`businessPersonalSplit.ts`).

### Categories — Partial

Create and edit income, expense, or mixed categories. Icon, color, tax flag, GST flag, archive, and a merge / cleanup panel. Default expense and income names ship in `src/constants/index.ts` (food, groceries, rent, utilities, salary, freelance, and the rest of those lists).

**Remains:** the save always writes `parentId: null`. There is no parent picker, so categories are a flat list.

**Code:** `CategoriesPage.tsx`, `CategoryCleanupPanel.tsx`, `categoryRepo`.

### Transfers — Partial

Transfer is a real transaction type. Intents include self-transfer, cash withdrawal, cash deposit, and transfer from own account (`transactionIntent.ts`). Quick Add can start a transfer. Account balances are derived, so a transfer moves money between accounts in the ledger math.

**Remains:** Dexie table `transferLinks` and `transferLinkRepo` exist. Nothing in `src` calls `transferLinkRepo`.

---

## Planning — 42%

### Budgets — Shipped

Monthly and annual planned amount vs spent, remaining, and a projected month-end. Checkboxes for carry-forward and rollover. The smart projection uses recurring rules when any exist.

**Code:** `BudgetsPage.tsx`, `smartBudgetEngine.ts`, `budgetRepo`.

### Goals — Shipped

Types: phone, laptop, bike, car, travel, marriage, education, emergency fund, tax reserve, home down payment, gadgets, festive, custom. Two ways to contribute:

- **Earmark** — marks progress and does not move cash.
- **Funded transfer** — posts a transfer. Net worth stays the same.

Priority tiers come from `goalEngine.ts`.

**Remains:** the admin flag `goals_enabled` does not hide this page.

**Code:** `GoalsPage.tsx`, `goalRepo`, `goalContribRepo`.

### Envelope budgeting — Not built

There is no envelope type, page, or route. Budgets are category planned amounts.

### Sinking funds — Schema only

Dexie table `sinkingFunds`, `sinkingFundRepo`, and `sinkingFundEngine.ts` exist. No page calls them. The words “Sinking Fund” on the Wealth screen are an investment bucket type (`INVESTMENT_TYPE_LABELS`), not this table.

### Recurring rules — Schema only

Table `recurringRules` is read by the bill list, the smart budget projection, and the alerts engine. A JSON backup restore can bring rules in (`ImportPage.tsx`).

**Remains:** no page calls `recurringRepo.create`. There is no editor. The admin flag label “Enable recurring transaction scheduling” is display text on the flags page. The personal shell does not read it.

### Bill calendar — Partial

Route `/bills`. Shows totals for the next 7 days and the next 30 days, then a list. The list is computed in memory from monthly recurring rules and loan EMIs (`materializeRecurringObligations`, `materializeLoanEmiObligations`). `obligationRepo` is not used to store them.

**Remains:** it is not a month grid. Obligation types in `src/types/index.ts` also include card statement, card EMI, udhari, insurance, and custom. The page does not materialize those. Non-monthly rules are skipped.

**Code:** `BillCalendarPage.tsx`, `obligationEngine.ts`.

### Reminders — Schema only

Table `reminders` is loaded, wiped, and restored with backup. There is no reminder screen.

---

## Accounts and cards — 78%

### Accounts — Shipped

Create, edit, mark inactive, and delete when nothing references the account (`refIntegrity.ts`). Fields: name, type, institution, opening balance, color. The list shows a derived balance and totals.

Types: cash, bank, UPI wallet, savings, current, wallet, debit-linked, petty cash, family pool, custom.

**Remains:** cash and wallet are account types. There is no separate cash page or wallet page.

**Code:** `AccountsPage.tsx`, `accountBalanceEngine.ts`, `accountRepo`.

### Credit and debit cards — Shipped

Tabs for credit and debit. Create, edit, archive or delete. Fields: nickname, bank, last 4, linked account, limit, statement day, due day, APR, annual fee, reward note. The page shows utilization, amount due, linked movements, and a repair queue (link a card, convert UPI, mark legacy). Paying the card bill is transaction type `cc_payment`.

**Remains:** shared credit-limit groups are engine and test code only (`sharedLimitMatrix.test.ts`). The table `creditLimitGroups` has no screen. See the schema-only row below.

**Code:** `CardsPage.tsx`, `cardEngine.ts`, `cardRepo`.

### Card EMI — Partial

The EMI button opens `CardEmiSimulatorDialog.tsx`. It compares tenures 3 through 24 and labels the result estimated. It calls `compareCardEmiTenures` and does not save a plan.

**Remains:** tables `cardEmiPlans` and `cardEmiInstallments` and their repos are never called from the UI. Transaction types `card_emi_conversion` and `card_emi_charge` exist on the ledger type list. The simulator does not create those rows.

**Code:** `cardEmiEngine.ts`. Tests: `cardEmiEngine`, `cardEmiLifecycle.t126`, `issuerSchedulePrecedence`.

### Card statements and payment allocations — Schema only

Tables and repos: `cardStatements`, `cardPaymentAllocations`, `creditLimitGroups`. PDF statement import is a separate flow (Data section). It does not write these tables. There is no statement-close screen, no allocation screen, and no shared-limit screen.

Engines exist and are tested: `cardStatementEngine.ts`, `cardPaymentAllocator.ts`.

### Loans and EMI — Shipped

Create, edit, delete. Types: home, personal, vehicle, education, business, gold, informal, custom. Interest: reducing, flat, interest-only, custom. Lifecycle: fresh, existing, or ongoing imported. Prepayment when the loan allows it. Totals: outstanding, monthly EMI, interest, active count. EMI rows live in `emiPayments`.

**Code:** `LoansPage.tsx`, `loanEngine.ts`, `loanPaymentSync.ts`, `loanRepo`, `emiRepo`.

### Udhari and advances — Shipped

Tabs: People, Entries, History. Receivable and payable. Settle with cash, which posts `udhari_collect` or `udhari_repay` and is not treated as income. Write-off posts an expense. The page can copy a WhatsApp reminder. Page text: informal lending, cash and receivable or payable move together.

**Remains:** admin flag `udhari` does not hide the page.

**Code:** `UdhariPage.tsx`, `udhariEngine.ts`, `udhariRepo`, `udhariSettlementRepo`.

---

## Wealth — 100%

Route `/savings`. Page title is the wealth hub.

### Investments — Shipped

Tab inside the hub. Types: SIP, PPF, FD, RD, emergency fund, sinking-fund bucket, tax reserve, recurring savings, gold, custom. Contribute and sell post ledger transactions.

**Remains:** admin flag `investments_enabled` is not read by the shell. The sinking-fund *bucket* here is not the unused `sinkingFunds` table.

**Code:** `WealthHubPage.tsx`, `InvestmentsPage.tsx`, `investmentRepo`, `savingsContribRepo`.

### FD, RD, insurance, valuations — Shipped

Separate tabs create fixed deposits and recurring deposits (`fixedIncomeAssetRepo`), insurance policies (`insurancePolicyRepo`), and manual valuations for gold, property, vehicle, and other (`assetValuationRepo`). Badges say the value is user-confirmed.

---

## Household — 33%

### Household page — Partial

Create one household. The page uses `households[0]`. Add members with role `partner`. The income, expense, and surplus cards call `calculateFinanceMonthKpis` on the signed-in user’s own month transactions.

**Remains:** the copy says a viewer cannot change household settings and that this is enforced on the server. The UI has no viewer role, no permission editor, no invite, and no second person’s books.

**Code:** `HouseholdDashboardPage.tsx`, `householdRepo`, `householdMemberRepo`.

### Household permissions — Schema only

Table `householdPermissions` and `householdPermissionRepo` have no callers.

---

## Insights — 75%

### Reports — Shipped

Personal reports, including the business vs personal split. If the plan flag `advanced_reports` is false, the page is the line “Upgrade plan to unlock advanced reports.”

**Code:** `ReportsPage.tsx`.

### Suggestions and persona — Shipped

Sections: urgent, save money, debt and cards, goals, bills, udhari, tax and review, history. Statuses: dismiss, viewed, useful, not useful, action taken, remind later. A persona coach can override the mode. An optional AI rewrite can rephrase a suggestion. The page states that the numbers stay in the calculation block. The dashboard shows the top suggestion.

**Code:** `SuggestionsPage.tsx`, `suggestionEngine.ts`, `suggestionSync.ts`, `suggestionAiExplain.ts`, `personaEngine.ts`, `adaptiveModeEngine.ts`, `aiSuggestionRepo`.

### Alerts — Partial

The engine runs when data loads. It can create alerts for: budget over, warn, projected, burn, and smart overrun; emergency fund low; safe daily danger; goal shortfall; fixed bill due; recurring expense spike; card overdue, due soon, due this week, over limit, utilization 30 / 50 / 80, minimum due; EMI overdue and due soon; udhari due today, large receivable, frequent borrow, payable, receivable; negative cashflow; low savings.

The alerts page shows severity counts and can dismiss, restore, delete, refresh, and jump through `linkHref`. The header drawer does the same.

Settings stores six switches: budget overruns, EMI and card due, udhari overdue, savings and emergency fund, unusual spend, duplicate transactions.

**Remains:** `alertsEngine.ts` reads `warningPreferences.udhariAlerts` only (around line 327). The other five switches are saved and not applied. There are no generated alert kinds for unusual spend or duplicates.

**Code:** `alertsEngine.ts`, `AlertsPage.tsx`, `AlertsDrawer.tsx`, `alertPriority.ts`, `alertRepo`.

### Reconciliation — Partial

Lists up to 20 orphan rows and 10 transfer suggestions. The account card is a count. The buttons call `setActive("transactions")` and show a toast.

**Remains:** the page does not write `reconciliationMatches`. `importSourceRepo` and `reconciliationMatchRepo` have no callers.

**Code:** `ReconciliationPage.tsx`.

---

## Data — 66%

### CSV and spreadsheet import — Shipped

Import Center accepts CSV, XLSX, and XLS. Column mapping, preview, and a template download.

**Code:** `ImportPage.tsx`.

### PDF bank and card statements — Shipped

Opened from the header. Pick a bank account or a credit card. PDF up to 20 MB. Modes: auto, force OCR (12-page cap), or text only. Review each row, set purpose (income, expense, transfer, refund, contribution, card payment), confirm duplicate suggestions, save a draft (password is not stored), download the review, then import. Rows can be marked personal or business. Issuer list is `php/config/statement_banks.json` (38 issuers plus Other).

**Remains:** imported rows are ledger transactions. They do not become `cardStatements` rows, and the Reconciliation page does not confirm them.

**Code:** `StatementImportDialog.tsx`, `src/services/statements/` (`parser.ts`, `ocr.ts`, `pdf.ts`, `classification.ts`, `matching.ts`, `draft.ts`, `issuer.ts`, `geometry.ts`, `reviewState.ts`, `exportBundle.ts`).

### JSON backup and repair — Shipped

Import Center can merge a JSON backup and keep existing rows. It includes a Repair Center (`importExportRepair.ts`).

Export Center, when `effectiveFeatures.exports` is not false: a CA workbook (the page claims 16 sheets), module sheets for transactions, accounts, cards, loans, udhari, goals, and investments, a full JSON backup that asks for PIN re-login (`cloudLogin`), and export history.

**Remains:** if exports are off, Export Center is the single line “This feature is not available on your current plan.” The Audit page title says backup. The backup file action is on Export, not on Audit.

**Code:** `ExportPage.tsx`, `ImportPage.tsx`, `exportHistoryRepo`.

### Account Aggregator — Schema only

`ImportSource.kind` includes `"aa_ready"` in `src/types/index.ts`. There is no Account Aggregator screen. `importSourceRepo` has no callers.

### Attachments and snapshots — Schema only

`attachmentRepo` and `snapshotRepo` have no callers. `planFeatureGate.ts` lists attachment storage as a plan limit. No page checks that limit.

---

## System — 79%

### Settings — Shipped

Theme, financial year start month, date format, dashboard mode (basic / normal / premium), chart colors, budget warning and critical thresholds, the six alert toggles, custom payment modes, re-seed demo data (`demoData.ts`), and wipe the profile by typing `DELETE {username}`.

**Remains:** five of the six alert toggles do not change the engine. See Alerts.

**Code:** `SettingsPage.tsx`, `settingsRepo`.

### Profile, PIN, lock — Shipped

Cloud sign-in and register. PIN length 4 to 8 with weak-PIN checks. Lock screen, forced PIN change, logout. An admin account that opens `/` is sent to `/admin`.

Profile edits display details, phone, avatar, security question, PIN, and recovery.

**Remains:** `ProfileLogin.tsx` is not imported by `App.tsx`.

**Code:** `CloudAuth.tsx`, `LockScreen.tsx`, `RequiredPinChange.tsx`, `ProfilePage.tsx`.

### Cloud sync — Partial

Mutations are queued in Dexie table `syncMutations`. `App.tsx` replays the outbox on load, when the browser goes online, and every 30 seconds. `SyncOutboxBadge.tsx` shows the pending count, retry, a download of `sparowvault-pending-changes.json`, and conflict or rejected review.

The server shape is generic rows: `cloud_users` and `cloud_collection_rows`. The collection name list is `src/config/syncContracts.ts` and includes vNext tables the UI does not edit.

**Remains:** the badge’s collection map (about lines 13–19 of `SyncOutboxBadge.tsx`) covers core ledger tables. It does not cover households, FD, card EMI, obligations, or sinking funds.

### Audit log — Shipped

Filter, search, and export the log rows. **Code:** `AuditPage.tsx`, `auditRepo`. The full data backup is Export Center.

### Subscription — Partial

Lists plans, starts Razorpay checkout, confirms payment, and can schedule a downgrade.

**Remains:** the route and the sidebar item exist only when `VITE_ENABLE_RAZORPAY` is `"true"`. Otherwise `/subscription` renders the dashboard.

**Code:** `SubscriptionPage.tsx`, gate in `AppShell.tsx`.

### Plan feature gates — Partial

`planFeatureGate.ts` defines: exports, advanced reports, CA reports, AI suggestions, max accounts, max cards, max loans, max goals, max transactions per period, max exports, max AI calls, attachment storage.

**Remains:** pages check `effectiveFeatures.exports` and `effectiveFeatures.advanced_reports` only. `isFeatureUnlocked` is not imported by pages.

### Admin portal — Shipped

`AdminAppShell.tsx`. Pages: dashboard, plan management, subscription management (hidden if Razorpay is off), feature flags, branding, users.

Flag labels on the flags page include cloud sync, subscriptions, Razorpay, registration, maintenance, demo, export, import, goals, investments, udhari, and recurring.

**Remains:** the personal sidebar reads `flags.exports` and the Razorpay env var. The other flags do not hide personal pages.

**Code:** `src/components/pages/admin/`.

---

## Dexie tables

Client database `SparowVaultDB`, versions 1–5, `src/db/database.ts`.

| Table | Used by a personal page? |
|---|---|
| users, sessions, settings | Auth, settings, profile |
| accounts, cards, categories, transactions | Accounts, cards, categories, ledger |
| budgets, goals, goalContributions | Budgets, goals |
| loans, emiPayments | Loans |
| udhari, udhariSettlements | Udhari |
| investments, savingsContributions | Wealth |
| fixedIncomeAssets, insurancePolicies, assetValuations | Wealth FD/RD, insurance, valuations |
| households, householdMembers | Household (local only) |
| alerts, aiSuggestions, exportHistory, auditLogs | Alerts, suggestions, export, audit |
| recurringRules | Read by bills, budgets, alerts. No editor |
| reminders | Backup load and restore only |
| obligations | Computed in the bill list. Not stored |
| transferLinks | No callers |
| creditLimitGroups, cardStatements, cardPaymentAllocations | No callers |
| cardEmiPlans, cardEmiInstallments | No callers |
| sinkingFunds | No callers |
| householdPermissions | No callers |
| attachments, snapshots | No callers |
| importSources, reconciliationMatches | No callers |
| syncMutations | Sync outbox |

`FinancialEvent` and `FinancialEffect` are derived in memory by `financeEventBuilder.ts`. They are not Dexie tables.

## Tests

No tests under `src/components/` (no page tests).

Engine tests in `src/services/__tests__` (32 files) cover balances, transfers, cards, card EMI math, loans, udhari, budgets, goals, cashflow, emergency fund, obligations, KPIs, suggestions, persona, plan gates, and business vs personal split.

`tests/unit` (21 files) covers statements, import/export repair, sync outbox, category color, and related contracts.

No dedicated test file for the household UI, the reconciliation page, the sinking-fund engine, settings, profile, auth UI, personal i18n, or the bill-calendar page. Household appears as one case inside `acceptanceMatrix.test.ts`.

## Personal gaps, short list

1. No recurring-rule editor. The bill list only projects monthly rules and loan EMIs.
2. Card EMI does not save. Statements, allocations, and shared limits are tables only.
3. Household is a label plus the current user’s own month.
4. Reconciliation does not confirm a match.
5. Five alert toggles are stored and ignored.
6. Sinking funds, reminders, attachments, snapshots, transfer links, and Account Aggregator have no screen.
7. Envelope budgeting does not exist.
8. Personal i18n is an unused English file.
