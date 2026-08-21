# AI suggestion multi-device strategy (P2)

## Decision (locked for certification)

**Device-local suggestions.** `aiSuggestions` remains a **local Dexie collection** and is **not** part of `src/config/syncContracts.ts` cloud sync allowlist.

### Why

1. Suggestions are derived coach/UX state, not canonical financial history.
2. Syncing suggestion accept/dismiss across devices would create noisy conflict without changing ledger truth.
3. Deterministic money always comes from ledger engines (`financeEventBuilder` / KPI / card engines). AI never overrides amounts (`aiGuardrails`).

### What does sync

- Underlying entities that suggestions may reference (transactions, cards, obligations, etc.) sync normally.
- User financial mutations remain server-idempotent via `mutationId`.

### Explicit non-goals

- Do **not** add `aiSuggestions` to cloud sync without a dedicated conflict model and product RFC.
- Do **not** treat suggestion presence/absence as a finance-correctness signal.

### Status

| Item | Status |
|------|--------|
| Multi-device suggestion consistency | **N/A — intentionally device-local** |
| AI numerical guardrail | Covered by unit tests |
| Finance certification impact | None (not a money source of truth) |
