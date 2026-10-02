# 47-parent graph

Release run `20261003-personal-os-0048c3`. Parent ids are the September 30 inventory surfaces in `TASK_LEDGER.json` (P01–P47). Child ids are the September 30 traceability rows (`Pnn-entry`, `Pnn-write`, `Pnn-readback`, `Pnn-negative`, and any extra row in that file). They are not from `PERSONAL_47_REQUIREMENTS.json`. That pack file is absent from the checkout.

September 30 inventory status is history. October 2 lane P notes are attached on the parent id the lane text uses. This run does not promote those notes to PASS.

| Parent | Area | Inventory surface | Inventory status | Child ids | Lane P note | Current code path |
| --- | --- | --- | --- | --- | --- | --- |
| P01 | Shell | App shell and history routing | Shipped | P01-entry, P01-write, P01-readback, P01-negative | Shell routes present, including audit and subscription commands. Not recertified here. | src/App.tsx; src/lib/navRoutes.ts; src/components/layout/AppShell.tsx; src/store/navStore.ts |
| P02 | Shell | Desktop sidebar | Shipped | P02-entry, P02-write, P02-readback, P02-negative | Desktop sidebar routes present. Not recertified here. | src/components/layout/Sidebar.tsx |
| P03 | Shell | Mobile bar | Partial | P03-entry, P03-write, P03-readback, P03-negative, P03-physical-device | Mobile More is in Sidebar.tsx. Not recertified here. | src/components/layout/Sidebar.tsx (MobileNav) |
| P04 | Shell | Command palette and quick add | Partial | P04-entry, P04-write, P04-readback, P04-negative | Command palette routes present. Not recertified here. | src/components/layout/CommandPalette.tsx; src/components/layout/Header.tsx; src/components/forms/QuickAddDialog.tsx |
| P05 | Shell | Personal language pack | Schema only | P05-entry, P05-write, P05-readback, P05-negative | English and Gujarati personal message modules exist. Lane P did not re-check every long label. | src/i18n/messages/en.ts; src/i18n/messages/gu.ts; src/i18n/messages/personalChrome.ts; src/i18n/messages/personalScreens.ts; src/i18n/useMessages.ts |
| P06 | Dashboard | Month snapshot, charts, recent activity | Shipped | P06-entry, P06-write, P06-readback, P06-negative | Month snapshot present. Not recertified here. | src/components/pages/DashboardPage.tsx; src/services/financeKpiEngine.ts |
| P07 | Dashboard | Modes basic, normal, premium | Shipped | P07-entry, P07-write, P07-readback, P07-negative | Basic, normal, and premium selections present. | src/components/pages/DashboardPage.tsx; src/components/pages/SettingsPage.tsx |
| P08 | Dashboard | Modes essential, family, wealth | Partial | P08-entry, P08-write, P08-readback, P08-negative | Essential, family, and wealth are not the same section list. | src/components/pages/DashboardPage.tsx |
| P09 | Dashboard | Payday cashflow panel | Shipped | P09-entry, P09-write, P09-readback, P09-negative | Payday panel present for basic, essential, and family. | src/components/finance/PaydayCashflowPanel.tsx |
| P10 | Ledger | Transactions | Shipped | P10-entry, P10-write, P10-readback, P10-negative | Ledger present. Not rebuilt. | src/components/pages/TransactionsPage.tsx; src/components/forms/TransactionForm.tsx |
| P11 | Ledger | Income and expense pages | Shipped | P11-entry, P11-write, P11-readback, P11-negative | Income and expense pages present. | src/components/pages/IncomePage.tsx; src/components/pages/ExpensesPage.tsx |
| P12 | Ledger | Tags on a transaction | Shipped | P12-entry, P12-write, P12-readback, P12-negative | Transaction tags present. | src/components/forms/TransactionForm.tsx |
| P13 | Ledger | Categories | Partial | P13-entry, P13-write, P13-readback, P13-negative | Parent category totals present. Category parents were not rebuilt. | src/components/pages/CategoriesPage.tsx |
| P14 | Ledger | Transfers | Partial | P14-entry, P14-write, P14-readback, P14-negative | Preserved: one transfer link, credit leg is not income, fee is feeTransactionId only. | src/services/statements (transfer link); transferLinks in src/config/syncContracts.ts |
| P15 | Planning | Budgets | Shipped | P15-entry, P15-write, P15-readback, P15-negative | Budgets present. | src/components/pages/BudgetsPage.tsx |
| P16 | Planning | Goals | Shipped | P16-entry, P16-write, P16-readback, P16-negative | Goals present. Earmark does not insert a cash movement. | src/components/pages/GoalsPage.tsx |
| P17 | Planning | Envelope budgeting | Not built | P17-entry, P17-write, P17-readback, P17-negative | Envelopes present. Do not rebuild. September 30 inventory still said not built. | src/components/pages/EnvelopesPage.tsx; src/components/planning/EnvelopeReservations.tsx |
| P18 | Planning | Sinking funds | Schema only | P18-entry, P18-write, P18-readback, P18-negative | Sinking-fund reservations present. Do not rebuild. | src/services/sinkingFundEngine.ts |
| P19 | Planning | Recurring rules | Schema only | P19-entry, P19-write, P19-readback, P19-negative | Recurring editor present. Do not rebuild. September 30 inventory still said schema only. | src/components/planning/RecurringRuleDialog.tsx |
| P20 | Planning | Bill calendar | Partial | P20-entry, P20-write, P20-readback, P20-negative | Custom due is saved. Unobserved card minimum stays null. | src/components/pages/BillCalendarPage.tsx; src/services/obligationEngine.ts |
| P21 | Planning | Reminders | Schema only | P21-entry, P21-write, P21-readback, P21-negative | Create, snooze, and complete stay in-app. No push. | src/components/pages/BillCalendarPage.tsx; reminders collection |
| P22 | Accounts and cards | Accounts | Shipped | P22-entry, P22-write, P22-readback, P22-negative | Accounts present. | src/components/pages/AccountsPage.tsx |
| P23 | Accounts and cards | Credit and debit cards | Shipped | P23-entry, P23-write, P23-readback, P23-negative | Cards present. | src/components/pages/CardsPage.tsx |
| P24 | Accounts and cards | Card EMI | Partial | P24-entry, P24-write, P24-readback, P24-negative | Card EMI converts an existing purchase and does not post it again. | src/components/pages/CardsPage.tsx (card EMI) |
| P25 | Accounts and cards | Card statements and payment allocations | Schema only | P25-entry, P25-write, P25-readback, P25-negative | Lane P calls this shared card limit. The inventory id is card statements. Conflict, not remapped. | Inventory: card statements. Lane text: shared card limit on CardsPage. See conflict register. |
| P26 | Accounts and cards | Loans and EMI | Shipped | P26-entry, P26-write, P26-readback, P26-negative | Loans present. | src/components/pages/LoansPage.tsx |
| P27 | Accounts and cards | Udhari and advances | Shipped | P27-entry, P27-write, P27-readback, P27-negative | Udhari present. | src/components/pages/UdhariPage.tsx |
| P28 | Wealth | Investments | Shipped | P28-entry, P28-write, P28-readback, P28-negative | Investments present. | src/components/pages/InvestmentsPage.tsx |
| P29 | Wealth | FD, RD, insurance, valuations | Shipped | P29-entry, P29-write, P29-readback, P29-negative | Wealth tabs present. | src/components/pages/WealthHubPage.tsx |
| P30 | Household | Household page | Partial | P30-entry, P30-write, P30-readback, P30-negative | Local invite stores a member and a code on the inviter profile. A second login cannot accept it. | src/components/pages/HouseholdDashboardPage.tsx; src/services/personalBookWorkflows.ts issueHouseholdInvite |
| P31 | Household | Household permissions | Schema only | P31-entry, P31-write, P31-readback, P31-negative | A local viewer cannot change household records. Cross-login revoke was not run. | src/services/personalBookWorkflows.ts; php/helpers/household_auth.php |
| P32 | Insights | Reports | Shipped | P32-entry, P32-write, P32-readback, P32-negative | Reports present. | src/components/pages/ReportsPage.tsx |
| P33 | Insights | Suggestions and persona | Shipped | P33-entry, P33-write, P33-readback, P33-negative | Suggestions present. | src/components/pages/SuggestionsPage.tsx |
| P34 | Insights | Alerts | Partial | P34-entry, P34-write, P34-readback, P34-negative | Alert switches present. Do not rebuild. | src/components/pages/AlertsPage.tsx; src/services/alertsEngine.ts |
| P35 | Insights | Reconciliation | Partial | P35-entry, P35-write, P35-readback, P35-negative | Reconciliation confirm, reject, and unmatch present. Do not rebuild. | src/components/pages/ReconciliationPage.tsx |
| P36 | Data | CSV and spreadsheet import | Shipped | P36-entry, P36-write, P36-readback, P36-negative | CSV import present. | src/components/pages/ImportPage.tsx |
| P37 | Data | PDF bank and card statements | Shipped | P37-entry, P37-write, P37-readback, P37-negative, P37-bank-layouts | Real-bank PDF certification was not run. Layouts stay unverified. | src/components/statements/StatementImportDialog.tsx; php/config/statement_layouts.json |
| P38 | Data | JSON backup and repair | Shipped | P38-entry, P38-write, P38-readback, P38-negative | JSON backup of personal stores present. | src/components/pages/ExportPage.tsx; src/components/pages/AuditPage.tsx |
| P39 | Data | Account Aggregator | Schema only | P39-entry, P39-write, P39-readback, P39-negative, P39-live-aa | Licensed Account Aggregator access was not run. | src/services/aa (local provider, not a licensed aggregator) |
| P40 | Data | Attachments and snapshots | Schema only | P40-entry, P40-write, P40-readback, P40-negative | File content is stored with SHA-256, or the save throws. Another profile cannot read the blob. | src/services/personalBookWorkflows.ts createAttachmentMetadata |
| P41 | System | Settings | Shipped | P41-entry, P41-write, P41-readback, P41-negative | Settings present. | src/components/pages/SettingsPage.tsx |
| P42 | System | Profile, PIN, lock | Shipped | P42-entry, P42-write, P42-readback, P42-negative | Profile and PIN present. | src/components/pages/ProfilePage.tsx |
| P43 | System | Cloud sync | Partial | P43-entry, P43-write, P43-readback, P43-negative | Cloud allowlist names personal collections. A second-client sync roundtrip was not run. | src/config/syncContracts.ts; src/services/syncOutbox.ts |
| P44 | System | Audit log | Shipped | P44-entry, P44-write, P44-readback, P44-negative | Audit shell present. | src/components/pages/AuditPage.tsx |
| P45 | System | Subscription | Partial | P45-entry, P45-write, P45-readback, P45-negative, P45-live-razorpay | Subscription page present when checkout is off. | src/components/pages/SubscriptionPage.tsx |
| P46 | System | Plan feature gates | Partial | P46-entry, P46-write, P46-readback, P46-negative | Plan caps present. Server enforcement is still mostly client-side except the monthly transaction cap. | src/services plan caps; php/helpers/cloud_write.php monthly transaction cap |
| P47 | System | Admin portal | Shipped | P47-entry, P47-write, P47-readback, P47-negative | Admin shell present. | src/components/pages/admin |

Parent count: 47.
Parents with no September 30 child row: none.
