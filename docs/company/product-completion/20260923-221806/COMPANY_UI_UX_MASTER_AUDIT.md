# Company UI/UX Master Audit

**Run:** see `docs/company/product-completion/.current-run`  
**Scope:** Product completeness (accounting core frozen)

## Navigation (pre → post)

| Surface | Current (pre) | Useful? | Visible? | Understandable? | Clickable? | Drilldown? | Mobile? | Problem | Fix |
|---------|---------------|--------:|--------:|----------------:|----------:|----------:|-------:|---------|-----|
| Sidebar groups | Overview/Masters/Books/Quick/Outstanding/Insights/Admin | Y | Y | Partial | Y | N/A | Sheet flat | Module-oriented | Task groups: Money/Parties/Books/Business/Insights/Control |
| Header company | Display name only | Y | Y | Partial | Switch only | N | Y | No FY | Show FY + + New + search + approvals badge |
| Mobile bottom nav | Home/Parties/In/Out/Books | Y | Y | Partial | Y | N | Y | No Bills/+ sheet | Home/Parties/Add/Bills/More |
| Dashboard KPIs | 6 cards, no click | Y | Y | Partial | N | N | Squeeze | No drilldown; money≠income | Control center with period, attention, charts |
| Recent activity | Not clickable | Y | Y | Y | N | N | Y | Dead list | Link to voucher detail |
| Quick Received/Paid | Save & post | Y | Y | Partial | Y | Preview | Y | Generic CTA | Record Receipt/Payment + success actions |
| Parties table | Name/roles/mobile | Y | Y | Y | Row | N | Cards | No row actions | View/Receive/Pay |
| Receivables | Ageing + allocate | Y | Y | Y | Allocate | N | Scroll | Weak totals | KPI strip + remaining confirm |
| Reports hub | Flat grid | Y | Y | Partial | Y | N | Y | No grouping | Accounting/Parties/Management |
| Export | Button cluster | Y | Y | Partial | Y | N | Y | No format explain | Format cards + backup note |
| Approvals | List | Y | Y | Y | Approve/Reject | N | Y | Thin | Kept; deep browser covers reachability |
| Settings locks | Period lock form | Y | Y | Y | Y | N | Y | OK | Kept |
| workspace.php get | 404 after create | N | — | — | — | — | — | Assert company_id on workspace | Fixed id-assert + store race |

## Core screens inventory

Pages under `src/company/pages/` audited: Dashboard, Parties, PartyDetail, Ledgers, Vouchers, Quick*, Receivables/Payables, Reports, Masters, Users/Settings/Audit/Export/Search, Approvals, Login/Select/Create.

No production stub routes remain (`PlaceholderPage` unused).

## Screenshot inventory

Captured under `screens/company-product-audit/` and `screens/deep-browser/` during product certify / deep browser runs (desktop + 430 mobile).
