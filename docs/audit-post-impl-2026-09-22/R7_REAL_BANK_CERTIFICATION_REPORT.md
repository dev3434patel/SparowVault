# R7 — Real bank corpus and layout certification

Date: 2026-09-22  
Finding: F-BANK-20

## Current truthful registry

| Status | Count | Banks (examples) |
|--------|-------|------------------|
| synthetic-tested | 5 | Kotak, HDFC, SBI, Axis, IndusInd |
| registered | 15 | ICICI + Waves B–D |
| verified-for-scope | 0 | — |

## Gate

`npm run statements:gate:strict` exits **nonzero** while verified-for-scope is 0 — correct enforcement (scorecard generation may still exit 0 with `blocked: true`).

## Program (parallel with software remediations)

1. Collect owner-authorized samples for Wave A first (Kotak, HDFC, SBI, ICICI, Axis).
2. Keep private PDFs/passwords out of Git, logs, and packages.
3. Annotate independent goldens (not parser output).
4. Split development / validation / holdout by account family.
5. Promote only exact bank/product/channel/layout/language/mode scopes with fresh evidence.

Status: **BLOCKED** for the 20-bank claim. Software readiness may advance without closing this finding.
