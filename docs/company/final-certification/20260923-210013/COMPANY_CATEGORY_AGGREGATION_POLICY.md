# Company Category Aggregation Policy

**Status:** Normative (required for report honesty)  
**Date:** 2026-09-23

## Concepts (must not be confused)

### 1. Category breakdown view (multi-membership allowed)

A party may belong to multiple categories at once (e.g. Farmers + Lenders + VIP).

When a report shows **each category independently**, the same underlying voucher/ledger effect may appear under more than one category label.

Therefore:

```text
Farmers subtotal + Lenders subtotal
```

is **not** a company grand total.

### 2. Unique company total (deduplicated)

Company-level totals (TB, P&L, BS, Day Book, Dashboard KPIs, AR/AP) MUST be computed from **unique voucher lines / unique economic effects**, never from `SUM(category_subtotals)` when multi-membership exists.

## Rules

| View | Aggregation |
|------|-------------|
| Single category filter | Include parties in that category (union of their transactions) |
| Multi-category filter (OR) | Union of parties; **dedupe vouchers** |
| Multi-category filter (AND) | Intersection of parties |
| Category breakdown table | Per-category subtotals may overlap |
| Grand total / company total | Unique voucher/line set only |

## Example

Parties:

- Ramesh: Farmers + Lenders  
- Suresh: Farmers  

Transactions:

- Ramesh ₹1,00,000  
- Suresh ₹2,00,000  

| Slice | Amount |
|-------|--------|
| Farmers category subtotal | ₹3,00,000 |
| Lenders category subtotal | ₹1,00,000 |
| **Unique company total** | **₹3,00,000** |

UI MUST NOT claim ₹4,00,000 as company total.

## Implementation guidance

- Prefer filtering party IDs first, then aggregating posted lines once.
- Never sum pre-computed category buckets for company KPIs.
- Label overlapping breakdowns: “Category subtotals may overlap when parties have multiple memberships.”

## Tests

See `src/company/services/__tests__/categoryAggregation.test.ts`.
