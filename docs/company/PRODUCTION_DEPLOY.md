# SparowVault Company — Production Deploy

**PHASE_10.** Evidence-oriented. Intentions are not enough — run the checks in §Verify.

## Stack requirements

| Layer | Requirement |
|-------|-------------|
| Node | 20+ (build only) |
| PHP | **8.2+** with extensions: `pdo_mysql`, `json`, `mbstring`, `openssl`, `curl`; Imagick optional (statements OCR) |
| MySQL / MariaDB | **MySQL 8.0+** or **MariaDB 10.5+** (utf8mb4). InnoDB required for online backups. |
| Web | Apache 2.4 (`mod_rewrite`, `mod_headers`, `mod_expires`) **or** nginx + PHP-FPM (see `deploy/nginx-spa.conf.example`) |
| TLS | HTTPS required in production/staging (`APP_ENV=production` enables HSTS in PHP) |

## Environment variables

Secrets live **only** in host env or untracked `.env*` files (see `.env.example` / `.env.host.example`). Never commit real values.

| Variable | Required | Purpose |
|----------|----------|---------|
| `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASS` | yes* | MySQL (*or `DATABASE_URL`) |
| `CLOUD_JWT_SECRET` | yes (prod) | ≥32 chars; `openssl rand -hex 64` |
| `APP_ENV` | yes | `production` / `staging` / `development` |
| `APP_BASE_URL` | yes | Public HTTPS origin |
| `CORS_ALLOWED_ORIGINS` | yes | Comma-separated HTTPS origins |
| `BACKUP_DIR` | ops | Absolute path **outside** web root for `npm run backup:db` |
| `BACKUP_OFFSITE_DIR` | ops | Optional second copy target for `backup-daily` |
| `COMPANY_STAGING_URL` | ops | HTTPS staging URL for headers live probe |

Bootstrap: `php/config/env.php` loads `.env` then `APP_ENV_FILE` target (e.g. `.env.host`). Production boot refuses empty/default JWT and empty DB password (`require_safe_production_secrets`).

## Production build

```bash
npm ci
npm run build          # emits dist/ (SPA) — no sourcemaps in prod vite config
# Serve dist/ as web root; keep api/ + php/ co-located for /api/*
```

Optional packaging: `node scripts/package-hosting.mjs` (placeholder `.env.host` only).

## Database — fresh vs upgrade

### Fresh host

1. Create empty DB `utf8mb4_unicode_ci`.
2. Import `sql/HOSTING_READY_CLEAN_IMPORT.sql` **or** `sql/production_schema.sql` + seeds.
3. Apply company migrations (order below).

### Company migration order (`apply-migration.php`)

```bash
php scripts/company/apply-migration.php --list
php scripts/company/apply-migration.php
```

| # | File |
|---|------|
| 1 | `sql/migrations/20260923_company_core.sql` |
| 2 | `sql/migrations/20260923_company_indexes.sql` |
| 3 | `sql/migrations/20260923_company_reversal_fk.sql` |
| 4 | `sql/migrations/20260923_company_bill_on_account.sql` |
| 5 | `sql/migrations/20260924_company_perf_indexes.sql` |

Personal/finance phases: `sql/migrations/all_phases_combined.sql` (see `sql/migrations/README.md`).

### Rollback (honest)

**Company (and most) migrations have no DOWN scripts.**  
Rollback = **restore from mysqldump backup** taken before the migration:

```bash
# before migrate
BACKUP_DIR=/var/backups/sparowvault npm run backup:db

# after bad migrate — restore into a maintenance window
mysql -h … -u … -p DB_NAME < /var/backups/sparowvault/db_YYYYMMDD_HHMMSS_….sql
```

Do not invent hand-written DOWN SQL for production — restore is the supported path.

## Apache / nginx

- Apache: ship repo `.htaccess` (HTTPS redirect, deny `.env`/sql/backups, HSTS, CSP, SPA fallback).
- nginx: adapt `deploy/nginx-spa.conf.example`.

## Verify (staging HTTPS)

```bash
# SPA + API reachable over HTTPS
curl -fsS "$COMPANY_STAGING_URL/api/healthz.php" | jq .
# Headers
COMPANY_STAGING_URL=https://staging.example.com node scripts/company/check-security-headers.mjs
# Migrations present
php scripts/company/apply-migration.php --list
```

Acceptance for PHASE_10: staging URL over HTTPS serving the SPA; `/api/healthz.php` green; headers check PASS; backup drill evidence; no secrets in git.
