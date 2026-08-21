# Recovery guide — fixing the V1 import error

## What went wrong

The error you saw:

```
Create table `moneydata`.`if` with foreign key constraint failed.
Referenced table `moneydata`.`financial_events` not found in the data dictionary
```

Notice the table name is **`if`** (literally the word "if"). That's the
giveaway. It means phpMyAdmin's SQL parser hit the `SET @sql := IF(...)`
pattern I used and got confused — it tried to parse `IF` as the start of
an `IF...THEN...END IF` flow-control statement, ate the next CREATE TABLE
header by mistake, and reported the failure with `if` as the table name.

V2 removes every `SET @sql := IF(...)` pattern. It uses plain
`ALTER TABLE ... ADD COLUMN IF NOT EXISTS` syntax — phpMyAdmin parses
that perfectly.

## Before re-importing — find out what V1 actually got done

Some of the V1 import may have succeeded before the parser broke. Run
this in **phpMyAdmin → moneydata → SQL tab** to see the current state:

```sql
-- A. Which phases are recorded as applied?
SELECT version_key, applied_at FROM schema_version
 WHERE version_key LIKE 'phase_%' ORDER BY applied_at;

-- B. Which new tables already exist?
SELECT TABLE_NAME FROM information_schema.TABLES
 WHERE TABLE_SCHEMA = DATABASE()
   AND TABLE_NAME IN (
     'financial_events','financial_effects','user_credit_cards',
     'user_loans','user_loan_payments',
     'udhari_people','udhari_entries','udhari_settlements',
     'ai_suggestions',
     'user_policy_acceptances','user_audit_logs','retention_jobs',
     'plan_prices'
   )
 ORDER BY TABLE_NAME;

-- C. Which new columns already exist?
SELECT TABLE_NAME, COLUMN_NAME FROM information_schema.COLUMNS
 WHERE TABLE_SCHEMA = DATABASE()
   AND COLUMN_NAME IN (
     'must_change_pin','deleted_at','deleted_reason',
     'expected_amount_paise',
     'amount_paise','schema_version','txn_local_date','txn_month','txn_type',
     'payment_mode','category_id','account_id','card_id','loan_id','goal_id','udhari_id',
     'business_or_personal','source_device_id','payload_hash',
     'last_policy_check_at','mobile_e164','email_lc',
     'limit_value','limit_unit',
     'previous_period_end','renewed_from_subscription_id',
     'scheduled_plan_id','scheduled_change_at'
   )
 ORDER BY TABLE_NAME, COLUMN_NAME;
```

This tells you exactly how far V1 got. **You DON'T need to undo anything**
— V2 is fully idempotent. Any tables/columns/indexes that V1 did manage to
create are skipped on V2's re-import.

## Step-by-step: import V2

1. **Back up first** (5 minutes, mandatory).
   phpMyAdmin → moneydata → Export → Quick → SQL → Go.
   Save the file as `moneydata-backup-pre-v2.sql`.

2. **Open phpMyAdmin → moneydata.**

3. Click **Import** (top toolbar).

4. Click **Choose File** → select:
   ```
   D:\Claude\SparowVault\sql\migrations\IMPORT_VIA_PHPMYADMIN_V2.sql
   ```

5. Leave defaults: SQL format, UTF-8, delimiter `;`, no compatibility mode.

6. Click **Go**.

7. Expected: green banner — `Import has been successfully finished`.

8. **Verify.** SQL tab → paste:
   ```sql
   SELECT version_key FROM schema_version WHERE version_key LIKE 'phase_%' ORDER BY version_key;
   ```
   You should see **10 rows** — one per phase.

9. **Spot-check.** Click `users` → Structure tab. Confirm new columns at
   the bottom: `must_change_pin`, `deleted_at`, `deleted_reason`,
   `last_policy_check_at`, `mobile_e164`, `email_lc`.

10. **Confirm row counts unchanged**:
    - `users` still has 23 rows
    - `cloud_collection_rows` still has 183 rows
    - `plans` still has 4 rows

## If V2 also fails

The most likely cause now is `ADD COLUMN IF NOT EXISTS` not being supported
on your MySQL/MariaDB version. The error message will say something like
`You have an error in your SQL syntax near 'IF NOT EXISTS ...'`.

### Check your server version

phpMyAdmin → Home (top-left logo) → look at the right-side panel:
- "Server type: MariaDB" — version 10.0.2 or higher → V2 will work.
- "Server type: MySQL" — version 8.0.12 or higher → V2 will work.
- Anything older → use the legacy approach below.

### Legacy fallback (MySQL < 8.0.12)

If V2 fails on the ADD COLUMN IF NOT EXISTS lines, use this manual approach
in the SQL tab. For each missing column, run only the line for that column.

Example — to add `users.must_change_pin` only if not present:
```sql
-- Quick check first:
SHOW COLUMNS FROM users LIKE 'must_change_pin';

-- If the result is empty, run:
ALTER TABLE users ADD COLUMN must_change_pin TINYINT(1) NOT NULL DEFAULT 0;
```

Repeat for each column listed in the V2 file's "COLUMN ADDS" section.

It's tedious but bulletproof.

## What V2 does (recap)

- `SET FOREIGN_KEY_CHECKS = 0` at the top — lets us CREATE child tables
  even if the parent is later in the file. Re-enabled at the end.
- All 13 new tables via `CREATE TABLE IF NOT EXISTS` — re-runs are no-ops.
- All column adds via `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` — re-runs
  are no-ops.
- All index adds via `ALTER TABLE ... ADD KEY IF NOT EXISTS` — re-runs are
  no-ops on MariaDB / MySQL 8.0.12+; will error with "Duplicate key name"
  on older MySQL (you can ignore those errors).
- INSERT IGNORE into `schema_version` — re-runs are no-ops.

## Why V1 failed (for the curious)

V1 used this pattern:
```sql
SET @col := (SELECT COUNT(*) FROM information_schema.COLUMNS ...);
SET @sql := IF(@col = 0, 'ALTER TABLE ...', 'DO 0');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
```

That's perfectly valid SQL. **But phpMyAdmin's importer pre-parses the
SQL file with its own regex-based splitter before sending statements to
MySQL.** When that splitter sees the `IF(`, it tries to match it against
the `IF condition THEN ... END IF` flow-control syntax, fails, then
miscounts statement boundaries. The result is that the CREATE TABLE
right after the IF block gets parsed with `IF` as its table name.

The fix is to never use a top-level `IF` token outside of stored
procedures (where DELIMITER `//` protects it from the splitter). V2 does
this by using the native MariaDB/MySQL 8 `IF NOT EXISTS` clause, which
isn't a keyword the parser stumbles on.
