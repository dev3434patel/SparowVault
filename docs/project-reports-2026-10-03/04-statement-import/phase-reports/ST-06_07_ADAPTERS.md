# ST-06 / ST-07 adapter scorecard notes

## Wave A

| Bank | Status | Evidence |
|------|--------|----------|
| kotak | synthetic-tested (numbered layout) | fixtures + unit tests; real private oracle remains local-only if authorized |
| hdfc | synthetic-tested | tests/fixtures/statements/hdfc.pdf |
| sbi | synthetic-tested | tests/fixtures/statements/sbi.pdf |
| axis | synthetic-tested | tests/fixtures/statements/axis.pdf |
| icici | registered | detection only — no certified layout fixture |

## Waves B–D

All remaining target banks are `registered` or synthetic-only (IndusInd). No fabricated column maps were added.

See `BANK_LAYOUT_SCORECARD.json` after `npm run statements:certify`.
