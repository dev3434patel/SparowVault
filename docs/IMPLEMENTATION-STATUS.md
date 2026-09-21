# Implementation Status: Stage 1

Latest increment, 11 September 2026: [OCR, contribution returns, security, dependencies and database-backup verification](EXPANSION-IMPLEMENTATION-STATUS.md), with [expanded India-bank research](INDIAN-BANK-INGESTION-RESEARCH.md). The finding table below is the historical Stage 1 snapshot; consult the new report for subsequent repairs and remaining release gates.

Latest parser follow-up: [Kotak statement repair, 11 September 2026](KOTAK-STATEMENT-FIX.md), including actual-source verification and new regression evidence. Earlier stage snapshots below remain historical.

Date: 10 September 2026. Company: SparowTech Solution LLP. Repository: SparowVault.

Later increment on the same date: [bank statement implementation, latest tests and remaining solution prompts](BANK-STATEMENT-IMPLEMENTATION.md), with [bank/PDF/Google Patents research](BANK-STATEMENT-RESEARCH.md). The Stage 1 results below remain its historical snapshot; they do not include the later PDF dependency or statement feature. Production remains NO-GO.

## Release Decision

**Local synthetic testing: available. Hosted staging: NOT DEPLOYED. Real-finance production: NO-GO.**

Implementation has started and the new integrity regression suite passes. This is not a completed agency ERP, a full security clearance, an accountant-approved report engine or a promise of bug-free software. Existing high-severity security, backup, reporting and dependency findings remain. Agency prompts describe work to build; they are not a list of working modules.

- [Detailed solution prompts](IMPLEMENTATION-PROMPTS.md): 39 finding-specific repair prompts, 20 agency implementation prompts, all 30 brief module areas, nine-role/action/lifecycle matrices and release gates G0-G8.
- [Research and design decisions](IMPLEMENTATION-RESEARCH.md): primary sources, alternatives, financial/tax limitations and acceptance criteria.
- [Migration and rollout](ATOMIC-WRITES-ROLLOUT.md): additive schema, API compatibility, queue recovery and non-destructive rollback constraints.
- [Historical audit](CURRENT-FULL-A-TO-Z-AUDIT-REPORT.md): unchanged baseline. Its 2 critical, 21 high, 14 medium and 2 low counts must not be presented as a new post-repair audit.

## Repository and Change Ownership

The remote is `https://github.com/dev3434patel/SparowVault.git`. A successful fetch found no divergence: `HEAD...origin/master` is `0 0`, at `54eec068a37cceb9cccc2a63dca824e1e092f52e`.

Changes in this implementation are uncommitted and have not been pushed or deployed. The verified state includes the existing dirty worktree, not just that commit. The [source hash manifest](implementation-evidence/2026-09-10/source-hashes.json) identifies tested files.

Preexisting edits to README, hosting instructions, package scripts, packaging, SQL dry-run/reset-related fixtures, clean SQL import and Vite configuration were preserved. Where necessary, implementation extended the edited package/packager files. The existing database dump and AppleDouble metadata were not removed. `git diff --check` still flags the preexisting trailing whitespace in README line 30; it is not a newly introduced implementation defect.

## Implemented Foundation

### Durable Browser Mutations

- Dexie v5 adds a user-scoped, ordered queue containing the entire request, before/local records, stable key, version and failure state.
- Entity and queue entry persist in one IndexedDB transaction. Cloud acknowledgements update cache and queue together.
- A cloud refresh cannot erase a pending create or later edit; snapshot guards also cover a GET completing after an acknowledged write.
- Replay preserves order and keys. Web Locks coordinate same-origin tabs; expired authentication retains pending data.
- Validation/permission rejection is visible and retains a downloadable payload. Conflicts require explicit review.
- The review dialog supports retry, JSON download and confirmed server-version resolution. Core collections refresh without closing the dialog; independently managed pages reload to replace their local projection.
- Legacy marker-only local records enter review without guessing an operation. Permanent deletion is blocked while unresolved queue entries exist.
- Owner-bound reads and queued patches, account-switch checks and pending-projection recovery reduce cross-profile cache hazards.

Limits: legacy IndexedDB entity stores still have ID-only keys; cold offline authentication/startup, browser eviction, device loss, automatic merge/rebase, retry backoff and complete multi-organization cache migration are not solved. Some legacy/bulk mutation workflows are outside the durable queue.

### Atomic PHP/MariaDB Writes

- One shared transaction locks the owning user, checks idempotency, saves source records, updates financial effects, writes authoritative audit and records a successful response.
- User-scoped request receipts bind keys to canonical content. Identical retries return the original result; changed content or scope conflicts.
- Sync batches and selected batch mutations fail atomically rather than persisting early rows after rejection.
- The upgraded client uses server-owned versions. Changed existing sync rows require explicit expected versions.
- Hard-delete tombstones prevent stale recreation. Financial deletion reverses active ledger consequences.
- Transaction links must resolve to active owned parents. Parent deletion cannot orphan an active transaction. Sync validates the final graph, allowing parent/child input order.
- Household permission checks apply to alternate single, batch, sync and delete paths.
- Import writes use the same transaction boundary per row and optional stable row keys.
- Ledger and server-audit failure roll back the financial mutation. Missing additive metadata causes a safe write failure.

An additional tenant-isolation issue was found during implementation: old ledger event IDs were based only on the raw transaction ID and effect deletion was not owner-scoped. New SQL event IDs incorporate the owner, existing owned events are resolved by source transaction, and effect cleanup is owner-bound. A same-ID/two-user database test verifies isolation. The frontend's derived event IDs remain local identifiers; callers must not assume the SQL ID format.

Limits: legacy versionless direct PATCH/DELETE remains a compatibility gap; complete graph/schema enforcement, production contention measurements, every failure-injection point and historical repair remain open. This ledger is not a new double-entry accounting journal.

### Quality and Delivery Tooling

- Normal lint and unit commands now tolerate macOS AppleDouble metadata without suppressing application rules.
- Migration contract tests use native portable file traversal rather than PowerShell assumptions.
- Secret packaging tests exercise the real sanitizer in temporary fixtures and reject populated secret placeholders, including the preferred-template path.
- The hosting packager includes the additive migration and preserves the user's existing portable packaging changes.
- New scripts provide an isolated persistent preview and a reproducible verification/evidence run.
- The only installed new development dependency is pinned `fake-indexeddb@6.2.5`. No blind dependency upgrade was applied.

## Verification Results

Evidence was collected on 10 September 2026 against the current worktree. [Commands, exit codes and timings](implementation-evidence/2026-09-10/verification.json), [API/browser scenarios](implementation-evidence/2026-09-10/atomic-writes.json), [source SHA256 values](implementation-evidence/2026-09-10/source-hashes.json).

| Check | Result | Scope |
| --- | --- | --- |
| `npm run typecheck` | PASS | TypeScript |
| `npm run lint` | PASS | Normal repository command, no ad hoc application exclusions |
| `npm run test` | PASS | 331 tests in 50 files, including 17 new durable-outbox tests |
| Integrity API/database | PASS | 18 scenarios, fresh disposable MariaDB database and four PHP workers |
| Integrity browser | PASS | 9 scenarios with actual Chromium process restart and two-tab reconnect |
| `npm run build` | PASS with warnings | 3,453 modules; entry JS 2,108.04 kB, gzip 623.76 kB; bundle splitting remains open |
| PHP syntax | PASS | 77 non-metadata files under api/php |
| Migration rerun | PASS | Applied twice in disposable test setup; additive local application verified separately |
| Local preview login/reload | PASS | Synthetic ordinary user; screenshot below |
| `npm audit --json` | FAIL | 19 affected dependency nodes: 4 critical, 7 high, 7 moderate, 1 low |
| `npm audit --omit=dev --json` | FAIL | 5 affected nodes: 2 high, 3 moderate |

The dependency counts are registry audit classifications, not proof every path is exploitable or shipped in the browser. The audited spreadsheet parser remains a known reachable concern. Production-classified nodes reported include xlsx, nanoid, mysql2, qs and body-parser. [Full audit output](implementation-evidence/2026-09-10/dependency-audit.json), [production-classified audit output](implementation-evidence/2026-09-10/dependency-audit-production.json).

API tests cover concurrent identical/changed retries, stale edits and sync, batch rollback, malformed payloads, missing/foreign parents, cross-tenant identical IDs, ledger failure, permanent deletion, tombstones, household viewer bypasses, partial import retry and owner-bound requests.

Browser tests cover a real account form save, 503 retention through refresh, desktop/mobile queue review, a real browser-process restart, two tabs replaying one record, rejected writes, parsed JSON download, confirmed conflict resolution and uncaught page errors. Viewports checked for the new sync UI are 1440, 768, 390 and 360 pixels. This is not a claim that every page, role and brief viewport has been re-certified.

Screenshots: [desktop pending](implementation-evidence/2026-09-10/screenshots/sync-pending-1440.png), [360px pending](implementation-evidence/2026-09-10/screenshots/sync-pending-360.png), [rejected write](implementation-evidence/2026-09-10/screenshots/sync-rejected-desktop.png), [preview dashboard](implementation-evidence/2026-09-10/screenshots/preview-dashboard.png).

During test development, a mismatched disposable database collation exposed an existing auth recovery-table dependency; the fixture now matches the supplied utf8mb4 schema. A new explicit-resolution assertion then found the global-loading dialog reset; targeted collection refresh fixed it. Tests were rerun after the fixes, not merely marked passed.

Raw command logs are alongside the JSON evidence. The repository ignores *.log, so include these local evidence files explicitly in any later review/release evidence archive. The aggregate verification runner deliberately reports code gates separately from the failing dependency audit.

### Not Verified in This Stage

- All historical browser/API suites, every endpoint/role/action combination, actual Safari/Firefox, full offline startup or all requested device widths.
- Fresh clean-host `npm ci`, complete hosting ZIP execution/deployment and HTTP denial probes on Apache/real staging.
- Provider sandbox/live payments, webhook delivery infrastructure, email/SMS, private object storage, monitoring and alert delivery.
- All-collection backup restore, historical ledger reconciliation, load/soak/failover, storage eviction and production crash recovery.
- Tax/GST applicability, partner allocation policy, financial period-close behavior and CA approval of generated financial artifacts.

## Finding-by-Finding Status

"Verified repair" means the named defect and stated regression scope pass locally. It is not full release acceptance. "Partial" must remain open until its dedicated prompt's remaining acceptance criteria pass.

| ID | Baseline finding | Current status | Evidence / remaining scope |
| --- | --- | --- | --- |
| B01 | Unsynced financial data is erased by a successful cloud refresh | Partial; reproduced loss repaired | Full-payload IndexedDB queue, guarded cloud merge, restart persistence and review UI verified. Cold offline startup, eviction/device loss and complete multi-device lifecycle coverage remain. |
| B02 | Concurrent retries can persist several entities for one mutation ID | Verified repair in tested scope | Per-user transaction lock, canonical request-bound receipt and original-response replay pass both 24-request concurrency cases on four PHP workers. Production load and every crash point remain untested. |
| B03 | Rejected sync batches leave partial financial writes | Verified repair in tested scope | Rejected sync and batch PATCH roll back source/effects/audit. Malformed rows and final reference graphs are checked. Imports remain explicitly per-row partial, not a full restore transaction. |
| B04 | Stale sync data resurrects soft-deleted records | Partial | Versioned queued patches, changed-row sync preconditions and hard-delete tombstones pass stale-write regressions. Legacy versionless direct PATCH/DELETE and some batch/admin preconditions remain. |
| B05 | Collection hard-delete leaves posted SQL ledger events | Verified repair in tested scope | Collection hard-delete removes active effects, reverses source events and retains authoritative audit/tombstones in the same transaction. Historical orphan cleanup was not run. |
| B06 | Changing a PIN invalidates the configured recovery answer | Open; not repaired | See the dedicated implementation prompt and unchanged historical audit evidence. |
| B07 | PIN changes and logout do not revoke bearer sessions | Open; not repaired | See the dedicated implementation prompt and unchanged historical audit evidence. |
| B08 | Forced PIN rotation is not enforced for privileged access | Open; not repaired | See the dedicated implementation prompt and unchanged historical audit evidence. |
| B09 | Recovery settings allow a session holder to replace the PIN without the existing PIN | Open; not repaired | See the dedicated implementation prompt and unchanged historical audit evidence. |
| B10 | CSRF enforcement is inconsistent across cookie-authenticated mutations | Open; not repaired | See the dedicated implementation prompt and unchanged historical audit evidence. |
| B11 | Spoofed forwarded IP addresses evade the login throttle | Open; not repaired | See the dedicated implementation prompt and unchanged historical audit evidence. |
| B12 | Household role restrictions can be bypassed through batch PATCH | Verified repair in tested scope | Household restrictions apply to single/batch/sync/bulk hard-delete paths. Viewer bypass regression passes. This is not the missing agency capability model. |
| B13 | The user-visible audit collection accepts fabricated records | Open; not repaired | See the dedicated implementation prompt and unchanged historical audit evidence. |
| B14 | Non-transaction collection contracts are not enforced as schemas | Partial | Shared write paths invoke existing validators and final transaction-reference validation. Complete strict schemas for every non-transaction collection are still required. |
| B15 | Full profile backup omits newer collections | Open; not repaired | See the dedicated implementation prompt and unchanged historical audit evidence. |
| B16 | CA workbook sheets use inconsistent period and ledger contexts | Open; not repaired | See the dedicated implementation prompt and unchanged historical audit evidence. |
| B17 | CA report helpers read noncanonical balance and Udhari fields | Open; not repaired | See the dedicated implementation prompt and unchanged historical audit evidence. |
| B18 | Some report totals ignore reversals and refunds | Open; not repaired | See the dedicated implementation prompt and unchanged historical audit evidence. |
| B19 | Oversized explicit mixed split can produce a negative component | Open; not repaired | See the dedicated implementation prompt and unchanged historical audit evidence. |
| B20 | Two loans with the same lender stop the CA export | Open; not repaired | See the dedicated implementation prompt and unchanged historical audit evidence. |
| B21 | Excel master money cells are formatted strings | Open; not repaired | See the dedicated implementation prompt and unchanged historical audit evidence. |
| B22 | CSV export does not neutralize formula-like user text | Open; not repaired | See the dedicated implementation prompt and unchanged historical audit evidence. |
| B23 | Reconciliation can report matched without an independent statement balance | Open; not repaired | See the dedicated implementation prompt and unchanged historical audit evidence. |
| B24 | Workbook business/personal summary ignores mixed allocations | Open; not repaired | See the dedicated implementation prompt and unchanged historical audit evidence. |
| B25 | The reachable spreadsheet parser has high-severity advisories | Open; not repaired | See the dedicated implementation prompt and unchanged historical audit evidence. |
| B26 | Development dependency security baseline is not clean | Open; not repaired | See the dedicated implementation prompt and unchanged historical audit evidence. |
| B27 | Standard quality commands fail on metadata and environment assumptions | Verified locally | Normal macOS lint/unit commands ignore AppleDouble metadata; migration inspection is portable; secret packaging tests run against real isolated fixtures. Clean-host installation and hosting artifact certification remain. |
| B28 | Several existing tests can pass without exercising the claimed behavior | Partial | New API/browser tests assert durable database and downloaded-file outcomes; portability and sanitizer tests strengthened. The other historical vacuous coverage identified in the audit is not all repaired. |
| B29 | Shared form labels and several icon controls lack accessible names | Open; not repaired | See the dedicated implementation prompt and unchanged historical audit evidence. |
| B30 | Mobile navigation omits Categories and Audit | Open; not repaired | See the dedicated implementation prompt and unchanged historical audit evidence. |
| B31 | The initial application bundle is large and largely unsplit | Open; not repaired | See the dedicated implementation prompt and unchanged historical audit evidence. |
| B32 | The PHP development router serves repository internals | Open; not repaired | See the dedicated implementation prompt and unchanged historical audit evidence. |
| B33 | Authorization and unexpected errors use misleading/raw 500 responses | Partial | Shared financial write errors now use safe structured codes and suppress raw failures. Other administrative/authentication routes still require consistent error handling. |
| B34 | Concurrent default seeding creates duplicate accounts/categories | Open; not repaired | See the dedicated implementation prompt and unchanged historical audit evidence. |
| B35 | Export description lists the wrong workbook sheet count | Open; not repaired | See the dedicated implementation prompt and unchanged historical audit evidence. |
| B36 | Seed branding/contact content remains placeholder-like | Open; not repaired | See the dedicated implementation prompt and unchanged historical audit evidence. |
| B37 | Financial references are checked for presence but not existence | Partial | Active owned transaction parents are checked, foreign/missing parents rejected and referenced parent deletion blocked. Full all-collection graph schemas and historical reconciliation remain. |
| B38 | Backup restore breaks linked account and category references | Open; not repaired | See the dedicated implementation prompt and unchanged historical audit evidence. |
| B39 | Wipe all profile data leaves newer profile collections behind | Open; not repaired | See the dedicated implementation prompt and unchanged historical audit evidence. |

## Local Runtime and Database Safety

| Service | Address / status |
| --- | --- |
| Existing local application | http://localhost:5173 |
| Existing PHP API | http://localhost:8080 |
| Isolated integrity preview | http://127.0.0.1:5178 |
| Preview PHP API | http://127.0.0.1:8088 |
| Preview database | sparowvault_integrity_preview_test |
| XAMPP MariaDB | Running; application health/database checks succeeded |
| XAMPP Apache | Not running; noninteractive start requires an administrator password |

**Synthetic preview login:** username `review_demo`, PIN `583921`. These are local-only fixture credentials, not production/admin credentials. The preview has a small synthetic starting dataset and does not demonstrate completed agency modules.

The XAMPP manager was opened for the user. Start Apache there with macOS administrator approval if Apache itself is required. The working application uses separate PHP development servers and does not depend on Apache being started. Keep both development servers local; they are not hardened public deployments.

The exact-name CLI migration was applied to the existing local `sparowvault` database. It added only `financial_write_receipts` and `financial_entity_tombstones`. Immediately before and after, `cloud_collection_rows` contained 124 records and `SUM(CRC32(payload))` was 271426448577; new receipt and tombstone counts were zero immediately after migration. This comparison is an integrity spot check, not a cryptographic backup/restore proof. No existing financial payloads were rewritten, no profile reset was run, and historical backfill was not executed. See [migration evidence](implementation-evidence/2026-09-10/local-migration.json).

The regression harness creates a fresh generated-name database and removes only that database and its own servers. The persistent preview is separate and retains its data on restart. After stopping only its own recorded PIDs, restart it with `npm run dev:review`; startup refuses occupied ports. Runtime PIDs/logs are in `tmp/integrity-preview` and `tmp/local-runtime`.

## Next Implementation Contract

Use the master prompt and G2 prompts B06-B13/B33 next: independently verifiable recovery hashing, recent authentication for sensitive changes, revocable sessions, enforced PIN rotation, consistent CSRF, trusted-proxy throttling and authoritative permissions/audit. Carry forward the G1 compatibility gaps rather than treating them as closed.

Then execute G3 all-collection backup/restore/wipe integrity, G4 financial/export correctness and dependency remediation, G5 accessibility/performance/deployment hardening, followed by A01-A20 agency work in dependency order. The prompt pack lists each module's data, routes, lifecycle, validation, authorization, UI and acceptance tests.

Before hosted staging, confirm the exact hostname/provider/runtime, staging database and secret sources, synthetic users, mail/payment/storage sandboxes, backup policy and release owner. No staging target has been confirmed in this task. Production remains blocked until the required gates and business sign-offs are evidenced.
