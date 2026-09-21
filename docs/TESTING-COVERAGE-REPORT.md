# Testing Coverage Report

## Update - 11 September 2026

See [current verification results](FULL-PROJECT-AUDIT-2026-09-11.md#4-verification-results) and [individual executed assertions](audit-evidence/2026-09-11-full/TEST-MATRIX.md). Unit tests now pass 410/410; restricted service/library line coverage is 64.64%, not whole-project coverage. New desired-contract audit tests intentionally fail on open defects. Earlier results below are historical.

Audit date: 10 September 2026 (Asia/Kolkata). Repository: SparowVault. Baseline HEAD: `54eec068a37cceb9cccc2a63dca824e1e092f52e`. Scope includes the pre-existing local modifications. This is an audit-only deliverable, not a remediation or production certificate.

## Results

Results are separated by runner. Counts across suites overlap and must not be added into a single inflated coverage number. PASS lines from flawed fixtures or click-only tests are not evidence of the intended financial behavior.

| Layer | Observed result | Interpretation |
| --- | --- | --- |
| TypeScript | PASS | No TypeScript diagnostics; not runtime assurance. |
| ESLint normal | FAIL: 279 parsing errors | Filesystem AppleDouble metadata was picked up by eslint . |
| ESLint diagnostic exclusions | PASS | Ignoring **/._* and generated audit evidence isolates actual lint baseline; app/config not changed. |
| Unit normal | 98 discovered suites: 51 failed / 47 passed | 49 extra metadata files are not legitimate test suites. 311 real assertions still execute. |
| Unit diagnostic clean run | 49 suites: 47 passed / 2 failed; 311 tests: 307 passed / 4 failed | Two missing secret-fixture files and two powershell ENOENT failures. |
| Coverage | 56.51% lines/statements, 68.24% branches, 70.4% functions | Only configured src/services + src/lib. Not UI/store/repo/PHP coverage. |
| PHP syntax | PASS: runner reports 150 paths | Includes metadata files interpreted as plain text; 75 nonmetadata PHP paths are the meaningful syntax scope. |
| SQL static | PASS with 8 warnings | 24 root SQL paths include 12 metadata files; initial live phase skipped. Separate isolated schema reset succeeded. |
| Build | PASS; 3453 modules | Large single JS asset and mixed import warnings remain. |
| Dependencies | FAIL: 19 advisory nodes | 4 critical / 7 high / 7 moderate / 1 low; runtime vs dev exposure separated. |
| Isolated database reset | PASS | Created/reset only sparowvault_audit_test_20260910; not current user database. |
| Core API | 65/65 PASS | Covered positive/negative cases only; custom probes still expose significant failures. |
| vNext collections API | 11 PASS lines | Smoke + ownership/idempotent sequential cases, not parallel semantics. |
| Account endpoints | 9 PASS, 1 FAIL | Own-data missing-row failure caused by unverified CSRF-blocked seed. Extra X05 passes with valid seeding. |
| Validation API | 10 PASS, 2 FAIL | 8 rejection lines received CSRF 403 before intended schema checks. Do not claim validator coverage from them. |
| Webhook replay | Fixture error; no replay assertions reached | ER_DATA_TOO_LONG username fixture >20 characters. |
| Webhook ownership | 9 PASS lines | Synthetic signature/ownership/amount/replay controls checked. |
| Existing browser smoke | 37/37 PASS | Some checks are click-only; reset outcome and import completion not fully asserted. |
| Existing finance browser | 6 PASS lines | Page smoke, not full financial posting journeys. |
| Existing offline browser | 10 PASS lines | Synthetic outbox marker persists; not a real durable offline financial write. |
| Custom browser | 30 routes x 10 widths; 5 PASS / 3 FAIL; 0 fatal/page errors | Failures: missing mobile Categories/Audit and unsynced local account loss. Gated/disabled views explicitly identified. |
| Custom finance | 16 assertions: 4 PASS / 12 FAIL | Includes one conservation property with 14443 sampled allocations. |
| Custom security | 20 assertions: 5 PASS / 15 FAIL | Includes 5 local file-exposure checks. A positive denial still has a wrong status defect. |
| Extra security/data | 7 assertions: 1 PASS / 6 FAIL | Confirms flag=1 bypass, recovery takeover, malformed schema, orphan references, broken restore links and incomplete wipe; correctly seeded own export passes. |

## Commands actually executed

| Run | Exact child command | Exit | Seconds | Evidence |
| --- | --- | --- | --- | --- |
| account-api | node tests/account-endpoints-e2e.mjs | 1 | 1.326 | [account-api.log](</Volumes/ssd12/SparowVault/230826 SparowVault/docs/audit-evidence/2026-09-10/account-api.log>) |
| api-vnext | node tests/api-vnext-collections-e2e.mjs | 0 | 0.27 | [api-vnext.log](</Volumes/ssd12/SparowVault/230826 SparowVault/docs/audit-evidence/2026-09-10/api-vnext.log>) |
| api | node tests/api-e2e.mjs | 0 | 1.016 | [api.log](</Volumes/ssd12/SparowVault/230826 SparowVault/docs/audit-evidence/2026-09-10/api.log>) |
| browser-audit | node /tmp/sparow-audit-browser.mjs | 0 | 57.07 | [browser-audit.log](</Volumes/ssd12/SparowVault/230826 SparowVault/docs/audit-evidence/2026-09-10/browser-audit.log>) |
| browser-existing | node tests/browser-e2e.mjs | 0 | 20.945 | [browser-existing.log](</Volumes/ssd12/SparowVault/230826 SparowVault/docs/audit-evidence/2026-09-10/browser-existing.log>) |
| browser-offline-existing | node tests/browser-offline-finance-e2e.mjs | 0 | 36.243 | [browser-offline-existing.log](</Volumes/ssd12/SparowVault/230826 SparowVault/docs/audit-evidence/2026-09-10/browser-offline-existing.log>) |
| browser-vnext | node tests/browser-finance-vnext-e2e.mjs | 0 | 4.904 | [browser-vnext.log](</Volumes/ssd12/SparowVault/230826 SparowVault/docs/audit-evidence/2026-09-10/browser-vnext.log>) |
| build | npm run build | 0 | 11.281 | [build.log](</Volumes/ssd12/SparowVault/230826 SparowVault/docs/audit-evidence/2026-09-10/build.log>) |
| coverage | npm run test -- --exclude **/._* --coverage --coverage.reportOnFailure --coverage.exclude **/._* --coverage.exclude **/__tests__/** --coverage.reportsDirectory=docs/audit-evidence/2026-09-10/coverage --coverage.reporter=json-summary --coverage.reporter=text | 1 | 3.589 | [coverage.log](</Volumes/ssd12/SparowVault/230826 SparowVault/docs/audit-evidence/2026-09-10/coverage.log>) |
| db-reset | npm run db:test:reset | 0 | 0.681 | [db-reset.log](</Volumes/ssd12/SparowVault/230826 SparowVault/docs/audit-evidence/2026-09-10/db-reset.log>) |
| dependency-audit | npm audit --json | 1 | 8.062 | [dependency-audit.log](</Volumes/ssd12/SparowVault/230826 SparowVault/docs/audit-evidence/2026-09-10/dependency-audit.log>) |
| extra-probes | node /tmp/sparow-audit-extra.mjs | 0 | 5.759 | [extra-probes.log](</Volumes/ssd12/SparowVault/230826 SparowVault/docs/audit-evidence/2026-09-10/extra-probes.log>) |
| finance-probes | node --import tsx /tmp/sparow-audit-finance.mts | 0 | 1.291 | [finance-probes.log](</Volumes/ssd12/SparowVault/230826 SparowVault/docs/audit-evidence/2026-09-10/finance-probes.log>) |
| lint-clean | npm run lint -- --ignore-pattern **/._* --ignore-pattern docs/audit-evidence/** | 0 | 7.533 | [lint-clean.log](</Volumes/ssd12/SparowVault/230826 SparowVault/docs/audit-evidence/2026-09-10/lint-clean.log>) |
| lint | npm run lint | 1 | 10.812 | [lint.log](</Volumes/ssd12/SparowVault/230826 SparowVault/docs/audit-evidence/2026-09-10/lint.log>) |
| php-syntax | npm run check:php | 0 | 12.301 | [php-syntax.log](</Volumes/ssd12/SparowVault/230826 SparowVault/docs/audit-evidence/2026-09-10/php-syntax.log>) |
| security-probes | node /tmp/sparow-audit-security.mjs | 0 | 2.819 | [security-probes.log](</Volumes/ssd12/SparowVault/230826 SparowVault/docs/audit-evidence/2026-09-10/security-probes.log>) |
| sql-static | npm run check:sql | 0 | 0.159 | [sql-static.log](</Volumes/ssd12/SparowVault/230826 SparowVault/docs/audit-evidence/2026-09-10/sql-static.log>) |
| typecheck | npm run typecheck | 0 | 12.614 | [typecheck.log](</Volumes/ssd12/SparowVault/230826 SparowVault/docs/audit-evidence/2026-09-10/typecheck.log>) |
| unit-clean | npm run test -- --exclude **/._* --coverage --coverage.exclude **/._* --coverage.reportsDirectory=docs/audit-evidence/2026-09-10/coverage-clean --reporter=default --reporter=json --outputFile=docs/audit-evidence/2026-09-10/unit-clean-results.json | 1 | 4.418 | [unit-clean.log](</Volumes/ssd12/SparowVault/230826 SparowVault/docs/audit-evidence/2026-09-10/unit-clean.log>) |
| unit | npm run test -- --coverage --coverage.reportsDirectory=docs/audit-evidence/2026-09-10/coverage --reporter=default --reporter=json --outputFile=docs/audit-evidence/2026-09-10/unit-results.json | 1 | 9.827 | [unit.log](</Volumes/ssd12/SparowVault/230826 SparowVault/docs/audit-evidence/2026-09-10/unit.log>) |
| validation-api | node tests/phase-04-validation-e2e.mjs | 1 | 0.516 | [validation-api.log](</Volumes/ssd12/SparowVault/230826 SparowVault/docs/audit-evidence/2026-09-10/validation-api.log>) |
| webhook-ownership | node tests/webhook-ownership-e2e.mjs | 0 | 0.136 | [webhook-ownership.log](</Volumes/ssd12/SparowVault/230826 SparowVault/docs/audit-evidence/2026-09-10/webhook-ownership.log>) |
| webhook-replay | node tests/webhook-replay-e2e.mjs | 1 | 0.061 | [webhook-replay.log](</Volumes/ssd12/SparowVault/230826 SparowVault/docs/audit-evidence/2026-09-10/webhook-replay.log>) |

## Runtime isolation and reproducibility

The audit started an independent PHP server on localhost:8086 and Vite on localhost:5176, backed by `sparowvault_audit_test_20260910`. The security race used four PHP CLI server workers. Fake audit-only JWT/webhook secrets were injected. Razorpay was disabled and webhook events were synthetic. Test rate-limit records were cleared only in this isolated database between suites. Runtime harnesses stop their process groups in finally blocks. The user runtime at 5173/8080 and original sparowvault database were not reset.

Exact command arguments, timestamps, duration, exit code and redacted outputs are in the result/log pairs above. Harnesses are preserved under audit-evidence/2026-09-10/harness; their original /tmp paths and test-only configuration are documented in the evidence README. Do not aim these tests at a real database.

## Coverage scope

The coverage command used `--coverage.reportOnFailure` so the four existing failures did not suppress output. It included only `src/services/**/*.ts` and `src/lib/**/*.ts`; it does not measure TSX pages, repositories, stores, SQL or PHP. CLI exclusions for AppleDouble/test files overrode the default exclusion list, bringing demoData.ts into the denominator at zero coverage. Thus 56.51 percent is the exact measured run, not the intended default-config product percentage. caReports has high line coverage while semantic probes fail: coverage is not accounting correctness.

| File | Lines % | Branches % | Functions % |
| --- | --- | --- | --- |
| [/Volumes/ssd12/SparowVault/230826 SparowVault/src/lib/apiClient.ts](</Volumes/ssd12/SparowVault/230826 SparowVault/src/lib/apiClient.ts>) | 7.05 | 100 | 0 |
| [/Volumes/ssd12/SparowVault/230826 SparowVault/src/lib/crypto.ts](</Volumes/ssd12/SparowVault/230826 SparowVault/src/lib/crypto.ts>) | 0 | 0 | 0 |
| [/Volumes/ssd12/SparowVault/230826 SparowVault/src/lib/format.ts](</Volumes/ssd12/SparowVault/230826 SparowVault/src/lib/format.ts>) | 55.55 | 30.76 | 30.76 |
| [/Volumes/ssd12/SparowVault/230826 SparowVault/src/lib/migrateLegacyKeys.ts](</Volumes/ssd12/SparowVault/230826 SparowVault/src/lib/migrateLegacyKeys.ts>) | 0 | 0 | 0 |
| [/Volumes/ssd12/SparowVault/230826 SparowVault/src/lib/navRoutes.ts](</Volumes/ssd12/SparowVault/230826 SparowVault/src/lib/navRoutes.ts>) | 0 | 0 | 0 |
| [/Volumes/ssd12/SparowVault/230826 SparowVault/src/lib/utils.ts](</Volumes/ssd12/SparowVault/230826 SparowVault/src/lib/utils.ts>) | 41.5 | 83.33 | 33.33 |
| [/Volumes/ssd12/SparowVault/230826 SparowVault/src/lib/cloud/auth.ts](</Volumes/ssd12/SparowVault/230826 SparowVault/src/lib/cloud/auth.ts>) | 0 | 0 | 0 |
| [/Volumes/ssd12/SparowVault/230826 SparowVault/src/lib/cloud/client.ts](</Volumes/ssd12/SparowVault/230826 SparowVault/src/lib/cloud/client.ts>) | 0 | 0 | 0 |
| [/Volumes/ssd12/SparowVault/230826 SparowVault/src/lib/cloud/collections.ts](</Volumes/ssd12/SparowVault/230826 SparowVault/src/lib/cloud/collections.ts>) | 60 | 100 | 0 |
| [/Volumes/ssd12/SparowVault/230826 SparowVault/src/lib/cloud/http.ts](</Volumes/ssd12/SparowVault/230826 SparowVault/src/lib/cloud/http.ts>) | 0 | 0 | 0 |
| [/Volumes/ssd12/SparowVault/230826 SparowVault/src/lib/cloud/repoClient.ts](</Volumes/ssd12/SparowVault/230826 SparowVault/src/lib/cloud/repoClient.ts>) | 1.85 | 100 | 0 |
| [/Volumes/ssd12/SparowVault/230826 SparowVault/src/lib/cloud/saasClient.ts](</Volumes/ssd12/SparowVault/230826 SparowVault/src/lib/cloud/saasClient.ts>) | 0 | 0 | 0 |
| [/Volumes/ssd12/SparowVault/230826 SparowVault/src/services/accountBalanceEngine.ts](</Volumes/ssd12/SparowVault/230826 SparowVault/src/services/accountBalanceEngine.ts>) | 95.5 | 57.14 | 100 |
| [/Volumes/ssd12/SparowVault/230826 SparowVault/src/services/adaptiveModeEngine.ts](</Volumes/ssd12/SparowVault/230826 SparowVault/src/services/adaptiveModeEngine.ts>) | 89.13 | 77.77 | 100 |
| [/Volumes/ssd12/SparowVault/230826 SparowVault/src/services/alertPriority.ts](</Volumes/ssd12/SparowVault/230826 SparowVault/src/services/alertPriority.ts>) | 0 | 0 | 0 |
| [/Volumes/ssd12/SparowVault/230826 SparowVault/src/services/alertsEngine.ts](</Volumes/ssd12/SparowVault/230826 SparowVault/src/services/alertsEngine.ts>) | 0 | 0 | 0 |
| [/Volumes/ssd12/SparowVault/230826 SparowVault/src/services/authService.ts](</Volumes/ssd12/SparowVault/230826 SparowVault/src/services/authService.ts>) | 0 | 0 | 0 |
| [/Volumes/ssd12/SparowVault/230826 SparowVault/src/services/businessPersonalSplit.ts](</Volumes/ssd12/SparowVault/230826 SparowVault/src/services/businessPersonalSplit.ts>) | 100 | 85.71 | 100 |
| [/Volumes/ssd12/SparowVault/230826 SparowVault/src/services/caReports.ts](</Volumes/ssd12/SparowVault/230826 SparowVault/src/services/caReports.ts>) | 90.93 | 70.71 | 90.9 |
| [/Volumes/ssd12/SparowVault/230826 SparowVault/src/services/calculations.ts](</Volumes/ssd12/SparowVault/230826 SparowVault/src/services/calculations.ts>) | 63.1 | 72.72 | 70.96 |
| [/Volumes/ssd12/SparowVault/230826 SparowVault/src/services/cardEmiEngine.ts](</Volumes/ssd12/SparowVault/230826 SparowVault/src/services/cardEmiEngine.ts>) | 80.72 | 80 | 75 |
| [/Volumes/ssd12/SparowVault/230826 SparowVault/src/services/cardEngine.ts](</Volumes/ssd12/SparowVault/230826 SparowVault/src/services/cardEngine.ts>) | 97.61 | 85.84 | 94.73 |
| [/Volumes/ssd12/SparowVault/230826 SparowVault/src/services/cardPaymentAllocator.ts](</Volumes/ssd12/SparowVault/230826 SparowVault/src/services/cardPaymentAllocator.ts>) | 0 | 0 | 0 |
| [/Volumes/ssd12/SparowVault/230826 SparowVault/src/services/cardStatementEngine.ts](</Volumes/ssd12/SparowVault/230826 SparowVault/src/services/cardStatementEngine.ts>) | 0 | 0 | 0 |
| [/Volumes/ssd12/SparowVault/230826 SparowVault/src/services/cashflowSurvivalEngine.ts](</Volumes/ssd12/SparowVault/230826 SparowVault/src/services/cashflowSurvivalEngine.ts>) | 75 | 52.45 | 100 |
| [/Volumes/ssd12/SparowVault/230826 SparowVault/src/services/categoryColorEngine.ts](</Volumes/ssd12/SparowVault/230826 SparowVault/src/services/categoryColorEngine.ts>) | 83.42 | 77.14 | 83.33 |
| [/Volumes/ssd12/SparowVault/230826 SparowVault/src/services/defaultsService.ts](</Volumes/ssd12/SparowVault/230826 SparowVault/src/services/defaultsService.ts>) | 0 | 0 | 0 |
| [/Volumes/ssd12/SparowVault/230826 SparowVault/src/services/demoData.ts](</Volumes/ssd12/SparowVault/230826 SparowVault/src/services/demoData.ts>) | 0 | 0 | 0 |
| [/Volumes/ssd12/SparowVault/230826 SparowVault/src/services/emergencyFundEngine.ts](</Volumes/ssd12/SparowVault/230826 SparowVault/src/services/emergencyFundEngine.ts>) | 100 | 76.47 | 100 |
| [/Volumes/ssd12/SparowVault/230826 SparowVault/src/services/exportSafety.ts](</Volumes/ssd12/SparowVault/230826 SparowVault/src/services/exportSafety.ts>) | 100 | 100 | 100 |
| [/Volumes/ssd12/SparowVault/230826 SparowVault/src/services/financeEventBuilder.ts](</Volumes/ssd12/SparowVault/230826 SparowVault/src/services/financeEventBuilder.ts>) | 78.39 | 62.04 | 100 |
| [/Volumes/ssd12/SparowVault/230826 SparowVault/src/services/financeKpiEngine.ts](</Volumes/ssd12/SparowVault/230826 SparowVault/src/services/financeKpiEngine.ts>) | 32.55 | 50 | 50 |
| [/Volumes/ssd12/SparowVault/230826 SparowVault/src/services/financeLedgerExplain.ts](</Volumes/ssd12/SparowVault/230826 SparowVault/src/services/financeLedgerExplain.ts>) | 0 | 0 | 0 |
| [/Volumes/ssd12/SparowVault/230826 SparowVault/src/services/financialChecksum.ts](</Volumes/ssd12/SparowVault/230826 SparowVault/src/services/financialChecksum.ts>) | 88.67 | 68.75 | 66.66 |
| [/Volumes/ssd12/SparowVault/230826 SparowVault/src/services/goalEngine.ts](</Volumes/ssd12/SparowVault/230826 SparowVault/src/services/goalEngine.ts>) | 96.77 | 75 | 100 |
| [/Volumes/ssd12/SparowVault/230826 SparowVault/src/services/importExportRepair.ts](</Volumes/ssd12/SparowVault/230826 SparowVault/src/services/importExportRepair.ts>) | 94.53 | 73.71 | 100 |
| [/Volumes/ssd12/SparowVault/230826 SparowVault/src/services/issuerSchedulePrecedence.ts](</Volumes/ssd12/SparowVault/230826 SparowVault/src/services/issuerSchedulePrecedence.ts>) | 71.42 | 62.5 | 100 |
| [/Volumes/ssd12/SparowVault/230826 SparowVault/src/services/ledgerCalculations.ts](</Volumes/ssd12/SparowVault/230826 SparowVault/src/services/ledgerCalculations.ts>) | 65.47 | 81.53 | 73.33 |
| [/Volumes/ssd12/SparowVault/230826 SparowVault/src/services/ledgerDiagnostics.ts](</Volumes/ssd12/SparowVault/230826 SparowVault/src/services/ledgerDiagnostics.ts>) | 87.5 | 78.37 | 80 |
| [/Volumes/ssd12/SparowVault/230826 SparowVault/src/services/loanEngine.ts](</Volumes/ssd12/SparowVault/230826 SparowVault/src/services/loanEngine.ts>) | 90.5 | 67.46 | 96.42 |
| [/Volumes/ssd12/SparowVault/230826 SparowVault/src/services/loanPaymentSync.ts](</Volumes/ssd12/SparowVault/230826 SparowVault/src/services/loanPaymentSync.ts>) | 0 | 0 | 0 |
| [/Volumes/ssd12/SparowVault/230826 SparowVault/src/services/obligationEngine.ts](</Volumes/ssd12/SparowVault/230826 SparowVault/src/services/obligationEngine.ts>) | 50.46 | 40 | 50 |
| [/Volumes/ssd12/SparowVault/230826 SparowVault/src/services/personaEngine.ts](</Volumes/ssd12/SparowVault/230826 SparowVault/src/services/personaEngine.ts>) | 92.95 | 69.44 | 92.3 |
| [/Volumes/ssd12/SparowVault/230826 SparowVault/src/services/planFeatureGate.ts](</Volumes/ssd12/SparowVault/230826 SparowVault/src/services/planFeatureGate.ts>) | 100 | 46.66 | 100 |
| [/Volumes/ssd12/SparowVault/230826 SparowVault/src/services/reconciliationEngine.ts](</Volumes/ssd12/SparowVault/230826 SparowVault/src/services/reconciliationEngine.ts>) | 0 | 0 | 0 |
| [/Volumes/ssd12/SparowVault/230826 SparowVault/src/services/refIntegrity.ts](</Volumes/ssd12/SparowVault/230826 SparowVault/src/services/refIntegrity.ts>) | 0 | 0 | 0 |
| [/Volumes/ssd12/SparowVault/230826 SparowVault/src/services/sinkingFundEngine.ts](</Volumes/ssd12/SparowVault/230826 SparowVault/src/services/sinkingFundEngine.ts>) | 0 | 0 | 0 |
| [/Volumes/ssd12/SparowVault/230826 SparowVault/src/services/smartBudgetEngine.ts](</Volumes/ssd12/SparowVault/230826 SparowVault/src/services/smartBudgetEngine.ts>) | 92.76 | 55.88 | 100 |
| [/Volumes/ssd12/SparowVault/230826 SparowVault/src/services/suggestionAiExplain.ts](</Volumes/ssd12/SparowVault/230826 SparowVault/src/services/suggestionAiExplain.ts>) | 65 | 90 | 75 |
| [/Volumes/ssd12/SparowVault/230826 SparowVault/src/services/suggestionEngine.ts](</Volumes/ssd12/SparowVault/230826 SparowVault/src/services/suggestionEngine.ts>) | 74.13 | 38.53 | 100 |
| [/Volumes/ssd12/SparowVault/230826 SparowVault/src/services/suggestionSync.ts](</Volumes/ssd12/SparowVault/230826 SparowVault/src/services/suggestionSync.ts>) | 17.55 | 46.15 | 42.85 |
| [/Volumes/ssd12/SparowVault/230826 SparowVault/src/services/syncOutbox.ts](</Volumes/ssd12/SparowVault/230826 SparowVault/src/services/syncOutbox.ts>) | 64.36 | 62.5 | 77.77 |
| [/Volumes/ssd12/SparowVault/230826 SparowVault/src/services/transactionFormRules.ts](</Volumes/ssd12/SparowVault/230826 SparowVault/src/services/transactionFormRules.ts>) | 98.5 | 100 | 75 |
| [/Volumes/ssd12/SparowVault/230826 SparowVault/src/services/transactionIntent.ts](</Volumes/ssd12/SparowVault/230826 SparowVault/src/services/transactionIntent.ts>) | 54.16 | 50 | 25 |
| [/Volumes/ssd12/SparowVault/230826 SparowVault/src/services/transactionPreview.ts](</Volumes/ssd12/SparowVault/230826 SparowVault/src/services/transactionPreview.ts>) | 97.08 | 66.31 | 92.85 |
| [/Volumes/ssd12/SparowVault/230826 SparowVault/src/services/udhariEngine.ts](</Volumes/ssd12/SparowVault/230826 SparowVault/src/services/udhariEngine.ts>) | 94.26 | 80 | 88.88 |
| [/Volumes/ssd12/SparowVault/230826 SparowVault/src/services/validators.ts](</Volumes/ssd12/SparowVault/230826 SparowVault/src/services/validators.ts>) | 74.93 | 50 | 0 |

## Exhaustive release-test design

This is an explicit unexecuted/partially executed release matrix, not a claim that every possible combination has been tested. Combine core financial cases with role, ownership, transport, lifecycle, time and failure dimensions. Use pairwise/property generation for the large product space, and keep high-risk full journeys mandatory.

| Domain | Cases required | Evidence now | Status | Release proof still needed |
| --- | --- | --- | --- | --- |
| Authentication | Registration, policy versions, wrong PIN, admin login, inactive/deleted user, recovery, rotation, old sessions | Existing API + S01-S08/S12 + X01-X02 | Partially tested; recovery/revocation/forced rotation fail | Every role/session transport, all reset paths, brute force, session device list and stale-cookie tests |
| Ownership / RBAC | Anonymous/owner/other-user/admin/household roles by method | Core API, S11, X04 | Cross-user covered cases pass; household batch and missing-reference checks fail | 37 collections x all aliases x role and owner boundaries, deleted references and feature gates |
| Write durability | Single/bulk/import/sync/offline/concurrent retry | S09-S10/S14-S15 and real repository browser probe | Fail | Atomic entity/effect/audit, payload-bearing outbox, durable reload and conflict outcomes |
| Transactions | Income/expense/transfer/debt/refund/reversal/adjustment types | 311-test unit run plus API smoke | Partial; not every UI intent completed | All sources, destinations, currencies, invalid links, cancellation and report equality |
| Cards / loans | Four cards, EMI lifecycle, fees, tax, refund, payment order | Existing pure-function suites | Covered helpers pass; end-to-end issuer/SQL parity unverified | Realistic statement fixtures, duplicate/late payment, partial refund, closed/deleted instrument and settlement reconciliation |
| Budgets / goals / wealth | Create/edit/contribute/delete and totals | Unit suites and route smoke | Partial | Cash coupling, all vNext collections, investment valuations, maturity and backup restoration |
| Exports | Period, numeric types, worksheets, CSV, backup, isolation | F09-F16, browser XLSX, X05 | Multiple failures | Every module/format/filter, large/corrupt data, round-trip restore and target spreadsheet applications |
| Agency invoices | Number series, GST modes, discount, payment links, PDF/DOCX | No implementation | Blocked by feature gap | Versioned requirements, arithmetic golden cases, unique numbering under concurrency and document rendering |
| Agency quotations | Packages, scope, GST, validity, acceptance and conversion | No implementation | Blocked by feature gap | All 30 requested quotation audit areas and immutable accepted snapshots |
| Partner / month close | Cash eligibility, shares, snapshots, approve/pay/reverse/lock | No implementation | Blocked by feature gap | Allocation conservation, closed-period enforcement, dual control and rollback tests |
| Documents | Upload/type/size/ownership/preview/download/delete/retention | Metadata collection only | Not implemented end-to-end | Private storage, signed downloads, malware/quota policy and document/export inclusion |
| Responsive UI | 30 routes x 10 widths, selected screenshots | Completed Chromium sweep | No root overflow in sampled states; accessibility/navigation defects | Paid populated charts, all dialogs, long data, keyboard, zoom, Safari/Firefox and real touch devices |
| Performance | Pure ledger build at 1k/10k/25k | 16/150/508 ms observed | Not a throughput or SLA benchmark | CPU/network throttling, memory, API/SQL concurrency, export size, pagination and p95/p99 targets |
| Deployment / ops | Secrets, HTTPS, headers, artifacts, backups, monitoring | Source review, syntax/build, local health | Not production certified | Staging deploy, header/proxy audit, restore drill, rollout/rollback, alert delivery and RPO/RTO |

## Test dimensions to combine

| Dimension | Required values |
| --- | --- |
| Money | 0, 1 paise, half-cent rounding inputs, negative, very large safe integer, NaN/Infinity strings, decimal strings, legacy rupees, refund sign |
| Dates | Month/FY boundary, timezone offset, midnight, leap day, 28/29/30/31 statement days, future/backdated and invalid date |
| Lifecycle | Create, edit, soft delete, explicit restore, reversal, reversal-of-reversal, cancel, hard purge where allowed, close/reopen when implemented |
| Retry / concurrency | Double click, lost response, duplicate mutation ID, different payload same key, two tabs/devices, 4/16 writers, stale version |
| Failure stage | Validation, permission, PIN, request body limit, DB write, effect write, audit write, local IndexedDB quota, network timeout and browser crash |
| Data shape | Empty, one row, many rows, duplicate names, long Unicode names, missing optional/required field, foreign/deleted references, metadata files |
| UI | Desktop/tablet/mobile, keyboard/touch, normal/zoomed, dark/light, loading/empty/error/populated, enabled/disabled feature and plan |
| Exports | XLSX/CSV/JSON, all/selected period, opening/movement/closing, full restore, numeric type, formula-like text and conditional worksheet names |

## Prioritized regression requirements per finding

| Finding | Priority | Required regression |
| --- | --- | --- |
| B01 | Critical | Create/edit/delete offline, refresh, reload, restart browser, reconnect and reconcile one durable server row. Inject 401/403/422/500/timeout independently. |
| B02 | Critical | Concurrent retries with 1/4/16 workers, response loss, database failure, same key/different payload, same key/different collection and two different users. |
| B03 | High | Failure at every row and ledger/audit step must leave either all rows committed or an explicit, deterministic partial-result contract. |
| B04 | High | Two-device edit/delete races, offline replay after deletion, clock skew, missing versions and intentional restore. |
| B05 | High | Single, selected and whole-collection delete; rollback on event failure; assert no posted orphan event/effect. |
| B06 | High | Set/change/reset/change sequences, repeated resets, wrong answers, Unicode normalization and recovery migration. |
| B07 | High | Old bearer and cookie tokens after change/reset/logout/admin reset/deactivation; active-session inventory and expiry boundaries. |
| B08 | High | First login, flagged existing session, direct API calls, all admin endpoints and every account reset route. |
| B09 | High | Session-only recovery takeover attempt, stale reauthentication, PIN throttling, concurrent recovery replacement and legitimate reset. |
| B10 | High | Same-site subdomain, cross-site fetch/form, absent/mismatched token, null Origin, strict CORS and bearer-only requests. |
| B11 | High | Direct-origin spoofing, legitimate proxy chains, IPv6, distributed attempts, lock expiry, reset and denial-of-service resistance. |
| B12 | High | Full owner/partner/viewer x operation x endpoint matrix including foreign households and membership removal. |
| B14 | High | Contract-derived positive and negative cases for all 37 collections, create/patch/batch/sync/import parity. |
| B15 | High | All 37 collections, deleted/tombstoned rows, cross-user isolation, attachment bytes versus metadata, legacy migrations and checksum comparisons. |
| B16 | High | Identical exports from both entry points; opening/movement/closing handling; day/month/FY boundaries; no-data periods and refunds. |
| B17 | High | Opening-only accounts, receivable/payable partial settlement, card debt, loans, deleted rows and cross-report equality. |
| B18 | High | Full/partial refund, reversal-of-reversal, fees and tax reversal, refunded card expense, year boundary and raw/effect parity. |
| B23 | High | Missing statement, real equal/different balances, period boundary, currency, duplicate imported statements and stale match invalidation. |
| B24 | High | 0/60/100 percent, explicit paise split, refunds, CSV/XLSX totals and comparison to report detail. |
| B25 | High | Representative bank workbooks, malicious/oversized/corrupt inputs, parse time budgets, formula cells and import-preview integrity. |
| B37 | High | Missing, foreign-user, deleted and concurrently removed references for account/card/loan/goal/category/Udhari paths. |
| B38 | High | Cross-profile and same-profile restore, repeated restore, all relationship types, cyclic links, partial failure and canonical checksum equality. |
| B39 | High | All 37 collections, attachment bytes, local caches, outbox, failure halfway, cancel/wrong confirmation, account deletion distinction and documented retention. |
| B13 | Medium | Reject client audit mutation/deletion; verify actor, timestamp, before/after, correlation ID and transaction rollback semantics. |
| B19 | Medium | Both explicit fields, one explicit field, zero/negative/noninteger/oversized amounts, percentages outside bounds and integer overflow. |
| B20 | Medium | Duplicate names, names equal after truncation/sanitization, blank names, >31 characters and repeated download after failure. |
| B21 | Medium | Parse saved workbook, assert numeric types/formats, SUM equality and locale-independent round-trip. |
| B22 | Medium | Leading =,+,-,@, whitespace/tab/newline and delimiter/quote combinations; Excel/LibreOffice opening tests with harmless payloads. |
| B26 | Medium | Clean dependency scan, package integrity, scripts/build/coverage compatibility and dev server exposure tests. |
| B27 | Medium | Fresh checkout on macOS/Linux/Windows without private env files; stable suite counts and no secret leakage. |
| B28 | Medium | Each formerly false-positive test must fail against the known defect and pass after a scoped fix; avoid click-only success. |
| B29 | Medium | Axe plus manual VoiceOver, keyboard-only dialog flows, label activation and error announcements on desktop/mobile. |
| B30 | Medium | Every allowed route reachable without typing URLs at 360-430px; hidden/paid/admin routes handled correctly. |
| B31 | Medium | Lighthouse/Web Vitals and CPU/network traces on representative devices; no route blank states or asset-loading regressions. |
| B32 | Medium | Forbidden paths and encoded variants against PHP dev and Apache staging; no git/source/secret/backup downloads. |
| B33 | Medium | 401/403/404/409/422/429/500 contracts, malformed JSON, database outage and sensitive-string suppression. |
| B34 | Medium | StrictMode mount, rapid login/reload, two tabs and concurrent first-login calls must create exactly one default set. |
| B35 | Low | UI list, downloaded manifest and conditional loan sheet counts remain consistent. |
| B36 | Low | Staging content review, valid legal pages and support links; no production example addresses. |

## Existing test entry inventory

All detected real test entries are below. Presence does not imply execution this turn. Runtime scripts other than those in the command table were not rerun merely because historical reports mention them.

| Test file | Execution classification |
| --- | --- |
| [src/services/__tests__/acceptanceMatrix.test.ts](</Volumes/ssd12/SparowVault/230826 SparowVault/src/services/__tests__/acceptanceMatrix.test.ts>) | Included in real 49-suite unit discovery |
| [src/services/__tests__/accountBalanceEngine.test.ts](</Volumes/ssd12/SparowVault/230826 SparowVault/src/services/__tests__/accountBalanceEngine.test.ts>) | Included in real 49-suite unit discovery |
| [src/services/__tests__/adaptiveModeEngine.test.ts](</Volumes/ssd12/SparowVault/230826 SparowVault/src/services/__tests__/adaptiveModeEngine.test.ts>) | Included in real 49-suite unit discovery |
| [src/services/__tests__/businessPersonalSplit.test.ts](</Volumes/ssd12/SparowVault/230826 SparowVault/src/services/__tests__/businessPersonalSplit.test.ts>) | Included in real 49-suite unit discovery |
| [src/services/__tests__/calculations.characterization.test.ts](</Volumes/ssd12/SparowVault/230826 SparowVault/src/services/__tests__/calculations.characterization.test.ts>) | Included in real 49-suite unit discovery |
| [src/services/__tests__/cardEmiEngine.test.ts](</Volumes/ssd12/SparowVault/230826 SparowVault/src/services/__tests__/cardEmiEngine.test.ts>) | Included in real 49-suite unit discovery |
| [src/services/__tests__/cardEmiLifecycle.t126.test.ts](</Volumes/ssd12/SparowVault/230826 SparowVault/src/services/__tests__/cardEmiLifecycle.t126.test.ts>) | Included in real 49-suite unit discovery |
| [src/services/__tests__/cardEngine.test.ts](</Volumes/ssd12/SparowVault/230826 SparowVault/src/services/__tests__/cardEngine.test.ts>) | Included in real 49-suite unit discovery |
| [src/services/__tests__/cardRefundLifecycle.fullMatrix.test.ts](</Volumes/ssd12/SparowVault/230826 SparowVault/src/services/__tests__/cardRefundLifecycle.fullMatrix.test.ts>) | Included in real 49-suite unit discovery |
| [src/services/__tests__/cashflowSurvivalEngine.test.ts](</Volumes/ssd12/SparowVault/230826 SparowVault/src/services/__tests__/cashflowSurvivalEngine.test.ts>) | Included in real 49-suite unit discovery |
| [src/services/__tests__/debtQa.test.ts](</Volumes/ssd12/SparowVault/230826 SparowVault/src/services/__tests__/debtQa.test.ts>) | Included in real 49-suite unit discovery |
| [src/services/__tests__/emergencyFundEngine.test.ts](</Volumes/ssd12/SparowVault/230826 SparowVault/src/services/__tests__/emergencyFundEngine.test.ts>) | Included in real 49-suite unit discovery |
| [src/services/__tests__/emiPrecisionPairwise.test.ts](</Volumes/ssd12/SparowVault/230826 SparowVault/src/services/__tests__/emiPrecisionPairwise.test.ts>) | Included in real 49-suite unit discovery |
| [src/services/__tests__/eventReversal.golden.test.ts](</Volumes/ssd12/SparowVault/230826 SparowVault/src/services/__tests__/eventReversal.golden.test.ts>) | Included in real 49-suite unit discovery |
| [src/services/__tests__/financeInvariants.test.ts](</Volumes/ssd12/SparowVault/230826 SparowVault/src/services/__tests__/financeInvariants.test.ts>) | Included in real 49-suite unit discovery |
| [src/services/__tests__/financeKpiEngine.test.ts](</Volumes/ssd12/SparowVault/230826 SparowVault/src/services/__tests__/financeKpiEngine.test.ts>) | Included in real 49-suite unit discovery |
| [src/services/__tests__/financeSequenceFuzz.test.ts](</Volumes/ssd12/SparowVault/230826 SparowVault/src/services/__tests__/financeSequenceFuzz.test.ts>) | Included in real 49-suite unit discovery |
| [src/services/__tests__/fourCardIsolation.fcr005.test.ts](</Volumes/ssd12/SparowVault/230826 SparowVault/src/services/__tests__/fourCardIsolation.fcr005.test.ts>) | Included in real 49-suite unit discovery |
| [src/services/__tests__/goalEngine.test.ts](</Volumes/ssd12/SparowVault/230826 SparowVault/src/services/__tests__/goalEngine.test.ts>) | Included in real 49-suite unit discovery |
| [src/services/__tests__/issuerSchedulePrecedence.test.ts](</Volumes/ssd12/SparowVault/230826 SparowVault/src/services/__tests__/issuerSchedulePrecedence.test.ts>) | Included in real 49-suite unit discovery |
| [src/services/__tests__/ledger.scenarios.test.ts](</Volumes/ssd12/SparowVault/230826 SparowVault/src/services/__tests__/ledger.scenarios.test.ts>) | Included in real 49-suite unit discovery |
| [src/services/__tests__/loanEngine.test.ts](</Volumes/ssd12/SparowVault/230826 SparowVault/src/services/__tests__/loanEngine.test.ts>) | Included in real 49-suite unit discovery |
| [src/services/__tests__/obligationEngine.test.ts](</Volumes/ssd12/SparowVault/230826 SparowVault/src/services/__tests__/obligationEngine.test.ts>) | Included in real 49-suite unit discovery |
| [src/services/__tests__/personaEngine.test.ts](</Volumes/ssd12/SparowVault/230826 SparowVault/src/services/__tests__/personaEngine.test.ts>) | Included in real 49-suite unit discovery |
| [src/services/__tests__/phase10Engines.test.ts](</Volumes/ssd12/SparowVault/230826 SparowVault/src/services/__tests__/phase10Engines.test.ts>) | Included in real 49-suite unit discovery |
| [src/services/__tests__/planFeatureGate.test.ts](</Volumes/ssd12/SparowVault/230826 SparowVault/src/services/__tests__/planFeatureGate.test.ts>) | Included in real 49-suite unit discovery |
| [src/services/__tests__/sharedLimitMatrix.test.ts](</Volumes/ssd12/SparowVault/230826 SparowVault/src/services/__tests__/sharedLimitMatrix.test.ts>) | Included in real 49-suite unit discovery |
| [src/services/__tests__/smartBudgetEngine.test.ts](</Volumes/ssd12/SparowVault/230826 SparowVault/src/services/__tests__/smartBudgetEngine.test.ts>) | Included in real 49-suite unit discovery |
| [src/services/__tests__/transactionFormRules.test.ts](</Volumes/ssd12/SparowVault/230826 SparowVault/src/services/__tests__/transactionFormRules.test.ts>) | Included in real 49-suite unit discovery |
| [src/services/__tests__/transactionPreview.test.ts](</Volumes/ssd12/SparowVault/230826 SparowVault/src/services/__tests__/transactionPreview.test.ts>) | Included in real 49-suite unit discovery |
| [src/services/__tests__/transferReceivedMoney.test.ts](</Volumes/ssd12/SparowVault/230826 SparowVault/src/services/__tests__/transferReceivedMoney.test.ts>) | Included in real 49-suite unit discovery |
| [src/services/__tests__/udhariEngine.test.ts](</Volumes/ssd12/SparowVault/230826 SparowVault/src/services/__tests__/udhariEngine.test.ts>) | Included in real 49-suite unit discovery |
| [src/utils/__tests__/money.test.ts](</Volumes/ssd12/SparowVault/230826 SparowVault/src/utils/__tests__/money.test.ts>) | Included in real 49-suite unit discovery |
| [tests/account-endpoints-e2e.mjs](</Volumes/ssd12/SparowVault/230826 SparowVault/tests/account-endpoints-e2e.mjs>) | Executed; see results and caveats |
| [tests/api-e2e.mjs](</Volumes/ssd12/SparowVault/230826 SparowVault/tests/api-e2e.mjs>) | Executed; see results and caveats |
| [tests/api-vnext-collections-e2e.mjs](</Volumes/ssd12/SparowVault/230826 SparowVault/tests/api-vnext-collections-e2e.mjs>) | Executed; see results and caveats |
| [tests/browser-a11y-e2e.mjs](</Volumes/ssd12/SparowVault/230826 SparowVault/tests/browser-a11y-e2e.mjs>) | Present, not executed during this audit |
| [tests/browser-cloud-e2e.mjs](</Volumes/ssd12/SparowVault/230826 SparowVault/tests/browser-cloud-e2e.mjs>) | Present, not executed during this audit |
| [tests/browser-deep-e2e.mjs](</Volumes/ssd12/SparowVault/230826 SparowVault/tests/browser-deep-e2e.mjs>) | Present, not executed during this audit |
| [tests/browser-e2e.mjs](</Volumes/ssd12/SparowVault/230826 SparowVault/tests/browser-e2e.mjs>) | Executed; see results and caveats |
| [tests/browser-finance-vnext-e2e.mjs](</Volumes/ssd12/SparowVault/230826 SparowVault/tests/browser-finance-vnext-e2e.mjs>) | Executed; see results and caveats |
| [tests/browser-manual-qa-e2e.mjs](</Volumes/ssd12/SparowVault/230826 SparowVault/tests/browser-manual-qa-e2e.mjs>) | Present, not executed during this audit |
| [tests/browser-offline-finance-e2e.mjs](</Volumes/ssd12/SparowVault/230826 SparowVault/tests/browser-offline-finance-e2e.mjs>) | Executed; see results and caveats |
| [tests/local-phase-09-ui-browser-e2e.mjs](</Volumes/ssd12/SparowVault/230826 SparowVault/tests/local-phase-09-ui-browser-e2e.mjs>) | Present, not executed during this audit |
| [tests/local-phase-10-privacy-audit-e2e.mjs](</Volumes/ssd12/SparowVault/230826 SparowVault/tests/local-phase-10-privacy-audit-e2e.mjs>) | Present, not executed during this audit |
| [tests/phase-00-runtime-browser.mjs](</Volumes/ssd12/SparowVault/230826 SparowVault/tests/phase-00-runtime-browser.mjs>) | Present, not executed during this audit |
| [tests/phase-04-validation-e2e.mjs](</Volumes/ssd12/SparowVault/230826 SparowVault/tests/phase-04-validation-e2e.mjs>) | Executed; see results and caveats |
| [tests/sql-smoke.php](</Volumes/ssd12/SparowVault/230826 SparowVault/tests/sql-smoke.php>) | Present, not executed during this audit |
| [tests/unit/aiGuardrails.test.ts](</Volumes/ssd12/SparowVault/230826 SparowVault/tests/unit/aiGuardrails.test.ts>) | Included in real 49-suite unit discovery |
| [tests/unit/billingPhase14Static.test.ts](</Volumes/ssd12/SparowVault/230826 SparowVault/tests/unit/billingPhase14Static.test.ts>) | Included in real 49-suite unit discovery |
| [tests/unit/caReports.test.ts](</Volumes/ssd12/SparowVault/230826 SparowVault/tests/unit/caReports.test.ts>) | Included in real 49-suite unit discovery |
| [tests/unit/categoryColorEngine.test.ts](</Volumes/ssd12/SparowVault/230826 SparowVault/tests/unit/categoryColorEngine.test.ts>) | Included in real 49-suite unit discovery |
| [tests/unit/financeCrossView.test.ts](</Volumes/ssd12/SparowVault/230826 SparowVault/tests/unit/financeCrossView.test.ts>) | Included in real 49-suite unit discovery |
| [tests/unit/importExportRepair.test.ts](</Volumes/ssd12/SparowVault/230826 SparowVault/tests/unit/importExportRepair.test.ts>) | Included in real 49-suite unit discovery |
| [tests/unit/localCombinationMatrix.test.ts](</Volumes/ssd12/SparowVault/230826 SparowVault/tests/unit/localCombinationMatrix.test.ts>) | Included in real 49-suite unit discovery |
| [tests/unit/phase-01-secrets.test.ts](</Volumes/ssd12/SparowVault/230826 SparowVault/tests/unit/phase-01-secrets.test.ts>) | Included in real 49-suite unit discovery |
| [tests/unit/phase-02-sync-contracts.test.ts](</Volumes/ssd12/SparowVault/230826 SparowVault/tests/unit/phase-02-sync-contracts.test.ts>) | Included in real 49-suite unit discovery |
| [tests/unit/phase-03-money-contract.test.ts](</Volumes/ssd12/SparowVault/230826 SparowVault/tests/unit/phase-03-money-contract.test.ts>) | Included in real 49-suite unit discovery |
| [tests/unit/privacyPhase15Static.test.ts](</Volumes/ssd12/SparowVault/230826 SparowVault/tests/unit/privacyPhase15Static.test.ts>) | Included in real 49-suite unit discovery |
| [tests/unit/smoke.test.ts](</Volumes/ssd12/SparowVault/230826 SparowVault/tests/unit/smoke.test.ts>) | Included in real 49-suite unit discovery |
| [tests/unit/suggestionAiExplain.test.ts](</Volumes/ssd12/SparowVault/230826 SparowVault/tests/unit/suggestionAiExplain.test.ts>) | Included in real 49-suite unit discovery |
| [tests/unit/suggestionEngine.test.ts](</Volumes/ssd12/SparowVault/230826 SparowVault/tests/unit/suggestionEngine.test.ts>) | Included in real 49-suite unit discovery |
| [tests/unit/syncOutbox.test.ts](</Volumes/ssd12/SparowVault/230826 SparowVault/tests/unit/syncOutbox.test.ts>) | Included in real 49-suite unit discovery |
| [tests/unit/vnextFinanceMigrationGolden.test.ts](</Volumes/ssd12/SparowVault/230826 SparowVault/tests/unit/vnextFinanceMigrationGolden.test.ts>) | Included in real 49-suite unit discovery |
| [tests/webhook-ownership-e2e.mjs](</Volumes/ssd12/SparowVault/230826 SparowVault/tests/webhook-ownership-e2e.mjs>) | Executed; see results and caveats |
| [tests/webhook-replay-e2e.mjs](</Volumes/ssd12/SparowVault/230826 SparowVault/tests/webhook-replay-e2e.mjs>) | Executed; see results and caveats |

## Explicit untested areas

Paid populated Reports UI; every dialog/disabled action; production HTTPS/CSP/proxy configuration; real Razorpay checkout/refund/settlement; outbound notification delivery; physical mobile browsers; all accessibility standards; database upgrade/rollback on every historical snapshot; encrypted full restore; all deployment packaging variants; all field/enum combinations; 100k+ browser/SQL workloads; new agency flows with no implementation. The audit is extensive but finite. These gaps are release work, not hidden passes.
