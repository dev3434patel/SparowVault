# Command results

Release run `20261003-personal-os-0048c3`. Exit codes are the process exit codes. A command that was not started is `NOT_RUN`.

## Health behavior

### Before (`php/helpers/app.php` as it stood at the start)

| Probe | HTTP | `data.status` | Connected |
| --- | --- | --- | --- |
| Empty secret and database | 503 | `not_configured` | no |
| Name `sparowvault_owner_books`, non-production secret | 503 | `refused` (`Refusing to boot against a non-test database.`) | no |
| `APP_ENV=production`, `DB_NAME=sparowvault` | 503 | `refused` (substring `test` is checked first) | no |
| `APP_ENV=production`, `DB_NAME=sparowvault_test` | 503 | `not_configured` (production is refused even when the name contains `test`) | no |

October 2 extracted package, empty env: HTTP 500, 141 bytes. That bundle bootstrap still validates `/api/health.php`.

### After

| Probe | HTTP | `data.status` | Connected |
| --- | --- | --- | --- |
| Empty secret and database | 503 | `not_configured` | no |
| `APP_ENV=production`, `DB_NAME=sparowvault`, decision only | n/a | configuration outcome `ready` | no |
| Same name, destructive decision | n/a | `refused` (`database is not allowlisted`) | no |
| `APP_ENV=production`, `DB_NAME=sparowvault_test`, `DB_PORT=1` | 503 | `unavailable` (`checks.db` `down`) | attempted port 1 only, not the owner database |
| `APP_ENV=production`, `DB_NAME=sparowvault_test`, port 3306, schema applied | 200 | `healthy` (`checks.db` `ok`, `checks.schema` `ok`) | `sparowvault_test` only |

The public body has no password, DSN, or table list.

## Destructive rejection (before dump, truncate, or migrate)

Environment forced `DB_PORT=1` so a guard bug could not reach MariaDB on 3306. Database name `sparowvault`. Sentinel was set.

| Command | Exit | Evidence |
| --- | --- | --- |
| `php scripts/backup_db.php` | 2 | stderr `Refusing destructive runner: database is not allowlisted.` Backup directory stayed empty. |
| `node scripts/db-test-reset.mjs` | 2 | `Refusing destructive runner before connect: TEST_DB_NAME 'sparowvault' is not allowlisted.` No `Connected to` line. |
| `node scripts/db-test-seed.mjs` | 2 | Same refusal before connect. No truncate. |
| `php php/scripts/migrate_atomic_writes.php --database=sparowvault --apply` | 2 | Refusal before connect. |
| `php php/scripts/migrate_security_sessions.php --database=sparowvault --apply` | 2 | Refusal before connect. |

## Disposable database

| Command | Exit | Result |
| --- | --- | --- |
| `node scripts/ensure-disposable-test-db.mjs` | 0 | Created `sparowvault_test`. Admin connection `currentDb` was null. Wrote gitignored `.env.test`. |
| `node scripts/db-test-reset.mjs` with `TEST_DB_NAME=sparowvault_test`, `TEST_DB_PORT=3306`, `AUDIT_RUN_SENTINEL=rp01-20261003-personal-os-0048c3` | 0 | Log line `Connected to sparowvault_test`. Schema only. No `company_*` tables in the drop list. |

## Login and one synthetic write/read

`node scripts/with-local-test-runtime.mjs node docs/release-runs/20261003-personal-os-0048c3/prove-personal-write.mjs` — **NOT_RUN**.

Blocker: pid 31356 was already `php -S localhost:5000 -t . php/dev-router.php`. That script health-checks or binds port 5000. Its environment was not inspected, so it was not reused and it was not killed.

Substitute, same database contract (`DB_NAME=sparowvault_test`, `APP_ENV=test`, sentinel set), PHP on `127.0.0.1:5344`:

| Step | Result |
| --- | --- |
| First call (user did not exist yet) | register HTTP 201, write HTTP 201, read HTTP 200 name `RP01 Synthetic Cash`. Script exit 0. |
| Second call | login HTTP 200, write HTTP 201, read HTTP 200 same name. Script exit 0. |
| `/api/health.php` | HTTP 200 `healthy`. Body has no `companyTables`. |
| `/api/healthz.php` | HTTP 503 `degraded`, service `sparowvault-company`. |

User name `rp01synth` exists only in `sparowvault_test`.

## Apache package gate

`node --check scripts/apache-package-serve-check.mjs` exit 0.

| `LF_RUN_ID` | Extra env | Exit | Health |
| --- | --- | --- | --- |
| `20261003-personal-os-0048c3-empty` | none | 0 | HTTP 503 `not_configured`. Label `PASS_STATIC_NEGATIVE_CONFIG`. `releasePass` false. |
| `20261003-personal-os-0048c3-positive-down` | positive, `sparowvault_test`, port 1, `APP_ENV=production` | 1 | HTTP 503 `unavailable`. Label `FAIL`. |
| `20261003-personal-os-0048c3-positive-owner` | positive, name `sparowvault`, port 1 | 1 | `refusedBeforeConnect` true. No positive server. Label `FAIL`. |
| `20261003-personal-os-0048c3-positive-live` | positive, `sparowvault_test`, port 3306, `APP_ENV=production` | 0 | HTTP 200 `healthy`. Label `PASS_CONFIGURED_HEALTH`. |

An earlier empty run, before `php/bootstrap_api.php` was added to the throwaway overlay, returned HTTP 500 `ENV_VALIDATION_FAILED` (141-byte class). That matches the stored bundle. It is not the current source behavior.

`npm run host:package` was not run. The immutable archive was not rebuilt.
