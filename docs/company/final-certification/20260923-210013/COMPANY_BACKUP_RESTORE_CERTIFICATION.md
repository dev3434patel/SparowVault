# Company Backup → Destroy → Restore Certification

**Run:** `20260923-210013`  
**Evidence:** `raw/EVIDENCE_COMPANY_BACKUP_RESTORE.txt`  
**Dump file:** `raw/company_backup_20260923_153541.sql`

## Scope

Isolated **TEST** database only: `sparowvault_cert_restore`.  
Source: `sparowvault` company_* tables via production-supported `mysqldump`.

## Commands (recorded)

```text
DUMP: mysqldump -h127.0.0.1 -uroot --single-transaction sparowvault <company_* tables>
RESTORE: mysql -h127.0.0.1 -uroot sparowvault_cert_restore < dump.sql
```

## Results

| Metric | Pre-backup | Post-restore |
|--------|------------|--------------|
| company_workspaces | 239 | 239 |
| company_parties | 9561 | 9561 |
| company_vouchers | 77812 | 77812 |
| company_voucher_lines | 155671 | 155671 |
| company_bill_refs | 240 | 240 |
| company_bill_allocations | 212 | 212 |
| posted_debit_paise | 5898829615 | 5898829615 |
| posted_credit_paise | 5898829615 | 5898829615 |
| tb_balanced | 1 | 1 |

- **Dump size:** 367,099,452 bytes  
- **SHA256:** `6d9659392ec834102cb11240272947b291a7dec9b0adc630b5f4b170935f6217`  
- **Destroy step:** DROP/recreate `sparowvault_cert_restore` then restore  
- **Verdict:** **PASS** (`PASS backup_restore_checksum`)

## Notes

- Never executed against production.  
- Checksum equality required for certification; met.
