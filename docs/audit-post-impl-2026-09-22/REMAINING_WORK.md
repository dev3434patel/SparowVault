# Remaining work

## Closed — local mandatory + runnable completion (DELTA-0222)

- Apache/.htaccess extracted-package serve (MIME, SQL HTTP deny, concurrent fetches)
- PDF.js Chromium rendered review matrix
- Firefox + WebKit overlay matrix including high-DPI and rotation
- Concurrent statement import economic uniqueness
- Card PDF dialog UI → document-class route + destination; statement-card API
- Independent dual-context client sync
- Package SQL allowlist policy
- Fresh `test:statements` green; strict gate still honestly fails at 0 verified layouts

## Still open (not FIXED — external only)

1. **F-BANK-20 / R7** — authorized real statements + independent holdouts. Blocks `verified-for-scope` / 20-bank claim only.
2. Hosted deployment checks (deferred / NOT_TESTED).
3. Physical multi-device sync soak (NOT_TESTED).

## Explicit non-goals

- Inventing bank layouts or claiming LAYOUT_VERIFIED without holdout
- Closing features by deleting helpers
- Remote PDF AI / model training
