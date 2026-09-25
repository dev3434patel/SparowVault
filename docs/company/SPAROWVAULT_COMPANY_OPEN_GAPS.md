# SparowVault Company — Open Gaps (post Wave A–H)

**Date:** 2026-09-23  
**P0/P1 open:** **0**

## Remaining stretch (optional ops)

1. **Live authenticated HTTP A–N** — structural journeys A–N PASS in `scripts/company/browser-smoke.mjs`. Set `COMPANY_E2E_BASEURL` + optional `COMPANY_E2E_COOKIE` to probe live routes.
2. **100k voucher bench** — scaled bench evidenced at **1 000 parties / 10 000 vouchers** (~38s post). Raise via `COMPANY_PERF_PARTIES` / `COMPANY_PERF_VOUCHERS` toward 100k on larger hosts.

## Explicitly deferred (NOT PRODUCT-ACTIVE)

| Prompt # | Module | Doc |
|----------|--------|-----|
| 116 | Documents | [COMPANY_SAAS_FUTURE_PLAN.md](COMPANY_SAAS_FUTURE_PLAN.md) |
| 117 | Recurring rules | same |
| 118 | Cross-domain personal↔company bridge | same |
| 119 | Org subscriptions / billing adapter | same |

No LIVE sidebar/routes claim these modules.

## Closed this wave pass

- Reversal FKs `fk_cv_reversed` / `fk_cv_correction` (+ migration `20260923_company_reversal_fk.sql`)
- Branded multi-row PDF/DOCX exports + `company:test:export`
- Browser structural A–N matrix
- Migration restore drill + checksum snapshot (`company:test:restore`)
- Scaled perf evidence (10k vouchers)
