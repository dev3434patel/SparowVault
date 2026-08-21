# Phase 17 - Staging Setup Report

Final status: BLOCKED FOR REAL STAGING, LOCAL READINESS COMPLETE

## Scope completed locally

- Verified `docs/staging-setup.md` exists and defines staging hostname, TLS, database, `.env.staging`, Razorpay test keys, staging seed data, deployment, smoke tests, and promotion rules.
- Verified `/api/health.php` works locally and returns app status, DB status, env, version field, Razorpay enabled status, request ID, latency, and timestamp.
- Verified API response headers include `X-Request-Id`.
- Added `X-Request-Id` to allowed CORS request headers.
- Verified error responses include `requestId`.
- Added `npm run monitor:ops` for local/operator monitoring probes.

## Staging items that still require hosting access

- Staging domain is not provisioned from this local workspace.
- Staging TLS certificate is not provisioned from this local workspace.
- Staging database is not created on a real host from this local workspace.
- Staging `.env.staging` is documented but not deployed here.
- Staging Razorpay test keys are not available in this workspace.
- Staging admin and seed data cannot be verified until the staging DB exists.

## Health endpoint result

Local URL tested: `http://localhost:5000/api/health.php`

Observed response:

```json
{
  "ok": true,
  "data": {
    "status": "healthy",
    "appEnv": "development",
    "version": null,
    "razorpayEnabled": false,
    "db": {
      "status": "ok",
      "latencyMs": 1
    },
    "requestId": "6d5def49ae2501d8",
    "totalMs": 30,
    "time": "2026-05-14T20:05:40+00:00"
  }
}
```

Important note: `version` is `null` locally because the active local test DB does not have `schema_version`. A real staging database must apply production schema and migrations so `version` is populated before launch.

## Request ID checks

- Success response header includes `X-Request-Id`.
- Error response now includes `requestId` in the JSON body.
- POST to `/api/health.php` returned:

```json
{
  "ok": false,
  "error": "Method not allowed",
  "requestId": "ae3a7f55fd5a725e"
}
```

## Monitoring setup

Added:

- `scripts/monitoring-check.mjs`
- `npm run monitor:ops`

Current checks:

- Health endpoint status
- Failed webhook count
- Backup freshness
- Disk/storage placeholder check for Windows/shared-host environments
- DB size check

Latest local monitor result: PASS after a fresh backup was created.

## Required staging commands

Run on staging host/operator machine:

```bash
mysql -u root -p -e "CREATE DATABASE sparowvault_staging CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
mysql -u root -p sparowvault_staging < sql/production_schema.sql
for m in sql/migrations/phase_*.sql; do
  case "$m" in *_rollback.sql) continue;; esac
  mysql -u root -p sparowvault_staging < "$m"
done
npm run host:package
curl -i https://staging.YOUR_DOMAIN/api/health.php
```

## Final status

BLOCKED until real staging domain, TLS, DB, `.env.staging`, Razorpay TEST keys, admin, and seed data are provisioned and verified.
