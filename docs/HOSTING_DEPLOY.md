# SparowVault — Hosting deploy guide

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

## Important

- This SQL is for **fresh installs**. Do not import over a live user database.
- No certification / E2E / Alice-Bob test rows are included.
- Keep backups of `.env` and the database off the public web root.
