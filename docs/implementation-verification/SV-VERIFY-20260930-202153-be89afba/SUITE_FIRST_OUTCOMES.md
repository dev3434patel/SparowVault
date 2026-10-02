# First outcomes of unmodified suites

Commands were not re-run to chase a green result. Finance-gate markdown that the scripts write at the repo root was copied into this run and the historical `docs/certification/PHASE_L_VNEXT_FINANCE_GATE_REPORT.md` was restored. Its hash matches the pre-run snapshot. The individual phase reports did not exist before the run and were removed from the repo root after being copied here.

| Suite | Exit | First outcome |
|---|---:|---|
| `npm run typecheck` | 0 | `tsc --noEmit` clean |
| `npm run lint` | 1 | 3 errors, all `react-hooks/exhaustive-deps` definition not found, in LedgersPage, ReceivablesPage, ReportsHubPage |
| `npm test` | 1 | 2 failed, 581 passed, 81 files. Both failures are in `tests/unit/phase-02-sync-contracts.test.ts` |
| `npm run check:php` | 0 | 142 PHP files parse |
| `npm run check:sql` | 0 | Static report, 8 warnings. Live rollback skipped because `TEST_DB_*` was unset |
| `finance:gate:ledger` through `finance:gate:all` | 0 | File presence plus vitest. Not a browser or database PASS |
| `company:test:php` | 0 | Run only after `DB_NAME=sparowvault_verify_test`. Includes the six management report handlers |
| `company:test:http` | 0 | Domain checks on the verify database |
| `company:test:idor` | 0 | Cross-company reads returned null |
| `company:test:export` | 0 | PDF and DOCX smoke |
| `php/scripts/company_phase_sv_golden.php` | 0 | Whole-unit helper goldens, including stock value 600 |
| `statements:gate:strict` | 1 | `verified-for-scope layouts: 0`. 20-bank claim stays blocked |
| Vite build into this run's `package/dist` | 0 | Did not replace the repo `dist/` or `release/` |

`phase:all:gates` was not treated as a behavioral pass and was not required to close any parent.

The two vitest failures:

1. PHP-referenced company tables are missing from `SPAROWVAULT_FULL_DATABASE.sql`.
2. `ALTER TABLE ... ADD INDEX` statements in the company index migration are not idempotent. Applying that file to the fresh verify database failed with `Duplicate key name 'idx_cal_company_created'`.
