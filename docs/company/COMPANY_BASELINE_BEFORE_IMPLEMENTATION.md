# Company Baseline — Before Implementation

**Date:** 2026-09-23  
**Purpose:** Record SparowVault personal-finance health before `/company` work.

## Results

| Suite | Command | Result | Evidence |
|-------|---------|--------|----------|
| Typecheck | `npm run typecheck` | **PASS** (exit 0) | `evidence-baseline-typecheck.txt` |
| Finance gates | `npm run finance:gate:all` | **PASS** | `evidence-baseline-finance-gate-all.txt` |
| Statements strict | `npm run statements:gate:strict` | **FAIL** — `verified-for-scope layouts: 0` (pre-existing corpus gap; exit 1) | `evidence-baseline-statements-gate.txt` |
| Unit tests (baseline) | `npm run test` | **PASS** — 54 files (exit 0) | `evidence-baseline-vitest.txt` |
| API E2E | `npm run test:api` | Not fully re-run in this session; deferred | — |
| Browser E2E | `npm run test:browser` | Not fully re-run in this session; deferred | — |
| Health full | `npm run health` | Deferred; typecheck + finance + vitest green; statements strict red | — |

## Isolation commitment

Company implementation uses `company_*` tables and `/company` shell only. Personal `financial_events` / collections untouched as SoT.

## Post-implementation re-check

| Suite | Result |
|-------|--------|
| `npx tsc --noEmit` | PASS |
| `vitest run src/company/services/__tests__` | PASS (29) |
| `npm run finance:gate:all` | Re-run after impl — see GATE evidence |
| `npm run company:gate:all` | See `evidence/GATE_ALL.md` |
