-- Phase 8 — Optional server-side loan shadow + payment rows (analytics / future sync).
-- Canonical data remains cloud_collection_rows (loans, emis).

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
  COMMENT='Phase 8 EMI line shadow; mirrors emis collection when synced';
