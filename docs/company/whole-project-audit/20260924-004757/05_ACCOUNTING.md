# 05 — Accounting Engine

## Canonical path

Preview/post/reverse/approve/allocate: `php/helpers/company/posting.php`  
Purpose registry: `config/company-purpose-rules.json` via `php/helpers/company/purpose.php`  
Reports: `php/helpers/company/reports.php`

## This-run verification

| Suite | Result | Artifact |
|-------|--------|----------|
| Vitest services (31) | PASS | `raw/EVIDENCE_COMPANY_UNIT.txt` |
| PHP domain accounting | PASS | `raw/EVIDENCE_COMPANY_PHP.txt` |
| company:gate:accounting | PASS | `raw/EVIDENCE_GATE_ALL.txt` |
| demo-certify (in gates) | PASS | gate-all |
| Preview/post parity + PREVIEW_STALE | PASS | PHP tests |
| Double reverse idempotent | PASS | PHP tests |
| TB debit=credit | PASS | PHP tests |
| Unbalanced reject | PASS | PHP tests |
| LOAN_RECEIVED P&L=0 | PASS | PHP + vitest |
| PROPERTY advance vs expense | PASS | PHP |
| ON_ACCOUNT null bill_ref | PASS | PHP |
| OTHER_RECEIPT → income | PASS | PHP |

## Design checks (code)

| Invariant | Status | Notes |
|-----------|--------|-------|
| Debit == Credit on post | PASS | Exact paise equality |
| Preview hash optional | PARTIAL | Stale rejected when hash sent; skippable |
| Idempotency mutationId | PASS | receipts + unique voucher mutation |
| Reversal atomic | PASS | single TX + bill unwind |
| Approval deferral | PASS | PENDING_APPROVAL + approvals row |
| Period lock | PASS (code) | enforced in post path — browser lock-block **pending Wave 4** |
| Cash vs P&L separation | PASS | purpose matrix + tests |

## Purpose scorecard (abbrev)

| Purpose | Correct | Preview | Posted | Reported | Tested |
|---------|---------|---------|--------|----------|--------|
| LOAN_RECEIVED | PASS | PASS | PASS | PASS | PASS |
| LOAN_REPAYMENT | PASS | — | — | — | PARTIAL (scenarios) |
| FARMER_ADVANCE | PASS | PASS | PASS | — | PASS |
| FARMER_SETTLEMENT | PASS | — | — | — | PARTIAL |
| PROPERTY_ADVANCE | PASS | PASS | PASS | — | PASS |
| PROPERTY_EXPENSE | PASS | PASS | PASS | PASS | PASS |
| CAPITAL_INTRODUCED | PASS | — | — | — | PASS (scenarios) |
| DRAWING | PASS | — | — | — | PARTIAL |
| CUSTOMER receipt / AR | PASS | — | — | — | PASS (scenarios) |
| VENDOR payment / AP | PASS | — | — | — | PASS |
| OTHER_RECEIPT | PASS | PASS | PASS | — | PASS |
| CONTRA | PASS | FE draft | PASS | — | PASS |
| JOURNAL | PASS | — | PASS | — | PASS |
| OPENING_BALANCE | PASS | — | PASS | — | PARTIAL (Ledgers UI) |
| Deprecated OTHER / PROPERTY_PAYMENT / REFUND | PARTIAL | PHP still accepts | — | — | NOT VERIFIED UI block |

## Accounting engine verdict

**Implementation: ~95%** (core purposes live)  
**Verified this run: ~80%** (unit+PHP+gates; full browser purpose matrix pending)

Independent label vs historical cert: **PASS** for automated accounting core **so far**; full `company:certify:final` (100k + auth browser + backup) still required before re-issuing ACCOUNTING CORE CERTIFIED.
