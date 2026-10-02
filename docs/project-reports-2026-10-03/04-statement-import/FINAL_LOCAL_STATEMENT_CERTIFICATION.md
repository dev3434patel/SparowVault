# Final local statement certification

| Field | Value |
|-------|--------|
| Date | 2026-09-21 |
| Branch | `feat/statement-intelligence-v2` |
| Runner | `npm run statements:certify` |

## Labels

| Label | Result |
|-------|--------|
| LOCAL_PIPELINE_VERIFIED | PASS (shared verifier, registry, synthetic oracle, existing parser suite) |
| LAYOUT_VERIFIED | none — no authorized real holdout corpus in this checkout |
| LOCAL_STATEMENT_RELEASE_CANDIDATE | NO — 20-bank real layouts remain BLOCKED |
| BLOCKED_FOR_20_BANK_CLAIM | YES |
| HOSTED_RELEASE | NOT TESTED |

## Scorecard snapshot

- synthetic-tested: 5 layouts (kotak numbered, hdfc, sbi, axis, indusind)
- registered: 15 layouts (including icici + waves B–D)
- verified-for-scope: 0

## Privacy

PDF/password remain on-device by default. Server accepts reviewed JSON only.

## Continuing closure (2026-09-22)

Additional local work completed after initial pass:

- Page coverage map on analysis; BF/CF rows skipped as non-transactions
- Statement match proposals (suggestion-only) + review revision invalidation on edits
- Goal earmark vs funded-transfer pure effects + tests
- Fresh typecheck / certify / php / sql gate evidence recorded

Still BLOCKED: real authorized corpora for `LAYOUT_VERIFIED` across 20 banks; hosted release.
