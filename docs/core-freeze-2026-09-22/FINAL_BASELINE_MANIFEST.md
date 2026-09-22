# FINAL_BASELINE_MANIFEST.md

## Identity

| Field | Value |
|-------|--------|
| Freeze ID | `SPAROWVAULT_CORE_VNEXT_SOFTWARE_COMPLETE` |
| Date | 2026-09-22 |
| Git HEAD (at evidence capture) | `9559e9d182895d21cd1036e50501919380fab047` |
| Branch | `feat/statement-intelligence-v2` |
| package.json version | `0.1.0` |
| package-lock SHA-256 | see `evidence/BUILD_HASHES.txt` |
| Build | `npm run build` exit 0 |
| Schema | restore drill reports `schema_version` (see evidence) |

## Package contents

- `FINAL_PROJECT_STATUS.md`
- `FINAL_FINANCE_CERTIFICATION.md`
- `FINAL_STATEMENT_CERTIFICATION.md`
- `FINAL_OPEN_GAPS.md`
- `MASTER_AUDIT_REPORT.md` (copy)
- `evidence/` — command logs, checksums, matrices, deferred checklists
- Tag recommendation: `core-vnext-software-complete-2026-09-22` (create when committing)

## Working tree note

Uncommitted local changes may exist (statement Review-all UX, gate-runner vitest fix, syncContracts.generated.json, freeze docs). Re-record HEAD after the freeze commit.
