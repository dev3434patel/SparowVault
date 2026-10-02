# Final verification — 20261002-1955-statement-repair

This file records only commands run in this verification. Statuses were not copied in as PASS before those commands finished. Nothing was committed. `company:certify:final`, `company:certify:product`, and the 100k/backup scripts were not run.

## Statuses

```
statementAfterImport: PASS_LOCAL_UNIT
personalMandatoryLocalWork: PASS_LOCAL_UNIT
companyReports: PASS_LOCAL_UNIT
companyFinalOrchestrator: NOT_RUN
companyProductOrchestrator: NOT_RUN
localPackageAndRestore: PARTIAL
all83LocalRequirementsComplete: false
blockedFor20BankClaim: true
allRequestedEvidenceComplete: false
hostedRelease: NOT_TESTED
```

`PASS_LOCAL_UNIT` means the unit files in this run passed, including oracle examples A–E. It is not a live owner-database import, a browser session, or an 83-surface claim.

`companyFinalOrchestrator` and `companyProductOrchestrator` are `NOT_RUN` because `scripts/company/certify-final.mjs` and `scripts/company/certify-product.mjs` target the live owner database `sparowvault`. `blockedFor20BankClaim` is true: real bank PDFs were not certified. `hostedRelease` is `NOT_TESTED`. `all83LocalRequirementsComplete` is false. `allRequestedEvidenceComplete` is false.

## Commands and exits

| Command | Exit | Result |
|---|---|---|
| `npx vitest run src/services/__tests__/statementLocalBooks.test.ts src/services/__tests__/personalBookWorkflows.test.ts src/services/__tests__/obligationEngine.test.ts src/company/services/__tests__/reportLoad.test.ts` | 0 | 4 files, 37 tests passed |
| `npx tsc --noEmit` | 0 | no emit errors |
| `node scripts/apache-package-serve-check.mjs` with `LF_RUN_ID=20261002-1955-statement-repair-package` | 0 | `PASS_APACHE` on a throwaway extract of `release/hosting-bundle` |

Vitest counts in this run: `statementLocalBooks.test.ts` 9, `personalBookWorkflows.test.ts` 18, `obligationEngine.test.ts` 5, `reportLoad.test.ts` 5.

The package check listened on `127.0.0.1` with document root described as a throwaway extract. Pages, the worker script, SQL denial, env-file denial, and 12 concurrent page reads passed. `/api/health.php` returned HTTP 500 (141-byte JSON). The extract’s database name, host, user, password, and `CLOUD_JWT_SECRET` were empty, and this process had those variables unset. Health is written to refuse a connection unless the configured database name contains `test` and a non-production secret is present. This probe did not open `sparowvault`. Restore was not run. The checker’s own note is in `docs/local-finalization/20261002-1955-statement-repair-package/LOCAL_PACKAGE_APACHE_REPORT.md`. That static pass is not a hosted release.

## What changed

Missing card interest, fees, and minimum due stay unknown: value `null` and evidence `not_observed`. A printed zero stays `0` with evidence `source_observed`. Unknown is not stored or shown as a rupee zero, and it is not treated as nothing due.

Local repair copies the server receipt into the local import source, matches, and one card-statement row. It does not create or repost purchase transactions. A second repair returns the already applied record and does not publish again. The existing local-books test still expects the transaction count to stay at the one row that was already posted.

Project, area, and user-activity use the same report-load state. The newest request stays on Loading until it settles. An authorized empty row list becomes ready. A forbidden or failed response becomes an error with no rows. A stale failure does not clear a newer request’s Loading flag. Those three reports therefore leave Loading. This verifier did not open a browser or call the live report API.

Existing golden numbers were not edited. New tests only append oracle examples A–E.

## Oracle examples in this run

A. Bank import reference. `sourceDocumentStats`, `validateStatementArithmetic`, and `reportBankStatementMonths` match 4 source rows, 2 credits, 2 debits, credit total 540000 paise, debit total 145000 paise, and closing bank 1395000 paise. Coverage for 29–30 September 2026 is `partial_month`. With reviewed purposes, `reportEconomicMonth` keeps true income at 500000 paise and consumption at 45000 paise. The card repayment is `cc_payment` (100000) and the receivable collection is a transfer (40000), so neither is income or consumption. Closing card liability 0, closing receivable 0, and net-asset delta 455000 paise are that classification applied to the oracle openings. They were not posted to MySQL.

B. Card observation. `buildReviewedCardStatement` stores closing 350000 paise (200000 + 300000 − 100000 − 50000). Interest, fees, and minimum due are `null` with `not_observed`. `formatCardMoneyFact` returns `Unknown`. `normalizeCardMoneyWrite(0, "source_observed")` stays 0 with `source_observed`. The payment is one `paymentsPaise` figure on the statement. The builder does not insert a second cash movement.

C. Completeness. The four-row control is `complete` and the running balance matches. Dropping the offsetting 10000 debit and 10000 credit still leaves opening + remaining movements equal to closing 1095000 paise (`matched`). `validateStatementCompleteness` is `incomplete` on printed debit count, credit count, gross debit, gross credit, and the offsetting-omission guard. This is the validator, not a live commit.

D. Reservations. `reservationSnapshot` keeps bank cash at 1000000 paise, reserved 300000 (envelope 150000, sinking 100000, goal 50000), and unassigned 700000. `goalEarmarkEffect` moves no account balance. `fundedGoalTransferEffect(200000)` is a separate movement: source 800000 paise and destination 200000 paise, net worth unchanged. The older reservation golden (envelope 100000 on fake-indexeddb) was left as it was.

E. Dimensions. Project parts 600000 + 400000 and area parts 700000 + 300000 each total 1000000 paise, the same as the voucher line. `dimensionSplit` and `splitCostAllocation` keep each dimension’s total equal to that line. Posted-voucher SQL for project and area reports was not run.

## NOT_RUN because a live company or owner database is required

- Executing the bank fixture, card PDF, or completeness rejection through the live import API or the owner books.
- Opening project, area, and user-activity against `sparowvault` in this verifier. The load-state unit tests passed; the live HTTP report was not called here.
- Dimension totals from posted company voucher rows in MySQL.
- `npm run company:certify:final` and `npm run company:certify:product`.
- Backup, 100k voucher matrix, and restore. The package script does not restore, and those scripts write to or dump the owner database.

## Residual

Still open: real bank PDFs, a licensed Account Aggregator, physical devices, hosting, and the certify scripts until a disposable database exists.
