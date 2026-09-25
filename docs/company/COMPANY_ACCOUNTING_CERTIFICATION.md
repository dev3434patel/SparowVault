# Company Accounting Certification

**Date:** 2026-09-23  
**Status:** **PARTIAL**

## Invariants

| ID | Rule | Evidence | Status |
|----|------|----------|--------|
| INV-01 | Posted debit = credit | `invariants.test.ts`, PHP `company_post_voucher` | PASS (unit/code) |
| INV-02 | TB debit = credit | `reportEngine.test.ts` | PASS (unit) |
| INV-03 | Contra no P&L | purpose + scenarios | PASS (unit) |
| INV-04 | Loan received ≠ income | purposeAffectsProfit false | PASS (unit) |
| INV-05 | Loan repayment ≠ expense | same | PASS (unit) |
| INV-06 | Advance ≠ expense | FARMER_ADVANCE / ADVANCE_GIVEN | PASS (unit) |
| INV-07 | Outstanding math | scenario H / property | PASS (unit) |
| INV-08 | Tenant isolation | authz helpers + property | PARTIAL (no full API matrix run) |
| INV-09 | Draft excluded from books | reports filter POSTED | PASS (code) |
| INV-10 | Reversal neutralises | reverseLines + PHP reverse | PASS (unit/code) |

## Required scenarios

| Scenario | Status |
|----------|--------|
| A Loan ₹1L | PASS unit |
| B Farmer advance ₹70k | PASS unit |
| C Settle advance | PASS unit |
| D Multi-role party | PASS unit |
| E Category totals | PASS unit |
| F Business split | PASS unit |
| G Multi-bill alloc | PASS unit |
| H Partial ageing | PASS unit |
| I Contra | PASS unit |
| J Data-entry reverse deny | PASS unit |

## Cross-report reconciliation

Pure TS engines reconcile TB/BS for sample loans. Live multi-report DB reconciliation suite: **not fully certified**.

## Verdict

**PARTIAL** — engine logic certified in unit tests; production DB posting certification incomplete.
