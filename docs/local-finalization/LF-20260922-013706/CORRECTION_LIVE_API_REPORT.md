# Correction live API report

## Implemented

- Client builds `reviewDigest` via `buildServerAlignedDigestMaterial` + SHA-256.
- PHP `statement_review_digest()` recomputes and rejects mismatches with **409 / STALE_REVIEW_DIGEST**.
- No financial writes occur on digest rejection (asserted in `tests/statement-api-checks.mjs`).

## Scenario coverage

| Scenario | Status |
|----------|--------|
| Stale digest after conceptual correction | Covered by API (wrong digest) |
| Matching digest | Not rejected for digest reasons |
| Unit approvalInvalidatedByCorrection | Existing unit tests |
| Browser one-paise edit → stale submit | Relies on UI digest regeneration (always recomputed at save) |

## Residual

Full browser matrix of every edit type × stale submit remains partially covered by unit + digest API; OCR bulk bypass remains gated by existing checkbox.
