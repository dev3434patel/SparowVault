# Company Final Defect Register

**Run:** `20260923-210013`

## P0

**0 open.**

## P1 correctness

**0 open.**

AUD-006 (voucher sequence string-sort failure after 9999) discovered during scale work and **fixed** (numeric `MAX(sequence)` + 8-digit pad). Regression: 10k vouchers/company + post-10000 numbering; 100k matrix PASS.

## P2 / non-correctness

| ID | Item | Notes |
|----|------|-------|
| P2-EXP-FIDELITY | Branded PDF/DOCX multi-page visual golden QA | Export surface + escape PASS; pixel/page-break gallery not fully automated |
| P2-BROWSER-DEPTH | Some A–N journeys are UI+API smoke depth | Bill partial-settle / restricted-operator UX / period-lock deny not every sub-step exercised in Playwright (server covered by PHP/IDOR/gates) |
| P2-WORKSPACE-GET | Occasional `workspace.php` 404 in SPA hydrate race | Workspace row exists; list/create/post paths worked; investigate hydrate race (not TB/BS correctness) |
| P2-PERF-LATENCY | Interactive latency budgets | 100k matrix correct & complete; per-endpoint p95 thresholds not product-gated in this run |

No P2 item above is a hidden P0/P1 accounting or tenant-isolation defect.
