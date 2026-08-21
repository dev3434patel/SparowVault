-- ============================================================================
-- HOSTING FRESH IMPORT FOR OLDER MYSQL / PHPMYADMIN
-- ============================================================================
-- Use this file when phpMyAdmin fails on CREATE PROCEDURE / DELIMITER blocks
-- or on ALTER TABLE ... ADD COLUMN IF NOT EXISTS.

-- This file is for a BRAND-NEW EMPTY hosting database only.
-- It creates final tables directly and does not run unsupported compatibility
-- ALTER statements. Do not use it as an in-place migration on a database that
-- already contains real user data.
-- ============================================================================

-- ============================================================================
-- SparowVault â€” COMPLETE DATABASE BOOTSTRAP (Phases 0-14 baked in)
-- ============================================================================
-- Use this file when you want to:
--   â€¢ Spin up a brand-new database from scratch, OR
--   â€¢ Apply every phase to an existing database without losing data.
--
-- DESIGNED FOR phpMyAdmin's "Import" tab:
--   - No DELIMITER blocks
--   - No `SET @sql := IF(...)` patterns (the V1 bug)
--   - Only plain DDL: CREATE TABLE IF NOT EXISTS, ALTER ... IF NOT EXISTS,
--     INSERT ... ON DUPLICATE KEY UPDATE.
--   - SET FOREIGN_KEY_CHECKS = 0 at the start so creation order never matters.
--
-- REQUIREMENTS:
--   â€¢ MariaDB 10.0.2+   (XAMPP default)
--   â€¢ OR MySQL 8.0.12+
--   â€¢ Charset utf8mb4 (server default fine).
--
-- HOW TO IMPORT:
--   1. phpMyAdmin â†’ click your database (e.g. `moneydata`) in the left sidebar.
--      If creating new, first: Databases tab â†’ enter name `moneydata` â†’
--      collation `utf8mb4_unicode_ci` â†’ Create.
--   2. Click Import (top toolbar).
--   3. Choose File â†’ select SPAROWVAULT_FULL_DATABASE.sql.
--   4. Leave defaults (UTF-8, SQL format, delimiter `;`, no compatibility).
--   5. Click Go.
--   6. Expected: green banner â€” "Import has been successfully finished".
--
-- WHAT YOU GET:
--   24 tables, 4 subscription plans seeded, 7 global feature flags,
--   1 admin user (username=admin, PIN=12345678 â€” CHANGE IMMEDIATELY).
--
-- RE-RUN SAFETY:
--   100% idempotent. Re-running this file against a database that already
--   has some/all of these structures is a no-op for those parts.
--
-- WHAT IT DOES NOT TOUCH:
--   Existing user data rows. CREATE TABLE IF NOT EXISTS skips. ALTER ADD
--   COLUMN IF NOT EXISTS skips. INSERT ... ON DUPLICATE KEY UPDATE for seed
--   data refreshes plan prices / feature toggles to known good values.
-- ============================================================================

SET NAMES utf8mb4;
SET time_zone = '+00:00';
SET FOREIGN_KEY_CHECKS = 0;
SET sql_mode = '';

-- ============================================================================
-- SECTION 1: CORE IDENTITY + GENERIC ENTITY STORAGE
-- ============================================================================

-- 1.1 users -------------------------------------------------------------------
-- Phase 1 columns (must_change_pin, deleted_at, deleted_reason) +
-- Phase 13 PII (last_policy_check_at, mobile_e164, email_lc) +
-- Legacy/UI (mobile, email, avatar_emoji, avatar_color) all baked in.
CREATE TABLE IF NOT EXISTS users (
  id                    VARCHAR(191)          NOT NULL,
  username              VARCHAR(24)           NOT NULL,
  display_name          VARCHAR(60)           NOT NULL,
  pin_hash              VARCHAR(255)          NOT NULL  COMMENT 'bcrypt of pin:salt',
  pin_salt              VARCHAR(64)           NOT NULL  COMMENT 'hex random bytes',
  role                  ENUM('user','admin')  NOT NULL  DEFAULT 'user',
  is_active             TINYINT(1)            NOT NULL  DEFAULT 1,
  mobile                VARCHAR(32)           NULL,
  email                 VARCHAR(120)          NULL,
  avatar_emoji          VARCHAR(16)           NULL,
  avatar_color          VARCHAR(7)            NULL,
  must_change_pin       TINYINT(1)            NOT NULL  DEFAULT 0  COMMENT 'force PIN change on first admin action',
  deleted_at            DATETIME              NULL      COMMENT 'soft-delete timestamp',
  deleted_reason        VARCHAR(120)          NULL      COMMENT 'self|admin|abuse|inactive',
  last_policy_check_at  DATETIME              NULL      COMMENT 'when policy versions were last checked',
  mobile_e164           VARCHAR(20)           NULL      COMMENT 'PII â€” encrypt at app layer',
  email_lc              VARCHAR(254)          NULL      COMMENT 'lowercased email for lookup',
  last_login_at         DATETIME              NULL      COMMENT 'updated on every successful auth',
  created_at            DATETIME              NOT NULL  DEFAULT CURRENT_TIMESTAMP,
  updated_at            DATETIME              NOT NULL  DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_username (username),
  KEY idx_users_role_active (role, is_active),
  KEY idx_users_created_at  (created_at),
  KEY idx_users_deleted     (deleted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Central user store with all auth + profile + Phase 1/13 fields';

-- For existing databases that pre-date some of the above columns, defensively
-- add them. MariaDB 10.0.2+ and MySQL 8.0.12+ support IF NOT EXISTS here.
-- Skipped compatibility ALTER block requiring MySQL 8.0.12+/MariaDB 10.0.2+; final columns/indexes are already in CREATE TABLE definitions for fresh import.

-- Skipped compatibility ALTER block requiring MySQL 8.0.12+/MariaDB 10.0.2+; final columns/indexes are already in CREATE TABLE definitions for fresh import.


-- 1.2 cloud_collection_rows ---------------------------------------------------
-- Phase 3 (amount_paise) + Phase 4 (15 hot fields + 6 indexes) baked in.
CREATE TABLE IF NOT EXISTS cloud_collection_rows (
  id                   VARCHAR(191)  NOT NULL,
  user_id              VARCHAR(191)  NOT NULL  COMMENT 'FK â†’ users.id',
  collection_name      VARCHAR(64)   NOT NULL,
  entity_id            VARCHAR(191)  NOT NULL,
  payload              LONGTEXT      NOT NULL,
  amount_paise         BIGINT        NULL      COMMENT 'denormalized primary amount in paise',
  schema_version       INT           NOT NULL  DEFAULT 1,
  txn_local_date       DATE          NULL,
  txn_month            CHAR(7)       NULL      COMMENT 'YYYY-MM',
  txn_type             VARCHAR(32)   NULL,
  payment_mode         VARCHAR(32)   NULL,
  category_id          VARCHAR(191)  NULL,
  account_id           VARCHAR(191)  NULL,
  card_id              VARCHAR(191)  NULL,
  loan_id              VARCHAR(191)  NULL,
  goal_id              VARCHAR(191)  NULL,
  udhari_id            VARCHAR(191)  NULL,
  business_or_personal VARCHAR(32)   NULL,
  source_device_id     VARCHAR(191)  NULL,
  payload_hash         CHAR(64)      NULL      COMMENT 'SHA-256 hex of payload JSON',
  updated_at           DATETIME      NOT NULL,
  deleted_at           DATETIME      NULL,
  created_at           DATETIME      NOT NULL  DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_collection_entity (user_id, collection_name, entity_id),
  KEY idx_col_user_collection      (user_id, collection_name),
  KEY idx_col_user_updated         (user_id, updated_at),
  KEY idx_col_deleted              (deleted_at),
  KEY idx_ccr_collection_deleted   (user_id, collection_name, deleted_at),
  KEY idx_ccr_uid_coll_txn_date    (user_id, collection_name, txn_local_date),
  KEY idx_ccr_uid_cat_month        (user_id, category_id, txn_month),
  KEY idx_ccr_uid_card_txn_date    (user_id, card_id, txn_local_date),
  KEY idx_ccr_uid_loan_txn_date    (user_id, loan_id, txn_local_date),
  KEY idx_ccr_uid_goal_txn_date    (user_id, goal_id, txn_local_date),
  KEY idx_ccr_uid_amount_paise     (user_id, amount_paise),
  CONSTRAINT fk_ccr_user FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Generic JSON entity storage with Phase 3+4 hot columns';

-- Defensive ADD COLUMN IF NOT EXISTS for already-existing installs
-- Skipped compatibility ALTER block requiring MySQL 8.0.12+/MariaDB 10.0.2+; final columns/indexes are already in CREATE TABLE definitions for fresh import.

-- Skipped compatibility ALTER block requiring MySQL 8.0.12+/MariaDB 10.0.2+; final columns/indexes are already in CREATE TABLE definitions for fresh import.


-- ============================================================================
-- SECTION 2: PHASE 5 â€” FINANCIAL EVENT/EFFECT LEDGER
-- ============================================================================

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
  KEY idx_fin_ev_user_date    (user_id, event_date),
  KEY idx_fin_ev_user_status  (user_id, status),
  CONSTRAINT fk_fin_ev_user FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Phase 5 â€” canonical money-movement ledger';

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
  KEY idx_fin_ef_event       (event_id),
  KEY idx_fin_ef_user_target (user_id, target_type, target_id),
  CONSTRAINT fk_fin_ef_event FOREIGN KEY (event_id) REFERENCES financial_events(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_fin_ef_user  FOREIGN KEY (user_id)  REFERENCES users(id)            ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Phase 5 â€” per-target deltas for an event';


-- ============================================================================
-- SECTION 3: PHASE 7 â€” CREDIT CARD SHADOW
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_credit_cards (
  id                         VARCHAR(191)     NOT NULL,
  user_id                    VARCHAR(191)     NOT NULL,
  card_name                  VARCHAR(120)     NOT NULL DEFAULT '',
  issuer_name                VARCHAR(120)     NOT NULL DEFAULT '',
  last4                      CHAR(4)          NOT NULL DEFAULT '',
  credit_limit_paise         BIGINT           NOT NULL DEFAULT 0,
  current_outstanding_paise  BIGINT           NOT NULL DEFAULT 0,
  unbilled_amount_paise      BIGINT           NOT NULL DEFAULT 0,
  statement_balance_paise    BIGINT           NOT NULL DEFAULT 0,
  minimum_due_paise          BIGINT           NOT NULL DEFAULT 0,
  statement_day              TINYINT UNSIGNED NOT NULL DEFAULT 1,
  due_day                    TINYINT UNSIGNED NOT NULL DEFAULT 15,
  last_statement_date        DATE             NULL,
  next_due_date              DATE             NULL,
  interest_rate_bps          INT UNSIGNED     NOT NULL DEFAULT 0 COMMENT 'APR * 100',
  annual_fee_paise           BIGINT           NOT NULL DEFAULT 0,
  is_active                  TINYINT(1)       NOT NULL DEFAULT 1,
  deleted_at                 DATETIME         NULL,
  created_at                 DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at                 DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_user_cc_user_active (user_id, is_active, deleted_at),
  CONSTRAINT fk_user_cc_user FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Phase 7 â€” per-card shadow metrics';


-- ============================================================================
-- SECTION 4: PHASE 8 â€” LOAN SHADOW + EMI PAYMENT LEDGER
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_loans (
  id                           VARCHAR(191)     NOT NULL,
  user_id                      VARCHAR(191)     NOT NULL,
  loan_name                    VARCHAR(120)     NOT NULL DEFAULT '',
  lender_name                  VARCHAR(120)     NOT NULL DEFAULT '',
  loan_type                    VARCHAR(32)      NOT NULL DEFAULT 'personal',
  principal_sanctioned_paise   BIGINT           NOT NULL DEFAULT 0,
  disbursed_amount_paise       BIGINT           NOT NULL DEFAULT 0,
  current_principal_paise      BIGINT           NOT NULL DEFAULT 0,
  annual_interest_bps          INT UNSIGNED     NOT NULL DEFAULT 0 COMMENT 'APR * 100',
  interest_type                VARCHAR(32)      NOT NULL DEFAULT 'reducing_balance',
  emi_amount_paise             BIGINT           NOT NULL DEFAULT 0,
  original_tenure_months       INT UNSIGNED     NOT NULL DEFAULT 0,
  remaining_tenure_months      INT UNSIGNED     NOT NULL DEFAULT 0,
  start_date                   DATE             NULL,
  first_emi_date               DATE             NULL,
  due_day                      TINYINT UNSIGNED NOT NULL DEFAULT 1,
  processing_fee_paise         BIGINT           NOT NULL DEFAULT 0,
  insurance_fee_paise          BIGINT           NOT NULL DEFAULT 0,
  prepayment_allowed           TINYINT(1)       NOT NULL DEFAULT 1,
  foreclosure_charge_bps       INT UNSIGNED     NOT NULL DEFAULT 0,
  status                       VARCHAR(32)      NOT NULL DEFAULT 'active',
  lifecycle_mode               VARCHAR(32)      NOT NULL DEFAULT 'fresh',
  deleted_at                   DATETIME         NULL,
  created_at                   DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at                   DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_user_loans_user (user_id, status, deleted_at),
  CONSTRAINT fk_user_loans_user FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Phase 8 â€” per-loan shadow metrics';

CREATE TABLE IF NOT EXISTS user_loan_payments (
  id                           VARCHAR(191)  NOT NULL,
  user_id                      VARCHAR(191)  NOT NULL,
  loan_id                      VARCHAR(191)  NOT NULL,
  due_month                    CHAR(7)       NOT NULL COMMENT 'YYYY-MM',
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
  CONSTRAINT fk_user_loan_pay_user FOREIGN KEY (user_id) REFERENCES users(id)      ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_user_loan_pay_loan FOREIGN KEY (loan_id) REFERENCES user_loans(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Phase 8 â€” EMI payment line ledger';


-- ============================================================================
-- SECTION 5: PHASE 9 â€” UDHARI (RECEIVABLE/PAYABLE) ENGINE
-- ============================================================================

CREATE TABLE IF NOT EXISTS udhari_people (
  id                        VARCHAR(191)  NOT NULL,
  user_id                   VARCHAR(191)  NOT NULL,
  display_name              VARCHAR(120)  NOT NULL DEFAULT '',
  phone_hash                VARCHAR(128)  NOT NULL DEFAULT '' COMMENT 'opaque hash; no raw phone',
  relationship              VARCHAR(64)   NOT NULL DEFAULT 'other',
  total_receivable_paise    BIGINT        NOT NULL DEFAULT 0,
  total_payable_paise       BIGINT        NOT NULL DEFAULT 0,
  risk_level                VARCHAR(32)   NOT NULL DEFAULT 'ok',
  created_at                DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at                DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at                DATETIME      NULL,
  PRIMARY KEY (id),
  KEY idx_udhari_people_user (user_id, deleted_at),
  CONSTRAINT fk_udhari_people_user FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Phase 9 â€” udhari person rollups';

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
  KEY idx_udhari_ent_user   (user_id, person_id, settlement_status),
  KEY idx_udhari_ent_person (person_id),
  CONSTRAINT fk_udhari_ent_user   FOREIGN KEY (user_id)   REFERENCES users(id)         ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_udhari_ent_person FOREIGN KEY (person_id) REFERENCES udhari_people(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Phase 9 â€” udhari line items';

CREATE TABLE IF NOT EXISTS udhari_settlements (
  id                        VARCHAR(191)  NOT NULL,
  user_id                   VARCHAR(191)  NOT NULL,
  person_id                 VARCHAR(191)  NOT NULL,
  udhari_entry_id           VARCHAR(191)  NOT NULL,
  amount_paise              BIGINT        NOT NULL DEFAULT 0,
  settlement_date           DATE          NOT NULL,
  account_id                VARCHAR(191)  NULL COMMENT 'NULL for write-off',
  notes                     VARCHAR(500)  NOT NULL DEFAULT '',
  created_at                DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_udhari_set_entry (udhari_entry_id, settlement_date),
  KEY idx_udhari_set_user  (user_id),
  CONSTRAINT fk_udhari_set_user   FOREIGN KEY (user_id)         REFERENCES users(id)           ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_udhari_set_person FOREIGN KEY (person_id)       REFERENCES udhari_people(id)   ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_udhari_set_entry  FOREIGN KEY (udhari_entry_id) REFERENCES udhari_entries(id)  ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Phase 9 â€” settlement lines';


-- ============================================================================
-- SECTION 6: PHASE 11 â€” AI SUGGESTION SHADOW
-- ============================================================================

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
  CONSTRAINT fk_ai_suggestions_user FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Phase 11 â€” rule-backed AI suggestions';


-- ============================================================================
-- SECTION 7: SUBSCRIPTION + BILLING TABLES
--   plans, plan_features (Phase 14 columns inline),
--   subscriptions (Phase 14 columns inline),
--   payments (Phase 1 columns + unique indexes inline),
--   plan_prices (Phase 14),
--   webhook_events
-- ============================================================================

CREATE TABLE IF NOT EXISTS plans (
  id               BIGINT UNSIGNED       NOT NULL AUTO_INCREMENT,
  code             VARCHAR(64)           NOT NULL  COMMENT 'e.g. FREE, BASIC, PRO, PRO_YEARLY',
  name             VARCHAR(120)          NOT NULL,
  description      TEXT                  NULL,
  price_inr        DECIMAL(10,2)         NOT NULL  DEFAULT 0.00,
  billing_interval ENUM('monthly','yearly') NOT NULL DEFAULT 'monthly',
  trial_days       INT                   NOT NULL  DEFAULT 0,
  is_active        TINYINT(1)            NOT NULL  DEFAULT 1,
  sort_order       INT                   NOT NULL  DEFAULT 0,
  created_at       DATETIME              NOT NULL  DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME              NOT NULL  DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_plans_code        (code),
  KEY idx_plans_active_interval   (is_active, billing_interval),
  KEY idx_plans_sort              (sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Subscription plans available on the platform';

CREATE TABLE IF NOT EXISTS plan_features (
  id           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  plan_id      BIGINT UNSIGNED NOT NULL,
  feature_key  VARCHAR(191)    NOT NULL,
  is_enabled   TINYINT(1)      NOT NULL DEFAULT 0,
  limit_value  BIGINT          NULL     COMMENT 'Phase 14: numeric quota',
  limit_unit   VARCHAR(32)     NULL     COMMENT 'Phase 14: per_month | per_day | total | mb | seconds',
  created_at   DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_plan_feature          (plan_id, feature_key),
  KEY idx_plan_features_feature_key   (feature_key),
  CONSTRAINT fk_plan_features_plan FOREIGN KEY (plan_id) REFERENCES plans(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Feature entitlements per plan with Phase 14 numeric quotas';

-- Skipped compatibility ALTER block requiring MySQL 8.0.12+/MariaDB 10.0.2+; final columns/indexes are already in CREATE TABLE definitions for fresh import.

-- Phase 14 â€” historical pricing per plan (append-only)
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
  CONSTRAINT fk_pp_plan FOREIGN KEY (plan_id) REFERENCES plans(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Phase 14 â€” historical plan pricing';

CREATE TABLE IF NOT EXISTS subscriptions (
  id                            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id                       VARCHAR(191)    NOT NULL,
  plan_id                       BIGINT UNSIGNED NOT NULL,
  status                        ENUM('pending','trial','active','past_due','cancelled','expired')
                                                NOT NULL DEFAULT 'pending',
  trial_ends_at                 DATETIME        NULL,
  current_period_start          DATETIME        NULL,
  current_period_end            DATETIME        NULL,
  previous_period_end           DATETIME        NULL  COMMENT 'Phase 14: fair early renewal anchor',
  renewed_from_subscription_id  BIGINT UNSIGNED NULL  COMMENT 'Phase 14: FK-soft to prior subscription',
  scheduled_plan_id             BIGINT UNSIGNED NULL  COMMENT 'Phase 14: downgrade scheduled',
  scheduled_change_at           DATETIME        NULL  COMMENT 'Phase 14: when scheduled change applies',
  cancel_at_period_end          TINYINT(1)      NOT NULL DEFAULT 0,
  cancelled_at                  DATETIME        NULL,
  provider                      ENUM('razorpay','manual') NOT NULL DEFAULT 'razorpay',
  provider_subscription_id      VARCHAR(191)    NULL,
  provider_customer_id          VARCHAR(191)    NULL,
  provider_order_id             VARCHAR(191)    NULL,
  notes                         TEXT            NULL,
  created_at                    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at                    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_sub_user_status       (user_id, status),
  KEY idx_sub_period_end        (current_period_end),
  KEY idx_sub_expires           (status, current_period_end),
  KEY idx_sub_provider_sub_id   (provider_subscription_id),
  KEY idx_sub_provider_order_id (provider_order_id),
  CONSTRAINT fk_sub_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE  ON UPDATE CASCADE,
  CONSTRAINT fk_sub_plan FOREIGN KEY (plan_id) REFERENCES plans(id) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='User subscriptions with Phase 14 fairness columns';

-- Skipped compatibility ALTER block requiring MySQL 8.0.12+/MariaDB 10.0.2+; final columns/indexes are already in CREATE TABLE definitions for fresh import.

-- Skipped compatibility ALTER block requiring MySQL 8.0.12+/MariaDB 10.0.2+; final columns/indexes are already in CREATE TABLE definitions for fresh import.

CREATE TABLE IF NOT EXISTS payments (
  id                     BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id                VARCHAR(191)    NOT NULL,
  subscription_id        BIGINT UNSIGNED NULL,
  amount_inr             DECIMAL(10,2)   NOT NULL,
  currency               VARCHAR(10)     NOT NULL DEFAULT 'INR',
  expected_amount_paise  BIGINT UNSIGNED NULL     COMMENT 'Phase 1: validate captured webhook against this',
  captured_amount_paise  BIGINT UNSIGNED NULL     COMMENT 'Phase 3: validated captured webhook amount in paise',
  status                 ENUM('created','authorized','captured','failed','refunded')
                                         NOT NULL DEFAULT 'created',
  provider               ENUM('razorpay','manual') NOT NULL DEFAULT 'razorpay',
  provider_order_id      VARCHAR(191)    NOT NULL,
  provider_payment_id    VARCHAR(191)    NULL,
  provider_signature     VARCHAR(512)    NULL,
  failure_reason         TEXT            NULL,
  refund_id              VARCHAR(191)    NULL,
  paid_at                DATETIME        NULL,
  created_at             DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at             DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_pay_provider_order_id    (provider, provider_order_id),
  UNIQUE KEY uq_pay_provider_payment_id  (provider, provider_payment_id),
  KEY idx_pay_user_status                (user_id, status),
  KEY idx_pay_provider_order             (provider_order_id),
  KEY idx_pay_provider_payment           (provider_payment_id),
  KEY idx_pay_paid_at                    (paid_at),
  CONSTRAINT fk_pay_user         FOREIGN KEY (user_id)         REFERENCES users(id)         ON DELETE CASCADE  ON UPDATE CASCADE,
  CONSTRAINT fk_pay_subscription FOREIGN KEY (subscription_id) REFERENCES subscriptions(id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Payments with Phase 1 expected_amount_paise + unique indexes';

-- Skipped compatibility ALTER block requiring MySQL 8.0.12+/MariaDB 10.0.2+; final columns/indexes are already in CREATE TABLE definitions for fresh import.

-- Skipped compatibility ALTER block requiring MySQL 8.0.12+/MariaDB 10.0.2+; final columns/indexes are already in CREATE TABLE definitions for fresh import.

CREATE TABLE IF NOT EXISTS webhook_events (
  id                BIGINT UNSIGNED  NOT NULL AUTO_INCREMENT,
  provider          ENUM('razorpay') NOT NULL DEFAULT 'razorpay',
  event_id          VARCHAR(191)     NOT NULL  COMMENT 'provider event ID â€” unique',
  event_type        VARCHAR(191)     NOT NULL,
  signature_valid   TINYINT(1)       NOT NULL DEFAULT 0,
  payload_json      LONGTEXT         NOT NULL,
  processing_status ENUM('pending','processed','failed') NOT NULL DEFAULT 'pending',
  processed_at      DATETIME         NULL,
  error_message     TEXT             NULL,
  retry_count       TINYINT UNSIGNED NOT NULL DEFAULT 0,
  created_at        DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_webhook_event_id   (event_id),
  KEY idx_webhook_provider_status  (provider, processing_status),
  KEY idx_webhook_created          (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Idempotent Razorpay webhook event log';


-- ============================================================================
-- SECTION 8: PLATFORM CONFIG + FEATURE FLAGS + AUDIT
-- ============================================================================

CREATE TABLE IF NOT EXISTS app_settings (
  id                  BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  setting_key         VARCHAR(191)    NOT NULL,
  setting_value       LONGTEXT        NOT NULL  COMMENT 'JSON-encoded value',
  is_public           TINYINT(1)      NOT NULL DEFAULT 0,
  updated_by_user_id  VARCHAR(191)    NULL,
  updated_at          DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_at          DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_setting_key (setting_key),
  CONSTRAINT fk_settings_updated_by FOREIGN KEY (updated_by_user_id) REFERENCES users(id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Platform-wide branding + config';

CREATE TABLE IF NOT EXISTS feature_flags_global (
  id                  BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  feature_key         VARCHAR(191)    NOT NULL,
  is_enabled          TINYINT(1)      NOT NULL DEFAULT 0,
  description         VARCHAR(255)    NULL,
  updated_by_user_id  VARCHAR(191)    NULL,
  updated_at          DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_at          DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_feature_key (feature_key),
  CONSTRAINT fk_flags_updated_by FOREIGN KEY (updated_by_user_id) REFERENCES users(id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Global feature flag overrides';

CREATE TABLE IF NOT EXISTS admin_audit_logs (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  actor_user_id   VARCHAR(191)    NULL,
  actor_role      VARCHAR(32)     NOT NULL DEFAULT 'system',
  action_key      VARCHAR(191)    NOT NULL,
  entity_type     VARCHAR(191)    NOT NULL,
  entity_id       VARCHAR(191)    NOT NULL,
  before_json     LONGTEXT        NULL,
  after_json      LONGTEXT        NULL,
  ip_address      VARCHAR(64)     NOT NULL DEFAULT '',
  user_agent      VARCHAR(512)    NOT NULL DEFAULT '',
  created_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_aal_entity  (entity_type, entity_id),
  KEY idx_aal_actor   (actor_user_id, created_at),
  KEY idx_aal_action  (action_key),
  KEY idx_aal_created (created_at),
  CONSTRAINT fk_aal_actor FOREIGN KEY (actor_user_id) REFERENCES users(id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Immutable admin action trail';

-- audit_logs is the general action log used by audit_log_action() helper.
CREATE TABLE IF NOT EXISTS audit_logs (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  actor_user_id   VARCHAR(191)    NULL,
  actor_role      VARCHAR(32)     NOT NULL DEFAULT 'system',
  action_key      VARCHAR(191)    NOT NULL,
  entity_type     VARCHAR(191)    NOT NULL,
  entity_id       VARCHAR(191)    NOT NULL,
  before_json     LONGTEXT        NULL,
  after_json      LONGTEXT        NULL,
  ip_address      VARCHAR(64)     NOT NULL DEFAULT '',
  user_agent      VARCHAR(512)    NOT NULL DEFAULT '',
  created_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_audit_entity (entity_type, entity_id),
  KEY idx_audit_actor  (actor_user_id, created_at),
  KEY idx_audit_action (action_key),
  KEY idx_audit_created (created_at),
  CONSTRAINT fk_audit_actor FOREIGN KEY (actor_user_id) REFERENCES users(id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='General-purpose action audit log';


-- ============================================================================
-- SECTION 9: SECURITY UTILITY TABLES
--   login_attempts, api_rate_limits, user_security_recovery
-- ============================================================================

CREATE TABLE IF NOT EXISTS login_attempts (
  id               BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  username         VARCHAR(191)    NOT NULL,
  ip_address       VARCHAR(64)     NOT NULL,
  attempt_count    INT             NOT NULL DEFAULT 0,
  locked_until     DATETIME        NULL,
  first_attempt_at DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_login_attempt   (username, ip_address),
  KEY idx_login_attempt_locked  (locked_until),
  KEY idx_login_attempt_updated (updated_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Brute-force protection';

CREATE TABLE IF NOT EXISTS api_rate_limits (
  id           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  bucket_key   VARCHAR(191)    NOT NULL  COMMENT 'bucket_name|ip_address',
  hit_count    INT             NOT NULL  DEFAULT 0,
  window_start DATETIME        NOT NULL  DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME        NOT NULL  DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_rate_bucket_key (bucket_key),
  KEY idx_rate_window_start     (window_start)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='API rate limiting';

CREATE TABLE IF NOT EXISTS user_security_recovery (
  user_id              VARCHAR(191) NOT NULL PRIMARY KEY,
  security_question    VARCHAR(255) NOT NULL,
  security_answer_hash VARCHAR(255) NOT NULL,
  updated_at           DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_at           DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_security_recovery_user FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Per-user security recovery Q+A (hashed)';


-- ============================================================================
-- SECTION 10: PHASE 13 â€” PRIVACY / AUDIT / RETENTION
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_policy_acceptances (
  id           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id      VARCHAR(191)    NOT NULL,
  policy_key   VARCHAR(64)     NOT NULL  COMMENT 'terms | privacy | cookie | data_processing',
  version      VARCHAR(32)     NOT NULL  COMMENT 'semver or YYYY-MM-DD',
  accepted_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ip_address   VARCHAR(64)     NOT NULL DEFAULT '',
  user_agent   VARCHAR(512)    NOT NULL DEFAULT '',
  withdrawn_at DATETIME        NULL,
  created_at   DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_user_policy_version (user_id, policy_key, version),
  KEY idx_upa_user (user_id, policy_key),
  CONSTRAINT fk_upa_user FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Phase 13 â€” DPDP/GDPR policy acceptance per user per version';

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
  CONSTRAINT fk_ual_user FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Phase 13 â€” per-user state-change audit trail';

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Phase 13 â€” retention sweep bookkeeping';


-- ============================================================================
-- SECTION 11: LEGACY / BOOKKEEPING
-- ============================================================================

CREATE TABLE IF NOT EXISTS cloud_users (
  id           VARCHAR(191) NOT NULL,
  username     VARCHAR(24)  NOT NULL,
  display_name VARCHAR(60)  NOT NULL,
  pin_hash     VARCHAR(255) NOT NULL,
  pin_salt     VARCHAR(64)  NOT NULL,
  created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_cu_username (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Legacy table â€” kept for migration only';

CREATE TABLE IF NOT EXISTS schema_version (
  version_key VARCHAR(64) PRIMARY KEY,
  applied_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================================================
-- SECTION 12: SEED DATA â€” Safe to re-run (ON DUPLICATE KEY UPDATE)
-- ============================================================================

-- Default subscription plans
INSERT INTO plans (code, name, description, price_inr, billing_interval, trial_days, is_active, sort_order)
VALUES
  ('FREE',       'Free',       'Basic personal finance tracking',                0.00, 'monthly',  0, 1, 1),
  ('BASIC',      'Basic',      'Unlimited transactions, budgets and goals',    299.00, 'monthly',  7, 1, 2),
  ('PRO',        'Pro',        'Advanced reports, export and alerts',          799.00, 'monthly',  7, 1, 3),
  ('PRO_YEARLY', 'Pro Yearly', 'Pro features at yearly discounted price',     7999.00, 'yearly',  14, 1, 4)
ON DUPLICATE KEY UPDATE
  name             = VALUES(name),
  description      = VALUES(description),
  price_inr        = VALUES(price_inr),
  billing_interval = VALUES(billing_interval),
  trial_days       = VALUES(trial_days),
  is_active        = VALUES(is_active),
  sort_order       = VALUES(sort_order);

-- Plan features
INSERT INTO plan_features (plan_id, feature_key, is_enabled)
SELECT p.id, 'exports', CASE WHEN p.code IN ('PRO','PRO_YEARLY') THEN 1 ELSE 0 END FROM plans p
ON DUPLICATE KEY UPDATE is_enabled = VALUES(is_enabled);

INSERT INTO plan_features (plan_id, feature_key, is_enabled)
SELECT p.id, 'advanced_reports', CASE WHEN p.code IN ('PRO','PRO_YEARLY') THEN 1 ELSE 0 END FROM plans p
ON DUPLICATE KEY UPDATE is_enabled = VALUES(is_enabled);

INSERT INTO plan_features (plan_id, feature_key, is_enabled)
SELECT p.id, 'alerts', CASE WHEN p.code IN ('BASIC','PRO','PRO_YEARLY') THEN 1 ELSE 0 END FROM plans p
ON DUPLICATE KEY UPDATE is_enabled = VALUES(is_enabled);

INSERT INTO plan_features (plan_id, feature_key, is_enabled)
SELECT p.id, 'import', CASE WHEN p.code IN ('BASIC','PRO','PRO_YEARLY') THEN 1 ELSE 0 END FROM plans p
ON DUPLICATE KEY UPDATE is_enabled = VALUES(is_enabled);

INSERT INTO plan_features (plan_id, feature_key, is_enabled)
SELECT p.id, 'udhari', 1 FROM plans p
ON DUPLICATE KEY UPDATE is_enabled = VALUES(is_enabled);

INSERT INTO plan_features (plan_id, feature_key, is_enabled)
SELECT p.id, 'ca_reports', CASE WHEN p.code IN ('PRO','PRO_YEARLY') THEN 1 ELSE 0 END FROM plans p
ON DUPLICATE KEY UPDATE is_enabled = VALUES(is_enabled);

-- Phase 14 â€” set numeric quotas on plan_features for known limits.
INSERT INTO plan_features (plan_id, feature_key, is_enabled, limit_value, limit_unit)
SELECT p.id, 'max_transactions_per_month', 1,
  CASE p.code
    WHEN 'FREE'       THEN 100
    WHEN 'BASIC'      THEN 1000
    WHEN 'PRO'        THEN 10000
    WHEN 'PRO_YEARLY' THEN 10000
    ELSE 100
  END,
  'per_month'
FROM plans p
ON DUPLICATE KEY UPDATE limit_value = VALUES(limit_value), limit_unit = VALUES(limit_unit);

INSERT INTO plan_features (plan_id, feature_key, is_enabled, limit_value, limit_unit)
SELECT p.id, 'max_exports_per_month', CASE WHEN p.code IN ('PRO','PRO_YEARLY') THEN 1 ELSE 0 END,
  CASE p.code WHEN 'PRO' THEN 30 WHEN 'PRO_YEARLY' THEN 30 ELSE 0 END,
  'per_month'
FROM plans p
ON DUPLICATE KEY UPDATE limit_value = VALUES(limit_value), limit_unit = VALUES(limit_unit), is_enabled = VALUES(is_enabled);

-- Phase 14 â€” current price snapshots for each plan (append-only history table).
INSERT INTO plan_prices (plan_id, amount_paise, currency, billing_interval, starts_at, notes)
SELECT p.id, ROUND(p.price_inr * 100), 'INR', p.billing_interval, UTC_TIMESTAMP(), 'initial seed price'
FROM plans p
WHERE NOT EXISTS (
  SELECT 1 FROM plan_prices pp WHERE pp.plan_id = p.id
);

-- Global feature flags
INSERT INTO feature_flags_global (feature_key, is_enabled, description) VALUES
  ('exports',          1, 'Allow users to export data to XLSX/CSV'),
  ('advanced_reports', 0, 'Advanced multi-period financial reports'),
  ('alerts',           1, 'Budget overrun, due-date and udhari alerts'),
  ('admin_panel',      1, 'Access to admin console at /admin'),
  ('branding',         1, 'Platform branding customisation'),
  ('import',           1, 'Bulk import from CSV/Excel'),
  ('subscriptions',    1, 'Razorpay subscription and payment flow'),
  ('ca_reports',       0, 'Phase 15 CA reports + business/personal split'),
  ('ai_suggestions',   1, 'Phase 11 suggestion engine')
ON DUPLICATE KEY UPDATE
  is_enabled  = VALUES(is_enabled),
  description = VALUES(description);

-- Default branding / app settings
INSERT INTO app_settings (setting_key, setting_value, is_public) VALUES
  ('app_title',     '"SparowVault"',         1),
  ('logo_url',      '""',                    1),
  ('favicon_url',   '""',                    1),
  ('support_email', '"support@example.com"', 1),
  ('privacy_url',   '"/privacy"',            1),
  ('terms_url',     '"/terms"',              1),
  ('theme_accent',  '"#0ea5e9"',             1),
  ('theme_primary', '"#1d4ed8"',             1)
ON DUPLICATE KEY UPDATE
  setting_value = VALUES(setting_value),
  is_public     = VALUES(is_public);


-- ============================================================================
-- SECTION 13: SEED ADMIN USER (default PIN 12345678 â€” change immediately!)
-- ============================================================================
-- Hash generated with: password_hash("12345678:seed", PASSWORD_BCRYPT, ["cost"=>12])
-- ============================================================================
INSERT INTO users (id, username, display_name, pin_hash, pin_salt, role, is_active, must_change_pin)
SELECT 'admin_seed_001', 'admin', 'Platform Admin',
       '$2y$12$FqIIvM4sok70cXgH9Ufuf.7xKeFch4kXAK6ArhLZtIf2RoPvHUXPS',
       'seed', 'admin', 1, 1
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM users WHERE role = 'admin' LIMIT 1);

-- If you have legacy cloud_users data, copy it into the canonical users table.
INSERT INTO users (id, username, display_name, pin_hash, pin_salt, role, is_active, created_at, updated_at)
SELECT cu.id, cu.username, cu.display_name, cu.pin_hash, cu.pin_salt, 'user', 1, cu.created_at, cu.updated_at
FROM cloud_users cu
LEFT JOIN users u ON u.id = cu.id
WHERE u.id IS NULL;


-- ============================================================================
-- SECTION 14: SCHEMA VERSION MARKERS â€” record every phase as applied
-- ============================================================================
INSERT INTO schema_version (version_key) VALUES
  ('phase_00_baseline_2026_05_13'),
  ('phase_01_security_2026_05_13'),
  ('phase_03_cloud_amount_paise_2026_05_13'),
  ('phase_04_indexed_sync_fields_2026_05_13'),
  ('phase_05_financial_ledger_2026_05_13'),
  ('phase_07_user_credit_cards_2026_05_13'),
  ('phase_08_user_loans_2026_05_13'),
  ('phase_09_udhari_engine_2026_05_13'),
  ('phase_11_ai_suggestions_2026_05_13'),
  ('phase_13_privacy_audit_2026_05_13'),
  ('phase_14_saas_billing_2026_05_13'),
  ('phase_full_database_bootstrap_2026_05_13')
ON DUPLICATE KEY UPDATE applied_at = applied_at;


-- ============================================================================
-- DONE. Re-enable FK validation.
-- ============================================================================
SET FOREIGN_KEY_CHECKS = 1;


-- ============================================================================
-- POST-IMPORT VERIFICATION QUERIES
-- ============================================================================
-- After import, paste these into phpMyAdmin â†’ SQL tab to verify:
--
-- 1. Confirm 12 phase markers:
--    SELECT version_key, applied_at FROM schema_version ORDER BY applied_at;
--
-- 2. Confirm 24 tables exist:
--    SELECT TABLE_NAME FROM information_schema.TABLES
--     WHERE TABLE_SCHEMA = DATABASE() ORDER BY TABLE_NAME;
--    Expected:
--      ai_suggestions
--      api_rate_limits
--      app_settings
--      audit_logs
--      admin_audit_logs
--      cloud_collection_rows
--      cloud_users
--      feature_flags_global
--      financial_effects
--      financial_events
--      login_attempts
--      payments
--      plan_features
--      plan_prices
--      plans
--      retention_jobs
--      schema_version
--      subscriptions
--      udhari_entries
--      udhari_people
--      udhari_settlements
--      user_audit_logs
--      user_credit_cards
--      user_loan_payments
--      user_loans
--      user_policy_acceptances
--      user_security_recovery
--      users
--      webhook_events
--
-- 3. Confirm admin user exists:
--    SELECT username, role, is_active, must_change_pin FROM users WHERE role = 'admin';
--    Default PIN is 12345678. CHANGE IT FROM THE ADMIN PANEL ON FIRST LOGIN.
--
-- 4. Confirm 4 plans:
--    SELECT code, name, price_inr, billing_interval, is_active FROM plans ORDER BY sort_order;
-- ============================================================================
