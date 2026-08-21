-- P0-E: financial mutation idempotency (userId + mutationId unique).
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
