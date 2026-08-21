# How to import all phases into `moneydata` via phpMyAdmin

This guide walks you through importing **`IMPORT_VIA_PHPMYADMIN.sql`** into
your existing database via the phpMyAdmin UI. It will NOT delete any of
your current data — 23 users, 183 cloud_collection_rows, plans, subscriptions,
payments, etc. all stay.

What this single file does:

| Action | What it touches |
|---|---|
| **CREATES new tables** (skipped if already present) | `financial_events`, `financial_effects`, `user_credit_cards`, `user_loans`, `user_loan_payments`, `udhari_people`, `udhari_entries`, `udhari_settlements`, `ai_suggestions`, `user_policy_acceptances`, `user_audit_logs`, `retention_jobs`, `plan_prices` |
| **ADDS columns** (skipped if already present) | `users` (5 columns) · `payments` (2 columns + 2 unique indexes) · `subscriptions` (4 columns) · `plan_features` (2 columns) · `cloud_collection_rows` (15 columns + 6 indexes) |
| **LEAVES UNTOUCHED** | `api_rate_limits`, `app_settings`, `audit_logs`, `cloud_users`, `feature_flags_global`, `login_attempts`, `plans`, `schema_version`, `user_security_recovery`, `webhook_events` (all your data preserved) |

The file is **safe to re-run** — every change is wrapped in a check. If you
run it twice, the second run is a no-op.

---

## STEP 1 — Take a backup first (5 minutes)

Even though the migration is non-destructive, backup is mandatory before
any schema change.

1. In phpMyAdmin, click the **`moneydata`** database in the left sidebar.
2. Click the **Export** tab at the top.
3. Export method: **Quick**.
4. Format: **SQL**.
5. Click **Go**. It downloads `moneydata.sql` (your full backup).
6. Save that file somewhere safe (named `moneydata-backup-YYYY-MM-DD.sql`).

If anything goes wrong, you can restore by Import → that file.

---

## STEP 2 — Import the migration file

1. Make sure **`moneydata`** is selected in the left sidebar (the breadcrumb
   should say `Server: 127.0.0.1 » Database: moneydata`).

2. Click the **Import** tab at the top of the page.

3. Click **Choose File** (under "File to import") and select:

   ```
   D:\Claude\SparowVault\sql\migrations\IMPORT_VIA_PHPMYADMIN.sql
   ```

4. Below the file picker:
   - **Character set of the file:** `utf-8` (default).
   - **Partial import** → leave "Allow the interruption" UNCHECKED.
   - **Other options** → leave defaults.
   - **Format:** `SQL`.
   - **SQL compatibility mode:** `NONE`.

5. Scroll to the bottom. Leave **DELIMITER** as `;` (the default semicolon).
   This file does NOT use any custom delimiter so leave it alone.

6. Click **Go**.

7. Wait. Expected outcome: a green banner at the top —
   `Import has been successfully finished, N queries executed.`
   (`N` will be in the range 80-120 depending on what was already in place.)

If you see a yellow/red banner with errors, jump to the **Troubleshooting**
section below — don't proceed.

---

## STEP 3 — Verify the import worked

Still inside `moneydata`, click the **SQL** tab. Paste this query and click Go:

```sql
SELECT version_key, applied_at
  FROM schema_version
 WHERE version_key LIKE 'phase_%'
 ORDER BY applied_at, version_key;
```

You should see **10 rows**, one per phase:

```
phase_01_security_2026_05_13
phase_03_cloud_amount_paise_2026_05_13
phase_04_indexed_sync_fields_2026_05_13
phase_05_financial_ledger_2026_05_13
phase_07_user_credit_cards_2026_05_13
phase_08_user_loans_2026_05_13
phase_09_udhari_engine_2026_05_13
phase_11_ai_suggestions_2026_05_13
phase_13_privacy_audit_2026_05_13
phase_14_saas_billing_2026_05_13
```

If you see fewer than 10 rows, something didn't apply — re-run the import
(it's safe), or check the **Troubleshooting** section.

---

## STEP 4 — Spot-check that nothing was destroyed

In the left sidebar, click these tables one at a time and verify the row
counts match what they were before the import:

| Table | Row count before | Row count after (should be same) |
|---|---|---|
| `users` | 23 | 23 |
| `cloud_collection_rows` | 183 | 183 |
| `plans` | 4 | 4 |
| `plan_features` | 20 | 20 |
| `subscriptions` | 6 | 6 |
| `payments` | 0 | 0 |
| `audit_logs` | 9 | 9 |
| `login_attempts` | 15 | 15 |

The number of TABLES will have gone from 15 to 28 (13 new tables added).

---

## STEP 5 — Spot-check that the column adds worked

In phpMyAdmin, click **`users`** → **Structure** tab. You should see these new
columns at the bottom:

- `must_change_pin` (TINYINT(1))
- `deleted_at` (DATETIME)
- `deleted_reason` (VARCHAR(120))
- `last_policy_check_at` (DATETIME)
- `mobile_e164` (VARCHAR(20))
- `email_lc` (VARCHAR(254))

Click **`cloud_collection_rows`** → **Structure**. You should see:

- `amount_paise` (BIGINT)
- `schema_version` (INT)
- `txn_local_date` (DATE)
- `txn_month` (CHAR(7))
- `txn_type` (VARCHAR(32))
- `payment_mode` (VARCHAR(32))
- `category_id`, `account_id`, `card_id`, `loan_id`, `goal_id`, `udhari_id`
- `business_or_personal` (VARCHAR(32))
- `source_device_id` (VARCHAR(191))
- `payload_hash` (CHAR(64))

These are all NULL by default — no existing rows are affected.

---

## STEP 6 — You're done with SQL. Run the gates next.

In a terminal at the project root:

```
npm run phase:all:gates
```

This runs every phase's unit-test + code presence check. Paste any failure
output back to me and I'll fix the failing phase.

---

## Troubleshooting

### "Cannot add foreign key constraint" or error 1215

**Cause:** the parent table (`users` or `plans`) has a column with a
different character set than the new child tables.

**Fix:** the SparowVault `users` table should be on `utf8mb4_unicode_ci`.
Check with:

```sql
SHOW CREATE TABLE users\G
```

If it's `utf8` (not `utf8mb4`), run:

```sql
ALTER TABLE users CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

Then re-run the import.

### "Cannot add or update a child row: a foreign key constraint fails"

**Cause:** something tried to insert into one of the new tables before its
parent existed. Should not happen — the migration only creates tables and
adds columns, no INSERT statements except into `schema_version`.

If you see this, drop the new tables that partial-created and re-run:

```sql
SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS financial_effects, financial_events,
                     user_credit_cards,
                     user_loan_payments, user_loans,
                     udhari_settlements, udhari_entries, udhari_people,
                     ai_suggestions,
                     user_policy_acceptances, user_audit_logs, retention_jobs,
                     plan_prices;
SET FOREIGN_KEY_CHECKS = 1;
```

Then re-import the file.

### "Duplicate column name 'X'"

**Should not happen** — the migration is guarded. If you see this, it
means an old version of the SQL was imported earlier without guards.

**Fix:** open the imported `IMPORT_VIA_PHPMYADMIN.sql` and confirm every
ALTER TABLE is wrapped in `SET @col := ... ; SET @sql := IF(@col = 0, ...)`.
If yes, just re-run — the duplicate column already exists, so the IF
block will skip it.

### Import says "Successfully finished" but you only see partial new tables

**Cause:** the import hit a syntax error mid-file and silently stopped.

**Fix:**
1. Look at the very bottom of the phpMyAdmin response for any red text.
2. Click the **Import** tab again and check **"Show full queries"** to see
   exactly which query failed.
3. Paste the failing query and the error message back to me — I'll
   patch the migration.

### "MySQL server has gone away" / connection timeout

**Cause:** the import took longer than `max_allowed_packet` or
`wait_timeout`. Unlikely for this migration (it's small), but possible on
slow shared hosting.

**Fix:** in `php.ini` increase `max_allowed_packet` to `64M` and retry,
OR import the file in smaller chunks (paste sections of the SQL into the
**SQL** tab directly, one section at a time).

### Want to see what was applied without running the file?

Open `IMPORT_VIA_PHPMYADMIN.sql` and look at every `INSERT IGNORE INTO
schema_version VALUES (...)` line — those are the 10 phase versions.

---

## What to do if you want to ROLL BACK

I built a rollback file too: `sql/migrations/all_phases_combined_rollback.sql`.
But honestly, since this migration only ADDS things, the simpler rollback
is: restore the backup from Step 1.

In phpMyAdmin → **Import** → pick `moneydata-backup-YYYY-MM-DD.sql` → Go.
That puts you back exactly where you started.

If you want a targeted rollback (drop only the new tables, keep the column
adds), the file `all_phases_combined_rollback.sql` does that — but it
uses stored procedures with DELIMITER, so import it via the **SQL tab**,
NOT the **Import tab**:

1. Open the rollback file in a text editor.
2. Copy ALL contents.
3. phpMyAdmin → click `moneydata` → **SQL** tab.
4. **At the bottom of the SQL textarea, change "Delimiter" field to `//`**.
5. Paste the contents. Click Go.

---

## Quick reference

| File | What it does | How to import |
|---|---|---|
| `IMPORT_VIA_PHPMYADMIN.sql` | All phases, ADD-only, no DELIMITER tricks | **Import tab** (this guide) |
| `all_phases_combined.sql` | Same thing but uses stored procedures (for CLI users) | mysql CLI only |
| `all_phases_combined_rollback.sql` | Drops everything Phase 1-14 added | **SQL tab** with `//` delimiter |
