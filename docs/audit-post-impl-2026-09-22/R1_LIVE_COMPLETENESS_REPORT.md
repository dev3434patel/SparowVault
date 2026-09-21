# R1 — Live completeness report

Date: 2026-09-22  
Finding: F-ST-05-WIRE  
Scope: LOCAL ONLY — analyze UI + PHP commit path

## Defect (evidence method)

Originally reported by code inspection: `statement_validate_completeness` existed but was not called from `statements_commit`. Live API suite was previously NOT_RUN. This phase reproduced and fixed the product path.

## Implementation

1. Extended reviewed-JSON contract with optional `sourceEvidence` (counts/totals/origin/scope).
2. UI (`StatementImportDialog`): runs `validateStatementCompleteness` on full source rows; incompleteness disables Import.
3. PHP `statements_commit`: recomputes arithmetic **and** completeness over **all** source rows before include/duplicate filtering; on mismatch throws `CloudWriteException` **422 / STATEMENT_COMPLETENESS_MISMATCH** with **no** transactions, effects, matches, or success receipt.
4. Missing evidence remains status `unknown` / UI “Unverified” — not PASS.
5. Also persists `importSources` on successful commit (supports F-ST-11-SOURCE).

## Live API regressions (`tests/statement-api-checks.mjs`)

| Case | Result |
|------|--------|
| Omitted offsetting pair (balances match, printed totals require 4 txs / ₹150 / ₹1,100) | **PASS** — 422 `STATEMENT_COMPLETENESS_MISMATCH`; financial_events unchanged |
| Complete 4-row fixture with matching evidence | **PASS** — imported 4; `importSources` row written |

All prior statement API checks also PASS in the same run.

## Trust boundary

On-device PDFs: server validates submitted JSON consistency and independent evidence fields — it cannot independently prove original bank PDF contents.

## Remaining

- Layout-required evidence registry enforcement per bank layout (partial).
- Browser UI assertion for disabled Import button under omit-pair (API enforced; UI logic wired).
- F-ST-03/08/09 correction path started in same pass; full R2 browser zoom/rotation suite pending.
