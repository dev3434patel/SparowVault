# Source-of-Truth Matrix

| Domain | Canonical Source | Derived Source | UI Consumer |
|--------|------------------|----------------|-------------|
| Company / workspace | `company_workspaces` + `company_workspaces_*` PHP | memberships list | Select/Create/Header switcher |
| Membership | `company_memberships` + roles | authz permission set | UsersPage, store.permissions |
| Role | `company_roles` + seed matrix | `company_role_permissions` | Users display |
| Permission | Seed in `php/helpers/company/seed.php` + authz | FE `hasPermission` | Nav, NewActionMenu, page gates |
| Party | `company_parties` + roles/categories | relationship accounts | Parties/PartyDetail |
| Category | `company_party_categories` + memberships | report aggregation policy (tests) | Masters PARTIAL (categories tab missing) |
| Business / Area / Project / CC / Branch | dimension tables | voucher line dims | MastersPage, filters PARTIAL |
| Ledger | `company_ledgers` + groups | COA seed | LedgersPage, Quick* |
| Voucher | `company_vouchers` + lines | write receipts | Vouchers, Quick*, Dashboard recent |
| Purpose | `config/company-purpose-rules.json` | FE purposeEngine + PHP purpose.php | QuickReceived catalogue; Transfer draft |
| Bill | `company_bill_refs` + allocations | outstanding_paise | Receivables/Payables/PartyDetail |
| Allocation | posting.php bill alloc | — | allocateOnAccount UI |
| Approval | `company_approvals` | voucher PENDING_APPROVAL | ApprovalsPage, Header badge |
| Period lock | `company_period_locks` | posting date checks | SettingsPage |
| Audit | `company_audit_logs` | — | AuditPage |
| Report | PHP `reports.php` helpers | FE registry aliases | Dashboard, ReportsHub |
| Export | PHP `exports.php` | report helpers subset | ExportPage |

## Duplicate logic flags

| Logic | Locations | Severity |
|-------|-----------|----------|
| Purpose → lines | JSON + PHP posting + FE purposeEngine | Medium |
| Report calc | PHP reports + FE reportEngine (tests) | Medium (tests-only FE) |
| Balance check | PHP post + FE voucherBalance | Low (defense in depth) |
| COA seed | PHP seed + FE coaSeed preview | Low |
| Money format | CompanyMoney + shared utils | Low |
| Company scope | Every SQL + FE companyId params | Must stay dual |
| Permission | seed + authz + FE gates | Medium if drift |
| Category aggregation | vitest inlined policy only | Medium — no shared module |
