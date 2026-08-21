# Local Phase 02 - Full Local Command Gate Report

Generated: 2026-05-21

## Final Status

Final status: **PASS**

The full local command gate passed from the beginning after fixing the only initial blocker: API/browser E2E commands depended on a manually running backend and defaulted to an old `localhost:4000` URL. The local E2E commands are now self-starting through a local runtime wrapper and use the fresh local certification DB by default.

## What Was Checked

The full requested gate was run:

- `npm run typecheck`
- `npm run lint`
- `npm run test`
- `npm run test:calculations`
- `npm run test:api`
- `npm run test:webhook`
- `npm run test:webhook:ownership`
- `npm run test:account:endpoints`
- `npm run test:phase04:validation`
- `npm run test:browser`
- `npm run check:php`
- `npm run check:sql`
- `npm run build`
- `npm run health`
- `npm run phase:all:gates`

## What Failed

Initial run stopped at:

| Command | Status | Failure |
|---|---:|---|
| `npm run test:api` | FAIL | `fetch failed`, `ECONNREFUSED`, no backend listening |

Root cause:

- E2E scripts assumed a PHP backend was already running.
- Several E2E scripts defaulted to `http://localhost:4000`, while the local PHP backend is configured on `http://localhost:5000`.
- The command gate requirement was “from scratch,” so depending on a manually pre-started server was not acceptable.

## What Was Fixed

- Added `scripts/with-local-test-runtime.mjs`.
- Updated E2E package scripts to run through the wrapper.
- The wrapper starts the local PHP backend if needed.
- For browser E2E, the wrapper also starts Vite if needed.
- The wrapper sets local certification DB defaults:
  - `DB_NAME=sparowvault_local_cert`
  - `TEST_DB_NAME=sparowvault_local_cert`
  - `BASE_URL=http://localhost:5000`
- Updated E2E safety guards to allow local certification DB names containing `cert`, not only `test`.

No finance logic, paise-integer logic, ledger builder logic, Dexie/offline-first behavior, cloud sync contract, or user-owned API filtering logic was changed.

## Files Changed

- `package.json`
- `scripts/with-local-test-runtime.mjs`
- `tests/account-endpoints-e2e.mjs`
- `tests/phase-04-validation-e2e.mjs`
- `tests/webhook-ownership-e2e.mjs`
- `tests/webhook-replay-e2e.mjs`
- `LOCAL_PHASE_02_COMMAND_GATE_REPORT.md`

## Failed Command Re-Run

After the wrapper fix:

| Command | Status | Log |
|---|---:|---|
| `npm run test:api` | PASS | `local-phase-02-logs/test_api.rerun.log` |

API result:

- `65/65 passed`
- `0 failed`

## Full Command Gate Result

After the failed command passed, the full command gate was restarted from the beginning.

| Command | Status | Duration | Log |
|---|---:|---:|---|
| `npm run typecheck` | PASS | 2.02s | `local-phase-02-logs/full_typecheck.log` |
| `npm run lint` | PASS | 4.71s | `local-phase-02-logs/full_lint.log` |
| `npm run test` | PASS | 6.06s | `local-phase-02-logs/full_test.log` |
| `npm run test:calculations` | PASS | 2.45s | `local-phase-02-logs/full_test_calculations.log` |
| `npm run test:api` | PASS | 2.40s | `local-phase-02-logs/full_test_api.log` |
| `npm run test:webhook` | PASS | 0.76s | `local-phase-02-logs/full_test_webhook.log` |
| `npm run test:webhook:ownership` | PASS | 0.85s | `local-phase-02-logs/full_test_webhook_ownership.log` |
| `npm run test:account:endpoints` | PASS | 1.92s | `local-phase-02-logs/full_test_account_endpoints.log` |
| `npm run test:phase04:validation` | PASS | 1.30s | `local-phase-02-logs/full_test_phase04_validation.log` |
| `npm run test:browser` | PASS | 31.01s | `local-phase-02-logs/full_test_browser.log` |
| `npm run check:php` | PASS | 15.02s | `local-phase-02-logs/full_check_php.log` |
| `npm run check:sql` | PASS | 0.40s | `local-phase-02-logs/full_check_sql.log` |
| `npm run build` | PASS | 8.51s | `local-phase-02-logs/full_build.log` |
| `npm run health` | PASS | 36.32s | `local-phase-02-logs/full_health.log` |
| `npm run phase:all:gates` | PASS | 157.35s | `local-phase-02-logs/full_phase_all_gates.log` |

## Manual Tests Done

- Confirmed `npm run test:api` no longer requires a manually started server.
- Confirmed browser E2E opens through the wrapper and completes.
- Confirmed API E2E result: `65/65 passed, 0 failed`.
- Confirmed browser E2E result: `37/37 passed, 0 failed`.
- Confirmed phase gate summary: `18/18 phase gates passed`.

## SQL Checks Done

Command:

```bash
npm run check:sql
```

Result: **PASS**

Evidence:

- `local-phase-02-logs/full_check_sql.log`

Additional DB behavior exercised by the full gate:

- API E2E writes and reads cloud sync rows.
- Phase 04 validation checks indexed sync/hot fields.
- Webhook tests seed and validate billing/payment rows.
- Account endpoint tests validate export/delete ownership behavior.

## Screenshots / Logs Required

No screenshots are required for this local command gate phase.

Logs generated:

- `local-phase-02-logs/results.json`
- `local-phase-02-logs/full-results.json`
- `local-phase-02-logs/test_api.rerun.log`
- `local-phase-02-logs/full_test_api.log`
- `local-phase-02-logs/full_test_browser.log`
- `local-phase-02-logs/full_phase_all_gates.log`
- all other `local-phase-02-logs/full_*.log` files

## Remaining Risks

- This phase proves local command health, not hosted/staging readiness.
- The wrapper starts local PHP/Vite runtime for tests; real hosting still needs separate staging certification.
- E2E tests now accept DB names containing `cert` for local certification safety. This is intentional for `sparowvault_local_cert`, but production/staging scripts should still use explicit environment separation.
- Browser E2E is still a smoke test, not a full manual responsive QA matrix.

## Rollback Plan

If this phase change must be reverted:

1. Restore the previous `package.json` E2E scripts.
2. Remove `scripts/with-local-test-runtime.mjs`.
3. Revert the `test|cert` guard updates in:
   - `tests/account-endpoints-e2e.mjs`
   - `tests/phase-04-validation-e2e.mjs`
   - `tests/webhook-ownership-e2e.mjs`
   - `tests/webhook-replay-e2e.mjs`
4. Manually start the backend before E2E tests as the old behavior required.

## Final Status

**PASS**
