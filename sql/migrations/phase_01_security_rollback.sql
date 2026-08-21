-- =============================================================================
-- SparowVault — Phase 1 security migration (ROLLBACK)
-- =============================================================================
-- Undoes phase_01_security.sql. Safe to run multiple times.
--
-- WARNING: dropping users.deleted_at also drops every soft-delete record. If
-- you have already deleted users via /api/auth/account.php, run an export
-- before rolling back.
-- =============================================================================

DELIMITER //
DROP PROCEDURE IF EXISTS sv_phase1_drop_column//
CREATE PROCEDURE sv_phase1_drop_column(IN tbl VARCHAR(64), IN col VARCHAR(64))
BEGIN
  DECLARE n INT DEFAULT 0;
  SELECT COUNT(*) INTO n FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = tbl AND COLUMN_NAME = col;
  IF n = 1 THEN
    SET @ddl = CONCAT('ALTER TABLE `', tbl, '` DROP COLUMN `', col, '`');
    PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;
  END IF;
END//

DROP PROCEDURE IF EXISTS sv_phase1_drop_index//
CREATE PROCEDURE sv_phase1_drop_index(IN tbl VARCHAR(64), IN idx VARCHAR(64))
BEGIN
  DECLARE n INT DEFAULT 0;
  SELECT COUNT(*) INTO n FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = tbl AND INDEX_NAME = idx;
  IF n > 0 THEN
    SET @ddl = CONCAT('ALTER TABLE `', tbl, '` DROP INDEX `', idx, '`');
    PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;
  END IF;
END//
DELIMITER ;

CALL sv_phase1_drop_index('payments', 'uq_pay_provider_order_id');
CALL sv_phase1_drop_index('payments', 'uq_pay_provider_payment_id');
CALL sv_phase1_drop_index('users',    'idx_users_deleted');

CALL sv_phase1_drop_column('payments', 'expected_amount_paise');
-- Intentionally do NOT drop payments.currency — it predates Phase 1 in production_schema.sql.
CALL sv_phase1_drop_column('users', 'must_change_pin');
CALL sv_phase1_drop_column('users', 'deleted_reason');
CALL sv_phase1_drop_column('users', 'deleted_at');

DELETE FROM schema_version WHERE version_key = 'phase_01_security_2026_05_13';

DROP PROCEDURE IF EXISTS sv_phase1_drop_column;
DROP PROCEDURE IF EXISTS sv_phase1_drop_index;
