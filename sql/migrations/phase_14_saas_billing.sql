-- =============================================================================
-- SparowVault — Phase 14 SaaS billing fairness
-- =============================================================================
-- Adds:
--   plan_prices       — historical pricing per plan + billing_interval
--   plan_features.limit_value / limit_unit — numeric quotas (max_transactions, etc.)
--   subscriptions.previous_period_end / renewed_from_subscription_id — early-renewal fairness
-- =============================================================================

CREATE TABLE IF NOT EXISTS plan_prices (
  id                BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  plan_id           BIGINT UNSIGNED NOT NULL,
  amount_paise      BIGINT UNSIGNED NOT NULL,
  currency          CHAR(3)         NOT NULL DEFAULT 'INR',
  billing_interval  ENUM('monthly','yearly') NOT NULL DEFAULT 'monthly',
  starts_at         DATETIME        NOT NULL,
  ends_at           DATETIME        NULL,
  notes             VARCHAR(255)    NULL,
  created_at        DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_pp_plan_starts (plan_id, starts_at),
  CONSTRAINT fk_pp_plan FOREIGN KEY (plan_id) REFERENCES plans(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Historical pricing per plan — pricing changes are append-only';

DELIMITER //
DROP PROCEDURE IF EXISTS sv_phase14_add_column//
CREATE PROCEDURE sv_phase14_add_column(IN tbl VARCHAR(64), IN col VARCHAR(64), IN spec VARCHAR(255))
BEGIN
  DECLARE n INT DEFAULT 0;
  SELECT COUNT(*) INTO n FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = tbl AND COLUMN_NAME = col;
  IF n = 0 THEN
    SET @ddl = CONCAT('ALTER TABLE `', tbl, '` ADD COLUMN `', col, '` ', spec);
    PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;
  END IF;
END//
DELIMITER ;

DELIMITER //
DROP PROCEDURE IF EXISTS sv_phase14_add_index//
CREATE PROCEDURE sv_phase14_add_index(IN tbl VARCHAR(64), IN idx VARCHAR(64), IN ddl TEXT)
BEGIN
  DECLARE n INT DEFAULT 0;
  SELECT COUNT(*) INTO n FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = tbl AND INDEX_NAME = idx;
  IF n = 0 THEN
    SET @ddl = ddl;
    PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;
  END IF;
END//
DELIMITER ;

-- Numeric quotas on plan_features (e.g. max_transactions_per_month = 500).
CALL sv_phase14_add_column('plan_features', 'limit_value', 'BIGINT NULL COMMENT "numeric quota (e.g. 500 transactions/month)"');
CALL sv_phase14_add_column('plan_features', 'limit_unit',  'VARCHAR(32) NULL COMMENT "per_month | per_day | total | mb | seconds"');

-- Payment ownership and idempotency constraints. NULL provider_payment_id values are allowed by MySQL unique indexes.
CALL sv_phase14_add_index(
  'payments', 'uq_pay_provider_order_id',
  'ALTER TABLE `payments` ADD UNIQUE KEY `uq_pay_provider_order_id` (`provider`, `provider_order_id`)'
);
CALL sv_phase14_add_index(
  'payments', 'uq_pay_provider_payment_id',
  'ALTER TABLE `payments` ADD UNIQUE KEY `uq_pay_provider_payment_id` (`provider`, `provider_payment_id`)'
);

-- Subscription audit + fair renewal tracking.
CALL sv_phase14_add_column('subscriptions', 'previous_period_end',          'DATETIME NULL COMMENT "for fair early renewal — extend from here, not NOW()"');
CALL sv_phase14_add_column('subscriptions', 'renewed_from_subscription_id', 'BIGINT UNSIGNED NULL COMMENT "FK-soft to prior subscription"');
CALL sv_phase14_add_column('subscriptions', 'scheduled_plan_id',            'BIGINT UNSIGNED NULL COMMENT "downgrade scheduled for next period"');
CALL sv_phase14_add_column('subscriptions', 'scheduled_change_at',          'DATETIME NULL COMMENT "when the scheduled plan change takes effect"');

DROP PROCEDURE IF EXISTS sv_phase14_add_column;
DROP PROCEDURE IF EXISTS sv_phase14_add_index;

INSERT IGNORE INTO schema_version (version_key) VALUES ('phase_14_saas_billing_2026_05_13');
