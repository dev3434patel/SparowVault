# Conflict register

These conflicts stay open. Later lanes must not close them by copying an old PASS label forward.

1. **October 2 versus a live certificate.** Unit tests, typecheck, and static Apache serving passed. `localPackageAndRestore` is `PARTIAL`. Restore, P30 second login, and P43 sync were not run. This prefix does not change those labels.

2. **September 30 inventory versus later repairs.** The inventory marks envelopes as not built, recurring rules as schema only, categories as a flat list, transfers as unused link rows, and alerts as partial. Lane P and the current pages (`EnvelopesPage.tsx`, `RecurringRuleDialog.tsx`, category parents, transfer links, alert switches) are later than that inventory. The inventory is history. Those repairs stay. They are not rebuilt and they are not recertified here.

3. **P25 id collision.** Inventory and `TASK_LEDGER.json` P25 is "Card statements and payment allocations". Lane P's P25 sentence is the shared card limit on the cards screen. The graph keeps both notes. It does not renumber either side.

4. **Health status code on an empty package.** October 2 and the first extract in this run (before the current bootstrap was overlaid) returned HTTP 500, about 141 bytes, `ENV_VALIDATION_FAILED`, because `release/hosting-bundle/php/bootstrap_api.php` still validates every request, including `/api/health.php`. Current source skips that validation for `/api/health.php` and `/api/healthz.php`, then returns HTTP 503 `not_configured` when the secret or database identity is missing. The on-disk bundle still has the old bootstrap until RP07 rebuilds it.

5. **`npm run health` versus `/api/health.php`.** The npm script is the build pipeline. HTTP readiness is `/api/health.php`. A 200 body means `healthy` after `SELECT 1` and the personal schema check. Process existence is not health.

6. **`/api/healthz.php` versus personal readiness.** `healthz` is company liveness and still requires a company table count. On `sparowvault_test` after the personal schema reset it returned HTTP 503 `degraded` while `/api/health.php` returned HTTP 200 `healthy`. Personal readiness does not use the company count.

7. **Production name guard versus readiness.** Before this change, `health_configuration_decision()` returned HTTP 503 `refused` for any database whose name lacked `test`, and HTTP 503 `not_configured` for `APP_ENV=production` even when the name contained `test`. That refusal happened before a connection. Readiness no longer does either. Destructive runners still reject `sparowvault` before dump, truncate, or migrate.

8. **Company October 1 evidence.** Backup logs and screenshots under the Company audit are not Personal OS evidence.

9. **Missing requirements pack.** `PERSONAL_47_REQUIREMENTS.json` is absent. Child ids in the graph are the September 30 traceability rows, not a reconstructed pack.

10. **Port 5000.** `php -S localhost:5000` (pid 31356) was already listening. `scripts/with-local-test-runtime.mjs` was not started, because it would health-check or bind that port. The login proof used a different loopback port and `DB_NAME=sparowvault_test`.

11. **Duplicate security headers.** The empty-package health response from the throwaway extract still shows `X-Frame-Options: DENY, DENY` and two Content-Security-Policy values, from the bundled `.htaccess` and `apply_security_headers()`. RP04–RP06 must pick one writer per response class and must not weaken the policy. This prefix did not edit `.htaccess`. An uncommitted working-tree diff appeared during the run (API paths excluded from the Apache header block, and the `X-Forwarded-Proto` rewrite condition removed). It was not overlaid onto the extract and it was not verified here.

12. **Household invite storage.** `issueHouseholdInvite` still writes `invite=<code>` on the inviter's own `householdMembers` row. `cloud_enforce_household_write` loads households with `user_id` equal to the authenticated user. A second login cannot accept the invite. RP02 must add server invite and grant tables and must not copy books.
