# Local Phase 01 - Local Environment and Canonical Database Report

Generated: 2026-05-21

## Final Status

Final status: **PASS**

The local certification database `sparowvault_local_cert` was created fresh from canonical SQL only. Required tables exist, charset is `utf8mb4`, schema version rows are present, and the requested gates passed.

## What Was Checked

- Current local DB configuration from `.env` -> `.env.local`.
- Existing local DB backup before creating the certification DB.
- Fresh local DB creation: `sparowvault_local_cert`.
- Canonical SQL import only:
  - `sql/production_schema.sql`
  - `sql/migrations/all_phases_combined.sql`
- No old generated SQL dumps were imported.
- Database charset/collation.
- Required table existence.
- `schema_version` latest rows.
- `npm run check:sql`.
- `npm run health`.

## What Was Fixed

- Added a deterministic local phase database setup/verification script because MySQL CLI tools were not available on PATH.
- The script uses the project `mysql2` dependency to:
  - back up the current local DB,
  - recreate `sparowvault_local_cert`,
  - import canonical SQL,
  - verify charset,
  - verify required tables,
  - verify `schema_version`.

No finance logic, API behavior, Dexie/offline-first behavior, cloud sync behavior, ledger rules, or UI features were changed.

## Files Changed

- `scripts/local-phase-01-database.mjs`
- `LOCAL_PHASE_01_DATABASE_REPORT.md`

Generated evidence/log files:

- `local-phase-01-logs/database_setup.log`
- `local-phase-01-logs/check_sql.log`
- `local-phase-01-logs/health.log`
- `local-phase-01-logs/results.json`
- `local-phase-01-logs/sql-verification.json`

Backup generated:

- `backups/local-phase-01/sparowvault_2026-05-21T17-45-03-966Z.sql`

## Backup Result

| Item | Result |
|---|---:|
| Source DB | `sparowvault` |
| Backup status | PASS |
| Tables backed up | 29 |
| Rows backed up | 714 |
| Backup path | `backups/local-phase-01/sparowvault_2026-05-21T17-45-03-966Z.sql` |

## Canonical Import Result

| SQL file | Imported | Statements |
|---|---:|---:|
| `sql/production_schema.sql` | PASS | 51 |
| `sql/migrations/all_phases_combined.sql` | PASS | 71 |

Old generated SQL dumps were not imported.

## SQL Checks Done

### Charset

| Database | Charset | Collation |
|---|---|---|
| `sparowvault_local_cert` | `utf8mb4` | `utf8mb4_unicode_ci` |

### Required Tables

| Required table | Status |
|---|---:|
| `users` | PASS |
| `cloud_collection_rows` | PASS |
| `financial_events` | PASS |
| `financial_effects` | PASS |
| `user_credit_cards` | PASS |
| `user_loans` | PASS |
| `user_loan_payments` | PASS |
| `udhari_people` | PASS |
| `udhari_entries` | PASS |
| `udhari_settlements` | PASS |
| `ai_suggestions` | PASS |
| `payments` | PASS |
| `subscriptions` | PASS |
| `webhook_events` | PASS |
| `user_audit_logs` | PASS |
| `schema_version` | PASS |

Missing required tables: **none**.

### SHOW TABLES Result

Detected tables in `sparowvault_local_cert`:

- `admin_audit_logs`
- `ai_suggestions`
- `api_rate_limits`
- `app_settings`
- `audit_logs`
- `cloud_collection_rows`
- `cloud_users`
- `feature_flags_global`
- `financial_effects`
- `financial_events`
- `login_attempts`
- `payments`
- `plan_features`
- `plan_prices`
- `plans`
- `retention_jobs`
- `schema_version`
- `subscriptions`
- `udhari_entries`
- `udhari_people`
- `udhari_settlements`
- `user_audit_logs`
- `user_credit_cards`
- `user_loan_payments`
- `user_loans`
- `user_policy_acceptances`
- `users`
- `webhook_events`

### schema_version Result

Latest rows from:

```sql
SELECT version_key, applied_at
FROM schema_version
ORDER BY applied_at DESC
LIMIT 10;
```

| version_key | applied_at |
|---|---|
| `phase_01_security_2026_05_13` | `2026-05-21T17:45:04.000Z` |
| `phase_13_privacy_audit_2026_05_13` | `2026-05-21T17:45:04.000Z` |
| `phase_11_ai_suggestions_2026_05_13` | `2026-05-21T17:45:04.000Z` |
| `phase_09_udhari_engine_2026_05_13` | `2026-05-21T17:45:04.000Z` |
| `phase_08_user_loans_2026_05_13` | `2026-05-21T17:45:04.000Z` |
| `phase_07_user_credit_cards_2026_05_13` | `2026-05-21T17:45:04.000Z` |
| `phase_05_financial_ledger_2026_05_13` | `2026-05-21T17:45:04.000Z` |
| `phase_04_indexed_sync_fields_2026_05_13` | `2026-05-21T17:45:04.000Z` |
| `phase_03_cloud_amount_paise_2026_05_13` | `2026-05-21T17:45:04.000Z` |
| `phase_14_saas_billing_2026_05_13` | `2026-05-21T17:45:04.000Z` |

## Commands Run

| Command | Status | Duration | Log |
|---|---:|---:|---|
| `node scripts/local-phase-01-database.mjs` | PASS | 1.02s | `local-phase-01-logs/database_setup.log` |
| `npm run check:sql` | PASS | 0.42s | `local-phase-01-logs/check_sql.log` |
| `npm run health` | PASS | 35.19s | `local-phase-01-logs/health.log` |

## Manual Tests Done

- Confirmed `.env` selects `.env.local`.
- Confirmed `.env.local` source database is `sparowvault`.
- Confirmed target database is separate: `sparowvault_local_cert`.
- Confirmed canonical SQL import used only `production_schema.sql` and `all_phases_combined.sql`.
- Confirmed required tables list has no missing entries.
- Confirmed charset/collation is `utf8mb4` / `utf8mb4_unicode_ci`.

## Screenshots / Logs Required

No screenshots are required for this local database phase.

Required logs/evidence were generated:

- `local-phase-01-logs/database_setup.log`
- `local-phase-01-logs/check_sql.log`
- `local-phase-01-logs/health.log`
- `local-phase-01-logs/sql-verification.json`
- `local-phase-01-logs/results.json`

## Remaining Risks

- `npm run health` validates code/test/build/SQL health, but it does not automatically switch the app runtime to `sparowvault_local_cert`; runtime DB switching should be done in a later runtime phase if needed.
- MySQL CLI tools (`mysql`, `mysqldump`) were not available on PATH, so backup/import was done through `mysql2`. The generated SQL backup is still present and readable.
- This phase verifies schema presence and alignment at a database level. It does not test every API endpoint against `sparowvault_local_cert`; that belongs to the next runtime/API phase.

## Rollback Plan

If this phase needs to be reverted:

1. Drop `sparowvault_local_cert`.
2. Keep or restore the original local DB `sparowvault` from:
   - `backups/local-phase-01/sparowvault_2026-05-21T17-45-03-966Z.sql`
3. Remove `scripts/local-phase-01-database.mjs` only if the phase automation is no longer wanted.

## Final Status

**PASS**
