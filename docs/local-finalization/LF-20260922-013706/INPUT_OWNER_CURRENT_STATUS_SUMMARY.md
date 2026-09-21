# Current status summary

**Verdict:** Software repair path largely **LIVE_VERIFIED** for statement integrity; bank scope remains **`BLOCKED_FOR_20_BANK_CLAIM`**.

## One-line truth

Completeness, importSources, confirmed matches, card liability import (synthetic), and goal funding modes now run through real API/product paths with disposable-DB evidence — **0 layouts are `verified-for-scope`**.

## Snapshot

| Metric | Value |
|--------|-------|
| Target banks | 20 |
| `verified-for-scope` | 0 |
| `synthetic-tested` | 5 |
| `registered` | 15 |
| Statement unit tests | 85/85 PASS |
| `npm run test:statements` | **exit 0** (incl. omit-pair, importSources, matches, card route, goal contrib, backup restore) |
| `statements:gate:strict` | exit 1 (expected — 0 verified layouts) |
| `statements:certify` | exit 0 with `blocked: true` |
| Hosted release | NOT_TESTED |

## Finding status (software vs bank)

| Track | Status |
|-------|--------|
| F-ST-05-WIRE completeness | FIXED_VERIFIED_LIVE_API |
| F-ST-11-SOURCE / F-ST-10-MATCH | FIXED_VERIFIED_LIVE_API (persist); second-browser sync still recommended |
| F-ST-13-CARD | PARTIAL_VERIFIED_SYNTHETIC — deposit reject kept; separate card API; real samples BLOCKED |
| F-ST-16-GOAL | PARTIAL_VERIFIED — UI + server fundingMode validation |
| F-ST-03/08/09 review/OCR/edit | PARTIAL_VERIFIED — field editors + digest invalidation unit; full DPI browser matrix open |
| F-BANK-20 | BLOCKED |
| F-ENV-API | FIXED_VERIFIED (live suites + backup) |

## Do / Don't

**Do** collect authorized Wave A samples for R7 while using the repaired local pipeline.  
**Don't** claim 20-bank accuracy or `verified-for-scope` from synthetic evidence.
