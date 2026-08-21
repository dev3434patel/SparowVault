# Reconciliation & Provenance (vNext Phase I)

## Reconciliation center

`ReconciliationPage` surfaces:

1. Orphan transactions (missing category, card, or transfer leg)
2. Transfer auto-match suggestions (`reconciliationEngine.suggestTransferMatches`)
3. Account inventory for balance checks

## Provenance fields (Transaction)

Planned optional fields: `source`, `sourceReference`, `importBatchId`, `sourceHash`.

## Sync outbox

`syncOutbox.ts` tracks `pending | syncing | synced | conflict | failed` for offline saves.
