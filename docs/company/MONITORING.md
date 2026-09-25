# SparowVault Company — Monitoring

## Health endpoints

| URL | Purpose |
|-----|---------|
| `GET /api/health.php` | Legacy/general: DB ping, schema version, env |
| `GET /api/healthz.php` | **Production readiness**: DB ping + `company_%` table count (≥20) + app/schema version |

Uptime monitors should hit **`/api/healthz.php`** over HTTPS and expect HTTP 200 + `"status":"healthy"`.

Example check interval: 60s. Alert if failing for ≥2 consecutive checks (~2 min).

## PHP error log aggregation

| Environment | Location | Aggregation |
|-------------|----------|-------------|
| Apache + mod_php | `ErrorLog` in vhost / `php.ini` `error_log` | ship to journald / filebeat → ELK or CloudWatch |
| PHP-FPM | pool `php_admin_value[error_log]` | same |
| Local XAMPP | `xampp/apache/logs/error.log` + `php/logs` | optional |

Recommended `php.ini` (production):

```
log_errors = On
display_errors = Off
error_reporting = E_ALL & ~E_DEPRECATED & ~E_STRICT
error_log = /var/log/sparowvault/php-error.log
```

Rotate with logrotate (daily, keep 14). Alert on spike of `Fatal error` / `Uncaught` lines (grep + cron or agent).

## Uptime & alerts

1. External ping: UptimeRobot / Better Stack / Pingdom → `https://HOST/api/healthz.php`.
2. Backup job: email/Slack if `backup-daily` exits non-zero.
3. Deploy: notify `#sparow-alerts` on release; page on-call if healthz fails post-deploy.

Document the actual webhook/email targets in your private ops wiki (not in git).

## Dashboard signals (optional)

- `checks.db.latencyMs` from healthz (warn > 200ms sustained).
- `checks.companyTables.count` (must not drop after deploys).
- Disk free on `BACKUP_DIR` / offsite mount.
