# Export reconciliation

`php scripts/company/export-smoke.php` built a PDF (`%PDF` present, brand SparowVault Company) and a DOCX body. It did not read the verify-database trial balance, so it does not prove export totals match posted paise.

Posted figures that a later export would have to match:

| Event | Paise |
|---|---:|
| O07 sales credit | 1000000 |
| O07 tax credit | 180000 |
| O07 receipt | 500000 |
| O07 receivable net | 680000 |
| O10 salary debit | 3180000 |
| O09 item value stored | 600 (expected 60000) |

Backup pack code strips pin-like keys and refuses a server dump. Restore does not apply the pack (F-006). No export file from this run was diffed against those SQL totals.
