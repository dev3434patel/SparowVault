# SparowVault — migrations

## Quick import (safe to re-run)

Against an **existing** production-schema database with user data:

```bash
mysql -h $DB_HOST -P $DB_PORT -u $DB_USER -p$DB_PASS $DB_NAME \
  < sql/migrations/all_phases_combined.sql
```

Then verify:

```sql
SELECT version_key, applied_at
  FROM schema_version
 WHERE version_key LIKE 'phase_%'
 ORDER BY applied_at, version_key;
```

You should see **10 rows** (one per applied phase). Re-running the same
file is a no-op — every column, index, and table is guarded by
`information_schema` checks or `IF NOT EXISTS`.

## What this file does (and what it does NOT do)

The combined migration:

- Adds Phase 1 security columns/indexes to `users` + `payments`.
- Adds Phase 3 + 4 columns/indexes to `cloud_collection_rows`.
- Creates Phase 5 `financial_events` + `financial_effects`.
- Creates Phase 7 `user_credit_cards` shadow.
- Creates Phase 8 `user_loans` + `user_loan_payments`.
- Creates Phase 9 `udhari_people` + `udhari_entries` + `udhari_settlements`.
- Creates Phase 11 `ai_suggestions`.
- Creates Phase 13 `user_policy_acceptances` + `user_audit_logs` + `retention_jobs` + adds `users.{last_policy_check_at, mobile_e164, email_lc}`.
- Creates Phase 14 `plan_prices` + adds `plan_features.{limit_value, limit_unit}` + `subscriptions.{previous_period_end, renewed_from_subscription_id, scheduled_plan_id, scheduled_change_at}`.

It does **not**:

- Touch any user data row.
- Drop any existing column or table.
- Modify the base `production_schema.sql` tables (users, plans, subscriptions, payments, cloud_collection_rows are extended, not replaced).

## On a fresh database (empty MySQL)

```bash
# 1. Base schema first
mysql -h $DB_HOST -u $DB_USER -p$DB_PASS $DB_NAME < sql/production_schema.sql
mysql -h $DB_HOST -u $DB_USER -p$DB_PASS $DB_NAME < sql/final_schema.sql
mysql -h $DB_HOST -u $DB_USER -p$DB_PASS $DB_NAME < sql/20260427_p0_seed.sql

# 2. Then all phases
mysql -h $DB_HOST -u $DB_USER -p$DB_PASS $DB_NAME < sql/migrations/all_phases_combined.sql
```

## On the test database (recommended before touching production)

```bash
TEST_DB_NAME=sparowvault_test npm run db:test:reset
mysql -h $TEST_DB_HOST -u $TEST_DB_USER -p$TEST_DB_PASS $TEST_DB_NAME \
  < sql/migrations/all_phases_combined.sql
TEST_DB_NAME=sparowvault_test npm run db:test:seed
```

## Rollback

```bash
mysql -h $DB_HOST -u $DB_USER -p$DB_PASS $DB_NAME \
  < sql/migrations/all_phases_combined_rollback.sql
```

**Drops every Phase 1-14 table and shadow column.** Take a backup first
(`docs/backup-checklist.md` §D). The rollback explicitly does NOT drop
`payments.currency` because that column predates Phase 1 in
`production_schema.sql`.

## Per-phase files

The individual phase files are still in this folder for reference and
for environments that want to apply one phase at a time:

- `phase_01_security.sql` (+ rollback)
- `phase_03_cloud_amount_paise.sql`
- `phase_04_indexed_sync_fields.sql`
- `phase_05_financial_ledger.sql`
- `phase_07_user_credit_cards.sql`
- `phase_08_user_loans.sql`
- `phase_09_udhari_engine.sql`
- `phase_11_ai_suggestions.sql`
- `phase_13_privacy_audit.sql` (+ rollback)
- `phase_14_saas_billing.sql` (+ rollback)

**Important:** the standalone `phase_03_cloud_amount_paise.sql` and
`phase_04_indexed_sync_fields.sql` use raw `ALTER TABLE ADD COLUMN`
without guards — they will fail on re-run. The combined file rewrites
those two phases using the same idempotent procedure pattern as the
other phases. **Use the combined file** unless you have a specific
reason to apply individual files.

## Troubleshooting

| Error                                                       | Cause                                                        | Fix                                                                |
|-------------------------------------------------------------|--------------------------------------------------------------|--------------------------------------------------------------------|
| `Table 'users' doesn't exist`                               | Base schema not applied yet.                                 | Run `sql/production_schema.sql` first.                             |
| `Table 'plans' doesn't exist`                               | Phase 14 references it via FK.                               | Apply the SaaS portion of base schema first.                       |
| `Cannot add foreign key constraint`                         | Existing rows violate the new FK, or charset mismatch.       | Check the parent table's id column is `VARCHAR(191)` `utf8mb4`.    |
| `Duplicate column name 'amount_paise'`                      | You ran the standalone `phase_03_*.sql` previously.          | Skip it — the combined file detects and skips already-applied DDL. |
| `Specified key was too long; max key length is 767 bytes`   | Older MySQL/MariaDB without `innodb_large_prefix=ON`.        | Upgrade to MySQL 5.7+ or set the variable; we use VARCHAR(191).    |
