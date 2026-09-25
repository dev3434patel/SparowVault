# Company Database Certification

**Date:** 2026-09-23  
**Status:** **PARTIAL**

## Schema

- Migration: `sql/migrations/20260923_company_core.sql`
- All owned tables use `company_id`
- Money: `BIGINT` paise
- Uniques scoped: `(company_id, voucher_number)`, `(company_id, mutation_id)`
- Write receipts: `company_financial_write_receipts`
- No shared personal/company transactions table

## Applied to environments

| Environment | Applied |
|-------------|---------|
| Local / CI test DB | Must apply migration before API posting tests |
| Hosting dump | **Not yet merged** into `HOSTING_READY_CLEAN_IMPORT.sql` |

## Verdict

Schema design **PASS**; universal environment application **PARTIAL**.
