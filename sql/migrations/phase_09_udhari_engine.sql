-- Phase 9 — Optional server-side udhari shadow (people / entries / settlements).
-- App source of truth remains cloud collections: udhari, udhariSettlements, transactions.

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
  COMMENT='Phase 9 informal lending person rollups';

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
  CONSTRAINT fk_udhari_ent_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
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
  CONSTRAINT fk_udhari_set_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_udhari_set_person FOREIGN KEY (person_id) REFERENCES udhari_people(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_udhari_set_entry FOREIGN KEY (udhari_entry_id) REFERENCES udhari_entries(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Phase 9 settlement lines';
