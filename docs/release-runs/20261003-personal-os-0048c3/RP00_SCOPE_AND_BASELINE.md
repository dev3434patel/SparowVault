# RP00 — Scope and baseline

Release run: `20261003-personal-os-0048c3`

Directory: `docs/release-runs/20261003-personal-os-0048c3/`

This file freezes the Personal OS local release scope. It does not certify the 47 surfaces, and it does not upgrade `PASS_LOCAL_UNIT` or `PASS_APACHE`.

## What this run is

Finish the local gaps on the current architecture: a production-safe health check, a destructive-runner guard that rejects the owner database `sparowvault` before dump, truncate, or migrate, and a written contract for household grants, statement recovery, and header ownership. Staging and production stay blocked. No hostname, staging URL, or approval is invented.

Company books stay. This run does not drop `company_*` data, does not hide `/api/company`, and does not expand payroll or GST.

## What this run is not

- Not an 83-surface certificate. `all83LocalRequirementsComplete` stays false.
- Not a hosted release. `hostedRelease` stays `NOT_TESTED`.
- Not a bank-layout verification. Registry truth stays 5 synthetic-tested, 15 registered, 0 verified-for-scope. No layout is renamed.
- Not RP02–RP07. Household grants, statement outbox-before-POST, header deduplication, two-profile sync, and the immutable package archive are not implemented here.
- Checkout still builds with Razorpay off (`VITE_ENABLE_RAZORPAY=false` in the hosting package script). That is a build fact, not an owner decision to launch free, and not provider proof.

## Evidence that stays historical

| Source | How to read it |
| --- | --- |
| `docs/project-reports-2026-10-03/01-latest-verification-2026-10-02/FINAL_VERIFICATION_REPORT.md` | Newest prior result. `statementAfterImport`, `personalMandatoryLocalWork`, and `companyReports` are `PASS_LOCAL_UNIT`. `localPackageAndRestore` is `PARTIAL`. Four unit files, 37 tests, typecheck, and static Apache serving. Restore was not run. Health on the empty package was HTTP 500. P30 second login and P43 sync were not run. |
| `docs/project-reports-2026-10-03/01-latest-verification-2026-10-02/lane-p/PERSONAL_CHILD_STATUS.md` | Lane P notes for P01–P47. Not an 83-surface claim. |
| `docs/current-product-inventory/2026-09-30/` and the copy under `docs/project-reports-2026-10-03/03-product-inventory-2026-09-30/` | Requirements history. Not the current score. Category parents, the recurring editor, envelopes, reconciliation confirm, and alert switches were built later. |
| October 1 Company backup and screenshots | Company evidence. Not Personal evidence. |
| `npm run health` | Build pipeline. Not HTTP readiness. HTTP readiness is `api/health.php`. |

`docs/project-reports-2026-10-03` was not overwritten.

## Preserved repairs

Do not rebuild these:

- Card interest, fees, and minimum due stay `null` / `not_observed`. A printed zero stays `0` / `source_observed`.
- Idempotent local source, match, and card-statement apply. A second repair does not publish again and does not repost purchases.
- Transfer links: one link, credit leg is not income, fee only as `feeTransactionId`.
- Recurring editor, envelopes, alert switches, category parents.
- Company report load-state (loading, ready, error, stale failure).

## Absent pack

`PERSONAL_47_REQUIREMENTS.json` is not in the checkout. No replacement pack was invented. Child ids in `PARENT_GRAPH.md` come from `docs/implementation-verification/SV-VERIFY-20260930-202241-b182d88604c9/CHILD_TRACEABILITY.md`. Parent ids come from the September 30 inventory via `TASK_LEDGER.json`.

## Checkout fingerprint

| Item | Value |
| --- | --- |
| Commit | `6395ec9a040652a39a45b72ac12136cdd382df33` |
| Branch state | Dirty. Company and Personal working-tree files were left in place. Nothing was committed. |
| Lockfile | `package-lock.json`, 314292 bytes, sha256 `d1504af6adae940ac308573010e6424aa2d35c80d17af636642414fdcba72ea0` |
| Node | v22.20.0 |
| npm | 11.8.0 |
| PHP | 8.4.13 (ZTS Visual C++ 2022 x64) |
| MariaDB client | 10.4.32 |
| Dirty tracked files | 197 (`git hash-object` blobs in `DIRTY_AND_CONFIG_FINGERPRINT.json`) |
| Untracked paths | 775, summarized by top folder in that same file. `dist` is not in the untracked summary. |

Redacted config (sha256 prefix only, values not stored):

- `.env` selects `APP_ENV_FILE` (sha256_12 `74dd9d08974a`).
- `.env.local` has `DB_NAME` length 11, sha256_12 `e25ec42a6a0d` (the owner database name length). `DB_PASS` is empty. `CLOUD_JWT_SECRET` length 28, sha256_12 `b4abfe15a03c`. `APP_ENV` length 11, sha256_12 `875b9380866e`. Razorpay key fields are present and are not copied here.

`scripts/ensure-disposable-test-db.mjs` rewrote gitignored `.env.test` so `DB_NAME` is `sparowvault_test`. That file is not the owner config.

## Runtime identity used for mutation

Disposable database: `sparowvault_test`.

`node scripts/ensure-disposable-test-db.mjs` created that database and reported `currentDb: null` on the admin connection (no default schema selected). The following reset logged `Connected to sparowvault_test` and dropped only tables in that schema. The drop list contained no `company_*` tables. The owner database `sparowvault` was not opened, dumped, or migrated.

## Labels after this prefix

`PASS_LOCAL_UNIT` and the October 2 `PASS_APACHE` label are unchanged. This run's Apache results use `PASS_STATIC_NEGATIVE_CONFIG` and `PASS_CONFIGURED_HEALTH` for the throwaway extract. They are not a release approval.
