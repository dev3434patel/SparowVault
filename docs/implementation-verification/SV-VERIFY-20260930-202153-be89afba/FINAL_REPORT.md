# Independent implementation verification

Run ID: `SV-VERIFY-20260930-202153-be89afba`

Verdict: **LOCAL_REMEDIATION_REQUIRED**

`productSourceModifiedDuringAudit` is false. Authority hashes matched at the end. Historical certification markdown was restored after the finance gates rewrote it.

## Why this verdict

Mandatory local workflows failed or are missing:

- Stock buy 10 at Rs 100 and sell 4 at Rs 150 stored value 600 and COGS 400, and posted no voucher. The paise book should hold 60000 and 40000. Difference −59400 and −39600.
- A 100000-paise reimbursement wrote a link and did not change either book.
- Company restore preview does not write a second database.
- `npm test` failed 2 schema checks. `npm run lint` failed with 3 errors.
- `TEST_DATABASE_URL` can skip the disposable-database name guard.

Conclusions that would call the product locally complete, or complete except for external blockers, were not selected. Package restore, the 20-bank statement claim, and the reimbursement leg are not done. Card statement, household shared rows, the 64 alert combinations, and the sales invoice versus receipt were executed and those specific checks passed. A passing child does not close its parent. The 41 inventory "Shipped" labels are not launch evidence. SV31 notes were not used as a pass.

## What was executed

Personal oracles O01–O06, the household shared-row filter, and 64 alert combinations ran in IndexedDB `sparowvault_verify_idb` and the database was deleted. Company oracles O07–O13, authorization, six report handlers, and mutation replay ran in MySQL `sparowvault_verify_test` after a schema reset of that database only. Names that do not contain `test` were refused when passed as `TEST_DB_NAME`.

The unauthenticated package at `http://127.0.0.1:8099/company/app/invoices` rendered the company login form (username, PIN, Sign in). Signed-in clicking was not used. Invoice recognition was checked by posting on the verify database: income stayed 1000000 paise after a 500000 paise receipt, and the receivable net was 680000 paise.

## External scope

Live Account Aggregator, live Razorpay, GST or PF filing, a real 20-bank corpus, physical devices, and a hosted production restore are `BLOCKED_EXTERNAL` or not tested. Zero statement layouts are `verified-for-scope`. This run does not claim 20-bank accuracy.

## Where to read the detail

| File | Contents |
|---|---|
| `CANDIDATE_FREEZE.md` | Identity, missing sources, database guard |
| `SUITE_FIRST_OUTCOMES.md` | Unmodified suite exits |
| `PARENT_MATRIX.md` | 83 parents |
| `child-traceability.json` | 332 children. None closes a parent |
| `ORACLE_RESULTS.md` | O01–O13 and auth |
| `FINDINGS.md` | F-001 through F-006 |
| `REPAIR_SPEC.md` | Order of repairs |
| `PACKAGE_RESTORE.md` | Build, MIME, restore |
| `EXECUTION_STATE.json` | Resume point: complete |
