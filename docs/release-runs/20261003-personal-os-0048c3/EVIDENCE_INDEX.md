# Evidence index

Release run `20261003-personal-os-0048c3`. Older folders were not overwritten.

## This run

| File | What it is |
| --- | --- |
| `RP00_SCOPE_AND_BASELINE.md` | Scope, preserved repairs, absent pack, commit, lockfile, runtime versions, redacted config. |
| `PARENT_GRAPH.md` | P01–P47 with September 30 child ids, lane P notes, and current code paths. |
| `CONFLICT_REGISTER.md` | Conflicts that later lanes must not silently resolve by relabeling. |
| `CONTRACT_HOUSEHOLD_HEALTH_STATEMENT.md` | Binding contract for household, statements, headers, and file bounds. |
| `COMMAND_RESULTS.md` | Commands, exit codes, and the cases that were not run. |
| `DIRTY_AND_CONFIG_FINGERPRINT.json` | Dirty blob hashes and redacted env fingerprints. |
| `probe-health-after.php` | CLI probe. It does not connect when the mode is `absent` or `production-owner-decision`. |
| `prove-personal-write.mjs` | Login plus one synthetic account write/read. Refuses any database other than `sparowvault_test`. |

## Apache throwaway extracts (new ids)

| Run id | Result |
| --- | --- |
| `docs/local-finalization/20261003-personal-os-0048c3-empty/` | Empty config. HTTP 503 `not_configured`. Exit 0. Label `PASS_STATIC_NEGATIVE_CONFIG`. Not a health release pass. |
| `docs/local-finalization/20261003-personal-os-0048c3-positive-down/` | Configured `sparowvault_test` on port 1. HTTP 503 `unavailable`. Exit 1. |
| `docs/local-finalization/20261003-personal-os-0048c3-positive-owner/` | Configured name `sparowvault`. Refused before the positive server started. Exit 1. |
| `docs/local-finalization/20261003-personal-os-0048c3-positive-live/` | Configured `sparowvault_test` on port 3306, `APP_ENV=production`. HTTP 200 `healthy`. Exit 0. Label `PASS_CONFIGURED_HEALTH`. |

The stored `release/hosting-bundle` was not rebuilt. Each throwaway extract copied that bundle, removed env files, and overlaid the current `php/bootstrap_api.php`, `php/helpers/app.php`, `php/controllers/public_config.php`, `api/health.php`, and `api/healthz.php`.

## Historical inputs (read only)

| Path | Role |
| --- | --- |
| `docs/project-reports-2026-10-03/01-latest-verification-2026-10-02/FINAL_VERIFICATION_REPORT.md` | October 2 statuses and command exits. |
| `docs/project-reports-2026-10-03/01-latest-verification-2026-10-02/lane-p/PERSONAL_CHILD_STATUS.md` | Lane P parent notes. |
| `docs/project-reports-2026-10-03/01-latest-verification-2026-10-02/TASK_LEDGER.json` | P01–P47 inventory rows. |
| `docs/current-product-inventory/2026-09-30/personal-os.md` | Requirements history and original code paths. |
| `docs/implementation-verification/SV-VERIFY-20260930-202241-b182d88604c9/CHILD_TRACEABILITY.md` | Child ids used in the graph. |
| `docs/local-finalization/20261002-1955-statement-repair-package/LOCAL_PACKAGE_APACHE_REPORT.md` | Prior empty-package health HTTP 500. Not overwritten. |

## Absent

`PERSONAL_47_REQUIREMENTS.json` — not in the checkout.
