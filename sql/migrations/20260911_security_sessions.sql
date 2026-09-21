CREATE TABLE IF NOT EXISTS auth_sessions (
  id_hash CHAR(64) NOT NULL PRIMARY KEY,
  user_id VARCHAR(191) NOT NULL,
  credential_tag CHAR(64) NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY ix_auth_session_user (user_id),
  KEY ix_auth_session_expiry (expires_at),
  CONSTRAINT fk_auth_session_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_security_recovery (
  user_id VARCHAR(191) NOT NULL PRIMARY KEY,
  security_question VARCHAR(255) NOT NULL,
  security_answer_hash VARCHAR(255) NOT NULL,
  security_answer_salt VARCHAR(191) NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_security_recovery_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
ALTER TABLE user_security_recovery ADD COLUMN IF NOT EXISTS security_answer_salt VARCHAR(191) NULL;
UPDATE user_security_recovery r JOIN users u ON u.id=r.user_id SET r.security_answer_salt=u.pin_salt WHERE r.security_answer_salt IS NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS must_change_pin TINYINT(1) NOT NULL DEFAULT 0;
