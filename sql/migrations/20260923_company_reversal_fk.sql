-- Company voucher reversal / correction lineage FKs (Wave B #25)
-- Safe additive: self-references on company_vouchers.id (PK)
-- Index adds are guarded with information_schema so a re-run does not fail.

SET @idx_cv_reversed := (
  SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'company_vouchers'
    AND INDEX_NAME = 'idx_cv_reversed'
);
SET @sql_cv_reversed := IF(
  @idx_cv_reversed = 0,
  'ALTER TABLE company_vouchers ADD INDEX idx_cv_reversed (reversed_voucher_id)',
  'SELECT 1'
);
PREPARE stmt_cv_reversed FROM @sql_cv_reversed;
EXECUTE stmt_cv_reversed;
DEALLOCATE PREPARE stmt_cv_reversed;

SET @idx_cv_correction := (
  SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'company_vouchers'
    AND INDEX_NAME = 'idx_cv_correction'
);
SET @sql_cv_correction := IF(
  @idx_cv_correction = 0,
  'ALTER TABLE company_vouchers ADD INDEX idx_cv_correction (correction_of_voucher_id)',
  'SELECT 1'
);
PREPARE stmt_cv_correction FROM @sql_cv_correction;
EXECUTE stmt_cv_correction;
DEALLOCATE PREPARE stmt_cv_correction;

ALTER TABLE company_vouchers
  ADD CONSTRAINT fk_cv_reversed
    FOREIGN KEY (reversed_voucher_id) REFERENCES company_vouchers(id)
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE company_vouchers
  ADD CONSTRAINT fk_cv_correction
    FOREIGN KEY (correction_of_voucher_id) REFERENCES company_vouchers(id)
    ON DELETE SET NULL ON UPDATE CASCADE;
