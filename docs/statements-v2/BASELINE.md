# ST-00 Baseline — Statement Intelligence

| Field | Value |
|-------|--------|
| Phase | ST-00 |
| Branch | `feat/statement-intelligence-v2` |
| Date | 2026-09-21 |
| Status | PASS (baseline inventories; no statement-accuracy claim) |

## Reproduced facts

- Dexie store count from [`src/db/database.ts`](../../src/db/database.ts): **41** (not 40).
- Sync collections from [`src/config/syncContracts.ts`](../../src/config/syncContracts.ts): **37**.
- Local-only stores: `users`, `sessions`, `syncMutations`, `aiSuggestions`.
- Statement bank registry IDs: **38** (37 named + `other`); all **20 target** IDs are present.
- Dedicated layout special-case: Kotak numbered. Other banks share the geometric parser.
- PDF/password remain on-device; commit path is reviewed JSON only (`api/import/statement.php`).

## Inventories

- [`SCHEMA_AND_SYNC_INVENTORY.json`](./SCHEMA_AND_SYNC_INVENTORY.json)
- [`COMMAND_MANIFEST.json`](./COMMAND_MANIFEST.json)

Regenerate with: `node scripts/generate-statement-inventory.mjs`

## AppleDouble

No tracked `._*` artifacts found in the working tree at baseline. `.gitignore` already excludes `._*` / `**/._*`.

## Gate note

Historical PASS logs are not fresh proof. Re-run `typecheck`, `lint`, `test`, `test:statements`, `finance:gate:all`, `check:php`, `check:sql` on this branch after statement changes and record exit codes in phase reports.
