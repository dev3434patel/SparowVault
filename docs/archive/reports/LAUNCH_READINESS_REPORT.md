# Phase 17 - Launch Readiness Report

Final status: AUTOMATED LOCAL GATE PASSED, MANUAL STAGING SIGN-OFF STILL REQUIRED

## Summary

Phase 17 code-level readiness is improved and the automated launch gate commands now pass locally. Local health, request IDs, monitoring, backup creation, restore drill, webhook ownership, browser E2E, hosting packaging, and all phase gates are functional. Controlled paid beta still requires manual staging sign-off on the real staging domain, Razorpay TEST mode, production secret separation, monitoring visibility, log review, and launch checklist completion.

## Files changed

- `D:\Claude\SparowVault\php\helpers\http.php`
- `D:\Claude\SparowVault\php\helpers\security.php`
- `D:\Claude\SparowVault\scripts\backup_db.php`
- `D:\Claude\SparowVault\scripts\restore-drill.mjs`
- `D:\Claude\SparowVault\scripts\monitoring-check.mjs`
- `D:\Claude\SparowVault\package.json`
- `D:\Claude\SparowVault\tests\unit\smoke.test.ts`
- `D:\Claude\SparowVault\tests\browser-e2e.mjs`
- `D:\Claude\SparowVault\STAGING_SETUP_REPORT.md`
- `D:\Claude\SparowVault\RESTORE_DRILL_REPORT.md`
- `D:\Claude\SparowVault\LAUNCH_READINESS_REPORT.md`

## Commands run

- `npm run phase:17:gate` - PASS
- `npm run check:php` - PASS
- `npm run typecheck` - PASS
- `npm run lint` - PASS
- `npm run test` - PASS, 29 files, 218 tests
- `npm run check:sql` - PASS exit code, but static warnings remain
- `npm run build` - PASS, with existing Vite bundle warnings
- `npm run monitor:ops` - initially FAIL due missing backup directory, then PASS after local backup
- `php scripts/backup_db.php` with local test DB env - PASS using PDO fallback
- `node scripts/restore-drill.mjs --backup <local backup> --target sparowvault_restore_drill` - PASS
- `npm run health` - PASS
- `npm run phase:all:gates` - initially timed out/failed due smoke timeout; PASS after test harness timeout fix, 18/18 gates
- `npm run test:webhook:ownership` - initially blocked by missing env; PASS against local test API with `RAZORPAY_WEBHOOK_SECRET`
- `npm run test:browser` - initially failed due missing `localhost:4000` and stale auth/import assumptions; PASS after local launch stack and browser harness updates, 37/37
- `npm run host:package` - PASS, bundle created at `release\hosting-bundle.zip`

## Health endpoint

Local `/api/health.php` result:

- `data.status`: `healthy`
- `data.appEnv`: `development`
- `data.version`: `null`
- `data.razorpayEnabled`: `false`
- `data.db.status`: `ok`
- `data.db.latencyMs`: `1`
- `data.requestId`: present
- `data.time`: present

Blocker: staging/production must return a non-null latest `schema_version`.

## Request IDs

Completed:

- `X-Request-Id` header is returned on successful responses.
- `requestId` is returned in error JSON.
- `X-Request-Id` is allowed in CORS request headers.
- `structured_log()` exists and scrubs sensitive keys.

## Launch test gate results

Automated commands:

- `npm run health`: PASS
- `npm run phase:all:gates`: PASS, 18/18 phase gates
- `npm run test:webhook:ownership`: PASS
- `npm run test:browser`: PASS, 37/37 browser checks
- `npm run host:package`: PASS

Harness fixes made:

- Increased the smoke alias import timeout from 5s to 15s because full-gate load can make the heavy service import exceed Vitest's default timeout.
- Updated browser E2E registration to accept Terms/Privacy, matching the Phase 15 policy requirement.
- Increased browser E2E app-shell wait to 45s for the SQL-backed first-run/default-seeding path.
- Updated browser E2E import flow to treat disabled import action as a valid validation outcome when preview rows are unresolved/invalid.

## Monitoring

Added `npm run monitor:ops`.

Latest local result:

- Health: PASS
- Failed webhooks: PASS, 0 failed
- DB size: PASS, 1.61 MB against 1024 MB threshold
- Backup freshness: PASS after backup creation
- Disk/storage: PASS placeholder on Windows; production should use host/cloud monitor for exact free disk

## Backups

Completed locally:

- DB backup created from `sparowvault_test`.
- Backup script now supports PDO fallback when `mysqldump` is not available.

Still required before beta:

- Nightly encrypted DB backup scheduled.
- Weekly full backup scheduled.
- Off-host storage configured.
- Retention policy enforced.
- Failed backup alert configured.

## Restore drill

Completed locally:

- Restored latest local backup to `sparowvault_restore_drill`.
- Restored 27 tables, 9 users, 16 transaction rows.
- Subscriptions table existed.

Still required before beta:

- Encrypted off-host backup restore drill.
- Browser login against restored DB.
- Transaction page check against restored DB.
- Reports check against restored DB.
- Subscription/webhook history check against restored DB.
- Non-null `schema_version` check after restoring staging/production backup.

## Launch checklist status

Passed locally:

- Typecheck
- Lint
- Unit tests
- Build
- PHP syntax check
- SQL dry run exit code
- Phase 17 gate
- Full all-phase gate
- Health endpoint
- Request ID success/error responses
- AI guardrails via full test suite
- Card/loan/udhari/report engines via full test suite
- Local backup and local restore drill
- Webhook ownership E2E against local test backend
- Browser E2E against local launch-test stack
- Hosting bundle packaging

Not complete:

- Real staging domain
- Real staging database
- Real staging env vars
- Razorpay TEST key staging round-trip
- Staging admin and seed verification
- Security headers over HTTPS staging domain
- External uptime monitor
- Error log monitor integration
- Failed webhook alert job
- Backup success alert job
- Exact disk/storage monitor on host
- Encrypted off-host restore drill
- Production artifact secret scan for the final deployment bundle

## Remaining risks

- Local `schema_version` is null in health response, so staging must prove migrations are applied correctly.
- SQL dry-run still reports non-idempotent legacy `ALTER TABLE` warnings in SQL files.
- Build bundle remains over 500 KB and Vite reports mixed dynamic/static imports.
- Browser/manual checks against real staging are not done.
- Razorpay staging has not been exercised in this workspace.
- The first failed `mysqldump` attempt created a zero-byte backup file; production backup job must verify non-zero encrypted artifacts.

## Rollback plan

- If monitoring fails, disable beta signup and keep the app in internal-only mode.
- If restore drill fails, stop launch and fix backup export/import before accepting paid users.
- If Razorpay staging fails, keep `ENABLE_RAZORPAY=false` and do not sell paid plans.
- If health endpoint returns degraded, roll back the deployment or switch traffic away from the host.
- If schema version is null on staging/production, re-run migrations and do not launch until health shows the expected version.

## Manual staging checklist status

- Staging uses staging DB: NOT VERIFIED in this workspace.
- Staging uses Razorpay test keys: NOT VERIFIED on real staging.
- Production does not use test secrets: NOT VERIFIED on deployed production artifact.
- `/api/health.php` returns healthy: VERIFIED locally; NOT VERIFIED on real staging.
- Failed webhook appears in admin/monitoring: webhook failure audit is tested locally; admin/monitoring visibility on staging NOT VERIFIED.
- Backup runs: VERIFIED locally; off-host encrypted staging backup NOT VERIFIED.
- Restore drill succeeds: VERIFIED locally; encrypted off-host staging restore NOT VERIFIED.
- Logs include request_id: request ID is in responses and structured logger; real log aggregator NOT VERIFIED.
- Logs do not include PIN/secrets: structured logger scrubs configured keys; real log sample NOT VERIFIED.
- Launch checklist all green: NOT VERIFIED because staging/prod items require host access.

## Final decision

AUTOMATED LOCAL GATE PASSED. CONTROLLED PAID BETA IS STILL WAITING ON MANUAL STAGING SIGN-OFF.

Do not open paid beta until the real staging checklist above is completed on the staging host and signed off.
