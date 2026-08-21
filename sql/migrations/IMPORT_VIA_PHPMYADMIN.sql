-- =============================================================================
-- SparowVault — ALL PHASES, optimised for phpMyAdmin import
-- =============================================================================
-- Target database : moneydata  (or whichever you select in phpMyAdmin)
-- Safe to re-run  : YES. Every CREATE / ALTER / INDEX is guarded.
-- Data loss risk  : NONE. No DROP TABLE on any table you already have.
--                   Only ADD COLUMN / ADD INDEX / CREATE TABLE IF NOT EXISTS.
--
-- Tables this script TOUCHES (adds columns + indexes; rows preserved):
--    users, payments, subscriptions, plan_features, cloud_collection_rows
--
-- Tables this script CREATES if missing (no-op if already present):
--    financial_events, financial_effects, user_credit_cards,
--    user_loans, user_loan_payments,
--    udhari_people, udhari_entries, udhari_settlements,
--    ai_suggestions,
--    user_policy_acceptances, user_audit_logs, retention_jobs,
--    plan_prices, schema_version
--
-- Tables this script LEAVES ALONE (you keep them as-is):
--    api_rate_limits, app_settings, audit_logs, cloud_users,
--    feature_flags_global, login_attempts, plans,
--    user_security_recovery, webhook_events
--
-- After import, run this to see what's now applied:
--    SELECT version_key, applied_at FROM schema_version
--     WHERE version_key LIKE 'phase_%' ORDER BY applied_at;
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 0. Bookkeeping table
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS schema_version (
  version_key VARCHAR(64) PRIMARY KEY,
  applied_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- =============================================================================
-- PHASE 1 — Security columns + unique indexes
-- =============================================================================

-- payments.expected_amount_paise -----------------------------------------------
SET @col := (SELECT COUNT(*) FROM information_schema.COLUMNS
              WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'payments' AND COLUMN_NAME = 'expected_amount_paise');
SET @sql := IF(@col = 0,
  'ALTER TABLE `payments` ADD COLUMN `expected_amount_paise` BIGINT UNSIGNED NULL COMMENT "amount in paise at order creation"',
  'DO 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- payments.captured_amount_paise -----------------------------------------------
SET @col := (SELECT COUNT(*) FROM information_schema.COLUMNS
              WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'payments' AND COLUMN_NAME = 'captured_amount_paise');
SET @sql := IF(@col = 0,
  'ALTER TABLE `payments` ADD COLUMN `captured_amount_paise` BIGINT UNSIGNED NULL COMMENT "validated captured payment amount in paise"',
  'DO 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- payments.currency ------------------------------------------------------------
SET @col := (SELECT COUNT(*) FROM information_schema.COLUMNS
              WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'payments' AND COLUMN_NAME = 'currency');
SET @sql := IF(@col = 0,
  'ALTER TABLE `payments` ADD COLUMN `currency` VARCHAR(10) NOT NULL DEFAULT "INR"',
  'DO 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- payments: unique (provider, provider_order_id) -------------------------------
SET @idx := (SELECT COUNT(*) FROM information_schema.STATISTICS
              WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'payments' AND INDEX_NAME = 'uq_pay_provider_order_id');
SET @sql := IF(@idx = 0,
  'ALTER TABLE `payments` ADD UNIQUE KEY `uq_pay_provider_order_id` (`provider`, `provider_order_id`)',
  'DO 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- payments: unique (provider, provider_payment_id) -----------------------------
SET @idx := (SELECT COUNT(*) FROM information_schema.STATISTICS
              WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'payments' AND INDEX_NAME = 'uq_pay_provider_payment_id');
SET @sql := IF(@idx = 0,
  'ALTER TABLE `payments` ADD UNIQUE KEY `uq_pay_provider_payment_id` (`provider`, `provider_payment_id`)',
  'DO 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- users.must_change_pin --------------------------------------------------------
SET @col := (SELECT COUNT(*) FROM information_schema.COLUMNS
              WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'must_change_pin');
SET @sql := IF(@col = 0,
  'ALTER TABLE `users` ADD COLUMN `must_change_pin` TINYINT(1) NOT NULL DEFAULT 0 COMMENT "force PIN change on first admin action"',
  'DO 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- users.deleted_at -------------------------------------------------------------
SET @col := (SELECT COUNT(*) FROM information_schema.COLUMNS
              WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'deleted_at');
SET @sql := IF(@col = 0,
  'ALTER TABLE `users` ADD COLUMN `deleted_at` DATETIME NULL COMMENT "soft-delete timestamp"',
  'DO 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- users.deleted_reason ---------------------------------------------------------
SET @col := (SELECT COUNT(*) FROM information_schema.COLUMNS
              WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'deleted_reason');
SET @sql := IF(@col = 0,
  'ALTER TABLE `users` ADD COLUMN `deleted_reason` VARCHAR(120) NULL COMMENT "self|admin|abuse|inactive"',
  'DO 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- users: index on deleted_at ---------------------------------------------------
SET @idx := (SELECT COUNT(*) FROM information_schema.STATISTICS
              WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND INDEX_NAME = 'idx_users_deleted');
SET @sql := IF(@idx = 0,
  'ALTER TABLE `users` ADD KEY `idx_users_deleted` (`deleted_at`)',
  'DO 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

INSERT IGNORE INTO schema_version (version_key) VALUES ('phase_01_security_2026_05_13');


-- =============================================================================
-- PHASE 3 — Paise on cloud_collection_rows
-- =============================================================================
SET @col := (SELECT COUNT(*) FROM information_schema.COLUMNS
              WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'cloud_collection_rows' AND COLUMN_NAME = 'amount_paise');
SET @sql := IF(@col = 0,
  'ALTER TABLE `cloud_collection_rows` ADD COLUMN `amount_paise` BIGINT NULL COMMENT "primary monetary amount in paise"',
  'DO 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

INSERT IGNORE INTO schema_version (version_key) VALUES ('phase_03_cloud_amount_paise_2026_05_13');


-- =============================================================================
-- PHASE 4 — Indexed sync hot columns on cloud_collection_rows
-- =============================================================================

-- schema_version column -------------------------------------------------------
SET @col := (SELECT COUNT(*) FROM information_schema.COLUMNS
              WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'cloud_collection_rows' AND COLUMN_NAME = 'schema_version');
SET @sql := IF(@col = 0,
  'ALTER TABLE `cloud_collection_rows` ADD COLUMN `schema_version` INT NOT NULL DEFAULT 1 COMMENT "payload schema / client version"',
  'DO 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- txn_local_date --------------------------------------------------------------
SET @col := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'cloud_collection_rows' AND COLUMN_NAME = 'txn_local_date');
SET @sql := IF(@col = 0, 'ALTER TABLE `cloud_collection_rows` ADD COLUMN `txn_local_date` DATE NULL', 'DO 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- txn_month -------------------------------------------------------------------
SET @col := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'cloud_collection_rows' AND COLUMN_NAME = 'txn_month');
SET @sql := IF(@col = 0, 'ALTER TABLE `cloud_collection_rows` ADD COLUMN `txn_month` CHAR(7) NULL', 'DO 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- txn_type --------------------------------------------------------------------
SET @col := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'cloud_collection_rows' AND COLUMN_NAME = 'txn_type');
SET @sql := IF(@col = 0, 'ALTER TABLE `cloud_collection_rows` ADD COLUMN `txn_type` VARCHAR(32) NULL', 'DO 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- payment_mode ----------------------------------------------------------------
SET @col := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'cloud_collection_rows' AND COLUMN_NAME = 'payment_mode');
SET @sql := IF(@col = 0, 'ALTER TABLE `cloud_collection_rows` ADD COLUMN `payment_mode` VARCHAR(32) NULL', 'DO 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- category_id -----------------------------------------------------------------
SET @col := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'cloud_collection_rows' AND COLUMN_NAME = 'category_id');
SET @sql := IF(@col = 0, 'ALTER TABLE `cloud_collection_rows` ADD COLUMN `category_id` VARCHAR(191) NULL', 'DO 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- account_id ------------------------------------------------------------------
SET @col := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'cloud_collection_rows' AND COLUMN_NAME = 'account_id');
SET @sql := IF(@col = 0, 'ALTER TABLE `cloud_collection_rows` ADD COLUMN `account_id` VARCHAR(191) NULL', 'DO 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- card_id ---------------------------------------------------------------------
SET @col := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'cloud_collection_rows' AND COLUMN_NAME = 'card_id');
SET @sql := IF(@col = 0, 'ALTER TABLE `cloud_collection_rows` ADD COLUMN `card_id` VARCHAR(191) NULL', 'DO 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- loan_id ---------------------------------------------------------------------
SET @col := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'cloud_collection_rows' AND COLUMN_NAME = 'loan_id');
SET @sql := IF(@col = 0, 'ALTER TABLE `cloud_collection_rows` ADD COLUMN `loan_id` VARCHAR(191) NULL', 'DO 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- goal_id ---------------------------------------------------------------------
SET @col := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'cloud_collection_rows' AND COLUMN_NAME = 'goal_id');
SET @sql := IF(@col = 0, 'ALTER TABLE `cloud_collection_rows` ADD COLUMN `goal_id` VARCHAR(191) NULL', 'DO 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- udhari_id -------------------------------------------------------------------
SET @col := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'cloud_collection_rows' AND COLUMN_NAME = 'udhari_id');
SET @sql := IF(@col = 0, 'ALTER TABLE `cloud_collection_rows` ADD COLUMN `udhari_id` VARCHAR(191) NULL', 'DO 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- business_or_personal --------------------------------------------------------
SET @col := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'cloud_collection_rows' AND COLUMN_NAME = 'business_or_personal');
SET @sql := IF(@col = 0, 'ALTER TABLE `cloud_collection_rows` ADD COLUMN `business_or_personal` VARCHAR(32) NULL', 'DO 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- source_device_id ------------------------------------------------------------
SET @col := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'cloud_collection_rows' AND COLUMN_NAME = 'source_device_id');
SET @sql := IF(@col = 0, 'ALTER TABLE `cloud_collection_rows` ADD COLUMN `source_device_id` VARCHAR(191) NULL', 'DO 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- payload_hash ----------------------------------------------------------------
SET @col := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'cloud_collection_rows' AND COLUMN_NAME = 'payload_hash');
SET @sql := IF(@col = 0, 'ALTER TABLE `cloud_collection_rows` ADD COLUMN `payload_hash` CHAR(64) NULL COMMENT "SHA-256 hex of payload JSON"', 'DO 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Phase 4 indexes -------------------------------------------------------------
SET @idx := (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'cloud_collection_rows' AND INDEX_NAME = 'idx_ccr_uid_coll_txn_date');
SET @sql := IF(@idx = 0, 'ALTER TABLE `cloud_collection_rows` ADD KEY `idx_ccr_uid_coll_txn_date` (`user_id`, `collection_name`, `txn_local_date`)', 'DO 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @idx := (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'cloud_collection_rows' AND INDEX_NAME = 'idx_ccr_uid_cat_month');
SET @sql := IF(@idx = 0, 'ALTER TABLE `cloud_collection_rows` ADD KEY `idx_ccr_uid_cat_month` (`user_id`, `category_id`, `txn_month`)', 'DO 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @idx := (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'cloud_collection_rows' AND INDEX_NAME = 'idx_ccr_uid_card_txn_date');
SET @sql := IF(@idx = 0, 'ALTER TABLE `cloud_collection_rows` ADD KEY `idx_ccr_uid_card_txn_date` (`user_id`, `card_id`, `txn_local_date`)', 'DO 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @idx := (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'cloud_collection_rows' AND INDEX_NAME = 'idx_ccr_uid_loan_txn_date');
SET @sql := IF(@idx = 0, 'ALTER TABLE `cloud_collection_rows` ADD KEY `idx_ccr_uid_loan_txn_date` (`user_id`, `loan_id`, `txn_local_date`)', 'DO 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @idx := (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'cloud_collection_rows' AND INDEX_NAME = 'idx_ccr_uid_goal_txn_date');
SET @sql := IF(@idx = 0, 'ALTER TABLE `cloud_collection_rows` ADD KEY `idx_ccr_uid_goal_txn_date` (`user_id`, `goal_id`, `txn_local_date`)', 'DO 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @idx := (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'cloud_collection_rows' AND INDEX_NAME = 'idx_ccr_uid_amount_paise');
SET @sql := IF(@idx = 0, 'ALTER TABLE `cloud_collection_rows` ADD KEY `idx_ccr_uid_amount_paise` (`user_id`, `amount_paise`)', 'DO 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

INSERT IGNORE INTO schema_version (version_key) VALUES ('phase_04_indexed_sync_fields_2026_05_13');


-- =============================================================================
-- PHASE 5 — Financial event/effect ledger (new tables)
-- =============================================================================
CREATE TABLE IF NOT EXISTS financial_events (
  id                     VARCHAR(191)  NOT NULL,
  user_id                VARCHAR(191)  NOT NULL,
  source_transaction_id  VARCHAR(191)  NOT NULL,
  event_type             VARCHAR(64)   NOT NULL,
  event_date             DATE          NOT NULL,
  amount_paise           BIGINT        NOT NULL,
  currency               CHAR(3)       NOT NULL DEFAULT 'INR',
  description            VARCHAR(512)  NOT NULL DEFAULT '',
  source                 VARCHAR(32)   NOT NULL DEFAULT 'transaction',
  status                 VARCHAR(32)   NOT NULL DEFAULT 'posted',
  reversal_of_event_id   VARCHAR(191)  NULL,
  created_at             DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at             DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at             DATETIME      NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_fin_event_txn (user_id, source_transaction_id),
  KEY idx_fin_ev_user_date (user_id, event_date),
  KEY idx_fin_ev_user_status (user_id, status),
  CONSTRAINT fk_fin_ev_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS financial_effects (
  id               VARCHAR(191)  NOT NULL,
  event_id         VARCHAR(191)  NOT NULL,
  user_id          VARCHAR(191)  NOT NULL,
  target_type      VARCHAR(32)   NOT NULL,
  target_id        VARCHAR(191)  NOT NULL,
  effect_direction ENUM('increase','decrease') NOT NULL,
  amount_paise     BIGINT        NOT NULL,
  component        VARCHAR(32)   NOT NULL,
  created_at       DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_fin_ef_event (event_id),
  KEY idx_fin_ef_user_target (user_id, target_type, target_id),
  CONSTRAINT fk_fin_ef_event FOREIGN KEY (event_id) REFERENCES financial_events(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_fin_ef_user  FOREIGN KEY (user_id)  REFERENCES users(id)            ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO schema_version (version_key) VALUES ('phase_05_financial_ledger_2026_05_13');


-- =============================================================================
-- PHASE 7 — Credit-card shadow
-- =============================================================================
CREATE TABLE IF NOT EXISTS user_credit_cards (
  id                         VARCHAR(191)  NOT NULL,
  user_id                    VARCHAR(191)  NOT NULL,
  card_name                  VARCHAR(120)  NOT NULL DEFAULT '',
  issuer_name                VARCHAR(120)  NOT NULL DEFAULT '',
  last4                      CHAR(4)       NOT NULL DEFAULT '',
  credit_limit_paise         BIGINT        NOT NULL DEFAULT 0,
  current_outstanding_paise  BIGINT        NOT NULL DEFAULT 0,
  unbilled_amount_paise      BIGINT        NOT NULL DEFAULT 0,
  statement_balance_paise    BIGINT        NOT NULL DEFAULT 0,
  minimum_due_paise          BIGINT        NOT NULL DEFAULT 0,
  statement_day              TINYINT UNSIGNED NOT NULL DEFAULT 1,
  due_day                    TINYINT UNSIGNED NOT NULL DEFAULT 15,
  last_statement_date        DATE          NULL,
  next_due_date              DATE          NULL,
  interest_rate_bps          INT UNSIGNED  NOT NULL DEFAULT 0,
  annual_fee_paise           BIGINT        NOT NULL DEFAULT 0,
  is_active                  TINYINT(1)    NOT NULL DEFAULT 1,
  deleted_at                 DATETIME      NULL,
  created_at                 DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at                 DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_user_cc_user_active (user_id, is_active, deleted_at),
  CONSTRAINT fk_user_cc_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO schema_version (version_key) VALUES ('phase_07_user_credit_cards_2026_05_13');


-- =============================================================================
-- PHASE 8 — Loan shadow + EMI payment ledger
-- =============================================================================
CREATE TABLE IF NOT EXISTS user_loans (
  id                           VARCHAR(191)  NOT NULL,
  user_id                      VARCHAR(191)  NOT NULL,
  loan_name                    VARCHAR(120)  NOT NULL DEFAULT '',
  lender_name                  VARCHAR(120)  NOT NULL DEFAULT '',
  loan_type                    VARCHAR(32)   NOT NULL DEFAULT 'personal',
  principal_sanctioned_paise   BIGINT        NOT NULL DEFAULT 0,
  disbursed_amount_paise       BIGINT        NOT NULL DEFAULT 0,
  current_principal_paise      BIGINT        NOT NULL DEFAULT 0,
  annual_interest_bps          INT UNSIGNED  NOT NULL DEFAULT 0,
  interest_type                VARCHAR(32)   NOT NULL DEFAULT 'reducing_balance',
  emi_amount_paise             BIGINT        NOT NULL DEFAULT 0,
  original_tenure_months       INT UNSIGNED  NOT NULL DEFAULT 0,
  remaining_tenure_months      INT UNSIGNED  NOT NULL DEFAULT 0,
  start_date                   DATE          NULL,
  first_emi_date               DATE          NULL,
  due_day                      TINYINT UNSIGNED NOT NULL DEFAULT 1,
  processing_fee_paise         BIGINT        NOT NULL DEFAULT 0,
  insurance_fee_paise          BIGINT        NOT NULL DEFAULT 0,
  prepayment_allowed           TINYINT(1)    NOT NULL DEFAULT 1,
  foreclosure_charge_bps       INT UNSIGNED  NOT NULL DEFAULT 0,
  status                       VARCHAR(32)   NOT NULL DEFAULT 'active',
  lifecycle_mode               VARCHAR(32)   NOT NULL DEFAULT 'fresh',
  deleted_at                   DATETIME      NULL,
  created_at                   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at                   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_user_loans_user (user_id, status, deleted_at),
  CONSTRAINT fk_user_loans_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_loan_payments (
  id                           VARCHAR(191)  NOT NULL,
  user_id                      VARCHAR(191)  NOT NULL,
  loan_id                      VARCHAR(191)  NOT NULL,
  due_month                    CHAR(7)       NOT NULL,
  due_date                     DATE          NOT NULL,
  paid_date                    DATE          NULL,
  scheduled_emi_paise          BIGINT        NOT NULL DEFAULT 0,
  actual_paid_paise            BIGINT        NOT NULL DEFAULT 0,
  principal_component_paise    BIGINT        NOT NULL DEFAULT 0,
  interest_component_paise     BIGINT        NOT NULL DEFAULT 0,
  penalty_paise                BIGINT        NOT NULL DEFAULT 0,
  fee_paise                    BIGINT        NOT NULL DEFAULT 0,
  extra_principal_paise        BIGINT        NOT NULL DEFAULT 0,
  opening_principal_paise      BIGINT        NOT NULL DEFAULT 0,
  closing_principal_paise      BIGINT        NOT NULL DEFAULT 0,
  status                       VARCHAR(32)   NOT NULL DEFAULT 'due',
  created_at                   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at                   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_user_loan_pay_loan (loan_id, due_month),
  KEY idx_user_loan_pay_user (user_id),
  CONSTRAINT fk_user_loan_pay_user FOREIGN KEY (user_id) REFERENCES users(id)         ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_user_loan_pay_loan FOREIGN KEY (loan_id) REFERENCES user_loans(id)    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO schema_version (version_key) VALUES ('phase_08_user_loans_2026_05_13');


-- =============================================================================
-- PHASE 9 — Udhari engine
-- =============================================================================
CREATE TABLE IF NOT EXISTS udhari_people (
  id                        VARCHAR(191)  NOT NULL,
  user_id                   VARCHAR(191)  NOT NULL,
  display_name              VARCHAR(120)  NOT NULL DEFAULT '',
  phone_hash                VARCHAR(128)  NOT NULL DEFAULT '',
  relationship              VARCHAR(64)   NOT NULL DEFAULT 'other',
  total_receivable_paise    BIGINT        NOT NULL DEFAULT 0,
  total_payable_paise       BIGINT        NOT NULL DEFAULT 0,
  risk_level                VARCHAR(32)   NOT NULL DEFAULT 'ok',
  created_at                DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at                DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at                DATETIME      NULL,
  PRIMARY KEY (id),
  KEY idx_udhari_people_user (user_id, deleted_at),
  CONSTRAINT fk_udhari_people_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS udhari_entries (
  id                        VARCHAR(191)  NOT NULL,
  user_id                   VARCHAR(191)  NOT NULL,
  person_id                 VARCHAR(191)  NOT NULL,
  direction                 ENUM('given','received') NOT NULL,
  amount_paise              BIGINT        NOT NULL DEFAULT 0,
  due_date                  DATE          NULL,
  settlement_status         VARCHAR(32)   NOT NULL DEFAULT 'open',
  notes                     VARCHAR(500)  NOT NULL DEFAULT '',
  linked_transaction_id     VARCHAR(191)  NULL,
  created_at                DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_udhari_ent_user (user_id, person_id, settlement_status),
  KEY idx_udhari_ent_person (person_id),
  CONSTRAINT fk_udhari_ent_user   FOREIGN KEY (user_id)   REFERENCES users(id)         ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_udhari_ent_person FOREIGN KEY (person_id) REFERENCES udhari_people(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS udhari_settlements (
  id                        VARCHAR(191)  NOT NULL,
  user_id                   VARCHAR(191)  NOT NULL,
  person_id                 VARCHAR(191)  NOT NULL,
  udhari_entry_id           VARCHAR(191)  NOT NULL,
  amount_paise              BIGINT        NOT NULL DEFAULT 0,
  settlement_date           DATE          NOT NULL,
  account_id                VARCHAR(191)  NULL,
  notes                     VARCHAR(500)  NOT NULL DEFAULT '',
  created_at                DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_udhari_set_entry (udhari_entry_id, settlement_date),
  KEY idx_udhari_set_user (user_id),
  CONSTRAINT fk_udhari_set_user   FOREIGN KEY (user_id)         REFERENCES users(id)           ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_udhari_set_person FOREIGN KEY (person_id)       REFERENCES udhari_people(id)   ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_udhari_set_entry  FOREIGN KEY (udhari_entry_id) REFERENCES udhari_entries(id)  ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO schema_version (version_key) VALUES ('phase_09_udhari_engine_2026_05_13');


-- =============================================================================
-- PHASE 11 — AI suggestion shadow
-- =============================================================================
CREATE TABLE IF NOT EXISTS ai_suggestions (
  id                        VARCHAR(191)  NOT NULL,
  user_id                   VARCHAR(191)  NOT NULL,
  dedupe_key                VARCHAR(191)  NOT NULL DEFAULT '',
  suggestion_type           VARCHAR(32)   NOT NULL,
  severity                  VARCHAR(16)   NOT NULL DEFAULT 'info',
  title                     VARCHAR(200)  NOT NULL DEFAULT '',
  reason                    VARCHAR(2000) NOT NULL DEFAULT '',
  calculation_inputs_json   JSON          NOT NULL,
  recommended_action        VARCHAR(500)  NOT NULL DEFAULT '',
  expected_impact_json      JSON          NULL,
  confidence_score          DECIMAL(4,3)  NOT NULL DEFAULT 0.700,
  source_module             VARCHAR(64)   NOT NULL DEFAULT 'suggestionEngine.v1',
  status                    VARCHAR(24)   NOT NULL DEFAULT 'active',
  ai_explanation            VARCHAR(2000) NULL,
  remind_at                 DATETIME      NULL,
  expires_at                DATETIME      NOT NULL,
  created_at                DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at                DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at                DATETIME      NULL,
  PRIMARY KEY (id),
  KEY idx_ai_sug_user_status (user_id, status, deleted_at),
  KEY idx_ai_sug_user_dedupe (user_id, dedupe_key),
  CONSTRAINT fk_ai_suggestions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO schema_version (version_key) VALUES ('phase_11_ai_suggestions_2026_05_13');


-- =============================================================================
-- PHASE 13 — Privacy / audit / retention
-- =============================================================================
CREATE TABLE IF NOT EXISTS user_policy_acceptances (
  id           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id      VARCHAR(191)    NOT NULL,
  policy_key   VARCHAR(64)     NOT NULL,
  version      VARCHAR(32)     NOT NULL,
  accepted_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ip_address   VARCHAR(64)     NOT NULL DEFAULT '',
  user_agent   VARCHAR(512)    NOT NULL DEFAULT '',
  withdrawn_at DATETIME        NULL,
  created_at   DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_user_policy_version (user_id, policy_key, version),
  KEY idx_upa_user (user_id, policy_key),
  CONSTRAINT fk_upa_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_audit_logs (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id       VARCHAR(191)    NOT NULL,
  action_key    VARCHAR(191)    NOT NULL,
  entity_type   VARCHAR(191)    NOT NULL DEFAULT '',
  entity_id     VARCHAR(191)    NOT NULL DEFAULT '',
  before_json   LONGTEXT        NULL,
  after_json    LONGTEXT        NULL,
  ip_address    VARCHAR(64)     NOT NULL DEFAULT '',
  user_agent    VARCHAR(512)    NOT NULL DEFAULT '',
  request_id    VARCHAR(64)     NOT NULL DEFAULT '',
  created_at    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_ual_user_time (user_id, created_at),
  KEY idx_ual_action    (action_key),
  KEY idx_ual_entity    (entity_type, entity_id),
  CONSTRAINT fk_ual_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS retention_jobs (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  job_key         VARCHAR(64)     NOT NULL,
  started_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  finished_at     DATETIME        NULL,
  rows_swept      INT             NOT NULL DEFAULT 0,
  status          ENUM('running','ok','failed') NOT NULL DEFAULT 'running',
  error_message   TEXT            NULL,
  notes_json      LONGTEXT        NULL,
  PRIMARY KEY (id),
  KEY idx_ret_jobs_job_time (job_key, started_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- users.last_policy_check_at --------------------------------------------------
SET @col := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'last_policy_check_at');
SET @sql := IF(@col = 0, 'ALTER TABLE `users` ADD COLUMN `last_policy_check_at` DATETIME NULL COMMENT "policy versions last checked on login"', 'DO 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- users.mobile_e164 ----------------------------------------------------------
SET @col := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'mobile_e164');
SET @sql := IF(@col = 0, 'ALTER TABLE `users` ADD COLUMN `mobile_e164` VARCHAR(20) NULL COMMENT "PII — encrypt at app layer"', 'DO 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- users.email_lc -------------------------------------------------------------
SET @col := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'email_lc');
SET @sql := IF(@col = 0, 'ALTER TABLE `users` ADD COLUMN `email_lc` VARCHAR(254) NULL COMMENT "lowercased email for lookup"', 'DO 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

INSERT IGNORE INTO schema_version (version_key) VALUES ('phase_13_privacy_audit_2026_05_13');


-- =============================================================================
-- PHASE 14 — SaaS billing fairness
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- plan_features.limit_value --------------------------------------------------
SET @col := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'plan_features' AND COLUMN_NAME = 'limit_value');
SET @sql := IF(@col = 0, 'ALTER TABLE `plan_features` ADD COLUMN `limit_value` BIGINT NULL COMMENT "numeric quota"', 'DO 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- plan_features.limit_unit ---------------------------------------------------
SET @col := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'plan_features' AND COLUMN_NAME = 'limit_unit');
SET @sql := IF(@col = 0, 'ALTER TABLE `plan_features` ADD COLUMN `limit_unit` VARCHAR(32) NULL COMMENT "per_month | per_day | total | mb | seconds"', 'DO 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- subscriptions.previous_period_end ------------------------------------------
SET @col := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'subscriptions' AND COLUMN_NAME = 'previous_period_end');
SET @sql := IF(@col = 0, 'ALTER TABLE `subscriptions` ADD COLUMN `previous_period_end` DATETIME NULL COMMENT "fair early renewal extends from here"', 'DO 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- subscriptions.renewed_from_subscription_id ---------------------------------
SET @col := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'subscriptions' AND COLUMN_NAME = 'renewed_from_subscription_id');
SET @sql := IF(@col = 0, 'ALTER TABLE `subscriptions` ADD COLUMN `renewed_from_subscription_id` BIGINT UNSIGNED NULL', 'DO 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- subscriptions.scheduled_plan_id --------------------------------------------
SET @col := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'subscriptions' AND COLUMN_NAME = 'scheduled_plan_id');
SET @sql := IF(@col = 0, 'ALTER TABLE `subscriptions` ADD COLUMN `scheduled_plan_id` BIGINT UNSIGNED NULL COMMENT "downgrade scheduled for next period"', 'DO 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- subscriptions.scheduled_change_at ------------------------------------------
SET @col := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'subscriptions' AND COLUMN_NAME = 'scheduled_change_at');
SET @sql := IF(@col = 0, 'ALTER TABLE `subscriptions` ADD COLUMN `scheduled_change_at` DATETIME NULL', 'DO 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

INSERT IGNORE INTO schema_version (version_key) VALUES ('phase_14_saas_billing_2026_05_13');


-- =============================================================================
-- Done. To verify, run:
--    SELECT version_key, applied_at FROM schema_version
--     WHERE version_key LIKE 'phase_%' ORDER BY applied_at;
-- You should see 10 rows (one per phase).
-- =============================================================================
