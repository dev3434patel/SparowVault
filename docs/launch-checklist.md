# SparowVault — Production launch checklist

Run this top-to-bottom before opening sign-ups to real users. **Every box
must be ticked**; an unchecked item is a launch blocker.

## A. Environment & secrets

- [ ] `APP_ENV=production` set on the host.
- [ ] `CLOUD_JWT_SECRET` is 64+ hex characters, generated for THIS deployment.
- [ ] `DB_PASS` (or `DATABASE_URL`) is set and non-empty.
- [ ] `CORS_ALLOWED_ORIGINS` is the exact public origin, no trailing slash.
- [ ] Razorpay LIVE keys + webhook secret are set if `ENABLE_RAZORPAY=true`.
- [ ] `release/hosting-bundle/.env.host` contains only empty placeholders.
- [ ] Repo-wide secret scan returns zero production credential hits.
- [ ] Boot the API with empty `CLOUD_JWT_SECRET` and confirm it refuses to start.

## B. Schema

- [ ] All 13 phase migrations applied in order:
      `phase_01_security → phase_03_cloud_amount_paise → phase_04_indexed_sync_fields → phase_05_financial_ledger → phase_07_user_credit_cards → phase_08_user_loans → phase_09_udhari_engine → phase_11_ai_suggestions → phase_13_privacy_audit → phase_14_saas_billing`.
- [ ] `schema_version` table contains a row for every migration.
- [ ] `SELECT VERSION()` shows MySQL 8.x or a supported MariaDB.
- [ ] Foreign-key checks survive `mysqlcheck`.

## C. Edge / HTTPS

- [ ] `curl -I http://YOUR_DOMAIN/` → 301 redirect to https.
- [ ] HSTS, CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy headers present.
- [ ] `/.env`, `/.env.host`, `/sql/`, `/data/`, `/php/config/`, `/data/.jwt-secret` all return 403.
- [ ] No `*.js.map` is fetchable from `/assets/`.

## D. Health & monitoring

- [ ] `GET /api/health.php` returns `data.status="healthy"`, `data.db.status="ok"`, and the latest `schema_version`.
- [ ] Uptime monitor pings `/api/health.php` every 5 minutes; alerts on failure to Slack + email.
- [ ] Daily summary checks `webhook_events` for `processing_status='failed'` rows and pages on > 0.

## E. Backups

- [ ] Nightly `npm run backup:db` runs via cron and ships encrypted dump off-host.
- [ ] Weekly `npm run backup:json` (anonymised) runs and ships off-host.
- [ ] Restore drill has been performed: `node scripts/restore-drill.mjs --backup backups/<latest>.sql.gpg --target sparowvault_drill` succeeded within the last 30 days.
- [ ] `docs/backup-checklist.md` § A-F have been followed at least once.

## F. Logs

- [ ] Every API response includes an `X-Request-Id` header.
- [ ] Logs are JSON one-per-line (via `structured_log()`).
- [ ] Log rotation configured: nothing in `/var/log/php_errors.log` (or equivalent) older than 30 days.
- [ ] PIN / password / token never appear in logs. Spot-check with `grep -E 'pin\\":' logs/* | head`.

## G. Payment safety (regression suite — must all be green)

- [ ] `npm run phase:01:gate` ✅
- [ ] `npm run test:webhook:ownership` ALL PASS
- [ ] `npm run test:account:endpoints` ALL PASS
- [ ] Razorpay sandbox round-trip: order create → checkout → webhook → subscription active in `subscriptions`.
- [ ] Test renewal: pay on day 25 of 30 → `new_period_start = MAX(NOW(), current_period_end)`.

## H. Compliance

- [ ] `POST /api/auth/data-export.php` returns the calling user's data (and only theirs).
- [ ] `DELETE /api/auth/account.php` soft-deletes + cancels subscription + writes `user_audit_logs` row.
- [ ] Privacy policy URL + Terms URL configured and surfaced at registration.
- [ ] `policy_current_versions()` matches the live legal documents.

## I. Calculations

- [ ] `npm run phase:all:gates` is green for phases 0-12.
- [ ] All 8 fixture users in `tests/fixtures/users/` reproduce the documented numbers in the local app.
- [ ] Excel export totals match on-screen UI totals to the paise.

## J. Staging

- [ ] Separate staging subdomain points at a separate database.
- [ ] Staging uses Razorpay TEST keys; production uses LIVE.
- [ ] Staging has been green for 24h before production deploy.

## K. Ops paperwork

- [ ] `docs/incident-playbook.md` is current. On-call contact + escalation path defined.
- [ ] `docs/production-secrets.md` rotation procedures rehearsed.
- [ ] `docs/backup-checklist.md` § Retention policy active.
- [ ] Bug-bounty / security-disclosure address documented (`.well-known/security.txt` published).

## Sign-off

```
YYYY-MM-DD — Launched by <name> after every box above was ticked.
Schema version : phase_14_saas_billing_2026_05_13 (or later)
JWT secret fingerprint : <SHA-256 of CLOUD_JWT_SECRET, first 12 chars>
Razorpay mode : live | test
```
