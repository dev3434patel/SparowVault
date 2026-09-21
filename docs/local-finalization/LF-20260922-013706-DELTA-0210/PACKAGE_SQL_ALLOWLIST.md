# Package SQL allowlist

```json
{
  "intentionalOperatorInstallSqlInBundle": true,
  "httpDenySqlExtensions": true,
  "bundleContainsHostingSql": true,
  "allowlist": [
    "HOSTING_READY_CLEAN_IMPORT.sql — clean schema for host install (operator only)",
    "20260910_atomic_writes.sql — migration companion",
    "20260911_security_sessions.sql — migration companion"
  ],
  "rule": "SQL may ship in the package for offline install; Apache .htaccess must deny HTTP GET of *.sql. PHP built-in serve does not honor .htaccess — Apache evidence required for deny proof.",
  "status": "PASS_POLICY_DOCUMENTED"
}
```
