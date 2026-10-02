# RP04 — Sync, origin, and client upgrade

Release run `20261003-personal-os-0048c3`.

## What was not executed

A second browser profile was not opened. The close run used two HTTP cookie jars on `sparowvault_test`: the owner's second login pulled the pushed account, the other user did not, and the household grant projected only the shared account. Import-source and card-statement rows were covered by `npm run test:statements`, not by those two jars. Tombstones and quota contention were not timed.

There is no service worker in this checkout. None was added.

## Origin runbook

IndexedDB name `sparowvault_v1` is origin-bound. The same name at localhost, staging, and production does not share books.

An approved move to a new origin is:

1. Keep unsynced local changes. Do not clear IndexedDB.
2. Confirm which collections the server actually has. Local-only stores are `users`, `aiSuggestions`, and `syncMutations`.
3. Export local-only records on the device. Do not put auth cookies, PINs, or provider secrets in that file.
4. Sign in at the new origin as the mapped account. Two equal usernames in different environments are not the same identity.
5. Merge only after that sign-in, then compare counts and balances.
6. Do not send private owner books to staging by default.
7. Do not roll back to an older frontend that cannot read a database already upgraded to Dexie schema version 5.

Client schema version in `src/db/database.ts` is 5. This run did not test a previous client against that upgrade.
