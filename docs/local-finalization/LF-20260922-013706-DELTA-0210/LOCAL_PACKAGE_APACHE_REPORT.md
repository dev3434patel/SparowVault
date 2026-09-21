# Apache extracted-package serving

```json
{
  "runId": "LF-20260922-013706-DELTA-0210",
  "listen": "127.0.0.1:8233",
  "httpd": "C:/xampp/apache/bin/httpd.exe",
  "documentRoot": "throwaway extract of release/hosting-bundle",
  "svSkipHttps": true,
  "results": {
    "index": {
      "status": 200,
      "type": "text/html",
      "csp": "default-src 'self';     base-uri 'self';     form-action 'self';     frame-ancestors 'none';     img-src 'self' data: blob:;     font-src 'self' data: https://fonts.gstatic.com;     style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;     script-src 'self' 'wasm-unsafe-eval' https://checkout.razorpay.com;     worker-src 'self';     connect-src 'self' https://api.razorpay.com https://lumberjack.razorpay.com;     frame-src https://api.razorpay.com https://checkout.razorpay.com;     object-src 'none';     upgrade-insecure-requests",
      "xfo": "DENY",
      "bytes": 1429,
      "sha16": "c15da7a89796d5a1"
    },
    "root": {
      "status": 200,
      "type": "text/html",
      "csp": "default-src 'self';     base-uri 'self';     form-action 'self';     frame-ancestors 'none';     img-src 'self' data: blob:;     font-src 'self' data: https://fonts.gstatic.com;     style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;     script-src 'self' 'wasm-unsafe-eval' https://checkout.razorpay.com;     worker-src 'self';     connect-src 'self' https://api.razorpay.com https://lumberjack.razorpay.com;     frame-src https://api.razorpay.com https://checkout.razorpay.com;     object-src 'none';     upgrade-insecure-requests",
      "xfo": "DENY",
      "bytes": 1429,
      "sha16": "c15da7a89796d5a1"
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
      "csp": "default-src 'self';     base-uri 'self';     form-action 'self';     frame-ancestors 'none';     img-src 'self' data: blob:;     font-src 'self' data: https://fonts.gstatic.com;     style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;     script-src 'self' 'wasm-unsafe-eval' https://checkout.razorpay.com;     worker-src 'self';     connect-src 'self' https://api.razorpay.com https://lumberjack.razorpay.com;     frame-src https://api.razorpay.com https://checkout.razorpay.com;     object-src 'none';     upgrade-insecure-requests, default-src 'self'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; img-src 'self' data: blob:; font-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self' https://checkout.razorpay.com; connect-src 'self' https://api.razorpay.com https://lumberjack.razorpay.com; frame-src https://api.razorpay.com https://checkout.razorpay.com; object-src 'none'; upgrade-insecure-requests",
      "xfo": "DENY, DENY",
      "bytes": 141,
      "sha16": "88344022d9c42b0d"
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
      "elapsedMs": 16,
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
