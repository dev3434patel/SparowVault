# SparowVault — Full Database Import Guide (phpMyAdmin)

This guide gets you from "nothing" (or "partial install") to a complete,
phases-0-through-14-applied SparowVault database in 10 minutes using only
phpMyAdmin. No terminal, no command line.

The file you'll import: **`sql/SPAROWVAULT_FULL_DATABASE.sql`**

---

## What this file is

ONE bootstrap SQL containing:

- All 24 SparowVault tables (with every Phase 1-14 column already baked in)
- Default subscription plans (FREE, BASIC, PRO, PRO_YEARLY)
- Default global feature flags (7)
- Default branding / app settings (8)
- A default admin user (`username = admin`, `PIN = 12345678` — change immediately)
- All `schema_version` markers (12)

**Safe properties:**
- Uses only plain DDL — no DELIMITER blocks, no `IF()` tricks, no prepared statements.
- `SET FOREIGN_KEY_CHECKS = 0` at the top so creation order never matters.
- Every `CREATE TABLE IF NOT EXISTS` skips if the table already exists.
- Every `ADD COLUMN IF NOT EXISTS` and `ADD KEY IF NOT EXISTS` skips if already present.
- All seed data uses `ON DUPLICATE KEY UPDATE` so it refreshes safely on re-runs.
- **Existing user data is never touched.**

---

## STEP 1 — Decide where you're importing

### Option A: Brand-new database

1. phpMyAdmin → top toolbar → **Databases** tab.
2. Create database — name it `moneydata` (or whatever you prefer).
3. Collation: **`utf8mb4_unicode_ci`**.
4. Click **Create**.
5. Click the new database in the left sidebar.

### Option B: Existing database (e.g. your `moneydata` with 23 users + 183 rows)

1. phpMyAdmin → click `moneydata` in the left sidebar.
2. **Skip directly to Step 2** — the file detects existing tables and skips them.

Either way, **back up first** before importing anything:

- Click the database in the sidebar.
- Click **Export** tab.
- Export method: **Quick**. Format: **SQL**.
- Click **Go**. Save the file as `moneydata-backup-YYYY-MM-DD.sql`.

---

## STEP 2 — Import the file

1. Make sure the right database is selected (breadcrumb at top reads
   `Server: 127.0.0.1 » Database: moneydata`).
2. Click **Import** (top toolbar).
3. **File to import**: click **Choose File** → select
   ```
   D:\Claude\SparowVault\sql\SPAROWVAULT_FULL_DATABASE.sql
   ```
4. Leave defaults:
   - Character set: **utf-8**
   - Format: **SQL**
   - Partial import: **unchecked**
   - SQL compatibility mode: **NONE**
   - Format-specific options: leave as-is
   - Delimiter: **`;`** (the default semicolon — do NOT change this)
5. Click **Go**.
6. Wait. Expected: green banner —
   ```
   Import has been successfully finished, N queries executed.
   ```

If you see errors, jump to the **Troubleshooting** section at the bottom.

---

## STEP 3 — Verify (paste each into SQL tab → Go)

### 3a — All 12 phase markers recorded?

```sql
SELECT version_key, applied_at FROM schema_version ORDER BY applied_at;
```

Expected: 12 rows, one per phase, plus the bootstrap marker.

### 3b — All tables present?

```sql
SELECT TABLE_NAME FROM information_schema.TABLES
 WHERE TABLE_SCHEMA = DATABASE()
 ORDER BY TABLE_NAME;
```

Expected (~28 rows depending on your starting state):

```
admin_audit_logs
ai_suggestions
api_rate_limits
app_settings
audit_logs
cloud_collection_rows
cloud_users
feature_flags_global
financial_effects
financial_events
login_attempts
payments
plan_features
plan_prices
plans
retention_jobs
schema_version
subscriptions
udhari_entries
udhari_people
udhari_settlements
user_audit_logs
user_credit_cards
user_loan_payments
user_loans
user_policy_acceptances
user_security_recovery
users
webhook_events
```

### 3c — Admin user created?

```sql
SELECT username, role, is_active, must_change_pin FROM users WHERE role = 'admin';
```

Expected: at least one row with `role=admin`. If you already had an
admin, the script left it alone.

### 3d — Plans seeded?

```sql
SELECT code, name, price_inr, billing_interval, is_active FROM plans ORDER BY sort_order;
```

Expected: 4 rows — FREE, BASIC, PRO, PRO_YEARLY.

### 3e — Your existing user data still there?

If you came from an existing `moneydata` with users + rows:

```sql
SELECT COUNT(*) AS user_count FROM users;
SELECT COUNT(*) AS row_count  FROM cloud_collection_rows;
SELECT COUNT(*) AS plan_count FROM plans;
```

Expected: counts unchanged from your pre-import backup.

---

## STEP 4 — Change the default admin PIN

**MANDATORY before going to production.** The seed PIN `12345678` is in
the SQL file and known to anyone who has seen it.

1. Open your SparowVault app at http://localhost (or wherever your PHP
   runs).
2. Sign in as `admin` / `12345678`.
3. The app should force you to a Change PIN screen (because
   `must_change_pin = 1` is set on the seeded admin).
4. Enter a new PIN (4-8 digits, not 12345678, not a sequence).
5. Verify in phpMyAdmin:
   ```sql
   SELECT must_change_pin FROM users WHERE username='admin';
   ```
   Should now be `0`.

---

## STEP 5 — Run the phase gates (optional but recommended)

In a terminal at the project root:

```
npm run phase:all:gates
```

This walks every phase's code-side test. Paste any failure output back to
me and I'll fix the failing phase.

---

## Troubleshooting

### Error: "Cannot add foreign key constraint" / errno 150

This happens if the parent table has a column with a different character
set or column type than the child table's FK.

**Fix:** ensure `users.id` is `VARCHAR(191)` with `utf8mb4_unicode_ci`
collation. If you're upgrading from an older database, run:

```sql
ALTER TABLE users CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

Then re-import.

### Error: "Unknown column option 'IF NOT EXISTS'" or syntax error near IF NOT EXISTS

Your MySQL/MariaDB is too old to support `ADD COLUMN IF NOT EXISTS`.
**Required versions:**
- MariaDB 10.0.2 or higher
- MySQL 8.0.12 or higher

To check yours: phpMyAdmin Home (top-left logo) → look at the right
panel. You'll see something like:
```
Server type: MariaDB
Server version: 10.4.32-MariaDB
```

If older, your options:

1. **Upgrade** — most reliable. XAMPP latest ships MariaDB 10.4+.
2. **Drop the ALTER TABLE blocks** — for a fresh database without
   pre-existing tables, the `CREATE TABLE IF NOT EXISTS` statements
   alone are enough. The defensive `ALTER TABLE ... ADD COLUMN IF NOT
   EXISTS` blocks are only there for upgrades. You can delete them and
   the import will work.

### Error: "MySQL server has gone away" / timeout

Your `max_allowed_packet` or PHP `upload_max_filesize` is too small.

**Fix (XAMPP):**
1. Open `C:\xampp\mysql\bin\my.ini` (or wherever your XAMPP lives).
2. Find `[mysqld]` section → set `max_allowed_packet=64M`.
3. Restart MySQL service from XAMPP control panel.
4. Try import again.

### Error: "Table already exists"

Should not happen — every CREATE uses `IF NOT EXISTS`. If it does, you
likely have `sql_mode=STRICT_ALL_TABLES` interfering. Check:

```sql
SELECT @@sql_mode;
```

If it has `STRICT_*`, run before import:
```sql
SET sql_mode = '';
```

### Error: "Specified key was too long; max key length is 767 bytes"

Your MySQL is on the old InnoDB format that limits keys to 767 bytes.

**Fix:** add to `[mysqld]` in `my.ini`:
```
innodb_file_format=Barracuda
innodb_large_prefix=ON
innodb_default_row_format=DYNAMIC
```

Restart MySQL. Re-import.

### Import says success but admin row not created

This happens if you already have an admin in `users`. The seed block uses
`WHERE NOT EXISTS (SELECT 1 FROM users WHERE role = 'admin')` so it won't
overwrite an existing admin. To reset the seed admin:

```sql
DELETE FROM users WHERE username = 'admin';
-- Then re-run just the admin seed block from SPAROWVAULT_FULL_DATABASE.sql
-- (paste section 13 only into the SQL tab).
```

---

## Files reference

| File | When to use |
|---|---|
| `sql/SPAROWVAULT_FULL_DATABASE.sql` | **Always use this one.** Complete bootstrap with all phases inline. Import via phpMyAdmin Import tab. |
| `sql/SPAROWVAULT_FULL_DATABASE_GUIDE.md` | This guide. |
| `sql/migrations/IMPORT_VIA_PHPMYADMIN_V2.sql` | Older — only adds new tables/columns to existing schema, doesn't include core tables. Use only if you specifically want migrations-only. |
| `sql/migrations/PHPMYADMIN_FIX_GUIDE.md` | Older — troubleshooting for the V1 file. |
| `sql/production_schema.sql` | The original schema. Now superseded by `SPAROWVAULT_FULL_DATABASE.sql` for fresh installs. |

---

## Sign-off

After Step 4 (admin PIN changed) and Step 3 verification queries return
the expected counts, you're done. The schema is ready for the
SparowVault app to connect and use.

Next: run `npm run phase:all:gates` to verify the code-side phase gates.
