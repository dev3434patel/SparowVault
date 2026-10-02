# Oracle results

Rupees in the scenarios were converted at 100 paise per rupee before comparison. Personal expected figures were not taken from `computeAccountCashClosingPaise`. Company expected figures were not taken from `company_profit_loss`.

| Oracle | Expected paise | Actual paise | Difference | Reading |
| --- | --- | --- | --- | --- |
| O01 reservation | bank 500000, available 300000 | bank unchanged, zero transactions | 0 | PASS |
| O02 transfer | from 70000, to 30000 | same | 0 | PASS |
| O03 card | bank 300000 after repayment, expense 250000, liability 150000 | same | 0 | PASS |
| O04 EMI | principal sum 1200000, no second purchase | same | 0 | PASS |
| O05 loan | cash 5000000, income 0 | same | 0 | PASS |
| O06 udhari | cash 60000, expense 0 | same | 0 | PASS |
| O07 sale and receipt | revenue credit 1000000, tax credit 180000, open receivable 680000 | credits and receivable match | 0 after sign correction | PASS |
| O08 split | 100000 | 100000 | 0 | PASS |
| O09 stock ledger | 10000 | 0 | -10000 | FAIL |
| O10 payroll | expense 3180000, payable 0 after pay | same | 0 | PASS |
| O11 cheque | bank unchanged until clear | bank lower by 2500000 | -2500000 | FAIL |
| O12 bridge | payable 750000 | 0 | -750000 | FAIL |
| O13 one-sided journal | rejected | rejected |  | PASS |

The raw company file still stores the debit-minus-credit sales figure of -1000000. That is the credit of 1000000, not a missing million rupees.
