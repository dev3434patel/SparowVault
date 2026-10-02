# Findings

Each open finding has a repair in `REPAIR_SPEC.md`. Paise differences use 100 paise = 1 rupee.

## F-001 DB reset URL bypass

- Parent: tooling, not one of P01–C36
- Child: disposable-database guard
- Phase: A00
- Severity: high
- Path: `scripts/db-test-reset.mjs`
- Reproduction: set `TEST_DATABASE_URL` to a MySQL URL whose database name does not contain `test`, and omit `TEST_DB_NAME`.
- Expected: exit 2 before a connection.
- Actual: exit 1, `Access denied for user 'root'@'localhost'`. The name check never ran.
- Difference: the guard does not parse the URL.
- Evidence: command log in this run. The password was a sentinel, so no tables were dropped.
- Root cause: the refusal tests `TEST_DB_NAME` only.
- Smallest repair: refuse unless the database name inside `TEST_DATABASE_URL` matches `/test/i`, before `createConnection`.
- Regression: the sentinel URL must exit 2 with no authentication attempt.
- Closure: a wrong URL and a wrong `TEST_DB_NAME` both exit 2, and a name containing `test` is the only path that connects.

## F-002 Inventory stock is not paise and does not post

- Parent: C30 Inventory
- Child: C30.3 financial effect
- Phase: oracle O09
- Severity: high
- Path: `src/company/pages/ModulesPage.tsx` buy/sell buttons; `php/helpers/company/phase_sv.php` `company_items_dispatch`; `company_apply_weighted_average`
- Reproduction: create a STOCK item, buy 10 at unit 100, sell 4 at unit 150, then read `company_items` and `company_vouchers` on `sparowvault_verify_test`.
- Expected: remaining value 60000 paise, COGS 40000 paise, and a balanced posted voucher on the STOCK ledger.
- Actual: quantity 6, `value_amount` 600, `cogs_amount` 400, vouchers added 0.
- Difference: value −59400 paise, COGS −39600 paise.
- Evidence: `oracle-company.json` O09. The pure golden prints `value 600 cogs 400` and exits 0. That golden is the same unit as the button, not the book.
- Root cause: the page sends `unit: 100` and `unit: 150`. The writer stores `qty * unit` on `company_items` and does not call `company_post_voucher`.
- Smallest repair: convert the entered rupees to paise before the average-cost update, and post the buy and the sale as balanced vouchers.
- Regression: after buy 10 at Rs 100 and sell 4 at Rs 150, SQL value is 60000, COGS is 40000, and the trial balance still balances.
- Closure: the item row and the posted lines agree in paise, and a customer collection does not post revenue or COGS again.

## F-003 Reimbursement link does not move either book

- Parent: C34 Personal to company bridge
- Child: C34.3 financial effect
- Phase: oracle O12
- Severity: high
- Path: `company_bridge_dispatch` in `php/helpers/company/phase_sv.php`; `ModulesPage` "Record reimbursement link"
- Reproduction: record a reimbursement of 100000 paise. Count new company vouchers and personal transactions.
- Expected: one company payable of 100000 paise and one personal receivable of 100000 paise, linked, not one shared transaction.
- Actual: `companyPayable` on the plan is 100000, vouchers added 0, personal rows written 0. A `company_cross_domain_links` row is inserted.
- Difference: 100000 paise missing from both books.
- Evidence: `oracle-company.json` O12.
- Root cause: the dispatch stores the link and the state machine. It does not post the company voucher or write IndexedDB.
- Smallest repair: post the company payable, write the personal receivable, and store both ids on the link.
- Regression: 100000 paise payable and 100000 paise receivable, with the link pointing at both, and no second copy of either amount.
- Closure: both stores change by that amount and a retry does not post a second pair.

## F-004 Full database file and index migration drift

- Parent: C21 / schema
- Child: persistence of the company schema in the full SQL artifact
- Phase: A00 vitest
- Severity: medium
- Path: `sql/SPAROWVAULT_FULL_DATABASE.sql`, `sql/migrations/20260923_company_indexes.sql`
- Reproduction: `npm test`, then apply `20260923_company_indexes.sql` to a database that already ran `20260923_company_core.sql`.
- Expected: every PHP-referenced table is in the full schema file, and index adds are idempotent.
- Actual: vitest lists missing company tables including `company_invite_tokens` and `company_items`. The index file fails with `Duplicate key name 'idx_cal_company_created'`.
- Difference: 2 failed tests of 583. Index apply exit was a duplicate-key error. Core tables were still present (35, then 36 after `company_items` was created at runtime).
- Evidence: vitest output in the command log; `apply-company-schema.mjs` log.
- Root cause: company tables added after the full schema snapshot, and `ADD INDEX` without an existence check.
- Smallest repair: add the missing tables to the full schema with the same definitions as the migrations, and guard each `ADD INDEX`.
- Regression: the two phase-02 assertions, plus a second apply of the index file on a test database.
- Closure: `npm test` no longer fails those two cases, and a second apply of the index migration exits 0.

## F-005 Lint rule is missing

- Parent: tooling
- Child: `npm run lint`
- Phase: A00
- Severity: low
- Path: `src/company/pages/LedgersPage.tsx`, `ReceivablesPage.tsx`, `ReportsHubPage.tsx`
- Reproduction: `npm run lint`
- Expected: exit 0, or the pages do not reference a rule that is not loaded.
- Actual: exit 1, three `Definition for rule 'react-hooks/exhaustive-deps' was not found`.
- Difference: 3 errors.
- Evidence: first lint output.
- Root cause: the pages disable a rule the current ESLint config does not define.
- Smallest repair: load `eslint-plugin-react-hooks` or remove the unused directive.
- Regression: `npm run lint` exits 0.
- Closure: a clean lint run with no new product warning suppressed.

## F-006 Company restore does not write a second database

- Parent: C23 Export files
- Child: restore into a different guarded target
- Phase: package
- Severity: high
- Path: `company_restore_preview` in `php/helpers/company/phase_sv_pure.php`
- Reproduction: build a company backup pack from `sparowvault_verify_test` and ask for a different company id. Inspect `sparowvault_verify_restore`.
- Expected: rows appear in the other guarded database, source rows stay put, secrets stay stripped.
- Actual: the function returns `applied: false` and `writesSource: false`. The restore database was created empty and was not loaded.
- Difference: section counts are computed and then discarded.
- Evidence: function return shape and the empty restore database.
- Root cause: preview is the only restore entry. There is no apply step.
- Smallest repair: an apply function that inserts the stripped pack into a new company id inside a database whose name contains `test`.
- Regression: source company voucher count unchanged, target company has the same voucher count, pin columns absent.
- Closure: a second test database contains the restored company and the source company still opens.

## Closed checks that are not findings

- O01–O08, O10, O11, O13, personal household shared-row filter, and the 64 alert combinations passed on disposable stores.
- Six PHP report handlers returned rows on the verify database.
- A manager with `create_journal` and without `manage_opening_balances` could not post an opening balance. Viewer Bob posted 0 vouchers. Company B could not see company A's sale. A stale `previewHash` was rejected.
- Serial replay of the same mutation id returned one voucher. Two overlapping PHP workers were not run.
- Statement layouts verified-for-scope: 0. That is `BLOCKED_EXTERNAL` for a 20-bank claim, not a local parser failure by itself.
