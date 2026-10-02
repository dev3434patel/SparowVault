# Remaining work

Release run `20261003-personal-os-0048c3`. Decision `LOCAL_REMEDIATION_REQUIRED`. `RELEASE_APPROVAL.json` is unsigned.

Closed in the local close run:

1. The zip `664D1BC8DF2A713E6554CAC47314E6FF01C411B4324F446F51ECA69C07412D58` was served from `release/hosting-bundle` on Apache. Empty config is HTTP 503 `not_configured`. `sparowvault_test` health is HTTP 200 `healthy` (`PASS_CONFIGURED_HEALTH`).
2. `npm run test:statements` exited 0, including omit-pair 422 with no partial postings and identical-import idempotency.
3. Two isolated HTTP clients on `sparowvault_test` synced an account to the owner only, accepted a viewer grant, denied a viewer write, and hid the grant after revoke.
4. CSP and `X-Frame-Options` are each present once on HTTP 200, 405, 503, and 500.
5. `sparowvault_test` restored by row count into `sparowvault_test_restore_0048c3` (35 tables). Packaged OCR read a fixture image (1672 characters).

Still open, and not something this run can sign off:

1. Two browser profiles, and OCR clicked inside the served page, were not run.
2. Owner must name a staging target before RP08. Owner must sign `RELEASE_APPROVAL.json` before any production change.
3. Bank layout verification stays blocked until authorized real statements exist. Synthetic layouts stay unverified for scope.
4. Paid launch stays blocked until the owner chooses paid mode and a Razorpay test callback is actually delivered.
