# 17 — Testing

## This-run results

| Suite | Status | Artifact |
|-------|--------|----------|
| company:test (31) | PASS | EVIDENCE_COMPANY_UNIT |
| company:test:php | PASS | EVIDENCE_COMPANY_PHP |
| company:gate:all (12) | PASS | EVIDENCE_GATE_ALL |
| company:test:idor | PASS | EVIDENCE_IDOR |
| company:test:http | PASS | EVIDENCE_HTTP_E2E |
| company:test:security (with cert user) | PASS | EVIDENCE_SECURITY_MATRIX_AUTH |
| company:test:security (default review_demo) | FAIL login 401 | EVIDENCE_SECURITY_MATRIX |
| company:test:hydrate | PASS 0/100 | EVIDENCE_HYDRATE |
| company:test:backup | PASS | EVIDENCE_BACKUP_RESTORE |
| company:test:latency | PASS | EVIDENCE_LATENCY |
| company:test:export:fidelity | PASS | EVIDENCE_EXPORT_FIDELITY |
| finance:gate:all | PASS | EVIDENCE_PERSONAL_REGRESSION |
| company:test:browser:auth A–N | FAIL abort on B | EVIDENCE_BROWSER_AUTH_A_N |
| company:test:product:browser | FAIL NEW_MENU | EVIDENCE_PRODUCT_BROWSER |
| company:certify:final | NOT RUN end-to-end | Would FAIL on auth browser + 100k |
| company:certify:product | NOT RUN orchestrator | Subchecks mixed |

## Coverage gaps

- No page-level vitest
- Masters/categories untested
- Auth E2E brittle selector
- Product browser false-negative on New menu label
- Combination pairwise / concurrency / fault injection: NOT VERIFIED
- Visual regression CI: NOT IMPLEMENTED

## Test quality

Domain tests assert accounting outcomes — strong.  
Some gates reuse demo-certify for parties/vouchers/bills — overlapping, still useful.  
Browser auth abort reduces journey proof.

**Testing: PARTIAL**
