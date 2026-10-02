# Lane C — company report loading

Owner database `sparowvault` was read for timings only. It was not dropped, restored, or loaded with a 100k matrix.

## Root cause

Project, area, and user-activity use the same report page and the same `GET /api/company/reports.php` dispatch as business and category. On the October sample user (`cert_211549`, company with no posted vouchers in the current month) each of those three requests returns in well under a second.

The page stayed on Loading in the October sample because the request had not finished. Two code paths kept that spinner up past a newer request, or past a lock held by the 100k/backup worker:

1. `ReportViewPage` cleared `loading` in `finally` for every request. A slower older request could clear the flag that belonged to a newer request, and a fast navigation could paint the previous report's rows under the new title.
2. The report query waited on `innodb_lock_wait_timeout` (server default, 50 seconds) while another session held locks. The HTTP call did not return an error until that wait ended, so the button stayed on Loading.

Empty `rows: []` is a successful authorized body. A 403 is `Missing permission: …` and is shown as an error, not as an empty table.

## Request and response

Hub click and direct URL ` /company/app/reports/{project-report|area-report|user-activity}` both call:

`GET /api/company/reports.php?companyId=…&report=<key>&from=YYYY-MM-DD&to=YYYY-MM-DD`

Authorized empty body (HTTP 200):

```json
{"ok":true,"data":{"report":"project-report","data":{"source":"posted_vouchers","dimension":"project","rows":[]}}}
```

`area-report` uses `"dimension":"area"`. `user-activity` omits `dimension` and returns `"rows":[]`.

After the fix, the cert company settled to Summary with those empty rows: project from the direct URL, area from in-app navigation (154ms, dimension `area`), user-activity from the hub click. The button read Loading while the request was in flight, then Run report.

A company with about 15,000 posted vouchers and 150,000 lines in the selected month still takes about 15–25 seconds to group, because the line aggregate has to read row bodies. That request returns the same success shape; the spinner stays until that response, and an older response cannot clear it.

## Certification scripts

Not run.

`scripts/company/certify-final.mjs` always includes `scripts/company/perf-100k-matrix.php`, which inserts into `DB_NAME` (`sparowvault`) and has no disposable-database switch. `COMPANY_CERT_SKIP_100K=1` marks that step failed and still runs the rest of the orchestrator against the owner database. `scripts/company/backup-restore-drill.php` does not drop `DB_NAME`; it dumps every `company_*` table from the owner database (816,250 vouchers, 3,224,010 lines) and drops only `COMPANY_CERT_TEST_DB` (default `sparowvault_cert_restore`).

`scripts/company/certify-product.mjs` does not drop the owner database either. It runs gates, browser journeys, and personal regression against the same live database and dev server. It was not run, so this pass would not add another certification company or a multi-gigabyte dump on top of the report fix.

## Commands

| Command | Exit |
|---|---|
| `npx vitest run src/company/services/__tests__/reportLoad.test.ts src/company/services/__tests__/booksPhases.test.ts` | 0 (20 tests) |
| `npx tsc --noEmit` | 0 |
| `php -l php/controllers/company.php` | 0 |
| `npm run company:certify:final` | not run |
| `npm run company:certify:product` | not run |
