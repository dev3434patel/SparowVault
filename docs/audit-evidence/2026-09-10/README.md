# Audit Evidence Index

Audit date: 10 September 2026 (Asia/Kolkata). Repository: SparowVault. Baseline HEAD: `54eec068a37cceb9cccc2a63dca824e1e092f52e`. Scope includes the pre-existing local modifications. This is an audit-only deliverable, not a remediation or production certificate.

## Reports

- [docs/CURRENT-FULL-A-TO-Z-AUDIT-REPORT.md](</Volumes/ssd12/SparowVault/230826 SparowVault/docs/CURRENT-FULL-A-TO-Z-AUDIT-REPORT.md>)
- [docs/MODULE-WISE-AUDIT.md](</Volumes/ssd12/SparowVault/230826 SparowVault/docs/MODULE-WISE-AUDIT.md>)
- [docs/API-AUDIT.md](</Volumes/ssd12/SparowVault/230826 SparowVault/docs/API-AUDIT.md>)
- [docs/UI-UX-AUDIT.md](</Volumes/ssd12/SparowVault/230826 SparowVault/docs/UI-UX-AUDIT.md>)
- [docs/FINANCE-CALCULATION-AUDIT.md](</Volumes/ssd12/SparowVault/230826 SparowVault/docs/FINANCE-CALCULATION-AUDIT.md>)
- [docs/RBAC-SECURITY-AUDIT.md](</Volumes/ssd12/SparowVault/230826 SparowVault/docs/RBAC-SECURITY-AUDIT.md>)
- [docs/BUGS-AND-GAPS-REPORT.md](</Volumes/ssd12/SparowVault/230826 SparowVault/docs/BUGS-AND-GAPS-REPORT.md>)
- [docs/TESTING-COVERAGE-REPORT.md](</Volumes/ssd12/SparowVault/230826 SparowVault/docs/TESTING-COVERAGE-REPORT.md>)
- [docs/PRODUCTION-READINESS-REPORT.md](</Volumes/ssd12/SparowVault/230826 SparowVault/docs/PRODUCTION-READINESS-REPORT.md>)

## Evidence families

| Artifact | Meaning |
| --- | --- |
| source-inventory.json | Source manifest/SHA256, AST page/field/action/function/type and static endpoint candidates. Static endpoint method/auth approximations are corrected by endpoints-reviewed.json. |
| endpoints-reviewed.json / ENDPOINT-INVENTORY.md | Reviewed 40-file / 58-method-pair API surface. |
| findings.json | Canonical severity register; counts must be derived here. |
| database-schema.json | Current database columns/keys/version only, no existing user financial rows. |
| *.result.json / *.log | Exact child commands, elapsed time, exit result and redacted output. |
| coverage/coverage-summary.json | Measured service/lib coverage with documented CLI exclusion scope. |
| browser-audit.json / screenshots | Completed 30-route/10-width sample and selected images; paid/gated/disabled states identified. |
| finance-probes.json / finance-period-fixture.xlsx | Synthetic source-function assertions and generated workbook. |
| security-probes.json / extra-probes.json | Synthetic local adversarial/durability/restore/wipe probes; no production exploits. |
| attempt* | Superseded harness attempts kept for transparency, excluded from final passing coverage. |
| harness | Exact audit helper sources; test-only configuration, not application changes. |

## Reproduction safety

Run from the repository root. The harnesses were originally run from `/tmp/sparow-audit-*.mjs` / `.mts`, and the runtime orchestrator still references those original paths. To reproduce unchanged commands, copy the preserved harness files back to the matching /tmp paths first, or deliberately update only harness references. The source-function finance harness contains absolute local source paths for this workspace. The report generator references the attached brief path.

Only use the disposable database `sparowvault_audit_test_20260910` (or deliberately review and change all test-only references together). The reset command drops/recreates tables in that test database. Never target `sparowvault` or a real environment. Runtime servers use 8086/5176; verify ports are free. Fake JWT/webhook credentials embedded in the harness are audit-only placeholders and must never be deployed.

Browser restore/wipe probes intentionally create and delete synthetic records in the isolated database. Existing user runtime/services are not to be restarted or reset by reproducing the audit. Temporary servers are stopped by the orchestrator finally block. The synthetic test database is retained for evidence and can be removed later with explicit user approval.

## Final counts

{"Critical":2,"High":21,"Medium":14,"Low":2}; 39 total findings. Main report has all 25 required sections; module matrix has 30 brief modules; formula matrix has 46 requested calculations. The source action/function inventories are static coverage, not executed-click/function coverage.
