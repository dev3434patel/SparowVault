# API matrix

Company mutations in this run called PHP functions on `sparowvault_verify_test` with `DB_NAME` set in the environment so `.env.local` could not retarget them. HTTP endpoint files were included when `company:test:http` and `company:test:idor` ran under that same variable.

| Call | Result on the verify database |
|---|---|
| Purpose preview and post, including stale hash | PASS in `run-accounting.php` |
| Cross-company voucher, party, bill, ledger | PASS in `idor-http.php` |
| Sale plus receipt lines | Income 1000000 paise, receivable net 680000 |
| Journal with cost allocations | Allocation 10000, unequal split rejected |
| Payroll accrual and payment | Salary debit 3180000 once |
| Six report keys | Each returned a row |
| Opening balance as manager without `manage_opening_balances` | 403-class error, not posted |
| Export PDF/DOCX builder | PASS, no database |
| `GET /api/healthz.php` on the audit server | 200, db check ok, 36 company tables (includes `company_items` created during O09) |
| Reimbursement dispatch shape | Link only. FAIL F-003 |
| Stock item update | No voucher. FAIL F-002 |

Personal writes used Dexie on `sparowvault_verify_idb` through the workflow functions, then the database was deleted. The browser database `sparowvault_v1` was not opened.
