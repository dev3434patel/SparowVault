SET NAMES utf8mb4;
SET time_zone = '+00:00';
SET FOREIGN_KEY_CHECKS = 0;

-- ============================================================
-- SparowVault SQL-only Full Schema (MySQL / phpMyAdmin)
-- Covers auth, admin, subscriptions, feature flags, dashboard,
-- imports/exports, and all user finance collections.
-- Safe to re-run.
-- ============================================================

CREATE TABLE IF NOT EXISTS schema_version (
  version_key VARCHAR(64) PRIMARY KEY,
  applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(191) NOT NULL PRIMARY KEY,
  username VARCHAR(24) NOT NULL UNIQUE,
  display_name VARCHAR(60) NOT NULL,
  pin_hash VARCHAR(255) NOT NULL,
  pin_salt VARCHAR(64) NOT NULL,
  role ENUM('user','admin') NOT NULL DEFAULT 'user',
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  must_change_pin TINYINT(1) NOT NULL DEFAULT 0,
  last_login_at DATETIME NULL,
  mobile VARCHAR(32) NULL,
  email VARCHAR(120) NULL,
  avatar_emoji VARCHAR(16) NULL,
  avatar_color VARCHAR(7) NULL,
  deleted_at DATETIME NULL,
  deleted_reason VARCHAR(255) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_users_role_active (role, is_active),
  KEY idx_users_deleted (deleted_at),
  KEY idx_users_created_at (created_at)
);

SET @sv_db := DATABASE();

SET @sv_has_mobile := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = @sv_db AND TABLE_NAME = 'users' AND COLUMN_NAME = 'mobile'
);
SET @sv_sql := IF(@sv_has_mobile = 0, 'ALTER TABLE users ADD COLUMN mobile VARCHAR(32) NULL', 'SELECT 1');
PREPARE sv_stmt FROM @sv_sql;
EXECUTE sv_stmt;
DEALLOCATE PREPARE sv_stmt;

SET @sv_has_must_change_pin := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = @sv_db AND TABLE_NAME = 'users' AND COLUMN_NAME = 'must_change_pin'
);
SET @sv_sql := IF(@sv_has_must_change_pin = 0, 'ALTER TABLE users ADD COLUMN must_change_pin TINYINT(1) NOT NULL DEFAULT 0 AFTER is_active', 'SELECT 1');
PREPARE sv_stmt FROM @sv_sql;
EXECUTE sv_stmt;
DEALLOCATE PREPARE sv_stmt;

SET @sv_has_email := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = @sv_db AND TABLE_NAME = 'users' AND COLUMN_NAME = 'email'
);
SET @sv_sql := IF(@sv_has_email = 0, 'ALTER TABLE users ADD COLUMN email VARCHAR(120) NULL', 'SELECT 1');
PREPARE sv_stmt FROM @sv_sql;
EXECUTE sv_stmt;
DEALLOCATE PREPARE sv_stmt;

SET @sv_has_avatar_emoji := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = @sv_db AND TABLE_NAME = 'users' AND COLUMN_NAME = 'avatar_emoji'
);
SET @sv_sql := IF(@sv_has_avatar_emoji = 0, 'ALTER TABLE users ADD COLUMN avatar_emoji VARCHAR(16) NULL', 'SELECT 1');
PREPARE sv_stmt FROM @sv_sql;
EXECUTE sv_stmt;
DEALLOCATE PREPARE sv_stmt;

SET @sv_has_avatar_color := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = @sv_db AND TABLE_NAME = 'users' AND COLUMN_NAME = 'avatar_color'
);
SET @sv_sql := IF(@sv_has_avatar_color = 0, 'ALTER TABLE users ADD COLUMN avatar_color VARCHAR(7) NULL', 'SELECT 1');
PREPARE sv_stmt FROM @sv_sql;
EXECUTE sv_stmt;
DEALLOCATE PREPARE sv_stmt;

SET @sv_has_deleted_at := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = @sv_db AND TABLE_NAME = 'users' AND COLUMN_NAME = 'deleted_at'
);
SET @sv_sql := IF(@sv_has_deleted_at = 0, 'ALTER TABLE users ADD COLUMN deleted_at DATETIME NULL AFTER avatar_color', 'SELECT 1');
PREPARE sv_stmt FROM @sv_sql;
EXECUTE sv_stmt;
DEALLOCATE PREPARE sv_stmt;

SET @sv_has_deleted_reason := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = @sv_db AND TABLE_NAME = 'users' AND COLUMN_NAME = 'deleted_reason'
);
SET @sv_sql := IF(@sv_has_deleted_reason = 0, 'ALTER TABLE users ADD COLUMN deleted_reason VARCHAR(255) NULL AFTER deleted_at', 'SELECT 1');
PREPARE sv_stmt FROM @sv_sql;
EXECUTE sv_stmt;
DEALLOCATE PREPARE sv_stmt;

CREATE TABLE IF NOT EXISTS user_security_recovery (
  user_id VARCHAR(191) NOT NULL PRIMARY KEY,
  security_question VARCHAR(255) NOT NULL,
  security_answer_hash VARCHAR(255) NOT NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_security_recovery_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE
);

-- Legacy compatibility table (migration source only).
CREATE TABLE IF NOT EXISTS cloud_users (
  id VARCHAR(191) NOT NULL PRIMARY KEY,
  username VARCHAR(24) NOT NULL UNIQUE,
  display_name VARCHAR(60) NOT NULL,
  pin_hash VARCHAR(255) NOT NULL,
  pin_salt VARCHAR(64) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

INSERT INTO users (id, username, display_name, pin_hash, pin_salt, role, is_active, created_at, updated_at)
SELECT cu.id, cu.username, cu.display_name, cu.pin_hash, cu.pin_salt, 'user', 1, cu.created_at, cu.updated_at
FROM cloud_users cu
LEFT JOIN users u ON u.id = cu.id
WHERE u.id IS NULL;

-- Generic finance collections storage.
CREATE TABLE IF NOT EXISTS cloud_collection_rows (
  id VARCHAR(191) NOT NULL PRIMARY KEY,
  user_id VARCHAR(191) NOT NULL,
  collection_name VARCHAR(64) NOT NULL,
  entity_id VARCHAR(191) NOT NULL,
  payload LONGTEXT NOT NULL,
  amount_paise BIGINT NULL COMMENT 'denormalized primary amount in paise',
  txn_local_date DATE NULL,
  txn_month CHAR(7) NULL,
  txn_type VARCHAR(32) NULL,
  payment_mode VARCHAR(32) NULL,
  category_id VARCHAR(191) NULL,
  account_id VARCHAR(191) NULL,
  card_id VARCHAR(191) NULL,
  loan_id VARCHAR(191) NULL,
  goal_id VARCHAR(191) NULL,
  udhari_id VARCHAR(191) NULL,
  business_or_personal VARCHAR(32) NULL,
  source_device_id VARCHAR(191) NULL,
  payload_hash CHAR(64) NULL COMMENT 'SHA-256 hex of payload JSON',
  updated_at DATETIME NOT NULL,
  deleted_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  schema_version INT NOT NULL DEFAULT 1 COMMENT 'payload schema / client version',
  UNIQUE KEY uniq_user_collection_entity (user_id, collection_name, entity_id),
  KEY idx_user_collection (user_id, collection_name),
  KEY idx_user_updated (user_id, updated_at),
  KEY idx_ccr_collection_deleted (user_id, collection_name, deleted_at),
  KEY idx_ccr_uid_coll_txn_date (user_id, collection_name, txn_local_date),
  KEY idx_ccr_uid_cat_month (user_id, category_id, txn_month),
  KEY idx_ccr_uid_card_txn_date (user_id, card_id, txn_local_date),
  KEY idx_ccr_uid_loan_txn_date (user_id, loan_id, txn_local_date),
  KEY idx_ccr_uid_goal_txn_date (user_id, goal_id, txn_local_date),
  KEY idx_ccr_uid_amount_paise (user_id, amount_paise),
  CONSTRAINT fk_cloud_rows_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS plans (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(64) NOT NULL UNIQUE,
  name VARCHAR(120) NOT NULL,
  description TEXT NULL,
  price_inr DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  billing_interval ENUM('monthly','yearly') NOT NULL DEFAULT 'monthly',
  trial_days INT NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  sort_order INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_plans_active_interval (is_active, billing_interval),
  KEY idx_plans_sort (sort_order)
);

CREATE TABLE IF NOT EXISTS plan_features (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  plan_id BIGINT UNSIGNED NOT NULL,
  feature_key VARCHAR(191) NOT NULL,
  is_enabled TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_plan_feature (plan_id, feature_key),
  KEY idx_plan_features_feature_key (feature_key),
  CONSTRAINT fk_plan_features_plan FOREIGN KEY (plan_id) REFERENCES plans(id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS subscriptions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id VARCHAR(191) NOT NULL,
  plan_id BIGINT UNSIGNED NOT NULL,
  status ENUM('pending','trial','active','past_due','cancelled','expired') NOT NULL DEFAULT 'pending',
  trial_ends_at DATETIME NULL,
  current_period_start DATETIME NULL,
  current_period_end DATETIME NULL,
  cancel_at_period_end TINYINT(1) NOT NULL DEFAULT 0,
  cancelled_at DATETIME NULL,
  provider ENUM('razorpay','manual') NOT NULL DEFAULT 'razorpay',
  provider_subscription_id VARCHAR(191) NULL,
  provider_customer_id VARCHAR(191) NULL,
  provider_order_id VARCHAR(191) NULL,
  notes TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_subscriptions_user_status (user_id, status),
  KEY idx_subscriptions_provider_sub_id (provider_subscription_id),
  KEY idx_subscriptions_provider_order_id (provider_order_id),
  KEY idx_sub_expires (status, current_period_end),
  CONSTRAINT fk_subscriptions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_subscriptions_plan FOREIGN KEY (plan_id) REFERENCES plans(id) ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS payments (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id VARCHAR(191) NOT NULL,
  subscription_id BIGINT UNSIGNED NULL,
  amount_inr DECIMAL(10,2) NOT NULL,
  expected_amount_paise BIGINT NULL,
  captured_amount_paise BIGINT NULL,
  currency VARCHAR(10) NOT NULL DEFAULT 'INR',
  status ENUM('created','authorized','captured','failed','refunded') NOT NULL DEFAULT 'created',
  provider ENUM('razorpay','manual') NOT NULL DEFAULT 'razorpay',
  provider_order_id VARCHAR(191) NOT NULL,
  provider_payment_id VARCHAR(191) NULL,
  provider_signature VARCHAR(512) NULL,
  failure_reason TEXT NULL,
  refund_id VARCHAR(191) NULL,
  paid_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_payments_user_status (user_id, status),
  KEY idx_payments_provider_order_id (provider_order_id),
  KEY idx_payments_provider_payment_id (provider_payment_id),
  UNIQUE KEY uq_pay_provider_order_id (provider, provider_order_id),
  UNIQUE KEY uq_pay_provider_payment_id (provider, provider_payment_id),
  KEY idx_payments_paid_at (paid_at),
  CONSTRAINT fk_payments_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_payments_subscription FOREIGN KEY (subscription_id) REFERENCES subscriptions(id) ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS webhook_events (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  provider ENUM('razorpay') NOT NULL DEFAULT 'razorpay',
  event_id VARCHAR(191) NOT NULL UNIQUE,
  event_type VARCHAR(191) NOT NULL,
  signature_valid TINYINT(1) NOT NULL DEFAULT 0,
  payload_json LONGTEXT NOT NULL,
  processed_at DATETIME NULL,
  processing_status ENUM('pending','processed','failed') NOT NULL DEFAULT 'pending',
  error_message TEXT NULL,
  retry_count TINYINT UNSIGNED NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_webhook_events_provider_status (provider, processing_status),
  KEY idx_webhook_created (created_at)
);

CREATE TABLE IF NOT EXISTS app_settings (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  setting_key VARCHAR(191) NOT NULL UNIQUE,
  setting_value LONGTEXT NOT NULL,
  is_public TINYINT(1) NOT NULL DEFAULT 0,
  updated_by_user_id VARCHAR(191) NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_app_settings_updated_by FOREIGN KEY (updated_by_user_id) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS feature_flags_global (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  feature_key VARCHAR(191) NOT NULL UNIQUE,
  is_enabled TINYINT(1) NOT NULL DEFAULT 0,
  description VARCHAR(255) NULL,
  updated_by_user_id VARCHAR(191) NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_feature_flags_updated_by FOREIGN KEY (updated_by_user_id) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  actor_user_id VARCHAR(191) NULL,
  actor_role VARCHAR(32) NOT NULL,
  action_key VARCHAR(191) NOT NULL,
  entity_type VARCHAR(191) NOT NULL,
  entity_id VARCHAR(191) NOT NULL,
  before_json LONGTEXT NULL,
  after_json LONGTEXT NULL,
  ip_address VARCHAR(64) NOT NULL,
  user_agent VARCHAR(512) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_audit_logs_entity (entity_type, entity_id),
  KEY idx_audit_logs_actor (actor_user_id, actor_role),
  KEY idx_audit_logs_created (created_at),
  CONSTRAINT fk_audit_logs_actor FOREIGN KEY (actor_user_id) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS login_attempts (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(191) NOT NULL,
  ip_address VARCHAR(64) NOT NULL,
  attempt_count INT NOT NULL DEFAULT 0,
  locked_until DATETIME NULL,
  first_attempt_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_login_attempt (username, ip_address),
  KEY idx_login_attempt_locked_until (locked_until),
  KEY idx_login_attempt_updated (updated_at)
);

CREATE TABLE IF NOT EXISTS api_rate_limits (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  bucket_key VARCHAR(191) NOT NULL,
  hit_count INT NOT NULL DEFAULT 0,
  window_start DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_rate_bucket_key (bucket_key),
  KEY idx_rate_window_start (window_start)
);

-- ====================== Seeds ======================

INSERT INTO plans (code, name, description, price_inr, billing_interval, trial_days, is_active, sort_order)
VALUES
  ('FREE', 'Free', 'Basic personal finance tracking', 0.00, 'monthly', 0, 1, 1),
  ('BASIC', 'Basic', 'Unlimited transactions, budgets and goals', 299.00, 'monthly', 7, 1, 2),
  ('PRO', 'Pro', 'Advanced reports, export and alerts', 799.00, 'monthly', 7, 1, 3),
  ('PRO_YEARLY', 'Pro Yearly', 'Pro features at yearly discounted price', 7999.00, 'yearly', 14, 1, 4)
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  description = VALUES(description),
  price_inr = VALUES(price_inr),
  billing_interval = VALUES(billing_interval),
  trial_days = VALUES(trial_days),
  is_active = VALUES(is_active),
  sort_order = VALUES(sort_order);

INSERT INTO plan_features (plan_id, feature_key, is_enabled)
SELECT p.id, 'exports', CASE WHEN p.code IN ('PRO', 'PRO_YEARLY') THEN 1 ELSE 0 END
FROM plans p
ON DUPLICATE KEY UPDATE is_enabled = VALUES(is_enabled);

INSERT INTO plan_features (plan_id, feature_key, is_enabled)
SELECT p.id, 'advanced_reports', CASE WHEN p.code IN ('PRO', 'PRO_YEARLY') THEN 1 ELSE 0 END
FROM plans p
ON DUPLICATE KEY UPDATE is_enabled = VALUES(is_enabled);

INSERT INTO plan_features (plan_id, feature_key, is_enabled)
SELECT p.id, 'alerts', CASE WHEN p.code IN ('BASIC', 'PRO', 'PRO_YEARLY') THEN 1 ELSE 0 END
FROM plans p
ON DUPLICATE KEY UPDATE is_enabled = VALUES(is_enabled);

INSERT INTO plan_features (plan_id, feature_key, is_enabled)
SELECT p.id, 'import', CASE WHEN p.code IN ('BASIC', 'PRO', 'PRO_YEARLY') THEN 1 ELSE 0 END
FROM plans p
ON DUPLICATE KEY UPDATE is_enabled = VALUES(is_enabled);

INSERT INTO plan_features (plan_id, feature_key, is_enabled)
SELECT p.id, 'udhari', 1
FROM plans p
ON DUPLICATE KEY UPDATE is_enabled = VALUES(is_enabled);

INSERT INTO feature_flags_global (feature_key, is_enabled, description)
VALUES
  ('exports', 1, 'Allow users to export data to CSV/JSON'),
  ('advanced_reports', 0, 'Advanced multi-period financial reports'),
  ('alerts', 1, 'Budget overrun, due-date and udhari alerts'),
  ('admin_panel', 1, 'Access to admin console at /admin'),
  ('branding', 1, 'Platform branding customisation'),
  ('import', 1, 'Bulk import from CSV/Excel'),
  ('subscriptions', 1, 'Subscription and payment flow'),
  ('cloud_sync_enabled', 0, 'Deprecated cloud sync switch kept for compatibility')
ON DUPLICATE KEY UPDATE
  is_enabled = VALUES(is_enabled),
  description = VALUES(description);

INSERT INTO app_settings (setting_key, setting_value, is_public)
VALUES
  ('app_title', '"SparowVault"', 1),
  ('logo_url', '""', 1),
  ('favicon_url', '""', 1),
  ('support_email', '"support@example.com"', 1),
  ('privacy_url', '"/privacy"', 1),
  ('terms_url', '"/terms"', 1),
  ('theme_accent', '"#0ea5e9"', 1),
  ('theme_primary', '"#1d4ed8"', 1)
ON DUPLICATE KEY UPDATE
  setting_value = VALUES(setting_value),
  is_public = VALUES(is_public);

-- Default admin PIN: 12345678 (forced change after first login).
INSERT INTO users (id, username, display_name, pin_hash, pin_salt, role, is_active, must_change_pin)
SELECT
  'admin_seed_001',
  'admin',
  'Platform Admin',
  '$2y$12$FqIIvM4sok70cXgH9Ufuf.7xKeFch4kXAK6ArhLZtIf2RoPvHUXPS',
  'seed',
  'admin',
  1,
  1
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM users WHERE username = 'admin');

UPDATE users
SET must_change_pin = 1
WHERE username = 'admin' AND role = 'admin';

INSERT IGNORE INTO schema_version (version_key) VALUES ('20260501_sql_only_full');

SET FOREIGN_KEY_CHECKS = 1;
