# 17 — Testing

| Suite | Result |
|-------|--------|
| company:test | PASS 96 |
| company:test:php | PASS |
| company:gate:all | PASS 12/12 |
| finance:gate:all | PASS |
| IDOR | PASS |
| hydrate 100 | PASS |
| export fidelity | PASS |
| product browser | PASS 8/8 |
| viewport | PASS 168/168 |
| browser A–N | PASS A–N, including G reversed (`raw/EVIDENCE_BROWSER_AUTH.txt`, exit 0) |
| a11y keyboard | PASS 22/22 (exit 0) |
| a11y axe | PASS 10/10, serious/critical 0 (exit 0) |
| security matrix | PASS (exit 0) |
| certify:final orchestrator | NOT RUN as one process |
| certify:product orchestrator | NOT RUN as one process |
| 100k matrix | NOT VERIFIED |
| backup destroy/restore | NOT VERIFIED this stamp |

**Status: PARTIAL** — the three previously red suites are green. The single-process certifiers, 100k matrix, and backup destroy/restore were not re-run.
