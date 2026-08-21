# Household Finance Model (vNext Phase G)

Households consolidate member transactions without double-counting internal transfers.

- **Scope:** `personal` | `household` | `business` | `mixed` on transactions (future persisted field).
- **Roles:** `owner`, `partner`, `viewer` on `HouseholdMember`.
- **Joint accounts:** `Account` ownership flags (future).
- **Consolidated KPIs:** `HouseholdDashboardPage` uses `financeKpiEngine` — family transfers between members net to zero when both legs are household-scoped.

See `src/types/index.ts` for `Household`, `HouseholdMember`, `HouseholdPermission`.
