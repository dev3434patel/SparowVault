# Statement, Contribution And Security Expansion

## Release Decision

11 September 2026: this is a tested local implementation increment, **not whole-project completion or production certification**. Hosted staging has not been deployed. Arbitrary PDFs, every Indian bank/channel, complete agency modules and the full legacy reporting/restore/wipe surface are not certified.

The [bank research report](INDIAN-BANK-INGESTION-RESEARCH.md) contains the bank/channel evidence matrix, OCR architecture, password handling, Google Patents assessment, accounting policy, acceptance corpus and six detailed implementation work orders. The older [finding-specific and agency prompts](IMPLEMENTATION-PROMPTS.md) remain the broader backlog. Historical audit counts are not a new post-remediation bug count.

## Implemented

### Statements

- Header upload continues to support bank/account selection, local PDF password entry, source-page viewing, month filtering, classification review, reconciliation and approved import.
- Shared frontend/PHP bank registry now contains 37 named banks plus an explicit generic choice. **Names are not certified adapters**. Brand-overlap tests distinguish Bank of India from State/Central/Union Bank of India and Indian Bank from South Indian Bank, without hiding a genuine second bank heading.
- Local Tesseract.js OCR is added for low-text pages and forced-OCR mode. Worker, language and WebAssembly assets are pinned and self-hosted. PDF bytes and passwords are not sent to a third-party service.
- OCR-derived statements carry a separate parser version and explicit source-confirmation gate, enforced by both UI and import API and retained in source provenance.
- Cancellation, worker termination, startup/page timeouts and resource limits are implemented. Invalid amounts, unsupported tables, poor recognition and unresolved balances block import instead of creating guessed entries.
- Boundaries: 20 MB per PDF, 60 PDF pages, at most 12 OCR pages, English OCR, 9-million-pixel OCR canvas and 20-million-pixel source-image cap. Unsupported rotation, poor scans, handwriting, arbitrary multilingual layouts and all hybrid variants remain unvalidated or blocked. OCR field correction is not yet a full editable workflow.

### Shared Expenses

The original expense has a “Record contribution return” action. The form links the receipt to that expense, offers a distinct contribution purpose and enforces the remaining recoverable amount. The transaction list shows contribution returns separately and shows recovered/net cost beneath the original expense.

| Event | Bank/cash effect | Expense effect | Income effect |
| --- | ---: | ---: | ---: |
| Shared meal paid | -INR 400 | +INR 400 | 0 |
| Friend returns contribution | +INR 200 | -INR 200 | 0 |
| Net | -INR 200 | INR 200 | 0 |

Canonical storage is `type=refund`, `transactionIntent=expense_contribution`, with an owned `linkedOriginalTransactionId`. The original payment is preserved. Merchant refunds and contributions share one recovery limit. Server-side owner locks stop concurrent returns from exceeding the original expense; edits and parent deletion are validated. The statement review purpose selector also supports contributions.

Income rollups exclude contribution returns and reimbursement settlements. Category breakdown, fallback budgets, business/personal expense reports and selected workbook summaries now account for expense recoveries. Merchant/need-want/payment-mode cost reports attribute a linked return to the original cost dimensions while retaining the receipt date and actual stored cash leg. Pure-function and parsed-workbook tests cover the INR 400/200 example.

Limits: mixed-scope expenses and employer receivables are deliberately blocked from this contribution flow pending explicit allocation policy. Same-statement expense/return linking currently requires the original expense to be imported first. Participant shares, outstanding friend receivables and multi-expense allocation are not implemented. Later-month returns follow receipt-date cash-basis reporting, not retroactive rewriting of the original month. This is not a GST or accrual-accounting certification.

### Security

- Database-backed, credential-bound sessions reject old bearer tokens after logout or PIN changes. Current database role/active state is checked on authenticated requests.
- Recovery hashes use a separate salt. Recovery changes require the current PIN. PIN changes use a compare-and-swap credential precondition to prevent concurrent overwrites.
- Temporary PIN changes are enforced at financial API access and routed to a dedicated frontend form.
- Cookie mutations receive centralized CSRF protection. Valid `me` reads no longer rotate CSRF tokens; the frontend prefers a current cookie over stale per-tab storage.
- Forwarded client IPs are used only with explicitly trusted proxies. Arbitrary/opaque origins no longer receive credentialed CORS in development. Rate-limit storage failure fails closed.
- PHP's development router refuses repository configuration, source, dumps, dependency and internal paths.
- Profile refresh now reloads the authenticated profile. Admin portal state supports non-default admin usernames. Failed online logout is explicitly distinguished from local-session closure.

This does not complete MFA, account-based distributed attack resistance, all recovery/sensitive-action concurrency, device/session management, all administrative error handling, authoritative user-visible audit or production proxy/TLS validation. API-level forced-PIN coverage is not an exhaustive admin/browser-role matrix.

### Dependencies

SheetJS now uses the official pinned 0.20.3 tarball. Vite is pinned to 7.3.6, its React plugin to 5.2.0, and Vitest/coverage to 4.1.11. Audited compatible updates and explicit `esbuild=0.28.2` / `qs=6.16.0` overrides remove the remaining reported dependency findings. OCR dependencies are pinned to Tesseract.js 7.0.0 and English data 1.0.0.

`npm audit --json` returned **zero known vulnerabilities** after these changes. This is a time-specific registry result, not proof that dependencies or the application are vulnerability-free. Node 20.20.2 was the available local test runtime; selecting and verifying a currently supported deployment runtime is still a release requirement.

### Database Backup

`scripts/backup_db.php` now requires a private absolute `BACKUP_DIR` outside the application/web root. It is CLI-only, uses private temporary client configuration instead of a password argument, requests a consistent InnoDB dump with routines/events/triggers, and publishes a SHA-256 manifest only after successful completion. Non-InnoDB sources require a separate maintenance-window policy. The old inconsistent PDO fallback is removed.

The new test creates a real SQL dump from a disposable database, restores that dump into another newly created disposable database, compares every base table's complete contents by hash, checks foreign-key presence and verifies the source was unchanged. It also checks private file permissions and cleanup after a failed dump. Both test databases and temporary dumps are removed afterwards.

The backup output is explicitly **unencrypted** and `restoreVerified=false` until separately restored. No encrypted off-site retention, production recovery-time/recovery-point guarantee or disaster-recovery certification is implied. Full-profile JSON export/restore and profile wipe remain separate, unfinished repairs.

## Verification

Final run completed at 05:48:45 UTC on 11 September 2026:

| Gate | Result |
| --- | --- |
| TypeScript / ESLint | Pass |
| Unit suite | 410 / 410 tests, 52 files |
| Isolated development API, backup and browser suite | 63 / 63 checks |
| Production-artifact API, backup and browser rerun | 54 / 54 checks; overlaps intentionally with the development suite |
| Production build | Pass |
| API/backend PHP syntax | 81 / 81 files; backup CLI also separately checked and executed |
| Dependency audit | 0 known vulnerabilities at the recorded check |
| Supplied Kotak PDF | 1,240 rows, 8,680 fields, 0 mismatches; no import |

These counts describe the named suites, not exhaustive verification of every legacy page or all agency functionality.

Fresh logs and source hashes are in [the evidence directory](statement-evidence/2026-09-11-expansion/verification.json). The complete verification command is:

```bash
STATEMENT_EVIDENCE_DIRECTORY=docs/statement-evidence/2026-09-11-expansion npm run verify:statements
```

This runs TypeScript, lint, all unit tests, isolated multi-worker PHP/MariaDB and browser regressions, production build, and production-artifact browser tests. The artifact browser applies the CSP read from `.htaccess` to responses so that PDF/OCR workers run under that policy. This validates policy compatibility, **not actual Apache/TLS header delivery on a hosted server**. `php -l` also covers API/backend files; the backup script is syntax checked and executed in its restore test.

The supplied private Kotak statement was rechecked on the running preview using the independent pdfplumber oracle. [Sanitized result](statement-evidence/2026-09-11-expansion/local-kotak-validation.json): 36 pages, 1,240 rows, 8,680 field comparisons, zero mismatches, matching opening/closing balances, all 12 months, pagination and mobile containment. No import requests were made, and the original file hash was unchanged. This is evidence for that document only.

Desktop/mobile screenshots in the evidence directory include the contribution form, PDF review, local OCR, and durable pending-change workflow. Those screenshots contain synthetic fixtures, not the private Kotak statement.

## Preview And Migration

Local preview: [http://127.0.0.1:5178/](http://127.0.0.1:5178/). API: `http://127.0.0.1:8088`. Demo username `review_demo`, PIN `583921`. These are synthetic local credentials, never deployment credentials. XAMPP Apache and MariaDB are running, and the application health endpoint reports database availability.

The preview database remains `sparowvault_integrity_preview_test`. Its existing records were retained. A private SQL snapshot was created before applying the session/recovery migration; only the recorded preview process groups were restarted. Other databases and unrelated XAMPP services were not reset. Existing browser sessions from the older implementation need a fresh login.

For an existing deployment, take a verified backup and use the exact database name before applying:

```bash
php php/scripts/migrate_security_sessions.php --database=EXACT_DATABASE_NAME --apply
```

The additive migration is shipped as `20260911_security_sessions.sql` in the hosting artifact and follows the earlier atomic-write migration. It invalidates legacy session tokens by design. Its recovery backfill preserves answers that still match the old PIN salt; it cannot repair answers already broken by a historical PIN change. Test on a copy of the target database before rollout. This migration has been exercised on local MariaDB/XAMPP, not every MySQL/server version.

## Remaining Release Gates

| Area | Remaining work |
| --- | --- |
| Bank coverage | Real specimens and independent field-level validation for each bank, product and export channel; 37 selector entries are not 37 certified layouts. |
| OCR | Larger/rotated/multilingual/low-quality corpora, hybrid detection, correction provenance/editor, real-device resource testing. No universal PDF guarantee. |
| Contributions | Mixed allocations, participant receivables, same-batch linking and accountant-approved business policy. |
| Security | Full role/action matrix, sensitive-operation transactions, stronger recovery/MFA, complete authoritative audit, supported runtime and real deployment headers/proxy tests. |
| Backup/restore/wipe | Contract-complete profile backup, identity/reference-safe transactional restore, complete owner-scoped wipe, encryption/off-site retention and production restore drill. |
| Reports/exports | All-period consistency, legacy noncanonical fields, reversal/cash-accrual semantics, negative-category chart presentation, duplicate sheet names, numeric master cells, CSV formula safety, independent reconciliation and full mixed-allocation workbook behavior. Selected contribution summaries being fixed does not close this whole area. |
| Product breadth | The agency clients/projects/quotations/invoices/GST/partners/approvals/month-close/document workflows in the original brief are not all present in SparowVault. |
| Operations | Hosted staging, least-privilege credentials, payment-provider lifecycle, notification/alert delivery, load tests, incident recovery and release approval. |

No commit, push or production deployment was performed in this increment. Existing unrelated local changes are preserved. Repository-wide `git diff --check` still reports a pre-existing trailing-space line in `README.md`; it was not silently rewritten as part of these feature changes.
