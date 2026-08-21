# SparowVault Sync Contract Registry

Date: 2026-05-14

## Source of Truth

- Canonical TypeScript registry: `src/config/syncContracts.ts`
- Generated backend artifact: `src/config/syncContracts.generated.json`
- PHP allowlist source: `php/helpers/cloud_payload.php` reads `syncContracts.generated.json`
- Frontend cloud keys: `src/lib/cloud/collections.ts` imports from the registry
- Drift test: `tests/unit/phase-02-sync-contracts.test.ts`

Run this after changing sync contracts:

```bash
npm run sync:contracts
npm run test -- tests/unit/phase-02-sync-contracts.test.ts --reporter=basic
```

## Collections

| Domain collection | Dexie store | Server allowlist | Schema | Hot field behavior |
|---|---|---|---:|---|
| accounts | accounts | accounts | 1 | Extracts payload hash/source device; amount/account fields where applicable. |
| cards | cards | cards | 1 | Extracts card/account references and payload hash. |
| categories | categories | categories | 1 | Extracts category reference and payload hash. |
| transactions | transactions | transactions | 1 | Extracts all report hot fields: amount, date, month, type, mode, account/card/loan/goal/udhari/category, business/personal, source device, payload hash. |
| budgets | budgets | budgets | 1 | Extracts category and amount fields for budget reporting. |
| loans | loans | loans | 1 | Extracts loan/account/card references and principal/amount fields. |
| emiPayments | emiPayments | emis | 1 | Maps UI/Dexie `emiPayments` to existing server key `emis`. |
| udhari | udhari | udhari | 1 | Extracts udhari reference, dates, and amount. |
| udhariSettlements | udhariSettlements | udhariSettlements | 1 | Extracts udhari/account references and settlement amount. |
| investments | investments | investments | 1 | Extracts linked account and recurring amount. |
| savingsContributions | savingsContributions | savingsContribs | 1 | Maps UI/Dexie `savingsContributions` to server key `savingsContribs`. |
| goals | goals | goals | 1 | Extracts goal/account references and target/saved amount. |
| goalContributions | goalContributions | goalContribs | 1 | Maps UI/Dexie `goalContributions` to server key `goalContribs`. |
| reminders | reminders | reminders | 1 | Extracts due-date style date fields where applicable. |
| alerts | alerts | alerts | 1 | Metadata sync only plus payload hash/source device. |
| recurringRules | recurringRules | recurringRules | 1 | Extracts amount, transaction type, payment mode, category/account references. |
| attachments | attachments | attachments | 1 | Metadata only; binary files are not stored in sync rows. |
| auditLogs | auditLogs | auditLogs | 1 | User-owned client audit logs only. Admin audit logs are separate SQL tables. |
| snapshots | snapshots | snapshots | 1 | Deterministic derived snapshot values; no AI-generated numbers. |
| exportHistory | exportHistory | exportHistory | 1 | User-owned export history. |
| settings | settings | settings | 1 | One settings/profile row per user. |

## Backend Contract

`cloud_collection_allowlist()` no longer manually maintains a separate list. It loads the generated JSON contract and returns sorted `serverAllowlistName` values. If the JSON file is missing or invalid, the backend throws instead of silently accepting unknown collections.

The hosting packager copies `src/config/syncContracts.generated.json` to `php/config/syncContracts.generated.json` so hosted PHP can load the same contract without shipping TypeScript source.

## Hot-Field Extraction

Transaction writes through `cloud_sync_push`, `cloud_entity_create`, and entity update/delete paths use `cloud_ccr_compute_indexed()`.

Required transaction hot fields:

- `amount_paise`
- `txn_local_date`
- `txn_month`
- `txn_type`
- `payment_mode`
- `category_id`
- `account_id`
- `card_id`
- `loan_id`
- `goal_id`
- `udhari_id`
- `business_or_personal`
- `source_device_id`
- `payload_hash`
- `schema_version`

Not every reference field is mandatory for every transaction type. Example: a UPI expense must have account/category fields; a credit-card purchase should have card liability fields and may not have a cash account.

## Drift Test Coverage

`tests/unit/phase-02-sync-contracts.test.ts` verifies:

- generated JSON matches `src/config/syncContracts.ts`
- frontend `CLOUD_COLLECTIONS` derives from the contract
- PHP allowlist derives from the same generated JSON
- every contract maps to a Dexie store
- transaction hot fields are declared and exposed by backend SQL column list
- every Phase 2 required table exists in `SPAROWVAULT_FULL_DATABASE.sql`
- every PHP-referenced SQL table exists in full schema
- required report/sync indexes exist
- phase migration files are statically idempotent

## Manual DB Gate Result

Manual UPI expense inserted through `/api/cloud/sync/push.php` against `sparowvault_phase2_test`.

Latest transaction row:

```json
{
  "collection_name": "transactions",
  "amount_paise": 12345,
  "txn_local_date": "2026-05-14",
  "txn_month": "2026-05",
  "txn_type": "expense",
  "payment_mode": "upi",
  "account_id": "acc_phase2_mp5pc9c2",
  "category_id": "cat_phase2_mp5pc9c2",
  "card_id": null,
  "loan_id": null,
  "goal_id": null,
  "udhari_id": null
}
```

Result: PASS. Required UPI expense hot fields are populated.
