# Correction / digest E2E

## Covered this delta (live API via test:statements)

| Case | Result |
|------|--------|
| Stale digest → 409 STALE_REVIEW_DIGEST, no financial writes | PASS |
| Direction-flip payload with hash of prior row | PASS (rejected) |
| Month-crossing date with stale hash | PASS (rejected) |
| Matching digest not rejected for digest reasons | PASS |
| Completeness omit-pair still 422 | PASS |
| Idempotent / concurrent statement imports (suite) | PASS (existing) |

## Not fully expanded in UI browser path

Tampered digest with recomputed client hash still fails independent arithmetic/completeness when applicable — checksum is a consistency guard, not authenticity proof.

Delivered alongside parent `CORRECTION_LIVE_API_REPORT.md` semantics; this file is the delta expansion.
