SET NAMES utf8mb4;
SET time_zone = '+00:00';

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
