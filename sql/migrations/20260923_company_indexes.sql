-- Additive indexes for company list/report performance.
-- Each index add is guarded with information_schema so a re-run does not fail.

SET @idx_cv_company_date := (
  SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'company_vouchers'
    AND INDEX_NAME = 'idx_cv_company_date'
);
SET @sql_cv_company_date := IF(
  @idx_cv_company_date = 0,
  'ALTER TABLE company_vouchers ADD INDEX idx_cv_company_date (company_id, voucher_date)',
  'SELECT 1'
);
PREPARE stmt_cv_company_date FROM @sql_cv_company_date;
EXECUTE stmt_cv_company_date;
DEALLOCATE PREPARE stmt_cv_company_date;

SET @idx_cv_company_status := (
  SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'company_vouchers'
    AND INDEX_NAME = 'idx_cv_company_status'
);
SET @sql_cv_company_status := IF(
  @idx_cv_company_status = 0,
  'ALTER TABLE company_vouchers ADD INDEX idx_cv_company_status (company_id, status)',
  'SELECT 1'
);
PREPARE stmt_cv_company_status FROM @sql_cv_company_status;
EXECUTE stmt_cv_company_status;
DEALLOCATE PREPARE stmt_cv_company_status;

SET @idx_cv_company_party := (
  SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'company_vouchers'
    AND INDEX_NAME = 'idx_cv_company_party'
);
SET @sql_cv_company_party := IF(
  @idx_cv_company_party = 0,
  'ALTER TABLE company_vouchers ADD INDEX idx_cv_company_party (company_id, party_id)',
  'SELECT 1'
);
PREPARE stmt_cv_company_party FROM @sql_cv_company_party;
EXECUTE stmt_cv_company_party;
DEALLOCATE PREPARE stmt_cv_company_party;

SET @idx_cvl_company_ledger := (
  SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'company_voucher_lines'
    AND INDEX_NAME = 'idx_cvl_company_ledger'
);
SET @sql_cvl_company_ledger := IF(
  @idx_cvl_company_ledger = 0,
  'ALTER TABLE company_voucher_lines ADD INDEX idx_cvl_company_ledger (company_id, ledger_id)',
  'SELECT 1'
);
PREPARE stmt_cvl_company_ledger FROM @sql_cvl_company_ledger;
EXECUTE stmt_cvl_company_ledger;
DEALLOCATE PREPARE stmt_cvl_company_ledger;

SET @idx_cbr_company_side_status := (
  SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'company_bill_refs'
    AND INDEX_NAME = 'idx_cbr_company_side_status'
);
SET @sql_cbr_company_side_status := IF(
  @idx_cbr_company_side_status = 0,
  'ALTER TABLE company_bill_refs ADD INDEX idx_cbr_company_side_status (company_id, side, status)',
  'SELECT 1'
);
PREPARE stmt_cbr_company_side_status FROM @sql_cbr_company_side_status;
EXECUTE stmt_cbr_company_side_status;
DEALLOCATE PREPARE stmt_cbr_company_side_status;

SET @idx_cp_company_name := (
  SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'company_parties'
    AND INDEX_NAME = 'idx_cp_company_name'
);
SET @sql_cp_company_name := IF(
  @idx_cp_company_name = 0,
  'ALTER TABLE company_parties ADD INDEX idx_cp_company_name (company_id, display_name)',
  'SELECT 1'
);
PREPARE stmt_cp_company_name FROM @sql_cp_company_name;
EXECUTE stmt_cp_company_name;
DEALLOCATE PREPARE stmt_cp_company_name;

SET @idx_cal_company_created := (
  SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'company_audit_logs'
    AND INDEX_NAME = 'idx_cal_company_created'
);
SET @sql_cal_company_created := IF(
  @idx_cal_company_created = 0,
  'ALTER TABLE company_audit_logs ADD INDEX idx_cal_company_created (company_id, created_at)',
  'SELECT 1'
);
PREPARE stmt_cal_company_created FROM @sql_cal_company_created;
EXECUTE stmt_cal_company_created;
DEALLOCATE PREPARE stmt_cal_company_created;
