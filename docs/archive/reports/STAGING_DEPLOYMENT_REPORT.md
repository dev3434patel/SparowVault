# SparowVault Staging Deployment Report

Generated: 2026-05-15 21:39 IST

## Final Status

Final status: **BLOCKED**

Reason: a real staging deployment cannot be completed from this workspace because no staging domain, DNS/hosting control access, SSH/SFTP target, staging MySQL credentials, or Razorpay staging/test dashboard credentials were provided or discoverable locally.

Local deploy-readiness checks passed. The hosting bundle can be built, PHP and SQL checks pass, and the current local health endpoint is healthy. This is not the same as a real hosted staging deployment.

## Requested Tasks

| Task | Status | Evidence |
|---|---:|---|
| Create staging domain | BLOCKED | No DNS/hosting credentials or target domain provided |
| Create separate staging DB | BLOCKED | No staging MySQL host/user/password provided |
| Configure staging env | BLOCKED | `.env.staging` exists but contains blank DB/domain/secret values |
| Deploy hosting bundle | BLOCKED | `release/hosting-bundle.zip` was generated locally, but no upload target exists |
| Run health endpoint | PARTIAL PASS | Local `http://localhost:5000/api/health.php` returned healthy |
| Test login/dashboard/user/admin pages | BLOCKED for real staging | Requires deployed staging URL; local browser smoke was previously passing |

## What I Changed

- Added this report: `STAGING_DEPLOYMENT_REPORT.md`.
- Rebuilt the local hosting bundle by running `npm run host:package`.
- Generated deployment validation logs in `deployment-logs/`.

No application feature code, finance logic, database schema, API behavior, ledger behavior, or auth behavior was intentionally changed.

## Why I Changed It

- The report is required by the staging deployment task.
- The hosting bundle was rebuilt to verify that the current codebase can still produce a deployable artifact.
- PHP and SQL checks were rerun to confirm deployment readiness before any real staging upload.

## Files Changed or Generated

Primary report:

- `STAGING_DEPLOYMENT_REPORT.md`

Generated/updated validation artifacts:

- `deployment-logs/host_package.log`
- `deployment-logs/check_sql.log`
- `deployment-logs/check_php.log`
- `deployment-logs/staging-deploy-validation-results.json`
- `deployment-logs/local-health-check.json`
- `release/hosting-bundle/`
- `release/hosting-bundle.zip`
- `dist/`

## Commands Run

| Command | Status | Duration | Log |
|---|---:|---:|---|
| `npm run host:package` | PASS | 16.57s | `deployment-logs/host_package.log` |
| `npm run check:sql` | PASS | 2.33s | `deployment-logs/check_sql.log` |
| `npm run check:php` | PASS | 17.11s | `deployment-logs/check_php.log` |
| `Invoke-WebRequest http://localhost:5000/api/health.php` | PASS | n/a | `deployment-logs/local-health-check.json` |

## Health Endpoint Result

Local health endpoint:

```json
{
  "ok": true,
  "data": {
    "status": "healthy",
    "appEnv": "development",
    "version": "phase_14_saas_billing_2026_05_13",
    "razorpayEnabled": false,
    "db": {
      "status": "ok",
      "latencyMs": 1
    }
  }
}
```

This confirms the local runtime is healthy. It does **not** certify a hosted staging environment.

## SQL Checks Required

Completed locally:

- `npm run check:sql` passed.

Still required on real staging:

1. Create a dedicated staging database, for example `sparowvault_staging`.
2. Import the canonical deployable SQL into staging.
3. Apply required phase migrations if not included in the canonical SQL.
4. Verify `schema_version`.
5. Run API/browser tests against the staging DB only.
6. Confirm staging contains no production user data.

Required staging DB command pattern:

```bash
mysql -h <staging-db-host> -P 3306 -u <staging-db-user> -p -e "CREATE DATABASE sparowvault_staging CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
mysql -h <staging-db-host> -P 3306 -u <staging-db-user> -p sparowvault_staging < sql/production_schema.sql
mysql -h <staging-db-host> -P 3306 -u <staging-db-user> -p sparowvault_staging < sql/migrations/all_phases_combined.sql
```

## Staging Env Required

`.env.staging` currently contains placeholders and cannot be used as-is.

Required values:

```env
APP_ENV=staging
APP_BASE_URL=https://staging.<your-domain>
CORS_ALLOWED_ORIGINS=https://staging.<your-domain>

DB_HOST=<staging-db-host>
DB_PORT=3306
DB_NAME=sparowvault_staging
DB_USER=<staging-db-user>
DB_PASS=<staging-db-password>

CLOUD_JWT_SECRET=<fresh-64-byte-or-longer-random-secret>
CLOUD_JWT_EXPIRES_IN=7d

ENABLE_RAZORPAY=true
RAZORPAY_KEY_ID=<rzp_test_key_id>
RAZORPAY_KEY_SECRET=<rzp_test_key_secret>
RAZORPAY_WEBHOOK_SECRET=<staging_webhook_secret>

VITE_API_BASE_URL=https://staging.<your-domain>
VITE_CLOUD_ONLY_MODE=true
VITE_ENABLE_RAZORPAY=true
```

Do not reuse production DB credentials, production JWT secret, or production Razorpay live keys for staging.

## Manual Tests Run

Completed locally:

- Local health endpoint smoke check.
- Hosting bundle generation.
- PHP syntax validation.
- SQL dry-run validation.

Not run because staging is not deployed:

- Hosted staging login.
- Hosted dashboard.
- Hosted user pages.
- Hosted admin pages.
- Hosted browser console verification.
- Hosted `.env`, `/sql/`, `/data/`, `/php/config/` block checks.
- Hosted HTTPS redirect and security header verification.

## Screenshots and Logs Required

Generated logs:

- `deployment-logs/host_package.log`
- `deployment-logs/check_sql.log`
- `deployment-logs/check_php.log`
- `deployment-logs/local-health-check.json`

Still required after real deployment:

- Screenshot of staging CloudAuth page.
- Screenshot of successful staging dashboard login.
- Screenshot/log of admin dashboard access.
- Browser console export showing no fatal errors.
- Network evidence for `/api/health.php`.
- Header evidence for HSTS, CSP, X-Frame-Options or frame-ancestors, X-Content-Type-Options, Referrer-Policy, and Permissions-Policy.

## Real Staging Deployment Steps Still Needed

1. Create DNS record for `staging.<your-domain>`.
2. Provision HTTPS certificate.
3. Create staging MySQL database and staging-only DB user.
4. Import schema and migrations.
5. Upload `release/hosting-bundle.zip` contents to the staging web root.
6. Place real staging `.env.host` or configured env file outside public access.
7. Ensure `.htaccess` is active on the host.
8. Configure Razorpay test keys and webhook URL:
   - `https://staging.<your-domain>/api/payments/razorpay/webhook.php`
9. Run health endpoint.
10. Run login/dashboard/user/admin smoke tests.
11. Run API and webhook tests with `BASE_URL=https://staging.<your-domain>`.

## Risks Remaining

- No real staging domain exists yet.
- No separate staging DB has been created from this workspace.
- No staging env secrets are configured.
- No hosted bundle has been uploaded.
- No hosted health endpoint has been tested.
- No hosted login/dashboard/admin smoke test has been run.
- Razorpay staging webhook delivery is not tested.
- HTTPS/security headers are not verified on a real host.
- Backup/restore and monitoring are not verified for staging.

## Rollback Plan

If staging deployment fails after upload:

1. Disable public access to the staging subdomain or put it behind maintenance mode.
2. Restore the previous staging web root from hosting backup.
3. Drop and recreate the staging DB if test data/schema is corrupted.
4. Re-import the last known-good SQL snapshot.
5. Reapply the previous known-good `.env.host`.
6. Re-run `/api/health.php`, API smoke tests, and browser smoke tests.

No production rollback is required because this task did not deploy to production.

## Evidence Summary

- Local hosting package: **PASS**
- Local PHP syntax check: **PASS**
- Local SQL check: **PASS**
- Local health endpoint: **PASS**
- Real staging domain: **BLOCKED**
- Real staging DB: **BLOCKED**
- Real hosted deployment: **BLOCKED**
- Real hosted login/dashboard/admin smoke: **BLOCKED**

Final status: **BLOCKED**
