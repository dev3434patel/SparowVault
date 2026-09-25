# Company Responsive & Accessibility Report

## Breakpoints exercised

| Width | Surface | Evidence |
|------:|---------|----------|
| 1440 | Dashboard, receivables, settings, approvals, + New | deep-browser screens |
| 430 | Mobile dashboard + bottom nav Add/More | `09-mobile-dashboard.png` |

## Patterns

- Mobile bottom nav: Home / Parties / Add / Bills / More (task-focused)
- Tables: horizontal scroll retained; parties/receivables use essential columns + actions
- Amounts: `CompanyMoney` / tabular-nums — no truncation of ₹ values in KPI cards
- Status: textual `StatusBadge` (not color-only)
- Charts: paired with table/list summaries; tooltips present

## Accessibility notes

- KPI cards keyboard-activatable when drilldown present
- + New menu uses `role="menu"` / `menuitem`
- Period lock / export errors mapped to human copy where possible

## Verdict

**RESPONSIVE/A11Y PASS** for core product surfaces in this run (smoke depth). Full WCAG audit remains optional P2.
