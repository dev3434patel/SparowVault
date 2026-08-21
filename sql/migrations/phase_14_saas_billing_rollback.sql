-- Phase 14 rollback.
DELIMITER //
DROP PROCEDURE IF EXISTS sv_phase14_drop_column//
CREATE PROCEDURE sv_phase14_drop_column(IN tbl VARCHAR(64), IN col VARCHAR(64))
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

DELIMITER //
DROP PROCEDURE IF EXISTS sv_phase14_drop_index//
CREATE PROCEDURE sv_phase14_drop_index(IN tbl VARCHAR(64), IN idx VARCHAR(64))
BEGIN
  DECLARE n INT DEFAULT 0;
  SELECT COUNT(*) INTO n FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = tbl AND INDEX_NAME = idx;
  IF n = 1 THEN
    SET @ddl = CONCAT('ALTER TABLE `', tbl, '` DROP INDEX `', idx, '`');
    PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;
  END IF;
END//
DELIMITER ;

CALL sv_phase14_drop_column('plan_features', 'limit_value');
CALL sv_phase14_drop_column('plan_features', 'limit_unit');
CALL sv_phase14_drop_column('subscriptions', 'previous_period_end');
CALL sv_phase14_drop_column('subscriptions', 'renewed_from_subscription_id');
CALL sv_phase14_drop_column('subscriptions', 'scheduled_plan_id');
CALL sv_phase14_drop_column('subscriptions', 'scheduled_change_at');
CALL sv_phase14_drop_index('payments', 'uq_pay_provider_payment_id');
CALL sv_phase14_drop_index('payments', 'uq_pay_provider_order_id');
DROP TABLE IF EXISTS plan_prices;
DELETE FROM schema_version WHERE version_key = 'phase_14_saas_billing_2026_05_13';
DROP PROCEDURE IF EXISTS sv_phase14_drop_column;
DROP PROCEDURE IF EXISTS sv_phase14_drop_index;
