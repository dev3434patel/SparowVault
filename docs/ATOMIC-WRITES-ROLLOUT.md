# Atomic Writes: Migration and Rollout

This change is an integrity foundation, not approval for real-finance production use. Resolve the remaining security, accounting, recovery and agency-scope gates in `IMPLEMENTATION-PROMPTS.md` before a production decision.

## Added Storage

| Store | Purpose | Existing financial rows modified by migration? |
| --- | --- | --- |
| MariaDB financial_write_receipts | User-scoped immutable successful request hash/result/status | No |
| MariaDB financial_entity_tombstones | Prevent stale devices recreating permanently deleted IDs | No |
| IndexedDB syncMutations, Dexie version 5 | Ordered full mutation payloads, base version, prior/local state and errors | No SQL changes; existing browser stores retained |

Run the SQL migration before serving the upgraded PHP write paths. There is no automatic request-time DDL for these tables. Missing metadata causes writes to fail closed with `WRITE_UNAVAILABLE`, rather than falsely claiming durable success. The test reset script applies the migration to disposable databases automatically.

## Preflight

1. Confirm the database name, environment, owner and current backup. Never point the test-reset script at a real profile database.
2. Verify InnoDB tables, the existing user key type/collation, required cloud indexed columns, financial_events/effects and user_audit_logs.
3. Use a database default compatible with the existing schema (`utf8mb4` / `utf8mb4_unicode_ci` in the supplied schema). Legacy recovery-table auto-creation currently inherits the database default; a mismatched default causes auth/me to fail. This dependency was observed while building the clean browser fixture.
4. Confirm that frontend and backend will be upgraded together, and retain the previous artifacts for investigation.
5. Inventory pending legacy browser writes and historical orphan records. This migration does not repair them or establish historical ledger accuracy.

## Apply

The CLI helper verifies an explicitly named target. It uses the project's configured environment without printing credentials:

```sh
php php/scripts/migrate_atomic_writes.php --database=EXACT_DATABASE_NAME --apply
```

Without both an exact matching database name and `--apply`, it makes no changes and exits nonzero. Review the command's target before replacing the placeholder. On hosts without CLI, use the reviewed `20260910_atomic_writes.sql` migration through the authorized database administration channel, not an HTTP-exposed migration endpoint.

The hosting packager includes the additive SQL separately. A fresh `HOSTING_READY_CLEAN_IMPORT.sql` import must still be followed by this migration before enabling upgraded writes. Existing user-modified schema dumps were not regenerated or replaced.

After migration, deploy the matching application. Verify a synthetic user's create/edit/delete/restore and an exact retry; verify the source, effects, audit and receipt. Check logs privately. Never test deletion or reset on a real profile just to produce a green result.

## API Contract

| Operation | Contract |
| --- | --- |
| Create | Stable client ID and mutationId; same key/body returns original result/status; changed body or scope is 409 |
| Patch | Upgraded client sends mutationId, expectedVersion and userId; current record version increments server-side |
| Soft delete / restore | Upgraded client uses the same versioned patch path with isDeleted |
| Full sync | Changed existing rows require expectedVersions[collection][id]; exact unchanged rows are no-ops; batch is atomic |
| Selected PATCH / DELETE | One SQL transaction; malformed/missing/denied row aborts the batch |
| Permanent deletion | References checked, active ledger effects removed, event marked reversed, audit and tombstone retained |
| Import | Explicit per-row committed/rejected contract; row mutationId makes retries stable; source/effects/audit commit together |
| Errors | Validation 422; conflict 409; required sync version 428; unavailable transactional write 503; owner mismatch 403 |

Important compatibility gap: legacy direct PATCH/DELETE endpoints still accept requests without a version. The upgraded browser sends versions, and full sync rejects missing versions for changed existing records. Do not claim universal lost-update protection until all legacy callers and administrative/batch deletion paths require preconditions.

Successful receipts return the original response, not the latest entity snapshot. This is intentional. The client acknowledgement transaction preserves newer queued local edits. Reusing an old receipt after hard deletion does not recreate the record.

New SQL ledger event IDs are tenant-derived. Existing owned IDs are preserved by source transaction lookup. Consumers must join by owner/source transaction rather than assume every SQL event ID is `fevt_` plus the raw transaction ID. The frontend's in-memory event IDs remain local derived identifiers; this stage does not unify the two report engines.

## Browser Recovery

- Transport/server failures retain complete payloads and retry the same key. Authentication expiry keeps data pending.
- Validation/permission rejection is not treated as success. The rejected payload remains available for review/download.
- Conflicts stop automatic replay. The user may download pending changes and explicitly choose the server version for that record.
- “Use server version” discards the entire queued chain for that entity after confirmation, not a silent background merge.
- Legacy marker-only changes with recoverable local rows enter review. Unknown operations/versions are not guessed.
- Permanent deletion is blocked while the user has unresolved durable mutations. Browser payloads are sensitive and are not a replacement for encrypted, verified backups.

Known limits include cold offline startup/authentication, automatic merge/rebase, browser storage eviction/device loss, retry backoff/observability at production scale, complete device isolation, and graph-wide restore/wipe semantics. IndexedDB legacy entity stores still use single-ID primary keys; the queue preserves full owner-scoped payloads and restores pending projections when another owner's cache has reused an ID. A future compound-key migration should be evaluated before general multi-organization offline use.

## Verification Commands

```sh
npm run typecheck
npm run lint
npm run test
npm run test:integrity
npm run test:integrity:browser
npm run build
```

The integrity harness creates a fresh generated-name test database, runs four PHP workers on a free port and optionally a separate Vite/Chromium runtime, then removes only its own test database and processes. It does not reuse ports 5173/8080 or the user's current database. Database root permissions are a local-test convenience only; do not grant production application users database-creation privileges.

## Rollback

Do not automatically DROP receipt/tombstone tables or clear syncMutations. That would discard retry and deletion history. Do not deploy the old refresh algorithm over pending queues.

Before writes have been enabled, roll back the application in maintenance mode while retaining the additive tables. After writes have occurred, prefer a compatible forward fix. A necessary rollback requires a reviewed queue/receipt compatibility plan, a verified backup and maintenance controls that prevent the old unsafe mutation paths from accepting financial writes. Record any reconciliation required before re-enabling the service.

The CLI ledger backfill now uses the same per-user transaction lock and rereads each source under that lock. It is CLI-only. It was not run against existing user records in this implementation stage; historical repair still needs a reviewed before/after reconciliation.
