# Journeys

The master playbook that names J01–J10 was not on disk. These ten journeys are the safe local flows from the approved plan, executed on disposable data. They are not a reconstruction of a missing document.

| ID | Flow | Result |
|---|---|---|
| J01 | Reserve envelope 200000, sinking 50000, goal earmark 50000 against 1000000 cash | PASS. Available 700000. Two fund rows persisted |
| J02 | Transfer 50000 from bank to cash | PASS. Bank 950000, cash 50000 |
| J03 | Card purchase 300000, cash unchanged by the purchase, repayment 100000, statement close 250000, allocation 100000 | PASS |
| J04 | EMI plan for that purchase, 3 installments, principal 300000. Loan proceeds 5000000 increase cash and principal, not income. Udhari given 100000 and collected 40000 are not income | PASS |
| J05 | Sale base 1000000 plus tax 180000, then receipt 500000 | PASS. Income stays 1000000. Receivable net 680000 |
| J06 | Cost split 6000+4000 on a 10000 debit. Unequal split rejected | PASS. Allocation sum 10000, debit 10000 |
| J07 | Stock 10 at 100 then 4 at 150 | FAIL. See F-002 |
| J08 | Payroll accrual then payment for synthetic gross 30000 rupees | PASS. Salary debit 3180000 paise once |
| J09 | Cheque match | PASS. Cash vouchers added 0. Fee voucher was not invented |
| J10 | Reimbursement 100000 and an omitted intercompany pair | Bridge FAIL (F-003). Omitted pair stays in the management total (140 versus 125 when the pair is supplied). Statutory consolidation is false |

Overlapping server workers were not started. One repeated mutation id returned the same voucher (IDEMPOTENCY PASS). A 10 by 100 seed campaign was not run.
