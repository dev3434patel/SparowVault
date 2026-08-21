# Phase 13 - Import, Export, and Data Repair Report

Date: 2026-05-15

Final status: BLOCKED

Reason: Phase 13 implementation and frontend/static gates pass, but the required `npm run test:account:endpoints` gate cannot run because local MySQL is not reachable on `127.0.0.1:3306`. Manual browser/database checks were not executed in this run, so the phase cannot be marked COMPLETE.

## Summary of Changes

- Added a deterministic import/export repair service for import preview, validation, duplicate detection, import batch records, rollback planning, and repair queue generation.
- Upgraded Import Center with preview totals, valid/invalid counts, duplicate candidates, missing reference warnings, financial effect estimates, import batch audit logging, rollback for last local import batch, and a visible Repair Center.
- Added full-export safety helper that filters every exportable collection to the authenticated user before producing full JSON backup payloads.
- Updated Export Center so full profile JSON backup requires PIN verification before download.
- Added automated tests for import preview, rollback planning, repair queues, and full-export user isolation.

## Files Changed

- `D:\Claude\SparowVault\src\services\importExportRepair.ts`
- `D:\Claude\SparowVault\src\services\exportSafety.ts`
- `D:\Claude\SparowVault\src\components\pages\ImportPage.tsx`
- `D:\Claude\SparowVault\src\components\pages\ExportPage.tsx`
- `D:\Claude\SparowVault\tests\unit\importExportRepair.test.ts`
- `D:\Claude\SparowVault\PHASE_13_IMPORT_EXPORT_REPAIR_FINAL_REPORT.md`

## Migrations Changed

- None.

No SQL migration was required for this implementation pass. Import batch records are currently represented in app logic and audited through the existing audit log repository. If persisted import batch history is required beyond the last in-session rollback, add an `import_batches` table in a later DB phase.

## Functions Changed

- Added `buildImportPreview()`
- Added `createImportBatchRecord()`
- Added `buildImportRollbackPlan()`
- Added `buildDataRepairQueue()`
- Added `buildUserOwnedFullExportPayload()`
- Updated `performImport()` to write import audit metadata and retain rollback batch state.
- Added `rollbackLastImport()`.
- Replaced full backup construction with user-owned export payload construction.
- Added full backup PIN confirmation flow.

## UI Changed

- Import preview now shows:
  - total rows
  - valid rows
  - invalid rows
  - duplicate candidate count
  - missing accounts/categories/cards/loans/people
  - estimated income
  - estimated expense
  - estimated card liability change
  - estimated cashflow effect
- Import page now shows a Repair Center for:
  - transactions without ledger event
  - credit-card transactions without linked card
  - EMI transactions without linked loan
  - udhari entries without linked person
  - categories missing color
  - duplicate categories
  - legacy amount without `amountPaise`
- Export page now requires PIN before full JSON backup.

## Tests Added

- Import preview validation and estimated finance effects.
- Import batch record and rollback plan generation.
- Repair queue detection for broken/legacy rows.
- Full export payload user isolation.

## Commands Run

- `npm run typecheck` - PASS
- `npm run test -- import` - PASS, 4 tests
- `npm run test -- export` - PASS, 4 tests
- `npm run lint` - PASS
- `npm run build` - PASS with existing Vite chunk-size/dynamic-import warnings
- `npm run check:php` - PASS, 72 PHP files parsed
- `npm run check:sql` - PASS with existing static SQL warnings about non-idempotent `ALTER TABLE` statements
- `npm run test:account:endpoints` - BLOCKED/FAIL, MySQL refused connection on `127.0.0.1:3306`

## Gate Result

- `npm run test -- import`: PASS
- `npm run test -- export`: PASS
- `npm run test:account:endpoints`: BLOCKED

Exact account endpoint failure:

```text
Error: connect ECONNREFUSED 127.0.0.1:3306
```

The test harness also requires `TEST_DB_NAME` to contain `test`. I ran it with:

```powershell
$env:TEST_DB_HOST='127.0.0.1'
$env:TEST_DB_USER='root'
$env:TEST_DB_PASS=''
$env:TEST_DB_NAME='sparowvault_test'
$env:BASE_URL='http://localhost:5000'
npm run test:account:endpoints
```

## Manual Checks

- Import CSV with 10 rows: NOT RUN
- Preview shows valid/invalid/duplicate rows: implemented and unit-tested, browser manual NOT RUN
- Missing card is flagged: implemented and unit-tested, browser manual NOT RUN
- Confirm import creates transactions and ledger events: local transaction creation implemented, browser/manual ledger verification NOT RUN
- Rollback import removes/reverses all imported rows: soft-delete rollback implemented for local imported transaction IDs, browser manual NOT RUN
- Export requires PIN: implemented, browser manual NOT RUN
- Export includes only current user data: unit-tested
- Export CA workbook totals match dashboard: NOT RUN in browser/manual
- Repair center shows legacy/broken rows: implemented and unit-tested, browser manual NOT RUN
- Fixing repair row updates reports: NOT RUN

## Remaining Risks

- Import rollback currently soft-deletes imported transactions and relies on derived ledger recomputation to remove effects. Persisted financial event/effect reversal is not implemented here because there is no dedicated persisted import batch/event reversal repository path in the current frontend flow.
- Large imports sent through `/api/import/transactions.php` return counts, not imported transaction IDs, so immediate client rollback is only available for local/import batches where IDs are known.
- Full export PIN verification calls login for PIN validation. It blocks export on wrong PIN, but the stronger long-term design is a dedicated `/api/auth/verify-pin.php` endpoint that does not create or refresh sessions.
- `check:sql` still reports existing non-idempotent `ALTER TABLE` warnings in SQL files. This is outside the Phase 13 code patch but should be fixed before launch.
- Account endpoint E2E is not proven in this run because MySQL is unavailable.

## Rollback Plan

- Revert `src/services/importExportRepair.ts` and `src/services/exportSafety.ts`.
- Revert Import Center changes in `src/components/pages/ImportPage.tsx`.
- Revert Export Center PIN/full-export changes in `src/components/pages/ExportPage.tsx`.
- Revert Phase 13 unit test additions in `tests/unit/importExportRepair.test.ts`.
- No database rollback is required because no migrations were changed.

## Next Required Action

Start MySQL locally, create or allow `sparowvault_test`, import the current SQL schema, then rerun:

```powershell
$env:TEST_DB_HOST='127.0.0.1'
$env:TEST_DB_USER='root'
$env:TEST_DB_PASS=''
$env:TEST_DB_NAME='sparowvault_test'
$env:BASE_URL='http://localhost:5000'
npm run test:account:endpoints
```

After that passes, run the Phase 13 browser manual checklist before marking this phase COMPLETE.
