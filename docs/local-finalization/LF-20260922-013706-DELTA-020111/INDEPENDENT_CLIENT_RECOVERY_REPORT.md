# Independent-client recovery

## Proven

- Dual Playwright contexts: localStorage/cookie isolation
- Same user second login
- Cross-user account read denied
- Parent suite: concurrent identical imports → one economic outcome; outbox durability two-tab

## NOT fully proven as true DB races on this host

PHP built-in server concurrency is limited (often single-request serialization on Windows). Browser-launched parallel requests may not overlap at the DB layer.

| Scenario | Status |
|----------|--------|
| Storage isolation | PASS |
| Cross-user deny | PASS |
| Lost-response / offline resume | Covered by existing outbox/integrity suites (same-profile), not re-proven as multi-context race |
| True overlapping workers | NOT_RUN (would need multi-worker Apache/PHP against guarded DB) |
| Physical device | NOT_TESTED |
