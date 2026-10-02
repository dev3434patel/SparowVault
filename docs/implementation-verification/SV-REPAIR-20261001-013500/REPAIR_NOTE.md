# Repair note SV-REPAIR-20261001-013500

Disposable database: `sparowvault_test_svrepair_20261001`. The earlier audit run `SV-VERIFY-20260930-202241-b182d88604c9` was not edited. Its 299 unrun cases stay not run. Live bank layouts, Account Aggregator, Razorpay, GST filing, and hosting stay blocked.

## Money on the disposable company

Posted lines are debit-positive, so a payable credit and a bank credit are negative.

| Check | Expected | Actual |
| --- | --- | --- |
| Reimbursement payable | -750000 | -750000 |
| Reimbursement expense vouchers after a second call | 1 | 1 |
| Salary lines | 0 | 0 |
| Cheque issue of 2500000 | bank delta 0 | 0 |
| Cheque clear | bank -2500000, once | -2500000, second clear posted false |
| STOCK after buy 2 at 10000 and sell 1 at 15000 | 10000 | 10000 |
| COGS | 10000 | 10000 |
| Item row | qty 1, value 10000 | qty 1, value 10000, cogs 10000 |

A separate 1000 paise cheque with a 250 paise fee left the bank unchanged at issue. Clear posted the principal and the fee as two vouchers. Posted vouchers went from 5 to 8, and the bank moved by 1250 paise.

The weighted-average golden (buy 10 at 100, sell 4 at 150: qty 6, value 600, COGS 400) still passes in `php src/company/auth/__tests__/phaseSvPure.php`. The live Local Books company was not sold again.

## Other checks

- URL-only `sparowvault_owner_books` exits 2 before connect. `tests/unit/db-test-reset-url-guard.test.ts` passed.
- `php scripts/company/apply-migration.php --list` ends with `20260930_company_phase_sv.sql` and `20260930_company_branch_url.sql`. Applying that list a second time on the disposable database exited 0.
- `tests/unit/phase-02-sync-contracts.test.ts` passed, 9 tests.
- Health with no secret and no database: HTTP 503, status `not_configured`. A database name without `test`: HTTP 503, status `refused`, and no connection was opened. With this disposable database and a non-production secret: `/api/health.php` and `/api/healthz.php` returned HTTP 200 `healthy`.
- `npm run lint` exited 0. `react-hooks/exhaustive-deps` is loaded. The run reported warnings and no errors.
