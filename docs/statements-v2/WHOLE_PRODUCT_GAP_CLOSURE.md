# Whole-product gap closure notes (ST-16)

Statement upgrades must not hide unfinished finance areas.

| Area | Rule encoded in statement work |
|------|--------------------------------|
| Goal earmarking | Same-account earmark does not move cash / net worth |
| Funded goal transfer | Real destination account required; changes two accounts |
| EMI split | Bank EMI debit alone never invents P/I; schedule/confirm/estimate only |
| Card repayment | `cc_payment` links liability; not a second expense |
| Refunds | Link original expense; not automatic income |
| April synthetic credits | Refund + udhari collection ≠ new income |
| Opening balance | Never reset account opening on each import |

Cross-module finance gates remain: `npm run finance:gate:all`.
