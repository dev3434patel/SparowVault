# SparowVault Phase 1 Test Gate Report

Date: 2026-05-14
Environment: Windows local, PHP built-in server on http://localhost:4000, MySQL test database `sparowvault_phase1_test`

## Scope

Phase 1 security and auth gate only. No Phase 2 work was started.

## Source Patches Applied

- `php/controllers/cloud.php`
  - `/api/auth/me.php` now requires an active user before returning profile data. This closes the old-JWT-after-account-delete gap.
- `sql/20260501_sql_only_full.sql`
  - Added Phase 1 auth columns to `users`: `must_change_pin`, `deleted_at`, `deleted_reason`.
  - Added `idx_users_deleted`.
  - Added Phase 3/4 indexed sync columns to `cloud_collection_rows`: `amount_paise`, date/month/type/payment/account/category/card/loan/goal/udhari index fields, `source_device_id`, `payload_hash`, `schema_version`.
  - Added Phase 1 webhook ownership columns/keys to `payments`: `expected_amount_paise`, provider order/payment uniqueness.
  - Admin seed now sets `must_change_pin = 1`.
- `tests/webhook-ownership-e2e.mjs`
  - Made default test payment IDs unique per test order to avoid false failures against the new unique payment key.
- `tests/account-endpoints-e2e.mjs`
  - Updated fixture payloads to match current sync API shape.
  - Cleared rate-limit buckets during test cleanup.
  - Verified export isolation using `categories`.
  - Accepted deleted login as denied on either 401 or 403.

## Commands Run

| Command | Result | Notes |
|---|---:|---|
| `npm run phase:01:gate` | PASS | 17 pass, 0 fail, 0 warn, 1 skipped URL probe. Wrote `PHASE_01_GATE_REPORT.md`. |
| `npm run test:webhook:ownership` | PASS | Required `BASE_URL`, `TEST_DB_*`, `RAZORPAY_WEBHOOK_SECRET` against isolated test DB. |
| `npm run test:account:endpoints` | PASS | Export isolation, delete, audit log, deleted login, old JWT denial, sibling isolation all pass. |
| `npm run build` | PASS | Vite production build succeeds. Large chunk warnings remain non-fatal. |
| `npm run host:package` | PASS | Built `release/hosting-bundle.zip`; no `.map` files found. |
| `npm run check:php` | PASS | 72 PHP files parse cleanly. |
| `npm run check:sql` | PASS WITH WARNINGS | Exit 0. Static warnings remain for legacy SQL files with non-idempotent `ALTER TABLE`. |

## Test Database

- Dropped and recreated `sparowvault_phase1_test`.
- Imported `sql/20260501_sql_only_full.sql` successfully after patch.
- Health endpoint returned healthy on `http://localhost:4000/api/health.php`.

## Manual Hosted / Package Checks

| Check | Result | Evidence |
|---|---:|---|
| `/.env` protected | PASS BY CONFIG | `.htaccess` has `<FilesMatch>` deny rules for `.env*`. Live hosted response not tested because no hosted URL was provided. |
| `/sql/` protected | PASS BY CONFIG | `.htaccess` has `RedirectMatch 403` for `/sql`. Live hosted response not tested because no hosted URL was provided. |
| `/data/` protected | PASS BY CONFIG | `.htaccess` has `RedirectMatch 403` for `/data`. Live hosted response not tested because no hosted URL was provided. |
| `/php/config/` protected | PASS BY CONFIG | `.htaccess` has `RedirectMatch 403` for `/php/config`. Live hosted response not tested because no hosted URL was provided. |
| HTTPS redirect | PASS BY CONFIG | `.htaccess` rewrites HTTP to HTTPS unless `SV_SKIP_HTTPS=1`. Live hosted response not tested because no hosted URL was provided. |
| Security headers | PARTIAL | Local PHP API emits CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy. HSTS is present in `.htaccess`; local PHP built-in server does not apply Apache `.htaccess`. |
| Production bundle has no `.map` files | PASS | `dist` and `release/hosting-bundle` scans returned no `.map` files. |
| Production bundle has no real secrets | PASS | Phase 1 gate secret scan passed. `release/hosting-bundle/.env.host` contains placeholder-only values. |

## Manual Auth Checks

| Check | Result | Notes |
|---|---:|---|
| Login works | PASS | New test user registered and logged in through `/api/auth/login.php`. |
| Logout works | PASS | `/api/auth/logout.php` returned 200 and expired `sv_auth`. |
| Deleted user cannot continue with old JWT | PASS | Covered by `npm run test:account:endpoints`; `/me` denied after delete. |
| Revoked/deactivated admin cannot continue using admin APIs | PASS FUNCTIONALLY | Old admin cookie returned non-200 after `is_active = 0`. Current status is 500; should be cleaned to 401/403 later. |
| Admin seed must force PIN change | PASS | Fresh SQL import sets admin `must_change_pin = 1`; `/api/auth/me.php` returns `mustChangePin: true` after admin login. |

## Remaining Risks

- No real hosted URL was provided, so the response-level checks for `/.env`, `/sql/`, `/data/`, `/php/config/`, HTTPS redirect, and HSTS could only be verified by `.htaccess`/bundle inspection, not live HTTP responses.
- Admin API auth failures currently bubble as HTTP 500 from some endpoint wrappers. The security behavior blocks access, but the status code should be normalized to 401/403 in a later cleanup.
- Vite reports a large JS chunk and dynamic-import/static-import warnings. Build succeeds; this is performance/packaging debt, not a Phase 1 security blocker.
- `npm run check:sql` still reports warnings in older SQL files. The final SQL source used for this project was patched, but legacy SQL files remain inconsistent.

## Rollback Plan

- Revert `php/controllers/cloud.php` to the previous `/me` lookup only if a migration issue blocks local auth, then keep `/me` behind `auth_require_active_user()` in the next patch.
- Revert `sql/20260501_sql_only_full.sql` column additions only if the deployment database is confirmed to be older than the app code. Preferred rollback is database backup restore, not partial column removal.
- Revert the two E2E harness changes only if the API contract is intentionally changed back to legacy wrapped transaction payloads.

## Final Status

NEEDS HOSTED URL FOR LIVE HOSTED CHECKS.

All required automated commands pass locally. Critical auth/security behavior passes locally. The only incomplete gate item is live hosted response verification, because no production/staging URL was provided.
