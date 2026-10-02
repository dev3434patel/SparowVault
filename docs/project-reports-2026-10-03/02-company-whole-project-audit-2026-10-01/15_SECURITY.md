# 15 — Security

| Check | Result |
|-------|--------|
| IDOR | PASS |
| CSRF / CORS / SQLi live probes | PASS (`raw/EVIDENCE_SECURITY_MATRIX.txt`) |
| Security matrix overall | **PASS** — process exit 0. Scanner reads `posting_guards.php` plus the preview and commit call sites |
| Actual deprecated-purpose guard | Present in `posting_guards.php`, called from preview and commit |
| Search | Membership-only |
| Export | `export_reports` without a second view_* check |
| healthz on ::1:8080 | 503 when database is not a test database |

**Status: PARTIAL** — live CSRF/IDOR and the security matrix PASS; search/export permission depth still soft.
