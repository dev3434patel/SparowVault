# Company Migration Report

| Check | Status |
|-------|--------|
| Core schema `20260923_company_core.sql` | Applied |
| ON_ACCOUNT nullable bill_ref_id | Applied (`20260923_company_bill_on_account.sql`) |
| Indexes `20260923_company_indexes.sql` | Present (apply via apply-migration) |
| probe-db company_* | PASS |
| Fresh/twice/thrice golden | PARTIAL — use apply-migration idempotent CREATE IF NOT EXISTS |
| Backup/restore drill | NOT RUN this pass |
