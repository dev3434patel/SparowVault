# SparowVault Company — Operations Runbook

## Deploy

See [PRODUCTION_DEPLOY.md](./PRODUCTION_DEPLOY.md). Short path:

1. `BACKUP_DIR=… npm run backup:db` (pre-change snapshot).
2. `git pull` → `npm ci` → `npm run build`.
3. Deploy `dist/`, `api/`, `php/`, `.htaccess` (or nginx conf).
4. Confirm host env / `.env.host` (never in git).
5. `php scripts/company/apply-migration.php` if schema changed.
6. `curl -fsS https://HOST/api/healthz.php` → `status:healthy`.
7. `COMPANY_STAGING_URL=https://HOST node scripts/company/check-security-headers.mjs`.

## Rollback

| Change type | Action |
|-------------|--------|
| Bad frontend build | Redeploy previous `dist/` artifact from CI/release tag |
| Bad PHP/API code | Redeploy previous `api/` + `php/` tree; clear OPcache if enabled |
| Bad **migration** | **Restore DB from pre-migration mysqldump** — no company down-migrations exist |
| Bad config/secret | Revert env vars; rotate JWT if leaked (`docs/production-secrets.md`) |

Maintenance window: put up a static maintenance page or return 503 from the load balancer while restoring.

## Backup & restore

| SLA | Value |
|-----|-------|
| **RPO** | **24 hours** (daily dump; more frequent dumps reduce RPO) |
| **RTO** | **4 hours** (restore dump → verify healthz → smoke login) |

### Daily job

- Linux: `scripts/company/backup-daily.sh` (cron `15 3 * * *`).
- Windows: `scripts/company/backup-daily.ps1` (Task Scheduler).

Requires `BACKUP_DIR` absolute + outside web root. Optional `BACKUP_OFFSITE_DIR` for second copy (NAS/S3 mount/rsync target).

Underlying tool: `npm run backup:db` → `scripts/backup_db.php` (InnoDB `--single-transaction`).

### Restore drill (quarterly — mandatory)

```bash
npm run company:test:backup
# Evidence: docs/company/final-certification/*/raw/ or PHASE_10 evidence
```

Expect `PASS backup_restore_checksum` and `tb_balanced:1`. Never points `DB_NAME` at the restore test DB.

### Manual restore

1. Stop writers / maintenance mode.
2. `mysql … DB < backup.sql`
3. `curl /api/healthz.php`
4. Login smoke + one company report (trial balance).

## Incident response

1. **Detect** — uptime check on `/api/healthz.php` (see [MONITORING.md](./MONITORING.md)); PHP error log alerts.
2. **Triage** — is it DB, app, TLS, or dependency (Razorpay)? Check healthz `checks`.
3. **Contain** — rate-limit / disable public registration if abuse; rotate JWT if session forgery suspected.
4. **Recover** — rollback code or restore DB per table above.
5. **Postmortem** — timestamp, RPO/RTO actuals, action items; attach backup drill if data loss.

### Alert channels (configure in ops)

| Channel | Use |
|---------|-----|
| Email / PagerDuty / Opsgenie | healthz non-200 ≥2 min |
| Slack `#sparow-alerts` | deploy + backup job failures |
| On-call phone | production DB down / restore in progress |

## Security notes

- `.env*` denied by `.htaccess` / nginx example.
- Rotate any credential that ever appeared in git history (`docs/company/SECRETS_ROTATION.md`).
- Admin seed PIN must be changed immediately on first login.
