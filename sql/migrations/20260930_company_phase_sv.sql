-- SV14 hashed one-use invite tokens, SV27 bridge status, and the item subledger.
-- Does not alter personal finance tables. Safe to re-run.

CREATE TABLE IF NOT EXISTS company_invite_tokens (
  id VARCHAR(191) NOT NULL,
  company_id VARCHAR(191) NOT NULL,
  token_hash CHAR(64) NOT NULL,
  role_code VARCHAR(64) NOT NULL,
  created_by VARCHAR(191) NOT NULL,
  used_at DATETIME NULL,
  used_by VARCHAR(191) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_cit_hash (token_hash),
  KEY idx_cit_company (company_id),
  CONSTRAINT fk_cit_company FOREIGN KEY (company_id) REFERENCES company_workspaces(id) ON DELETE CASCADE,
  CONSTRAINT fk_cit_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT,
  CONSTRAINT fk_cit_used_by FOREIGN KEY (used_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET @bridge_col := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'company_cross_domain_links'
    AND COLUMN_NAME = 'bridge_status'
);
SET @bridge_sql := IF(
  @bridge_col = 0,
  'ALTER TABLE company_cross_domain_links ADD COLUMN bridge_status VARCHAR(32) NOT NULL DEFAULT ''PROPOSED'' AFTER link_type',
  'SELECT 1'
);
PREPARE bridge_stmt FROM @bridge_sql;
EXECUTE bridge_stmt;
DEALLOCATE PREPARE bridge_stmt;

CREATE TABLE IF NOT EXISTS company_items (
  id VARCHAR(191) NOT NULL,
  company_id VARCHAR(191) NOT NULL,
  name VARCHAR(191) NOT NULL,
  kind VARCHAR(16) NOT NULL,
  costing_method VARCHAR(32) NOT NULL DEFAULT 'weighted-average',
  qty INT NOT NULL DEFAULT 0,
  value_amount INT NOT NULL DEFAULT 0,
  cogs_amount INT NOT NULL DEFAULT 0,
  revenue_amount INT NOT NULL DEFAULT 0,
  active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  deleted_at DATETIME NULL,
  PRIMARY KEY (id),
  KEY idx_company_items_company (company_id, kind)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS company_cheques (
  id VARCHAR(191) NOT NULL,
  company_id VARCHAR(191) NOT NULL,
  status VARCHAR(16) NOT NULL,
  amount_paise BIGINT NOT NULL,
  expense_ledger_code VARCHAR(64) NOT NULL,
  issue_voucher_id VARCHAR(191) NULL,
  clear_voucher_id VARCHAR(191) NULL,
  fee_paise BIGINT NOT NULL DEFAULT 0,
  fee_voucher_id VARCHAR(191) NULL,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  PRIMARY KEY (id),
  KEY idx_company_cheques_company (company_id, status),
  KEY idx_company_cheques_issue (company_id, issue_voucher_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET @cheque_fee_col := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'company_cheques'
    AND COLUMN_NAME = 'fee_paise'
);
SET @cheque_fee_sql := IF(
  @cheque_fee_col = 0,
  'ALTER TABLE company_cheques ADD COLUMN fee_paise BIGINT NOT NULL DEFAULT 0',
  'SELECT 1'
);
PREPARE cheque_fee_stmt FROM @cheque_fee_sql;
EXECUTE cheque_fee_stmt;
DEALLOCATE PREPARE cheque_fee_stmt;
