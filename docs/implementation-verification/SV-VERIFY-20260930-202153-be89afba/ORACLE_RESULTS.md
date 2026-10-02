# Oracle results

Rupees are converted at 100 paise per rupee. Disposable stores: IndexedDB name `sparowvault_verify_idb` (fake-indexeddb, deleted after the run) and MySQL `sparowvault_verify_test`. The configured application database was not reset.

| ID | Result | Paise / count |
|---|---|---|
| O01 | PASS | difference 0 |
| O02 | PASS | difference 0 |
| O03 | PASS | difference 0 |
| O04 | PASS | see JSON |
| O05 | PASS | see JSON |
| O06 | PASS | difference 0 |
| HOUSEHOLD | PASS | see JSON |
| ALERTS64 | PASS | see JSON |
| O07 | PASS | difference 0 |
| O08 | PASS | difference 0 |
| O09 | FAIL | difference -59400 |
| O10 | PASS | difference 0 |
| O11 | PASS | see JSON |
| O12 | FAIL | difference 100000 |
| O13 | PASS | see JSON |
| AUTH | FAIL | see JSON |
| REPORTS6 | PASS | see JSON |
| IDEMPOTENCY | PASS | see JSON |

O09 stored stock value 600 and COGS 400. The paise expectation for a buy of 10 at Rs 100 and a sale of 4 at Rs 150 is value 60000 and COGS 40000. No voucher was added.
O12 wrote a link plan of 100000 and added 0 vouchers and 0 personal rows.
AUTH in the first JSON flags openingDenied false because the viewer was rejected for create_journal before the opening-balance sentence. A later manager probe, with create_journal and without manage_opening_balances, was rejected with that permission name. Bob created 0 vouchers. Foreign-company sale rows were 0. A stale preview hash was rejected. A valid synthetic PIN was accepted only as a PIN check, not as a permission.
