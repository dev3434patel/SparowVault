SET NAMES utf8mb4;
SET time_zone = '+00:00';

-- ==========================================
-- SparowVault All-in-One SQL Bundle
-- Fresh install + SaaS billing/admin modules
-- ==========================================

CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(191) NOT NULL PRIMARY KEY,
  username VARCHAR(24) NOT NULL UNIQUE,
  display_name VARCHAR(60) NOT NULL,
  pin_hash VARCHAR(255) NOT NULL,
  pin_salt VARCHAR(64) NOT NULL,
  role ENUM('user','admin') NOT NULL DEFAULT 'user',
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_users_role_active (role, is_active)
);

-- Optional legacy table retained for compatibility/migration.
CREATE TABLE IF NOT EXISTS cloud_users (
  id VARCHAR(191) NOT NULL PRIMARY KEY,
  username VARCHAR(24) NOT NULL UNIQUE,
  display_name VARCHAR(60) NOT NULL,
  pin_hash VARCHAR(255) NOT NULL,
  pin_salt VARCHAR(64) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Migrate any legacy cloud_users into users.
INSERT INTO users (id, username, display_name, pin_hash, pin_salt, role, is_active, created_at, updated_at)
SELECT cu.id, cu.username, cu.display_name, cu.pin_hash, cu.pin_salt, 'user', 1, cu.created_at, cu.updated_at
FROM cloud_users cu
LEFT JOIN users u ON u.id = cu.id
WHERE u.id IS NULL;

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
  CONSTRAINT fk_cloud_rows_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS plans (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(64) NOT NULL UNIQUE,
  name VARCHAR(120) NOT NULL,
  description TEXT NULL,
  price_inr DECIMAL(10,2) NOT NULL,
  billing_interval ENUM('monthly','yearly') NOT NULL DEFAULT 'monthly',
  trial_days INT NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_plans_active_interval (is_active, billing_interval)
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
  CONSTRAINT fk_plan_features_plan FOREIGN KEY (plan_id) REFERENCES plans(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS subscriptions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id VARCHAR(191) NOT NULL,
  plan_id BIGINT UNSIGNED NOT NULL,
  status ENUM('pending','active','past_due','cancelled','expired') NOT NULL DEFAULT 'pending',
  current_period_start DATETIME NULL,
  current_period_end DATETIME NULL,
  cancel_at_period_end TINYINT(1) NOT NULL DEFAULT 0,
  provider ENUM('razorpay') NOT NULL DEFAULT 'razorpay',
  provider_subscription_id VARCHAR(191) NULL,
  provider_customer_id VARCHAR(191) NULL,
  provider_order_id VARCHAR(191) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_subscriptions_user_status (user_id, status),
  KEY idx_subscriptions_provider_sub_id (provider_subscription_id),
  KEY idx_subscriptions_provider_order_id (provider_order_id),
  CONSTRAINT fk_subscriptions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_subscriptions_plan FOREIGN KEY (plan_id) REFERENCES plans(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS payments (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id VARCHAR(191) NOT NULL,
  subscription_id BIGINT UNSIGNED NULL,
  amount_inr DECIMAL(10,2) NOT NULL,
  currency VARCHAR(10) NOT NULL DEFAULT 'INR',
  status ENUM('created','authorized','captured','failed','refunded') NOT NULL DEFAULT 'created',
  provider ENUM('razorpay') NOT NULL DEFAULT 'razorpay',
  provider_order_id VARCHAR(191) NOT NULL,
  provider_payment_id VARCHAR(191) NULL,
  provider_signature VARCHAR(255) NULL,
  failure_reason TEXT NULL,
  paid_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_payments_user_status (user_id, status),
  KEY idx_payments_provider_order_id (provider_order_id),
  KEY idx_payments_provider_payment_id (provider_payment_id),
  CONSTRAINT fk_payments_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_payments_subscription FOREIGN KEY (subscription_id) REFERENCES subscriptions(id) ON DELETE SET NULL
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
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_webhook_events_provider_status (provider, processing_status)
);

CREATE TABLE IF NOT EXISTS app_settings (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  setting_key VARCHAR(191) NOT NULL UNIQUE,
  setting_value LONGTEXT NOT NULL,
  is_public TINYINT(1) NOT NULL DEFAULT 0,
  updated_by_user_id VARCHAR(191) NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_app_settings_updated_by FOREIGN KEY (updated_by_user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS feature_flags_global (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  feature_key VARCHAR(191) NOT NULL UNIQUE,
  is_enabled TINYINT(1) NOT NULL DEFAULT 0,
  updated_by_user_id VARCHAR(191) NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_feature_flags_updated_by FOREIGN KEY (updated_by_user_id) REFERENCES users(id) ON DELETE SET NULL
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
  CONSTRAINT fk_audit_logs_actor FOREIGN KEY (actor_user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS login_attempts (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(191) NOT NULL,
  ip_address VARCHAR(64) NOT NULL,
  attempt_count INT NOT NULL DEFAULT 0,
  locked_until DATETIME NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_login_attempt (username, ip_address),
  KEY idx_login_attempt_locked_until (locked_until)
);

-- ========= SEED =========
INSERT INTO plans (code, name, description, price_inr, billing_interval, trial_days, is_active)
VALUES
  ('BASIC', 'Basic', 'Starter access for individuals', 299.00, 'monthly', 7, 1),
  ('PRO', 'Pro', 'Advanced analytics and exports', 799.00, 'monthly', 7, 1),
  ('PRO_YEARLY', 'Pro Yearly', 'Advanced analytics and exports, yearly billing', 7999.00, 'yearly', 14, 1)
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  description = VALUES(description),
  price_inr = VALUES(price_inr),
  billing_interval = VALUES(billing_interval),
  trial_days = VALUES(trial_days),
  is_active = VALUES(is_active);

INSERT INTO feature_flags_global (feature_key, is_enabled)
VALUES
  ('exports', 1),
  ('advanced_reports', 0),
  ('alerts', 1),
  ('admin_panel', 1),
  ('branding', 1)
ON DUPLICATE KEY UPDATE is_enabled = VALUES(is_enabled);

INSERT INTO app_settings (setting_key, setting_value, is_public)
VALUES
  ('app_title', 'SparowVault', 1),
  ('logo_url', '', 1),
  ('favicon_url', '', 1),
  ('support_email', 'support@example.com', 1),
  ('privacy_url', '/privacy', 1),
  ('terms_url', '/terms', 1),
  ('theme_accent', '#0ea5e9', 1),
  ('theme_primary', '#1d4ed8', 1)
ON DUPLICATE KEY UPDATE
  setting_value = VALUES(setting_value),
  is_public = VALUES(is_public);

INSERT INTO users (id, username, display_name, pin_hash, pin_salt, role, is_active)
SELECT
  'admin_default',
  'admin',
  'Platform Admin',
  '$2y$12$He5Y/3iiVjVP9SiVw0cQhudM.4s4zRlaYSvPO4esx2BddvD6mci.i',
  'seed',
  'admin',
  1
FROM DUAL
WHERE NOT EXISTS (
  SELECT 1 FROM users WHERE username = 'admin'
);

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

