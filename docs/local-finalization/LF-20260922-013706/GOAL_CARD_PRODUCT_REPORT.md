# Goal / card product report

## Goal funding

- UI modes: earmark vs funded_transfer (`GoalsPage.tsx`)
- Server: `cloud_validate_goal_contrib_payload`
- Effect helpers: `goalFunding.ts` (earmark: no NW/cash move; transfer: ±cash NW0)
- Live API checks remain in statement suite

## Card statement

- Route: `/api/import/statement-card.php`
- Synthetic liability arithmetic verified previously
- **No real issuer PDF holdouts** — synthetic only
- Deposit parser continues to reject card documents

## Residual

Real card-layout accuracy: BLOCKED on corpus. Dedicated card PDF wizard UI: not added (API path complete).
