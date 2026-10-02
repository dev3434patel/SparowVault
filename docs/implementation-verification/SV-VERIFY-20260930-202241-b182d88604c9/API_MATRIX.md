# API matrix

Company writes used `company_post_voucher` and the report runner on the disposable database. The script named http-e2e posts through those PHP functions in process. It exited 0. A socket-level login with a PIN was not performed, so the PIN is not in this evidence.

| Call | Database | Result |
| --- | --- | --- |
| Sale draft, promote, receipt | disposable test | Receivable 1180000, open 680000, sales credit 1000000 |
| Dimension payment | disposable test | Allocation sum 100000 |
| Payroll accrue and pay | disposable test | Expense 3180000, payable cleared |
| Six report keys | disposable test | Handlers returned |
| IDOR script | disposable test | Exit 0 |
| Export smoke | no database | Exit 0 |
| Package healthz | no credentials | HTTP 500 |
