# Company Accounting Reconciliation

Evidence from `php scripts/company/demo-certify.php` and `php scripts/company/php-tests/run-accounting.php` (2026-09-23 remediation).

| Check | Result |
|-------|--------|
| Trial Balance Dr = Cr | PASS (demo final TB) |
| Balance Sheet Assets = L+E | PASS (`balanced` flag) |
| Loan received P&L unchanged | PASS |
| Farmer advance not expense | PASS |
| PROPERTY_ADVANCE P&L = 0 | PASS (php-tests) |
| PROPERTY_EXPENSE hits expense | PASS |
| OTHER_RECEIPT increases income (not expense) | PASS |
| Contra no P&L change | PASS |
| Bill partial outstanding | PASS |
| Over-allocation rejected | PASS |
| Reversal marks REVERSED | PASS |
| ON_ACCOUNT row persisted | PASS |
| Tenant isolation A/B | PASS |

Dashboard KPIs source: trial-balance + day-book + bills (same as reports) — no independent arithmetic.
