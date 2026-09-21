# SparowVault / SparowFinanceOS Implementation Research

Research date: 10 September 2026. Audience: engineering, QA, operations and SparowTech's finance reviewer.

## Executive Decision

Keep the existing React, TypeScript, Dexie, PHP/PDO and MariaDB application. Stabilize its personal-finance records before adding agency accounting. Do not rename a household into an organization, an expense into an approved vendor bill, or a subscription checkout into a client receipt. Those are different domain contracts.

The starting evidence is the repository audit at HEAD `54eec068a37cceb9cccc2a63dca824e1e092f52e`, including the user's existing modifications. It contains 39 findings: two critical, 21 high, 14 medium and two low. The historical audit is not edited into a passing report. New results belong in `docs/implementation-evidence/2026-09-10/`.

The recommended order is data integrity, credential/authorization controls, backup and financial correctness, reliable quality gates, then organization-based agency modules and deployment certification. This is an engineering recommendation derived from the dependency graph, not a claim made by any single external source.

## Questions Resolved

| Question | Decision | Reason / limitation |
| --- | --- | --- |
| Which product is being changed? | This SparowVault repository, evaluated against the agency brief | Explicit user clarification; agency additions remain separately scoped |
| Rewrite or incremental implementation? | Incremental, bounded changes using existing libraries | Avoid losing working personal-finance behavior and migration history |
| Can a build prove readiness? | No | It cannot prove atomicity, authorization, report correctness or recovery |
| Where is staging? | Not yet confirmed | A local synthetic-data preview is not a hosted staging certification |
| Can tests use the current database? | No destructive tests against it | Fresh disposable database per integrity run |
| Is every bug fixed in the first stage? | No | Status and evidence are tracked separately from planned prompts |
| Is the tax specification final? | No | Obtain current jurisdiction, registration, supply and accountant decisions before implementing tax rules |

## 1. Atomic Server Writes

PDO transactions provide commit/rollback boundaries, but transactional behavior depends on the storage engine. DDL can commit a MySQL-family transaction implicitly. Therefore the implementation adds schema through an explicit migration, never during a financial request. Source rows, financial effects and the server audit are written through the same PDO connection and transaction. [PHP PDO transactions](https://www.php.net/manual/en/pdo.transactions.php)

`FOR UPDATE` is effective with the appropriate transaction context in InnoDB. The initial design locks the owning user row before checking or inserting a mutation. This also serializes missing-record creation and reference validation for that user. It is intentionally conservative: unrelated writes by one user wait, while different users can proceed. Measure contention before replacing this with more granular entity locks. [MariaDB FOR UPDATE](https://mariadb.com/docs/server/reference/sql-statements/data-manipulation/selecting-data/for-update)

Design alternatives considered:

- Locking only an existing entity does not serialize the first insertion of a missing entity without additional constraints/locking design.
- Inserting the mutation key after a committed financial write leaves a duplicate window, as the audit reproduced.
- Returning a success when ledger construction fails creates two inconsistent financial stores.
- Calling a migration from inside the write transaction invalidates the intended rollback boundary.

The chosen design retains successful request receipts, with tenant, mutation key, canonical request hash, original response and status. A changed payload cannot reuse a key. Stripe documents payload checking and replay of stored results as an idempotency pattern; this is a design reference, not a Stripe integration and not a promise of universal exactly-once delivery. This application retries failed transactions rather than retaining failed responses, and does not adopt Stripe's retention period. [Stripe idempotent requests](https://docs.stripe.com/api/idempotent_requests)

## 2. Version Conflicts and Deletion

HTTP conditional requests are designed to prevent lost updates. The repository currently uses an explicit JSON `expectedVersion` contract, not a claim of implementing HTTP ETags/If-Match. A future API revision may expose strong ETags and the matching HTTP precondition status. Stable server versions, not client clocks, determine whether an edit may proceed. [RFC 9110, conditional requests](https://www.rfc-editor.org/rfc/rfc9110.html#section-13.1.1)

Project-specific rules:

1. Create must not overwrite an existing ID.
2. The upgraded browser sends its base version with every queued patch, including soft deletion and restore.
3. A changed existing row in full sync requires an explicit expected version. A soft-deleted server row cannot be restored by an old snapshot.
4. Hard deletion retains a separate tombstone so an old device cannot recreate the same ID.
5. Financial hard deletion clears effects and retains a reversed event and server audit. This is not an immutable double-entry reversal journal yet.
6. Legacy direct PATCH/DELETE callers without a version remain a documented rollout gap. Close it only after migrating callers and requiring preconditions everywhere.

## 3. Durable Browser Writes

Dexie supports transactions spanning multiple object stores. The local entity and full mutation payload therefore share one IndexedDB transaction. Network requests run after that transaction finishes; waiting on unrelated asynchronous work inside it risks transaction lifetime problems. [Dexie transactions](https://dexie.org/docs/Dexie/Dexie.transaction()), [Dexie transaction best practices](https://dexie.org/docs/Tutorial/Best-Practices)

The queue stores user, collection, local table, entity, operation, stable key, payload, prior record, base version, order and error state. Acknowledgement removes the queue item and updates the cache in one transaction, preserving later local changes. A GET started before a newly acknowledged write cannot erase that write when it finishes late.

Failure policy is deliberately explicit:

| Failure | Local behavior | Retry behavior |
| --- | --- | --- |
| Network failure, 408, 429 or 5xx | Retain payload and pending record | Retry same immutable request |
| 401 | Retain pending data | Wait for valid authentication; do not switch owner |
| 403 or validation rejection | Surface failure; undo unaccepted optimistic view where safe; retain rejected payload | No automatic forced retry |
| Version/idempotency conflict | Retain local intent and server conflict message | Explicit review; never silently overwrite |
| IndexedDB storage failure | Fail the write | Do not claim it was saved on device |
| Legacy marker without payload history | Preserve recoverable local row, mark review required | Do not invent an operation or base version |

The first-stage queue is not a guarantee that the entire app can cold-start without network, nor that browser storage survives user deletion, eviction or device loss. Backups and offline authentication require separate work. Persisted financial payloads remain sensitive browser data and must follow the later device-access/retention policy.

## 4. Credential and Authorization Boundaries

Session termination must invalidate server-side authority, not merely remove a browser cookie. Reauthentication is appropriate for sensitive account changes, and session identifiers should be rotated around privilege changes. The planned session registry/authentication-version checks address PIN change, reset, logout and administrative revocation. [OWASP Session Management](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)

Recovery must not become a weaker account-takeover route. The plan separates recovery hashing from the PIN salt, requires recent authentication to change recovery settings, rate-limits attempts, and moves toward short-lived, single-use recovery material. Security questions alone are not the production recovery target. [OWASP Forgot Password](https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html)

Cookie-authenticated writes need a consistent CSRF policy; SameSite is a useful layer, not a substitute for the application policy. Apply protection to shared bootstrap/middleware and test actual deployment origins. Bearer-only API clients need an explicit separate contract rather than accidental exceptions. [OWASP CSRF Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)

Permission checks belong on every server operation, with deny-by-default behavior. Testing must include alternate verbs, batches, imports, exports and resource ownership, not just hidden buttons. The household path-parity repair is not equivalent to building the agency's nine-role capability model. [OWASP Authorization](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html)

## 5. Financial and Export Contracts

Project-specific accounting recommendations, requiring finance-owner approval:

- Keep canonical integer minor units and explicit currency. Reject unsafe integer ranges and inconsistent representations. Define rounding and residual allocation centrally.
- Distinguish income, cash receipts, expenses, transfers, principal movements and financing costs. A sign or direction reversal must be reflected consistently in every report.
- Opening balances and balances as of a date are not the same as period turnover. Use one dated report context and reconcile its details to totals.
- A missing external reconciliation balance must yield an unverified state, never an invented match.
- An agency accounting journal requires balanced postings, period controls and immutable reversals. The current target-effect ledger is not automatically that journal.

SheetJS utilities preserve the distinction between numeric and string cells. Export money as numeric cells with a display number format, not currency-formatted text, and parse the generated workbook in tests. [SheetJS array utilities](https://docs.sheetjs.com/docs/api/utilities/array/)

Spreadsheet formula injection is relevant to untrusted exported text. Preserve genuinely numeric negatives as numbers, but apply an explicit text-cell/CSV policy to potentially executable user-controlled strings and test it in the supported spreadsheet applications. A quoted CSV field alone is not the complete policy. [OWASP CSV Injection](https://owasp.org/www-community/attacks/CSV_Injection)

## 6. GST and Invoice Research Boundary

The current official CBIC search result for Rule 46 identifies invoice particulars including supplier identity/GSTIN, invoice date, recipient information and a consecutive invoice number unique within a financial year, with a sixteen-character limit. Treat these as requirements to verify against the complete current text and amendments when implementing invoice numbering. [CBIC Tax Information Portal, Rule 46](https://taxinformation.cbic.gov.in/content-page/explore-rules/1000136/1000001)

Access limitation: the full portal page failed to open in the research browser, although the official indexed excerpt was available. An older 2017 PDF was not treated as a current consolidated tax specification. This research does not settle rates, SAC classification, place-of-supply rules, export/LUT treatment, e-invoicing applicability, withholding, ITC eligibility or filing obligations. Obtain official current sources for the actual company facts and accountant approval before activating those rules.

Use effective-dated tax configuration, stored invoice calculation snapshots and explicit revision/credit-note flows. Do not retrospectively recompute issued invoices when settings change. Do not silently hardcode an assumed service tax rate.

## 7. Documents, Accessibility and QA

Upload controls must validate file type/content and size, use safe storage names and private storage, and enforce download authorization. File extensions alone are insufficient. The agency document prompt includes malware scanning/quarantine and object-level permission checks rather than a public upload folder. [OWASP File Upload](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html)

Visible form labels must be programmatically associated with their inputs; an icon button needs an accessible name. Preserve keyboard focus through dialogs and associate validation feedback with the field. This informs the shared Field repair and every new agency form. [W3C WAI labeling controls](https://www.w3.org/WAI/tutorials/forms/labels/)

Browser tests should isolate state, assert user-visible behavior and use resilient locators and auto-retrying assertions. For this financial app, also verify durable server rows and file contents; clicking a recovery button or seeing an offline badge does not prove recovery or persistence. [Playwright best practices](https://playwright.dev/docs/best-practices)

## 8. Proposed Release Gates

These are proposed acceptance targets, not measured achievements:

| Gate | Required evidence |
| --- | --- |
| Correctness | All required financial golden cases and invariants pass; no unresolved release-blocking wrong totals |
| Durability | Offline/reconnect, response-loss, concurrency, storage-failure and rollback tests pass on the exact artifact |
| Security | Authentication lifecycle, role/method/resource matrix, CSRF/proxy behavior and dependency triage pass |
| Recovery | Restored isolated backup reconciles row counts, graph links, ledger totals, documents and recorded recovery objectives |
| Delivery | Reproducible lockfile install, lint, typecheck, unit/API/browser gates; artifact secret scan; explicit migration preflight |
| Performance | Agree representative data size, concurrency and percentile latency budgets before declaring a load test passed |
| Operations | HTTPS, private resources, secret management, real alert delivery, restore ownership and rollback rehearsal |
| Business approval | Finance reviewer accepts tax, period close, profit distribution and export fixtures; product owner accepts each required module |

## Limitations and Open Decisions

No hosted staging URL, production database, object-storage provider, tax profile or mail provider was verified. No deployment, provider payment, email/SMS delivery or production backup restore was performed by this implementation stage. Local tests use synthetic records. Missing agency modules remain work to implement, not features inferred from similarly named personal-finance screens.

The companion prompt pack translates these decisions into scoped work. `IMPLEMENTATION-STATUS.md` is the authority for what was actually changed and tested, not this research plan.
