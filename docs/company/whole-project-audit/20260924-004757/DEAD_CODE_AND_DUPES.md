# Dead Code & Duplicate Logic (static)

## Dead / orphan

| Item | Path | Note |
|------|------|------|
| PlaceholderPage | `src/company/pages/PlaceholderPage.tsx` | ORPHAN |
| reportEngine runtime | `services/reportEngine.ts` | tests only |
| invariants runtime | `services/invariants.ts` | tests only |
| flattenCoaSeedLedgers | `coaSeed.ts` | unused export |
| gate-accounting.mjs | `scripts/company/` | not wired to npm gate:accounting |
| Duplicate APIs | workspace-item, workspace-create, party-create | redundant |

## Unused schema (FUTURE)

documents, recurring_rules, cross_domain_links, org_subscriptions, party_tags*, voucher_cost_allocations, groups*

## Duplicate logic

See `SOT_MATRIX.md` — purpose (JSON/PHP/FE), reports (PHP + FE test engine), balance (PHP + FE), COA seed (PHP + FE preview).
