# SECURITY PHASE 01 REPORT

Date: 2026-05-14
Workspace: `D:\Claude\SparowVault`
Final status: COMPLETE

## Summary of changes

- Sanitized committed hosting env artifacts so production database password, JWT secret, and Razorpay secrets are empty placeholders in `.env.host`, `release/hosting-bundle/.env.host`, and `release/hosting-bundle-check/.env.host`.
- Hardened production boot guard so production refuses empty `DB_PASS`, empty/short/known-bad `CLOUD_JWT_SECRET`, and Razorpay-enabled deploys without key, secret, and webhook secret.
- Replaced raw known-bad JWT denylist values with SHA-256 hashes so compromised literals no longer ship in PHP source, docs, CI, or gate scripts.
- Added API security headers from PHP bootstrap and tightened `.htaccess` protection for `.env*`, `.jwt-secret`, `sql/`, `data/`, `backups/`, `php/config/`, source maps, and raw dump/archive files.
- Hardened custom JWT verification: HS256 only, rejects `alg=none` and unexpected algorithms, validates `iat`, `nbf`, `exp`, `iss`, and `aud`.
- Moved browser auth to httpOnly cookie transport while keeping Bearer-token compatibility for non-production CLI/API tests.
- Removed frontend JWT persistence in `localStorage` and made API fetches include credentials.
- Centralized PIN validation in `php/helpers/auth.php`; blocked common PINs and date-like PINs, kept bcrypt hashing, and preserved login throttling.
- Added account logout endpoint and clears auth cookies on logout/account deletion.
- Verified user-owned export/delete isolation through live API checks.

## Files changed

- `.env.host`
- `.github/workflows/ci.yml`
- `.htaccess`
- `AUDIT_REPORT_MVP.html`
- `PHASE_17_COMPLETION_REPORT.md`
- `api/auth/logout.php`
- `docs/launch-checklist.md`
- `docs/phase-reports/phase-01-manual-checklist.md`
- `php/bootstrap_api.php`
- `php/controllers/account.php`
- `php/controllers/cloud.php`
- `php/helpers/app.php`
- `php/helpers/auth.php`
- `php/helpers/http.php`
- `php/helpers/security.php`
- `php/routes.php`
- `release/hosting-bundle-check/.env.host`
- `scripts/generate-audit-docx.mjs`
- `scripts/phase-01-gate.mjs`
- `scripts/phase-17-gate.mjs`
- `src/components/auth/CloudAuth.tsx`
- `src/components/pages/ProfilePage.tsx`
- `src/lib/apiClient.ts`
- `src/lib/cloud/client.ts`
- `src/lib/migrateLegacyKeys.ts`
- `src/store/authStore.ts`
- `src/store/cloudAppStore.ts`
- `tests/account-endpoints-e2e.mjs`
- `tests/api-e2e.mjs`
- `tests/browser-e2e.mjs`
- `tests/phase-00-runtime-browser.mjs`
- `tests/phase-04-validation-e2e.mjs`
- `tests/unit/phase-01-secrets.test.ts`

## Migrations changed

- No SQL migration file was changed in this phase.
- Existing Phase 1 migration coverage remains checked by `tests/unit/phase-01-secrets.test.ts`.

## Functions changed

- `known_bad_jwt_secret_hashes()`
- `sign_cloud_token()`
- `verify_cloud_token()`
- `set_auth_cookie()`
- `clear_auth_cookie()`
- `auth_pin_validation_error()`
- `auth_valid_pin()`
- `user_auth_row_by_id()`
- `cloud_register()`
- `cloud_login()`
- `cloud_admin_login()`
- `cloud_logout()`
- `cloud_auth_response()`
- `account_delete()`
- `get_bearer_token()`
- `apply_cors_headers()`
- `apply_security_headers()`
- `apiRequest()`
- `setCloudToken()`
- `clearCloudToken()`
- `cloudRegister()`
- `cloudLogin()`
- `cloudAdminLogin()`
- `cloudLogout()`
- `useCloudAppStore.hydrate()`
- `useAuthStore.logout()`
- frontend `validatePin()` helpers in auth/profile UI

## UI changed

- Registration and profile PIN validation now rejects common/date-like PINs before the request reaches PHP.
- Registration PIN hint now warns users to avoid common/date-like PINs.
- JWTs are no longer written to browser-readable `localStorage`; legacy token keys are removed during migration/logout.

## Tests added or updated

- Expanded `tests/unit/phase-01-secrets.test.ts` to cover:
  - sanitized env artifacts,
  - hashed known-bad JWT denylist,
  - `.htaccess` protection,
  - no frontend JWT localStorage writes,
  - HS256/issuer/audience/expiry claim checks,
  - httpOnly cookie helper presence,
  - PIN common/date-like policy,
  - account export/delete ownership and audit expectations.
- Updated E2E/browser test PIN fixtures away from newly-blocked common PINs.
- Updated Phase 1 gate secret scanning to detect non-empty secret assignments without embedding real leaked literals.

## Commands run

- `npm run typecheck` - PASS
- `npm run lint` - PASS
- `npm run test` - PASS, 15 files and 114 tests
- `npm run build` - PASS
- `npm run check:php` - PASS, 72 PHP files parse cleanly
- `npm run check:sql` - PASS exit code, with existing static warnings about non-idempotent historical SQL files
- `npm run phase:01:gate` - PASS, 17 passes, 0 fails, 0 warnings, 1 skipped URL probe
- `Invoke-WebRequest http://localhost:5000/api/health.php` - PASS, healthy DB status
- Live API manual script for export/delete isolation - PASS
- PHP audit-log query - PASS, found recent `ACCOUNT_DELETED` audit rows

## Manual checks completed

- Health endpoint returned `ok: true`, `status: healthy`, `db.status: ok`, version `phase_full_database_bootstrap_2026_05_13`.
- Registered two test users through local API.
- Pushed user-owned category rows for both users.
- Verified cross-user push is rejected with `422`.
- Exported user A data with PIN and confirmed it includes user A row only.
- Confirmed user A export excludes user B row.
- Confirmed account deletion without PIN returns `PIN_REQUIRED`.
- Deleted user A with PIN.
- Confirmed deleted user A cannot log in.
- Confirmed user B remains active and isolated.
- Deleted user B for cleanup.
- Queried `audit_logs` and confirmed recent `ACCOUNT_DELETED` rows exist.

## Remaining risks

- `npm run check:sql` still reports existing static warnings: some historical SQL files contain `ALTER TABLE` without `IF EXISTS`, and one rollback contains intentional `DROP TABLE`. This phase did not change SQL migrations.
- `phase:01:gate` URL probes were skipped because no production/staging `--url` was supplied. Local API health was verified.
- Browser JWT migration is now cookie-first, but non-production API responses still include `token` for existing CLI E2E compatibility. Production responses do not include the token.
- Full refresh-token rotation/session-table design is documented as the next hardening step; this phase establishes httpOnly cookie access-token transport and strict JWT validation.
- `git status` could not be used because this workspace is not a Git repository.

## Rollback plan

- Revert the listed changed files from backup/source control.
- Restore previous Bearer-only auth behavior by reverting `src/lib/apiClient.ts`, `src/lib/cloud/client.ts`, `php/helpers/http.php`, and cookie helpers in `php/helpers/auth.php`.
- Restore previous PIN behavior by reverting `auth_pin_validation_error()` and frontend `validatePin()` helpers.
- Restore previous hosting artifact contents only from a secure deployment secret store, not from committed files.
- Rerun `npm run typecheck`, `npm run lint`, `npm run test`, `npm run build`, `npm run check:php`, and `npm run phase:01:gate` after rollback.

## Final status

COMPLETE
