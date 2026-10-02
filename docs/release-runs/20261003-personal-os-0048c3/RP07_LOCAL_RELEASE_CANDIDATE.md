# RP07 — Local release candidate

Release run `20261003-personal-os-0048c3`.

`npm run host:package` completed after the household, statement, and header patches. Exit 0.

Archive: `release/hosting-bundle.zip`  
SHA-256: `664D1BC8DF2A713E6554CAC47314E6FF01C411B4324F446F51ECA69C07412D58`

The bundle contains `api/personal/household.php` and the readiness guard in `php/helpers/app.php`. Checkout is baked off (`VITE_ENABLE_RAZORPAY=false`). That is a build fact, not a free-launch approval.

Close run: Apache served this bundle. Empty config is HTTP 503 `not_configured`. `sparowvault_test` is HTTP 200 `healthy` (`PASS_CONFIGURED_HEALTH`). The zip hash still matches `664D1BC8DF2A713E6554CAC47314E6FF01C411B4324F446F51ECA69C07412D58`. `sparowvault_test` copied into `sparowvault_test_restore_0048c3` with 35 matching table counts. Packaged OCR read a fixture image. A browser household accept was not clicked.
