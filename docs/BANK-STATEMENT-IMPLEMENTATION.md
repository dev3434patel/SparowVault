# Bank Statement Implementation and Solution Prompts

Follow-up, 11 September 2026: [Kotak real-layout repair and actual-source verification](KOTAK-STATEMENT-FIX.md). The later fix extracts the supplied 36-page statement and independently verifies 1,240 rows. This document's initial synthetic-only evidence and counts below remain the 10 September baseline, not the latest validation state.

## Release Status

Verified on 10 September 2026 against the uncommitted SparowVault worktree. **Available for local synthetic evaluation. Hosted staging is not deployed. Real-finance production remains NO-GO.** This document supplements, rather than replaces, the earlier [implementation register](IMPLEMENTATION-STATUS.md) and [39 repair / 20 agency prompts](IMPLEMENTATION-PROMPTS.md).

The [research report](BANK-STATEMENT-RESEARCH.md) covers official bank sources, local PDF extraction, OCR and hosted alternatives, Google Patents, accuracy measurement and release gates. No authentic bank statement samples have been supplied for this implementation. Agreement to provide samples is not validation evidence.

## Available Preview

- Application: [http://127.0.0.1:5178/](http://127.0.0.1:5178/).
- Synthetic username: `review_demo`; PIN: `583921`. This is an ordinary demo account, not a production administrator.
- Destination for fixture tests: `Statement Demo Bank`, with synthetic opening balance INR 10,000. Salary and Food & Dining categories are available.
- Header action: upload icon, accessible name and tooltip `Upload bank statement`.
- Backend: `http://127.0.0.1:8088`, using only `sparowvault_integrity_preview_test`.

The existing original profile/database was not reset. This feature required no additional migration beyond the earlier atomic-write foundation. The final runtime check confirmed MariaDB 10.4.28 accepts a connection to the preview database, and XAMPP Apache responds on port 80 with a redirect to its dashboard. The XAMPP status script cannot read the MySQL PID file as this user and incorrectly reports it stopped; the successful SQL connection is the stronger check. No service restart was performed in this increment. The preview still uses PHP's development server on 8088, not an Apache project deployment; the project's production Apache configuration remains unverified. This preview is not publicly hosted staging.

The persistent-preview smoke test logged in, opened the header action at 360px, extracted the synthetic PDF, completed the review controls, inspected monthly analysis and reloaded successfully. It made **zero statement-import requests**. [Preview evidence](statement-evidence/2026-09-10/preview-smoke.json), [screenshot](statement-evidence/2026-09-10/screenshots/preview-statement-review.png).

## Implemented Scope

| Area | Implemented behavior | Boundary |
| --- | --- | --- |
| Header upload | Lazy-loaded dialog, bank auto-detect/selection, destination account, file picker/drop, progress/cancel. | Existing active bank/savings/current/debit-linked account required; no automatic account creation from a PDF. |
| Protected PDFs | Local password prompt, wrong-password retry, cancellation and cleanup; AES-256 synthetic file verified. | Known password only; no guessing, recovery service or universal bank password formula. |
| Extraction | Supported text-table header aliases, transaction/value dates, narration, reference, debit/credit, running balances, printed/inferred period and month filtering. | Five synthetic bank-labeled layout families, not all real layouts from those banks. |
| Financial checking | Integer paise, one positive movement direction, actual calendar dates, every running balance, opening/closing equality and chronological order. | Arithmetic agreement does not establish authenticity or page/transaction completeness. |
| Analysis | Monthly debit/credit totals, separately reviewed income/expenses/refunds, search and review/duplicate filters. | Existing CA/tax and other report engines are not re-certified by this feature. |
| Review | Read-only extracted financial fields; editable source opening/closing confirmation; purpose, existing category, scope and linked record decisions; per-row/bulk explicit confirmation. | Unknown purpose and personal/business scope are not silently guessed. Invalid extraction blocks the entire file. |
| Evidence | Source-page preview, page navigation, zoom, source-page links and review JSON download. | No original-PDF persistence, OCR overlays or authenticity verification. JSON export contains sensitive transaction information. |
| Posting | Authenticated, CSRF-protected, throttled, owned-record validated, idempotent and atomic batch endpoint. | Online-only. Pending ordinary outbox mutations must be resolved before import. |
| Duplicate protection | Exact row fingerprints, identical request replay and possible-existing-transaction warnings defaulting to excluded. | Not full fuzzy matching or automatic two-statement transfer reconciliation. |
| Domain links | Transfers post both account legs; card payments reduce cash/liability; refunds link to an original expense, category and remaining amount. | Loan/EMI/investment/mandate rows need dedicated existing workflows and are not automatically posted by this importer. |

Supported import purposes are `income`, `expense`, `transfer`, `refund` and `cc_payment`. Transfer and card-payment rows do not create income/expense categories. A refund cannot predate its linked expense or exceed the remaining refundable amount in the tested import path.

Review state is intentionally ephemeral. Closing/replacing a parsed document asks for confirmation; reloading loses unimported review changes. Download is an evidence export, not an implemented review restore function. An uncertain network result should be retried with the same review so its deterministic mutation key can retrieve the committed response. Re-uploading the same source also has fingerprint protection, but is not a substitute for a durable import-session recovery design.

## Code and API

| File | Responsibility |
| --- | --- |
| [Header.tsx](../src/components/layout/Header.tsx) | Upload entry point and lazy loading. |
| [StatementImportDialog.tsx](../src/components/statements/StatementImportDialog.tsx) | File/password flow, analysis/review/source preview, confirmation and posting. |
| [pdf.ts](../src/services/statements/pdf.ts) | Bounded local PDF.js loading, geometry extraction, hash and cleanup. |
| [parser.ts](../src/services/statements/parser.ts) | Strict normalization, table extraction and reconciliation. |
| [classification.ts](../src/services/statements/classification.ts) | Explainable suggestions, duplicate hints, decision checks and monthly totals. |
| [types.ts](../src/services/statements/types.ts) | Bank, extraction, review and API contracts. |
| [statement.php](../api/import/statement.php) | POST-only endpoint and safe error boundary. |
| [statements.php](../php/controllers/statements.php) | Server validation, linked semantics, duplicates and atomic posting. |

`POST /api/import/statement.php` accepts reviewed JSON, never a multipart PDF. Its top-level fields are `userId`, `accountId`, `bank`, `documentHash`, `parserVersion`, `openingPaise`, `closingPaise`, `order`, `rows` and `mutationId`. Every row includes its extracted fields, page, empty extraction-issues list and an explicit decision. Unknown fields, including a supplied password, are rejected. Monetary values are bounded integer paise.

The server rechecks the full statement including excluded rows. Only after validation does it save transactions through the existing shared atomic writer, producing financial effects and server audit in the same database transaction. Imported transactions retain limited `statementSource` provenance; source hash and client-extracted metadata are not proof of bank authenticity. The existing collection schema registry now permits this optional transaction field.

No new database table is required by this increment, but the Stage 1 receipt/tombstone migration must already exist. See [atomic-write rollout](ATOMIC-WRITES-ROLLOUT.md). There was no commit, push, public deployment or hosting ZIP certification in this increment. Existing unrelated worktree changes remain preserved.

## Verification Evidence

Final collector: `npm run verify:statements`. [Command results](statement-evidence/2026-09-10/verification.json), [source SHA-256 manifest](statement-evidence/2026-09-10/source-hashes.json), [development scenarios](statement-evidence/2026-09-10/atomic-writes.json), [production-artifact scenarios](statement-evidence/2026-09-10/production-artifact.json).

| Check | Result | Exact scope |
| --- | --- | --- |
| TypeScript | PASS | `npm run typecheck`. |
| ESLint | PASS | Normal repository lint command. |
| Unit suite | PASS | 375 tests in 51 files; 44 statement parser/classification tests. |
| API and browser suite | PASS | 47 scenarios: 18 existing integrity API, 14 statement API, 9 durable-outbox browser and 6 statement browser. |
| Production artifact | PASS | 38 scenarios: the same 32 API checks plus 6 statement browser checks, using `vite preview` and built assets. These are reruns, not 38 additional unique cases. |
| PHP syntax | PASS | 79 non-metadata API/PHP files. |
| Production build | PASS with warnings | 3,460 modules; main JS 2,108.67 kB, gzip 624.04 kB; lazy statement chunk 488.68 kB; PDF worker 1,078.61 kB. Existing main-bundle size remains open. |
| PDF rendering | PASS | Actual PDF.js source canvas and nonblank pixel check; page/zoom controls; AES-256 missing/wrong/correct password. |
| Responsive review | PASS in tested Chromium | Screenshots at 1440, 768, 390 and 360px; contained table overflow. Persistent preview additionally exercised review controls at 360px. |
| Dependency audit | FAIL | 19 affected dependency nodes: 4 critical, 7 high, 7 moderate and 1 low. |
| Production-classified dependency audit | FAIL | 5 affected nodes: 2 high and 3 moderate. |
| Real-bank accuracy | NOT MEASURED | No authorized representative real samples / independent golden labels. |

The PDF fixtures comprise five bank-labeled native-text files, one AES-256 protected HDFC-labeled file, one two-page fixture and one image-only file. They reuse a small controlled transaction example and are not an independent real-bank benchmark. The fixture generator is [generate.py](../tests/fixtures/statements/generate.py); all its customer information is synthetic. The unit suite adds adversarial money/date/layout/reconciliation cases beyond those PDFs.

Statement API tests cover method/auth/CSRF, invalid balances and dates, foreign links, required review/scope, eight concurrent identical imports, re-export deduplication, changed-key-content conflicts, provenance, wrong-account re-upload, excluded-row validation, transfers, refund rollback/success, card-payment effects and the 20-per-minute throttle. Valid refund and card-payment effects are API/database tested; those two selection workflows do not yet have a separate full browser test.

The artifact test sets `VITE_API_BASE_URL` and `VITE_API_TARGET` empty for its build, without editing `.env.local`, then permits browser traffic only to its own isolated frontend/API. Each integration run creates a fresh disposable MariaDB database with four PHP workers and cleans up only its own resources. No tests send PDFs to a hosted OCR or AI vendor.

Screenshots: [desktop source review](statement-evidence/2026-09-10/screenshots/statement-desktop.png), [360px](statement-evidence/2026-09-10/screenshots/statement-360.png), [390px](statement-evidence/2026-09-10/screenshots/statement-390.png), [768px](statement-evidence/2026-09-10/screenshots/statement-768.png). Raw command logs are alongside the JSON evidence but are ignored by Git's log rule; preserve them explicitly in a later evidence archive.

During development, tests exposed a statement-throttle collision between independent test scenarios. The fixture now clears only its disposable database's statement-import throttle bucket between scenarios and separately proves the limit; the production throttle was not disabled. The first persistent-preview check encountered Vite's one-time optimization reload after adding PDF.js; the preview passed after optimization completed. The final source also includes a regression preventing transaction narration containing an opening-balance phrase from being treated as statement metadata.

The dependency snapshots are [full audit](statement-evidence/2026-09-10/dependency-audit.json) and [production-classified audit](statement-evidence/2026-09-10/dependency-audit-production.json). The snapshot reports no `pdfjs-dist` advisory, which is not a blanket security guarantee. `pdfjs-dist@5.4.624` is pinned and compatible with the local Node 20.20.2 toolchain. Node 20 is EOL according to the current [official release schedule](https://nodejs.org/en/about/previous-releases); move the build toolchain to a supported LTS before production certification. No machine-wide Node upgrade was performed.

## Remaining Statement Gaps

| ID | Gap | Required evidence / solution |
| --- | --- | --- |
| S01 | Real-bank layout support is unmeasured. | Authorized redacted native/encrypted samples for every bank/product/channel being advertised; independent holdout labels. |
| S02 | Scans, mixed pages, rotations and unsupported native layouts are blocked. | OCR/layout extraction with field-level source overlays, correction history and fail-closed validation. |
| S03 | Full-document completeness is not certified. | Page continuity, independent summary totals/counts, omitted/duplicated page tests and account/currency binding. |
| S04 | Financial semantics remain review-driven. | Owner-labeled category/scope corpus, purpose-specific rules, abstention metrics and appropriate domain links. No unconditional personal/business guess. |
| S05 | Duplicate matching is incomplete. | Durable document/account registry, fuzzy-match review and two-statement transfer matching. Current hash guard uses imported transaction provenance: duplicate-only re-exports do not register their new hash, and a first wrong destination is not independently detected. |
| S06 | Import review is not durable across reload/device loss. | Explicit opt-in encrypted draft lifecycle, owner binding, expiry/deletion and unknown-result reconciliation. Never persist PDF passwords. |
| S07 | Source provenance is not authenticated evidence. | Decide retention and signature/direct-bank provenance requirements. Do not label a balanced, client-supplied PDF authentic. |
| S08 | Hosting and broad lifecycle coverage remain unverified. | Actual Apache worker MIME/CSP, secure session behavior, hostile PDF resource tests, Firefox/Safari, low-memory devices, load/soak and backup restore. |

The same file is blocked from a second account when its hash is present on an earlier imported row. That is the exact tested claim, not complete cross-document/account identity protection. Similarly, soft matches can overmatch genuine same-day equal-value purchases; they are suggestions, not irreversible merges. Changing an imported transaction later and re-uploading its source does not automatically reconcile the edited value.

## Remaining Repository Blockers

This was a targeted recheck plus a new feature implementation, not a full fresh A-to-Z certification. The historical findings keep their original IDs and evidence. The statement importer does not mark them resolved.

| Findings | Current observation / impact | Next work |
| --- | --- | --- |
| B06-B09 | PIN change still replaces the salt used by recovery; session revocation and recovery hardening remain open. Rechecked `php/controllers/cloud.php` and `php/helpers/auth.php`. | Dedicated authentication/recovery migration and old-session regression matrix. |
| B10-B11 | The new endpoint enforces CSRF and throttling, but that does not fix inconsistent legacy endpoint protection or trusted-proxy handling. | Central mutation protection and verified proxy policy. |
| B13-B14 | Legacy audit writeability and incomplete collection schemas remain open. New provenance is not a substitute for authoritative evidence. | Server-owned audit and complete schema/link validation. |
| B15, B38-B39 | Export/restore/wipe coverage still uses incomplete collection lists. Rechecked `src/services/exportSafety.ts` and `src/components/pages/SettingsPage.tsx`. | Registry-driven all-collection backup, isolated restore and atomic lifecycle tests. |
| B16-B24 | Existing financial/report/export discrepancies are not repaired by importing correct bank movements. | Canonical financial facts and independent cross-view / exported-artifact goldens. |
| B25-B26 | Dependency audit still fails; the old spreadsheet parser remains installed. | Targeted updates or replacement, parser sandboxing and full compatibility tests. |
| B29-B32 and remaining release gates | Full accessibility/navigation, bundle size, development-server exposure and actual hosted deployment remain open. | Separate production artifact security/accessibility/performance gates. |
| Agency scope | The wider SparowFinanceOS brief is not completed by this personal-finance importer. | Follow the existing module/action/lifecycle prompts and staged release gates. |

`git diff --check` reports only the preexisting README line 30 trailing whitespace. It was not changed as unrelated cleanup.

## Detailed Solution Prompts

The following are scoped implementation work orders, not claims that the described future capabilities already exist. Each should finish with code, focused regression tests, reproduced evidence and an updated status register. Preserve existing data and unrelated worktree edits. Never replace missing real-bank evidence with invented accuracy numbers.

### P1. Bank Adapter Corpus

Implement versioned native-text adapters around `src/services/statements/parser.ts`, preserving its strict normalization and reconciliation contracts. First inventory authorized redacted samples by bank, product, delivery channel, date convention, encryption and layout. Prepare independent row/field goldens and reserve a holdout subset before tuning. Add adapters only when a sample demonstrates a real difference; do not fork five copies of the same generic parser solely because five banks are selected. Preserve raw narration, value date, transaction date, reference and field coordinates. Reject ambiguous routing and unknown versions. Acceptance requires exact row recall and exact paise/date/direction on every accepted holdout file, with blocked files and unsupported variants counted explicitly.

### P2. Complete-Document Reconciliation

Extend normalized analysis to track printed opening/closing balances, debit/credit totals, transaction counts, page X-of-Y markers, statement account identity and currency. Cross-check independent summaries against extracted rows; never derive an independent baseline from the rows being checked. Handle zero-activity statements as an analyzed no-op rather than inventing transactions. Add fixtures for missing middle pages, duplicated pages, offsetting omitted debit/credit pairs, conflicting summary blocks, multiple accounts and narration that resembles a summary. Design privacy-preserving destination binding using the minimum necessary masked identity. Acceptance requires clear blocking reasons for every incomplete or conflicting document and no misleading bank-verified status.

### P3. OCR Review Path

Add page-level native-text/OCR routing behind a disabled-by-default capability flag. Evaluate a maintained OCR engine and layout model on the authorized holdout corpus; do not introduce a cloud fallback without explicit consent and an approved retention/region contract. Render source images at a tested resolution, retain word/cell coordinates and attach uncertainty per field. Build a correction view with before/after evidence, reviewer identity and immutable source values. No silent digit or decimal repair is permitted. Rerun server arithmetic after corrections. Acceptance includes skew, rotation, blur, faint print, merged columns, mixed native/scanned pages, cancellation, resource limits and cases where OCR appears confident but the amount is wrong.

### P4. Economic Classification

Improve `classification.ts` using owner-approved examples and explicit precedence: linked-domain evidence, confirmed user rules, high-precision merchant/purpose rules, then unknown. Keep amount/date/direction immutable. Separate income/expense purpose from category and personal/business scope. Add salary-versus-transfer, loan-credit-versus-income, card-payment-versus-purchase, refund-versus-income, ATM withdrawal and person-to-person UPI cases. Loans, investments and mandates must use their domain workflows rather than general expense guesses. Offer reversible, user-scoped rule learning only after consent. Acceptance requires per-class precision, coverage, abstention and correction-rate results on holdout data; business/tax treatment must not be inferred solely from a merchant name.

### P5. Duplicate and Transfer Reconciliation

Introduce a transactional user/account/document import registry with additive migration and retention rules. Register reviewed duplicate-only re-exports as well as newly posted rows, while keeping exact retries stable. Match the two sides of a confirmed own-account transfer without posting the same economic movement twice. Handle same-day equal-value genuine transactions, changed narrations, booking/value-date drift, overlapping periods, manually entered transactions and edited/deleted imported rows. Provide an explicit match/exclude/create decision with both records and their source evidence; never silently merge a soft match. Acceptance includes concurrent cross-account uploads, re-exported files, reversal pairs and rollback of source, registry, effects and audit together.

### P6. Durable Review Recovery

Design an opt-in review draft that survives browser restart without storing passwords. Minimize retained financial data, bind drafts to the authenticated owner, define encryption/key handling, expiry, purge and backup exclusions, and require reattachment of the source PDF when necessary. Store a stable import-session/request identity and reconcile unknown network outcomes before permitting a changed submission. Keep pending ordinary transactions and statement batches coordinated without silently discarding either. Acceptance includes restart, tab concurrency, logout/account switch, token expiry, storage eviction, partial network failure, lost acknowledgment and abandoned draft cleanup. Clearly distinguish local draft persistence from server-confirmed posting.

### P7. Security and Hosted Staging

Resolve the linked authentication, session, CSRF, proxy, audit and dependency blockers before enabling real statements on public staging. Move the build toolchain to supported Node LTS, verify the chosen PDF.js version and worker compatibility, and run a clean install plus dependency/license inventory. On actual Apache/PHP hosting, verify HTTPS, `.mjs` MIME, same-origin worker CSP, denied source/backup routes and absence of sensitive request logging. Add malicious/resource-intensive PDF, password cancellation, keyboard/focus, Firefox/Safari and low-memory tests. Acceptance requires reproducible hosted evidence and no unresolved critical/high release blocker, not merely a passing Vite build.

### P8. Financial and Operational Release

Complete registry-driven backup/restore and verify imported provenance, receipts, links, financial effects and audit survive an isolated restoration. Repair the existing report engines so dashboard, ledger, exports and CA reports use the same canonical treatment of transfers, card payments and refunds. Test partial refund sequences, period boundaries, reversals, deletion/restoration and imported/manual overlap with independent goldens. Add load/soak, failure injection, monitoring without sensitive payloads and a non-destructive rollback runbook. Publish a release matrix by bank/product/layout/parser version and measured sample counts. Acceptance requires finance-review signoff where relevant and a truthful supported-scope statement; no unconditional 100% guarantee.
