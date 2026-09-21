# Detailed Implementation Prompts and Acceptance Contracts

Prepared 10 September 2026 for SparowTech Solution LLP. Target repository: SparowVault. Agency target: SparowFinanceOS.

This is an execution pack, not a claim that every listed change is implemented. Read [implementation status](IMPLEMENTATION-STATUS.md) for verified results and [research decisions](IMPLEMENTATION-RESEARCH.md) for primary sources and limitations. The historical audit remains the baseline.

## Master Execution Prompt

Use this instruction with each scoped prompt below:

> Inspect the current code, contract registry, audit finding and latest implementation evidence before editing. Preserve all unrelated user changes and existing financial data. Implement only the selected scope and necessary shared prerequisites using the existing React/TypeScript/Dexie/PHP/MariaDB patterns. Add tests that fail for the identified defect and assert final durable behavior. Use synthetic fixtures and an isolated database; never reset, wipe, migrate destructively or deploy the real system without an explicit target and appropriate approval. Keep integer-money, ownership, authorization, versioning, idempotency, audit and closed-period rules consistent across every affected route. Do not weaken tests, swallow failures, fabricate data or label missing modules as implemented. Document schema changes, compatibility, rollback, performance impact and residual risk. Run the appropriate unit, API, concurrency, browser, export and migration gates; preserve logs and generated artifacts. Report implemented, verified, partial, blocked and untested separately. A passing build alone is not production acceptance.

Each prompt is complete only when the general definition of done and its specific acceptance tests pass. Where implementation already exists from Stage 1, extend and verify it rather than replacing it blindly.

## Gate Sequence

| Gate | Scope | Prerequisite | Exit evidence |
| --- | --- | --- | --- |
| G0 | Portable tests, secret-safe packaging, dependency triage | Snapshot dirty worktree and audit evidence | Fresh install, real fixture checks, reproducible commands |
| G1 | B01-B05, B14, B34, B37 and tenant-isolated ledger | G0 test baseline | Atomic/replay/version/reference regressions and old-data exception report |
| G2 | B06-B13 and B33 | G1 shared mutation policy | Session, recovery, CSRF, proxy and role/method/owner matrix |
| G3 | B15, B38, B39 | G1/G2 and full collection registry | All-collection restore drill, graph and checksum reconciliation |
| G4 | B16-B25 | G1/G3 and finance-approved definitions | Cross-view and parsed-file golden/property tests |
| G5 | B29-B32, B35-B36 | Stable workflows | Desktop/tablet/mobile and accessibility evidence; artifact deny probes |
| G6 | Agency module prompts A01-A20 | G1-G5 foundations and business decisions | Real role/state workflows, accounting/tax review and module UAT |
| G7 | Staging and operations | All required scope accepted | Exact artifact tested on confirmed hosting; backup/rollback/provider/monitoring drills |
| G8 | Production decision | No release-blocking gaps | Engineering, security, finance and product sign-off, with recorded exceptions |

G0 work can support G1 in parallel conceptually, but neither is a justification to merge an untested dependency rewrite into a financial fix. A reasonable first delivery is the tested integrity foundation, not an unreviewed implementation of the entire ERP in one patch.

## Definition of Done

1. Requirement and state transition are explicit, including who may perform the action and whether recent authentication is required.
2. Server schemas reject malformed, foreign, stale and contradictory data across every entry point.
3. Source records, derived financial consequences and server audit are consistent; retries are deterministic.
4. Loading, empty, pending, rejected, conflict, success and error UI states are honest and accessible.
5. Tests verify final database and artifact outcomes with isolated reproducible fixtures. At least one negative test distinguishes the original defect from a correct implementation.
6. Additive migration and compatibility paths are tested on fresh and representative restored schemas. Rollback does not reintroduce data-loss or access-control behavior.
7. Logs contain evidence and correlation IDs, not credentials, PINs or real-user financial payloads.
8. Documentation states what remains open. No production certificate is inferred from an aggregate test count.

## Audit Finding Coverage

All 39 original IDs have a dedicated prompt below. Historical file/line references identify the audited baseline and may have moved after implementation.

| Finding | Severity | Gate | Baseline location |
| --- | --- | --- | --- |
| B01 | Critical | G1 | `src/repositories/baseRepo.ts:52` |
| B02 | Critical | G1 | `php/controllers/cloud_data.php:222` |
| B03 | High | G1 | `php/controllers/cloud_data.php:69` |
| B04 | High | G1 | `php/controllers/cloud_data.php:69` |
| B05 | High | G1 | `php/controllers/cloud_data.php:295` |
| B06 | High | G2 | `php/controllers/cloud.php:346` |
| B07 | High | G2 | `php/helpers/auth.php:196` |
| B08 | High | G2 | `php/helpers/auth.php:210` |
| B09 | High | G2 | `php/controllers/cloud.php:398` |
| B10 | High | G2 | `api/auth/profile.php:1` |
| B11 | High | G2 | `php/helpers/security.php:77` |
| B12 | High | G2 | `php/controllers/cloud_data.php:473` |
| B13 | Medium | G2 | `php/controllers/cloud_data.php:190` |
| B14 | High | G1/G2 | `php/helpers/cloud_payload.php:435` |
| B15 | High | G3 | `src/services/exportSafety.ts:45` |
| B16 | High | G4 | `src/components/pages/ExportPage.tsx:89` |
| B17 | High | G4 | `src/services/caReports.ts:331` |
| B18 | High | G4 | `src/services/caReports.ts:536` |
| B19 | Medium | G4 | `src/services/businessPersonalSplit.ts:33` |
| B20 | Medium | G4 | `src/exports/xlsxExporter.ts:366` |
| B21 | Medium | G4 | `src/exports/xlsxExporter.ts:62` |
| B22 | Medium | G4 | `src/exports/xlsxExporter.ts:472` |
| B23 | High | G4 | `src/services/caReports.ts:564` |
| B24 | High | G4 | `src/exports/xlsxExporter.ts:378` |
| B25 | High | G0/G4 | `src/components/pages/ImportPage.tsx:1` |
| B26 | Medium | G0 | `package-lock.json:1` |
| B27 | Medium | G0 | `tests/unit/phase-01-secrets.test.ts:11` |
| B28 | Medium | G0/G2 | `tests/account-endpoints-e2e.mjs:81` |
| B29 | Medium | G5 | `src/components/ui/Label.tsx:21` |
| B30 | Medium | G5 | `src/components/layout/CommandPalette.tsx:1` |
| B31 | Medium | G5 | `src/components/layout/AppShell.tsx:1` |
| B32 | Medium | G5/G7 | `php/dev-router.php:1` |
| B33 | Medium | G2/G7 | `api/admin/users.php:1` |
| B34 | Medium | G1 | `src/services/defaultsService.ts:8` |
| B35 | Low | G5 | `src/components/pages/ExportPage.tsx:1` |
| B36 | Low | G5 | `src/components/pages/admin/BrandingSettingsPage.tsx:1` |
| B37 | High | G1 | `php/helpers/cloud_payload.php:288` |
| B38 | High | G3 | `src/components/pages/ImportPage.tsx:488` |
| B39 | High | G3 | `src/components/pages/SettingsPage.tsx:147` |

## Repair Prompts

### B01: Unsynced financial data is erased by a successful cloud refresh

**Scope:** G1; Critical. Baseline: `src/repositories/baseRepo.ts:52`. Evidence: `browser-audit.json`.

**Implementation prompt:** Finish payload-bearing, user-scoped IndexedDB mutations. Persist the entity and request together; keep request keys immutable across retries; drain in order; preserve unsynced rows and tombstones during remote merges. Distinguish pending, rejected and conflict states. Do not overwrite later local edits with an older acknowledgement or GET. Migrate marker-only legacy rows into review, not guessed writes.

**Regression baseline:** Intercept the accounts POST with 503; create through the real accountRepo; confirm the IndexedDB row; call accountRepo.list while the server still has no such row.

**Acceptance tests:** Add offline create/edit/delete, actual browser restart, response loss, slow GET versus acknowledged write, two tabs, quota/transaction failure, wrong owner, logout and reconnect cases. Verify actual PHP/MariaDB rows and ledger totals, not just a badge.

**Migration / rollback:** Retain queued payloads during rollback. An old frontend must not be allowed to erase the v5 store. A rollback requires write maintenance or a compatible client; never clear IndexedDB to make a test pass.

**Required result:** Show the affected files, exact commands, durable before/after evidence and unresolved edge cases. Do not close this finding solely because its happy path works.

### B02: Concurrent retries can persist several entities for one mutation ID

**Scope:** G1; Critical. Baseline: `php/controllers/cloud_data.php:222`. Evidence: `security-probes.json S14`.

**Implementation prompt:** Serialize the idempotency decision with source, effects and audit in one database transaction. Bind a user-scoped mutation key to canonical operation, collection, entity and payload; store the original response. Reject changed payloads or reused cross-operation keys. Fail closed when the migration is absent. Retain receipts long enough to cover the documented retry horizon and archived clients.

**Regression baseline:** Send 24 simultaneous category creates with distinct entity IDs and one mutationId to a four-worker PHP server. Count persisted rows.

**Acceptance tests:** Run same/different payload collisions at 1, 4 and 16 workers, keys reused across users/collections, connection loss before/after commit, failure at receipt/entity/effect/audit writes and retry after deletion. Count durable rows and effects directly.

**Migration / rollback:** Add metadata tables first; no runtime DDL. Preserve receipts when reverting application code. Legacy keys without hashes need reconciliation, not blind replay.

**Required result:** Show the affected files, exact commands, durable before/after evidence and unresolved edge cases. Do not close this finding solely because its happy path works.

### B03: Rejected sync batches leave partial financial writes

**Scope:** G1; High. Baseline: `php/controllers/cloud_data.php:69`. Evidence: `security-probes.json S10`.

**Implementation prompt:** Make sync and selected batch writes all-or-nothing, including their final relationship graph, derived events and audit. Reject malformed rows rather than skipping them. For a deliberately partial import, return stable row IDs, committed/rejected status and resumable per-row keys; never present the whole import as successful.

**Regression baseline:** Push two transaction rows: one valid expense followed by a negative-paise row. Read the first row after the 422 response.

**Acceptance tests:** Inject a failure at every row position and persistence step. Test parent/child order, duplicate IDs, invalid collections, cross-user rows, mixed create/edit/delete and maximum payload. Prove rolled-back rows, effects, receipts and audits are absent.

**Migration / rollback:** No historical partial batches are repaired automatically. Produce a read-only detector and a finance-reviewed repair plan before changing existing records.

**Required result:** Show the affected files, exact commands, durable before/after evidence and unresolved edge cases. Do not close this finding solely because its happy path works.

### B04: Stale sync data resurrects soft-deleted records

**Scope:** G1; High. Baseline: `php/controllers/cloud_data.php:69`. Evidence: `security-probes.json S09`.

**Implementation prompt:** Finish server-owned version preconditions for every mutating endpoint and client. Reject missing versions after the compatibility rollout. Persist hard-delete tombstones; expose deliberate restore as a versioned action. Never use client wall-clock ordering. Return enough safe conflict metadata for review without disclosing another owner.

**Regression baseline:** Create a category, patch isDeleted=1, then sync the original older entity back.

**Acceptance tests:** Exercise stale create/update/delete/restore, offline edits after soft/hard deletion, two devices, clock skew, missing or noninteger versions and an exact retry whose original version is now old. Include legacy batch and hard-delete endpoints.

**Migration / rollback:** Deploy the upgraded client before removing compatibility, or use an explicit versioned API. Retain tombstones beyond supported offline age; do not turn them off during rollback.

**Required result:** Show the affected files, exact commands, durable before/after evidence and unresolved edge cases. Do not close this finding solely because its happy path works.

### B05: Collection hard-delete leaves posted SQL ledger events

**Scope:** G1; High. Baseline: `php/controllers/cloud_data.php:295`. Evidence: `security-probes.json S15`.

**Implementation prompt:** Use one transactional financial lifecycle for single, selected and whole-collection removal. Remove active effects and retain a reversed event plus immutable server audit, or implement an approved reversal journal. Check references before deleting parents. Do not confuse removing active effects with erasing history.

**Regression baseline:** Create a transaction that produces a persisted financial event; DELETE its whole collection without an ids list.

**Acceptance tests:** Verify each removal entry point, direct imports, failure after source deletion and before effect cleanup, and two tenants using the same transaction ID. Assert no active orphan event/effect and unchanged unrelated tenants.

**Migration / rollback:** Add a read-only orphan-ledger report. Historical repair needs a snapshot, before/after totals and explicit approval; this fix prevents new orphans but does not certify old data.

**Required result:** Show the affected files, exact commands, durable before/after evidence and unresolved edge cases. Do not close this finding solely because its happy path works.

### B06: Changing a PIN invalidates the configured recovery answer

**Scope:** G2; High. Baseline: `php/controllers/cloud.php:346`. Evidence: `security-probes.json S05`.

**Implementation prompt:** Decouple recovery material from the rotating PIN salt. Use an independently salted password hash or a versioned recovery-token scheme. Specify a safe legacy verification-and-rehash transition requiring the existing recovery answer. Do not rewrite an unknown hash or fabricate an answer. Audit recovery changes without storing secrets.

**Regression baseline:** Set a security answer, change PIN with the correct current PIN, then submit the same answer for PIN reset.

**Acceptance tests:** Set recovery, change PIN twice, recover, reset, log in with the new PIN and reject the previous PIN. Include legacy hashes, wrong answers, empty/Unicode answers and interrupted migration.

**Migration / rollback:** Add nullable scheme/version metadata; maintain the reviewed legacy verifier until migration completes. Never downgrade new recovery hashes to the old salt coupling.

**Required result:** Show the affected files, exact commands, durable before/after evidence and unresolved edge cases. Do not close this finding solely because its happy path works.

### B07: PIN changes and logout do not revoke bearer sessions

**Scope:** G2; High. Baseline: `php/helpers/auth.php:196`. Evidence: `security-probes.json S06-S07`.

**Implementation prompt:** Introduce server-verifiable session records or an authentication version in every token, checked for cookie and bearer requests. Define current-device versus all-device logout. Rotate/revoke on PIN change/reset, admin reset, deactivation and permission changes. Add a device/session view with revocation and safe last-seen information.

**Regression baseline:** Keep an issued bearer token, change the PIN, then log out. Call auth/me with the old token after each operation.

**Acceptance tests:** Retain real old cookies and bearer tokens across every revocation action; they must fail on all protected APIs. Test token expiry boundaries, clock tolerance, simultaneous reset and request, and session-store failure.

**Migration / rollback:** Deploy the verifier and schema together; explicitly expire incompatible tokens. A rollback must not revive revoked credentials.

**Required result:** Show the affected files, exact commands, durable before/after evidence and unresolved edge cases. Do not close this finding solely because its happy path works.

### B08: Forced PIN rotation is not enforced for privileged access

**Scope:** G2; High. Baseline: `php/helpers/auth.php:210`. Evidence: `extra-probes.json X01; security-probes.json S08`.

**Implementation prompt:** Make must_change_pin an enforced server state: only rotation, minimal account context and logout remain available. Add a blocking accessible rotation screen. Replace reusable production seed credentials with an operator-controlled first-admin bootstrap and require rotation after reset.

**Regression baseline:** In the isolated database set admin must_change_pin=1 and call admin/users with its valid session. Restore the fixture flag afterwards.

**Acceptance tests:** Test first login and already-issued sessions flagged later; invoke every admin endpoint directly. Verify a successful rotation clears the flag only after credential/session updates commit.

**Migration / rollback:** Do not roll back to middleware that ignores the flag. Seed migrations must be repeatable without changing existing users' PINs.

**Required result:** Show the affected files, exact commands, durable before/after evidence and unresolved edge cases. Do not close this finding solely because its happy path works.

### B09: Recovery settings allow a session holder to replace the PIN without the existing PIN

**Scope:** G2; High. Baseline: `php/controllers/cloud.php:398`. Evidence: `extra-probes.json X02`.

**Implementation prompt:** Require a short-lived, action-bound recent-authentication grant for changing recovery factors, generated only after current credentials or an approved stronger factor. Do not accept an unlocked session as sufficient proof. Revoke replaced material and notify the owner through the configured, tested channel.

**Regression baseline:** With a valid session, replace the security question/answer without currentPin, then reset the PIN with that new answer.

**Acceptance tests:** Replay the session-only takeover chain from the audit; reject it. Test expired/replayed grants, grants for another action/user, two concurrent changes, throttling and a legitimate recovery flow.

**Migration / rollback:** Maintain recovery availability during migration, but never temporarily bypass reauthentication. Record notification-delivery failure separately from credential transaction outcome.

**Required result:** Show the affected files, exact commands, durable before/after evidence and unresolved edge cases. Do not close this finding solely because its happy path works.

### B10: CSRF enforcement is inconsistent across cookie-authenticated mutations

**Scope:** G2; High. Baseline: `api/auth/profile.php:1`. Evidence: `security-probes.json S02-S03`.

**Implementation prompt:** Centralize cookie-authenticated mutation protection in shared request middleware. Define exact allowed origins, reject invalid CSRF tokens and untrusted/null origins according to the client contract, and explicitly document bearer-only clients. Cover generic CRUD, import, profile, admin, billing and account lifecycle endpoints.

**Regression baseline:** Send profile PATCH with sv_auth cookie, no CSRF header and an untrusted Origin. Compare sync push without CSRF.

**Acceptance tests:** Run browser and raw HTTP tests for cross-site form/fetch, same-site hostile subdomains, CORS preflight, absent/wrong token, alternate verbs, valid credentials and the actual staging reverse proxy. Assert the intended guard is reached.

**Migration / rollback:** Roll out clients and middleware together; do not set broad wildcard origins to restore broken tests.

**Required result:** Show the affected files, exact commands, durable before/after evidence and unresolved edge cases. Do not close this finding solely because its happy path works.

### B11: Spoofed forwarded IP addresses evade the login throttle

**Scope:** G2; High. Baseline: `php/helpers/security.php:77`. Evidence: `security-probes.json S12`.

**Implementation prompt:** Trust forwarding headers only when REMOTE_ADDR matches a configured trusted proxy. Parse a bounded proxy chain consistently. Combine account, source and aggregate throttles for login, recovery, PIN reentry and admin auth; avoid username enumeration and permanent account denial by attackers.

**Regression baseline:** Make seven wrong-PIN attempts for one username while changing X-Forwarded-For each time.

**Acceptance tests:** Rotate forged X-Forwarded-For on direct-origin requests; the account throttle must hold. Cover legitimate multi-hop proxies, IPv4/IPv6, distributed attempts, lock expiry and concurrent requests.

**Migration / rollback:** Default to direct peer identity until the deployment's proxy addresses are known. Store counters in shared durable state and document operational unlock procedures.

**Required result:** Show the affected files, exact commands, durable before/after evidence and unresolved edge cases. Do not close this finding solely because its happy path works.

### B12: Household role restrictions can be bypassed through batch PATCH

**Scope:** G2; High. Baseline: `php/controllers/cloud_data.php:473`. Evidence: `security-probes.json S11`.

**Implementation prompt:** Keep household authorization on single, batch, sync, import and deletion paths, checking both old and new parents. Replace the first-member lookup with membership tied to the authenticated person. Define owner bootstrap explicitly and prevent self-escalation, cross-household moves and changing another member's permissions without authority.

**Regression baseline:** Create a viewer member and attempt role=owner with single-item PATCH, then with the collection batch PATCH.

**Acceptance tests:** Build a role-by-method matrix, including batch and sync equivalents of each denied single write, multiple members with different ordering and a changed householdId. Test explicit ownership transfer separately.

**Migration / rollback:** Preserve original membership records and migrate with a review report. Household roles do not substitute for the organization model in A01.

**Required result:** Show the affected files, exact commands, durable before/after evidence and unresolved edge cases. Do not close this finding solely because its happy path works.

### B13: The user-visible audit collection accepts fabricated records

**Scope:** G2; Medium. Baseline: `php/controllers/cloud_data.php:190`. Evidence: `security-probes.json S13`.

**Implementation prompt:** Separate user-authored activity from authoritative audit. Restrict server audit creation to trusted services and expose a read-only, owner/organization-scoped query API. Remove authoritative-looking client-created events from security/finance audit views. Add append-only database permissions and explicit retention.

**Regression baseline:** POST an invented action into the generic auditLogs collection.

**Acceptance tests:** Reject client POST/PATCH/DELETE to authoritative audit, including generic sync and restore. Verify successful and denied sensitive actions have appropriate records, correct actor and correlation ID, and no PIN/token content.

**Migration / rollback:** Classify historical client records as unverified rather than deleting them or presenting them as trusted history.

**Required result:** Show the affected files, exact commands, durable before/after evidence and unresolved edge cases. Do not close this finding solely because its happy path works.

### B14: Non-transaction collection contracts are not enforced as schemas

**Scope:** G1/G2; High. Baseline: `php/helpers/cloud_payload.php:435`. Evidence: `extra-probes.json X03`.

**Implementation prompt:** Turn the collection registry into enforceable request schemas: required fields, enums, lengths, nullable semantics, dates, integer ranges, unknown-field policy and immutable/server-derived fields. Share generated contracts where possible while retaining server enforcement. Validate full merged records for PATCH and all import/sync entry points.

**Regression baseline:** Create a category with appliesTo=impossible and omit required presentation fields.

**Acceptance tests:** Add per-collection valid/minimum/maximum/missing/unknown/invalid enum cases, malformed nested arrays, dates, overflows and forbidden patch fields. Verify 422 responses are schema failures, not earlier authentication/CSRF failures.

**Migration / rollback:** Run a read-only legacy-data validation report before enabling strict validation; provide explicit repair/migration paths rather than silently dropping fields.

**Required result:** Show the affected files, exact commands, durable before/after evidence and unresolved edge cases. Do not close this finding solely because its happy path works.

### B15: Full profile backup omits newer collections

**Scope:** G3; High. Baseline: `src/services/exportSafety.ts:45`. Evidence: `finance-probes.json F13`.

**Implementation prompt:** Build complete profile backups from the contract registry, not a manually maintained legacy list. Include manifest version, collection counts, schema versions, ownership scope, checksums, attachment inventory and explicit omissions. Include pending local changes as separately identified unsynchronized material, not committed server facts.

**Regression baseline:** Build the full-export payload with household/card-EMI data in the current application context and inspect collection keys.

**Acceptance tests:** Seed every registered collection and an attachment; export and parse the artifact; prove exact counts and declared omissions. Test empty/mixed-version data and pending writes. Fail when a new collection lacks backup policy.

**Migration / rollback:** Preserve old backup readers and version the new format. Do not call it a complete backup until restore has been rehearsed.

**Required result:** Show the affected files, exact commands, durable before/after evidence and unresolved edge cases. Do not close this finding solely because its happy path works.

### B16: CA workbook sheets use inconsistent period and ledger contexts

**Scope:** G4; High. Baseline: `src/components/pages/ExportPage.tsx:89`. Evidence: `finance-probes.json F09`.

**Implementation prompt:** Create one immutable report context containing owner, date boundaries, timezone, selection, canonical rows, events/effects and opening/as-of balances. Both Reports and Export must use it. Apply the same period/scope to movement sheets; calculate balance sheets with explicit as-of semantics.

**Regression baseline:** Export only September transactions while passing August and September ledger events/effects, as ExportPage does. Also trace ReportsPage workbook invocation.

**Acceptance tests:** Generate the same workbook from both entry points; reconcile every summary to detail. Cover financial-year boundaries, midnight offsets, prior-year openings, deleted/reversed rows and a transaction outside the selected period.

**Migration / rollback:** Version report semantics and document any changed historical totals. Keep the raw snapshot and pre/post reconciliation evidence.

**Required result:** Show the affected files, exact commands, durable before/after evidence and unresolved edge cases. Do not close this finding solely because its happy path works.

### B17: CA report helpers read noncanonical balance and Udhari fields

**Scope:** G4; High. Baseline: `src/services/caReports.ts:331`. Evidence: `finance-probes.json F04-F05`.

**Implementation prompt:** Remove noncanonical balance and Udhari field assumptions. Use typed domain adapters with the actual principal/settlement/direction/date fields and opening balance contract. Reject or flag incomplete legacy data instead of substituting zero silently.

**Regression baseline:** Supply an account with openingBalancePaise=100000 and a payable Udhari with amount/settlement/givenDate fields from the canonical type.

**Acceptance tests:** Golden-test opening-only accounts, receivable/payable Udhari, partial settlements, write-offs, date filtering and all affected net-worth/export cells. Use fixtures derived from the real type contract.

**Migration / rollback:** Migrate fields explicitly with a dry-run mapping report. Do not mutate persisted principal values just to match a report.

**Required result:** Show the affected files, exact commands, durable before/after evidence and unresolved edge cases. Do not close this finding solely because its happy path works.

### B18: Some report totals ignore reversals and refunds

**Scope:** G4; High. Baseline: `src/services/caReports.ts:536`. Evidence: `finance-probes.json F06,F15`.

**Implementation prompt:** Define sign/direction handling once for financing cost, income and expense summaries. Exclude or reverse cancelled entries as appropriate; refunds reduce the correct expense cohort without double counting. Reconcile dashboard, monthly, annual, report and workbook totals against the same event set.

**Regression baseline:** Provide equal increase/decrease financing effects; export an expense of 100 with refund of 40.

**Acceptance tests:** A cost increase of 10000 and reversal of 10000 must net to zero; expense 100 with applicable refund 40 must net to 60. Add full/partial refunds, cross-period reversal policy, needs-review entries and duplicate reversal rejection.

**Migration / rollback:** Obtain finance approval for cross-period presentation and retain explanatory report version metadata.

**Required result:** Show the affected files, exact commands, durable before/after evidence and unresolved edge cases. Do not close this finding solely because its happy path works.

### B19: Oversized explicit mixed split can produce a negative component

**Scope:** G4; Medium. Baseline: `src/services/businessPersonalSplit.ts:33`. Evidence: `finance-probes.json F07`.

**Implementation prompt:** Validate mixed classification allocations in integer paise. Explicit personal and business portions must be nonnegative and sum to the total; percentages need bounded precision and deterministic residual allocation. Reject a personal allocation above total rather than producing a negative business component.

**Regression baseline:** Set total=10000 paise and splitPersonalPaise=15000 without a business component.

**Acceptance tests:** Property-test nonnegativity, conservation and deterministic rounding over broad integer ranges; cover 0/100%, 1 paise, explicit-over-total, NaN/infinite/unsafe values and contradictory explicit/percentage inputs.

**Migration / rollback:** Do not silently clamp existing invalid splits. Produce a review list and an explicit correction workflow.

**Required result:** Show the affected files, exact commands, durable before/after evidence and unresolved edge cases. Do not close this finding solely because its happy path works.

### B20: Two loans with the same lender stop the CA export

**Scope:** G4; Medium. Baseline: `src/exports/xlsxExporter.ts:366`. Evidence: `finance-probes.json F11`.

**Implementation prompt:** Generate deterministic unique workbook sheet names from stable record identity while respecting spreadsheet naming/length constraints. Escape illegal names, handle case-insensitive collisions and long lenders. Wrap export progress/resource cleanup in finally and surface actionable errors.

**Regression baseline:** Export two active loans whose lender is Same Bank.

**Acceptance tests:** Test two identical lenders, case variants, punctuation, maximum-length names, many collisions, library exceptions and retry after a failed download. Parse every resulting sheet and verify record-to-sheet mapping.

**Migration / rollback:** The sheet-name map belongs in the workbook manifest; avoid breaking consumers that assumed a lender name was unique.

**Required result:** Show the affected files, exact commands, durable before/after evidence and unresolved edge cases. Do not close this finding solely because its happy path works.

### B21: Excel master money cells are formatted strings

**Scope:** G4; Medium. Baseline: `src/exports/xlsxExporter.ts:62`. Evidence: `finance-probes.json F10`.

**Implementation prompt:** Write monetary, percentage and count values as numeric worksheet cells with number formats. Keep IDs, phone numbers, account identifiers and leading-zero values as text. Apply the rule consistently to master, detail and summary sheets.

**Regression baseline:** Inspect the Amount cell in the generated Transactions_Master sheet.

**Acceptance tests:** Inspect generated XLSX cell types and values directly, verify numeric SUM behavior in supported spreadsheet applications, and compare paise totals after round-trip parsing.

**Migration / rollback:** Treat any external workbook schema change as versioned; keep column names and data dictionaries explicit.

**Required result:** Show the affected files, exact commands, durable before/after evidence and unresolved edge cases. Do not close this finding solely because its happy path works.

### B22: CSV export does not neutralize formula-like user text

**Scope:** G4; Medium. Baseline: `src/exports/xlsxExporter.ts:472`. Evidence: `finance-probes.json F12`.

**Implementation prompt:** Introduce a dedicated export-cell policy for untrusted text and supported CSV/XLSX consumers. Detect formula-leading characters and control/whitespace prefixes; avoid executable formulas or hyperlinks from input. Keep true negative numbers numeric and preserve quoted/multiline text correctly.

**Regression baseline:** Export a transaction description starting with =1+1 to CSV.

**Acceptance tests:** Use harmless formula-like fixtures beginning with =, +, -, @, tabs/newlines and delimiter escapes. Inspect raw CSV and XLSX cell formulas/types; perform a supported-application opening test without exfiltration payloads.

**Migration / rollback:** Document text escaping to downstream users. Do not change stored descriptions merely to make exported output safe.

**Required result:** Show the affected files, exact commands, durable before/after evidence and unresolved edge cases. Do not close this finding solely because its happy path works.

### B23: Reconciliation can report matched without an independent statement balance

**Scope:** G4; High. Baseline: `src/services/caReports.ts:564`. Evidence: `finance-probes.json F14`.

**Implementation prompt:** Represent reconciliation as unverified, matched or discrepant with separate internal and independent external balances, source statement, date, reviewer and tolerance. Never default the external amount to the internal computed amount. Freeze reviewed reconciliation snapshots.

**Regression baseline:** Generate account reconciliation when currentBalancePaise is absent from the supplied account.

**Acceptance tests:** Missing external balance must remain unverified; test true zero versus missing, exact/tolerance/over-tolerance matches, duplicate statement rows, later edits and reversed transactions.

**Migration / rollback:** Reclassify historical auto-matched rows lacking evidence as needing review, using an auditable migration approved by the finance owner.

**Required result:** Show the affected files, exact commands, durable before/after evidence and unresolved edge cases. Do not close this finding solely because its happy path works.

### B24: Workbook business/personal summary ignores mixed allocations

**Scope:** G4; High. Baseline: `src/exports/xlsxExporter.ts:378`. Evidence: `finance-probes.json F16`.

**Implementation prompt:** Use the validated mixed-split engine for business and personal workbook totals. Report mixed gross amount only as an informational dimension, not as an alternative to allocating its components. Ensure no row is counted twice across categories.

**Regression baseline:** Export a 100 expense tagged mixed with 60 percent business allocation.

**Acceptance tests:** For a 100-unit transaction split 60/40, business must be 60 and personal 40. Reconcile classified and unclassified totals; cover refunds, rounding residuals, filters and category changes.

**Migration / rollback:** Version export definitions and retain a reconciliation explanation for previously inconsistent summaries.

**Required result:** Show the affected files, exact commands, durable before/after evidence and unresolved edge cases. Do not close this finding solely because its happy path works.

### B25: The reachable spreadsheet parser has high-severity advisories

**Scope:** G0/G4; High. Baseline: `src/components/pages/ImportPage.tsx:1`. Evidence: `dependency-audit.log`.

**Implementation prompt:** Inventory every spreadsheet parser entry point and verify the current official maintained distribution and advisories. Upgrade to a vetted supported version or replace the parser behind an adapter; pin integrity in the lockfile. Bound compressed/uncompressed sizes, row/cell counts and parse execution time, and isolate parsing where practical.

**Regression baseline:** Run npm audit --json and trace xlsx imports into the file-import page.

**Acceptance tests:** Use the advisory's safe reproducer fixtures, malformed archives, oversized workbooks, valid existing imports and all exported workbook round-trips. Prove the vulnerable runtime package is absent from the shipped artifact.

**Migration / rollback:** Do not run npm audit fix --force blindly. Keep a parser compatibility fixture corpus and a reviewed rollback package without the known runtime exposure.

**Required result:** Show the affected files, exact commands, durable before/after evidence and unresolved edge cases. Do not close this finding solely because its happy path works.

### B26: Development dependency security baseline is not clean

**Scope:** G0; Medium. Baseline: `package-lock.json:1`. Evidence: `dependency-audit.log`.

**Implementation prompt:** Separate production-reachable advisories from build/test-tool exposure and inspect dependency paths. Upgrade compatible packages in bounded groups, preserve lockfile reproducibility, and document residual advisory reachability, owner and expiry. Inspect the actual artifact rather than only the dependency count.

**Regression baseline:** Run npm audit --json against the current lockfile.

**Acceptance tests:** Run clean install, unit/API/browser/build/packaging gates after each dependency group. Scan generated assets, transitive versions and CI exposure. Report counts without equating advisory nodes to demonstrated exploits.

**Migration / rollback:** Record before/after lockfiles and supported Node/PHP versions. Do not approve runtime critical/high vulnerabilities without a documented security decision.

**Required result:** Show the affected files, exact commands, durable before/after evidence and unresolved edge cases. Do not close this finding solely because its happy path works.

### B27: Standard quality commands fail on metadata and environment assumptions

**Scope:** G0; Medium. Baseline: `tests/unit/phase-01-secrets.test.ts:11`. Evidence: `lint.log; unit-clean.log`.

**Implementation prompt:** Make quality gates independent of private .env files, preexisting release folders and PowerShell on non-Windows systems. Use native file enumeration and disposable fixtures that invoke real production packaging logic. Ignore AppleDouble metadata and immutable evidence artifacts, not application failures.

**Regression baseline:** Run npm run lint and the normal unit suite, then diagnostic runs excluding AppleDouble metadata.

**Acceptance tests:** Run normal npm run lint and npm run test from a clean checkout on macOS/Linux/Windows. Verify that an intentionally populated template secret fails packaging and actual schema drift fails the contract check.

**Migration / rollback:** Keep fixture generation deterministic and non-destructive; tests must not overwrite user release artifacts or invent blank deployment credentials.

**Required result:** Show the affected files, exact commands, durable before/after evidence and unresolved edge cases. Do not close this finding solely because its happy path works.

### B28: Several existing tests can pass without exercising the claimed behavior

**Scope:** G0/G2; Medium. Baseline: `tests/account-endpoints-e2e.mjs:81`. Evidence: `account-api.log; validation-api.log; browser-offline-existing.log; webhook-replay.log`.

**Implementation prompt:** Repair misleading tests to assert the intended layer: authenticated/CSRF-valid schema tests, real account-export ownership fixtures, real recovery through final login, full offline payload and server reconciliation, and valid webhook usernames. Fail setup instead of counting it as a passed business assertion.

**Regression baseline:** Review request setup and assertions for recovery, sync validation, account export, offline persistence and webhook replay.

**Acceptance tests:** Mutation-test the tests: restore the old bug temporarily in an isolated checkout or inject a deliberate defect and show the relevant regression fails. Do not change expected rejection codes to whichever early guard happens to fire.

**Migration / rollback:** Retain audit-baseline results as historical evidence. A renamed test is not coverage until its claimed behavior is asserted.

**Required result:** Show the affected files, exact commands, durable before/after evidence and unresolved edge cases. Do not close this finding solely because its happy path works.

### B29: Shared form labels and several icon controls lack accessible names

**Scope:** G5; Medium. Baseline: `src/components/ui/Label.tsx:21`. Evidence: `browser-audit.json`.

**Implementation prompt:** Repair the shared Field contract so labels, help text, required/error state and control IDs are connected. Add accessible names to icon controls and predictable focus return/trapping for dialogs. Audit all existing and new forms, not only the first input.

**Regression baseline:** Inspect Field markup and scan visible interactive elements in mobile views.

**Acceptance tests:** Keyboard/screen-reader and automated accessibility tests must cover input labeling, error association, focus order, disabled states, contrast and modal close/return. Test long localized values and mobile zoom.

**Migration / rollback:** Preserve existing design tokens and control APIs; migrate callers together and avoid a cosmetic redesign unrelated to the form contract.

**Required result:** Show the affected files, exact commands, durable before/after evidence and unresolved edge cases. Do not close this finding solely because its happy path works.

### B30: Mobile navigation omits Categories and Audit

**Scope:** G5; Medium. Baseline: `src/components/layout/CommandPalette.tsx:1`. Evidence: `browser-audit.json`.

**Implementation prompt:** Use one permission-aware navigation registry for desktop, mobile More menu, command palette and route handling. Include Categories and Audit with appropriate role access. Preserve current routes and make every enabled module reachable at the smallest supported width.

**Regression baseline:** At 390px inspect the bottom navigation and all command palette route buttons.

**Acceptance tests:** Compare registered routes with visible navigation at all requested widths and roles. Verify keyboard search, active states, browser back/forward, deep links and no accidental exposure of forbidden destinations.

**Migration / rollback:** Keep existing URLs stable; use explicit redirects for any approved rename.

**Required result:** Show the affected files, exact commands, durable before/after evidence and unresolved edge cases. Do not close this finding solely because its happy path works.

### B31: The initial application bundle is large and largely unsplit

**Scope:** G5; Medium. Baseline: `src/components/layout/AppShell.tsx:1`. Evidence: `build.log`.

**Implementation prompt:** Measure the initial dependency graph, then lazy-load route groups and heavy export/chart/document modules. Keep shared state/auth boundaries stable and provide proper loading/error recovery. Set explicit measured bundle/performance budgets instead of raising the warning threshold.

**Regression baseline:** Run the production Vite build and inspect emitted assets and chunk warnings.

**Acceptance tests:** Compare before/after compressed initial bytes and first interaction under a stated network/CPU profile. Test all lazy routes, offline cached routes, chunk-load failure, deployment with an old open tab and mobile rendering.

**Migration / rollback:** Retain old hashed assets during rollout to support existing tabs; never deploy an HTML/asset mismatch.

**Required result:** Show the affected files, exact commands, durable before/after evidence and unresolved edge cases. Do not close this finding solely because its happy path works.

### B32: The PHP development router serves repository internals

**Scope:** G5/G7; Medium. Baseline: `php/dev-router.php:1`. Evidence: `security-probes.json HTTP checks`.

**Implementation prompt:** Serve only intended public assets and API routes from development and deployed artifacts. Deny .git, source, configuration, logs, backups and SQL downloads; avoid exposing the repository root as a production document root. Test routing without relying on .htaccess being supported everywhere.

**Regression baseline:** GET /.git/HEAD, /package.json and /src/App.tsx from the audit PHP server rooted at the repository.

**Acceptance tests:** Probe /.git/HEAD, /src/App.tsx, /package.json, env variants, URL-encoded paths, source maps and traversal. Verify intended assets, SPA fallback and API behavior still work on the actual web server.

**Migration / rollback:** Deploy a public-document-root layout or an audited allowlist; roll back configuration with the same deny guarantees.

**Required result:** Show the affected files, exact commands, durable before/after evidence and unresolved edge cases. Do not close this finding solely because its happy path works.

### B33: Authorization and unexpected errors use misleading/raw 500 responses

**Scope:** G2/G7; Medium. Baseline: `api/admin/users.php:1`. Evidence: `security-probes.json S01`.

**Implementation prompt:** Introduce typed domain exceptions and a common response mapper. Return 401/403/404/409/422/503 as appropriate, a stable safe code and correlation ID. Log details privately; never expose SQL, stack traces, credentials or raw exception messages.

**Regression baseline:** Call admin/users as a normal active user; inspect wrapper catch behavior.

**Acceptance tests:** Exercise denied admin access, malformed payload, missing entity, version conflict, DB outage and unexpected exception on every wrapper family. Assert no successful UI state on a rejected request.

**Migration / rollback:** Preserve envelope compatibility where needed; update clients to classify status/code instead of matching message text.

**Required result:** Show the affected files, exact commands, durable before/after evidence and unresolved edge cases. Do not close this finding solely because its happy path works.

### B34: Concurrent default seeding creates duplicate accounts/categories

**Scope:** G1; Medium. Baseline: `src/services/defaultsService.ts:8`. Evidence: `browser-audit.json`.

**Implementation prompt:** Make initial defaults an idempotent server bootstrap or a deterministic-ID seed operation with database uniqueness. Add per-user single-flight loading in the client, but do not rely on a tab-local flag for correctness. Keep user-edited defaults intact and seed only missing canonical defaults.

**Regression baseline:** Register a fresh user in the development build; inspect initial accounts before and after one manual account creation.

**Acceptance tests:** Run React StrictMode initialization, loadAll/loadBootstrap overlap, two tabs, concurrent requests and a partially interrupted seed. Assert exactly one canonical default per user and unchanged custom data.

**Migration / rollback:** Do not deduplicate historical records by name automatically; create an explicit reference-preserving merge preview.

**Required result:** Show the affected files, exact commands, durable before/after evidence and unresolved edge cases. Do not close this finding solely because its happy path works.

### B35: Export description lists the wrong workbook sheet count

**Scope:** G5; Low. Baseline: `src/components/pages/ExportPage.tsx:1`. Evidence: `browser-audit.json`.

**Implementation prompt:** Derive export section counts and labels from the active workbook manifest. Update wording based on selected sections and optional per-record sheets. Remove unsupported guarantees from static copy.

**Regression baseline:** Compare CA Workbook description with a downloaded empty-profile workbook.

**Acceptance tests:** Compare UI count, manifest count and parsed workbook sheet count for empty, default, selected and multi-loan workbooks.

**Migration / rollback:** Copy-only changes must not conceal missing export content; complete B15/B16/B20 first.

**Required result:** Show the affected files, exact commands, durable before/after evidence and unresolved edge cases. Do not close this finding solely because its happy path works.

### B36: Seed branding/contact content remains placeholder-like

**Scope:** G5; Low. Baseline: `src/components/pages/admin/BrandingSettingsPage.tsx:1`. Evidence: `screenshots/admin-mobile.png`.

**Implementation prompt:** Identify actual configured company/support values versus placeholders and input examples. Require verified business contact values in deployment configuration and expose missing configuration honestly. Do not invent an email address, legal identifier or bank details.

**Regression baseline:** Open seeded admin branding settings and inspect the configured contact/legal values and placeholders.

**Acceptance tests:** Test fresh install, missing/invalid configured values, user/admin branding views and generated documents. Ensure fixture contacts cannot leak into production artifacts.

**Migration / rollback:** Keep development fixtures clearly synthetic; obtain company-owner approval before publishing legal/contact details.

**Required result:** Show the affected files, exact commands, durable before/after evidence and unresolved edge cases. Do not close this finding solely because its happy path works.

### B37: Financial references are checked for presence but not existence

**Scope:** G1; High. Baseline: `php/helpers/cloud_payload.php:288`. Evidence: `extra-probes.json X04`.

**Implementation prompt:** Validate existence, ownership and active state of every financial reference, including transfer accounts, category, card, loan, goal, Udhari, savings, original transaction and card EMI plan. Apply the same rules to direct create/patch, sync, restore and import. Prevent parent deletion from orphaning active transactions.

**Regression baseline:** Create an expense with nonempty accountId/categoryId values that do not exist.

**Acceptance tests:** Reject random/foreign/deleted IDs, self/circular links where forbidden, contradictory account/card references and a parent deleted concurrently. Accept valid linked records arriving together in a transaction. Extend beyond transaction references to the full registry.

**Migration / rollback:** Inventory existing orphans before enforcement and provide repair UX. Do not substitute arbitrary default accounts or categories.

**Required result:** Show the affected files, exact commands, durable before/after evidence and unresolved edge cases. Do not close this finding solely because its happy path works.

### B38: Backup restore breaks linked account and category references

**Scope:** G3; High. Baseline: `src/components/pages/ImportPage.tsx:488`. Evidence: `extra-probes.json X06`.

**Implementation prompt:** Restore a validated graph with preserved IDs when appropriate, or construct a complete source-to-target ID map before any insert. Rewrite every foreign link consistently, not only account/category. Verify ownership remapping, collisions, duplicates, attachments, schema versions and preview counts.

**Regression baseline:** Import a JSON backup with one account, one category and a transaction linked to their original IDs; accept Continue restore; inspect persisted entities.

**Acceptance tests:** Round-trip all collections into a fresh user/database and compare graph edges, balances, ledger totals and artifact hashes. Test same-user merge, new-user restore, partial failure, unknown schema and missing dependencies.

**Migration / rollback:** Restore to isolation first; promote only after review. Keep the original backup immutable and never overwrite a live profile on parser success alone.

**Required result:** Show the affected files, exact commands, durable before/after evidence and unresolved edge cases. Do not close this finding solely because its happy path works.

### B39: Wipe all profile data leaves newer profile collections behind

**Scope:** G3; High. Baseline: `src/components/pages/SettingsPage.tsx:147`. Evidence: `extra-probes.json X07`.

**Implementation prompt:** Define wipe scope separately from account closure and retention. Use a server-owned registry of profile collections, pending mutations, derived ledgers, attachments and user-facing settings. Require recent authentication, clear confirmation, durable job/status and an audit trail. Report retained legal records explicitly.

**Regression baseline:** Create a household, use Wipe all profile data, enter the required DELETE username phrase, confirm, then GET the household.

**Acceptance tests:** Seed every collection and document; wipe; verify intended server/local/object-store deletion and declared retention. Inject failure and retries; verify no replay restores wiped data and other users remain untouched.

**Migration / rollback:** Take an approved recoverable backup before destructive operations. Do not run a wipe in implementation or tests against the user's real profile.

**Required result:** Show the affected files, exact commands, durable before/after evidence and unresolved edge cases. Do not close this finding solely because its happy path works.

## Agency Module Prompts

These are new or substantially expanded modules, not fixes that can be honestly marked complete by renaming existing personal-finance screens. Each prompt includes all master-prompt requirements. Implement migrations, backend contracts, UI and tests together in a small vertical workflow before expanding its matrix.

### A01: Organization, Company Settings and Nine-Role Access

**Dependencies / decisions:** G1-G3; confirmed organization ownership and role policy.

**Implementation prompt:** Add organizations, authenticated memberships, invitations and explicit capabilities with organization/project/own-record scope. Keep platform administration separate from business-finance authority. Add company legal/contact/bank settings, financial-year/timezone/currency configuration, effective dates and recent-authentication protection. Do not place all agency records in the generic user-owned JSON bucket without tenant constraints.

**State and control contract:** Proposed boundaries: Super Admin manages platform/organization provisioning, not automatic business approvals; Admin manages its organization; Finance Manager controls approved financial workflows; Accountant manages permitted invoice/GST/report work; Partner sees its own allocations and requests payouts; Auditor is read-only; Project Manager is project-scoped; Employee submits own expenses; Viewer sees approved read-only data. Every role still obeys period locks and maker-checker restrictions.

**Required deliverables:** Organization and membership schema with foreign keys and unique active membership; typed permission service; invitation/session APIs; organization switcher and permission-aware routes. Provide a migration preview assigning existing personal records only with explicit ownership decisions.

**Acceptance tests:** Run all nine roles against each method/resource/action, direct URLs, guessed foreign IDs, revoked invitations, expired sessions and changed roles. Verify no cross-organization list, aggregate, export, attachment or background-job leakage.

**Release rule:** Feature-gate unfinished workflows. Do not expose a working-looking action until its server authorization, persistence, audit and failure state exist.

### A02: Canonical Accounting and Money Engine

**Dependencies / decisions:** A01; finance-approved chart of accounts and recognition policy.

**Implementation prompt:** Define the agency chart of accounts, immutable posted journals, balanced debit/credit lines, source links, currency, effective date and idempotent reversal. Keep operational draft records separate from posted financial facts. Continue integer minor units with safe rational intermediates and explicit rounding, not floating-point accumulation.

**State and control contract:** Use draft -> validated -> posted -> reversed states. Posting validates organization, open period, balanced lines, approved source state and unique source event. Corrections create linked reversal/replacement entries, not silent edits to posted history. Define cash/accrual treatment and opening-balance migration with the accountant.

**Required deliverables:** Schema and typed posting service; source-event mapping for invoice, receipt, bill, vendor payment, tax payment, partner payable/payout and adjustment; trial balance and source-to-journal reconciliation API. Do not describe the current target-effect ledger as a complete double-entry ledger.

**Acceptance tests:** Golden and property tests: debits equal credits per journal, conservation under reversal, exactly one posting per event, correct opening/as-of balances, cross-period correction, currency mismatch, overflows and database rollback at every line.

**Release rule:** Feature-gate unfinished workflows. Do not expose a working-looking action until its server authorization, persistence, audit and failure state exist.

### A03: Clients and Vendors

**Dependencies / decisions:** A01-A02.

**Implementation prompt:** Build client and vendor masters with legal/display name, contacts, addresses, registration/tax identifiers, currency, payment terms and archive status. Separate verified business facts from user notes; apply duplicate detection without name-based automatic merging. Link each party to documents, projects and its ledger.

**State and control contract:** Create/edit/archive/view statement/export are permission-controlled. Referenced parties are archived rather than deleted. A client who is also a vendor must not have its receivable and payable silently netted. A merge requires an explicit mapping preview and approval.

**Required deliverables:** Normalized party schema and CRUD/search/statement APIs; dense list/filter/detail views; client/vendor activity timeline; safe exports and field validation. Add explicit source IDs to invoices, quotations, receipts and expenses.

**Acceptance tests:** Test duplicate names/identifiers, Unicode contacts, missing tax data, foreign-party IDs, archive while referenced, statement openings/movements/closing, pagination, search scope and import collision handling.

**Release rule:** Feature-gate unfinished workflows. Do not expose a working-looking action until its server authorization, persistence, audit and failure state exist.

### A04: Projects, Milestones and Scope Changes

**Dependencies / decisions:** A01-A03.

**Implementation prompt:** Create projects linked to clients with managers, contract values, tax mode, milestones, budget, cost allocations, document links and status. Store approved calculation snapshots and effective scope amendments. Separate quoted value, invoiced revenue, recognized revenue, verified cash, approved cost and paid cost.

**State and control contract:** Support draft/active/on-hold/completed/closed/cancelled with explicit transition rules. Close requires approved reconciliations and unresolved-item checks; reopening needs reason and authorization. Quick Add must create the same valid contract as the full form. A scope change cannot rewrite an issued invoice.

**Required deliverables:** Project list/detail, margin/receivable/drilldown views; milestone and scope-change endpoints; project bundle export; links to quote/invoice/payment/expense. Add cost-center and membership constraints.

**Acceptance tests:** Test milestone partial billing, overbilling, cost after close, cancelled project, concurrent scope approval, role-scoped project visibility, profit snapshot stability and every quick-add versus full-form parity case.

**Release rule:** Feature-gate unfinished workflows. Do not expose a working-looking action until its server authorization, persistence, audit and failure state exist.

### A05: Quotations and Controlled Conversion

**Dependencies / decisions:** A01-A04; approved quotation numbering and validity policy.

**Implementation prompt:** Implement quotation versions, line items, packages/options, discounts, taxes, validity, terms, attachments and client acceptance evidence. Use the shared calculation engine and versioned company/client snapshots. Implement polished PDF and DOCX generation with full line-item pagination and branding.

**State and control contract:** Draft -> sent -> accepted/rejected/expired; revisions create a new version. Converting an accepted quote to a project or invoice is idempotent and records the exact source version. Do not create duplicate projects on repeated clicks or overwrite negotiated history.

**Required deliverables:** Quote editor, package comparison, preview, send/download/print, status timeline and conversion actions; versioned quote/conversion APIs; private generated artifacts and delivery status.

**Acceptance tests:** Test every state/action combination, expired acceptance, duplicate conversion, concurrent accept/revise, discounts, tax-inclusive/exclusive/no-tax configurations, long line descriptions, many pages, amount-in-words and unauthorized downloads.

**Release rule:** Feature-gate unfinished workflows. Do not expose a working-looking action until its server authorization, persistence, audit and failure state exist.

### A06: Invoices, Credit Notes and Billing Schedules

**Dependencies / decisions:** A01-A05; current official tax sources and accountant-approved invoice rules.

**Implementation prompt:** Build a versioned invoice model with financial-year-scoped unique numbering, client/supplier snapshots, line items, quantity precision, SAC/HSN where applicable, discount, tax components, rounding, totals, due date, terms, bank/payment details and linked projects/milestones. Support recurring retainers and AMC schedules with idempotent occurrence keys.

**State and control contract:** Draft -> approved -> issued/sent -> partially-paid/paid/overdue, with cancellation/revision and credit/debit notes defined by current legal/business rules. Issued numbers and calculation snapshots are immutable. Do not infer payment from an edited status field; derive settlement from verified allocations. Do not hardcode an assumed GST rate.

**Required deliverables:** Invoice editor/preview and line-item validation; approval/issue/send/credit/debit-note APIs; atomic numbering allocation; private PDF/DOCX/print artifacts; multi-page layout and amount-in-words. Implement effective-dated tax settings and exception warnings.

**Acceptance tests:** Test numbering under concurrency and financial-year rollover, repeat issue requests, inclusive/exclusive/exempt/out-of-scope cases as actually applicable, mixed rates, discounts, rounding, negative/zero values, note limits, partial payments, exports and locked-period rejection. Obtain signed finance golden fixtures.

**Release rule:** Feature-gate unfinished workflows. Do not expose a working-looking action until its server authorization, persistence, audit and failure state exist.

### A07: Payments, Allocations and Receipts

**Dependencies / decisions:** A01-A02, A06 and document storage.

**Implementation prompt:** Implement client payment capture with bank/account, date, amount, reference, proof and verification. Model allocations to one or more invoices separately from received cash, with an explicit unapplied balance. Create numbered receipts from verified payments using immutable issuer/recipient/payment snapshots.

**State and control contract:** Recorded -> verified -> partially/fully allocated; cancellation/reversal requires reason and authorization. A repeated provider webhook, import or manual retry cannot create a second cash posting or receipt. Verify payment amount, currency, organization, provider reference and source account before allocation.

**Required deliverables:** Payment list/detail and verification queue; allocation editor; receipt PDF/DOCX/share APIs; signed/private proof downloads; reconciliation links. Keep this separate from SparowVault's SaaS subscription checkout.

**Acceptance tests:** Test duplicate provider events, mismatched amounts/currency/owner, partial/over/unapplied receipts, one payment across invoices, repeated receipt generation, reversal after allocation, chargeback/refund and worker retry. Use provider sandbox only when configured.

**Release rule:** Feature-gate unfinished workflows. Do not expose a working-looking action until its server authorization, persistence, audit and failure state exist.

### A08: Receivables and Collections

**Dependencies / decisions:** A03, A06-A07.

**Implementation prompt:** Derive invoice outstanding balances and ageing from issued debit documents, valid credit notes and verified allocations. Add configurable ageing buckets, disputes, collection notes, promised payment dates and reminders with consent/delivery tracking.

**State and control contract:** Do not count draft/cancelled invoices as collectible balances. Disputed balances remain visible with a separate state. Reversing an allocation reopens the correct outstanding amount. Follow-up actions need assignee, timestamp and source invoice; reminder delivery does not equal payment.

**Required deliverables:** Receivables dashboard, client statements, due/overdue filters, drilldowns and follow-up queue; ageing and reminder APIs with stable occurrence keys; CSV/Excel/PDF exports from a dated snapshot.

**Acceptance tests:** Test due-date boundaries in company timezone, partial payments before/after the report date, credit notes, advance receipts, zero/negative balances, write-offs, duplicate reminders and cross-client aggregate isolation.

**Release rule:** Feature-gate unfinished workflows. Do not expose a working-looking action until its server authorization, persistence, audit and failure state exist.

### A09: Expenses, Vendor Payables and Budgets

**Dependencies / decisions:** A01-A04, A15-A16 foundation.

**Implementation prompt:** Add expense/bill records with vendor, project/cost center, categories, business allocation, taxes, proof, due date and approval state. Separate approved liability from actual payment. Link personal-finance expense imports only through an explicit reviewed migration. Add period/project/category budget versions and actual/committed/paid measures.

**State and control contract:** Draft -> submitted -> approved/rejected/changes-requested -> partially/fully paid -> reversed. Require maker-checker approval and prevent a paid-state flag from bypassing actual bank postings. Changing an approved amount invalidates approval. Budget changes require history and effective dates.

**Required deliverables:** Expense editor, receipt upload, approval queue, vendor ledger/payables, budget variance/burn views and payment actions; transactional approval/posting/payment APIs.

**Acceptance tests:** Test self-approval denial, stale approval, duplicate bill/reference, partial payment, foreign vendor/project, mixed allocations, credits/refunds, expense after close and budget actuals versus commitments. Reconcile vendor opening, liability, payments and closing.

**Release rule:** Feature-gate unfinished workflows. Do not expose a working-looking action until its server authorization, persistence, audit and failure state exist.

### A10: GST Register and Tax Reserve

**Dependencies / decisions:** A02, A06-A09; accountant-approved current tax specification.

**Implementation prompt:** Implement a source-linked tax register, not a sum of GST flags. Store supply classification, place-of-supply rationale, tax component/rate/version, taxable value, input-credit review state, return period, adjustments and payment proof. Separate collected output tax, eligible/reviewed input credit, payable and paid/reserve views.

**State and control contract:** Draft tax facts are not filing-ready. Issued invoices/notes determine immutable output entries; expense input credits require the approved eligibility workflow. Tax payments reconcile to bank postings and do not rewrite invoice history. Do not automate filing or claim compliance without verified applicability and provider setup.

**Required deliverables:** Month/financial-year register, missing-data and reconciliation warnings, payment/adjustment workflow, evidence links and accountant export. Use effective-dated configuration and explicitly flag unresolved SAC/rate/registration facts.

**Acceptance tests:** Test component sums, inclusive/exclusive calculations, intra/inter-state and export scenarios only when applicable, mixed rates, notes, amended periods, unverified input credit, tax payment reversal and invoice-to-register-to-CA-pack reconciliation.

**Release rule:** Feature-gate unfinished workflows. Do not expose a working-looking action until its server authorization, persistence, audit and failure state exist.

### A11: Partner Profit and Allocation Snapshots

**Dependencies / decisions:** A01-A04, A09-A10; signed LLP agreement and finance-approved distribution policy.

**Implementation prompt:** Model partners separately from household members. Store effective-dated share agreements, project/period allocation policy, retained reserve, disallowed distributions and approval evidence. Calculate accrual profit, approved distributable profit and cash eligibility separately.

**State and control contract:** Allocation runs create immutable versioned snapshots linked to source journals and the approved share agreement. Shares must satisfy the adopted policy and totals conserve paise with deterministic residuals. Loss carry-forward, reserves, tax and admin-charge treatment need explicit signed decisions, not invented defaults.

**Required deliverables:** Partner master/share-history UI, profit waterfall, allocation preview/approve API and own-partner statements. Changes to shares must not recalculate earlier approved allocations silently.

**Acceptance tests:** Test share changes over time, zero/negative profit, unequal shares and odd-paise residuals, cancelled sources, reserve changes, closed periods, duplicate allocation runs and own-versus-other partner visibility.

**Release rule:** Feature-gate unfinished workflows. Do not expose a working-looking action until its server authorization, persistence, audit and failure state exist.

### A12: Partner Payouts and Cash Eligibility

**Dependencies / decisions:** A07, A10-A11, A16.

**Implementation prompt:** Implement payout requests against approved payable balances and an independently calculated available-cash constraint. Define exclusions for tax reserve, committed liabilities, minimum cash reserve and pending payouts with the finance owner. Reserve approved payout capacity transactionally to prevent concurrent overspending.

**State and control contract:** Requested -> approved/rejected -> processing -> paid/failed -> reversed. Requesters cannot approve their own request. Paid requires verified bank/provider evidence and a journal entry; failure releases reservations under a deterministic retry contract. Approval is not the same as payment.

**Required deliverables:** Payout request/approval/payment views, eligibility explanation, partner statements, proof documents and reconciliation APIs. Enforce recent authentication and high-value approval rules on the server.

**Acceptance tests:** Test two simultaneous payouts against one available balance, overpay, negative cash, changed payable, duplicate payment callback, cancelled/reversed payout, bank failure and partner access restrictions. Reconcile payable, reserved, paid and remaining.

**Release rule:** Feature-gate unfinished workflows. Do not expose a working-looking action until its server authorization, persistence, audit and failure state exist.

### A13: Business Subscriptions and Renewals

**Dependencies / decisions:** A03-A04, A06-A09.

**Implementation prompt:** Separate client retainers/AMC revenue schedules, company vendor subscriptions and the app's own SaaS billing. Add contracts, renewal dates, proration/cancellation rules, invoice/proof links, reminders and budget/project associations.

**State and control contract:** Use durable occurrence IDs for scheduled invoices or bills. Renewal cannot duplicate an already generated occurrence. Cancelled contracts stop future billing under the approved policy without erasing issued documents. Provider payment status must not be accepted from browser input.

**Required deliverables:** Recurring contract editor, renewal calendar, due/paid statuses, vendor subscription views and scheduled generation job; link to invoices/expenses rather than duplicating finance totals.

**Acceptance tests:** Test date-end/leap-year/timezone boundaries, pause/resume/cancel, proration, schedule changes, duplicate scheduler execution, provider outage, invoice attachment access and revenue/expense separation.

**Release rule:** Feature-gate unfinished workflows. Do not expose a working-looking action until its server authorization, persistence, audit and failure state exist.

### A14: Other Income, Adjustments and Admin Usage

**Dependencies / decisions:** A01-A02, A04, A09-A10.

**Implementation prompt:** Add explicit other-income categories and audited adjustments using journal-backed operations. Model admin charges/usage as approved allocation rules or cost records, not invisible deductions from profit. Define whether each rule is fixed, percentage or attributable cost, with effective dates and transparent calculation snapshots.

**State and control contract:** Sensitive adjustments require a reason, supporting evidence, recent authentication and approval. Posted adjustments reverse through linked entries. Changes to admin-charge rules affect future approved calculations only unless an explicit correction is approved.

**Required deliverables:** Other-income editor, adjustment request/approval view, admin usage register, project allocation drilldown and corresponding APIs. Keep commercial app usage metrics separate from accounting charges.

**Acceptance tests:** Test negative corrections, principal versus income classification, duplicate rules, retrospective changes, rounding, closed periods, unsupported adjustments and reconciliation to profit, tax and cash reports.

**Release rule:** Feature-gate unfinished workflows. Do not expose a working-looking action until its server authorization, persistence, audit and failure state exist.

### A15: Private Documents and Generated Artifacts

**Dependencies / decisions:** A01-A03; confirmed storage and malware-scanning services.

**Implementation prompt:** Build private metadata and storage for PDF/image/DOCX proofs and generated artifacts. Validate sizes, declared and detected types, filenames, content and archive limits; quarantine until scanning completes. Link documents to a specific organization/module/entity and record checksum, version, uploader and retention state.

**State and control contract:** Uploaded -> quarantined -> clean/rejected -> verified/archived. Downloads require current resource authorization or short-lived scoped signed access. Deletion follows retention and does not silently erase required financial evidence. A generated CA pack inherits the strictest included-data scope.

**Required deliverables:** Upload/download/verify/archive APIs, proof viewer and document index; safe preview, expiry/revocation, background scan status and export-bundle inclusion. Keep storage objects private and filenames opaque.

**Acceptance tests:** Test valid formats, spoofed extensions/MIME, executable and oversize files, path traversal, archive bombs, unauthorized IDs, signed-link expiry, scan failure, orphan cleanup, download audit and restore of both metadata and binary objects.

**Release rule:** Feature-gate unfinished workflows. Do not expose a working-looking action until its server authorization, persistence, audit and failure state exist.

### A16: Approvals, Month Close and Authoritative Audit

**Dependencies / decisions:** A01-A02; finance-approved close/reopen and maker-checker policy.

**Implementation prompt:** Implement version-bound approval requests with steps, approvers, comments, evidence and transitions. Add period close with reconciliations, unresolved-item checks, immutable snapshot and lock enforced by the shared write service. Reopening requires reason and an approved correction process.

**State and control contract:** Approve/reject/request changes operates on a specific record version; an edit invalidates stale approval. Block self-approval by capability and actor identity, including batch/job paths. Closed periods reject financial create/edit/delete/import/replay across every source, not only the UI.

**Required deliverables:** Approval inbox/history; month-close checklist and reconciliation drilldowns; close/reopen APIs; read-only server audit search/export with before/after, actor, role, time, reason, correlation and evidence link.

**Acceptance tests:** Test every role/state transition, stale approvals, two approvers racing, rejected and resubmitted versions, close during posting, backdated import, offline replay into a closed period, reopen/correct/reclose and audit immutability.

**Release rule:** Feature-gate unfinished workflows. Do not expose a working-looking action until its server authorization, persistence, audit and failure state exist.

### A17: Reports and CA Export Center

**Dependencies / decisions:** A02-A16 and B15-B24 repaired.

**Implementation prompt:** Build report definitions over immutable dated snapshots with agreed cash/accrual and as-of semantics. Cover project margins, client/vendor ledgers, ageing, GST, partner allocations/payouts, budgets, other income, adjustments and admin usage. Add presets and drilldowns that reconcile to details.

**State and control contract:** CA pack generation is a durable job with selected sections, preflight warnings, document manifest, checksums, versioned financial definitions and explicit incomplete-data blockers. Success requires a valid finalized artifact; a partial ZIP is not a successful pack.

**Required deliverables:** Preview/validate/generate/cancel/retry/download/history APIs and a compact wizard; Excel/CSV/PDF/DOCX/ZIP outputs as required. Private downloads, permission-scoped sections, expiry, audit, numeric cells and safe text handling.

**Acceptance tests:** Parse all workbook/ZIP files, verify manifests/checksums/document links, render PDFs/DOCX at long-page boundaries and compare every summary to ledger/detail. Test empty/large/partial selection, duplicate names, generator failure, retries and all export roles.

**Release rule:** Feature-gate unfinished workflows. Do not expose a working-looking action until its server authorization, persistence, audit and failure state exist.

### A18: Dashboard, Search, Notifications and Read-Only AI

**Dependencies / decisions:** A02-A17; configured notification/AI providers only where required.

**Implementation prompt:** Create role-specific operational dashboards with cash versus accrual, receivables, approved/paid expenses, tax reserve, project margin and payout eligibility. Every KPI must open the matching filtered records. Add permission-aware global search, command palette and durable notification events.

**State and control contract:** Notifications require deduplication, user preferences, retry/acknowledgement and honest delivery states. AI is optional and read-only: summarize a permission-scoped snapshot with cited source records, never mutate finance or follow instructions embedded in uploaded documents. Display uncertainty and stale-data timestamps.

**Required deliverables:** Dashboard/filter/drilldown contracts; unified search registry; notification inbox and background delivery worker; evidence-linked AI summary endpoints with data minimization, limits and provider-off behavior.

**Acceptance tests:** Test KPI/report parity, filters/timezones, empty/unverified states, search leakage, duplicate reminders, failed delivery, provider timeouts, prompt injection in notes/documents, unsupported AI assertions and zero AI write authority.

**Release rule:** Feature-gate unfinished workflows. Do not expose a working-looking action until its server authorization, persistence, audit and failure state exist.

### A19: Complete Operational UI and Accessibility

**Dependencies / decisions:** A01-A18 delivered incrementally; B29-B31.

**Implementation prompt:** Apply the existing visual system to functional screens rather than marketing pages. Use dense scannable tables, restrained panels, explicit selection and permission-aware commands. Implement empty/loading/pending/error/conflict states for every required operation, including mobile More navigation, accessible dialogs and long financial forms.

**State and control contract:** Derive visible actions from capabilities and record state but keep server enforcement authoritative. Disabled controls need a reason; irreversible actions need clear confirmation and recent authentication where specified. Keep route/navigation semantics consistent.

**Required deliverables:** Page/action inventory for every module; reusable Field, table/filter, drawer, workflow timeline and status controls; responsive invoice/quote/export/approval/document experiences. Do not merely hide overflowing columns without access to the information.

**Acceptance tests:** Test 1920, 1440, 1366, 1024, 768, 430, 414, 390, 375 and 360 pixel widths; keyboard/screen-reader flows; long names, large rupee values, multiple dialogs, upload/download progress, paid/unpaid roles and real-device touch/zoom.

**Release rule:** Feature-gate unfinished workflows. Do not expose a working-looking action until its server authorization, persistence, audit and failure state exist.

### A20: Staging, Operations and Production Release

**Dependencies / decisions:** G0-G6; confirmed staging URL/host, secrets, provider sandboxes and owners.

**Implementation prompt:** Prepare an allowlisted, reproducible artifact with pinned dependencies and an explicit migration manifest. Configure HTTPS, trusted proxy boundaries, CSP, cookie/CSRF behavior, private document storage, runtime least privilege, backups, monitoring and rate limits. Use separate staging credentials and synthetic/anonymized data.

**State and control contract:** Deployment must have readiness checks and rollback criteria. Verify schema before enabling writes; retain compatible assets and durable queue/receipt/tombstone data. Backup restore must be rehearsed with agreed recovery point/time objectives. Never disable security guards merely to make a smoke test pass.

**Required deliverables:** CI/CD gate definitions, migration/rollback runbook, staging fixture seed, release manifest/checksums, incident guide, monitoring checks and alert delivery. Add provider sandbox capture/refund/webhook/renewal and message-delivery tests when credentials are actually available.

**Acceptance tests:** Execute the exact release artifact on the confirmed hosting stack; verify 401/403/404/409/422/503 behavior, source/secret denial, concurrency/load at agreed sizes, disk/DB/provider failures, restore, rollback and all required business UAT. Obtain engineering/security/finance/product sign-off; unresolved release blockers mean NO-GO.

**Release rule:** Feature-gate unfinished workflows. Do not expose a working-looking action until its server authorization, persistence, audit and failure state exist.

## Mandatory Cross-Cutting Matrices

### Required Module Coverage

| Brief module | Implementation prompts |
| --- | --- |
| Dashboard | A18, A19; B16-B19/B23-B24 |
| AI Insights | A18 |
| Clients | A03 |
| Quotations | A05 |
| Invoices | A06 |
| Receipts | A07 |
| Receivables | A08 |
| Projects | A04 |
| Payments | A07, A12, A13 |
| Expenses | A09 |
| Vendors | A03, A09 |
| GST Register | A10 |
| Partner Profit | A11 |
| Partner Payouts | A12 |
| Subscriptions | A13 |
| Other Income | A14 |
| Adjustments | A14 |
| Admin Usage | A14 |
| Budgets | A09 |
| Reports | A17 |
| CA Export Center | A17 |
| Documents | A15 |
| Month Close | A16 |
| Approvals | A16 |
| Audit Logs | A16, B13 |
| Settings | A01, A19; B06-B11/B15/B38/B39 |
| Users / Roles | A01; B07-B13 |
| Notification Center | A18 |
| Search / Command Palette | A18, A19; B30 |
| Hidden / internal jobs | A02, A13, A15-A18, A20 |

Keep the existing personal account, card, EMI, loan, Udhari, goal, wealth, investment, insurance, household, obligation, reconciliation and import-source modules in the regression suite. An agency extension must not remove or silently reinterpret them.

### Financial Acceptance Contract

The following are implementation invariants or proposed business definitions requiring finance approval, not a substitute for the company's accounting/tax policy.

| Area | Required invariant / explicit decision |
| --- | --- |
| Money | Canonical integer minor units; bounded values; safe intermediates; deterministic rounding; no NaN/infinity/unsafe integers |
| Invoice pricing | Quantity and unit-price precision, discount allocation, tax base, rounding and amount-in-words all derive from one versioned calculation |
| Tax components | Component sum equals total tax; taxable plus tax plus approved rounding equals grand total; actual rates/applicability are effective-dated configuration |
| Inclusive / exclusive / no GST | Separate explicit modes with signed accountant fixtures; no implicit mode inference from an amount |
| Receipts and remaining | Verified allocated receipts and valid notes reconcile to outstanding; excess becomes explicit unapplied cash, not negative receivable |
| Expenses | Approved cost, committed liability and paid cash are distinct; refunds/reversals affect the correct source and period |
| Profit | Revenue recognition, eligible expense, admin charge, tax and reserve policy are explicitly approved; cash is not mislabeled profit |
| Partner allocations | Frozen policy/share/source versions; allocated amounts plus residual/reserve conserve the approved distributable amount |
| Payouts | Paid/reserved amounts cannot exceed approved payable or approved available cash; concurrent requests cannot consume the same capacity |
| Balances | Opening plus valid increases minus decreases equals closing; movement reports and as-of balances use the correct date scope |
| Budgets | Actual, committed and paid are distinguishable; variance definition and sign are documented |
| Reconciliation | Independent external evidence is mandatory for a match; missing is not zero; changes invalidate or version review |
| GST register | Invoice/note tax, eligible reviewed credits, adjustments and payments are traceable and reconcile under the approved reporting policy |
| Reports / CA | Every total drills into the exact included rows; all formats share the same snapshot and definitions |
| Period close | Every financial entry point enforces the lock, including sync, import, scheduled jobs and administrative actions |
| Reversal | Source/effects/journal/audit are consistent; duplicate reversal is rejected; original posted evidence remains traceable |

### Role and Action Matrix

For each of Super Admin, Admin, Finance Manager, Accountant, Partner, Auditor, Project Manager, Employee and Viewer, enumerate:

- Read/list/detail/search/aggregate/export/download permissions and owner/project/organization scope.
- Create/edit/submit/approve/reject/request-changes/post/verify/pay/reverse/cancel/archive/delete permissions.
- Import/sync/restore/reset/bulk/job equivalents, including alternate verbs and direct endpoint calls.
- Required recent authentication, separation of duties, record version, open period and document evidence.
- Expected 2xx or precise denial code, with final database/effect/audit assertions.
- Permissions after role change, user deactivation, session revocation and organization switch.

Use table-driven tests derived from the approved capability registry. Do not hand-pick only the visible buttons.

### Lifecycle Matrix

| Workflow | Minimum states / transitions to exercise |
| --- | --- |
| Quotation | draft, sent, accepted, rejected, expired, revised, converted; repeated and concurrent conversion |
| Invoice | draft, approved, issued/sent, partially paid, paid, overdue, cancelled/revised; credit/debit notes |
| Client payment | recorded, verified, allocated/unapplied, cancelled/reversed; duplicate import/provider event |
| Expense | draft, submitted, changes requested, rejected, approved, partially paid, paid, reversed |
| Partner payout | requested, approved/rejected, processing, paid/failed, reversed; capacity reservation |
| Documents | uploading, quarantined, clean/rejected, verified, archived/deleted; unauthorized/expired download |
| Export | preview, blocked by validation, queued, running, completed, failed, cancelled, expired; retry |
| Period | open, close requested, closed, reopen requested, reopened, corrected, reclosed |
| Sync | pending, syncing, acknowledged, rejected, conflict; restart/response loss/reconnect |
| Session | anonymous, active, locked, rotation required, expired, revoked; PIN/recovery and role changes |

## Staging Handoff Prompt

> Read IMPLEMENTATION-STATUS.md and the latest evidence. Confirm the exact staging URL, hosting stack, organization/test users, secret sources, provider sandboxes, storage, backup retention and release owner. Build the allowlisted artifact from the verified worktree, record its commit/diff and SHA256 manifest, and apply approved additive migrations to a staging backup/clone first. Test the artifact on that host, not the Vite development server. Run the full role/action/state matrix for required modules, browser widths, parsed/rendered export checks, webhook replay, migration rerun, restore/rollback, source/secret-denial probes and agreed performance/failure-injection workloads. Verify real alert delivery. Produce a per-gate PASS/FAIL/NOT RUN report with evidence links, unresolved risks and sign-off owners. Do not deploy production or mark 100% ready while a required gate is unverified or a critical/high financial/security issue remains unresolved.

## Suggested Execution Boundaries

- Delivery 1: G0/G1 integrity foundation, with honest status for remaining version/reference compatibility and offline edge cases.
- Delivery 2: G2 authentication/authorization and G3 recovery/restore integrity.
- Delivery 3: G4 finance/export correctness and G5 usable mobile/accessibility foundation.
- Delivery 4: A01-A04 organization, journal, parties and project foundation, feature-gated.
- Delivery 5: A05-A10 quotation-to-cash, procure-to-pay and reviewed tax workflows.
- Delivery 6: A11-A16 partner controls, renewals, private documents, approvals and close.
- Delivery 7: A17-A19 accountant packs, evidence-based dashboards, search/notifications and optional read-only AI.
- Delivery 8: A20/G7/G8 staged operational certification and signed production decision.

These are dependency boundaries, not promised calendar dates. Every delivery must remain testable, reversible where appropriate and explicit about missing scope.
