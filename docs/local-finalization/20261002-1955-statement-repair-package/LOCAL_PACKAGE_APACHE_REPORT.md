# Apache extracted-package serving

```json
{
  "runId": "20261002-1955-statement-repair-package",
  "listen": "127.0.0.1:1086",
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
      "sha16": "15a7f16b63b2d603"
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
      "elapsedMs": 13,
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
  "localProductionLikePackage": "PASS_APACHE",
  "note": "Project-local Apache FOREGROUND instance; system XAMPP :80 untouched. SQL in bundle remains for operator install but must be HTTP-denied by .htaccess."
}
```
