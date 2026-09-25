# 16 — Performance

## This-run evidence

| Check | Result | Artifact |
|-------|--------|----------|
| Interactive latency (7 samples) | PASS all budgets | `raw/EVIDENCE_LATENCY.txt` |
| workspaces p95 | 46ms / 800 | |
| parties p95 | 42ms / 1500 | |
| vouchers p95 | 41ms / 2000 | |
| trial-balance p95 | 73ms / 3000 | |
| Backup drill scale | 193,374 vouchers; 656,758 lines; TB balanced | `raw/EVIDENCE_BACKUP_RESTORE.txt` |
| gate performance | PASS (indexes + small generator) | gate-all |
| Multi-company 100k matrix | **NOT VERIFIED this stamp** | prior historical only |
| Bundle / lazy loading | NOT VERIFIED | |
| Frontend rerender profiling | NOT VERIFIED | |

## Interactive latency verdict

**PASS** on measured company for API interactive budgets.

## Scale correctness

Debit==Credit at ~193k vouchers in dump/restore checksum: **PASS** as scale integrity evidence.  
Formal `perf-100k-matrix.php` 10×10k: **NOT VERIFIED** in this audit run.

**Performance overall: PARTIAL** (interactive PASS; formal 100k matrix not re-run)
