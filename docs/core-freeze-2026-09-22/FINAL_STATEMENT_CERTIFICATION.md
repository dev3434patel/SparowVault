# FINAL_STATEMENT_CERTIFICATION.md

## Software pipeline

**COMPLETE** — PDF on-device → parse → OCR → classify → reconcile → completeness → human review → digest → server validate → ledger.

## Privacy

PDF + password never leave the device. Reviewed JSON only.

## Local evidence (this freeze)

| Check | Result |
|-------|--------|
| `npm run statements:certify` | exit 0; 86 unit tests; `blocked: true` |
| `npm run test:statements` | exit 0 |
| `npm run statements:gate:strict` | exit **1 expected** — 0 verified-for-scope |
| Geometry / PDF.js / Apache / card UI | Prior DELTA-0222 PASS (referenced) |

## Layout accuracy honesty

```
38 recognized bank names
20 targeted layouts
5 synthetic-tested (kotak, hdfc, sbi, axis, indusind)
15 registered-only
0 verified-for-scope
```

**Correct public claim:** pipeline implemented, tested, financially guarded; layout accuracy certified only to evidence available per layout.

**Forbidden claim until holdouts:** every Indian bank PDF at perfect accuracy.
