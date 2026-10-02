# Personal OS final release report

Release run: `20261003-personal-os-0048c3`  
Date: 3 October 2026  
Source commit: `6395ec9` plus uncommitted repairs in this run  
Decision: `LOCAL_REMEDIATION_REQUIRED`

This is not staging verification, production verification, 47-parent completion, or 20-bank certification. `PASS_LOCAL_UNIT` and `PASS_APACHE` from 2 October stay as those labels. The archive hash in `RELEASE_MANIFEST.json` was checked again in the close run. `RELEASE_APPROVAL.json` stays unsigned.

## What this run actually did

- Personal readiness no longer requires the database name to contain `test`, and it does not refuse `APP_ENV=production` for that reason. Empty secret or missing database stays non-200. Destructive runners still refuse `sparowvault` before connect.
- Disposable proof on `sparowvault_test`: health can be `healthy`, and one synthetic Personal write/read was recorded by the earlier command log in this same run.
- Household invites are server tokens. On `sparowvault_test`, Bob accepted Alice's invite, Bob gained no copied cloud rows, the private transaction stayed hidden, a viewer write was denied, and a revoked grant blocked a later write.
- Statement import stores the reviewed command before POST. Long receipt links use the import source id.
- API and static header writers are split. Client `X-Forwarded-Proto` no longer skips HTTPS.

## Close run on 3 October 2026

Evidence: `LOCAL_CLOSE_EVIDENCE.json` and `docs/local-finalization/20261003-personal-os-0048c3-close/LOCAL_PACKAGE_APACHE_REPORT.md`.

- `npm run test:statements` exited 0. That includes omit-pair HTTP 422 with no partial postings, identical-import idempotency, CSRF, logout revocation, and a full-table restore into that run's own database. The database name contained `test`.
- Two cookie jars on `sparowvault_test`: the second login of the owner saw the pushed account, the other user did not, the grant showed only the shared account, a viewer write returned `VIEWER_DENIED`, revoke hid the projection, and replaying the invite returned `TOKEN_USED`.
- Apache served a throwaway extract of `release/hosting-bundle`. Empty config returned HTTP 503 `not_configured`. Configured health against `sparowvault_test` returned HTTP 200 `healthy`. Label: `PASS_CONFIGURED_HEALTH`. Zip SHA-256 remained `664D1BC8DF2A713E6554CAC47314E6FF01C411B4324F446F51ECA69C07412D58`.
- One CSP and one `X-Frame-Options: DENY` on HTTP 200 (`/index.html`), 405 (POST `/api/health.php`), 503 (unconfigured health), and 500 (unconfigured household). No `unsafe-eval` and no `*` source.
- `sparowvault_test` copied into `sparowvault_test_restore_0048c3`: 35 tables, row counts matched.
- Packaged OCR language data and core read `ocr-clean.pdf.png` and returned 1672 characters including digits.

## Still open

- Two browser profiles were not opened. The HTTP clients above are separate cookie jars, not two browsers.
- OCR ran in Node against the packaged assets. It was not clicked inside the served page.
- Bank layouts verified-for-scope: 0. Synthetic-tested: 5. Registered target layouts: 15.
- Account Aggregator live access: not run.
- Physical devices: not run.
- Staging: `STAGING_ACCESS_BLOCKED`.
- Production: `AWAITING_PRODUCTION_AUTHORIZATION`.
- Paid billing: `BLOCKED`. Checkout-off in the package build is not a free-launch approval.

Company books were not dropped and payroll/GST was not expanded. Company product completion is a separate denominator.

No critical financial defect found in the household disposable check was left open. Unrun mandatory checks still block a local release candidate.
