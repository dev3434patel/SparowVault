# LOCAL COMBINATION MATRIX QA PHASE

Generated: 2026-05-22 01:16 IST

Final status: PASS

## Scope

This phase adds a deterministic high-risk combination matrix for local QA. It does not claim mathematically exhaustive coverage of every possible user input, browser, date, device, import file, or hosted condition.

The matrix focuses on combinations most likely to break finance correctness:

- Transaction type
- Payment mode
- Required fields
- Preview explanation
- Financial event type
- Financial effect targets/directions/components
- Negative checks for wrong income/expense/liability/cash classification
- Deleted transaction behavior
- Same-account transfer blocking

## Matrix Coverage Added

New test file:

- `D:\Claude\SparowVault\tests\unit\localCombinationMatrix.test.ts`

Covered scenarios:

| # | Scenario | Main assertion |
|---:|---|---|
| 1 | UPI expense | Account cash decreases; expense increases |
| 2 | Cash expense | Cash wallet decreases; expense increases |
| 3 | Debit-card expense | Bank/account decreases; expense increases |
| 4 | Auto-debit expense | Bank/account decreases; expense increases |
| 5 | Credit-card purchase | Expense + card liability; no bank movement |
| 6 | Card bill payment | Bank decreases + card liability decreases; no expense |
| 7 | Card refund | Card liability decreases + expense reverses; no income |
| 8 | Bank/UPI refund | Account increases and income-category effect is explicit |
| 9 | Salary income | Account cash + income category increase |
| 10 | EMI payment | Bank outflow + principal reduction + interest expense |
| 11 | Loan prepayment | Bank outflow + principal reduction; no normal expense |
| 12 | Loan disbursement | Bank inflow + loan principal/liability increase |
| 13 | Udhari given | Bank outflow + receivable; no expense |
| 14 | Udhari received | Bank inflow + payable; no income |
| 15 | Udhari collect | Bank inflow + receivable decrease |
| 16 | Udhari repay | Bank outflow + payable decrease |
| 17 | Udhari write-off | Receivable decrease + bad-debt expense |
| 18 | Goal contribution | Bank outflow + goal asset increase; no normal expense |
| 19 | Goal withdrawal | Goal asset decrease + bank inflow |
| 20 | Investment buy | Bank outflow + investment asset increase |
| 21 | Investment sell | Investment asset decrease + bank inflow |
| 22 | Transfer | From account decreases, to account increases; no income/expense |

Additional matrix checks:

- Each covered valid combination has no Phase 6 form-rule errors.
- Each required field fails when removed.
- Preview text contains the required user-facing explanation.
- Ledger event status is `posted`.
- Ledger builder produces no `excluded` review warnings for valid combinations.
- Deleted variants of every covered type produce no event/effects.
- Transfer to same account is blocked before ledger posting.

## Commands Run

| Command | Result |
|---|---:|
| `npx vitest run tests/unit/localCombinationMatrix.test.ts` | PASS, 24/24 |
| `npm run test -- tests/unit/localCombinationMatrix.test.ts src/services/__tests__/ledger.scenarios.test.ts src/services/__tests__/transactionFormRules.test.ts src/services/__tests__/transactionPreview.test.ts` | PASS, 61/61 |
| `npm run typecheck` | PASS |
| `npm run lint` | PASS |
| `npm run test:calculations` | PASS, 19/19 |
| `npm run test:phase04:validation` | PASS |
| `npm run test:api` | PASS, 65/65 |
| `npm run test:browser` | PASS, 37/37 |

## What Was Fixed

No product code fix was required. The new matrix passed against the current implementation.

## Files Changed

- `D:\Claude\SparowVault\tests\unit\localCombinationMatrix.test.ts`
- `D:\Claude\SparowVault\LOCAL_COMBINATION_MATRIX_QA_REPORT.md`

## What This Proves

Locally, high-risk finance combinations now have direct automated coverage across:

- Frontend conditional required-field validation.
- User-facing transaction preview explanations.
- Ledger event/effect correctness.
- Negative classification rules for card, EMI, udhari, goal, transfer, and investment flows.
- Backend sync validation still passes with hot-field and isolation checks.
- Browser smoke still passes after adding the matrix.

## What This Does Not Prove

This is not infinite exhaustive testing. Still not fully proven:

- Every possible malformed import file shape.
- Every date/month/year/report boundary.
- Every rapid multi-click race condition across every form.
- Every mobile device/browser combination.
- Every hosted staging configuration.
- Real Razorpay provider checkout and delivered webhooks.
- Hosted backup/restore and monitoring.

## Remaining Recommended QA Extensions

Before paid beta, add these if time allows:

- Import fuzz matrix for malformed CSV/Excel data.
- Date boundary matrix for month-end, financial-year-end, leap day, timezone conversion, and recurring rules.
- Multi-click/race E2E for all create/update forms, not only categories.
- Browser matrix on real Chrome/Edge/Android viewport/device cloud.
- Hosted staging smoke with the same finance replay.

## Final Status

PASS

The dedicated local combination matrix QA phase passed. SparowVault remains locally package-ready, with stronger coverage for high-risk finance combinations. It is still not an absolute guarantee that every possible combination is error-free.
