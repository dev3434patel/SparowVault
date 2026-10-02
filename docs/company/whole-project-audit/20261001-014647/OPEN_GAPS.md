# OPEN GAPS

## P0
None.

## P1
None. Journey G was re-run after the voucher list and receipt date used the local calendar day. F reported `rows=1` and G reversed the voucher (`raw/EVIDENCE_BROWSER_AUTH.txt`, exit 0).

## P2
1. Search is membership-only.
2. Export does not re-check report view_*.
3. Management reports: business and category rendered a summary. Project, area, and user-activity stayed on Loading in this sample (`raw/EVIDENCE_MANAGEMENT_AND_MODULES.txt`). Modules page opened.
4. `localhost` vs `127.0.0.1` vs `::1` on port 8080: IPv4 is Vite, IPv6 is PHP. healthz returns 503 on a non-test database.

## Closed since 20260924-004757
Categories master and `/vouchers/new` chooser exist. Product New menu passes. Viewport matrix passes.

## Closed in this re-proof
Keyboard suite 22/22. Axe 10/10 with no serious or critical violations. Security matrix exit 0 after the scanner reads `posting_guards.php`. Journey G PASS. Backup destroy/restore PASS (exit 0, `PASS backup_restore_checksum`). 100k matrix PASS (exit 0, `PERF 100K MATRIX PASS`).
