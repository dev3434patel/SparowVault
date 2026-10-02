# Contract for later lanes

Release run `20261003-personal-os-0048c3`. RP02, RP03, and RP04–RP06 follow this contract. This prefix does not implement those lanes.

## Health and destructive targets

- Personal readiness is `GET /api/health.php` only.
- HTTP 200 with `data.status` `healthy` means `SELECT 1` succeeded and the personal schema is present: tables `users`, `cloud_collection_rows`, and `schema_version`, with at least one `schema_version` row.
- HTTP 200 does not mean the process exists.
- An empty `CLOUD_JWT_SECRET` or a missing database identity returns HTTP 503 `not_configured` and does not open a socket.
- Readiness does not require the substring `test` in the database name.
- Readiness does not refuse `APP_ENV=production` for that reason alone.
- Database down, or schema missing, returns HTTP 503 `unavailable`. The public body stays bounded: `checks.db` and `checks.schema` only. No password, secret, DSN, or schema dump.
- `/api/healthz.php` remains company liveness. Its company-table count is not a personal readiness input.
- Destructive runners (`scripts/backup_db.php`, `scripts/db-test-reset.mjs`, `scripts/db-test-seed.mjs`, `php/scripts/migrate_atomic_writes.php`, `php/scripts/migrate_security_sessions.php`) allow `sparowvault_test` or another name that contains `test`, require `AUDIT_RUN_SENTINEL`, and reject `sparowvault` before dump, truncate, or migrate.
- Mutation tests use `sparowvault_test` only. Do not open, dump, or migrate `sparowvault`.
- The empty-config Apache probe is an expected negative test. It is not a health release pass. A configured positive health response that is not HTTP 200 `healthy` makes `scripts/apache-package-serve-check.mjs` exit nonzero.
- The immutable archive is still the old bundle until RP07. Throwaway extracts in this run overlaid current health sources. Do not treat `PASS_CONFIGURED_HEALTH` as a rebuilt package.

## Household invites and grants

- Add server tables. An invite stores a token hash, inviter, household, role, resource scope, expiry, used-by, and revoked. A grant stores grantee, owner, household, role, scope, and revision.
- Issue returns a high-entropy code once. Accept requires a different authenticated user, one use, unexpired, and not revoked. Self-accept, a forged `userId`, and a foreign household id are rejected.
- The owner chooses the shared resource ids. A viewer is read-only.
- Accept does not clone private transactions and does not copy a Company book or a personal book into a second financial authority.
- Shared reads are a grant-scoped projection of the owner's `cloud_collection_rows`. Writes recheck the grant, including a mutation queued before revoke.
- The last owner cannot be removed. The UI says offline cache limits. Revoke does not promise instant erasure on a disconnected device.
- UI stays on `src/components/pages/HouseholdDashboardPage.tsx`.
- The same-user unit test in `personalBookWorkflows.test.ts` is not cross-login proof. New proof uses two synthetic users on `sparowvault_test` and two browser profiles.
- Leave working P10–P21, P32–P36, and P40 behavior in place. A flag that is off, loading, or unknown fails closed on the direct route and API, not only in navigation.

## Statement commit and repair

- Keep `cardMoneyFact.ts` and `applyStatementLocalCopy`. Missing interest, fees, and minimum due stay `null` / `not_observed`. A printed zero stays `0` / `source_observed`.
- Persist the reviewed command in the local outbox before `POST`, bound to user, environment, and revision. A lost response or a Dexie abort after the server commit resumes from that command.
- Repair calls the existing idempotent receipt in `financial_write_receipts` (`php/helpers/cloud_write.php`). It does not create a second import.
- If the user changes before local apply, the receipt stays with the original user and is not written into the new user's books.
- Replace the comma-separated `/transactions?statementTx=` link in `src/services/statements/receiptLink.ts` with a permission-checked source or batch id when the id list can exceed a safe URL.
- Synthetic oracles on the disposable API, Dexie, reports, and export stay in RP03. They are not run in this prefix.

## Headers and file ownership

- CSP and `X-Frame-Options` are written by both `.htaccess` and `apply_security_headers()` in `php/helpers/security.php`. Pick one writer per response class. Keep the same policy on 200, 4xx, and 5xx.
- Do not add `unsafe-eval` or `*`. `SV_SKIP_HTTPS` stays local-only.
- PDF.js and Tesseract workers must actually run under that CSP. A HTTP 200 for the worker file is not that proof.
- Attachment saves require file content, store a SHA-256 note, and reject a metadata-only string. The default ceiling is 8 MiB (`DEFAULT_ATTACHMENT_BYTES` in `personalBookWorkflows.ts`). Another profile cannot read the blob. Deleting the attachment leaves the linked transaction in place. Do not widen those bounds.
