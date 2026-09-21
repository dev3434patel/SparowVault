# R0 — Environment and baseline report

Date: 2026-09-22  
Checkout: feat/statement-intelligence-v2 (dirty working tree preserved)  
Scope: LOCAL ONLY

## Findings addressed

| ID | Result |
|----|--------|
| F-ENV-API | PARTIAL → LIVE_EXECUTABLE. Disposable `sparowvault_test` created; `.env.test` written (gitignored); `db:test:reset` applied; `npm run test:statements` executed against isolated per-run DB (`sv_write_test_*`). |
| F-DOC-01 | Corrected `docs/statements-v2/GAP_REGISTER.md` overclaims (ST-06 / ACC-B no longer FIXED from helper-only evidence). |
| F-REF-01 | Added sanitized refs under `docs/reference/sparowvault/` + `INDEX.json` hashes. |

## Safeguards

- `scripts/with-local-test-runtime.mjs` loads `.env.test`, forces `APP_ENV=test`, refuses exact personal DBs (`sparowvault`, schema/merge DBs) and names without `test|cert`.
- `scripts/db-test-reset.mjs` still requires `TEST_DB_NAME` containing `test`.
- `scripts/ensure-disposable-test-db.mjs` creates only `sparowvault_test`.
- Personal DB `sparowvault` was not reset or mutated by R0 reset scripts.

## Commands / exits

| Command | Exit | Notes |
|---------|------|-------|
| `node scripts/ensure-disposable-test-db.mjs` | 0 | Created `sparowvault_test` |
| `node scripts/db-test-reset.mjs` (via `.env.test`) | 0 | Schema-only |
| `npm run typecheck` | 0 | After R0/R1 wiring |
| Statement unit suites (81) | 0 | 64 + 17 |
| `npm run test:statements` | 1 | **All statement checks PASS**; suite exit 1 from unrelated `backup:` check (`BACKUP_DIR` unset) |
| `npm run statements:gate:strict` | (see R1/R8) | Strict gate fails while 0 verified layouts |

## Deliberate misconfiguration check

Configuring `TEST_DB_NAME=sparowvault` (personal) is refused by `with-local-test-runtime.mjs` and `db-test-reset.mjs` before mutation.

## Remaining blockers

- BACKUP_DIR not set → backup restore check fails inside atomic suite (env, not statement logic).
- Real-bank corpus still BLOCKED (F-BANK-20).
- Hosted checks NOT_TESTED.

## Rollback

- Delete `.env.test` (gitignored).
- `DROP DATABASE sparowvault_test` if desired.
- Revert R0 script/doc edits.
