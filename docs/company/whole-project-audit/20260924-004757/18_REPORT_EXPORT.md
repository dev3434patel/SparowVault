# 18 — Reports & Exports

## Report registry vs PHP

| Key | Registry | PHP | UI | Verdict |
|-----|----------|-----|-----|---------|
| trial-balance | enabled | yes | Ready | PASS |
| profit-loss | enabled | yes | Ready | PASS |
| balance-sheet | enabled | yes | Ready | PASS |
| day-book | enabled | yes | Ready | PASS |
| cash-bank-book | enabled | yes | needs ledgerId | PASS |
| party-statement | enabled | yes | from party | PASS |
| ageing / receivables / payables | enabled (+aliases) | ageing | Ready | PASS |
| project/business/area/category/user-activity | disabled | no | FUTURE | FUTURE |

PHP does not load registry file — hard-coded dispatch. **PARTIAL** architecture.

## Export fidelity this run

PDF/DOCX/XLSX short + 1000-row + empty PDF: **PASS** (`EVIDENCE_EXPORT_FIDELITY.txt`).

Filter fidelity UI=export: **PARTIAL** (smoke; not every filter combo).

## Charts

Dashboard Recharts for cash flow / ageing — sourced from report APIs when data exists. Empty states honest. **PASS** (no decorative fake charts observed).

**Reports/Exports: PASS core / PARTIAL registry architecture**
