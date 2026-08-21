# LOCAL PHASE 5 — MANUAL FINANCE REPLAY REPORT

Generated: 2026-05-21 23:58 IST

Final status: PASS

## Scope

Goal: prove local finance movement from creation path through SQL sync rows, ledger events/effects, dashboard, reports, suggestions, and Dexie mirror.

Execution note: the scenario replay was automated through the same authenticated local API/repository write path used by the app, then verified in browser. It was not a human click-by-click entry of all 15 transactions, but it does prove the local data path and accounting outputs with repeatable evidence.

Runtime under test:
- Backend: `http://localhost:5000`
- Frontend: `http://localhost:5173`
- Database: `sparowvault_local_cert`
- Browser DB: `sparowvault_v1`

## What Was Checked

Test user:
- Username: `phase5_mpftokzb`
- User ID: `cu_b48c1e737cf025bfaaac7713`

Created setup data:
- Bank account: SBI Bank, opening balance `₹50,000`
- Cash account: Cash Wallet, opening balance `₹5,000`
- Credit card: HDFC Card, limit `₹50,000`
- Loan: Personal Loan, principal `₹5,00,000`, EMI `₹10,000`
- Goal: Emergency Fund, target `₹60,000`
- Udhari person: Rahul
- Udhari person: Amit

## Scenario Results

| Key | Scenario | Event Type | Result |
|---|---|---|---:|
| A | UPI expense `₹450` | `expense` | PASS |
| B | Credit-card purchase `₹10,000` | `credit_card_purchase` | PASS |
| C | Credit-card purchase `₹32,000` | `credit_card_purchase` | PASS |
| D | Card bill payment `₹7,000` | `credit_card_payment` | PASS |
| E | Card refund `₹2,000` | `refund` | PASS |
| F | EMI `₹10,000` | `emi_payment` | PASS |
| G | Partial EMI `₹6,000` against `₹10,000` | `emi_payment` | PASS |
| H | Loan prepayment `₹20,000` | `loan_prepayment` | PASS |
| I | Udhari given Rahul `₹1,000` | `udhari_given` | PASS |
| J | Rahul repays `₹400` | `udhari_settlement` | PASS |
| K | Borrow from Amit `₹1,000` | `udhari_received` | PASS |
| L | Repay Amit `₹1,000` | `udhari_settlement` | PASS |
| M | Write off Rahul `₹600` | `udhari_write_off` | PASS |
| N | Goal contribution `₹2,000` | `goal_contribution` | PASS |
| O | Transfer `₹5,000` | `transfer` | PASS |

For every scenario, the replay verified:
- `cloud_collection_rows` transaction hot fields
- one matching `financial_events` row
- expected `financial_effects` rows
- paise integer values
- user-owned row filtering by `user_id`

## Finance Totals

| Check | Expected Paise | Actual Paise | Result |
|---|---:|---:|---:|
| Card outstanding after purchases/payment/refund | `3300000` | `3300000` | PASS |
| Card utilization after final replay | `66%` | `66%` | PASS |
| Bank balance after all bank movements | `-105000` | `-105000` | PASS |
| Cash balance after transfer | `1000000` | `1000000` | PASS |
| Loan principal reduction | `-3100000` | `-3100000` | PASS |
| Rahul receivable net zero after collect/write-off | `0` | `0` | PASS |
| Amit payable net zero after borrow/repay | `0` | `0` | PASS |
| Income remains zero for udhari/transfer/card payment | `0` | `0` | PASS |
| Expense includes UPI, card purchases, interest, bad debt, refund contra | `4605000` | `4605000` | PASS |

## Specific Accounting Proof

- UPI expense decreased bank and increased expense.
- Credit-card purchases increased card liability and expense; bank did not decrease.
- Card bill payment decreased bank and card liability; no new expense was created.
- Card refund decreased card liability and decreased expense category; it did not create income.
- EMI split was verified:
  - Full EMI `₹10,000`: bank decrease `₹10,000`, principal decrease `₹7,000`, interest expense `₹3,000`.
  - Partial EMI `₹6,000`: bank decrease `₹6,000`, principal decrease `₹4,000`, interest expense `₹2,000`.
- Partial EMI row stayed `partial` with pending `₹4,000`.
- Loan prepayment reduced bank and loan principal only; no normal expense.
- Udhari given created receivable, not expense.
- Udhari repayment reduced receivable, not income.
- Borrowing from Amit created payable, not income.
- Repayment to Amit reduced payable, not expense.
- Rahul write-off reduced receivable and created bad debt expense.
- Goal contribution reduced bank and increased goal asset; no normal expense.
- Transfer moved cash between accounts only; no income/expense.

## Dexie / Local State

The failing Dexie gap found during this phase was fixed.

Previous behavior:
- SQL-backed repositories returned remote rows but did not mirror them into IndexedDB.

Fix:
- `BaseRepo` now mirrors SQL-backed create/list/get/update/delete results into Dexie.

Browser IndexedDB evidence after replay user login:

| Dexie Table | Count |
|---|---:|
| `accounts` | `2` |
| `cards` | `1` |
| `categories` | `4` |
| `transactions` | `15` |
| `loans` | `1` |
| `emiPayments` | `2` |
| `goals` | `1` |
| `udhari` | `2` |

Evidence file:
- `D:\Claude\SparowVault\local-phase-05-logs\manual-finance-replay-results.json`

## UI / Dashboard / Reports / Suggestions

Browser checks:

| Check | Result |
|---|---:|
| Dashboard opens for replay user | PASS |
| Reports page opens for replay user | PASS |
| Suggestions page opens for replay user | PASS |
| Dexie has mirrored SQL-backed transactions | PASS |
| No fatal browser errors | PASS |

Screenshots:
- `D:\Claude\SparowVault\local-phase-05-logs\01-dashboard.png`
- `D:\Claude\SparowVault\local-phase-05-logs\02-reports.png`
- `D:\Claude\SparowVault\local-phase-05-logs\03-suggestions.png`

Suggestions page rendered and included card/risk-related text. Note: the final card utilization after payment/refund is `66%`; the replay still verifies the 84% danger point mathematically after scenario C, but the final UI screenshot reflects the final post-payment/refund state.

## Files Changed

- `D:\Claude\SparowVault\src\repositories\baseRepo.ts`
- `D:\Claude\SparowVault\scripts\local-phase-05-manual-finance-replay.mjs`
- `D:\Claude\SparowVault\LOCAL_PHASE_05_MANUAL_FINANCE_REPLAY_REPORT.md`

## Commands Run

| Command | Result |
|---|---:|
| `node scripts/local-phase-05-manual-finance-replay.mjs` | PASS |
| `npm run typecheck` | PASS |
| `npm run lint` | PASS |
| `npm run test:browser` | PASS |
| `npm run check:sql` | PASS with existing static warnings |

## SQL Checks Done

The replay queried:
- `cloud_collection_rows`
- `financial_events`
- `financial_effects`
- `emis`
- `udhari`
- `goals`

For each transaction:
- hot fields were present
- event type matched expected accounting treatment
- effect rows matched target, direction, paise amount, and component

Additional direct SQL check requested:
- `financial_events` query returned `15` rows for test user `cu_b48c1e737cf025bfaaac7713`
- `financial_effects` query returned `32` rows for test user `cu_b48c1e737cf025bfaaac7713`
- every replay transaction has one matching posted event
- event/effect rows prove bank, card, loan, udhari, goal, income, expense, and transfer accounting in paise integers

Direct SQL evidence:
- `D:\Claude\SparowVault\local-phase-05-logs\sql-financial-events-effects-check.json`
- `D:\Claude\SparowVault\local-phase-05-logs\sql-financial-events-effects-check.log`

Focused accounting gate condition:
- no double-counting in aggregate totals: PASS
- credit-card purchases increase expense and card liability without bank decrease: PASS
- credit-card bill payment decreases bank and card liability without new expense: PASS
- card refund reduces liability and contra-expense without income: PASS
- full EMI splits bank outflow, principal reduction, and interest expense: PASS
- partial EMI remains partial with pending amount and split effects: PASS
- udhari given is receivable, not expense: PASS
- udhari received is payable, not income: PASS
- udhari settlements clear receivable/payable without income/expense: PASS

Focused gate evidence:
- `D:\Claude\SparowVault\local-phase-05-logs\accounting-gate-condition-check.json`

## Existing SQL Warnings

`npm run check:sql` exited successfully but still reports pre-existing warnings in older/generated SQL dumps:
- some rollback/hosting SQL files intentionally contain `DROP TABLE`
- some older SQL dumps contain `ALTER TABLE` without idempotent guards

These warnings were not introduced in Phase 5 and did not affect the replay.

## What Was Fixed

Restored Dexie mirroring for SQL-backed repositories:
- remote create now mirrors created rows into Dexie
- remote list now refreshes that user’s local table rows
- remote get/update now mirrors returned rows
- remote soft delete mirrors deleted row state
- remote bulk update mirrors returned rows
- remote bulk soft delete marks existing local rows deleted

## Remaining Risks

- The replay is automated, not a human click-by-click run through every form field.
- Credit-card refund currently requires `accountId` at the API validation layer even though the ledger does not move bank cash for a card refund. The replay tagged the bank account to satisfy validation, and ledger effects still correctly avoided a bank movement. This should be cleaned up in a later UI/API consistency pass.
- Suggestions UI was verified to render with card/risk text. The replay did not freeze the UI exactly at the scenario-C 84% state because subsequent scenarios intentionally reduced the card liability to `66%`.
- Reports page rendering was verified; a full CA workbook export reconciliation is outside this local Phase 5 replay.

## Rollback Plan

If rollback is required:
1. Revert `D:\Claude\SparowVault\src\repositories\baseRepo.ts` to the previous SQL-only no-Dexie-mirror behavior.
2. Delete `D:\Claude\SparowVault\scripts\local-phase-05-manual-finance-replay.mjs`.
3. Delete `D:\Claude\SparowVault\LOCAL_PHASE_05_MANUAL_FINANCE_REPLAY_REPORT.md`.
4. Delete generated evidence folder `D:\Claude\SparowVault\local-phase-05-logs`.

Rollback risk: reverting `BaseRepo` would again break the required Dexie/local-state proof for SQL-backed finance collections.

## Final Phase Status

PASS

Local Phase 5 is complete at local level. Finance replay A–O passed through SQL sync rows, financial events, financial effects, aggregate accounting, dashboard/reports/suggestions rendering, and Dexie mirror verification.
