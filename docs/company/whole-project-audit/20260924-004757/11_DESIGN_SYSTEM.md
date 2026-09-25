# 11 — Design System

## Company primitives

| Primitive | File | Status |
|-----------|------|--------|
| PageHeader / SectionCard / Empty / Error / StatusBadge / ActionTile | `components/PageChrome.tsx` | LIVE |
| CompanyMoney | `CompanyMoney.tsx` | LIVE — Indian grouping via shared money utils |
| KpiCard | `KpiCard.tsx` | LIVE |
| NewActionMenu | `NewActionMenu.tsx` | LIVE |

## Shared UI

`@/components/ui/*` Button, Input, Card, Field, Tabs, Badge, Sheet.

## Consistency

| Token | Observation |
|-------|-------------|
| Radius | Rounded cards consistent on dashboard |
| Spacing | Generally tight accounting density |
| Icons | lucide mixed; acceptable |
| Status badges | Stringly StatusBadge heuristics — PARTIAL type safety |
| Amounts | Semantic green/red on CompanyMoney |

## Gaps

No dedicated DataTable primitive — tables reinvented per page.  
No Skeleton primitive usage on Dashboard fan-out — loading is coarse.

**Design system: PARTIAL** — adequate product kit, not a full DS.
