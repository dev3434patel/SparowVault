# LOCAL PHASE 4 — SYNC AND HOT FIELD VERIFICATION REPORT

Generated: 2026-05-21 23:51 IST

Final status: PASS

## Scope

Goal: verify every new transaction writes correct `cloud_collection_rows` hot fields in MySQL.
Additional gate: verify no user-owned sync leakage exists.

Runtime under test:
- Backend: `http://localhost:5000`
- Database: `sparowvault_local_cert`
- Charset: `utf8mb4`
- Write path: authenticated `POST /api/data/entity.php?collection=...`
- Verification query: direct MySQL query against `cloud_collection_rows`

## What Was Checked

One test user was created:
- Username: `phase4_mpftfcbg`
- User ID: `cu_0f1e9c9e528c34e8e9f6db87`

Fixture entities were created through API before transaction writes:
- Bank account A: `acc_phase4_bank_a_mpftfcbg`
- Bank account B: `acc_phase4_bank_b_mpftfcbg`
- Credit card: `crd_phase4_hdfc_mpftfcbg`
- Loan: `lon_phase4_home_mpftfcbg`
- Goal: `gol_phase4_emergency_mpftfcbg`
- Udhari person/record: `udh_phase4_rahul_mpftfcbg`
- Expense categories: `cat_phase4_food_mpftfcbg`, `cat_phase4_grocery_mpftfcbg`

Transaction scenarios checked:
1. UPI expense
2. Credit-card expense
3. Credit-card payment
4. EMI payment
5. Udhari given
6. Goal contribution
7. Transfer

## SQL Query Used

```sql
SELECT collection_name, entity_id, amount_paise, txn_local_date, txn_month,
       txn_type, payment_mode, category_id, account_id, card_id, loan_id,
       goal_id, udhari_id, business_or_personal
FROM cloud_collection_rows
WHERE user_id = '<test_user_id>'
  AND collection_name = 'transactions'
ORDER BY updated_at DESC
LIMIT 20;
```

## Results

| Scenario | Entity ID | Result |
|---|---|---:|
| UPI expense | `txn_phase4_upi_expense_mpftfcbg` | PASS |
| Credit-card expense | `txn_phase4_cc_expense_mpftfcbg` | PASS |
| Credit-card payment | `txn_phase4_cc_payment_mpftfcbg` | PASS |
| EMI payment | `txn_phase4_emi_payment_mpftfcbg` | PASS |
| Udhari given | `txn_phase4_udhari_given_mpftfcbg` | PASS |
| Goal contribution | `txn_phase4_goal_contribution_mpftfcbg` | PASS |
| Transfer | `txn_phase4_transfer_mpftfcbg` | PASS |

## Hot Field Evidence

Final query evidence is stored at:

- `D:\Claude\SparowVault\local-phase-04-logs\sync-hot-fields-results.json`
- `D:\Claude\SparowVault\local-phase-04-logs\sync-hot-fields.run.log`

Summary of verified hot fields:

| Entity ID | amount_paise | txn_month | txn_type | payment_mode | Required linkage |
|---|---:|---|---|---|---|
| `txn_phase4_upi_expense_mpftfcbg` | `45000` | `2026-05` | `expense` | `upi` | `category_id`, `account_id` populated |
| `txn_phase4_cc_expense_mpftfcbg` | `45000` | `2026-05` | `expense` | `credit_card` | `category_id`, `card_id` populated |
| `txn_phase4_cc_payment_mpftfcbg` | `45000` | `2026-05` | `cc_payment` | `bank_transfer` | `account_id`, `card_id` populated |
| `txn_phase4_emi_payment_mpftfcbg` | `1000000` | `2026-05` | `emi_payment` | `auto_debit` | `account_id`, `loan_id` populated |
| `txn_phase4_udhari_given_mpftfcbg` | `100000` | `2026-05` | `udhari_given` | `upi` | `account_id`, `udhari_id` populated |
| `txn_phase4_goal_contribution_mpftfcbg` | `200000` | `2026-05` | `savings_contribution` | `bank_transfer` | `account_id`, `goal_id` populated |
| `txn_phase4_transfer_mpftfcbg` | `500000` | `2026-05` | `transfer` | `bank_transfer` | `account_id` populated |

All rows also had:
- `collection_name='transactions'`
- `entity_id` populated
- `amount_paise` populated
- `txn_local_date` populated
- `txn_month` populated
- `txn_type` populated
- `payment_mode` populated
- `business_or_personal='personal'`

Note: PowerShell renders MySQL `DATE` values as ISO timestamps in the JSON/log output. The stored date value is populated and month extraction is correct as `2026-05`.

## What Was Fixed

No product hot-field extraction code was changed in this phase.

The only implementation added was a repeatable local verifier:
- `D:\Claude\SparowVault\scripts\local-phase-04-sync-hot-fields.mjs`

This script creates the test user/fixtures, writes all required transactions, runs the required SQL query after each write, and fails if required hot fields are missing.

## Files Changed

- `D:\Claude\SparowVault\scripts\local-phase-04-sync-hot-fields.mjs`
- `D:\Claude\SparowVault\LOCAL_PHASE_04_SYNC_HOT_FIELDS_REPORT.md`

## Commands Run

| Command | Result |
|---|---:|
| `node scripts/local-phase-04-sync-hot-fields.mjs` | PASS |
| `npm run lint` | PASS |
| `npm run check:sql` | PASS with existing static warnings |

## SQL Checks Done

The verifier connected to:
- `DATABASE() = sparowvault_local_cert`
- `@@character_set_database = utf8mb4`

After each transaction insert, the verifier ran the required `cloud_collection_rows` query and validated scenario-specific required hot fields.

## User-Owned Sync Isolation Check

Additional evidence:

- `D:\Claude\SparowVault\local-phase-04-logs\user-owned-sync-isolation.json`
- `D:\Claude\SparowVault\local-phase-04-logs\user-owned-sync-isolation.log`

Isolation checks performed:

| Check | Expected | Result |
|---|---|---:|
| Second authenticated user requested Phase 4 user's transactions | `200` with `0` rows | PASS |
| Second authenticated user attempted write with Phase 4 `userId` | `403 USER_MISMATCH` | PASS |
| SQL check for inserted leak-attempt row | no row exists | PASS |
| SQL check for transaction payload `userId` not matching row `user_id` | no rows | PASS |

Isolation result details:
- Target user: `cu_0f1e9c9e528c34e8e9f6db87`
- Other user: `cu_8a3dc89c092e4a956c9b93e1`
- Cross-user read row count: `0`
- Mismatched write status: `403`
- Mismatched write code: `USER_MISMATCH`

## Existing SQL Warnings

`npm run check:sql` exited successfully but reported existing static warnings in legacy/generated SQL files:
- rollback/hosting SQL files contain intentional `DROP TABLE`
- some older schema dumps contain `ALTER TABLE` without idempotent guards

These warnings are not new Phase 4 failures and did not affect the local hot-field verification.

## Screenshots / Logs Required

No browser screenshots were required for this SQL/API phase.

Logs/evidence:
- `D:\Claude\SparowVault\local-phase-04-logs\sync-hot-fields-results.json`
- `D:\Claude\SparowVault\local-phase-04-logs\sync-hot-fields.run.log`
- `D:\Claude\SparowVault\local-phase-04-logs\user-owned-sync-isolation.json`
- `D:\Claude\SparowVault\local-phase-04-logs\user-owned-sync-isolation.log`

## Remaining Risks

- This phase verifies hot-field extraction for new transaction writes through the local API path. It does not certify hosted/staging DB behavior.
- `toAccountId` for transfer is stored in payload but does not have a dedicated `to_account_id` hot column in the current selected query. The requested `account_id` hot field is populated for the source account.
- Credit-card expense intentionally has no `account_id` because a card purchase must not reduce bank balance; `card_id` is populated.

## Rollback Plan

If this phase artifact needs to be removed:
1. Delete `D:\Claude\SparowVault\scripts\local-phase-04-sync-hot-fields.mjs`.
2. Delete `D:\Claude\SparowVault\LOCAL_PHASE_04_SYNC_HOT_FIELDS_REPORT.md`.
3. Optionally delete the generated local evidence folder `D:\Claude\SparowVault\local-phase-04-logs`.

No production/app hot-field code was changed in this phase.

## Final Phase Status

PASS

All seven required transaction scenarios wrote populated MySQL hot fields in `cloud_collection_rows`, including scenario-specific account/card/loan/goal/udhari references where applicable. Cross-user sync read/write isolation also passed with no user-owned data leakage found.
