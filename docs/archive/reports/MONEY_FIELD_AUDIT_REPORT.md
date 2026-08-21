# Phase 3 Money Field Audit Report

Date: 2026-05-14
Scope: React/Vite/TypeScript frontend, Dexie/cloud-sync payloads, PHP/MySQL backend, imports, exports, reports, Razorpay billing, and the final SQL file `sql/20260501_sql_only_full.sql`.

## Executive Status

Status: COMPLETE WITH MANUAL DB ROLLBACK NOT EXECUTED

The main Phase 3 money contract is now implemented in code: canonical persisted/calculated money uses integer paise fields, legacy rupee mirrors are treated as fallback/display compatibility, imports reject unsafe money input, cloud hot fields derive from paise, and Razorpay expected/captured amounts are validated/stored as paise.

## Canonical Money Classification

| Domain | Field(s) | Classification | Notes |
| --- | --- | --- | --- |
| Transactions | `amountPaise`, `cloud_collection_rows.amount_paise` | Already paise | Canonical for ledger, reports, sync hot fields, exports, and duplicate detection. |
| Transactions | `amount` | Legacy rupee mirror | Used only as compatibility/display mirror. `amountPaise` wins when both exist. |
| Accounts | `openingBalancePaise` | Already paise | Canonical opening balance. |
| Accounts | `openingBalance` | Legacy rupee mirror | Filled from paise on push. |
| Cards | `creditLimitPaise`, card engine balances/due fields | Already paise | Canonical credit limit, outstanding, statement, minimum due, fees. |
| Cards | `creditLimit`, `joiningFee`, `annualFee`, `interestRate` | Legacy/display/rate | `creditLimit` is rupee mirror; fees still need full UI/schema paise migration in a later hardening pass. `interestRate` is percent, not money. |
| Budgets | `limitPaise` | Already paise | Canonical budget limit. |
| Budgets | `amount` | Legacy rupee mirror | Filled from paise on push. |
| Goals | `targetAmountPaise`, `savedAmountPaise`, contribution `amountPaise` | Already paise | Canonical target, saved, contribution amounts. |
| Goals | `targetAmount`, `currentSaved`, contribution `amount` | Legacy rupee mirror | Compatibility only. |
| Loans / EMI | `principalPaise`, `outstandingPrincipalPaise`, `emiPaise`, EMI `amountPaise`, `amountPaidPaise`, `principalComponentPaise`, `interestComponentPaise`, `penaltyPaise`, `feePaise`, `extraPrincipalPaise`, `openingPrincipalPaise`, `closingPrincipalPaise` | Already paise | Canonical loan/EMI values. |
| Loans / EMI | `principal`, `outstandingPrincipal`, `emiAmountOverride`, `amountDue`, `amountPaid`, `principalComponent`, `interestComponent`, `processingFee`, `insuranceCost`, `foreclosureCharges`, `blockedAmount` | Legacy rupee mirror / pending paise mirrors | Core loan/EMI canonical values have paise fields. Ancillary loan costs still need explicit paise mirrors in a future phase. |
| Udhari | `amountPaise`, `amountSettledPaise`, settlement `amountPaise` | Already paise | Canonical receivable/payable and settlements. |
| Udhari | `amount`, `amountSettled`, settlement `amount` | Legacy rupee mirror | Compatibility only. |
| Investments | `amountPaise`, `totalContributedPaise` | Already paise | Canonical monthly/total contribution. |
| Investments | `monthlyTarget`, `totalContributed` | Legacy rupee mirror | Compatibility only. |
| Recurring rules / reminders | `amountPaise` where present | Already paise | Recurring canonical amount uses paise when available. |
| Recurring rules / reminders | `amount` | Legacy/display rupee | Still accepted as fallback for old data. |
| Payments | `expected_amount_paise`, `captured_amount_paise` | Already paise | Expected amount is source of truth. Captured webhook amount is validated and now stored. |
| Payments / Plans | `amount_inr`, `price_inr` | Display/historical rupee decimal | Billing code converts with the shared PHP money parser; these remain historical/display columns. |
| Tax / GST flags | `taxFlag`, `gstApplicable`, `taxRelevant` | Not money | Boolean/classification fields. |

## Changes Made

- Added strict frontend money parsing via `parseMoneyInputToPaise()` and optioned `safeParseMoneyInput()`.
- Kept UI-safe fallback behavior for live form typing, but enabled strict throw mode for import validation.
- Updated frontend transaction import to parse amount once into `amountPaise`, reject invalid/negative/too-many-decimal values, and compare duplicates by paise.
- Added PHP `cloud_parse_money_input_to_paise()` and `cloud_try_money_input_to_paise()` for backend import, sync, ledger, billing, and payment fallback paths.
- Updated PHP bulk import to reject invalid money and write `amountPaise` as canonical.
- Updated cloud transaction validation so legacy `amount` is normalized to `amountPaise` when missing.
- Updated financial event fallback conversion to use the PHP paise parser.
- Updated billing fallback conversion from `price_inr`/`amount_inr` to use the PHP paise parser.
- Added `captured_amount_paise` to payment SQL and stored validated Razorpay captured amount on webhook capture.
- Replaced user-facing manual paise divisions in touched UI/report/export/preview areas with `paiseToRupees()`.
- Added Phase 3 regression tests for frontend money parsing and PHP backend money parsing/hot-field precedence.

## Legacy Normalization Contract

- If both `amountPaise` and legacy `amount` exist, `amountPaise` wins.
- Legacy rupee float-dust payloads such as `285.5699999999` normalize to `28557` paise only in explicit legacy-repair paths.
- New frontend import writes include `amountPaise`.
- Backend cloud hot field `cloud_collection_rows.amount_paise` derives from `amountPaise` first and only falls back to legacy rupee fields when needed.

## Import Contract

Invalid imports are rejected for:

- Negative amounts.
- Empty/zero amounts where a positive amount is required.
- Non-numeric strings.
- NaN/infinite numeric input.
- More than two decimal places unless the path explicitly opts into legacy rounding.
- Values above the configured maximum paise magnitude.

## Razorpay Contract

- `expected_amount_paise` remains the billing source of truth.
- Webhook `payment.captured.amount` is treated as paise from Razorpay.
- Captured amount must exactly equal `expected_amount_paise`.
- `captured_amount_paise` is now persisted after validation.
- `amount_inr` remains a historical/display compatibility field, not the authority for new payment validation.

## Remaining Risks / Follow-Up

- Some legacy rupee mirrors remain in TypeScript models for compatibility. They are acceptable only while paise accessors and normalizers are used consistently.
- Ancillary loan fields such as `processingFee`, `insuranceCost`, `foreclosureCharges`, and `blockedAmount` still need explicit paise mirror fields if they become ledger-impacting values.
- Some percentage/rate math legitimately uses `/ 100`; static grep must be reviewed manually instead of treated as all money defects.
- Existing databases must apply `sql/migrations/phase_03_cloud_amount_paise.sql` before payment webhooks can persist `captured_amount_paise`.

## Verification

- `npm run test -- src/utils/__tests__/money.test.ts tests/unit/phase-03-money-contract.test.ts`: PASS.
- `npm run typecheck`: PASS.
- `npm run lint`: PASS.
- `npm run check:php`: PASS.
- `npm run check:sql`: PASS with existing static warnings about older SQL files using `ALTER TABLE` without `IF EXISTS`.
- `npm run build`: PASS with existing Vite chunk-size/dynamic-import warnings.
- `npm run phase:03:gate`: PASS.
- Local DB migration check: PASS. `cloud_collection_rows.amount_paise=1`, `payments.captured_amount_paise=1`.
- Rollback SQL file exists. Rollback was not executed against the local DB because it would intentionally drop Phase 3 columns after applying them.

## Rollback Plan

- Revert the Phase 3 code changes in `src/utils/money.ts`, import handling, PHP money helpers, payment webhook update, and report/display call sites.
- Revert SQL additions for `payments.captured_amount_paise`.
- If already applied to a database, run `ALTER TABLE payments DROP COLUMN captured_amount_paise;` after confirming no production audit dependency uses it.
