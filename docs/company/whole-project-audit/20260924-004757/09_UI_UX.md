# 09 — UI / UX

## What exists

Company-specific chrome: `PageHeader`, `SectionCard`, `EmptyState`, `ErrorState`, `StatusBadge`, `ActionTile`, `KpiCard`, `CompanyMoney`, plus shared `Button`/`Input`/`Card`/`Tabs`/`Sheet`.

## Visual hierarchy

Dashboard (mobile evidence `screens/02-dashboard-mobile.png`):
1. Company + FY context in header — good
2. Quick action grid first — actionability strong
3. KPI liquid/performance sections
4. Needs Attention / charts / recent

Dense but purposeful for accounting. Not card-overloaded on empty company.

## Premium feel

| Criterion | Verdict |
|-----------|---------|
| Polish | PARTIAL — dark consistent; cert company names ugly in real UX |
| Trust | PASS — money in paise, purpose hints (“Profit: No change”) |
| Clarity | PASS on quick flows; FAIL on categories/voucher-new |
| Consistency | PARTIAL — UsersPage mega-file mixes 5 screens |
| Modernity | PASS relative to legacy Tally-like UIs |

## Empty / loading / error

Empty states observed on Parties, Receivables, Approvals, Vouchers — useful copy. Loading: store hydrate “Loading…”. ErrorState component exists. 403 page-level messaging: **PARTIAL** (permission hide more than reason banners).

## Issues

1. Categories master misroute (P1)
2. Voucher-new dead-end (P1)
3. Export success shows raw JSON truncate (P2)
4. Approvals queue thin — limited financial impact summary (P2)
5. Dark-only company portal — no light mode (NOT APPLICABLE unless required)

## UI/UX score

Visibility 8 · Clarity 7 · Actionability 8 · Hierarchy 7 · Premium 7 · Mobile 8  

**Overall UI/UX: PARTIAL** (core strong; two navigation defects)
