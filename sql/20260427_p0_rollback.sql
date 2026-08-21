SET NAMES utf8mb4;
SET time_zone = '+00:00';

SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS audit_logs;
DROP TABLE IF EXISTS feature_flags_global;
DROP TABLE IF EXISTS app_settings;
DROP TABLE IF EXISTS webhook_events;
DROP TABLE IF EXISTS payments;
DROP TABLE IF EXISTS subscriptions;
DROP TABLE IF EXISTS plan_features;
DROP TABLE IF EXISTS plans;
DROP TABLE IF EXISTS login_attempts;

SET FOREIGN_KEY_CHECKS = 1;

