# 01 — Current State

**Audit run:** `20260924-004757`  
**Git HEAD:** `ab5058539ec0ec23cc684d426d0d90d93cfb6d97`  
**Working tree:** Company domain largely **untracked** (implementation present on disk; not committed to remote).

## Independent stance

Historical claims (`ACCOUNTING CORE CERTIFIED` @ 210013, `COMPANY PRODUCT COMPLETE` @ 221806) are **not inherited**. This package re-measures current code + runtime.

## What exists (implementation snapshot)

| Layer | Status | Evidence |
|-------|--------|----------|
| Frontend SPA `/company` | LIVE (~54 files) | `src/company/` |
| PHP API | LIVE (24 entrypoints) | `api/company/` |
| Posting engine | LIVE | `php/helpers/company/posting.php` |
| Schema | LIVE (34 tables in DB) | `probe-db.php` → `company_tables=34` |
| Purpose registry | LIVE | `config/company-purpose-rules.json` |
| Report registry | PARTIAL (FE-only; PHP hard-coded) | `config/company-report-registry.json` |
| Unit tests (Vitest) | PASS this run | `raw/EVIDENCE_COMPANY_UNIT.txt` — 31/31 |
| DB connectivity | PASS | `raw/EVIDENCE_DB_PROBE.txt` |

## Explicit FUTURE (not FAIL)

Documents, recurring, cross-domain links, org subscriptions, invite-token redeem (UI stub), GST/payroll/inventory.

## Known structural gaps (static — pending runtime confirm)

1. `masters-categories` route falls through to business-units
2. `/vouchers/new` shows list, not create form
3. `PlaceholderPage` orphan
4. Membership-only API surfaces (search, voucher-item GET, preview)
5. Unused tables + unused permission keys
6. Company store not cleared on logout
7. Client `reportEngine` / `invariants` runtime-DEAD (tests only)

## Completion (Wave 0–1 static only)

| Metric | Value | Notes |
|--------|------:|-------|
| Implementation (core product surface) | ~85% | Core pages live; FUTURE modules excluded |
| Verification (this run so far) | ~15% | Unit + DB probe only; gates/browser pending |
