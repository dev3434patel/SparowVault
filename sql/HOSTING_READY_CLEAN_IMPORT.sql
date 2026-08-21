-- ============================================================================
-- SparowVault — HOSTING-READY CLEAN DATABASE IMPORT
-- Version: 2.0 | Fresh install only | No test / E2E user data
-- ============================================================================
-- USE THIS FILE for a brand-new empty hosting database (cPanel / phpMyAdmin / mysql CLI).
--
-- WHAT YOU GET:
--   • Full production schema (users, cloud sync, ledger, cards, loans, udhari,
--     SaaS plans, financial_mutation_keys idempotency, etc.)
--   • Seed: subscription plans + feature flags + public app settings
--   • Seed admin account (CHANGE PIN IMMEDIATELY after first login):
--       username: admin
--       PIN:      12345678
--
-- WHAT YOU DO NOT GET:
--   • No E2E / certification / Alice-Bob test users
--   • No sample transactions
--
-- IMPORT STEPS:
--   1. Create empty DB (utf8mb4_unicode_ci), e.g. sparowvault
--   2. phpMyAdmin → Import → choose this file → Go
--   OR: mysql -u USER -p DBNAME < HOSTING_READY_CLEAN_IMPORT.sql
--
-- SAFE TO RE-RUN on empty/partial installs (IF NOT EXISTS / ON DUPLICATE KEY).
-- Do NOT use as an upgrade on a live DB that already has real users —
-- use sql/migrations/ for upgrades instead.
-- ============================================================================

SET NAMES utf8mb4;
SET time_zone = '+00:00';
SET FOREIGN_KEY_CHECKS = 0;

-- ============================================================================
-- TABLE: users
-- Central user store. Handles both end-users and admin accounts.
-- Indexed for fast username lookup, role checks, and activity queries.
-- ============================================================================
CREATE TABLE IF NOT EXISTS users (
  id              VARCHAR(191)          NOT NULL,
  username        VARCHAR(24)           NOT NULL,
  display_name    VARCHAR(60)           NOT NULL,
  pin_hash        VARCHAR(255)          NOT NULL  COMMENT 'bcrypt hash of pin:salt',
  pin_salt        VARCHAR(64)           NOT NULL  COMMENT 'hex random bytes',
  role            ENUM('user','admin')  NOT NULL  DEFAULT 'user',
  is_active       TINYINT(1)            NOT NULL  DEFAULT 1,
  last_login_at   DATETIME              NULL      COMMENT 'updated on every successful auth',
  must_change_pin TINYINT(1)            NOT NULL  DEFAULT 0,
  deleted_at      DATETIME              NULL,
  deleted_reason  VARCHAR(120)          NULL,
  last_policy_check_at DATETIME         NULL,
  mobile          VARCHAR(20)           NULL,
  email           VARCHAR(254)          NULL,
  mobile_e164     VARCHAR(20)           NULL,
  email_lc        VARCHAR(254)          NULL,
  avatar_emoji    VARCHAR(16)           NULL,
  avatar_color    VARCHAR(32)           NULL,
  created_at      DATETIME              NOT NULL  DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME              NOT NULL  DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_username (username),
  KEY idx_users_role_active (role, is_active),
  KEY idx_users_deleted (deleted_at),
  KEY idx_users_created_at  (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='All platform users including admins';


-- ============================================================================
-- TABLE: cloud_collection_rows
-- Generic JSON blob storage for all user financial data collections.
-- One row per entity per user. ON DELETE CASCADE ensures clean user deletes.
-- Payload is a LONGTEXT JSON blob mirroring the frontend TypeScript types.
-- ============================================================================
CREATE TABLE IF NOT EXISTS cloud_collection_rows (
  id              VARCHAR(191)  NOT NULL,
  user_id         VARCHAR(191)  NOT NULL  COMMENT 'FK → users.id',
  collection_name VARCHAR(64)   NOT NULL  COMMENT 'e.g. accounts, transactions, goals',
  entity_id       VARCHAR(191)  NOT NULL  COMMENT 'frontend-generated UUID',
  payload         LONGTEXT      NOT NULL  COMMENT 'full JSON of the entity',
  amount_paise    BIGINT        NULL      COMMENT 'denormalized primary amount in paise when applicable',
  updated_at      DATETIME      NOT NULL  COMMENT 'from entity.updatedAt',
  deleted_at      DATETIME      NULL      COMMENT 'soft-delete timestamp',
  created_at      DATETIME      NOT NULL  DEFAULT CURRENT_TIMESTAMP,
  schema_version  INT           NOT NULL  DEFAULT 1 COMMENT 'payload schema / client version',
  txn_local_date  DATE          NULL      COMMENT 'transaction calendar date (UTC extraction)',
  txn_month       CHAR(7)       NULL      COMMENT 'YYYY-MM for reporting',
  txn_type        VARCHAR(32)   NULL,
  payment_mode    VARCHAR(32)   NULL,
  category_id     VARCHAR(191)  NULL,
  account_id      VARCHAR(191)  NULL,
  card_id         VARCHAR(191)  NULL,
  loan_id         VARCHAR(191)  NULL,
  goal_id         VARCHAR(191)  NULL,
  udhari_id       VARCHAR(191)  NULL,
  business_or_personal VARCHAR(32) NULL,
  source_device_id VARCHAR(191) NULL,
  payload_hash    CHAR(64)      NULL      COMMENT 'SHA-256 hex of stored JSON payload',
  PRIMARY KEY (id),
  UNIQUE KEY uq_collection_entity (user_id, collection_name, entity_id),
  KEY idx_col_user_collection (user_id, collection_name),
  KEY idx_col_user_updated    (user_id, updated_at),
  KEY idx_col_deleted         (deleted_at),
  KEY idx_ccr_uid_coll_txn_date (user_id, collection_name, txn_local_date),
  KEY idx_ccr_uid_cat_month (user_id, category_id, txn_month),
  KEY idx_ccr_uid_card_txn_date (user_id, card_id, txn_local_date),
  KEY idx_ccr_uid_loan_txn_date (user_id, loan_id, txn_local_date),
  KEY idx_ccr_uid_goal_txn_date (user_id, goal_id, txn_local_date),
  KEY idx_ccr_uid_amount_paise (user_id, amount_paise),
  CONSTRAINT fk_ccr_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Generic entity storage for all user finance collections';


-- ============================================================================
-- TABLE: financial_events
-- Phase 5 — canonical money-movement ledger (derived from transactions).
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
  KEY idx_fin_ev_user_date (user_id, event_date),
  KEY idx_fin_ev_user_status (user_id, status),
  CONSTRAINT fk_fin_ev_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Financial ledger events';


-- ============================================================================
-- TABLE: financial_effects
-- Phase 5 — per-target deltas for an event.
-- ============================================================================
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
  CONSTRAINT fk_fin_ef_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Ledger effects per event';


-- ============================================================================
-- TABLE: financial_mutation_keys (vNext mutation idempotency)
-- ============================================================================
CREATE TABLE IF NOT EXISTS financial_mutation_keys (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id VARCHAR(64) NOT NULL,
  mutation_id VARCHAR(128) NOT NULL,
  collection_name VARCHAR(64) NOT NULL,
  entity_id VARCHAR(64) NOT NULL,
  operation VARCHAR(32) NOT NULL DEFAULT 'create',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_fin_mut_user_mutation (user_id, mutation_id),
  KEY idx_fin_mut_entity (user_id, collection_name, entity_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Idempotent financial mutation keys (userId + mutationId)';


-- ============================================================================
-- TABLE: user_credit_cards (Phase 7 shadow metrics; optional server-side cache)
-- ============================================================================
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
  interest_rate_bps          INT UNSIGNED  NOT NULL DEFAULT 0 COMMENT 'APR * 100',
  annual_fee_paise             BIGINT        NOT NULL DEFAULT 0,
  is_active                  TINYINT(1)    NOT NULL DEFAULT 1,
  deleted_at                 DATETIME      NULL,
  created_at                 DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at                 DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_user_cc_user_active (user_id, is_active, deleted_at),
  CONSTRAINT fk_user_cc_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Denormalized card metrics; app primary source remains cards collection + ledger';


-- ============================================================================
-- TABLE: user_loans (Phase 8 loan shadow metrics; optional server-side cache)
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_loans (
  id                           VARCHAR(191)  NOT NULL,
  user_id                      VARCHAR(191)  NOT NULL,
  loan_name                    VARCHAR(120)  NOT NULL DEFAULT '',
  lender_name                  VARCHAR(120)  NOT NULL DEFAULT '',
  loan_type                    VARCHAR(32)   NOT NULL DEFAULT 'personal',
  principal_sanctioned_paise   BIGINT        NOT NULL DEFAULT 0,
  disbursed_amount_paise       BIGINT        NOT NULL DEFAULT 0,
  current_principal_paise      BIGINT        NOT NULL DEFAULT 0,
  annual_interest_bps          INT UNSIGNED  NOT NULL DEFAULT 0 COMMENT 'APR * 100',
  interest_type                VARCHAR(32)   NOT NULL DEFAULT 'reducing_balance',
  emi_amount_paise              BIGINT        NOT NULL DEFAULT 0,
  original_tenure_months       INT UNSIGNED  NOT NULL DEFAULT 0,
  remaining_tenure_months      INT UNSIGNED  NOT NULL DEFAULT 0,
  start_date                   DATE          NULL,
  first_emi_date               DATE          NULL,
  due_day                      TINYINT UNSIGNED NOT NULL DEFAULT 1,
  processing_fee_paise           BIGINT        NOT NULL DEFAULT 0,
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Phase 8 loan shadow metrics';

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
  CONSTRAINT fk_user_loan_pay_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_user_loan_pay_loan FOREIGN KEY (loan_id) REFERENCES user_loans(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Phase 8 EMI line shadow';


-- ============================================================================
-- TABLE: udhari_people (Phase 9 informal lending shadow)
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
  CONSTRAINT fk_udhari_people_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Phase 9 udhari person rollups';

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
  CONSTRAINT fk_udhari_ent_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_udhari_ent_person FOREIGN KEY (person_id) REFERENCES udhari_people(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Phase 9 udhari entries';

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
  CONSTRAINT fk_udhari_set_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_udhari_set_person FOREIGN KEY (person_id) REFERENCES udhari_people(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_udhari_set_entry FOREIGN KEY (udhari_entry_id) REFERENCES udhari_entries(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Phase 9 settlement lines';


-- ============================================================================
-- TABLE: ai_suggestions (Phase 11 — explainable suggestions; JSON = facts only)
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
  CONSTRAINT fk_ai_suggestions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Phase 11 suggestion engine rows';


-- ============================================================================
-- TABLE: plans
-- Subscription plans. Supports monthly + yearly with trial periods.
-- ============================================================================
CREATE TABLE IF NOT EXISTS plans (
  id               BIGINT UNSIGNED       NOT NULL AUTO_INCREMENT,
  code             VARCHAR(64)           NOT NULL  COMMENT 'e.g. BASIC, PRO, PRO_YEARLY',
  name             VARCHAR(120)          NOT NULL,
  description      TEXT                  NULL,
  price_inr        DECIMAL(10,2)         NOT NULL  DEFAULT 0.00,
  billing_interval ENUM('monthly','yearly') NOT NULL DEFAULT 'monthly',
  trial_days       INT                   NOT NULL  DEFAULT 0,
  is_active        TINYINT(1)            NOT NULL  DEFAULT 1,
  sort_order       INT                   NOT NULL  DEFAULT 0  COMMENT 'for display ordering',
  created_at       DATETIME              NOT NULL  DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME              NOT NULL  DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_plans_code        (code),
  KEY idx_plans_active_interval   (is_active, billing_interval),
  KEY idx_plans_sort              (sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Subscription plans available on the platform';


-- ============================================================================
-- TABLE: plan_features
-- Per-plan feature flags. Controls what features each plan unlocks.
-- ============================================================================
CREATE TABLE IF NOT EXISTS plan_features (
  id           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  plan_id      BIGINT UNSIGNED NOT NULL,
  feature_key  VARCHAR(191)    NOT NULL,
  is_enabled   TINYINT(1)      NOT NULL DEFAULT 0,
  created_at   DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_plan_feature          (plan_id, feature_key),
  KEY idx_plan_features_feature_key   (feature_key),
  CONSTRAINT fk_plan_features_plan
    FOREIGN KEY (plan_id) REFERENCES plans(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Feature entitlements per plan';


-- ============================================================================
-- TABLE: subscriptions
-- User subscription state. One active subscription per user at a time.
-- ============================================================================
CREATE TABLE IF NOT EXISTS subscriptions (
  id                      BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id                 VARCHAR(191)    NOT NULL,
  plan_id                 BIGINT UNSIGNED NOT NULL,
  status                  ENUM('pending','trial','active','past_due','cancelled','expired')
                                          NOT NULL DEFAULT 'pending',
  trial_ends_at           DATETIME        NULL,
  current_period_start    DATETIME        NULL,
  current_period_end      DATETIME        NULL,
  cancel_at_period_end    TINYINT(1)      NOT NULL DEFAULT 0,
  cancelled_at            DATETIME        NULL,
  provider                ENUM('razorpay','manual') NOT NULL DEFAULT 'razorpay',
  provider_subscription_id VARCHAR(191)   NULL,
  provider_customer_id     VARCHAR(191)   NULL,
  provider_order_id        VARCHAR(191)   NULL,
  notes                   TEXT            NULL     COMMENT 'admin notes',
  created_at              DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at              DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_sub_user_status         (user_id, status),
  KEY idx_sub_period_end          (current_period_end),
  KEY idx_sub_provider_sub_id     (provider_subscription_id),
  KEY idx_sub_provider_order_id   (provider_order_id),
  CONSTRAINT fk_sub_user
    FOREIGN KEY (user_id)  REFERENCES users(id)  ON DELETE CASCADE  ON UPDATE CASCADE,
  CONSTRAINT fk_sub_plan
    FOREIGN KEY (plan_id)  REFERENCES plans(id)  ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='User subscription records';


-- ============================================================================
-- TABLE: payments
-- Individual payment records linked to subscriptions.
-- ============================================================================
CREATE TABLE IF NOT EXISTS payments (
  id                   BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id              VARCHAR(191)    NOT NULL,
  subscription_id      BIGINT UNSIGNED NULL,
  amount_inr           DECIMAL(10,2)   NOT NULL,
  currency             VARCHAR(10)     NOT NULL DEFAULT 'INR',
  expected_amount_paise BIGINT UNSIGNED NULL,
  captured_amount_paise BIGINT UNSIGNED NULL,
  status               ENUM('created','authorized','captured','failed','refunded')
                                       NOT NULL DEFAULT 'created',
  provider             ENUM('razorpay','manual') NOT NULL DEFAULT 'razorpay',
  provider_order_id    VARCHAR(191)    NOT NULL,
  provider_payment_id  VARCHAR(191)    NULL,
  provider_signature   VARCHAR(512)    NULL,
  failure_reason       TEXT            NULL,
  refund_id            VARCHAR(191)    NULL,
  paid_at              DATETIME        NULL,
  created_at           DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at           DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_pay_user_status         (user_id, status),
  KEY idx_pay_provider_order      (provider_order_id),
  KEY idx_pay_provider_payment    (provider_payment_id),
  KEY idx_pay_paid_at             (paid_at),
  CONSTRAINT fk_pay_user
    FOREIGN KEY (user_id)          REFERENCES users(id)         ON DELETE CASCADE  ON UPDATE CASCADE,
  CONSTRAINT fk_pay_subscription
    FOREIGN KEY (subscription_id)  REFERENCES subscriptions(id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Individual payment records';


-- ============================================================================
-- TABLE: webhook_events
-- Idempotent webhook processing. event_id ensures no double-processing.
-- ============================================================================
CREATE TABLE IF NOT EXISTS webhook_events (
  id                BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  provider          ENUM('razorpay')  NOT NULL DEFAULT 'razorpay',
  event_id          VARCHAR(191)      NOT NULL  COMMENT 'provider event ID — unique',
  event_type        VARCHAR(191)      NOT NULL,
  signature_valid   TINYINT(1)        NOT NULL DEFAULT 0,
  payload_json      LONGTEXT          NOT NULL,
  processing_status ENUM('pending','processed','failed') NOT NULL DEFAULT 'pending',
  processed_at      DATETIME          NULL,
  error_message     TEXT              NULL,
  retry_count       TINYINT UNSIGNED  NOT NULL DEFAULT 0,
  created_at        DATETIME          NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_webhook_event_id       (event_id),
  KEY idx_webhook_provider_status      (provider, processing_status),
  KEY idx_webhook_created              (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Idempotent webhook event log';


-- ============================================================================
-- TABLE: app_settings
-- Key-value store for platform-wide branding and config.
-- is_public=1 rows are exposed via /api/public/config.php (no auth needed).
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
  CONSTRAINT fk_settings_updated_by
    FOREIGN KEY (updated_by_user_id) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Platform-wide settings (branding, config)';


-- ============================================================================
-- TABLE: feature_flags_global
-- Global feature flag overrides. Overrides per-plan features for everyone.
-- ============================================================================
CREATE TABLE IF NOT EXISTS feature_flags_global (
  id                  BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  feature_key         VARCHAR(191)    NOT NULL,
  is_enabled          TINYINT(1)      NOT NULL DEFAULT 0,
  description         VARCHAR(255)    NULL     COMMENT 'human-readable description',
  updated_by_user_id  VARCHAR(191)    NULL,
  updated_at          DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_at          DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_feature_key (feature_key),
  CONSTRAINT fk_flags_updated_by
    FOREIGN KEY (updated_by_user_id) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Global feature flags controlling platform-wide rollouts';


-- ============================================================================
-- TABLE: admin_audit_logs
-- Immutable log of every admin action. Never deleted. Used for compliance.
-- ============================================================================
CREATE TABLE IF NOT EXISTS admin_audit_logs (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  actor_user_id   VARCHAR(191)    NULL     COMMENT 'NULL if system action',
  actor_role      VARCHAR(32)     NOT NULL DEFAULT 'system',
  action_key      VARCHAR(191)    NOT NULL COMMENT 'e.g. USER_TOGGLED, PLAN_CREATED',
  entity_type     VARCHAR(191)    NOT NULL,
  entity_id       VARCHAR(191)    NOT NULL,
  before_json     LONGTEXT        NULL     COMMENT 'state before change',
  after_json      LONGTEXT        NULL     COMMENT 'state after change',
  ip_address      VARCHAR(64)     NOT NULL DEFAULT '',
  user_agent      VARCHAR(512)    NOT NULL DEFAULT '',
  created_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_aal_entity     (entity_type, entity_id),
  KEY idx_aal_actor      (actor_user_id, created_at),
  KEY idx_aal_action     (action_key),
  KEY idx_aal_created    (created_at),
  CONSTRAINT fk_aal_actor
    FOREIGN KEY (actor_user_id) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Immutable admin action audit trail';

CREATE TABLE IF NOT EXISTS audit_logs (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  actor_user_id   VARCHAR(191)    NULL,
  actor_role      VARCHAR(32)     NOT NULL DEFAULT 'system',
  action_key      VARCHAR(191)    NOT NULL,
  entity_type     VARCHAR(191)    NOT NULL DEFAULT '',
  entity_id       VARCHAR(191)    NOT NULL DEFAULT '',
  before_json     LONGTEXT        NULL,
  after_json      LONGTEXT        NULL,
  ip_address      VARCHAR(64)     NOT NULL DEFAULT '',
  user_agent      VARCHAR(512)    NOT NULL DEFAULT '',
  created_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_audit_actor_time (actor_user_id, created_at),
  KEY idx_audit_action     (action_key),
  KEY idx_audit_entity     (entity_type, entity_id),
  CONSTRAINT fk_audit_actor
    FOREIGN KEY (actor_user_id) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Application audit trail for user/system/security actions';

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
  CONSTRAINT fk_upa_user FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Per-user acceptance of policy versions';

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
  COMMENT='Per-user state-change audit trail';

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
  COMMENT='Retention sweep bookkeeping';


-- ============================================================================
-- TABLE: login_attempts
-- Tracks failed login attempts per username+IP for brute-force protection.
-- Atomic ON DUPLICATE KEY UPDATE prevents race conditions.
-- ============================================================================
CREATE TABLE IF NOT EXISTS login_attempts (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  username      VARCHAR(191)    NOT NULL,
  ip_address    VARCHAR(64)     NOT NULL,
  attempt_count INT             NOT NULL DEFAULT 0,
  locked_until  DATETIME        NULL,
  first_attempt_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_login_attempt      (username, ip_address),
  KEY idx_login_attempt_locked     (locked_until),
  KEY idx_login_attempt_updated    (updated_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Brute-force protection: failed login tracking';


-- ============================================================================
-- TABLE: api_rate_limits
-- MySQL-based rate limiting (replaces file-based rate_limits.json).
-- Atomic increment prevents race conditions under concurrent traffic.
-- ============================================================================
CREATE TABLE IF NOT EXISTS api_rate_limits (
  id           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  bucket_key   VARCHAR(191)    NOT NULL  COMMENT 'bucket_name|ip_address',
  hit_count    INT             NOT NULL  DEFAULT 0,
  window_start DATETIME        NOT NULL  DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME        NOT NULL  DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_rate_bucket_key  (bucket_key),
  KEY idx_rate_window_start      (window_start)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='API rate limiting — replaces file-based rate_limits.json';


-- ============================================================================
-- LEGACY COMPATIBILITY: cloud_users
-- Kept for migration only. All data already migrated to users table.
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
  COMMENT='Legacy table — kept for migration only, do not use';

-- Migrate any existing cloud_users into the main users table
INSERT INTO users (id, username, display_name, pin_hash, pin_salt, role, is_active, created_at, updated_at)
SELECT cu.id, cu.username, cu.display_name, cu.pin_hash, cu.pin_salt, 'user', 1, cu.created_at, cu.updated_at
FROM cloud_users cu
LEFT JOIN users u ON u.id = cu.id
WHERE u.id IS NULL;


-- ============================================================================
-- SEED DATA — Safe to re-run (ON DUPLICATE KEY UPDATE)
-- ============================================================================

-- Default subscription plans
INSERT INTO plans (code, name, description, price_inr, billing_interval, trial_days, is_active, sort_order)
VALUES
  ('FREE',       'Free',       'Basic personal finance tracking',              0.00,   'monthly', 0,  1, 1),
  ('BASIC',      'Basic',      'Unlimited transactions, budgets and goals',  299.00,  'monthly', 7,  1, 2),
  ('PRO',        'Pro',        'Advanced reports, export and alerts',         799.00,  'monthly', 7,  1, 3),
  ('PRO_YEARLY', 'Pro Yearly', 'Pro features at yearly discounted price',   7999.00,  'yearly',  14, 1, 4)
ON DUPLICATE KEY UPDATE
  name             = VALUES(name),
  description      = VALUES(description),
  price_inr        = VALUES(price_inr),
  billing_interval = VALUES(billing_interval),
  trial_days       = VALUES(trial_days),
  is_active        = VALUES(is_active),
  sort_order       = VALUES(sort_order);

-- Plan features: exports
INSERT INTO plan_features (plan_id, feature_key, is_enabled)
SELECT p.id, 'exports', CASE WHEN p.code IN ('PRO','PRO_YEARLY') THEN 1 ELSE 0 END
FROM plans p
ON DUPLICATE KEY UPDATE is_enabled = VALUES(is_enabled);

-- Plan features: advanced_reports
INSERT INTO plan_features (plan_id, feature_key, is_enabled)
SELECT p.id, 'advanced_reports', CASE WHEN p.code IN ('PRO','PRO_YEARLY') THEN 1 ELSE 0 END
FROM plans p
ON DUPLICATE KEY UPDATE is_enabled = VALUES(is_enabled);

-- Plan features: alerts
INSERT INTO plan_features (plan_id, feature_key, is_enabled)
SELECT p.id, 'alerts', CASE WHEN p.code IN ('BASIC','PRO','PRO_YEARLY') THEN 1 ELSE 0 END
FROM plans p
ON DUPLICATE KEY UPDATE is_enabled = VALUES(is_enabled);

-- Plan features: import
INSERT INTO plan_features (plan_id, feature_key, is_enabled)
SELECT p.id, 'import', CASE WHEN p.code IN ('BASIC','PRO','PRO_YEARLY') THEN 1 ELSE 0 END
FROM plans p
ON DUPLICATE KEY UPDATE is_enabled = VALUES(is_enabled);

-- Plan features: udhari
INSERT INTO plan_features (plan_id, feature_key, is_enabled)
SELECT p.id, 'udhari', 1 FROM plans p
ON DUPLICATE KEY UPDATE is_enabled = VALUES(is_enabled);

-- Global feature flags (platform-wide defaults)
INSERT INTO feature_flags_global (feature_key, is_enabled, description)
VALUES
  ('exports',          1, 'Allow users to export data to XLSX/CSV'),
  ('advanced_reports', 0, 'Advanced multi-period financial reports'),
  ('alerts',           1, 'Budget overrun, due-date and udhari alerts'),
  ('admin_panel',      1, 'Access to admin console at /admin'),
  ('branding',         1, 'Platform branding customisation'),
  ('import',           1, 'Bulk import from CSV/Excel'),
  ('subscriptions',    1, 'Razorpay subscription and payment flow')
ON DUPLICATE KEY UPDATE
  is_enabled  = VALUES(is_enabled),
  description = VALUES(description);

-- Default branding / app settings
INSERT INTO app_settings (setting_key, setting_value, is_public)
VALUES
  ('app_title',      '"SparowVault"',          1),
  ('logo_url',       '""',                      1),
  ('favicon_url',    '""',                      1),
  ('support_email',  '"support@example.com"',  1),
  ('privacy_url',    '"/privacy"',              1),
  ('terms_url',      '"/terms"',                1),
  ('theme_accent',   '"#0ea5e9"',               1),
  ('theme_primary',  '"#1d4ed8"',               1)
ON DUPLICATE KEY UPDATE
  setting_value = VALUES(setting_value),
  is_public     = VALUES(is_public);

-- ============================================================================
-- SEED ADMIN USER
-- Default PIN: 12345678  (change immediately after first login!)
-- Hash was generated with: password_hash("12345678:seed", PASSWORD_BCRYPT, ["cost"=>12])
-- ============================================================================
INSERT INTO users (id, username, display_name, pin_hash, pin_salt, role, is_active)
SELECT
  'admin_seed_001',
  'admin',
  'Platform Admin',
  '$2y$12$FqIIvM4sok70cXgH9Ufuf.7xKeFch4kXAK6ArhLZtIf2RoPvHUXPS',
  'seed',
  'admin',
  1
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM users WHERE role = 'admin' LIMIT 1);

-- ============================================================================
-- PERFORMANCE INDEXES (additional for large scale)
-- Safe to run even if indexes already exist — uses IF NOT EXISTS equivalent
-- ============================================================================

-- Speed up collection queries for high-traffic users
SET @idx := (SELECT COUNT(*) FROM information_schema.statistics
  WHERE table_schema = DATABASE() AND table_name = 'cloud_collection_rows'
  AND index_name = 'idx_ccr_collection_deleted');
SET @sql := IF(@idx = 0,
  'ALTER TABLE cloud_collection_rows ADD KEY idx_ccr_collection_deleted (user_id, collection_name, deleted_at)',
  'SELECT "index idx_ccr_collection_deleted already exists"');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Speed up subscription expiry checks (cron/webhook)
SET @idx := (SELECT COUNT(*) FROM information_schema.statistics
  WHERE table_schema = DATABASE() AND table_name = 'subscriptions'
  AND index_name = 'idx_sub_expires');
SET @sql := IF(@idx = 0,
  'ALTER TABLE subscriptions ADD KEY idx_sub_expires (status, current_period_end)',
  'SELECT "index idx_sub_expires already exists"');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================================
-- END OF SCHEMA
-- ============================================================================
