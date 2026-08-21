# Phase 15 - Privacy, Audit, Retention, Support Access Report

Date: 2026-05-15

Final status: COMPLETE

## Summary of Changes

- Registration now requires Terms and Privacy acceptance and stores accepted policy versions.
- Login now returns outstanding policy versions and writes user audit records for successful and failed login attempts.
- CloudAuth now shows Terms/Privacy acceptance during registration and blocks login continuation when policy versions changed until the user accepts outstanding policies.
- Account export now includes an expiry timestamp and writes both platform audit and user audit entries.
- Account deletion now returns a hard-delete schedule and writes user audit records.
- Subscription cancellation writes a user audit record.
- Card and loan create/edit/delete actions now write user audit records from cloud data endpoints.
- Production schema now includes `audit_logs`, `user_policy_acceptances`, `user_audit_logs`, `retention_jobs`, and required user privacy/deletion/profile columns.
- Support access and PII protection policy document added.
- Account endpoint E2E updated to accept current policy versions before registration.

## Files Changed

- `D:\Claude\SparowVault\php\controllers\cloud.php`
- `D:\Claude\SparowVault\php\controllers\account.php`
- `D:\Claude\SparowVault\php\controllers\subscriptions.php`
- `D:\Claude\SparowVault\php\controllers\cloud_data.php`
- `D:\Claude\SparowVault\src\lib\cloud\client.ts`
- `D:\Claude\SparowVault\src\components\auth\CloudAuth.tsx`
- `D:\Claude\SparowVault\sql\production_schema.sql`
- `D:\Claude\SparowVault\sql\migrations\phase_13_privacy_audit.sql`
- `D:\Claude\SparowVault\sql\migrations\phase_13_privacy_audit_rollback.sql`
- `D:\Claude\SparowVault\tests\account-endpoints-e2e.mjs`
- `D:\Claude\SparowVault\tests\unit\privacyPhase15Static.test.ts`
- `D:\Claude\SparowVault\docs\SUPPORT_ACCESS_AND_PII_POLICY.md`
- `D:\Claude\SparowVault\PHASE_15_PRIVACY_AUDIT_RETENTION_SUPPORT_REPORT.md`

## Migrations Changed

- Added `audit_logs` to `phase_13_privacy_audit.sql` because `audit_log_action()` depends on it.
- Added rollback for `audit_logs`.
- Added missing privacy/audit/retention tables and user columns to `production_schema.sql` so test and fresh installs match runtime code.

## Functions Changed

- `cloud_register()`
  - Requires `policyAcceptances`.
  - Enforces current `terms` and `privacy` versions.
  - Stores accepted policy versions.
  - Writes `REGISTER` and `POLICY_ACCEPTED` user audit logs.

- `cloud_login()`
  - Writes `LOGIN` and `FAILED_LOGIN` user audit logs.
  - Returns `policyOutstanding` for changed policy versions.

- `account_data_export()`
  - Requires PIN as before.
  - Adds `expiresAt`.
  - Writes `DATA_EXPORT` user audit log.

- `account_delete()`
  - Requires PIN as before.
  - Cancels subscriptions as before.
  - Adds `hardDeleteAfter`.
  - Writes `ACCOUNT_DELETION_REQUESTED` user audit log.

- `subscriptions_cancel()`
  - Writes `SUBSCRIPTION_CANCELLED` user audit log.

- `cloud_entity_*()`
  - Writes card/loan create/edit/delete audit records for sensitive finance objects.

## UI Changed

- Registration form has Terms and Privacy acceptance checkbox with current versions.
- Login flow blocks continuation when server returns outstanding policy versions and provides an accept action.

## Tests Added / Updated

- Added `tests/unit/privacyPhase15Static.test.ts`.
- Updated `tests/account-endpoints-e2e.mjs` to register users with current policy versions.

## Commands Run

- `npm run phase:13:gate` - PASS, 14 checks
- `npm run test -- privacy` - PASS, 6 tests
- `npm run typecheck` - PASS
- `npm run lint` - PASS
- `npm run check:php` - PASS, 72 PHP files parsed
- `npm run check:sql` - PASS with existing static warnings in older SQL files
- `npm run build` - PASS with existing Vite chunk-size/dynamic-import warnings
- `npm run db:test:reset` - PASS against `sparowvault_test`
- `npm run db:test:seed` - PASS against `sparowvault_test`
- `npm run test:account:endpoints` - PASS, all account export/delete checks
- `php scripts/retention-sweeper.php --dry-run` - PASS against `sparowvault_test`

## Manual Checks Completed

- Local PHP health endpoint returned healthy against `sparowvault_test`.
- Account export endpoint E2E verified own-data export and cross-user isolation.
- Account deletion endpoint E2E verified PIN required, audit row written, deleted user blocked from login, and old token denied.
- Retention sweeper dry-run verified all configured sweeps execute without DB errors.
- Policy acceptance storage verified directly in `sparowvault_test`: two `terms` and two `privacy` acceptance rows from E2E-created users.
- Retention job insertion verified directly in `sparowvault_test`: six `retention_jobs` rows written with `status='ok'`.
- Audit rows verified directly in `sparowvault_test`: `ACCOUNT_DATA_EXPORTED`, `ACCOUNT_DELETED`, `REGISTER`, `POLICY_ACCEPTED`, `DATA_EXPORT`, and `ACCOUNT_DELETION_REQUESTED` rows exist.
- Support access is documented as denied-by-default; no support access endpoint exists yet, so no unmasked support view is available.
- Sensitive-data masking requirement is documented in `docs/SUPPORT_ACCESS_AND_PII_POLICY.md`; admin/support masking UI is not implemented because support view is not implemented.

## Remaining Risks

- Support access is currently policy-controlled and denied by absence of a support-view endpoint. If a support access UI/API is later added, it must enforce the consent/time-limit/audit/masking rules in `docs/SUPPORT_ACCESS_AND_PII_POLICY.md`.
- Manual checklist items 9 and 10 are satisfied only as policy/absence-of-feature controls, not by a live support-access workflow.
- Field-level encryption is not implemented yet. The policy document records the required encryption plan and risk acceptance.
- `check:sql` still reports existing non-idempotent `ALTER TABLE` warnings in older full SQL files outside this phase.
- Vite still reports large bundle warnings; not privacy-critical.

## Rollback Plan

- Revert the PHP controller changes for policy/audit logging.
- Revert CloudAuth/client policy acceptance changes.
- Revert `production_schema.sql` and `phase_13_privacy_audit*` schema changes if not deployed.
- If schema was applied, use `phase_13_privacy_audit_rollback.sql` only after confirming audit/policy data can be discarded.
- Remove `tests/unit/privacyPhase15Static.test.ts` and restore the previous account endpoint test registration payload.

## Final Status

COMPLETE
