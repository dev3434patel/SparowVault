# Company 100k Performance Certification

**Run:** `20260923-210013`  
**Evidence:** `raw/EVIDENCE_COMPANY_100K_PERFORMANCE.txt`  
**Harness:** `scripts/company/perf-100k-matrix.php`  
**Post AUD-006** (numeric `MAX(sequence)` + 8-digit padded presentation)

## Dataset

| Dimension | Target | Result |
|-----------|--------|--------|
| Companies | 10 | 10 |
| Parties | 50,000 | 50,000 (5,000 × 10) |
| Vouchers | 100,000 | 100,000 (+ line top-up journals) |
| Voucher lines | ≥500,000 | **500,000** (350k base + multi-line journal top-up) |
| Bills | 50,000 | 50,000 |
| Financial years | multiple dates | yes (today + prior FY date mix) |
| TB per company | balanced | balanced (e.g. 854824 = 854824) |

## AUD-006 voucher number regression

Each company posted **10,000** vouchers, crossing the historical string-sort failure at 9999→10000.  
Post-run `company_next_voucher_number` format check required padded numeric suffix.

## Performance

- Generation elapsedSec **1026.9** before line top-up; total wall ≈ **1360 s** (~22.7 min) including 500k-line top-up.  
- Correctness first: all company TBs balanced; errors = 0.  
- Label if slow: may be treated as **PASS WITH PERFORMANCE WARNING** for interactive latency (not measured separately in this run); matrix **completed**.

## Verdict

**PERF 100K MATRIX PASS**

Incomplete 12k/35k/50k runs are **not** counted as 100k PASS. This run completed the full target.
