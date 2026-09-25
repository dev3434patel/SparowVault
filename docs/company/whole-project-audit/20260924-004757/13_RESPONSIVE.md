# 13 — Responsive

## Viewports tested this run

| Width | Method | Result |
|------:|--------|--------|
| ~390 mobile | MCP browser (bottom nav) | PASS — usable |
| 1440 | Auth Playwright context | PARTIAL (suite aborted early) |
| 320/768/1024 matrix | NOT VERIFIED exhaustive | |

## Observations

- Mobile bottom nav + center Add — strong thumb zone
- Tables on AR/AP empty — OK; dense tables on data-heavy companies **NOT VERIFIED**
- Dialogs/sheets used for mobile menu
- Amounts on KPI cards wrap acceptably in screenshot

## Verdict

**PARTIAL** — mobile shell good; full viewport matrix not exhaustive this run.
