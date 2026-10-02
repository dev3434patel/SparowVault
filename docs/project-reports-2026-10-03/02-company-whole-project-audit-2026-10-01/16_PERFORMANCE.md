# 16 — Performance

Interactive latency on company `d4f5ea56-e4fa-4070-8033-05c07939826d` (3 samples, no warmup): all eight endpoints **PASS**, p95 ≤ 47ms (`raw/EVIDENCE_LATENCY.txt`).

Formal 10-company × 10k voucher matrix: **PASS** (`raw/EVIDENCE_100K.txt`, exit 0, line `PERF 100K MATRIX PASS`). Printed summary: 10 companies, 100,000 vouchers, 350,000 lines, 50,000 parties, 50,000 bills, 0 errors, elapsed 2678.267s. Each company trial balance was debit = credit = 854,824 paise (the script exits on imbalance; it does not print a separate “TB balanced” line). Line top-up then reached 500,000 lines (`passLines=true`, top-up company `4646b236-cfcd-4436-b296-50bb5977fd6a`). All four report budgets passed on every company.

**Status: PASS interactive / PASS 100k**
