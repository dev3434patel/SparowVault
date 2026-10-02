# Package and restore

Vite build wrote `package/dist` inside this run. Repo `dist/` and `release/hosting-bundle` were not replaced. `npm run host:package` was not run because it deletes and rewrites `release/hosting-bundle`. OCR worker and traineddata hashes were unchanged by the build. The Vite output contains no `.wasm` file. OCR wasm still lives under `public/ocr/7.0.0/` and was not copied into this extract.

Serving used `package-router.php` on `127.0.0.1:8099`.

| Check | Result |
|---|---|
| `/` and deep link HTML | 200 `text/html` |
| JS and mjs | 200 `text/javascript` |
| CSP on static files | `default-src 'self'` |
| `.env` and `.sql` | 403 |
| Secret scan of `package/dist` | 0 hits for private-key or live-key patterns |
| `/api/healthz.php` | 200 healthy, 36 company tables on the database selected by the server environment |
| WASM MIME | not served; no wasm in the extract |
| Restore into `sparowvault_verify_restore` | database created empty. `company_restore_preview` returns `applied: false`. F-006 |

The health response is a read. It is not a restore and it is not a second-company drill.
