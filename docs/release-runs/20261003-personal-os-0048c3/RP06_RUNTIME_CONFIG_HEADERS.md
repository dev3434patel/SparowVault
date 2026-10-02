# RP06 — Runtime, configuration, and headers

Release run `20261003-personal-os-0048c3`.

## Header ownership

Static responses take CSP, `X-Frame-Options`, and the related policy from `.htaccess`, and only when the path is not `/api/`. API responses take the same policy from `apply_security_headers()` in `php/helpers/security.php`. The policy text was not widened. `unsafe-eval` and `*` were not added. `wasm-unsafe-eval` stays limited to `script-src`.

HTTPS redirect no longer treats a client `X-Forwarded-Proto` header as proof of HTTPS. `SV_SKIP_HTTPS` remains a server env used by the local Apache package config. It is not read from a request header.

## Not run

Success, 4xx, and 5xx responses were not re-fetched after this split, so duplicate `DENY, DENY` is not re-measured. PDF.js and Tesseract were not executed under the hosted CSP. Windows versus Linux path behavior was not compared. PHP and MariaDB versions on the future host were not verified against current vendor support pages.
