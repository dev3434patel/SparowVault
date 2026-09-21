# Local package serving

```json
{
  "runId": "LF-20260922-013706-DELTA-020111",
  "packageRoot": "release/hosting-bundle",
  "servedWith": "php -S 127.0.0.1:13383 -t <extract>",
  "apacheHtaccess": "NOT_VERIFIED (PHP built-in server used; .htaccess requires Apache)",
  "probes": {
    "/": {
      "status": 200,
      "type": "text/html; charset=UTF-8",
      "bytes": 1429,
      "sha256": "c15da7a89796d5a1"
    },
    "/index.html": {
      "status": 200,
      "type": "text/html; charset=UTF-8",
      "bytes": 1429,
      "sha256": "c15da7a89796d5a1"
    },
    "/api/health.php": {
      "status": 500,
      "type": "application/json; charset=utf-8",
      "bytes": 141,
      "sha256": "f8fea7d860b14645"
    },
    "/ocr/7.0.0/tesseract-core-lstm.wasm": {
      "status": 200,
      "type": "application/wasm",
      "bytes": 2855361,
      "sha256": "66b17df6e20c5329"
    },
    "/ocr/7.0.0/tesseract-core-relaxedsimd-lstm.wasm": {
      "status": 200,
      "type": "application/wasm",
      "bytes": 2862266,
      "sha256": "7985c92d4c64e726"
    },
    "/ocr/7.0.0/tesseract-core-relaxedsimd.wasm": {
      "status": 200,
      "type": "application/wasm",
      "bytes": 3456075,
      "sha256": "45f8c9b516df326b"
    },
    "/assets/pdf.worker.min-wgc6bjNh.mjs": {
      "status": 200,
      "type": "application/javascript",
      "bytes": 1078612,
      "sha256": "f499515a0dc93d97"
    },
    "/ocr/7.0.0/worker.min.js": {
      "status": 200,
      "type": "application/javascript",
      "bytes": 111307,
      "sha256": "576b7df7e3393e13"
    }
  },
  "wasmAssetsFound": 6,
  "workerAssetsFound": 2,
  "suspiciousFiles": [
    "/20260910_atomic_writes.sql",
    "/20260911_security_sessions.sql",
    "/HOSTING_READY_CLEAN_IMPORT.sql"
  ],
  "buildOk": true,
  "packageOk": true,
  "localProductionLikePackage": "PASS_PHP_BUILTIN",
  "note": "This is extracted-package serving under PHP built-in server — not Vite source and not hosted Apache."
}
```
