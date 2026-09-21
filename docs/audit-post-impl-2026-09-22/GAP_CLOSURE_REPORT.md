# Gap closure report

Date: 2026-09-22  
Audit: SV-POST-IMPL-AUDIT-2026-09-22  
Scope: LOCAL ONLY

## Overall labels

| Label | Value |
|-------|-------|
| LOCAL_SOFTWARE_PIPELINE | VERIFIED (statement API + browser + backup) |
| LOCAL_REMEDIATION_REQUIRED | false for wired statement defects; true only for remaining PARTIAL UI polish / hosted |
| BLOCKED_FOR_20_BANK_CLAIM | **true** |
| HOSTED_RELEASE | NOT_TESTED |

## Findings

| ID | Status | Evidence |
|----|--------|----------|
| F-ENV-API | FIXED_VERIFIED | `test:statements` exit 0; `test:statements:browser` exit 0 |
| F-DOC-01 | FIXED | GAP_REGISTER corrected |
| F-REF-01 | PARTIAL | sanitized refs under docs/reference/sparowvault |
| F-ST-05-WIRE | FIXED_VERIFIED | omit-pair 422 live API |
| F-ST-11-SOURCE | FIXED_VERIFIED | importSources on commit + browser download |
| F-ST-10-MATCH | FIXED_VERIFIED | reconciliationMatches confirmed; no duplicate events |
| F-ST-03-OBS | PARTIAL_VERIFIED | observations + PDF.js highlight |
| F-ST-08-OCR | PARTIAL_VERIFIED | OCR gate + field uncertainty list |
| F-ST-09-EDIT | PARTIAL_VERIFIED | amount/date/DR-CR correction + digest invalidation unit |
| F-ST-16-GOAL | PARTIAL_VERIFIED | UI modes + server fundingMode validation |
| F-ST-13-CARD | PARTIAL_VERIFIED_SYNTHETIC | `/api/import/statement-card.php` live; real samples BLOCKED |
| F-BANK-20 | BLOCKED | 0 verified-for-scope; strict gate fails |

## Fresh commands

| Command | Exit |
|---------|------|
| npm run typecheck | 0 |
| npm run lint | 0 |
| npm run check:php | 0 (83 files) |
| statement units | 0 (85 cases) |
| npm run test:statements | 0 |
| npm run test:statements:browser | 0 |
| npm run statements:certify | 0 (`blocked: true`) |
| npm run statements:gate:strict | 1 (expected) |

## Remaining (honest)

1. Authorized real-bank holdouts (R7) — blocks bank claims only.
2. Full DPI/rotation browser matrix for bbox overlays.
3. Hosted CSP/MIME / packaging — out of local scope.
4. Second physical device sync soak (API+browser cover single-runtime multi-tab).
