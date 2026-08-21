# LOCAL PHASE 7 — Reports and Export Certification

Date: 2026-05-22  
Environment: Local `D:\Claude\SparowVault`  
Final status: PASS

## Scope

Certified local reports and exports for CA correctness and ledger-backed behavior. The certification uses:
- Local Phase 5 replay evidence from SQL `financial_events` and `financial_effects`
- Report-specific synthetic rows for mixed business/personal split, GST missing bill, and tax flag checks
- CA workbook generation and workbook parsing to compare export totals against report totals
- Account export endpoint test to verify full data export ownership

## Reports Tested

| Report / Export | Result | Evidence |
|---|---:|---|
| Expense report | PASS | Ledger-backed category report includes UPI, card purchases, EMI interest, bad debt write-off, and business/personal test expenses |
| Cashflow report | PASS | Account ledger cashflow includes card bill payment outflow |
| Net worth report | PASS | Assets/liabilities/net worth generated from report bundle |
| Debt report | PASS | Card outstanding, loan outstanding, udhari payable, total debt, monthly EMI generated |
| Credit-card ledger | PASS | Purchases `4,200,000` paise, payments/refund reductions `900,000` paise, net outstanding `3,300,000` paise |
| Loan amortization report | PASS | Report bundle includes loan amortization section and workbook includes loan amortization sheet |
| Interest paid report | PASS | EMI interest `500,000` paise and principal reduction `3,100,000` paise linked to loan |
| Udhari ageing / receivable-payable | PASS | Receivable `60,000` paise and payable `100,000` paise visible |
| Business expense report | PASS | Mixed business split business portion `60,000` paise |
| Personal expense report | PASS | Personal report includes Phase 5 personal expenses plus mixed/personal portions `4,335,000` paise |
| GST missing bill report | PASS | Synthetic GST/tax missing-bill transaction appears |
| Tax flag report | PASS | Synthetic tax-flag transaction appears |
| Account reconciliation | PASS | Generated and matched for certification context |
| CA workbook export | PASS | Workbook contains required report sheets |
| Full data export | PASS | Account endpoint export returns current user data only |

## Required Correctness

| Requirement | Result | Evidence |
|---|---:|---|
| Card purchase appears in expense report | PASS | Grocery category `4,000,000` paise from card purchases after refund adjustment |
| Card bill payment does not appear as new expense | PASS | Category ledger has no card-payment expense row |
| Card bill payment appears in cashflow | PASS | May cashflow outflows include card payment |
| EMI interest appears as expense | PASS | Interest category `500,000` paise |
| EMI principal appears as loan reduction | PASS | Interest-paid report principal `3,100,000` paise |
| Udhari given appears as receivable | PASS | Receivable/payable summary receivable `60,000` paise |
| Udhari received appears as payable | PASS | Receivable/payable summary payable `100,000` paise |
| Udhari write-off appears as expense | PASS | Bad Debt category `60,000` paise |
| Transfers do not appear as income/expense | PASS | Transfer transaction has no expense/income category in transaction master |
| Business/personal split totals correctly | PASS | Business `60,000` paise, personal `4,335,000` paise |
| Export totals match UI/report totals | PASS | Workbook `Expense_By_Category` total `4,755,000` paise equals ledger expense report total `4,755,000` paise |

## No Double-Counting / Misclassification Gate

PASS only if reports and exports do not double-count or misclassify money.

Result: PASS

Evidence:
- card bill payment is excluded from expense and included in cashflow
- EMI interest is expense; EMI principal is loan reduction
- udhari given is receivable; udhari received is payable
- udhari write-off is expense
- transfers are not income/expense
- CA workbook expense total equals ledger-backed category report total
- focused gate file: `D:\Claude\SparowVault\local-phase-07-logs\no-double-count-misclassification-gate.json`

## What Was Fixed

1. Expense/category reports now include ledger effects with component `interest` as expenses, not only component `expense`.
2. Expense/category reports now apply decrease effects as negative amounts, so contra-expense/refund effects reduce expense totals.
3. Interest-paid report now links EMI interest back to the loan through the same event’s principal loan effect instead of assuming the interest effect target is the loan.
4. CA workbook monthly income/expense summaries now use ledger-backed cashflow rows.
5. CA workbook `Expense_By_Category` now uses the same ledger-backed category report as the app/report engine.
6. Added deterministic Local Phase 7 certification script.

## Files Changed

- `D:\Claude\SparowVault\src\services\caReports.ts`
- `D:\Claude\SparowVault\src\exports\xlsxExporter.ts`
- `D:\Claude\SparowVault\tests\unit\caReports.test.ts`
- `D:\Claude\SparowVault\scripts\local-phase-07-report-export-certification.ts`
- `D:\Claude\SparowVault\LOCAL_PHASE_07_REPORT_EXPORT_CERTIFICATION.md`

## Commands Run

| Command | Result |
|---|---:|
| `npx tsx scripts/local-phase-07-report-export-certification.ts` | PASS |
| `npm run typecheck` | PASS |
| `npm run lint` | PASS |
| `npx vitest run tests/unit/caReports.test.ts tests/unit/importExportRepair.test.ts src/services/__tests__/businessPersonalSplit.test.ts` | PASS, 21/21 tests |
| `npm run phase:12:gate` | PASS |
| `npm run phase:15:gate` | PASS |
| `npm run test:account:endpoints` | PASS |
| `npm run test:browser` | PASS, 37/37 checks |

## SQL Checks

No SQL schema change was required.

SQL-backed evidence reused:
- `D:\Claude\SparowVault\local-phase-05-logs\manual-finance-replay-results.json`
- `D:\Claude\SparowVault\local-phase-05-logs\sql-financial-events-effects-check.json`
- `D:\Claude\SparowVault\local-phase-05-logs\accounting-gate-condition-check.json`

Local Phase 7 generated evidence:
- `D:\Claude\SparowVault\local-phase-07-logs\report-export-certification-results.json`
- `D:\Claude\SparowVault\local-phase-07-logs\no-double-count-misclassification-gate.json`

## Screenshots / Logs Required

No new screenshots were required for this local report/export certification. Evidence is command output plus generated JSON certification results.

If later visual sign-off is required, capture:
- Reports page with expense/cashflow/debt sections
- Export Center before and after CA workbook export
- Parsed workbook sheet list

## Remaining Risks

- Certification is local and deterministic; hosted/staging export behavior is not certified here.
- The certification script uses Phase 5 replay evidence plus synthetic report rows. It is stronger than static tests but not a human click-by-click workbook review.
- Account reconciliation intentionally reports possible causes for card purchases missing account because credit-card purchases correctly have no bank account cash movement. Status is still matched in the certification context.

## Rollback Plan

If rollback is required:
1. Revert `D:\Claude\SparowVault\src\services\caReports.ts`.
2. Revert `D:\Claude\SparowVault\src\exports\xlsxExporter.ts`.
3. Revert `D:\Claude\SparowVault\tests\unit\caReports.test.ts`.
4. Delete `D:\Claude\SparowVault\scripts\local-phase-07-report-export-certification.ts`.
5. Delete `D:\Claude\SparowVault\LOCAL_PHASE_07_REPORT_EXPORT_CERTIFICATION.md`.
6. Delete generated folder `D:\Claude\SparowVault\local-phase-07-logs`.

Rollback risk: reverting would reopen CA/report gaps where EMI interest is not in expense reports, interest-paid linkage may be wrong for real ledger effects, and workbook category totals may not match ledger-backed report totals.

## Final Phase Status

PASS

Local Phase 7 is complete at local level. Reports and exports are certified against the required card, EMI, udhari, transfer, business/personal, GST/tax, reconciliation, CA workbook, and full-data export conditions.
