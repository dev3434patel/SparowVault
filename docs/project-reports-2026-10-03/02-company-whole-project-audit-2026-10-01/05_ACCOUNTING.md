# 05 — Accounting

| Suite | Result |
|-------|--------|
| Vitest 96 | PASS |
| PHP domain | PASS (includes property investment/deposit and OTHER_PAYMENT) |
| gate:all accounting/parties/vouchers/bills/reports | PASS |
| HTTP e2e inside gate:api | PASS |
| Browser loan post | PASS (journey C, HTTP 201) |
| Browser farmer advance preview | PASS |
| Browser property variants | PASS (4) |

Deprecated purposes are rejected in `posting_guards.php` / `posting_commit.php` / `posting_preview.php`. The security-matrix file scan still looks only at `posting.php`, so that script **FAIL**s even though the guard exists.

**Automated accounting: PASS. Full ACCOUNTING CORE CERTIFIED label: NOT ISSUED** (browser reversal journey FAIL; security script FAIL; 100k matrix NOT VERIFIED this stamp).
