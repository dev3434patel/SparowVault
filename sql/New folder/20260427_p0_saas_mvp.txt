SET NAMES utf8mb4;
SET time_zone = '+00:00';

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

INSERT INTO users (id, username, display_name, pin_hash, pin_salt, role, is_active, created_at, updated_at)
SELECT cu.id, cu.username, cu.display_name, cu.pin_hash, cu.pin_salt, 'user', 1, cu.created_at, cu.updated_at
FROM cloud_users cu
LEFT JOIN users u ON u.id = cu.id
WHERE u.id IS NULL;

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
