# Company Implementation Report

**Date:** 2026-09-23  
**Final status:** **PARTIAL**

## What shipped

### Architecture (pre-code)
- Full blueprint package under `docs/company/` (10 architecture docs + index).

### Database
- `sql/migrations/20260923_company_core.sql` — normalized `company_*` schema (workspaces, memberships, roles, parties, dimensions, COA, vouchers/lines, bills, audit, write receipts, period locks, org subscriptions, cross-domain links).

### Backend (PHP)
- Helpers: `ids`, `authz`, `audit`, `seed` (COA + roles), `posting` (balanced voucher + purpose + reverse + idempotency), `reports` (TB/P&L/BS/day book/party/ageing/cash-bank), `exports` (CSV + minimal PDF/RTF packages).
- Controller: `php/controllers/company.php`
- APIs under `api/company/*` (workspaces, memberships, parties, ledgers, vouchers post/preview/reverse, reports, exports, bills, period locks).

### Frontend
- Isolated `/company` shell via `CompanyApp` wired in `App.tsx` (before personal data gate).
- Routes, sidebar/header/mobile nav, dashboard quick actions, parties, ledgers, vouchers, quick received/paid/transfer/journal, AR/AP, reports, masters, users, settings, audit, export, search.
- Personal Sidebar link: **Company Books**.
- Pure TS engines + tests: purpose, balance, reports, invariants, property tests.

### Gates / scripts
- `npm run company:test`
- `npm run company:gate:accounting`
- `npm run company:gate:all` (+ aliases for parties/vouchers/outstanding/reports/permissions/exports)

## Accounting coverage

| Area | Status |
|------|--------|
| Purpose engine (loan/advance/contra…) | PASS (unit) |
| Debit = Credit invariant | PASS (unit + PHP validate) |
| Trial Balance / P&L / BS pure engines | PASS (unit) |
| Scenarios A–J (logic) | PASS (unit) |
| Property random vouchers | PASS (unit) |
| PHP posting + idempotency | Implemented; live DB E2E not fully certified this session |
| Bill-wise allocation server path | Implemented in poster; UI allocation UX minimal |
| Full PDF/DOCX fidelity | PARTIAL (minimal PDF + RTF; CSV solid) |
| Live multi-tenant API isolation suite | PARTIAL (helpers enforce; dedicated API e2e suite thin) |
| 500k-line performance bench | NOT RUN (open gap) |
| Approvals UI end-to-end | Schema + threshold hook; UI minimal |
| Personal↔company bridge | Schema `company_cross_domain_links` only |

## Personal finance regression

- Typecheck PASS after company code.
- Finance gate:all PASS at baseline; re-run recorded in session evidence.
- No personal collections added to company SoT.

## Honest completion claim

**Not** claiming full accounting-engine completion. Unit accounting gates and scaffolding PASS; live MySQL posting certification, full export fidelity, perf bench, and complete API isolation suite remain open → overall **PARTIAL**.
