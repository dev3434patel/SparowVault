# SQL destructive / idempotency classification (P0-C)

| File | Classification | Notes |
|------|----------------|-------|
| `sql/migrations/phase_*.sql` | **production migration** | Prefer `IF NOT EXISTS` / guarded ALTER |
| `sql/migrations/*_rollback.sql` | **rollback** | Never run by app runtime |
| `sql/migrations/all_phases_combined*.sql` | **fresh-install bootstrap / rollback** | Ops only |
| `sql/20260427_p0_rollback.sql` | **rollback** | DROP TABLE intentional |
| `sql/FINAL_HOSTING_WITH_DATA.sql` | **fresh-install bootstrap** | Contains DROP — hosting installer only |
| `sql/HOSTING_FRESH_MYSQL57_IMPORT.sql` | **fresh-install bootstrap** | Idempotency warnings accepted for installers |
| `sql/SPAROWVAULT_FULL_DATABASE.sql` | **fresh-install bootstrap** | ALTER without IF EXISTS — install once |
| `sql/production_schema.sql` | **fresh-install bootstrap** | Same |
| `sql/20260501_sql_only_full.sql` | **legacy archive** | Do not re-run on live |
| `sql/schema.sql` / `final_schema.sql` | **legacy archive** | Minimal stubs |
| `sql/migrations/phase_vnext_02_mutation_idempotency.sql` | **production migration** | CREATE IF NOT EXISTS |

## Policy

- Application runtime and `finance:certify:migration` must only apply `sql/migrations/phase_*.sql` (non-rollback).
- Hosting DROP/TRUNCATE scripts are **not** part of upgrade path.
- Remaining ALTER without IF EXISTS in bootstrap dumps are **accepted** as fresh-install only, not as upgrade migrations.
