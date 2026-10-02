# Wave A checkpoint — 2026-09-30

Foundation only. Later waves are still open.

## SV01 remainder

- Receipt, payment, journal, and contra posts check `companyAllows` before they write. Opening balances require `manage_opening_balances`. Reopen requires `reopen_period`; a PIN without that permission does not reopen.
- Dashboard KPI cards already show the error string instead of a zero when a widget fails.
- Owner, viewer, and empty permission sets are checked by `src/company/auth/__tests__/roleEndpoint.php` against `company_seed_role_permissions()`.
- Invite roles stay VIEWER, DATA_ENTRY, ACCOUNTANT, MANAGER, AUDITOR.

## SV02

- `/subscription` stays on the subscription page when Razorpay is off and shows plan status without checkout.
- Mobile More reaches cards, loans, bills, household, import, settings, and audit.
- Command palette includes categories, profile, audit, and subscription.
- An explicit `false` admin flag blocks new creates for goals, investments, udhari, import, and recurring rules in `BaseRepo.create`. Existing rows are not deleted. The page shows the same sentence.
- Account, card, loan, and goal caps are computed by `planCapMessage` when a plan snapshot is passed.

## Tests

- `npx vitest run` on module policy, alert preferences, companyCan, and personal math: 12 passed.
- `php src/company/auth/__tests__/roleEndpoint.php`: `role-endpoint ok`.
