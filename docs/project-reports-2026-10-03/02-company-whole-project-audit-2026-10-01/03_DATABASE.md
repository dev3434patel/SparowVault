# 03 — Database

Live probe this run: 34 `company_*` tables (`raw/EVIDENCE_DB_PROBE.txt`). Money remains BIGINT paise. Gate migration checksum **PASS**.

Destroy/restore drill **PASS** this stamp (`raw/EVIDENCE_BACKUP_RESTORE.txt`, exit 0, line `PASS backup_restore_checksum`). Source `sparowvault` was dumped (35 `company_*` tables, 4,715,641,937 bytes) into a recreated `sparowvault_cert_restore`. Pre and post counts matched. Posted debit and credit were both 13,201,610,426 paise (`tb_balanced=1`). The 10×10k voucher matrix **PASS** is recorded in `16_PERFORMANCE.md`.

**Status: PASS schema / PASS operational restore proof this stamp**
