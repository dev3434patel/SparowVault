# 20 — Remediation Plan

## P0

None identified this run (no accounting corruption, tenant leak, or security bypass proven).

## P1 — before Product Complete

1. **Masters categories** — wire `MastersPage` tab for categories (or remove nav). Acceptance: `/masters/categories` manages party categories.
2. **Voucher new** — route `/vouchers/new` to quick entry chooser or journal; never silent list. Acceptance: distinct create UX.
3. **Auth browser A–N** — fix selector to `/create party/i`; re-run full A–N green.
4. **Product browser NEW_MENU** — align locator with actual “New” / “+ New” label; re-run green.
5. **RBAC soft reads** — tighten `search`, `voucher-item`, `voucher-preview` to view_* perms (security hardening).
6. **Export vs view_*** — re-check report view permission on export.

## P2 — professional polish

- Clear company store on logout
- Approvals financial impact summary
- Export UI success (not raw JSON)
- StatusBadge typed unions
- Split UsersPage mega-module
- Exhaustive viewport + a11y audits
- Formal re-run `perf-100k-matrix`
- PHP load report registry (single SoT)
- Deprecated purpose rejection on PHP

## P3

- Branches sidebar entry
- Role-personalized dashboard
- Skeleton loaders
- Pixel-diff CI

## FUTURE (do not mix)

Documents, recurring, cross-domain, org subscriptions, GST, payroll, inventory, SaaS billing.

## Implementation phases

| Phase | Objective | Key files |
|-------|-----------|-----------|
| A Dashboard & IA | Keep strong; fix empty-state CTAs only if needed | DashboardPage |
| B Navigation & Discoverability | Categories + voucher-new + branches | MastersPage, routes, VouchersPage |
| C Party/Bill Workflows | On-account allocate UX polish | ReceivablesPage, PartyDetail |
| D Reports & Drilldowns | Registry shared PHP/FE | reports.php, registry JSON |
| E UX States | Export feedback, 403 reasons | UsersPage Export, PageChrome |
| F Responsive & A11y | Viewport + keyboard matrix | layout/*, pages |
| G Export Fidelity | Keep green; filter combos | exports helper |
| H Workspace Reliability | Logout clear; hydrate coalesce | companyStore, AppProviders |
| I Interactive Performance | Keep latency budgets; optional EXPLAIN | indexes |
| J Final Product Certification | Re-run certify:product + auth A–N | scripts/company/certify-* |
