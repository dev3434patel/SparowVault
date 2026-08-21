CREATE TABLE IF NOT EXISTS cloud_users (
  id VARCHAR(191) NOT NULL PRIMARY KEY,
  username VARCHAR(24) NOT NULL UNIQUE,
  display_name VARCHAR(60) NOT NULL,
  pin_hash VARCHAR(255) NOT NULL,
  pin_salt VARCHAR(64) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS cloud_collection_rows (
  id VARCHAR(191) NOT NULL PRIMARY KEY,
  user_id VARCHAR(191) NOT NULL,
  collection_name VARCHAR(64) NOT NULL,
  entity_id VARCHAR(191) NOT NULL,
  payload LONGTEXT NOT NULL,
  updated_at DATETIME NOT NULL,
  deleted_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_user_collection_entity (user_id, collection_name, entity_id),
  KEY idx_user_collection (user_id, collection_name),
  KEY idx_user_updated (user_id, updated_at),
  CONSTRAINT fk_cloud_rows_user FOREIGN KEY (user_id) REFERENCES cloud_users(id) ON DELETE CASCADE
);
