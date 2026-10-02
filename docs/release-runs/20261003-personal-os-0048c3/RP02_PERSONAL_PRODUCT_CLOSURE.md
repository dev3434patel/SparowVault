# RP02 — Personal household closure

Release run `20261003-personal-os-0048c3`. Commit `6395ec9` plus uncommitted source. This is not a 47-surface pass.

## What changed

Cross-login sharing is a server invite and grant, not a note on the inviter's own member row.

- Tables: `sql/migrations/20261003_personal_household_grants.sql`
- API: `POST/GET /api/personal/household.php`
- Rules: `php/helpers/personal_household.php` and `src/services/householdGrantRules.ts`
- The household screen issues and accepts through that API. The owner checks which transactions to put in the scope. Accept does not copy `cloud_collection_rows`.
- A viewer write is refused. A revoked grant is refused, including a later write that still carries the old revision.
- The last owner cannot be demoted. A disconnected device can keep a cached copy until it reconnects. That limit is on the invite copy in English and Gujarati.

The older same-profile helpers `issueHouseholdInvite` and `acceptHouseholdInvite` remain for the existing unit test. The screen no longer uses them for invite or accept.

## Evidence

| Command | Exit | What it shows |
| --- | --- | --- |
| `php php/scripts/personal_household_rules_golden.php` | 0 | Accept, replay, expiry, revoke, self-accept, owner-role refusal, viewer denial, out of scope, stale revision, last owner |
| `php php/scripts/personal_household_disposable.php` with `DB_NAME=sparowvault_test` | 0 | Alice issues, Bob accepts, Bob's cloud row count stays 0, private transaction is absent, viewer write is `VIEWER_DENIED`, revoked write is refused |
| `npx vitest run` household rules, statement local books, personal book workflows | 0 | 3 files, 31 tests |

Users were `svrel_alice` and `svrel_bob` in `sparowvault_test` only. The owner database `sparowvault` was not opened by that script. The guard refuses it before connect (`php php/scripts/personal_release_target_guard.php`, exit 0, `owner-target-refused`).

## Not run

Two isolated browser profiles were not opened. Expiry was proved on the decision function, not by waiting out a stored invite. Plan-flag fail-closed is only the explicit `import` flag on statement commit. A missing flag key is still writable. That is unfinished, not a pass.
