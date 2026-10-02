# Candidate freeze

- Run ID: `SV-VERIFY-20260930-202153-be89afba`
- Branch: `master`
- HEAD: `6395ec9a040652a39a45b72ac12136cdd382df33`
- HEAD subject: Record the company certification work and keep Cash & Bank on its own page.
- Dirty porcelain lines at freeze: 138
- Parser pins: `pdfjs-dist` 5.4.624, `tesseract.js` 7.0.0, `@tesseract.js-data/eng` 1.0.0
- IndexedDB name in product code: `sparowvault_v1`
- Disposable MySQL used for mutation: `sparowvault_verify_test`
- Second empty database created and not loaded: `sparowvault_verify_restore`
- Configured application database name does not contain `test` (length 11). It was not reset.
- Authority file hashes: `AUTHORITY_HASHES.txt`. Re-hash at the end matched all of them.
- `productSourceModifiedDuringAudit`: false

# Missing companion sources

These files were not in the workspace. They were not reconstructed and presented as originals.

- `SparowVault_83_Surface_Completion_Master_Playbook_2026-09-30.md`
- `ALL_83_SURFACES.md`
- `SURFACE_COMPLETION_MANIFEST.json`
- `PHASE_DEPENDENCIES.json`
- `SYNTHETIC_FINANCE_ACCEPTANCE.json`
- the testing-pack zip

Substitutes on disk, treated as a reading copy and not as launch evidence: `docs/current-product-inventory/2026-09-30/`. SV31 closure and remaining-work notes are historical claims only.

# Disposable database guard

| Probe | Exit | Result |
|---|---:|---|
| `TEST_DB_NAME=sparowvault_production` | 2 | Refused before any drop |
| `TEST_DB_NAME=owner_books_sentinel` | 2 | Refused before any drop |
| `TEST_DATABASE_URL` pointed at `sparowvault_live` with a wrong password | 1 | The name check did not run. MySQL returned access denied. No tables were dropped. |

The URL path is finding F-001.
