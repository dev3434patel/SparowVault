# Current Audit Evidence - 11 September 2026

Read [the full report](../../FULL-PROJECT-AUDIT-2026-09-11.md), [API audit](../../API-AUDIT-2026-09-11.md), [static catalog](../../FULL-AUDIT-CATALOG-2026-09-11.md) and [executed assertion matrix](TEST-MATRIX.md).

All mutation tests use disposable local databases and synthetic records. The actual user-supplied Kotak PDF was analyzed read-only, never imported, and not copied here. Its evidence is counts/booleans only. Browser screenshot fixtures are synthetic. No external payment purchase, git push or deployment was performed.

## Authoritative Runs

| Directory/file | Purpose | Result / caveat |
|---|---|---|
| `verification/verification.json` and logs | Typecheck, lint, unit, dev integrity/statement/browser, build, built-artifact and PHP syntax | All command groups pass; includes 410 unit tests, 63 development checks, 54 production-artifact checks and 81 syntax checks. |
| `verification/source-hashes.json` | Source at green core verification | Compare app-source hashes with final inventory; audit tooling changed afterward. |
| `extended-final-verified/atomic-writes.json` | Final extended owner/API/security/export/UI probes | 218 recorded checks, 184 pass and 34 nonpassing. |
| `extended-final-verified/audit/browser-entitlement.json` | Fixture health | HTTP 200 and exports enabled before export testing; no client feature-gate bypass. |
| `extended-final-verified/audit/api-matrix.json` | HTTP role/owner probe details | All 37 collection-list ownership checks pass; 18 admin denials use incorrect 500. |
| `extended-final-verified/audit/webhook-retry.json` | Invalid-first then valid signed delivery | Authentic retry acknowledged idempotently while payment remains unprocessed. |
| `extended-final-verified/audit/browser-pages.json` and screenshots | 108 route/viewport states | Includes six disabled-billing dashboard fallback states; not checkout certification. |
| `extended-final-verified/audit/browser-probes.json` | A11y, backup keys, parsed workbook, CSV text, partial restore | Actual downloads and source-function probes, clearly named. |
| `extended-final-verified/audit/browser-errors.json` | Runtime errors from extended probes | Rejected restore leaves a pending item; attempted wipe throws unresolved-outbox error. This particular wipe probe times out before DELETE, not a clean reference-order reproduction. |
| `extended-final-verified/audit/legacy-results.json` and individual logs | Six legacy scripts run on disposable DB | Five broken harness/fixture suites and one passing ownership suite. Do not count obsolete expectations as product bugs. |
| `modules-final-verified/atomic-writes.json` | Final clean module workflows | 45 checks: 43 pass, 2 fail. Base 27 checks repeat; new module checks cover saves/reloads, populated mobile states, broken loan and independently clean wipe. |
| `modules-final-verified/module-workflows.json` and screenshots | UI dialog text, save state, clean wipe response | Contains a supplemental clean-wipe response row without a pass flag; use atomic-writes.json for assertion counts. |
| `calculations/results.json` | Independent expected contracts for production finance/export functions | 16 checks: 6 pass, 10 fail. Includes 10,000+10,000 property cases and real 50,000-row engine input; not an HTTP/browser load benchmark. |
| `commands/actual-kotak.json` | Read-only actual PDF validation | 36 pages, 1,240 rows, seven compared fields/row, zero mismatches, zero import requests, unchanged source. |
| `commands/dependency-audit.json` | npm advisory result | Zero reported vulnerabilities at run time. |
| `commands/ci-reporter.log` | Exact CI reporter command | Fails before unit tests: basic reporter unsupported by installed Vitest. |
| `commands/unit-details.json` | Final individual unit-test results | 410 passing cases. |
| `commands/results.json` and logs | Dependency/CI/typecheck/lint command outcomes | CI reporter fails as reported; standard checks pass. |
| `commands/report-qa.json` | Final provenance and finding-count checks | 277 application/config files compared with the green verification baseline: no changes. All 27 finding IDs unique; severity counts verified. |
| `coverage/coverage-summary.json` | Unit service/library coverage | Restricted scope; metadata parse warnings occurred. Not full-project/PHP/UI coverage. |
| `inventory/*.json` | AST function/action/field and keyword inventories, asset sizes and hashes | Static definitions, not runtime execution coverage. |
| `suite-summary.json`, `TEST-MATRIX.md` | Derived counts and complete named assertion listing | Regenerated from authoritative run artifacts. Counts overlap. |

## Superseded Development Attempts

Directories `extended`, `extended-final`, `extended-verified`, `modules` and `modules-verified` contain earlier same-day audit harness development. They are preserved, not hidden or counted as independent final runs. Issues corrected in the harness included a too-long synthetic username, login waiting only for a generic main element, selectors with wrong capitalization/duplicate labels, missing wealth-tab selection, a too-early reload after edit, and export entitlement contamination from legacy billing fixtures. Some earlier runs also confirmed real defects, but the final report uses the authoritative reruns above.

The first attempt in `extended-final-verified` aborted during fixture setup because the test helper was passed a GET body; it cleaned up its database. The completed rerun overwrote its result artifacts and includes an explicit entitlement assertion. Only the completed run counts. No report marks the initial harness error as an application defect.

## Reproduction

From the repository root, with the local PHP/Node/MariaDB/Playwright prerequisites available:

```sh
STATEMENT_EVIDENCE_DIRECTORY=docs/audit-evidence/NEW-RUN/verification npm run verify:statements
AUDIT_DIRECTORY=docs/audit-evidence/NEW-RUN/extended node tests/atomic-writes-e2e.mjs --browser --audit
AUDIT_DIRECTORY=docs/audit-evidence/NEW-RUN/modules node tests/atomic-writes-e2e.mjs --browser --module-workflows
AUDIT_DIRECTORY=docs/audit-evidence/NEW-RUN/calculations node --import tsx tests/full-audit-calculations.mjs
npm test -- --reporter=json --outputFile=docs/audit-evidence/NEW-RUN/unit-details.json
npm audit --json
```

Use a new evidence directory to preserve prior runs. The audit suites intentionally exit nonzero while their desired-contract assertions fail. Do not weaken assertions, bypass ownership/CSRF or run fixed-name legacy reset scripts against live records to produce a green report. The PDF validator requires the already configured synthetic local preview and a user-authorized file; it does not import the document.

## Limitations

This package does not contain certified real layouts for every Indian bank, a universal OCR corpus, every dynamic UI/role combination, whole-program coverage, real-provider checkout, supported-runtime deployment/load evidence, historical production migration rehearsal, offsite restore after hardware loss or legal/accounting compliance sign-off. Those remain explicit release gates in the full report.

Final local availability check at approximately 09:18 UTC: preview frontend returned HTTP 200; API health returned healthy/database ok with Razorpay disabled. All databases created by this audit were removed. One pre-existing unrelated `sv_write_test_*` database/service was deliberately left untouched.
