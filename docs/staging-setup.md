# Staging environment setup

Mirror production layout on a staging subdomain so every release can bake
for 24h before it goes live.

## 1. Hostname + TLS

- Pick a subdomain, e.g. `staging.YOUR_DOMAIN`.
- Issue a TLS cert (Let's Encrypt or your provider's wildcard).
- The same `.htaccess` from production applies — HTTPS redirect, headers, deny rules.

## 2. Database

```bash
mysql -u root -p -e "CREATE DATABASE sparowvault_staging CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
mysql -u root -p sparowvault_staging < sql/production_schema.sql
for m in sql/migrations/phase_*.sql; do
  case "$m" in *_rollback.sql) continue;; esac
  mysql -u root -p sparowvault_staging < "$m"
done
```

Confirm `schema_version` lists every phase row.

## 3. Environment

Use a dedicated `.env.staging`:

```env
APP_ENV=staging
DB_HOST=…
DB_NAME=sparowvault_staging
DB_USER=…
DB_PASS=…
CLOUD_JWT_SECRET="<fresh 64-hex, separate from prod>"
CORS_ALLOWED_ORIGINS="https://staging.YOUR_DOMAIN"
ENABLE_RAZORPAY=true
RAZORPAY_KEY_ID="rzp_test_…"
RAZORPAY_KEY_SECRET="<TEST>"
RAZORPAY_WEBHOOK_SECRET="<TEST>"
APP_BASE_URL="https://staging.YOUR_DOMAIN"
```

Wire it via `APP_ENV_FILE=.env.staging` (PHP loader honours this).

## 4. Seed staging data

Never copy production rows. Use the fixture loader:

```bash
TEST_DB_NAME=sparowvault_staging TEST_DB_USER=… TEST_DB_PASS=… npm run db:test:seed
```

## 5. Deploy

```bash
npm run host:package
scp -r release/hosting-bundle/* staging-host:/var/www/sparowvault-staging/
# or rsync; keep .env.staging out of the bundle and place separately
```

## 6. Smoke

```bash
curl -i https://staging.YOUR_DOMAIN/api/health.php
# Expect: 200 with data.status="healthy"
```

Run the e2e harnesses against staging:

```bash
BASE_URL=https://staging.YOUR_DOMAIN npm run test:api
BASE_URL=https://staging.YOUR_DOMAIN \
RAZORPAY_WEBHOOK_SECRET=<TEST> \
TEST_DB_* (staging) \
npm run test:webhook:ownership
BASE_URL=https://staging.YOUR_DOMAIN TEST_DB_* (staging) npm run test:account:endpoints
```

## 7. Promotion to production

- Staging must have been green for **24 hours** with the production-candidate build.
- All Phase 17 launch checklist boxes must be ticked.
- Deploy production via `npm run host:package` against the production env file.
- Validate `/api/health.php` immediately after.
- Tag the release in git: `git tag -a v0.x.y -m 'Launch — phase 14 schema'`.

## 8. Tear-down for short-lived staging

If you spin up a temporary staging stack:
```bash
mysql -u root -p -e "DROP DATABASE sparowvault_staging;"
rm -rf /var/www/sparowvault-staging
```
Confirm no `.env.staging` leftovers on operator machines.
