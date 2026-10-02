# Command log

Working directory: `D:\Claude\SparowVault`. Database mutations used `DB_NAME=sparowvault_verify_test` or `TEST_DB_NAME=sparowvault_verify_test` with user `root` on `127.0.0.1`. Passwords are omitted.

| Command | Exit |
|---|---:|
| `node scripts/db-test-reset.mjs` with `TEST_DB_NAME=sparowvault_production` | 2 |
| same with `owner_books_sentinel` | 2 |
| same with `TEST_DATABASE_URL` for `sparowvault_live` | 1 |
| `npm run typecheck` | 0 |
| `npm run lint` | 1 |
| `npm test` | 1 |
| `npm run check:php` | 0 |
| `npm run check:sql` | 0 |
| `node create-verify-db.mjs` | 0 |
| `node scripts/db-test-reset.mjs` on `sparowvault_verify_test` | 0 |
| `node apply-company-schema.mjs` | 1 on two index files (duplicate key); other company SQL applied |
| `php seed-synthetic-users.php` | 0 |
| `php scripts/company/php-tests/run-accounting.php` | 0 |
| `php oracle-company.php` | 0 (O09 and O12 recorded FAIL inside the JSON) |
| `npx tsx oracle-personal.ts` | 0 |
| `php auth-manager.php` | 0 |
| `php scripts/company/export-smoke.php` | 0 |
| `php php/scripts/company_phase_sv_golden.php` | 0 |
| `php src/company/auth/__tests__/phaseSvPure.php` | 0 |
| `php src/company/auth/__tests__/roleEndpoint.php` | 0 |
| `php scripts/company/http-e2e.php` | 0 |
| `php scripts/company/idor-http.php` | 0 |
| `npm run statements:gate:strict` | 1 |
| `npm run finance:gate:*` (nine scripts) | 0 |
| `npx vite build --outDir <run>/package/dist` | 0 |
| package curl probes | 200 for HTML and JS, 403 for `.env` and `.sql` |
| `node gate-poison.mjs` | 0 |

Skipped on purpose: `npm run host:package`, `phase:all:gates` as a behavioral pass, any reset of a database whose name does not contain `test`, live Razorpay, GST filing, and real bank PDFs.
