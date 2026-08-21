# LOCAL PHASE 3 — LOCAL RUNTIME SMOKE REPORT

Generated: 2026-05-21 23:47 IST

Final status: PASS

## Scope

Goal: verify the local runtime manually through browser automation for the local-only certification path.

Runtime under test:
- Backend: `http://localhost:5000`
- Frontend: `http://localhost:5173`
- Database checked: `sparowvault_local_cert`
- DB charset checked: `utf8mb4`
- Razorpay local flag: disabled (`razorpayEnabled=false`)

## What Was Checked

1. PHP backend starts and listens on `localhost:5000`.
2. Vite frontend starts and listens on `localhost:5173`.
3. `GET /api/health.php` returns healthy JSON with DB status `ok`.
4. CloudAuth renders.
5. New user registration works.
6. Fresh login in a separate browser context works.
7. Dashboard opens after registration and after login.
8. User pages open without fatal browser errors:
   Dashboard, Transactions, Income, Expenses, Accounts, Cards, Loans, Udhari, Goals, Budgets, Investments, Categories, Reports, Suggestions, Alerts, Audit, Import, Export, Subscription, Settings, Profile.
9. Admin login works.
10. Admin pages open without fatal browser errors:
    Admin Dashboard, User Management, Subscription Management, Plan Management, Feature Flags, Branding Settings.
11. Browser console was checked for fatal/actionable errors.

## What Failed Initially

Initial smoke result: FAIL.

Observed failures:
- Registration reached a user state but the smoke test captured the dashboard too early while the app spinner was still visible.
- Fresh login returned `policyOutstanding` after successful `/api/auth/login.php`, so the UI showed “Policy update required” for a just-registered user.

Root cause:
- `policy_current_versions()` tracks `terms`, `privacy`, `cookie`, and `data_processing`.
- Registration UI and registration API require only `terms` and `privacy`.
- Login was blocking on all four policy keys, making a fresh user appear incomplete even after accepting the required registration policies.
- The smoke script also waited for the absence of a loading text that does not exist in the current spinner-only loader.

## What Was Fixed

1. Browser/API base URL behavior now uses explicit `VITE_API_BASE_URL` first, so local frontend calls the PHP backend directly when configured.
2. Development CORS now echoes the concrete allowed origin and sends `Vary: Origin`, which is required for credentialed cookie-based auth.
3. Policy auth gating now treats only `terms` and `privacy` as login-blocking required policies.
4. Runtime smoke now waits for real dashboard content before marking registration/login as passed.

## Files Changed

- `D:\Claude\SparowVault\src\lib\apiClient.ts`
- `D:\Claude\SparowVault\php\helpers\security.php`
- `D:\Claude\SparowVault\php\helpers\policy.php`
- `D:\Claude\SparowVault\scripts\local-phase-03-runtime-smoke.mjs`
- `D:\Claude\SparowVault\LOCAL_PHASE_03_RUNTIME_SMOKE_REPORT.md`

Note: this workspace is not currently a Git repository, so `git diff` / `git status` evidence is unavailable.

## Commands Run

| Command | Result |
|---|---:|
| `npm run dev` | PASS |
| `Invoke-RestMethod http://localhost:5000/api/health.php` | PASS |
| `node scripts/local-phase-03-runtime-smoke.mjs` | PASS |
| `npm run check:php` | PASS |
| `npm run typecheck` | PASS |
| `npm run lint` | PASS |
| `npm run test:browser` | PASS |

## Command Evidence

### Health Endpoint

Source: `D:\Claude\SparowVault\local-phase-03-logs\runtime-smoke-results.json`

Result:
- `ok=true`
- `status=healthy`
- `db.status=ok`
- `version=phase_14_saas_billing_2026_05_13`
- `razorpayEnabled=false`

### Runtime Smoke

Source: `D:\Claude\SparowVault\local-phase-03-logs\runtime-smoke.pass-candidate.log`

Result:
- `35/35` checks passed
- `0` failed
- `0` warnings

### Browser E2E

Command: `npm run test:browser`

Result:
- `37/37` passed
- `0` failed

### PHP Syntax

Command: `npm run check:php`

Result:
- `72/72` PHP files parse cleanly

## Manual Tests Done

Browser automation performed manual-equivalent smoke checks:

| Area | Result |
|---|---:|
| CloudAuth render | PASS |
| Register new user | PASS |
| Login existing user in fresh browser context | PASS |
| Dashboard open | PASS |
| User page navigation | PASS |
| Admin login | PASS |
| Admin page navigation | PASS |
| Fatal console/page errors | PASS |

## SQL Checks Done

Source: `D:\Claude\SparowVault\local-phase-03-logs\sql-policy-check.json`

Checks:
- Connected DB: `sparowvault_local_cert`
- Database charset: `utf8mb4`
- Recent smoke users exist in `users`
- Smoke users have `terms` and `privacy` rows in `user_policy_acceptances`
- Latest smoke user: `smoke_mpft9ofh`
- Latest smoke user policy acceptance:
  - `terms` version `2026-05-13`
  - `privacy` version `2026-05-13`

## Screenshots / Logs Required

Screenshots generated:
- `D:\Claude\SparowVault\local-phase-03-logs\01-cloudauth.png`
- `D:\Claude\SparowVault\local-phase-03-logs\02-dashboard-after-register.png`
- `D:\Claude\SparowVault\local-phase-03-logs\03-admin-dashboard.png`
- Diagnostic only: `D:\Claude\SparowVault\local-phase-03-logs\login-diagnostic.png`

Logs generated:
- `D:\Claude\SparowVault\local-phase-03-logs\npm-run-dev.out.log`
- `D:\Claude\SparowVault\local-phase-03-logs\runtime-smoke-results.json`
- `D:\Claude\SparowVault\local-phase-03-logs\runtime-smoke.pass-candidate.log`
- `D:\Claude\SparowVault\local-phase-03-logs\register-diagnostic.json`
- `D:\Claude\SparowVault\local-phase-03-logs\login-diagnostic.json`
- `D:\Claude\SparowVault\local-phase-03-logs\sql-policy-check.json`

## Remaining Risks

- This phase validates local runtime only. It does not certify hosted staging, HTTPS redirects, hosted security headers, real Razorpay checkout/webhook delivery, backup/restore, or full responsive manual QA.
- Local Razorpay is disabled, so Subscription UI/page rendering was checked for non-crash behavior only, not real checkout.
- Console includes expected unauthenticated `401 /api/auth/me.php` checks before login; these were treated as non-fatal because the auth flow then succeeds.

## Rollback Plan

If this phase patch needs rollback:
1. Revert `src/lib/apiClient.ts` to the previous Vite-proxy-first API URL behavior.
2. Revert `php/helpers/security.php` CORS changes to the previous wildcard development behavior.
3. Revert `php/helpers/policy.php` if the product decision changes to require all four policies at login; if doing so, the UI must first collect all four acceptances.
4. Remove or ignore `scripts/local-phase-03-runtime-smoke.mjs` and `local-phase-03-logs/`.

## Final Phase Status

PASS

Local Phase 3 is complete. The local backend/frontend runtime starts, health is healthy, registration works, login works, all required user/admin pages open, and no fatal browser console errors were found in the final smoke run.
