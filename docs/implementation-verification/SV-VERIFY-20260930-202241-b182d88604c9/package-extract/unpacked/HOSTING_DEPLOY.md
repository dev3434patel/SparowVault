# SparowVault — Hosting deploy guide

## September 2026 Migration Gate

Do not deploy the new authentication code without the atomic-write and session/recovery migrations. Follow [the latest rollout and limits](EXPANSION-IMPLEMENTATION-STATUS.md). After backing up and validating the target database, run `php php/scripts/migrate_atomic_writes.php --database=EXACT_DATABASE_NAME --apply`, then `php php/scripts/migrate_security_sessions.php --database=EXACT_DATABASE_NAME --apply`. This also applies after importing the fresh schema below. Old sessions require login again. Local MariaDB has been tested; other server versions need a migration rehearsal.

Build with the lockfile installed. The build prepares `ocr/7.0.0/` worker, WASM and English model files; ship the complete directory with the frontend. `.wasm` and `.traineddata` MIME types and the `wasm-unsafe-eval` / worker CSP allowance are required. Do not enable general JavaScript `unsafe-eval` as a workaround. Verify on the actual HTTPS host, not just Vite preview.

`npm run backup:db` now requires a private absolute `BACKUP_DIR` outside the web root with mode 700 and an available `mysqldump` (`MYSQLDUMP_BIN` can specify its absolute path). Credentials remain in a temporary mode-600 client file, not command arguments. Dumps are not encrypted; encrypt and retain them under the deployment's backup policy, and restore-test them before claiming recovery readiness. Freeze schema changes during a consistent online snapshot.

## What’s in this package

| Path | Purpose |
|------|---------|
| `index.html` + `assets/` | Built frontend |
| `api/` + `php/` | PHP backend |
| `.htaccess` | Apache routing |
| `.env.host` | **Fill secrets here** (placeholders only in the zip) |
| `HOSTING_READY_CLEAN_IMPORT.sql` | Fresh MySQL schema + plan seeds (no test data) |

## Deploy steps

1. Upload/unzip this bundle to your web root (or subdomain).
2. Create an **empty** MySQL database (`utf8mb4_unicode_ci`).
3. Import **`HOSTING_READY_CLEAN_IMPORT.sql`** via phpMyAdmin or:

   ```bash
   mysql -u YOUR_USER -p YOUR_DB < HOSTING_READY_CLEAN_IMPORT.sql
   ```

4. Rename/copy `.env.host` values into the host env your PHP loads (or keep as `.env.host` if your stack reads it). Set at least:

   - `DB_HOST`, `DB_NAME`, `DB_USER`, `DB_PASS`
   - `CLOUD_JWT_SECRET` (long random string)
   - `APP_BASE_URL`, `CORS_ALLOWED_ORIGINS`
   - Razorpay keys only if billing is enabled

5. Open the site → create your first real user (or login as `admin` / `12345678` and **change PIN immediately**).

## SQL import verification

After phpMyAdmin shows a green success banner, you should also see a result grid from the file’s health-check query:

| Field | Expected |
|-------|----------|
| `table_count` | ≥ 28 |
| `schema_markers` | 13 |
| `plans_seeded` | 4 |
| `plan_prices_seeded` | 4 |
| `admin_users` | 1 |

If phpMyAdmin errors on `PREPARE` / a table named `if`, you are on an old file. Use **`HOSTING_READY_CLEAN_IMPORT.sql` v3** only.

## Important

- This SQL is for **fresh installs**. Do not import over a live user database.
- No certification / E2E / Alice-Bob test rows are included.
- Keep backups of `.env` and the database off the public web root.
