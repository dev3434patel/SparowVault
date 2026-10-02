# Audit change log

Product source, tests, expected numbers, and historical reports were not edited.

| Action | Where |
|---|---|
| Created the run directory and evidence scripts | this folder only |
| Created MySQL databases `sparowvault_verify_test` and `sparowvault_verify_restore` | local server, names contain `test` |
| Reset and migrated only `sparowvault_verify_test` | `scripts/db-test-reset.mjs` plus company SQL |
| Inserted synthetic users Alice, Bob, and Gamma | verify database only |
| Built the client into `package/dist` | this folder |
| Ran finance gates | copied new phase reports here and deleted them from the repo root |
| Restored `docs/certification/PHASE_L_VNEXT_FINANCE_GATE_REPORT.md` | hash matched the pre-run snapshot |
| Re-hashed authority files | 0 mismatches |

`productSourceModifiedDuringAudit`: false
