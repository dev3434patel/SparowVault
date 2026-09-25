# SparowVault Company — Developer Onboarding (<30 minutes)

## Prerequisites

- Node 20+, PHP 8.2+, MySQL 8 / MariaDB 10.5+ (XAMPP on Windows is fine)
- Git, Composer not required (no PHP Composer deps)

## 1. Clone & install (≈5 min)

```bash
git clone <repo-url> SparowVault && cd SparowVault
npm ci
```

## 2. Env file (≈3 min)

```bash
cp .env.example .env
cp .env.host.example .env.local   # or point APP_ENV_FILE at .env.local
```

Edit `.env`:

```
APP_ENV_FILE=".env.local"
```

Edit `.env.local` (never commit):

```
DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=sparowvault
DB_USER=root
DB_PASS=
CLOUD_JWT_SECRET=dev-only-change-me-to-at-least-32-chars!!
APP_ENV=development
APP_BASE_URL=http://localhost:5173
CORS_ALLOWED_ORIGINS=http://localhost:5173
```

## 3. Database (≈10 min)

```bash
# Create DB, then either:
mysql -u root sparowvault < sql/HOSTING_READY_CLEAN_IMPORT.sql
# Company schema:
php scripts/company/apply-migration.php
```

Confirm: `curl http://localhost:8080/api/healthz.php` → `healthy` (after API is up).

## 4. Run locally (≈5 min)

```bash
npm run dev
# API :8080  SPA :5173
```

Open `http://localhost:5173/company/login`. Register a user or use a local seed account; change any default admin PIN immediately.

## 5. Smoke the company suite (≈5–10 min)

```bash
npm run company:test
npm run company:test:php
curl -fsS http://localhost:8080/api/healthz.php
node scripts/company/check-security-headers.mjs
```

## Where things live

| Area | Path |
|------|------|
| Company SPA | `src/company/` |
| Company API | `api/company/` + `php/helpers/company/` |
| Migrations | `sql/migrations/20260923_company_*.sql` |
| Ops | `docs/company/RUNBOOK.md`, `PRODUCTION_DEPLOY.md` |
| Gates | `npm run company:gate:all` |

## Don'ts

- Do not commit `.env`, `.env.local`, `.env.host`, dumps, or PIN files.
- Do not run `company:test:backup` against your only copy of production data.
- Do not invent migration DOWN scripts for company — restore from backup.

Full production path: [PRODUCTION_DEPLOY.md](./PRODUCTION_DEPLOY.md).
