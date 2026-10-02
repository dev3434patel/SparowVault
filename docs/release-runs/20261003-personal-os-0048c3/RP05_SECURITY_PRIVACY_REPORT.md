# RP05 — Security and privacy

Release run `20261003-personal-os-0048c3`. Sessions stay the HttpOnly `sv_auth` cookie and `auth_sessions`. No JWT algorithm migration was made.

## Checked in this run

- Household accept uses the authenticated user. A `userId` in the body does not choose the accepter.
- Viewer writes and revoked grants fail on `sparowvault_test`.
- Statement commit rejects a body whose `userId` is not the session user (`OWNER_MISMATCH` already in `statements_commit`).
- An explicit global flag `import=false` makes statement commit return `MODULE_UNAVAILABLE`. A missing key does not.
- Company routes were not deleted and were not retested.

## Not run

CSRF matrix, logout revocation, rate-limit exhaustion, attachment upload disclosure, and production login's bearer body were not re-executed here. PDF bytes and passwords are still outside the statement commit contract; that was not re-proved with a browser network log.
