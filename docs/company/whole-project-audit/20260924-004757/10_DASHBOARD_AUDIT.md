# 10 — Dashboard Audit

## Objective

Dashboard is the daily control center: period context, quick actions, liquid KPIs, P&L KPIs, attention, ageing, top parties, recent vouchers.

## Evidence

- Product browser: `PASS DASH Dashboard control center widgets`
- Live crawl: action tiles + KPI labels + empty “Start Your Books”
- Screenshot: `screens/02-dashboard-mobile.png`

## KPI semantics (code + labels)

| KPI | Meaning | Confusion risk | Drill |
|-----|---------|----------------|-------|
| Cash & Bank | Liquid ledgers | Low | PASS → ledgers cashBank |
| Total Receivable | Open AR bills | Low | → receivables |
| Total Payable | Open AP bills | Low | → payables |
| Net party position | AR−AP style | Medium — not profit | labeled |
| Money Received / Paid | Cash movement | Medium vs income/expense | period |
| Income / Expenses / Net Profit | P&L | Low if labels read | reports |

Category overlap warning visible on dashboard: **PASS** policy visibility.

## Role personalisation

Same dashboard for all roles; permissions hide actions. **PARTIAL** — no role-specific layouts.

## Dashboard scorecard

| Dimension | /10 |
|-----------|----:|
| Visibility | 9 |
| Clarity | 8 |
| Actionability | 9 |
| Information hierarchy | 8 |
| Drilldown | 8 |
| Mobile | 8 |
| Premium feel | 7 |

**Verdict: PASS** as entry point for empty and active books.
