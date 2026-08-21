# Phase 17 - Restore Drill Report

Final status: LOCAL RESTORE DRILL PASSED, PRODUCTION-LIKE ENCRYPTED RESTORE STILL REQUIRED

## Changes made for restore readiness

- `scripts/backup_db.php` now falls back to a PDO SQL export when `mysqldump` is unavailable.
- `scripts/restore-drill.mjs` now uses `mysql2` for drop/create/import/smoke checks, so it works even when the `mysql` CLI is unavailable.
- Restore drill smoke test now reports optional `schema_version` and `subscriptions` availability without crashing on old/local databases.

## Backup created

Command:

```bash
APP_ENV_FILE=.env.local DB_HOST=127.0.0.1 DB_PORT=3306 DB_NAME=sparowvault_test DB_USER=root DB_PASS= php scripts/backup_db.php
```

Result:

- Backup file: `D:\Claude\SparowVault\backups\db_20260514_195705.sql`
- Size: 96,145 bytes
- Note: `mysqldump` was missing, so PDO fallback export was used.

## Restore drill command

```bash
TEST_DB_HOST=127.0.0.1 TEST_DB_PORT=3306 TEST_DB_USER=root TEST_DB_PASS= node scripts/restore-drill.mjs --backup D:\Claude\SparowVault\backups\db_20260514_195705.sql --target sparowvault_restore_drill
```

## Restore drill result

```json
{
  "ok": true,
  "target": "sparowvault_restore_drill",
  "tablesCount": 27,
  "userCount": 9,
  "transactionRows": 16,
  "subscriptionsAvailable": true,
  "subscriptionRows": 0,
  "schemaVersionAvailable": false,
  "schemaRows": []
}
```

## Validation performed

- Backup file was created.
- Drill database was dropped and recreated safely because target contains `drill`.
- SQL backup was imported into `sparowvault_restore_drill`.
- Restored DB contained 27 tables.
- Restored DB contained 9 users.
- Restored DB contained 16 transaction rows in `cloud_collection_rows`.
- Subscriptions table existed.

## Gaps

- This was a local unencrypted backup drill, not an encrypted off-host production-like restore.
- Local test DB lacks `schema_version`, so staging/production restore must verify latest schema version after migrations.
- Login/report/subscription UI flows were not browser-tested against the restored DB in this local drill.
- The zero-byte failed backup from the first `mysqldump` attempt remains in `backups`; it must not be shipped off-host.

## Required production-like restore drill

Before paid beta:

```bash
node scripts/restore-drill.mjs --backup backups/<latest-nightly>.sql.gpg --target sparowvault_restore_drill
```

Then verify:

- Test user login works.
- Recent transactions load.
- Reports open and totals match.
- Subscription rows and webhook history restore.
- `schema_version` shows the latest applied migration.

## Rollback plan

- Drop `sparowvault_restore_drill` after sign-off.
- Keep only successful non-empty backup artifacts.
- If restore fails on staging, do not launch; fix backup export/import before beta.

## Final status

LOCAL RESTORE DRILL PASSED. Paid beta remains blocked until encrypted off-host restore drill passes on staging/restore infrastructure.
