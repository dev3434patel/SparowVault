-- SparowVault final schema baseline.
-- This file is intended to be applied after importing 20260427_all_in_one.sql
-- and acts as a canonical compatibility/metadata layer.

CREATE TABLE IF NOT EXISTS schema_version (
  version_key VARCHAR(64) PRIMARY KEY,
  applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT IGNORE INTO schema_version (version_key) VALUES ('20260429_final_v1');

CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  actor_user_id VARCHAR(64) NOT NULL,
  actor_role VARCHAR(32) NOT NULL,
  action VARCHAR(120) NOT NULL,
  entity_type VARCHAR(64) NOT NULL,
  entity_id VARCHAR(128) NOT NULL,
  before_json LONGTEXT NULL,
  after_json LONGTEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_audit_created_at (created_at),
  KEY idx_audit_actor (actor_user_id),
  KEY idx_audit_entity (entity_type, entity_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
