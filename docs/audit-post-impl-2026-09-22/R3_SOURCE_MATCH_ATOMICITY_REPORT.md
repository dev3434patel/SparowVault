# R3 — Source and match persistence (partial)

Date: 2026-09-22  
Findings: F-ST-11-SOURCE, F-ST-10-MATCH

## Delivered

- Successful statement commit writes `importSources` (kind `manual`, notes JSON with documentHash, counts, completeness/arithmetic, evidence).
- Confirmed matches via `decision.matchTransactionId` and/or `confirmedMatches[]` write `reconciliationMatches` with status `confirmed` inside the same atomic write path.
- UI “Confirm match” wires proposals → exclude + matchTransactionId → commit payload.
- Live API: complete-evidence case asserts `importSourceId` and DB `importSources` row.

## Remaining

- Second-device sync browser pull assertion.
- Concurrent match / lost-response matrix expansion.
- Offline Dexie outbox pairing for statement match-only imports.

Status: **PARTIAL** — server persistence wired; sync/reload E2E incomplete.
