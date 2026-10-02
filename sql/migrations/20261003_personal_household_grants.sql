-- Personal household invites and grants. Does not copy financial rows.
CREATE TABLE IF NOT EXISTS personal_household_invites (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  token_hash CHAR(64) NOT NULL,
  inviter_user_id VARCHAR(191) NOT NULL,
  household_id VARCHAR(191) NOT NULL,
  role VARCHAR(32) NOT NULL,
  resource_scope_json TEXT NOT NULL,
  expires_at DATETIME NOT NULL,
  used_at DATETIME NULL,
  used_by VARCHAR(191) NULL,
  revoked_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_personal_invite_token (token_hash),
  KEY ix_personal_invite_inviter (inviter_user_id, household_id),
  CONSTRAINT fk_personal_invite_user FOREIGN KEY (inviter_user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS personal_household_grants (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  grantee_user_id VARCHAR(191) NOT NULL,
  owner_user_id VARCHAR(191) NOT NULL,
  household_id VARCHAR(191) NOT NULL,
  invite_id VARCHAR(64) NULL,
  role VARCHAR(32) NOT NULL,
  resource_scope_json TEXT NOT NULL,
  revision INT NOT NULL DEFAULT 1,
  revoked_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_personal_grant (grantee_user_id, household_id),
  KEY ix_personal_grant_owner (owner_user_id, household_id),
  CONSTRAINT fk_personal_grant_grantee FOREIGN KEY (grantee_user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_personal_grant_owner FOREIGN KEY (owner_user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
