# 01 — Current State

**Run:** 20261001-014647  
**HEAD:** 6395ec9 (2026-09-26) plus uncommitted company changes  
**Prior audit:** 20260924-004757 is historical and stale.

| Check | This run |
|-------|----------|
| Vitest company | PASS 96/96 (`raw/EVIDENCE_COMPANY_UNIT.txt`) |
| PHP accounting | PASS (`raw/EVIDENCE_COMPANY_PHP.txt`) |
| company:gate:all | PASS 12/12 (`raw/EVIDENCE_GATE_ALL.txt`) |
| DB probe | PASS 34 company_* tables |
| Categories route | Code PASS — `CategoriesPanel` + routesMatrix test |
| Voucher new | Code PASS — `VoucherCreatePage` chooser |
| Cash & Bank | Own route `/company/app/cash-bank` |
| API healthz on ::1:8080 | 503 refused non-test DB (intentional); company routes still answer 401 |
| IPv4 :8080 | Vite HTML, not PHP — localhost resolution hazard |

Sep 24 P1s (categories fallthrough, voucher-new list) are **fixed in current code**. Re-verification of browser journeys is in progress in `raw/`.
