-- =============================================================================
-- SparowVault — ALL PHASES COMBINED MIGRATION
-- =============================================================================
--   Generated 2026-05-13.
--   Combines: phase_01 → phase_03 → phase_04 → phase_05 → phase_07
--             → phase_08 → phase_09 → phase_11 → phase_13 → phase_14.
--
--   Safe properties:
--     • Idempotent: every table uses CREATE TABLE IF NOT EXISTS; every column
--       and index is wrapped by an information_schema-guard procedure.
--     • Re-runnable: existing rows are never touched; only structure is added.
--     • Order-correct: tables come before the migrations that FK to them.
--     • schema_version bookkeeping at the end of each block so you can verify
--       what's applied with: SELECT * FROM schema_version;
--
--   Usage:
--     mysql -h $DB_HOST -P $DB_PORT -u $DB_USER -p$DB_PASS $DB_NAME \
--           < sql/migrations/all_phases_combined.sql
--
--   Or in MySQL Workbench / phpMyAdmin: open file, click Run.
--
--   Pre-condition: the base SparowVault schema must already exist.
--   If you're starting empty, run sql/production_schema.sql FIRST, then this.
--
--   Rollback: sql/migrations/all_phases_combined_rollback.sql
-- =============================================================================

-- 0. schema_version is the source of truth for "what's applied".
CREATE TABLE IF NOT EXISTS schema_version (
  version_key VARCHAR(64) PRIMARY KEY,
  applied_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 0. Shared idempotency helpers — used by every phase below.
DELIMITER //

DROP PROCEDURE IF EXISTS sv_add_column_if_missing//
CREATE PROCEDURE sv_add_column_if_missing(
  IN tbl  VARCHAR(64),
  IN col  VARCHAR(64),
  IN spec VARCHAR(1024)
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

DROP PROCEDURE IF EXISTS sv_add_index_if_missing//
CREATE PROCEDURE sv_add_index_if_missing(
  IN tbl VARCHAR(64),
  IN idx VARCHAR(64),
  IN ddl VARCHAR(4096)
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


-- =============================================================================
-- PHASE 1 — Security launch blockers
-- =============================================================================
-- payments: expected_amount_paise + currency + unique indexes
-- users:    must_change_pin + deleted_at + deleted_reason + idx_users_deleted
-- =============================================================================

CALL sv_add_column_if_missing(
  'payments', 'expected_amount_paise',
  'BIGINT UNSIGNED NULL COMMENT "amount in paise at order creation; used to validate captured event"'
);
CALL sv_add_column_if_missing(
  'payments', 'captured_amount_paise',
  'BIGINT UNSIGNED NULL COMMENT "validated captured payment amount in paise from provider webhook"'
);
CALL sv_add_column_if_missing(
  'payments', 'currency',
  'VARCHAR(10) NOT NULL DEFAULT "INR"'
);
CALL sv_add_index_if_missing(
  'payments', 'uq_pay_provider_order_id',
  'ALTER TABLE `payments` ADD UNIQUE KEY `uq_pay_provider_order_id` (`provider`, `provider_order_id`)'
);
CALL sv_add_index_if_missing(
  'payments', 'uq_pay_provider_payment_id',
  'ALTER TABLE `payments` ADD UNIQUE KEY `uq_pay_provider_payment_id` (`provider`, `provider_payment_id`)'
);

CALL sv_add_column_if_missing(
  'users', 'must_change_pin',
  'TINYINT(1) NOT NULL DEFAULT 0 COMMENT "client must force a PIN change before any other admin action"'
);
CALL sv_add_column_if_missing(
  'users', 'deleted_at',
  'DATETIME NULL COMMENT "self-service or admin soft-delete timestamp"'
);
CALL sv_add_column_if_missing(
  'users', 'deleted_reason',
  'VARCHAR(120) NULL COMMENT "self|admin|abuse|inactive — for audit"'
);
CALL sv_add_index_if_missing(
  'users', 'idx_users_deleted',
  'ALTER TABLE `users` ADD KEY `idx_users_deleted` (`deleted_at`)'
);

INSERT IGNORE INTO schema_version (version_key) VALUES ('phase_01_security_2026_05_13');


-- =============================================================================
-- PHASE 3 — Paise on cloud_collection_rows  (NOW IDEMPOTENT)
-- =============================================================================
-- amount_paise stored alongside payload so reports can aggregate without
-- parsing JSON. Phase 4 adds many more columns; Phase 3 just lands amount_paise.
-- =============================================================================

CALL sv_add_column_if_missing(
  'cloud_collection_rows', 'amount_paise',
  'BIGINT NULL DEFAULT NULL COMMENT "primary monetary amount in paise (e.g. transactions)"'
);

INSERT IGNORE INTO schema_version (version_key) VALUES ('phase_03_cloud_amount_paise_2026_05_13');


-- =============================================================================
-- PHASE 4 — Indexed sync columns + payload hash  (NOW IDEMPOTENT)
-- =============================================================================
-- Hot columns extracted from payload at push time for fast reports.
-- =============================================================================

CALL sv_add_column_if_missing(
  'cloud_collection_rows', 'schema_version',
  'INT NOT NULL DEFAULT 1 COMMENT "payload schema / client version"'
);
CALL sv_add_column_if_missing('cloud_collection_rows', 'txn_local_date',       'DATE NULL');
CALL sv_add_column_if_missing('cloud_collection_rows', 'txn_month',            'CHAR(7) NULL');
CALL sv_add_column_if_missing('cloud_collection_rows', 'txn_type',             'VARCHAR(32) NULL');
CALL sv_add_column_if_missing('cloud_collection_rows', 'payment_mode',         'VARCHAR(32) NULL');
CALL sv_add_column_if_missing('cloud_collection_rows', 'category_id',          'VARCHAR(191) NULL');
CALL sv_add_column_if_missing('cloud_collection_rows', 'account_id',           'VARCHAR(191) NULL');
CALL sv_add_column_if_missing('cloud_collection_rows', 'card_id',              'VARCHAR(191) NULL');
CALL sv_add_column_if_missing('cloud_collection_rows', 'loan_id',              'VARCHAR(191) NULL');
CALL sv_add_column_if_missing('cloud_collection_rows', 'goal_id',              'VARCHAR(191) NULL');
CALL sv_add_column_if_missing('cloud_collection_rows', 'udhari_id',            'VARCHAR(191) NULL');
CALL sv_add_column_if_missing('cloud_collection_rows', 'business_or_personal', 'VARCHAR(32) NULL');
CALL sv_add_column_if_missing('cloud_collection_rows', 'source_device_id',     'VARCHAR(191) NULL');
CALL sv_add_column_if_missing('cloud_collection_rows', 'payload_hash',         'CHAR(64) NULL COMMENT "SHA-256 hex of payload JSON"');

CALL sv_add_index_if_missing('cloud_collection_rows', 'idx_ccr_uid_coll_txn_date',
  'ALTER TABLE `cloud_collection_rows` ADD KEY `idx_ccr_uid_coll_txn_date` (`user_id`, `collection_name`, `txn_local_date`)');
CALL sv_add_index_if_missing('cloud_collection_rows', 'idx_ccr_uid_cat_month',
  'ALTER TABLE `cloud_collection_rows` ADD KEY `idx_ccr_uid_cat_month` (`user_id`, `category_id`, `txn_month`)');
CALL sv_add_index_if_missing('cloud_collection_rows', 'idx_ccr_uid_card_txn_date',
  'ALTER TABLE `cloud_collection_rows` ADD KEY `idx_ccr_uid_card_txn_date` (`user_id`, `card_id`, `txn_local_date`)');
CALL sv_add_index_if_missing('cloud_collection_rows', 'idx_ccr_uid_loan_txn_date',
  'ALTER TABLE `cloud_collection_rows` ADD KEY `idx_ccr_uid_loan_txn_date` (`user_id`, `loan_id`, `txn_local_date`)');
CALL sv_add_index_if_missing('cloud_collection_rows', 'idx_ccr_uid_goal_txn_date',
  'ALTER TABLE `cloud_collection_rows` ADD KEY `idx_ccr_uid_goal_txn_date` (`user_id`, `goal_id`, `txn_local_date`)');
CALL sv_add_index_if_missing('cloud_collection_rows', 'idx_ccr_uid_amount_paise',
  'ALTER TABLE `cloud_collection_rows` ADD KEY `idx_ccr_uid_amount_paise` (`user_id`, `amount_paise`)');

INSERT IGNORE INTO schema_version (version_key) VALUES ('phase_04_indexed_sync_fields_2026_05_13');


-- =============================================================================
-- PHASE 5 — Financial event / effect ledger
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
  interest_rate_bps          INT UNSIGNED  NOT NULL DEFAULT 0 COMMENT 'APR * 100',
  annual_fee_paise           BIGINT        NOT NULL DEFAULT 0,
  is_active                  TINYINT(1)    NOT NULL DEFAULT 1,
  deleted_at                 DATETIME      NULL,
  created_at                 DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at                 DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_user_cc_user_active (user_id, is_active, deleted_at),
  CONSTRAINT fk_user_cc_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Phase 7 shadow metrics per card';

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
  annual_interest_bps          INT UNSIGNED  NOT NULL DEFAULT 0 COMMENT 'APR * 100',
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Phase 8 loan shadow';

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
  CONSTRAINT fk_user_loan_pay_user FOREIGN KEY (user_id) REFERENCES users(id)         ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_user_loan_pay_loan FOREIGN KEY (loan_id) REFERENCES user_loans(id)    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Phase 8 EMI payment ledger';

INSERT IGNORE INTO schema_version (version_key) VALUES ('phase_08_user_loans_2026_05_13');


-- =============================================================================
-- PHASE 9 — Udhari engine (people / entries / settlements)
-- =============================================================================

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
  COMMENT='Phase 9 udhari people rollups';

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Phase 9 udhari line items';

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
  KEY idx_udhari_set_user (user_id),
  CONSTRAINT fk_udhari_set_user   FOREIGN KEY (user_id)         REFERENCES users(id)           ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_udhari_set_person FOREIGN KEY (person_id)       REFERENCES udhari_people(id)   ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_udhari_set_entry  FOREIGN KEY (udhari_entry_id) REFERENCES udhari_entries(id)  ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Phase 9 settlement lines';

INSERT IGNORE INTO schema_version (version_key) VALUES ('phase_09_udhari_engine_2026_05_13');


-- =============================================================================
-- PHASE 11 — AI suggestion shadow
-- =============================================================================

CREATE TABLE IF NOT EXISTS ai_suggestions (
  id                        VARCHAR(191)  NOT NULL,
  user_id                   VARCHAR(191)  NOT NULL,
  dedupe_key                VARCHAR(191)  NOT NULL DEFAULT '' COMMENT 'idempotency key per engine rule',
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
  ai_explanation            VARCHAR(2000) NULL COMMENT 'optional LLM copy; must not alter numbers',
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
  COMMENT='Phase 11 rule-backed suggestions';

INSERT IGNORE INTO schema_version (version_key) VALUES ('phase_11_ai_suggestions_2026_05_13');


-- =============================================================================
-- PHASE 13 — Privacy / audit / retention
-- =============================================================================

CREATE TABLE IF NOT EXISTS user_policy_acceptances (
  id           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id      VARCHAR(191)    NOT NULL,
  policy_key   VARCHAR(64)     NOT NULL  COMMENT 'terms | privacy | cookie | data_processing',
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
  CONSTRAINT fk_ual_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE
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

CALL sv_add_column_if_missing(
  'users', 'last_policy_check_at',
  'DATETIME NULL COMMENT "when policy versions were last checked on login"'
);
CALL sv_add_column_if_missing(
  'users', 'mobile_e164',
  'VARCHAR(20) NULL COMMENT "PII — encrypt at app layer"'
);
CALL sv_add_column_if_missing(
  'users', 'email_lc',
  'VARCHAR(254) NULL COMMENT "lowercased email for lookup"'
);

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Historical pricing per plan';

CALL sv_add_column_if_missing(
  'plan_features', 'limit_value',
  'BIGINT NULL COMMENT "numeric quota (e.g. 500 transactions/month)"'
);
CALL sv_add_column_if_missing(
  'plan_features', 'limit_unit',
  'VARCHAR(32) NULL COMMENT "per_month | per_day | total | mb | seconds"'
);

CALL sv_add_column_if_missing(
  'subscriptions', 'previous_period_end',
  'DATETIME NULL COMMENT "fair early renewal — extend from here, not NOW()"'
);
CALL sv_add_column_if_missing(
  'subscriptions', 'renewed_from_subscription_id',
  'BIGINT UNSIGNED NULL COMMENT "FK-soft to prior subscription"'
);
CALL sv_add_column_if_missing(
  'subscriptions', 'scheduled_plan_id',
  'BIGINT UNSIGNED NULL COMMENT "downgrade scheduled for next period"'
);
CALL sv_add_column_if_missing(
  'subscriptions', 'scheduled_change_at',
  'DATETIME NULL COMMENT "when the scheduled plan change takes effect"'
);

INSERT IGNORE INTO schema_version (version_key) VALUES ('phase_14_saas_billing_2026_05_13');


-- =============================================================================
-- Cleanup — drop the helper procedures so they aren't left hanging.
-- =============================================================================
DROP PROCEDURE IF EXISTS sv_add_column_if_missing;
DROP PROCEDURE IF EXISTS sv_add_index_if_missing;


-- =============================================================================
-- Summary — run this query after the import to confirm every phase applied.
-- =============================================================================
--   SELECT version_key, applied_at FROM schema_version
--    WHERE version_key LIKE 'phase_%'
--    ORDER BY applied_at, version_key;
--
-- Expected: 10 rows
--   phase_01_security
--   phase_03_cloud_amount_paise
--   phase_04_indexed_sync_fields
--   phase_05_financial_ledger
--   phase_07_user_credit_cards
--   phase_08_user_loans
--   phase_09_udhari_engine
--   phase_11_ai_suggestions
--   phase_13_privacy_audit
--   phase_14_saas_billing
-- =============================================================================
