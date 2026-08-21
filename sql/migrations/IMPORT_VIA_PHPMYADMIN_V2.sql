-- =============================================================================
-- SparowVault — ALL PHASES (V2 — fixed for phpMyAdmin)
-- =============================================================================
-- V2 fixes the V1 bug where phpMyAdmin's parser mis-handled `SET @sql := IF(...)`
-- and ate the CREATE TABLE financial_events statement (causing the FK error
-- you just hit). V2 uses ONLY plain SQL — no DELIMITER, no prepared statements,
-- no IF() function calls in DDL contexts.
--
-- Requirements:
--   MariaDB 10.0.2+   (most XAMPP installs)
--   OR MySQL 8.0.12+
--   (both support `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`).
--
-- Safe properties:
--   - SET FOREIGN_KEY_CHECKS = 0 at the start so FKs can be added even if
--     the referenced parent table is created later in the same import.
--   - CREATE TABLE IF NOT EXISTS for every new table — re-runs are no-ops.
--   - ADD COLUMN IF NOT EXISTS for every column — re-runs are no-ops.
--   - Index adds use a separate guarded approach below.
--   - SET FOREIGN_KEY_CHECKS = 1 at the end re-enables validation.
-- =============================================================================

SET FOREIGN_KEY_CHECKS = 0;

-- -----------------------------------------------------------------------------
-- 0. Bookkeeping table
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS schema_version (
  version_key VARCHAR(64) PRIMARY KEY,
  applied_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- ALL NEW TABLES FIRST — sorted by FK dependency order
-- =============================================================================

-- Phase 5 ---------------------------------------------------------------------
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

-- Phase 7 ---------------------------------------------------------------------
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

-- Phase 8 ---------------------------------------------------------------------
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

-- Phase 9 ---------------------------------------------------------------------
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

-- Phase 11 --------------------------------------------------------------------
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

-- Phase 13 --------------------------------------------------------------------
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

-- Phase 14 --------------------------------------------------------------------
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


-- =============================================================================
-- COLUMN ADDS — uses native `ADD COLUMN IF NOT EXISTS`
--   MariaDB 10.0.2+ and MySQL 8.0.12+ both support this.
--   If your server is older, see PHPMYADMIN_FIX_GUIDE.md for the legacy version.
-- =============================================================================

-- Phase 1: payments + users ---------------------------------------------------
ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS expected_amount_paise BIGINT UNSIGNED NULL COMMENT 'amount in paise at order creation',
  ADD COLUMN IF NOT EXISTS captured_amount_paise BIGINT UNSIGNED NULL COMMENT 'validated captured payment amount in paise',
  ADD COLUMN IF NOT EXISTS currency VARCHAR(10) NOT NULL DEFAULT 'INR';

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS must_change_pin TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'force PIN change on first admin action',
  ADD COLUMN IF NOT EXISTS deleted_at      DATETIME NULL COMMENT 'soft-delete timestamp',
  ADD COLUMN IF NOT EXISTS deleted_reason  VARCHAR(120) NULL COMMENT 'self|admin|abuse|inactive';

-- Phase 3: cloud_collection_rows ----------------------------------------------
ALTER TABLE cloud_collection_rows
  ADD COLUMN IF NOT EXISTS amount_paise BIGINT NULL COMMENT 'primary monetary amount in paise';

-- Phase 4: cloud_collection_rows hot fields -----------------------------------
ALTER TABLE cloud_collection_rows
  ADD COLUMN IF NOT EXISTS schema_version       INT NOT NULL DEFAULT 1 COMMENT 'payload schema / client version',
  ADD COLUMN IF NOT EXISTS txn_local_date       DATE NULL,
  ADD COLUMN IF NOT EXISTS txn_month            CHAR(7) NULL,
  ADD COLUMN IF NOT EXISTS txn_type             VARCHAR(32) NULL,
  ADD COLUMN IF NOT EXISTS payment_mode         VARCHAR(32) NULL,
  ADD COLUMN IF NOT EXISTS category_id          VARCHAR(191) NULL,
  ADD COLUMN IF NOT EXISTS account_id           VARCHAR(191) NULL,
  ADD COLUMN IF NOT EXISTS card_id              VARCHAR(191) NULL,
  ADD COLUMN IF NOT EXISTS loan_id              VARCHAR(191) NULL,
  ADD COLUMN IF NOT EXISTS goal_id              VARCHAR(191) NULL,
  ADD COLUMN IF NOT EXISTS udhari_id            VARCHAR(191) NULL,
  ADD COLUMN IF NOT EXISTS business_or_personal VARCHAR(32) NULL,
  ADD COLUMN IF NOT EXISTS source_device_id     VARCHAR(191) NULL,
  ADD COLUMN IF NOT EXISTS payload_hash         CHAR(64) NULL COMMENT 'SHA-256 hex of payload JSON';

-- Phase 13: users PII columns -------------------------------------------------
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS last_policy_check_at DATETIME NULL COMMENT 'policy versions last checked on login',
  ADD COLUMN IF NOT EXISTS mobile_e164          VARCHAR(20) NULL  COMMENT 'PII — encrypt at app layer',
  ADD COLUMN IF NOT EXISTS email_lc             VARCHAR(254) NULL COMMENT 'lowercased email for lookup';

-- Phase 14: plan_features + subscriptions -------------------------------------
ALTER TABLE plan_features
  ADD COLUMN IF NOT EXISTS limit_value BIGINT NULL COMMENT 'numeric quota',
  ADD COLUMN IF NOT EXISTS limit_unit  VARCHAR(32) NULL COMMENT 'per_month | per_day | total | mb | seconds';

ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS previous_period_end          DATETIME NULL COMMENT 'fair early renewal extends from here',
  ADD COLUMN IF NOT EXISTS renewed_from_subscription_id BIGINT UNSIGNED NULL,
  ADD COLUMN IF NOT EXISTS scheduled_plan_id            BIGINT UNSIGNED NULL COMMENT 'downgrade scheduled for next period',
  ADD COLUMN IF NOT EXISTS scheduled_change_at          DATETIME NULL;


-- =============================================================================
-- INDEXES — ADD KEY IF NOT EXISTS (MariaDB 10.0.2+) is the cleanest pattern.
-- On MySQL 8 (which has no IF NOT EXISTS for indexes), this section will
-- error on re-run with "Duplicate key name" — you can ignore those errors.
-- =============================================================================

ALTER TABLE payments
  ADD UNIQUE KEY IF NOT EXISTS uq_pay_provider_order_id (provider, provider_order_id),
  ADD UNIQUE KEY IF NOT EXISTS uq_pay_provider_payment_id (provider, provider_payment_id);

ALTER TABLE users
  ADD KEY IF NOT EXISTS idx_users_deleted (deleted_at);

ALTER TABLE cloud_collection_rows
  ADD KEY IF NOT EXISTS idx_ccr_uid_coll_txn_date  (user_id, collection_name, txn_local_date),
  ADD KEY IF NOT EXISTS idx_ccr_uid_cat_month      (user_id, category_id, txn_month),
  ADD KEY IF NOT EXISTS idx_ccr_uid_card_txn_date  (user_id, card_id, txn_local_date),
  ADD KEY IF NOT EXISTS idx_ccr_uid_loan_txn_date  (user_id, loan_id, txn_local_date),
  ADD KEY IF NOT EXISTS idx_ccr_uid_goal_txn_date  (user_id, goal_id, txn_local_date),
  ADD KEY IF NOT EXISTS idx_ccr_uid_amount_paise   (user_id, amount_paise);


-- =============================================================================
-- Done. Re-enable FK checks and record applied phases.
-- =============================================================================
SET FOREIGN_KEY_CHECKS = 1;

INSERT IGNORE INTO schema_version (version_key) VALUES
  ('phase_01_security_2026_05_13'),
  ('phase_03_cloud_amount_paise_2026_05_13'),
  ('phase_04_indexed_sync_fields_2026_05_13'),
  ('phase_05_financial_ledger_2026_05_13'),
  ('phase_07_user_credit_cards_2026_05_13'),
  ('phase_08_user_loans_2026_05_13'),
  ('phase_09_udhari_engine_2026_05_13'),
  ('phase_11_ai_suggestions_2026_05_13'),
  ('phase_13_privacy_audit_2026_05_13'),
  ('phase_14_saas_billing_2026_05_13');

-- Verify with:
--   SELECT version_key, applied_at FROM schema_version
--    WHERE version_key LIKE 'phase_%' ORDER BY applied_at;
-- =============================================================================
