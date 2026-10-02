# Apache extracted-package serving

```json
{
  "runId": "20260930-sv30",
  "listen": "127.0.0.1:5381",
  "httpd": "C:/xampp/apache/bin/httpd.exe",
  "documentRoot": "throwaway extract of release/hosting-bundle",
  "svSkipHttps": true,
  "results": {
    "index": {
      "status": 200,
      "type": "text/html",
      "csp": "default-src 'self';     base-uri 'self';     form-action 'self';     frame-ancestors 'none';     img-src 'self' data: blob:;     font-src 'self' data: https://fonts.gstatic.com;     style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;     script-src 'self' 'wasm-unsafe-eval' https://checkout.razorpay.com;     worker-src 'self';     connect-src 'self' https://api.razorpay.com https://lumberjack.razorpay.com;     frame-src https://api.razorpay.com https://checkout.razorpay.com;     object-src 'none';     upgrade-insecure-requests",
      "xfo": "DENY",
      "bytes": 1736,
      "sha16": "82f89a5225f9fb74"
    },
    "root": {
      "status": 200,
      "type": "text/html",
      "csp": "default-src 'self';     base-uri 'self';     form-action 'self';     frame-ancestors 'none';     img-src 'self' data: blob:;     font-src 'self' data: https://fonts.gstatic.com;     style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;     script-src 'self' 'wasm-unsafe-eval' https://checkout.razorpay.com;     worker-src 'self';     connect-src 'self' https://api.razorpay.com https://lumberjack.razorpay.com;     frame-src https://api.razorpay.com https://checkout.razorpay.com;     object-src 'none';     upgrade-insecure-requests",
      "xfo": "DENY",
      "bytes": 1736,
      "sha16": "82f89a5225f9fb74"
    },
    "mjsWorker": {
      "status": 200,
      "type": "text/javascript",
      "csp": "default-src 'self';     base-uri 'self';     form-action 'self';     frame-ancestors 'none';     img-src 'self' data: blob:;     font-src 'self' data: https://fonts.gstatic.com;     style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;     script-src 'self' 'wasm-unsafe-eval' https://checkout.razorpay.com;     worker-src 'self';     connect-src 'self' https://api.razorpay.com https://lumberjack.razorpay.com;     frame-src https://api.razorpay.com https://checkout.razorpay.com;     object-src 'none';     upgrade-insecure-requests",
      "xfo": "DENY",
      "bytes": 1078612,
      "sha16": "f499515a0dc93d97"
    },
    "wasm": {
      "status": 200,
      "type": "application/wasm",
      "csp": "default-src 'self';     base-uri 'self';     form-action 'self';     frame-ancestors 'none';     img-src 'self' data: blob:;     font-src 'self' data: https://fonts.gstatic.com;     style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;     script-src 'self' 'wasm-unsafe-eval' https://checkout.razorpay.com;     worker-src 'self';     connect-src 'self' https://api.razorpay.com https://lumberjack.razorpay.com;     frame-src https://api.razorpay.com https://checkout.razorpay.com;     object-src 'none';     upgrade-insecure-requests",
      "xfo": "DENY",
      "bytes": 2855361,
      "sha16": "66b17df6e20c5329"
    },
    "sqlDenied": {
      "status": 403,
      "type": "text/html; charset=iso-8859-1",
      "csp": "default-src 'self';     base-uri 'self';     form-action 'self';     frame-ancestors 'none';     img-src 'self' data: blob:;     font-src 'self' data: https://fonts.gstatic.com;     style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;     script-src 'self' 'wasm-unsafe-eval' https://checkout.razorpay.com;     worker-src 'self';     connect-src 'self' https://api.razorpay.com https://lumberjack.razorpay.com;     frame-src https://api.razorpay.com https://checkout.razorpay.com;     object-src 'none';     upgrade-insecure-requests",
      "xfo": "DENY",
      "bytes": 199,
      "sha16": "5b13fb5957b84ef7"
    },
    "envDenied": {
      "status": 403,
      "type": "text/html; charset=iso-8859-1",
      "csp": "default-src 'self';     base-uri 'self';     form-action 'self';     frame-ancestors 'none';     img-src 'self' data: blob:;     font-src 'self' data: https://fonts.gstatic.com;     style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;     script-src 'self' 'wasm-unsafe-eval' https://checkout.razorpay.com;     worker-src 'self';     connect-src 'self' https://api.razorpay.com https://lumberjack.razorpay.com;     frame-src https://api.razorpay.com https://checkout.razorpay.com;     object-src 'none';     upgrade-insecure-requests",
      "xfo": "DENY",
      "bytes": 199,
      "sha16": "5b13fb5957b84ef7"
    },
    "health": {
      "status": 500,
      "type": "application/json; charset=utf-8",
      "csp": "default-src 'self';     base-uri 'self';     form-action 'self';     frame-ancestors 'none';     img-src 'self' data: blob:;     font-src 'self' data: https://fonts.gstatic.com;     style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;     script-src 'self' 'wasm-unsafe-eval' https://checkout.razorpay.com;     worker-src 'self';     connect-src 'self' https://api.razorpay.com https://lumberjack.razorpay.com;     frame-src https://api.razorpay.com https://checkout.razorpay.com;     object-src 'none';     upgrade-insecure-requests, default-src 'self'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; img-src 'self' data: blob:; font-src 'self' data: https://fonts.gstatic.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; script-src 'self' 'wasm-unsafe-eval' https://checkout.razorpay.com; worker-src 'self'; connect-src 'self' https://api.razorpay.com https://lumberjack.razorpay.com; frame-src https://api.razorpay.com https://checkout.razorpay.com; object-src 'none'; upgrade-insecure-requests",
      "xfo": "DENY, DENY",
      "bytes": 141,
      "sha16": "1d953902948a04ee"
    },
    "concurrent": {
      "statuses": [
        200,
        200,
        200,
        200,
        200,
        200,
        200,
        200,
        200,
        200,
        200,
        200
      ],
      "elapsedMs": 15,
      "allOk": true
    }
  },
  "checks": {
    "pageOk": true,
    "mjsOk": true,
    "wasmOk": true,
    "sqlBlocked": true,
    "envBlocked": true,
    "concurrentOk": true
  },
  "localProductionLikePackage": "BLOCKED",
  "note": "Checker static checks passed. PHP health on the throwaway extract returned 500 (ENV_VALIDATION_FAILED, missing CLOUD_JWT_SECRET). That is not a hosted pass. Project-local Apache FOREGROUND instance; system XAMPP :80 untouched."
}
```

## Conclusion

The checker script would have printed `PASS_APACHE` because it does not fail on health 500. This record is **BLOCKED**. `/api/health.php` returned 500 `application/json` with `ENV_VALIDATION_FAILED` and `Missing required environment variables: CLOUD_JWT_SECRET`. The extract uses the empty hosting template. Restore into a new company was not run against MySQL.

Missing Apache, or health HTTP 500 on that empty template, stays **BLOCKED**. It is not a hosted pass.

## Operator step before health can be healthy

The shipped `.env.host` template leaves `CLOUD_JWT_SECRET` and the database empty on purpose. Do not commit a real secret into that template or into git.

Health reports `not_configured` ("The process is not configured.") when the secret or the database is absent, and it does not open a database connection. A configured database whose name does not contain `test` is refused before connect ("Refusing to boot against a non-test database.").

`/api/health.php` and `/api/healthz.php` return healthy only when the process environment supplies both of the following:

- a disposable database whose name contains `test` (`DB_NAME` plus `DB_HOST` and `DB_USER`, or a `mysql://` `DATABASE_URL`)
- a non-production secret: `CLOUD_JWT_SECRET` set to a local value and `APP_ENV` set to a value other than `production` (for example `test`)

Use a throwaway secret for that local process only. The example value in `.env.test.example` is a non-production secret and must not be used for a production boot.

## MIME

- `/` and `/index.html`: 200, `text/html`, 1736 bytes
- PDF worker `.mjs`: 200, `text/javascript`
- `.wasm`: 200, `application/wasm`
- `HOSTING_READY_CLEAN_IMPORT.sql` and `.env.host`: 403

## Routes

A second throwaway extract of the same bundle returned the SPA shell (200, `text/html`, 1736 bytes) for `/`, `/index.html`, `/bills`, `/household`, `/company/login`, `/company/app`, and `/company/app/parties`. `/api/health.php` stayed 500.

## Zip

`npm run host:package` rebuilt `release/hosting-bundle` after the dashboard and party-amount edits. The bundle contains `assets/voucherListAmount-BO7AbWAQ.js` and `assets/PartyDetailPage-Bif8ddQ2.js`. The first zip failed because `release/hosting-bundle/assets/index-Bs1y_WwO.js` was locked. A retry wrote `release/hosting-bundle.zip` (21210856 bytes). The earlier lock on `api/public/config.php` did not return, and that file is in the extracted bundle.

