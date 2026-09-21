# Goal / card product E2E (delta)

## Card PDF product path

```json
{
  "runId": "LF-20260922-013706-DELTA-0210",
  "wiring": {
    "postsToCardApi": true,
    "doesNotUseDepositOnly": true,
    "hasCardDestinationSelect": true,
    "routesDocumentClass": true,
    "liabilityFixture": true
  },
  "liveApi": {
    "status": "PASS",
    "imported": 1,
    "cardId": "card_ui_87fe",
    "endpoint": "/api/import/statement-card.php"
  },
  "cardPdfProductPath": "PASS_UI_WIRED_AND_API",
  "note": "Browser PDF→wizard click-path still covered by deposit statement browser suite; card destination + separate API is the product separation under test here."
}
```
