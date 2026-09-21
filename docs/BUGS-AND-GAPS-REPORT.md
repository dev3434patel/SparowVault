# Bugs and Gaps Report

## Update - 11 September 2026

The [current finding register](FULL-PROJECT-AUDIT-2026-09-11.md#11-confirmed-finding-register) has 27 distinct findings: 0 confirmed Critical, 15 High, 10 Medium and 2 Low. Historical counts below must not be added to or substituted for the new results. Missing agency modules and unverified deployment checks are separately listed.

Audit date: 10 September 2026 (Asia/Kolkata). Repository: SparowVault. Baseline HEAD: `54eec068a37cceb9cccc2a63dca824e1e092f52e`. Scope includes the pre-existing local modifications. This is an audit-only deliverable, not a remediation or production certificate.

## Severity and counting

39 distinct findings: 2 Critical, 21 High, 14 Medium, 2 Low. Critical means plausible irreversible finance-data loss/duplication in a shared write path. High means material integrity/security/report correctness. Medium includes limited/contextual exposure, availability, accessibility and quality gates. Low is content/polish. Severity is an engineering judgment, not a CVSS score. Advisory package counts and absent agency modules are not added again to this total.

| ID | Severity | Finding | Evidence level |
| --- | --- | --- | --- |
| B01 | Critical | Unsynced financial data is erased by a successful cloud refresh | Reproduced |
| B02 | Critical | Concurrent retries can persist several entities for one mutation ID | Reproduced |
| B03 | High | Rejected sync batches leave partial financial writes | Reproduced |
| B04 | High | Stale sync data resurrects soft-deleted records | Reproduced |
| B05 | High | Collection hard-delete leaves posted SQL ledger events | Reproduced |
| B06 | High | Changing a PIN invalidates the configured recovery answer | Reproduced |
| B07 | High | PIN changes and logout do not revoke bearer sessions | Reproduced |
| B08 | High | Forced PIN rotation is not enforced for privileged access | Reproduced |
| B09 | High | Recovery settings allow a session holder to replace the PIN without the existing PIN | Reproduced |
| B10 | High | CSRF enforcement is inconsistent across cookie-authenticated mutations | Reproduced server-side; browser exploit not demonstrated |
| B11 | High | Spoofed forwarded IP addresses evade the login throttle | Reproduced |
| B12 | High | Household role restrictions can be bypassed through batch PATCH | Reproduced |
| B14 | High | Non-transaction collection contracts are not enforced as schemas | Reproduced |
| B15 | High | Full profile backup omits newer collections | Reproduced |
| B16 | High | CA workbook sheets use inconsistent period and ledger contexts | Reproduced |
| B17 | High | CA report helpers read noncanonical balance and Udhari fields | Reproduced |
| B18 | High | Some report totals ignore reversals and refunds | Reproduced |
| B23 | High | Reconciliation can report matched without an independent statement balance | Reproduced |
| B24 | High | Workbook business/personal summary ignores mixed allocations | Reproduced |
| B25 | High | The reachable spreadsheet parser has high-severity advisories | Dependency advisory plus source reachability; no exploit executed |
| B37 | High | Financial references are checked for presence but not existence | Reproduced |
| B38 | High | Backup restore breaks linked account and category references | Reproduced through the actual restore UI |
| B39 | High | Wipe all profile data leaves newer profile collections behind | Reproduced through the actual Settings UI |
| B13 | Medium | The user-visible audit collection accepts fabricated records | Reproduced |
| B19 | Medium | Oversized explicit mixed split can produce a negative component | Reproduced |
| B20 | Medium | Two loans with the same lender stop the CA export | Reproduced |
| B21 | Medium | Excel master money cells are formatted strings | Reproduced |
| B22 | Medium | CSV export does not neutralize formula-like user text | Reproduced serialization; spreadsheet execution not tested |
| B26 | Medium | Development dependency security baseline is not clean | Dependency scan |
| B27 | Medium | Standard quality commands fail on metadata and environment assumptions | Reproduced |
| B28 | Medium | Several existing tests can pass without exercising the claimed behavior | Reproduced and source review |
| B29 | Medium | Shared form labels and several icon controls lack accessible names | Source and browser scan |
| B30 | Medium | Mobile navigation omits Categories and Audit | Reproduced |
| B31 | Medium | The initial application bundle is large and largely unsplit | Measured build; user latency not benchmarked |
| B32 | Medium | The PHP development router serves repository internals | Reproduced locally |
| B33 | Medium | Authorization and unexpected errors use misleading/raw 500 responses | Reproduced and source review |
| B34 | Medium | Concurrent default seeding creates duplicate accounts/categories | Observed browser fixture; source race confirmed |
| B35 | Low | Export description lists the wrong workbook sheet count | Reproduced UI/content mismatch |
| B36 | Low | Seed branding/contact content remains placeholder-like | Observed test seed and source; production content unverified |

## B01: Unsynced financial data is erased by a successful cloud refresh

- Severity: **Critical**. Evidence: Reproduced.
- Primary source: [src/repositories/baseRepo.ts:52](</Volumes/ssd12/SparowVault/230826 SparowVault/src/repositories/baseRepo.ts:52>).
- Reproduction evidence: [browser-audit.json](</Volumes/ssd12/SparowVault/230826 SparowVault/docs/audit-evidence/2026-09-10/browser-audit.json>).
- Steps: Intercept the accounts POST with 503; create through the real accountRepo; confirm the IndexedDB row; call accountRepo.list while the server still has no such row.
- Expected versus actual: Local row exists before refresh and disappears afterwards. Its failed outbox marker remains, but no durable payload/replay restores it.
- Impact and limitations: Shared repository behavior can silently discard financial writes after the UI accepted them. All cloud-mapped collections use this path.
- Recommended fix, not applied: Persist a user-scoped payload-bearing outbox atomically with each local write; distinguish rejection from offline failure; merge cloud rows without deleting pending changes; implement retry and conflict handling.
- Required regression tests: Create/edit/delete offline, refresh, reload, restart browser, reconnect and reconcile one durable server row. Inject 401/403/422/500/timeout independently.

## B02: Concurrent retries can persist several entities for one mutation ID

- Severity: **Critical**. Evidence: Reproduced.
- Primary source: [php/controllers/cloud_data.php:222](</Volumes/ssd12/SparowVault/230826 SparowVault/php/controllers/cloud_data.php:222>).
- Reproduction evidence: [security-probes.json S14](</Volumes/ssd12/SparowVault/230826 SparowVault/docs/audit-evidence/2026-09-10/security-probes.json>).
- Steps: Send 24 simultaneous category creates with distinct entity IDs and one mutationId to a four-worker PHP server. Count persisted rows.
- Expected versus actual: Four distinct rows survived; expected one. Lookup occurs before the entity write and mutation-key insertion occurs afterwards.
- Impact and limitations: Exactly-once behavior is not guaranteed in the generic create path shared with transactions. The probe used categories, not a real payment; financial duplication is the shared-path risk.
- Recommended fix, not applied: Claim the mutation key, write entity, effects and audit in one SQL transaction; bind the key to request hash and operation; return the original result for exact retries and reject changed payloads.
- Required regression tests: Concurrent retries with 1/4/16 workers, response loss, database failure, same key/different payload, same key/different collection and two different users.

## B03: Rejected sync batches leave partial financial writes

- Severity: **High**. Evidence: Reproduced.
- Primary source: [php/controllers/cloud_data.php:69](</Volumes/ssd12/SparowVault/230826 SparowVault/php/controllers/cloud_data.php:69>).
- Reproduction evidence: [security-probes.json S10](</Volumes/ssd12/SparowVault/230826 SparowVault/docs/audit-evidence/2026-09-10/security-probes.json>).
- Steps: Push two transaction rows: one valid expense followed by a negative-paise row. Read the first row after the 422 response.
- Expected versus actual: The request is rejected but the first row remains accessible with HTTP 200.
- Impact and limitations: A user can retry a failed import/sync without knowing part of it committed; cross-record invariants and totals can diverge.
- Recommended fix, not applied: Validate the complete batch before writes and use an atomic transaction, or explicitly design and return per-row durable results with resumable keys.
- Required regression tests: Failure at every row and ledger/audit step must leave either all rows committed or an explicit, deterministic partial-result contract.

## B04: Stale sync data resurrects soft-deleted records

- Severity: **High**. Evidence: Reproduced.
- Primary source: [php/controllers/cloud_data.php:69](</Volumes/ssd12/SparowVault/230826 SparowVault/php/controllers/cloud_data.php:69>).
- Reproduction evidence: [security-probes.json S09](</Volumes/ssd12/SparowVault/230826 SparowVault/docs/audit-evidence/2026-09-10/security-probes.json>).
- Steps: Create a category, patch isDeleted=1, then sync the original older entity back.
- Expected versus actual: Sync returns 200 and isDeleted becomes 0. No version/tombstone conflict is enforced.
- Impact and limitations: Old devices can undo deletion or overwrite newer financial changes.
- Recommended fix, not applied: Enforce expected versions and persistent tombstones; return conflict records instead of unconditional upserts.
- Required regression tests: Two-device edit/delete races, offline replay after deletion, clock skew, missing versions and intentional restore.

## B05: Collection hard-delete leaves posted SQL ledger events

- Severity: **High**. Evidence: Reproduced.
- Primary source: [php/controllers/cloud_data.php:295](</Volumes/ssd12/SparowVault/230826 SparowVault/php/controllers/cloud_data.php:295>).
- Reproduction evidence: [security-probes.json S15](</Volumes/ssd12/SparowVault/230826 SparowVault/docs/audit-evidence/2026-09-10/security-probes.json>).
- Steps: Create a transaction that produces a persisted financial event; DELETE its whole collection without an ids list.
- Expected versus actual: The collection rows are removed, but the existing financial_events count remains one.
- Impact and limitations: The SQL ledger can disagree with the visible transaction store, invalidating reports and repair assumptions.
- Recommended fix, not applied: Route all removal paths through one transactional financial lifecycle with reversals or controlled purging and matching effects/audit updates.
- Required regression tests: Single, selected and whole-collection delete; rollback on event failure; assert no posted orphan event/effect.

## B06: Changing a PIN invalidates the configured recovery answer

- Severity: **High**. Evidence: Reproduced.
- Primary source: [php/controllers/cloud.php:346](</Volumes/ssd12/SparowVault/230826 SparowVault/php/controllers/cloud.php:346>).
- Reproduction evidence: [security-probes.json S05](</Volumes/ssd12/SparowVault/230826 SparowVault/docs/audit-evidence/2026-09-10/security-probes.json>).
- Steps: Set a security answer, change PIN with the correct current PIN, then submit the same answer for PIN reset.
- Expected versus actual: Reset returns 401. PIN salt rotated while the recovery answer remained hashed against the previous salt.
- Impact and limitations: Legitimate users lose recovery after an ordinary security operation.
- Recommended fix, not applied: Use an independent password-hash salt for recovery, or migrate recovery safely during a verified change; do not couple recovery to PIN salt.
- Required regression tests: Set/change/reset/change sequences, repeated resets, wrong answers, Unicode normalization and recovery migration.

## B07: PIN changes and logout do not revoke bearer sessions

- Severity: **High**. Evidence: Reproduced.
- Primary source: [php/helpers/auth.php:196](</Volumes/ssd12/SparowVault/230826 SparowVault/php/helpers/auth.php:196>).
- Reproduction evidence: [security-probes.json S06-S07](</Volumes/ssd12/SparowVault/230826 SparowVault/docs/audit-evidence/2026-09-10/security-probes.json>).
- Steps: Keep an issued bearer token, change the PIN, then log out. Call auth/me with the old token after each operation.
- Expected versus actual: Both old-token calls return 200. Logout clears the browser cookie but does not invalidate the token server-side.
- Impact and limitations: A stolen token remains useful after the user believes access was terminated.
- Recommended fix, not applied: Add session records or a server-checked token/session version; revoke/rotate on PIN reset/change and logout; define all-device logout.
- Required regression tests: Old bearer and cookie tokens after change/reset/logout/admin reset/deactivation; active-session inventory and expiry boundaries.

## B08: Forced PIN rotation is not enforced for privileged access

- Severity: **High**. Evidence: Reproduced.
- Primary source: [php/helpers/auth.php:210](</Volumes/ssd12/SparowVault/230826 SparowVault/php/helpers/auth.php:210>).
- Reproduction evidence: [extra-probes.json X01](</Volumes/ssd12/SparowVault/230826 SparowVault/docs/audit-evidence/2026-09-10/extra-probes.json>); [security-probes.json S08](</Volumes/ssd12/SparowVault/230826 SparowVault/docs/audit-evidence/2026-09-10/security-probes.json>).
- Steps: In the isolated database set admin must_change_pin=1 and call admin/users with its valid session. Restore the fixture flag afterwards.
- Expected versus actual: Privileged access remains allowed. The clean test seed also initially had must_change_pin=0 despite the documented default PIN.
- Impact and limitations: A seeded or administratively reset credential can retain full access without rotation. Not evidence that a public production admin still uses this PIN.
- Recommended fix, not applied: Enforce the flag server-side for all operations except rotation/logout; add a blocking UI; avoid reusable production seed credentials.
- Required regression tests: First login, flagged existing session, direct API calls, all admin endpoints and every account reset route.

## B09: Recovery settings allow a session holder to replace the PIN without the existing PIN

- Severity: **High**. Evidence: Reproduced.
- Primary source: [php/controllers/cloud.php:398](</Volumes/ssd12/SparowVault/230826 SparowVault/php/controllers/cloud.php:398>).
- Reproduction evidence: [extra-probes.json X02](</Volumes/ssd12/SparowVault/230826 SparowVault/docs/audit-evidence/2026-09-10/extra-probes.json>).
- Steps: With a valid session, replace the security question/answer without currentPin, then reset the PIN with that new answer.
- Expected versus actual: Both operations succeed without the original PIN.
- Impact and limitations: Compromise of an unlocked session can become permanent credential takeover; the ordinary PIN-change currentPin check is bypassed.
- Recommended fix, not applied: Require recent strong reauthentication for recovery changes and invalidate previous recovery material/sessions appropriately; audit and notify the owner.
- Required regression tests: Session-only recovery takeover attempt, stale reauthentication, PIN throttling, concurrent recovery replacement and legitimate reset.

## B10: CSRF enforcement is inconsistent across cookie-authenticated mutations

- Severity: **High**. Evidence: Reproduced server-side; browser exploit not demonstrated.
- Primary source: [api/auth/profile.php:1](</Volumes/ssd12/SparowVault/230826 SparowVault/api/auth/profile.php:1>).
- Reproduction evidence: [security-probes.json S02-S03](</Volumes/ssd12/SparowVault/230826 SparowVault/docs/audit-evidence/2026-09-10/security-probes.json>).
- Steps: Send profile PATCH with sv_auth cookie, no CSRF header and an untrusted Origin. Compare sync push without CSRF.
- Expected versus actual: Profile mutation returns 200; sync push returns 403. Other generic/admin mutation wrappers also do not universally invoke the CSRF guard.
- Impact and limitations: Protection depends on endpoint and browser deployment. SameSite=Lax and CORS mitigate some cross-site attacks, so this probe alone is not proof of an end-to-end cross-site exploit.
- Recommended fix, not applied: Centralize CSRF/Origin protection for cookie-authenticated writes; explicitly separate bearer-only clients; test the actual deployment origin and preflight behavior.
- Required regression tests: Same-site subdomain, cross-site fetch/form, absent/mismatched token, null Origin, strict CORS and bearer-only requests.

## B11: Spoofed forwarded IP addresses evade the login throttle

- Severity: **High**. Evidence: Reproduced.
- Primary source: [php/helpers/security.php:77](</Volumes/ssd12/SparowVault/230826 SparowVault/php/helpers/security.php:77>).
- Reproduction evidence: [security-probes.json S12](</Volumes/ssd12/SparowVault/230826 SparowVault/docs/audit-evidence/2026-09-10/security-probes.json>).
- Steps: Make seven wrong-PIN attempts for one username while changing X-Forwarded-For each time.
- Expected versus actual: All attempts return 401, never the intended lockout/rate-limit response. client_ip trusts forwarded headers without a trusted-proxy boundary.
- Impact and limitations: Short PIN credentials are vulnerable to distributed or header-rotating attempts; recovery endpoints also need dedicated throttling.
- Recommended fix, not applied: Trust proxy headers only from configured proxies; combine account-level, source-level and global abuse limits with recovery controls.
- Required regression tests: Direct-origin spoofing, legitimate proxy chains, IPv6, distributed attempts, lock expiry, reset and denial-of-service resistance.

## B12: Household role restrictions can be bypassed through batch PATCH

- Severity: **High**. Evidence: Reproduced.
- Primary source: [php/controllers/cloud_data.php:473](</Volumes/ssd12/SparowVault/230826 SparowVault/php/controllers/cloud_data.php:473>).
- Reproduction evidence: [security-probes.json S11](</Volumes/ssd12/SparowVault/230826 SparowVault/docs/audit-evidence/2026-09-10/security-probes.json>).
- Steps: Create a viewer member and attempt role=owner with single-item PATCH, then with the collection batch PATCH.
- Expected versus actual: Single-item update is denied with 422; batch update succeeds with 200.
- Impact and limitations: Alternate mutation paths weaken permissions. Household roles are local per-user records, not proven multi-user agency roles.
- Recommended fix, not applied: Resolve actual authenticated membership and enforce one authorization policy on create/single/batch/sync/delete paths.
- Required regression tests: Full owner/partner/viewer x operation x endpoint matrix including foreign households and membership removal.

## B14: Non-transaction collection contracts are not enforced as schemas

- Severity: **High**. Evidence: Reproduced.
- Primary source: [php/helpers/cloud_payload.php:435](</Volumes/ssd12/SparowVault/230826 SparowVault/php/helpers/cloud_payload.php:435>).
- Reproduction evidence: [extra-probes.json X03](</Volumes/ssd12/SparowVault/230826 SparowVault/docs/audit-evidence/2026-09-10/extra-probes.json>).
- Steps: Create a category with appliesTo=impossible and omit required presentation fields.
- Expected versus actual: HTTP 201 despite the generated contract declaring a constrained enum and required fields. Only transactions receive full domain validation.
- Impact and limitations: The 37-collection registry does not guarantee that stored data matches TypeScript assumptions; malformed records can propagate to UI and finance logic.
- Recommended fix, not applied: Generate and execute validators for every collection and operation; reject unknown enums, missing fields and invalid version/relationship changes consistently.
- Required regression tests: Contract-derived positive and negative cases for all 37 collections, create/patch/batch/sync/import parity.

## B15: Full profile backup omits newer collections

- Severity: **High**. Evidence: Reproduced.
- Primary source: [src/services/exportSafety.ts:45](</Volumes/ssd12/SparowVault/230826 SparowVault/src/services/exportSafety.ts:45>).
- Reproduction evidence: [finance-probes.json F13](</Volumes/ssd12/SparowVault/230826 SparowVault/docs/audit-evidence/2026-09-10/finance-probes.json>).
- Steps: Build the full-export payload with household/card-EMI data in the current application context and inspect collection keys.
- Expected versus actual: The helper includes only 16 legacy collections; current household/card-EMI and other vNext data are absent.
- Impact and limitations: A successful-looking backup cannot restore the complete profile. Account data-export is a different server export and must not be conflated with this UI backup.
- Recommended fix, not applied: Derive backup/restore coverage from versioned contracts; include dependencies and schema manifest; perform isolated round-trip verification before calling it full.
- Required regression tests: All 37 collections, deleted/tombstoned rows, cross-user isolation, attachment bytes versus metadata, legacy migrations and checksum comparisons.

## B16: CA workbook sheets use inconsistent period and ledger contexts

- Severity: **High**. Evidence: Reproduced.
- Primary source: [src/components/pages/ExportPage.tsx:89](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/ExportPage.tsx:89>).
- Reproduction evidence: [finance-probes.json F09](</Volumes/ssd12/SparowVault/230826 SparowVault/docs/audit-evidence/2026-09-10/finance-probes.json>).
- Steps: Export only September transactions while passing August and September ledger events/effects, as ExportPage does. Also trace ReportsPage workbook invocation.
- Expected versus actual: September export includes August in monthly summary. ReportsPage supplies no events/effects, so ledger-derived sheets can be empty while master transactions exist.
- Impact and limitations: One workbook can contain contradictory financial periods or totals.
- Recommended fix, not applied: Build a canonical report snapshot with a single period/time-zone policy and consistent linked event/effect sets; make both callers use it.
- Required regression tests: Identical exports from both entry points; opening/movement/closing handling; day/month/FY boundaries; no-data periods and refunds.

## B17: CA report helpers read noncanonical balance and Udhari fields

- Severity: **High**. Evidence: Reproduced.
- Primary source: [src/services/caReports.ts:331](</Volumes/ssd12/SparowVault/230826 SparowVault/src/services/caReports.ts:331>).
- Reproduction evidence: [finance-probes.json F04-F05](</Volumes/ssd12/SparowVault/230826 SparowVault/docs/audit-evidence/2026-09-10/finance-probes.json>).
- Steps: Supply an account with openingBalancePaise=100000 and a payable Udhari with amount/settlement/givenDate fields from the canonical type.
- Expected versus actual: Net worth returns zero for the opening balance. Udhari ageing returns zero outstanding, given direction and zero days instead of 40000, received and 252.
- Impact and limitations: Asset/debt/ageing outputs can materially misstate the user position. Related debt helpers also use ad-hoc optional balance fields.
- Recommended fix, not applied: Use typed canonical engines and settlement/effect data; eliminate cast-based alternate financial field names.
- Required regression tests: Opening-only accounts, receivable/payable partial settlement, card debt, loans, deleted rows and cross-report equality.

## B18: Some report totals ignore reversals and refunds

- Severity: **High**. Evidence: Reproduced.
- Primary source: [src/services/caReports.ts:536](</Volumes/ssd12/SparowVault/230826 SparowVault/src/services/caReports.ts:536>).
- Reproduction evidence: [finance-probes.json F06,F15](</Volumes/ssd12/SparowVault/230826 SparowVault/docs/audit-evidence/2026-09-10/finance-probes.json>).
- Steps: Provide equal increase/decrease financing effects; export an expense of 100 with refund of 40.
- Expected versus actual: Financing cost becomes 20000 paise rather than zero; annual expense is 100 rather than net 60.
- Impact and limitations: Report definitions disagree with ledger lifecycle semantics and can overstate expenses.
- Recommended fix, not applied: Use signed, status-aware canonical aggregates; name gross versus net values explicitly; share them across dashboard/report/export.
- Required regression tests: Full/partial refund, reversal-of-reversal, fees and tax reversal, refunded card expense, year boundary and raw/effect parity.

## B23: Reconciliation can report matched without an independent statement balance

- Severity: **High**. Evidence: Reproduced.
- Primary source: [src/services/caReports.ts:564](</Volumes/ssd12/SparowVault/230826 SparowVault/src/services/caReports.ts:564>).
- Reproduction evidence: [finance-probes.json F14](</Volumes/ssd12/SparowVault/230826 SparowVault/docs/audit-evidence/2026-09-10/finance-probes.json>).
- Steps: Generate account reconciliation when currentBalancePaise is absent from the supplied account.
- Expected versus actual: External balance defaults to the calculated closing balance, making variance zero and matched true by construction.
- Impact and limitations: A user or accountant can receive false assurance that books agree with a bank statement.
- Recommended fix, not applied: Represent missing evidence as unverified; require an independently sourced dated statement balance and explicit match provenance.
- Required regression tests: Missing statement, real equal/different balances, period boundary, currency, duplicate imported statements and stale match invalidation.

## B24: Workbook business/personal summary ignores mixed allocations

- Severity: **High**. Evidence: Reproduced.
- Primary source: [src/exports/xlsxExporter.ts:378](</Volumes/ssd12/SparowVault/230826 SparowVault/src/exports/xlsxExporter.ts:378>).
- Reproduction evidence: [finance-probes.json F16](</Volumes/ssd12/SparowVault/230826 SparowVault/docs/audit-evidence/2026-09-10/finance-probes.json>).
- Steps: Export a 100 expense tagged mixed with 60 percent business allocation.
- Expected versus actual: Business and Personal rows remain zero; amount is only listed as Mixed. Expected allocated components are 60 and 40.
- Impact and limitations: The workbook split is inconsistent with the core split engine and unsuitable as a complete business/personal allocation.
- Recommended fix, not applied: Use sumSplit on the same filtered lifecycle-aware transactions and expose unallocated totals distinctly.
- Required regression tests: 0/60/100 percent, explicit paise split, refunds, CSV/XLSX totals and comparison to report detail.

## B25: The reachable spreadsheet parser has high-severity advisories

- Severity: **High**. Evidence: Dependency advisory plus source reachability; no exploit executed.
- Primary source: [src/components/pages/ImportPage.tsx:1](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/ImportPage.tsx:1>).
- Reproduction evidence: [dependency-audit.log](</Volumes/ssd12/SparowVault/230826 SparowVault/docs/audit-evidence/2026-09-10/dependency-audit.log>).
- Steps: Run npm audit --json and trace xlsx imports into the file-import page.
- Expected versus actual: Installed xlsx 0.18.5 is reported for prototype-pollution and ReDoS advisories with no npm-registry fix offered in that result.
- Impact and limitations: Untrusted spreadsheet parsing is a runtime surface; advisory presence is not proof of successful exploitation in this application.
- Recommended fix, not applied: Choose a maintained upstream-supported distribution or replacement after compatibility review; add file/row/size/time limits and regression fixtures. Do not blindly run npm audit fix --force.
- Required regression tests: Representative bank workbooks, malicious/oversized/corrupt inputs, parse time budgets, formula cells and import-preview integrity.

## B37: Financial references are checked for presence but not existence

- Severity: **High**. Evidence: Reproduced.
- Primary source: [php/helpers/cloud_payload.php:288](</Volumes/ssd12/SparowVault/230826 SparowVault/php/helpers/cloud_payload.php:288>).
- Reproduction evidence: [extra-probes.json X04](</Volumes/ssd12/SparowVault/230826 SparowVault/docs/audit-evidence/2026-09-10/extra-probes.json>).
- Steps: Create an expense with nonempty accountId/categoryId values that do not exist.
- Expected versus actual: The server returns 201. A nonempty string passes validation without an owned referenced record.
- Impact and limitations: Orphan references can enter financial records via direct APIs; client-side refIntegrity does not protect backend writes or deletes. This is not evidence of reading a foreign account.
- Recommended fix, not applied: Check owned, active referenced entities in the same transaction; enforce deletion dependencies and intentional historical-reference rules.
- Required regression tests: Missing, foreign-user, deleted and concurrently removed references for account/card/loan/goal/category/Udhari paths.

## B38: Backup restore breaks linked account and category references

- Severity: **High**. Evidence: Reproduced through the actual restore UI.
- Primary source: [src/components/pages/ImportPage.tsx:488](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/ImportPage.tsx:488>).
- Reproduction evidence: [extra-probes.json X06](</Volumes/ssd12/SparowVault/230826 SparowVault/docs/audit-evidence/2026-09-10/extra-probes.json>).
- Steps: Import a JSON backup with one account, one category and a transaction linked to their original IDs; accept Continue restore; inspect persisted entities.
- Expected versus actual: UI reports Backup restored, but neither transaction accountId nor categoryId resolves. Restore discards entity IDs and generates new ones without a relationship map.
- Impact and limitations: A backup can restore rows while destroying financial meaning and balance attribution. This is independent of missing newer collections in B15.
- Recommended fix, not applied: Build a two-pass old-to-new ID map, rewrite every foreign key/link, validate complete graphs and restore atomically with a preview and conflict policy.
- Required regression tests: Cross-profile and same-profile restore, repeated restore, all relationship types, cyclic links, partial failure and canonical checksum equality.

## B39: Wipe all profile data leaves newer profile collections behind

- Severity: **High**. Evidence: Reproduced through the actual Settings UI.
- Primary source: [src/components/pages/SettingsPage.tsx:147](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/SettingsPage.tsx:147>).
- Reproduction evidence: [extra-probes.json X07](</Volumes/ssd12/SparowVault/230826 SparowVault/docs/audit-evidence/2026-09-10/extra-probes.json>).
- Steps: Create a household, use Wipe all profile data, enter the required DELETE username phrase, confirm, then GET the household.
- Expected versus actual: UI reports Profile data wiped, but the household still returns 200. Only 17 legacy repositories are cleared; the operation is a sequential partial wipe.
- Impact and limitations: The promised data removal is incomplete and may leave sensitive hidden data and orphan references. Separate account deletion is a different retained/soft-delete policy.
- Recommended fix, not applied: Define wipe versus retained records explicitly; execute a server-controlled all-contract operation with reauthentication, audit and atomicity/recovery semantics.
- Required regression tests: All 37 collections, attachment bytes, local caches, outbox, failure halfway, cancel/wrong confirmation, account deletion distinction and documented retention.

## B13: The user-visible audit collection accepts fabricated records

- Severity: **Medium**. Evidence: Reproduced.
- Primary source: [php/controllers/cloud_data.php:190](</Volumes/ssd12/SparowVault/230826 SparowVault/php/controllers/cloud_data.php:190>).
- Reproduction evidence: [security-probes.json S13](</Volumes/ssd12/SparowVault/230826 SparowVault/docs/audit-evidence/2026-09-10/security-probes.json>).
- Steps: POST an invented action into the generic auditLogs collection.
- Expected versus actual: Server accepts it with 201. The user-facing audit trail is writable data. Separate SQL audit_logs/admin_audit_logs are not shown to be editable through this endpoint.
- Impact and limitations: Users or client bugs can create authoritative-looking history that must not be treated as immutable accounting evidence.
- Recommended fix, not applied: Separate server-authoritative append-only audit from user activity annotations; expose a read-only authorized audit API and clear provenance.
- Required regression tests: Reject client audit mutation/deletion; verify actor, timestamp, before/after, correlation ID and transaction rollback semantics.

## B19: Oversized explicit mixed split can produce a negative component

- Severity: **Medium**. Evidence: Reproduced.
- Primary source: [src/services/businessPersonalSplit.ts:33](</Volumes/ssd12/SparowVault/230826 SparowVault/src/services/businessPersonalSplit.ts:33>).
- Reproduction evidence: [finance-probes.json F07](</Volumes/ssd12/SparowVault/230826 SparowVault/docs/audit-evidence/2026-09-10/finance-probes.json>).
- Steps: Set total=10000 paise and splitPersonalPaise=15000 without a business component.
- Expected versus actual: Business component becomes -5000. Valid percentage splitting does conserve totals across 14443 sampled cases.
- Impact and limitations: Malformed/imported data can create negative business spending even though total conservation alone passes.
- Recommended fix, not applied: Reject negative/out-of-range component inputs and enforce nonnegative sum-equals-total invariants at API and UI boundaries.
- Required regression tests: Both explicit fields, one explicit field, zero/negative/noninteger/oversized amounts, percentages outside bounds and integer overflow.

## B20: Two loans with the same lender stop the CA export

- Severity: **Medium**. Evidence: Reproduced.
- Primary source: [src/exports/xlsxExporter.ts:366](</Volumes/ssd12/SparowVault/230826 SparowVault/src/exports/xlsxExporter.ts:366>).
- Reproduction evidence: [finance-probes.json F11](</Volumes/ssd12/SparowVault/230826 SparowVault/docs/audit-evidence/2026-09-10/finance-probes.json>).
- Steps: Export two active loans whose lender is Same Bank.
- Expected versus actual: Duplicate Amort_Same_Bank worksheet name throws. ExportPage caExport lacks try/finally and may remain in its exporting state.
- Impact and limitations: A common real profile cannot download the workbook; errors do not reliably recover the control.
- Recommended fix, not applied: Generate deterministic unique sanitized sheet names and wrap all export steps in catch/finally with an actionable error.
- Required regression tests: Duplicate names, names equal after truncation/sanitization, blank names, >31 characters and repeated download after failure.

## B21: Excel master money cells are formatted strings

- Severity: **Medium**. Evidence: Reproduced.
- Primary source: [src/exports/xlsxExporter.ts:62](</Volumes/ssd12/SparowVault/230826 SparowVault/src/exports/xlsxExporter.ts:62>).
- Reproduction evidence: [finance-probes.json F10](</Volumes/ssd12/SparowVault/230826 SparowVault/docs/audit-evidence/2026-09-10/finance-probes.json>).
- Steps: Inspect the Amount cell in the generated Transactions_Master sheet.
- Expected versus actual: Cell type is s rather than n because currency formatting is applied before worksheet creation.
- Impact and limitations: Accountants cannot reliably sum/filter these cells as numeric money without cleanup; spreadsheet integrity is reduced.
- Recommended fix, not applied: Write numeric rupee values with explicit number formats and preserve paise precision in machine-readable exports.
- Required regression tests: Parse saved workbook, assert numeric types/formats, SUM equality and locale-independent round-trip.

## B22: CSV export does not neutralize formula-like user text

- Severity: **Medium**. Evidence: Reproduced serialization; spreadsheet execution not tested.
- Primary source: [src/exports/xlsxExporter.ts:472](</Volumes/ssd12/SparowVault/230826 SparowVault/src/exports/xlsxExporter.ts:472>).
- Reproduction evidence: [finance-probes.json F12](</Volumes/ssd12/SparowVault/230826 SparowVault/docs/audit-evidence/2026-09-10/finance-probes.json>).
- Steps: Export a transaction description starting with =1+1 to CSV.
- Expected versus actual: Formula-like text remains in output. XLSX text-cell behavior is different and was not classified as the same vulnerability.
- Impact and limitations: Opening untrusted descriptions in a spreadsheet may interpret formulas. No external exfiltration payload was executed.
- Recommended fix, not applied: Apply a documented spreadsheet-safe CSV text policy; preserve original values in JSON; test target spreadsheet behavior.
- Required regression tests: Leading =,+,-,@, whitespace/tab/newline and delimiter/quote combinations; Excel/LibreOffice opening tests with harmless payloads.

## B26: Development dependency security baseline is not clean

- Severity: **Medium**. Evidence: Dependency scan.
- Primary source: [package-lock.json:1](</Volumes/ssd12/SparowVault/230826 SparowVault/package-lock.json:1>).
- Reproduction evidence: [dependency-audit.log](</Volumes/ssd12/SparowVault/230826 SparowVault/docs/audit-evidence/2026-09-10/dependency-audit.log>).
- Steps: Run npm audit --json against the current lockfile.
- Expected versus actual: 19 vulnerable dependency nodes: 4 critical, 7 high, 7 moderate, 1 low. Several are transitive development tooling; this is not 19 independent application exploits.
- Impact and limitations: Developer/CI attack surface and release maintenance risk remain. Vitest UI exposure is conditional and was not enabled in this audit.
- Recommended fix, not applied: Update direct dependencies in reviewed groups with lockfile and build/test validation; separate runtime and dev exposure and record accepted exceptions.
- Required regression tests: Clean dependency scan, package integrity, scripts/build/coverage compatibility and dev server exposure tests.

## B27: Standard quality commands fail on metadata and environment assumptions

- Severity: **Medium**. Evidence: Reproduced.
- Primary source: [tests/unit/phase-01-secrets.test.ts:11](</Volumes/ssd12/SparowVault/230826 SparowVault/tests/unit/phase-01-secrets.test.ts:11>).
- Reproduction evidence: [lint.log](</Volumes/ssd12/SparowVault/230826 SparowVault/docs/audit-evidence/2026-09-10/lint.log>); [unit-clean.log](</Volumes/ssd12/SparowVault/230826 SparowVault/docs/audit-evidence/2026-09-10/unit-clean.log>).
- Steps: Run npm run lint and the normal unit suite, then diagnostic runs excluding AppleDouble metadata.
- Expected versus actual: Normal lint has 279 parse errors. Clean unit run still has four failures: two missing .env.host fixtures and two Windows powershell invocations on macOS.
- Impact and limitations: The advertised quality gate is not reproducible on this machine. These are test/configuration failures, not evidence that 279 application files are broken.
- Recommended fix, not applied: Ignore filesystem metadata in discovery and make secret/contract tests portable and self-contained; do not commit real secret files to satisfy tests.
- Required regression tests: Fresh checkout on macOS/Linux/Windows without private env files; stable suite counts and no secret leakage.

## B28: Several existing tests can pass without exercising the claimed behavior

- Severity: **Medium**. Evidence: Reproduced and source review.
- Primary source: [tests/account-endpoints-e2e.mjs:81](</Volumes/ssd12/SparowVault/230826 SparowVault/tests/account-endpoints-e2e.mjs:81>).
- Reproduction evidence: [account-api.log](</Volumes/ssd12/SparowVault/230826 SparowVault/docs/audit-evidence/2026-09-10/account-api.log>); [validation-api.log](</Volumes/ssd12/SparowVault/230826 SparowVault/docs/audit-evidence/2026-09-10/validation-api.log>); [browser-offline-existing.log](</Volumes/ssd12/SparowVault/230826 SparowVault/docs/audit-evidence/2026-09-10/browser-offline-existing.log>); [webhook-replay.log](</Volumes/ssd12/SparowVault/230826 SparowVault/docs/audit-evidence/2026-09-10/webhook-replay.log>).
- Steps: Review request setup and assertions for recovery, sync validation, account export, offline persistence and webhook replay.
- Expected versus actual: Validation cases receive CSRF 403 before schema checks; export fixture pushes fail silently; offline test stores only a marker; recovery browser test lacks success assertion; replay fixture username exceeds VARCHAR(20).
- Impact and limitations: Green log lines overstate business-flow assurance. Extra probe X05 confirms a correctly seeded own-data server export succeeds.
- Recommended fix, not applied: Assert fixture creation before assertions, expected status/code/body and final durable state; test real offline financial writes; fix fixture bounds.
- Required regression tests: Each formerly false-positive test must fail against the known defect and pass after a scoped fix; avoid click-only success.

## B29: Shared form labels and several icon controls lack accessible names

- Severity: **Medium**. Evidence: Source and browser scan.
- Primary source: [src/components/ui/Label.tsx:21](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/ui/Label.tsx:21>).
- Reproduction evidence: [browser-audit.json](</Volumes/ssd12/SparowVault/230826 SparowVault/docs/audit-evidence/2026-09-10/browser-audit.json>).
- Steps: Inspect Field markup and scan visible interactive elements in mobile views.
- Expected versus actual: Field renders a sibling Label without htmlFor/input id linkage. Profile scan found 20 unnamed-control candidates; category actions and account icon buttons add more.
- Impact and limitations: Screen-reader/form navigation is impaired. The heuristic scan is not a full accessibility conformance assessment.
- Recommended fix, not applied: Generate stable field IDs, associate label/hint/error, provide aria-invalid and explicit button names; test keyboard/focus semantics.
- Required regression tests: Axe plus manual VoiceOver, keyboard-only dialog flows, label activation and error announcements on desktop/mobile.

## B30: Mobile navigation omits Categories and Audit

- Severity: **Medium**. Evidence: Reproduced.
- Primary source: [src/components/layout/CommandPalette.tsx:1](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/layout/CommandPalette.tsx:1>).
- Reproduction evidence: [browser-audit.json](</Volumes/ssd12/SparowVault/230826 SparowVault/docs/audit-evidence/2026-09-10/browser-audit.json>).
- Steps: At 390px inspect the bottom navigation and all command palette route buttons.
- Expected versus actual: Neither Go to Categories nor Go to Audit is present; desktop sidebar includes both. Direct URL navigation still works.
- Impact and limitations: Users on mobile lose discoverable access to important data-management and audit features.
- Recommended fix, not applied: Derive mobile More menu and palette from the canonical authorized route registry; include all accessible routes with predictable grouping.
- Required regression tests: Every allowed route reachable without typing URLs at 360-430px; hidden/paid/admin routes handled correctly.

## B31: The initial application bundle is large and largely unsplit

- Severity: **Medium**. Evidence: Measured build; user latency not benchmarked.
- Primary source: [src/components/layout/AppShell.tsx:1](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/layout/AppShell.tsx:1>).
- Reproduction evidence: [build.log](</Volumes/ssd12/SparowVault/230826 SparowVault/docs/audit-evidence/2026-09-10/build.log>).
- Steps: Run the production Vite build and inspect emitted assets and chunk warnings.
- Expected versus actual: Main JS is 2099.49 kB, gzip 620.68 kB; 3453 modules transformed. Static and dynamic imports overlap.
- Impact and limitations: Parsing and first-load cost may be substantial on low-end/mobile networks; no numeric latency claim is made without profiling.
- Recommended fix, not applied: Introduce route-level lazy chunks and defer spreadsheet/chart tooling, then profile before further optimization.
- Required regression tests: Lighthouse/Web Vitals and CPU/network traces on representative devices; no route blank states or asset-loading regressions.

## B32: The PHP development router serves repository internals

- Severity: **Medium**. Evidence: Reproduced locally.
- Primary source: [php/dev-router.php:1](</Volumes/ssd12/SparowVault/230826 SparowVault/php/dev-router.php:1>).
- Reproduction evidence: [security-probes.json HTTP checks](</Volumes/ssd12/SparowVault/230826 SparowVault/docs/audit-evidence/2026-09-10/security-probes.json>).
- Steps: GET /.git/HEAD, /package.json and /src/App.tsx from the audit PHP server rooted at the repository.
- Expected versus actual: All return 200. .env and sql/schema.sql return 403. The production packaging allowlist excludes most source/git files.
- Impact and limitations: Exposing this development server or deploying the raw root would reveal source/history. Public production exposure was not tested or established.
- Recommended fix, not applied: Keep dev servers loopback-only; deny dotfiles and source paths; deploy only the reviewed build artifact and test actual hosting rules.
- Required regression tests: Forbidden paths and encoded variants against PHP dev and Apache staging; no git/source/secret/backup downloads.

## B33: Authorization and unexpected errors use misleading/raw 500 responses

- Severity: **Medium**. Evidence: Reproduced and source review.
- Primary source: [api/admin/users.php:1](</Volumes/ssd12/SparowVault/230826 SparowVault/api/admin/users.php:1>).
- Reproduction evidence: [security-probes.json S01](</Volumes/ssd12/SparowVault/230826 SparowVault/docs/audit-evidence/2026-09-10/security-probes.json>).
- Steps: Call admin/users as a normal active user; inspect wrapper catch behavior.
- Expected versus actual: Access is denied but returned as 500 rather than 403. Generic wrappers can return raw exception text.
- Impact and limitations: Clients cannot distinguish permission from server failure, monitoring is noisy and database errors may expose internals. No cross-user read succeeded in this probe.
- Recommended fix, not applied: Use typed central error mapping with safe messages, request IDs and server-only detailed logs.
- Required regression tests: 401/403/404/409/422/429/500 contracts, malformed JSON, database outage and sensitive-string suppression.

## B34: Concurrent default seeding creates duplicate accounts/categories

- Severity: **Medium**. Evidence: Observed browser fixture; source race confirmed.
- Primary source: [src/services/defaultsService.ts:8](</Volumes/ssd12/SparowVault/230826 SparowVault/src/services/defaultsService.ts:8>).
- Reproduction evidence: [browser-audit.json](</Volumes/ssd12/SparowVault/230826 SparowVault/docs/audit-evidence/2026-09-10/browser-audit.json>).
- Steps: Register a fresh user in the development build; inspect initial accounts before and after one manual account creation.
- Expected versus actual: There are two each of Cash, Savings Bank and UPI Wallet, plus the one manually added account. Seed functions use check-empty then non-idempotent creates; StrictMode/concurrent initialization can race.
- Impact and limitations: New profiles begin with duplicate containers/categories; two tabs can cause the same class of race outside StrictMode. Exact multi-tab production reproduction remains pending.
- Recommended fix, not applied: Make seeding server-side atomic/idempotent with stable unique seed identities; deduplicate only with a reviewed migration preserving references.
- Required regression tests: StrictMode mount, rapid login/reload, two tabs and concurrent first-login calls must create exactly one default set.

## B35: Export description lists the wrong workbook sheet count

- Severity: **Low**. Evidence: Reproduced UI/content mismatch.
- Primary source: [src/components/pages/ExportPage.tsx:1](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/ExportPage.tsx:1>).
- Reproduction evidence: [browser-audit.json](</Volumes/ssd12/SparowVault/230826 SparowVault/docs/audit-evidence/2026-09-10/browser-audit.json>).
- Steps: Compare CA Workbook description with a downloaded empty-profile workbook.
- Expected versus actual: UI says Includes 16 sheets; download contains 21 sheets, plus possible per-loan sheets.
- Impact and limitations: The export description is stale and obscures what is actually delivered.
- Recommended fix, not applied: Generate the section list/count from the workbook definition; describe conditional sheets.
- Required regression tests: UI list, downloaded manifest and conditional loan sheet counts remain consistent.

## B36: Seed branding/contact content remains placeholder-like

- Severity: **Low**. Evidence: Observed test seed and source; production content unverified.
- Primary source: [src/components/pages/admin/BrandingSettingsPage.tsx:1](</Volumes/ssd12/SparowVault/230826 SparowVault/src/components/pages/admin/BrandingSettingsPage.tsx:1>).
- Reproduction evidence: [screenshots/admin-mobile.png](</Volumes/ssd12/SparowVault/230826 SparowVault/docs/audit-evidence/2026-09-10/screenshots/admin-mobile.png>).
- Steps: Open seeded admin branding settings and inspect the configured contact/legal values and placeholders.
- Expected versus actual: support@example.com is present in the test configuration; logo/favicon inputs show example URLs as placeholders.
- Impact and limitations: Sample contact content should not be shipped as real company support information. Input placeholders themselves are not defects.
- Recommended fix, not applied: Provide deployment-validated real support/legal/branding settings and distinguish placeholders from persisted values.
- Required regression tests: Staging content review, valid legal pages and support links; no production example addresses.

## Feature gaps are not hidden bugs

The agency brief requires clients, projects, quotations, invoices, approvals, GST ledgers, partner distributions, vendor ledgers, month close and document generation. Their absence is a product-scope gap, not a failed function in an otherwise implemented module. The full 30-module mapping is in MODULE-WISE-AUDIT.md. No absent module is marked tested, complete or production-ready.
