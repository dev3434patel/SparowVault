# Company Security Final Certification

**Run:** `20260923-210013`  
**Evidence:** `raw/EVIDENCE_COMPANY_SECURITY_FULL.txt`  
**Harness:** `scripts/company/security-matrix.php`  
**API base:** `http://localhost:8080`

## Matrix

| Area | Verdict | Notes |
|------|---------|-------|
| CSRF helpers present | PASS | `csrf_require_for_mutations`, `csrf_issue_token` |
| Live login + session cookie | PASS | Isolated cert user |
| No session → mutation denied | PASS | HTTP 401 |
| Session + missing CSRF → denied | PASS | HTTP 403 |
| Session + wrong CSRF → denied | PASS | HTTP 403 |
| Session + valid CSRF → not CSRF-denied | PASS | HTTP 422 domain validation (expected) |
| CORS allowed origin (localhost:5173) | PASS | Preflight headers |
| CORS unknown / null Origin | PASS | Not reflected |
| Rate limit surface (login) | PASS | Guard present; window exercised |
| XSS payload stored as data | PASS | UI/export must escape |
| DOCX export script safety | PASS | No raw executable HTML script context |
| SQLi search probe | PASS | No SQL syntax error |
| Prepared statements (controller) | PASS | Static + live probe |

## Companion evidence

- IDOR / tenant isolation: prior `company:test:idor` gate (mandatory in `company:certify:final`)
- Session lock UI: Browser journey **N** PASS

## Verdict

**SECURITY MATRIX PASS** (live CSRF/CORS + static controls).

Not a claim of exhaustive fuzz against every endpoint parameter; state-changing company mutation path (`voucher-post`) was live-probed for CSRF session matrix.
