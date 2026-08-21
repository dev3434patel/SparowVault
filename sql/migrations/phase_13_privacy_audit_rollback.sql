-- Phase 13 rollback.
-- WARNING: drops user_policy_acceptances and user_audit_logs in their entirety.

DELIMITER //
DROP PROCEDURE IF EXISTS sv_phase13_drop_column//
CREATE PROCEDURE sv_phase13_drop_column(IN tbl VARCHAR(64), IN col VARCHAR(64))
BEGIN
  DECLARE n INT DEFAULT 0;
  SELECT COUNT(*) INTO n FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = tbl AND COLUMN_NAME = col;
  IF n = 1 THEN
    SET @ddl = CONCAT('ALTER TABLE `', tbl, '` DROP COLUMN `', col, '`');
    PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;
  END IF;
END//
DELIMITER ;

CALL sv_phase13_drop_column('users', 'last_policy_check_at');
CALL sv_phase13_drop_column('users', 'mobile_e164');
CALL sv_phase13_drop_column('users', 'email_lc');

DROP TABLE IF EXISTS retention_jobs;
DROP TABLE IF EXISTS audit_logs;
DROP TABLE IF EXISTS user_audit_logs;
DROP TABLE IF EXISTS user_policy_acceptances;

DELETE FROM schema_version WHERE version_key = 'phase_13_privacy_audit_2026_05_13';
DROP PROCEDURE IF EXISTS sv_phase13_drop_column;
