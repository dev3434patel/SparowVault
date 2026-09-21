# R5 — Goal funding integration (partial)

Date: 2026-09-22  
Finding: F-ST-16-GOAL

## Delivered

- Goals contribute dialog exposes explicit modes: **earmark** vs **funded_transfer**.
- Earmark uses `goalEarmarkEffect` and updates goal/contribution only (no cash transfer).
- Funded transfer posts one `transactionRepo` transfer between distinct accounts, links contribution `transactionId`, uses `fundedGoalTransferEffect` (net worth delta 0).

## Remaining

- Server-side mode validation on goal contribution entity API.
- Second-device / report golden for bank balances + net worth.
- Legacy ambiguous contribution review queue.

Status: **PARTIAL** — UI→repo path wired; not full FIXED_VERIFIED.
