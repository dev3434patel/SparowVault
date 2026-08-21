-- =============================================================================
-- SparowVault — Phase 13 privacy / compliance / audit / retention
-- =============================================================================
-- Adds:
--   user_policy_acceptances  — Terms / Privacy acceptance versioning
--   user_audit_logs          — per-user audit trail (companion to admin_audit_logs)
--   retention_jobs           — bookkeeping for the retention sweeper
--   users.last_policy_check_at — opt-in marker for "have I shown the new TOS?"
-- =============================================================================

CREATE TABLE IF NOT EXISTS user_policy_acceptances (
  id           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id      VARCHAR(191)    NOT NULL,
  policy_key   VARCHAR(64)     NOT NULL  COMMENT 'terms | privacy | cookie | data_processing',
  version      VARCHAR(32)     NOT NULL  COMMENT 'semver or YYYY-MM-DD',
  accepted_at  DATETIME        NOT NULL  DEFAULT CURRENT_TIMESTAMP,
  ip_address   VARCHAR(64)     NOT NULL  DEFAULT '',
  user_agent   VARCHAR(512)    NOT NULL  DEFAULT '',
  withdrawn_at DATETIME        NULL      COMMENT 'set if the user explicitly withdraws consent',
  created_at   DATETIME        NOT NULL  DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_user_policy_version (user_id, policy_key, version),
  KEY idx_upa_user (user_id, policy_key),
  CONSTRAINT fk_upa_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Per-user acceptance of policy versions for DPDP/GDPR compliance';

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
  CONSTRAINT fk_audit_actor FOREIGN KEY (actor_user_id) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Application audit trail for user/system/security actions';

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
  KEY idx_ual_user_time   (user_id, created_at),
  KEY idx_ual_action      (action_key),
  KEY idx_ual_entity      (entity_type, entity_id),
  CONSTRAINT fk_ual_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Per-user state-change audit trail (PIN, profile, subscription, exports, deletes)';

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
  COMMENT='Retention sweep bookkeeping — daily cron logs into this';

-- Conditional column adds (older MySQL lacks ADD COLUMN IF NOT EXISTS).
DELIMITER //
DROP PROCEDURE IF EXISTS sv_phase13_add_column//
CREATE PROCEDURE sv_phase13_add_column(IN tbl VARCHAR(64), IN col VARCHAR(64), IN spec VARCHAR(255))
BEGIN
  DECLARE n INT DEFAULT 0;
  SELECT COUNT(*) INTO n FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = tbl AND COLUMN_NAME = col;
  IF n = 0 THEN
    SET @ddl = CONCAT('ALTER TABLE `', tbl, '` ADD COLUMN `', col, '` ', spec);
    PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;
  END IF;
END//
DELIMITER ;

CALL sv_phase13_add_column('users', 'last_policy_check_at', 'DATETIME NULL COMMENT "when policy versions were last checked on login"');
CALL sv_phase13_add_column('users', 'mobile_e164',          'VARCHAR(20) NULL COMMENT "PII — encrypt at app layer"');
CALL sv_phase13_add_column('users', 'email_lc',             'VARCHAR(254) NULL COMMENT "lowercased email for lookup"');

DROP PROCEDURE IF EXISTS sv_phase13_add_column;

INSERT IGNORE INTO schema_version (version_key) VALUES ('phase_13_privacy_audit_2026_05_13');
