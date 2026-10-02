# Checkpoint — 30 Sep 2026 local product work

This is a recoverable checkpoint, not a completion certificate. The 83-surface playbook is not finished.

## Landed in this run

### Company authorization (SV01)

Empty or still-loading permissions no longer allow protected actions.

- `src/company/auth/companyCan.ts` — allow only when the load state is `ready` and the permission is in the list.
- Store field `permissionsState`: `loading` | `ready` | `error`.
- Wired through `PermissionGate`, the New menu, voucher chooser, masters category actions, the approvals bell, and the dashboard approvals flag.
- Creating a company with no permission payload now reloads permissions from the server instead of treating “none yet” as owner access.
- PHP already required a membership and an explicit permission key (`php/helpers/company/authz.php`). This change closes the browser fail-open. It does not add a new server policy.

Tests: `src/company/auth/__tests__/companyCan.test.ts` and `src/company/store/__tests__/logoutIsolation.test.ts` —  passed in this run (8 tests across the three files that were executed).

### Honest empty states

- Company audit: HTTP 404 is “audit service unavailable”, not an empty log. 401/403 stay permission errors. A successful empty list is still an empty list.
- Company search: HTTP 404 says the search service is unavailable. A local party/voucher filter may still run, and those rows are buttons. Party opens the party page. Voucher opens the voucher page.

### Party vouchers

`/company/app/vouchers?partyId=` is sent to `listVouchers`. PHP `company_day_book` already filtered `party_id`. The page now reads that query and refreshes on back/forward.

### Personal workflows

- Categories: parent picker, cycle rejection, income/expense/mixed compatibility. `parentId` is saved. Parent totals that count each transaction once are not done.
- Alerts: all six Settings switches filter generation and the alerts page/drawer. Unusual-spend and duplicate-candidate alerts are created when those switches are on. They are review hints. They do not delete transactions. Hard posting rules are unchanged.
- Bill calendar: create, edit, and pause a recurring rule without posting an expense (`src/components/planning/RecurringRuleDialog.tsx`). The upcoming list still shows active monthly rules only. Weekly, quarterly, and yearly rules are stored and listed, and they are not yet projected on the calendar.
- Sync badge: conflict “use server version” refreshes a personal collection only when the cloud key matches a `DataCollections` field (`emis`, `goalContribs`, `savingsContribs`, and the other core keys). Households, card EMI, sinking funds, and the other non-core stores still have no personal collection field, so a missing label is not reported as a failed sync.

## Not started

SV02 feature flags and quotas, envelopes, sinking-fund screen, card statement/EMI save, household sharing, attachments, personal i18n, Account Aggregator, company ledgers editor, dimensions on vouchers, invoices, bank reconciliation, the six disabled reports, documents, company recurring runner, scoped backup download, inventory, GST workbench, payroll, personal-to-company bridge, company billing, company groups, package serve, and the final 83-surface audit.

Do not treat this checkpoint as LOCAL_PRODUCT_COMPLETE.
