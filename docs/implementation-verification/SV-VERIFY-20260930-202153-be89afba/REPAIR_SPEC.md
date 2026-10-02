# Prioritized repair specification

Do these in order. Each one is small enough to test on `sparowvault_verify_test` or `sparowvault_verify_idb` without touching `sparowvault_v1` or the configured application database.

1. **F-001** Parse the database name from `TEST_DATABASE_URL` and refuse before connect unless it contains `test`. Same check for `db-test-seed.mjs` if it shares the gap.
2. **F-002** On stock buy and sell, persist paise and post a voucher. Button amounts of 100 and 150 rupees must become 10000 and 15000 paise per unit.
3. **F-003** Make the reimbursement action write the company payable and the personal receivable, then store both ids.
4. **F-006** Apply a stripped backup into a new company in a different test database.
5. **F-004** Put the new company tables into `SPAROWVAULT_FULL_DATABASE.sql` and make index creation idempotent.
6. **F-005** Fix the three ESLint directives so `npm run lint` exits 0.

After those, re-run the disposable oracles O09 and O12, `npm test`, `npm run lint`, and a restore into `sparowvault_verify_restore`. Do not treat `company_phase_sv_golden.php` value 600 as the paise oracle.
