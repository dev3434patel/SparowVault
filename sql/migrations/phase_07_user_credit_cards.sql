-- Phase 7 — Optional denormalized credit-card shadow rows (server analytics / sync hooks).
-- Client source of truth remains cloud_collection_rows (cards) + financial_effects.
-- Run once per environment after phase_05.

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
  interest_rate_bps          INT UNSIGNED  NOT NULL DEFAULT 0 COMMENT 'APR * 100, e.g. 18.99% = 1899',
  annual_fee_paise             BIGINT        NOT NULL DEFAULT 0,
  is_active                  TINYINT(1)    NOT NULL DEFAULT 1,
  deleted_at                 DATETIME      NULL,
  created_at                 DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at                 DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_user_cc_user_active (user_id, is_active, deleted_at),
  CONSTRAINT fk_user_cc_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Phase 7 shadow metrics per card; populated by batch job or future sync';
