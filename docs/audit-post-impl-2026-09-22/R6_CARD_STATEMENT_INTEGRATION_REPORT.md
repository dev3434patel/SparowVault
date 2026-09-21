# R6 — Credit-card document path

Date: 2026-09-22  
Finding: F-ST-13-CARD

## Delivered

- Deposit parser continues to reject credit-card headings.
- Separate route: `POST /api/import/statement-card.php` (`statement-card-v1`).
- Liability equation: `closing = previous + increases − decreases` (no invented running balances).
- Purchases/interest post as credit-card expenses; payment credits must match existing bank `cc_payment` (no second repayment).
- Live API: synthetic 1000+500+20−800−100=620 fixture PASS; `CARD_LIABILITY_MISMATCH` on bad closing.
- `importSources` + `reconciliationMatches` written for card imports.

## Remaining / blockers

- Authorized issuer samples + holdout (evidence blocker for LAYOUT_VERIFIED).
- Dedicated card import UI wizard (API path complete; deposit UI still rejects).

Status: **PARTIAL_VERIFIED_SYNTHETIC** — software path proven; real layouts BLOCKED.
