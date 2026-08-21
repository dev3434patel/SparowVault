-- =============================================================================
-- SparowVault — Phase 1 security migration (FORWARD)
-- =============================================================================
-- Idempotent: every change is guarded so re-runs are safe.
-- Applies the following changes:
--   D1  payments.expected_amount_paise BIGINT UNSIGNED NULL
--   D1  payments.currency VARCHAR(10) NOT NULL DEFAULT 'INR'   (already exists in production_schema; guarded)
--   D3  UNIQUE(provider, provider_order_id) on payments
--   D3  UNIQUE(provider, provider_payment_id) on payments
--   F   users.must_change_pin TINYINT(1) NOT NULL DEFAULT 0
--   E   users.deleted_at DATETIME NULL  (soft-delete support for account deletion)
--   E   users.deleted_reason VARCHAR(120) NULL
--   metadata: schema_version row
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Idempotency helper — MySQL < 8 lacks ADD COLUMN IF NOT EXISTS, so we use a
-- prepared statement that checks information_schema.
-- ---------------------------------------------------------------------------
DELIMITER //

DROP PROCEDURE IF EXISTS sv_phase1_add_column//
CREATE PROCEDURE sv_phase1_add_column(
  IN tbl       VARCHAR(64),
  IN col       VARCHAR(64),
  IN spec      VARCHAR(255)
)
BEGIN
  DECLARE n INT DEFAULT 0;
  SELECT COUNT(*) INTO n FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = tbl AND COLUMN_NAME = col;
  IF n = 0 THEN
    SET @ddl = CONCAT('ALTER TABLE `', tbl, '` ADD COLUMN `', col, '` ', spec);
    PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;
  END IF;
END//

DROP PROCEDURE IF EXISTS sv_phase1_add_index//
CREATE PROCEDURE sv_phase1_add_index(
  IN tbl       VARCHAR(64),
  IN idx       VARCHAR(64),
  IN ddl       VARCHAR(1024)
)
BEGIN
  DECLARE n INT DEFAULT 0;
  SELECT COUNT(*) INTO n FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = tbl AND INDEX_NAME = idx;
  IF n = 0 THEN
    PREPARE stmt FROM ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;
  END IF;
END//

DELIMITER ;

-- ---------------------------------------------------------------------------
-- D1: payments.expected_amount_paise + currency
-- ---------------------------------------------------------------------------
CALL sv_phase1_add_column(
  'payments',
  'expected_amount_paise',
  'BIGINT UNSIGNED NULL COMMENT "amount in paise at order creation; used to validate the captured event"'
);

-- payments.currency already exists in production_schema; only added here for
-- environments seeded from older SQL files.
CALL sv_phase1_add_column(
  'payments',
  'currency',
  'VARCHAR(10) NOT NULL DEFAULT "INR"'
);

-- ---------------------------------------------------------------------------
-- D3: unique indexes preventing duplicate order/payment IDs across provider
--     The (provider, *) composite means we can later add a non-Razorpay
--     provider without losing the constraint.
--     Existing rows with NULL provider_payment_id are tolerated — NULLs do
--     not collide in MySQL unique indexes.
-- ---------------------------------------------------------------------------
CALL sv_phase1_add_index(
  'payments', 'uq_pay_provider_order_id',
  'ALTER TABLE `payments` ADD UNIQUE KEY `uq_pay_provider_order_id` (`provider`, `provider_order_id`)'
);

CALL sv_phase1_add_index(
  'payments', 'uq_pay_provider_payment_id',
  'ALTER TABLE `payments` ADD UNIQUE KEY `uq_pay_provider_payment_id` (`provider`, `provider_payment_id`)'
);

-- ---------------------------------------------------------------------------
-- F: users.must_change_pin
-- ---------------------------------------------------------------------------
CALL sv_phase1_add_column(
  'users',
  'must_change_pin',
  'TINYINT(1) NOT NULL DEFAULT 0 COMMENT "set to 1 by admin-seed scripts; client must force a PIN change before any other admin action"'
);

-- ---------------------------------------------------------------------------
-- E: users.deleted_at + users.deleted_reason — soft-delete for self-service
--    account deletion. Hard delete still happens via FK cascade if the row
--    is removed; soft-delete is preferred so admins can audit the action.
-- ---------------------------------------------------------------------------
CALL sv_phase1_add_column(
  'users',
  'deleted_at',
  'DATETIME NULL COMMENT "self-service or admin soft-delete timestamp"'
);
CALL sv_phase1_add_column(
  'users',
  'deleted_reason',
  'VARCHAR(120) NULL COMMENT "self|admin|abuse|inactive — for audit"'
);

CALL sv_phase1_add_index(
  'users', 'idx_users_deleted',
  'ALTER TABLE `users` ADD KEY `idx_users_deleted` (`deleted_at`)'
);

-- ---------------------------------------------------------------------------
-- schema_version bookkeeping. Table is created if missing so the migration
-- self-bootstraps in older environments.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS schema_version (
  version_key VARCHAR(64) PRIMARY KEY,
  applied_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO schema_version (version_key) VALUES ('phase_01_security_2026_05_13');

-- ---------------------------------------------------------------------------
-- Cleanup helpers — keep the install tidy.
-- ---------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sv_phase1_add_column;
DROP PROCEDURE IF EXISTS sv_phase1_add_index;
