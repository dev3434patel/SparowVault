# Goal / card product E2E

## Goal monetary fixtures

```json
{
  "earmark": {
    "A": 1000000,
    "B": 0,
    "totalAssets": 1000000,
    "allocation": 200000
  },
  "fundedTransfer": {
    "A": 800000,
    "B": 200000,
    "totalAssets": 1000000
  },
  "pass": true
}
```

Earmark does not move cash or change net worth. Funded transfer moves cash A→B with NW unchanged.

## Card PDF product path

Synthetic API path remains covered by `test:statements` / statement-api-checks.
**UI→PDF→card-parser→API** browser path: NOT_RUN in this delta (no dedicated card wizard UI).
Real issuer holdouts: BLOCKED.

## Monthly bank vs economic

Unresolved weak suggestions do not change bank debit/credit totals (100000/500000 paise preserved).
