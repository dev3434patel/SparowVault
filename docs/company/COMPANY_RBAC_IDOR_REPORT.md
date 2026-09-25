# Company RBAC / IDOR Report

| Check | Status |
|-------|--------|
| Role seed matrix | PASS (seed.php) |
| require_permission on APIs | PASS |
| Demo Company A/B voucher/bill isolation | PASS |
| `/company` lock + mustChangePin | PASS (App.tsx) |
| Full HTTP IDOR matrix every endpoint | PARTIAL |
| Sensitive action PIN | PARTIAL |

See `docs/company/COMPANY_PERMISSION_MATRIX.md` for intended keys.
