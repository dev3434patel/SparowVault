-- Apply before deploying atomic financial writes. No DDL runs in write transactions.
CREATE TABLE IF NOT EXISTS financial_write_receipts (
  user_id VARCHAR(191) NOT NULL,
  mutation_id VARCHAR(128) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  request_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  response_json LONGTEXT NOT NULL,
  http_status SMALLINT UNSIGNED NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, mutation_id),
  CONSTRAINT fk_write_receipt_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS financial_entity_tombstones (
  user_id VARCHAR(191) NOT NULL,
  collection_name VARCHAR(64) NOT NULL,
  entity_id VARCHAR(191) NOT NULL,
  deleted_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, collection_name, entity_id),
  CONSTRAINT fk_write_tombstone_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
