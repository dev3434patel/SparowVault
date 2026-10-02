# Company books — current functionality

**Date:** 30 Sep 2026  
**Weighted complete:** 58% (16 shipped, 8 partial, 5 schema-only, 7 not built)  
**Entry:** `/company` is a separate app. Router is `src/company/CompanyApp.tsx`. Paths are `src/company/routes.ts`. There is no React Router. Unknown paths under `/company` become the dashboard.

The server is the book. PHP under `php/helpers/company/` posts vouchers, builds bills, runs reports, and applies purpose rules. The browser calls `api/company/` (25 PHP endpoints). Client preview is not the source of truth. Posting sends a `previewHash`. Money is integer paise (`src/company/types/index.ts`).

Active company id is `localStorage` key `sv:company:activeCompanyId`. Logout clears `sv:company:*` only.

Core SQL: `sql/migrations/20260923_company_core.sql` (34 `company_*` tables). Later migrations add indexes, reversal foreign keys, and nullable `bill_ref_id` for on-account allocations:

- `sql/migrations/20260923_company_indexes.sql`
- `sql/migrations/20260923_company_reversal_fk.sql`
- `sql/migrations/20260923_company_bill_on_account.sql`
- `sql/migrations/20260924_company_perf_indexes.sql`

`docs/company/COMPANY_ROUTE_PAGE_MAP.md` is labeled architecture from before implementation. Do not treat it as the live product. The live map is this file plus `routes.ts`.

Accounting certification from 23 Sep 2026 (`docs/company/SPAROWVAULT_COMPANY_OPEN_GAPS.md`) says P0 and P1 are closed. Documents, recurring, the personal-to-company bridge, and org subscriptions are explicitly not product-active. That matches the sidebar: none of those have a live nav item.

## Routes

| Path | Key | Page |
|---|---|---|
| `/company` | gateway | One ACTIVE membership opens the dashboard. None opens create. More than one opens select. |
| `/company/login` | login | `LoginPage.tsx` |
| `/company/select` | select | `SelectCompanyPage.tsx` |
| `/company/create` | create | `CreateCompanyPage.tsx` |
| `/company/invite/accept` | invite-accept | `InviteAcceptPage.tsx` — tells the user token redeem is not active |
| `/company/app` | dashboard | `DashboardPage.tsx` |
| `/company/app/reports/day-book` | day-book | Day book inside `ReportsHubPage.tsx` |
| `/company/app/parties` | parties | `PartiesPage.tsx` |
| `/company/app/parties/new` | parties | Same page, create form open |
| `/company/app/parties/:id` | party-detail | `PartyDetailPage.tsx` |
| `/company/app/ledgers` | ledgers | `LedgersPage.tsx` |
| `/company/app/cash-bank` | cash-bank | Same page, cash and bank only |
| `/company/app/vouchers` | vouchers | `VouchersPage.tsx` |
| `/company/app/vouchers/new` | voucher-new | `VoucherCreatePage.tsx` chooser |
| `/company/app/vouchers/:id` | voucher-detail | Detail inside `VouchersPage.tsx` |
| `/company/app/quick/received` | quick-received | `QuickReceivedPage.tsx` |
| `/company/app/quick/paid` | quick-paid | Same form, payment direction |
| `/company/app/quick/transfer` | quick-transfer | `QuickTransferPage.tsx` |
| `/company/app/quick/journal` | quick-journal | `QuickJournalPage.tsx` |
| `/company/app/receivables` | receivables | `ReceivablesPage.tsx` |
| `/company/app/payables` | payables | `PayablesPage.tsx` in the same file |
| `/company/app/reports` | reports | Hub of enabled reports only |
| `/company/app/reports/:reportKey` | report-view | `ReportViewPage` |
| `/company/app/masters/business-units` | masters-business-units | `MastersPage.tsx` |
| `/company/app/masters/areas` | masters-areas | same |
| `/company/app/masters/projects` | masters-projects | same |
| `/company/app/masters/cost-centres` | masters-cost-centres | same |
| `/company/app/masters/categories` | masters-categories | same |
| `/company/app/search` | search | `SearchPage.tsx` |
| `/company/app/users` | users | `users/UsersList.tsx` |
| `/company/app/approvals` | approvals | `ApprovalsPage.tsx` |
| `/company/app/settings` | settings | `SettingsPage.tsx` |
| `/company/app/audit` | audit | `AuditPage.tsx` |
| `/company/app/export` | export | `ExportPage.tsx` |

Branches exist as a tab on the masters page. Changing that tab does not change the URL.

## Sidebar

`COMPANY_SIDEBAR_NAV` in `routes.ts`. The sidebar does not filter items by permission.

| Group | Items |
|---|---|
| Overview | Dashboard, Day Book |
| Money | Money Received, Money Paid, Transfer, Journal, Cash & Bank |
| Parties | Parties, Receivables, Payables |
| Books | Vouchers, Ledgers |
| Business | Business Units, Projects, Areas, Cost Centres, Categories |
| Insights | Reports, Search |
| Control | Approvals, Users, Audit, Export, Settings |

Footer link: Personal Finance → `/`.

Header: company switcher, search, New menu, language EN/GU, approvals bell, logout.

Mobile bar: Home, Parties, an Add sheet (received, paid, transfer, new party), Bills (receivables), More (day book, reports, approvals, search, export, settings). Journal, cash and bank, payables, vouchers, ledgers, masters, users, and audit are not on the mobile bar.

New menu (`NewActionMenu.tsx`). An empty permissions array allows every action.

| Action | Permission |
|---|---|
| Money received | `create_receipt` |
| Money paid | `create_payment` |
| Transfer | `create_contra` |
| Journal | `create_journal` |
| New party | `manage_parties` |
| Receivables | `view_receivables` |
| Vouchers | `view_day_book` |

`PermissionGate` (a denial banner, not a hidden menu) is used on audit (`view_audit`), approvals (`approve_voucher`), export (`export_reports`), the period-lock section (`lock_period`), and users (`manage_users`). Dashboard, parties, vouchers, ledgers, cash and bank, quick entry, reports, search, and dimension masters are not wrapped.

---

## Access — 70%

### Login, select, create company — Shipped

Login is username and PIN through the same cloud login as personal. If the user is already signed in, login sends them to select.

Select lists memberships, sets the active company, links to create, and can log out. Exactly one ACTIVE membership opens the dashboard by itself.

Create is three steps: identity, financial-year start month and books start date, a chart-of-accounts preview from `DEFAULT_COA_SEED`, then `createWorkspace`. The server seeds the chart. The client only previews it.

**Code:** `LoginPage.tsx`, `SelectCompanyPage.tsx`, `CreateCompanyPage.tsx`, `src/company/store/companyStore.ts`, `src/company/services/coaSeed.ts`, `php/helpers/company/seed.php`.

### Invite by user id — Shipped

Users page lists memberships and invites an existing user id plus a role. Gated by `manage_users`. The member card is read-only.

**Remains:** the invite dropdown and the role guide omit owner and super-admin.

**Code:** `src/company/pages/users/UsersList.tsx`, `InviteUser.tsx`.

### Invite-token accept — Not built

`/company/invite/accept` renders an honest future screen. Token redeem is not product-active. The page links to select and login.

**Remains:** email or token invite.

**Code:** `InviteAcceptPage.tsx`.

### Roles — Partial

Types define `COMPANY_OWNER`, `SUPER_ADMIN`, `ACCOUNTANT`, `MANAGER`, `DATA_ENTRY`, `VIEWER`, `AUDITOR`.

The users page shows a static role blurb (`RoleManager.tsx`). It does not create or edit roles.

Permission keys in `src/company/types/domainCodes.ts` also include `create_purchase_sale`, `edit_own_voucher`, `edit_any_voucher`, `post_voucher`, `delete_draft`, `export_backup`, `manage_company`, `manage_dimensions`, `reopen_period`, `manage_approvals_settings`, and `manage_opening_balances`. Most of those are not wired to a page gate. Reopen uses a PIN dialog and does not check `reopen_period`. Opening balance does not check `manage_opening_balances`.

### English and Gujarati — Shipped

The header switches EN and GU. `src/company/i18n/` has both locales. Tests check fallback, persistence of the local choice, and en/gu key parity, plus a Gujarati dashboard smoke test.

**Remains:** a comment in `src/company/i18n/index.ts` says saving `preferred_locale` on the membership is future.

---

## Dashboard — 100%

### Company dashboard — Shipped

Periods: today, week, month, quarter, financial year.

Loads, with each widget allowed to fail on its own (`Promise.allSettled`): trial balance for cash and bank, receivable and payable bills (totals, overdue, due within days), day book (money in and out, plus the chart), profit and loss (income, expense, profit), approvals count, ageing, and the voucher list (recent vouchers and top parties).

Quick tiles: received, paid, transfer, new party, journal, reports. Empty state when there is no activity.

**Remains:** the page itself has no permission gate.

**Code:** `DashboardPage.tsx`, `src/company/hooks/useDashboardData.ts`, `components/dashboard/` (`KpiSection`, `AttentionSection`, `CashFlowChart`, `RecentVouchers`).

---

## Money entry — 75%

### Money received and money paid — Shipped

Fields: amount, date, party, cash or bank ledger, purpose, note. The server returns preview lines. Post sends `previewHash`. Paid is the same component with the payment direction.

**Remains:** the form has no business unit, project, area, category, reference, or attachment.

**Code:** `QuickReceivedPage.tsx`, `QuickPaidPage.tsx`, `src/company/services/purposeEngine.ts`, `api/company/voucher-preview.php`, `voucher-post.php`.

### Transfer and journal — Shipped

Transfer is a CONTRA between two cash or bank ledgers. Amount, note, a local balance check, purpose `CONTRA`.

Journal adds and removes debit and credit lines, shows a live balance, takes a note, and can carry `correctionOfVoucherId`. It posts a journal directly. It does not pick a purpose from the catalogue.

**Code:** `QuickTransferPage.tsx`, `QuickJournalPage.tsx`, `voucherBalance.ts`.

### Purpose catalogue — Shipped

`config/company-purpose-rules.json` is the source of truth. PHP `php/helpers/company/purpose.php` and the client engine both read it. Deprecated purposes are hidden from the quick lists.

Keys in the file:

LOAN_RECEIVED, CUSTOMER_PAYMENT, CAPITAL_INTRODUCED, ADVANCE_RETURNED, INTEREST_INCOME, PROPERTY_RECEIPT, FARMING_RECEIPT, SALE, OTHER_RECEIPT, VENDOR_REFUND_RECEIVED, LOAN_REPAYMENT, VENDOR_PAYMENT, ADVANCE_GIVEN, FARMER_ADVANCE, MONEY_LENT, OWNER_DRAWING, PURCHASE, EXPENSE, SALARY, FARMING_PAYMENT, PROPERTY_EXPENSE, PROPERTY_ADVANCE, PROPERTY_INVESTMENT, PROPERTY_DEPOSIT, OTHER_PAYMENT, CONTRA, OTHER, PROPERTY_PAYMENT, REFUND.

The server preview is what gets posted. Client tests check line-shape parity with PHP (`purposeParity.test.ts`).

### Voucher list and detail — Shipped

The list is the current calendar month. Type filter: RECEIPT, PAYMENT, CONTRA, JOURNAL, PURCHASE, SALE. Search by text.

Detail shows status and links to the reversal or the correction. Reverse asks for a PIN. Correct asks for a PIN and opens the journal with `correctionOfVoucherId`.

**Remains:** `VouchersPage.tsx` uses the month, the type, and the search box. It does not read `?partyId=`. Party detail still links to the voucher list with that query, so the link does not filter.

**Code:** `VouchersPage.tsx`, `api/company/voucher-item.php`, `voucher-reverse.php`.

### Purchase and sale as their own screens — Partial

PURCHASE and SALE appear in the voucher-type filter. Purposes SALE and PURCHASE exist on money received and money paid. `VoucherCreatePage.tsx` is a chooser: received, paid, transfer, journal, and “against a bill” for receivables (`view_receivables`) and payables (`view_payables`).

**Remains:** there is no invoice-style purchase screen or sale screen, no line items, and no tax lines.

### Dimensions on vouchers — Not built

Masters can be created (see Masters). Quick received, paid, transfer, and journal do not send a business unit, project, area, or cost centre. The empty state on masters says to use them on vouchers. That field is not on those forms.

Table `company_voucher_cost_allocations` has no page.

---

## Parties and bills — 88%

### Parties — Shipped

List searches by name, mobile, and role, and shows a net balance. Create asks for name, mobile, and roles. Party type is hardcoded PERSON.

Roles: CUSTOMER, VENDOR, LENDER, BORROWER, FARMER, EMPLOYEE, CONTRACTOR, PARTNER, LAND_OWNER, PROPERTY_PARTY, OTHER.

**Remains:** the list has no filters for category, tag, area, active flag, or balance band.

**Code:** `PartiesPage.tsx`, `api/company/parties.php`, `party-create.php`, `plainLanguageBalance.ts`.

### Party detail — Partial

Tabs:

- Overview — toggle roles.
- Ledger — party statement for about the last three months.
- Bills — open receivable and payable totals, with links.
- Vouchers — a link to the voucher list.

**Remains:** no documents tab. The voucher link’s `partyId` query is ignored (see voucher list). Tables `company_party_tags` and `company_party_tag_memberships` have no UI.

**Code:** `PartyDetailPage.tsx`, `party-item.php`.

### Receivables and payables — Shipped

Ageing buckets: not due, 0–15, 16–30, 31–60, 61–90, 90+. Bill table, overdue total, a header button to money received or money paid, and an on-account allocation dialog (amount cannot exceed outstanding, mutation id is sent).

**Remains:** there is no “create bill” form on these pages. Bills appear because posting created `company_bill_refs`. There is no invoice PDF.

**Code:** `ReceivablesPage.tsx`, `PayablesPage.tsx`, `api/company/bills.php`, `bill-allocate.php`, `php/helpers/company/posting_bills.php`.

### Party categories — Shipped

Create, rename, and delete when no party is assigned. Assign and unassign parties. The tab is visible with `view_dashboard` or `manage_parties`. Create, rename, and assign need `manage_parties`.

**Remains:** category is not a field on quick voucher entry, so a category report would have nothing to split even if it were enabled.

**Code:** `masters/CategoriesPanel.tsx`, `api/company/categories.php`.

---

## Books — 50%

### Ledgers and opening balance — Partial

The full ledgers page lists code, name, nature, and the cash/bank flag. Search works. Opening balance posts voucher type `OPENING_BALANCE` against the capital ledger. The button is disabled when that ledger is missing.

Seed groups include stock, GST payable, salary, farming, and property as **ledger names**. They are not modules.

**Remains:** no screen to add, rename, or archive a ledger or an account group. Opening balance is not gated by `manage_opening_balances`.

**Code:** `LedgersPage.tsx`, `coaSeed.ts`, `api/company/ledgers.php`.

### Cash and bank — Shipped

`/company/app/cash-bank` is the ledger list filtered to `isCashBank`, with a link that opens the cash-bank book report for that ledger. Transfers between them are CONTRA vouchers. The dashboard also splits cash and bank.

**Code:** `LedgersPage.tsx` with `cashBankOnly`.

### Bank reconciliation and statements — Not built

There is no reconciliation screen, no bank-statement upload, and no cheque register under `src/company`. Personal PDF import does not post into company books.

---

## Masters — 50%

### Business units, areas, projects, cost centres — Partial

Create by name and list, for business units, areas, projects, and cost centres. Branches are a tab on the same page and have no deep link. Tab changes do not navigate (`MastersPage.tsx`).

**Remains:** no edit and no archive. These records are not fields on quick voucher forms, so they do not affect posted vouchers. Cost allocations have a SQL table and no page.

**Code:** `MastersPage.tsx`, `masters/DimensionPanel.tsx`, `api/company/dimensions.php`.

---

## Reports and export — 63%

### Live reports — Shipped

Source of truth: `config/company-report-registry.json`. The hub shows rows with `enabled: true` only.

| Key | Needs |
|---|---|
| trial-balance | — |
| profit-loss | — |
| balance-sheet | — |
| day-book | date range. Also a sidebar item |
| party-statement | `partyId` |
| ageing | optional side |
| cash-bank-book | `ledgerId` |
| receivables | alias of ageing, side receivable |
| payables | alias of ageing, side payable |

The report view has from and to dates, a party or a cash/bank ledger when the report requires one, and an ageing side. The body is a generic table. The export button leaves the report and opens the Export page. It is not an in-report format menu.

**Code:** `ReportsHubPage.tsx`, `ReportViewPage.tsx`, PHP report helpers under `php/helpers/company/`.

### Disabled report keys — Not built

These are in the registry with `enabled: false`, so the hub hides them:

- receipts-payments
- project-report
- business-report
- area-report
- category-report
- user-activity

`ReportKey` in `src/company/types/index.ts` also names cash-book, bank-book, ledger-statement, group-summary, outstanding-ageing, cash-flow, user-entry-report, and audit-report. Those keys are not in the live registry.

**Remains:** enable a key only after the PHP handler and the filters exist. Turning the flag on by itself does not create the report.

### Export files — Shipped

Gated by `export_reports` and a PIN. Formats: PDF, DOCX, XLSX, CSV. The default report is day book. Quick packs: trial balance CSV, profit and loss PDF, day book XLSX. The file is downloaded from a base64 payload.

**Remains:** the “Full data backup” section is text. It says mysqldump is an ops drill. There is no browser download of the company database. Permission `export_backup` is not a UI gate.

**Code:** `src/company/pages/ExportPage.tsx`.

### Search — Partial

Debounced. Minimum 2 characters. Calls `companyApi.search`. If that endpoint 404s, the page filters parties and voucher search in the browser.

**Remains:** results are text rows. They are not links to the party or the voucher.

**Code:** `SearchPage.tsx`.

---

## Control — 75%

### Approvals — Shipped

Lists pending items with a cash-impact label. Approve and reject send a PIN. The header bell hides the count when permissions are non-empty and do not include `approve_voucher`. Gated by `approve_voucher`.

**Code:** `ApprovalsPage.tsx`, `api/company/approvals.php`.

### Audit — Shipped

Lists action, time, and entity. A 404 becomes an empty list. Gated by `view_audit`.

**Code:** `src/company/pages/AuditPage.tsx`.

### Settings and period lock — Partial

Read-only: display name, legal name, currency, financial-year month, books start date, GST on or off, GSTIN if one was stored, status.

Period lock: lock everything before a date, with a reason. Reopen asks for a PIN. The lock section is gated by `lock_period`.

**Remains:** the company profile is not editable on this page. The create wizard does not collect a GSTIN. Reopen does not check `reopen_period`. There is no company-PIN settings editor here. PIN dialogs exist on reverse, export, reopen, and approve.

**Code:** `src/company/pages/SettingsPage.tsx`.

### Permission gates on pages — Partial

Denial banners exist for audit, approvals, export, period lock, and users. The New menu checks the create and view keys listed above. An empty permissions array allows everything (`can()`).

**Remains:** dashboard, parties, vouchers, ledgers, cash and bank, quick entry, reports, search, and dimension masters render without `PermissionGate`.

**Code:** `src/company/components/PermissionGate.tsx`, `NewActionMenu.tsx`.

---

## Not a module yet — 9%

### GST returns — Not built

The workspace can store `gstEnabled` and `gstin`. Settings displays them and cannot edit them. A party may have a GSTIN field on the type. The chart seed includes ledger `GST_PAYABLE`.

**Remains:** no GST return, no tax invoice lines, no HSN, no e-invoice. Create company does not ask for a GSTIN.

### Inventory — Not built

No route, page, or API. The chart seed has ledger `STOCK` under group `INVENTORY` (`coaSeed.ts`).

### Payroll — Not built

No route or page. The closest pieces are purpose `SALARY`, ledger `SALARY`, and party role `EMPLOYEE`.

### Documents — Schema only

Table `company_documents`. Open-gaps doc marks prompt 116 not product-active. No upload UI and no documents tab on a party or a voucher.

### Recurring company rules — Schema only

Table `company_recurring_rules`. Prompt 117. No sidebar item and no scheduler screen.

### Personal to company bridge — Schema only

Table `company_cross_domain_links`. Prompt 118. The only connection in the UI is the footer link from company to `/` and from personal to `/company`. Nothing posts a personal expense into a company voucher, or the reverse.

### Company billing — Schema only

Table `company_org_subscriptions`. Prompt 119. Personal Razorpay (`/subscription`) is a different product and does not bill a company workspace.

### Company groups — Schema only

Tables `company_groups` and `company_group_members`. No screen to group several companies.

---

## SQL tables

| Table | In the product? |
|---|---|
| company_workspaces | Yes. Create, settings (read-only) |
| company_groups, company_group_members | Table only |
| company_roles, company_role_permissions | Used by the server. No role editor |
| company_memberships, company_membership_roles | Yes. Users page |
| company_business_units, company_branches, company_areas, company_projects, company_cost_centres | Create and list. Not on vouchers |
| company_parties, company_party_roles | Yes |
| company_party_categories, company_party_category_memberships | Yes |
| company_party_tags, company_party_tag_memberships | Table only |
| company_account_groups, company_ledgers | Seeded and listed. No edit UI |
| company_party_relationship_accounts | Server sub-ledgers |
| company_vouchers, company_voucher_lines | Yes |
| company_voucher_cost_allocations | Table only |
| company_bill_refs, company_bill_allocations | Yes. Receivables, payables, on-account |
| company_documents | Deferred |
| company_recurring_rules | Deferred |
| company_period_locks | Yes |
| company_audit_logs | Yes |
| company_financial_write_receipts | Server idempotency |
| company_approvals | Yes |
| company_cross_domain_links | Deferred |
| company_org_subscriptions | Deferred |

## Tests

Vitest under `src/company`:

| File | What it covers |
|---|---|
| `services/__tests__/scenarios.test.ts` | Scenarios A–J |
| `purposeEngine.test.ts` | Purpose scenarios |
| `purposeParity.test.ts` | Front-end and PHP line shape |
| `propertyVouchers.test.ts` | Property vouchers |
| `voucherBalance.test.ts` | Journal balance |
| `invariants.test.ts` | INV-01 through INV-10 |
| `reportEngine.test.ts` | Client report helper, not the PHP runner |
| `categoryAggregation.test.ts` | Category aggregation policy |
| `store/__tests__/routesMatrix.test.ts` | Route and page matrix |
| `clientEndpointParity.test.ts` | API client paths |
| `logoutIsolation.test.ts` | Logout clears company keys only |
| `components/__tests__/statusBadge.test.ts` | Status badge |
| `i18n/__tests__/i18n.test.ts` | Locale fallback and en/gu parity |
| `i18n/__tests__/dashboardGuSmoke.test.ts` | Gujarati dashboard |

PHP script, not Vitest: `scripts/company/php-tests/run-accounting.php`.

There are no tests for GST returns, inventory, payroll, or bank reconciliation, because those modules are absent.

## Company gaps, short list

1. Dimensions and categories can be created and are not posted on a voucher.
2. Ledgers cannot be added or edited. There is no bank reconciliation.
3. Party voucher links do not filter. No documents, no tags UI, no invoice PDF, no create-bill form.
4. Purchase and sale are purposes, not invoice screens.
5. Search results are not links. Settings are read-only. Invite-by-token is a future page.
6. Six reports stay `enabled: false`. Full backup is text, not a download.
7. Permission banners cover five pages. The rest of the app is open.
8. GST returns, inventory, and payroll are ledger names, not modules.
9. Documents, company recurring rules, the personal-company bridge, company billing, and company groups are SQL only.
