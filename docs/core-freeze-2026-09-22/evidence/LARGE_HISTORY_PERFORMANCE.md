# Large-history performance evidence

## Synthetic 50k engine loop (`scripts/finance-load-test.mjs`)

```json
{
  "transactions": 50000,
  "ms": 4,
  "perSec": 13475999,
  "status": "PASS"
}
```

Thresholds: must finish &lt; 30s and &gt; 5k ops/sec — **PASS**.

## Scope honesty

This certifies **engine throughput / numeric stability** for 50k synthetic movements (income, expense, card liability, transfers).

It does **not** claim browser FPS for a hydrated Dexie profile of 50k rows. Browser UI large-history soak remains a recommended production validation item if real users exceed ~10k–20k local rows.

## Prior packaged evidence

Also see `EVIDENCE_FINAL_PERF_50K.txt` from finance-vnext evidence-final pack (copied into this folder).
