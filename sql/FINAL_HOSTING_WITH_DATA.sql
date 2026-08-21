-- SparowVault final hosting SQL with preserved data
-- Generated: 2026-05-14T21:00:03.329Z
-- Source dump: C:/Users/DELL/Downloads/sparocdy_money.sql
-- Target: import with phpMyAdmin or mysql into your hosting database

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+00:00";
SET FOREIGN_KEY_CHECKS = 0;
START TRANSACTION;

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Table structure for table `admin_audit_logs`
--

DROP TABLE IF EXISTS `admin_audit_logs`;
CREATE TABLE `admin_audit_logs` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `actor_user_id` varchar(191) DEFAULT NULL COMMENT 'NULL if system action',
  `actor_role` varchar(32) NOT NULL DEFAULT 'system',
  `action_key` varchar(191) NOT NULL COMMENT 'e.g. USER_TOGGLED, PLAN_CREATED',
  `entity_type` varchar(191) NOT NULL,
  `entity_id` varchar(191) NOT NULL,
  `before_json` longtext DEFAULT NULL COMMENT 'state before change',
  `after_json` longtext DEFAULT NULL COMMENT 'state after change',
  `ip_address` varchar(64) NOT NULL DEFAULT '',
  `user_agent` varchar(512) NOT NULL DEFAULT '',
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_aal_entity` (`entity_type`,`entity_id`),
  KEY `idx_aal_actor` (`actor_user_id`,`created_at`),
  KEY `idx_aal_action` (`action_key`),
  KEY `idx_aal_created` (`created_at`),
  CONSTRAINT `fk_aal_actor` FOREIGN KEY (`actor_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Immutable admin action audit trail';

--
-- Table structure for table `ai_suggestions`
--

DROP TABLE IF EXISTS `ai_suggestions`;
CREATE TABLE `ai_suggestions` (
  `id` varchar(191) NOT NULL,
  `user_id` varchar(191) NOT NULL,
  `dedupe_key` varchar(191) NOT NULL DEFAULT '' COMMENT 'idempotency key per engine rule',
  `suggestion_type` varchar(32) NOT NULL,
  `severity` varchar(16) NOT NULL DEFAULT 'info',
  `title` varchar(200) NOT NULL DEFAULT '',
  `reason` varchar(2000) NOT NULL DEFAULT '',
  `calculation_inputs_json` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`calculation_inputs_json`)),
  `recommended_action` varchar(500) NOT NULL DEFAULT '',
  `expected_impact_json` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`expected_impact_json`)),
  `confidence_score` decimal(4,3) NOT NULL DEFAULT 0.700,
  `source_module` varchar(64) NOT NULL DEFAULT 'suggestionEngine.v1',
  `status` varchar(24) NOT NULL DEFAULT 'active',
  `ai_explanation` varchar(2000) DEFAULT NULL COMMENT 'optional LLM copy; must not alter numbers',
  `remind_at` datetime DEFAULT NULL,
  `expires_at` datetime NOT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_ai_sug_user_status` (`user_id`,`status`,`deleted_at`),
  KEY `idx_ai_sug_user_dedupe` (`user_id`,`dedupe_key`),
  CONSTRAINT `fk_ai_suggestions_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Phase 11 rule-backed suggestions';

--
-- Table structure for table `api_rate_limits`
--

DROP TABLE IF EXISTS `api_rate_limits`;
CREATE TABLE `api_rate_limits` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `bucket_key` varchar(191) NOT NULL,
  `hit_count` int(11) NOT NULL DEFAULT 0,
  `window_start` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_rate_bucket_key` (`bucket_key`),
  KEY `idx_rate_window_start` (`window_start`)
) ENGINE=InnoDB AUTO_INCREMENT=26 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Table structure for table `app_settings`
--

DROP TABLE IF EXISTS `app_settings`;
CREATE TABLE `app_settings` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `setting_key` varchar(191) NOT NULL,
  `setting_value` longtext NOT NULL,
  `is_public` tinyint(1) NOT NULL DEFAULT 0,
  `updated_by_user_id` varchar(191) DEFAULT NULL,
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `setting_key` (`setting_key`),
  UNIQUE KEY `uq_setting_key` (`setting_key`),
  KEY `fk_app_settings_updated_by` (`updated_by_user_id`),
  KEY `fk_settings_updated_by` (`updated_by_user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Table structure for table `audit_logs`
--

DROP TABLE IF EXISTS `audit_logs`;
CREATE TABLE `audit_logs` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `actor_user_id` varchar(191) DEFAULT NULL,
  `actor_role` varchar(32) NOT NULL,
  `action_key` varchar(191) NOT NULL,
  `entity_type` varchar(191) NOT NULL,
  `entity_id` varchar(191) NOT NULL,
  `before_json` longtext DEFAULT NULL,
  `after_json` longtext DEFAULT NULL,
  `ip_address` varchar(64) NOT NULL,
  `user_agent` varchar(512) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_audit_logs_entity` (`entity_type`,`entity_id`),
  KEY `idx_audit_logs_actor` (`actor_user_id`,`actor_role`),
  KEY `idx_audit_logs_created` (`created_at`),
  KEY `idx_audit_actor_time` (`actor_user_id`,`created_at`),
  KEY `idx_audit_action` (`action_key`),
  KEY `idx_audit_entity` (`entity_type`,`entity_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Table structure for table `cloud_collection_rows`
--

DROP TABLE IF EXISTS `cloud_collection_rows`;
CREATE TABLE `cloud_collection_rows` (
  `id` varchar(191) NOT NULL,
  `user_id` varchar(191) NOT NULL,
  `collection_name` varchar(64) NOT NULL,
  `entity_id` varchar(191) NOT NULL,
  `payload` longtext NOT NULL,
  `updated_at` datetime NOT NULL,
  `deleted_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `amount_paise` bigint(20) DEFAULT NULL COMMENT 'primary monetary amount in paise (e.g. transactions)',
  `schema_version` int(11) NOT NULL DEFAULT 1 COMMENT 'payload schema / client version',
  `txn_local_date` date DEFAULT NULL,
  `txn_month` char(7) DEFAULT NULL,
  `txn_type` varchar(32) DEFAULT NULL,
  `payment_mode` varchar(32) DEFAULT NULL,
  `category_id` varchar(191) DEFAULT NULL,
  `account_id` varchar(191) DEFAULT NULL,
  `card_id` varchar(191) DEFAULT NULL,
  `loan_id` varchar(191) DEFAULT NULL,
  `goal_id` varchar(191) DEFAULT NULL,
  `udhari_id` varchar(191) DEFAULT NULL,
  `business_or_personal` varchar(32) DEFAULT NULL,
  `source_device_id` varchar(191) DEFAULT NULL,
  `payload_hash` char(64) DEFAULT NULL COMMENT 'SHA-256 hex of payload JSON',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_user_collection_entity` (`user_id`,`collection_name`,`entity_id`),
  UNIQUE KEY `uq_collection_entity` (`user_id`,`collection_name`,`entity_id`),
  KEY `idx_user_collection` (`user_id`,`collection_name`),
  KEY `idx_user_updated` (`user_id`,`updated_at`),
  KEY `idx_ccr_collection_deleted` (`user_id`,`collection_name`,`deleted_at`),
  KEY `idx_ccr_uid_coll_txn_date` (`user_id`,`collection_name`,`txn_local_date`),
  KEY `idx_ccr_uid_cat_month` (`user_id`,`category_id`,`txn_month`),
  KEY `idx_ccr_uid_card_txn_date` (`user_id`,`card_id`,`txn_local_date`),
  KEY `idx_ccr_uid_loan_txn_date` (`user_id`,`loan_id`,`txn_local_date`),
  KEY `idx_ccr_uid_goal_txn_date` (`user_id`,`goal_id`,`txn_local_date`),
  KEY `idx_ccr_uid_amount_paise` (`user_id`,`amount_paise`),
  KEY `idx_col_user_collection` (`user_id`,`collection_name`),
  KEY `idx_col_user_updated` (`user_id`,`updated_at`),
  KEY `idx_col_deleted` (`deleted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Table structure for table `cloud_users`
--

DROP TABLE IF EXISTS `cloud_users`;
CREATE TABLE `cloud_users` (
  `id` varchar(191) NOT NULL,
  `username` varchar(24) NOT NULL,
  `display_name` varchar(60) NOT NULL,
  `pin_hash` varchar(255) NOT NULL,
  `pin_salt` varchar(64) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`),
  UNIQUE KEY `uq_cu_username` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Table structure for table `feature_flags_global`
--

DROP TABLE IF EXISTS `feature_flags_global`;
CREATE TABLE `feature_flags_global` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `feature_key` varchar(191) NOT NULL,
  `is_enabled` tinyint(1) NOT NULL DEFAULT 0,
  `description` varchar(255) DEFAULT NULL,
  `updated_by_user_id` varchar(191) DEFAULT NULL,
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `feature_key` (`feature_key`),
  UNIQUE KEY `uq_feature_key` (`feature_key`),
  KEY `fk_feature_flags_updated_by` (`updated_by_user_id`),
  KEY `fk_flags_updated_by` (`updated_by_user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Table structure for table `financial_effects`
--

DROP TABLE IF EXISTS `financial_effects`;
CREATE TABLE `financial_effects` (
  `id` varchar(191) NOT NULL,
  `event_id` varchar(191) NOT NULL,
  `user_id` varchar(191) NOT NULL,
  `target_type` varchar(32) NOT NULL,
  `target_id` varchar(191) NOT NULL,
  `effect_direction` enum('increase','decrease') NOT NULL,
  `amount_paise` bigint(20) NOT NULL,
  `component` varchar(32) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_fin_ef_event` (`event_id`),
  KEY `idx_fin_ef_user_target` (`user_id`,`target_type`,`target_id`),
  CONSTRAINT `fk_fin_ef_event` FOREIGN KEY (`event_id`) REFERENCES `financial_events` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_fin_ef_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Table structure for table `financial_events`
--

DROP TABLE IF EXISTS `financial_events`;
CREATE TABLE `financial_events` (
  `id` varchar(191) NOT NULL,
  `user_id` varchar(191) NOT NULL,
  `source_transaction_id` varchar(191) NOT NULL,
  `event_type` varchar(64) NOT NULL,
  `event_date` date NOT NULL,
  `amount_paise` bigint(20) NOT NULL,
  `currency` char(3) NOT NULL DEFAULT 'INR',
  `description` varchar(512) NOT NULL DEFAULT '',
  `source` varchar(32) NOT NULL DEFAULT 'transaction',
  `status` varchar(32) NOT NULL DEFAULT 'posted',
  `reversal_of_event_id` varchar(191) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_fin_event_txn` (`user_id`,`source_transaction_id`),
  KEY `idx_fin_ev_user_date` (`user_id`,`event_date`),
  KEY `idx_fin_ev_user_status` (`user_id`,`status`),
  CONSTRAINT `fk_fin_ev_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Table structure for table `login_attempts`
--

DROP TABLE IF EXISTS `login_attempts`;
CREATE TABLE `login_attempts` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `username` varchar(191) NOT NULL,
  `ip_address` varchar(64) NOT NULL,
  `attempt_count` int(11) NOT NULL DEFAULT 0,
  `locked_until` datetime DEFAULT NULL,
  `first_attempt_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_login_attempt` (`username`,`ip_address`),
  UNIQUE KEY `uq_login_attempt` (`username`,`ip_address`),
  KEY `idx_login_attempt_locked_until` (`locked_until`),
  KEY `idx_login_attempt_updated` (`updated_at`),
  KEY `idx_login_attempt_locked` (`locked_until`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Table structure for table `payments`
--

DROP TABLE IF EXISTS `payments`;
CREATE TABLE `payments` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` varchar(191) NOT NULL,
  `subscription_id` bigint(20) unsigned DEFAULT NULL,
  `amount_inr` decimal(10,2) NOT NULL,
  `currency` varchar(10) NOT NULL DEFAULT 'INR',
  `status` enum('created','authorized','captured','failed','refunded') NOT NULL DEFAULT 'created',
  `provider` enum('razorpay','manual') NOT NULL DEFAULT 'razorpay',
  `provider_order_id` varchar(191) NOT NULL,
  `provider_payment_id` varchar(191) DEFAULT NULL,
  `provider_signature` varchar(512) DEFAULT NULL,
  `failure_reason` mediumtext DEFAULT NULL,
  `refund_id` varchar(191) DEFAULT NULL,
  `paid_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `expected_amount_paise` bigint(20) unsigned DEFAULT NULL COMMENT 'amount in paise at order creation; used to validate captured event',
  `captured_amount_paise` bigint(20) unsigned DEFAULT NULL COMMENT 'validated captured payment amount in paise from provider webhook',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_pay_provider_order_id` (`provider`,`provider_order_id`),
  UNIQUE KEY `uq_pay_provider_payment_id` (`provider`,`provider_payment_id`),
  KEY `idx_payments_user_status` (`user_id`,`status`),
  KEY `idx_payments_provider_order_id` (`provider_order_id`),
  KEY `idx_payments_provider_payment_id` (`provider_payment_id`),
  KEY `idx_payments_paid_at` (`paid_at`),
  KEY `fk_payments_subscription` (`subscription_id`),
  KEY `idx_pay_user_status` (`user_id`,`status`),
  KEY `idx_pay_provider_order` (`provider_order_id`),
  KEY `idx_pay_provider_payment` (`provider_payment_id`),
  KEY `idx_pay_paid_at` (`paid_at`),
  KEY `fk_pay_subscription` (`subscription_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Table structure for table `plans`
--

DROP TABLE IF EXISTS `plans`;
CREATE TABLE `plans` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `code` varchar(64) NOT NULL,
  `name` varchar(120) NOT NULL,
  `description` mediumtext DEFAULT NULL,
  `price_inr` decimal(10,2) NOT NULL DEFAULT 0.00,
  `billing_interval` enum('monthly','yearly') NOT NULL DEFAULT 'monthly',
  `trial_days` int(11) NOT NULL DEFAULT 0,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `sort_order` int(11) NOT NULL DEFAULT 0,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `code` (`code`),
  UNIQUE KEY `uq_plans_code` (`code`),
  KEY `idx_plans_active_interval` (`is_active`,`billing_interval`),
  KEY `idx_plans_sort` (`sort_order`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Table structure for table `plan_features`
--

DROP TABLE IF EXISTS `plan_features`;
CREATE TABLE `plan_features` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `plan_id` bigint(20) unsigned NOT NULL,
  `feature_key` varchar(191) NOT NULL,
  `is_enabled` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `limit_value` bigint(20) DEFAULT NULL COMMENT 'numeric quota (e.g. 500 transactions/month)',
  `limit_unit` varchar(32) DEFAULT NULL COMMENT 'per_month | per_day | total | mb | seconds',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_plan_feature` (`plan_id`,`feature_key`),
  UNIQUE KEY `uq_plan_feature` (`plan_id`,`feature_key`),
  KEY `idx_plan_features_feature_key` (`feature_key`)
) ENGINE=InnoDB AUTO_INCREMENT=33 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Table structure for table `plan_prices`
--

DROP TABLE IF EXISTS `plan_prices`;
CREATE TABLE `plan_prices` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `plan_id` bigint(20) unsigned NOT NULL,
  `amount_paise` bigint(20) unsigned NOT NULL,
  `currency` char(3) NOT NULL DEFAULT 'INR',
  `billing_interval` enum('monthly','yearly') NOT NULL DEFAULT 'monthly',
  `starts_at` datetime NOT NULL,
  `ends_at` datetime DEFAULT NULL,
  `notes` varchar(255) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_pp_plan_starts` (`plan_id`,`starts_at`),
  CONSTRAINT `fk_pp_plan` FOREIGN KEY (`plan_id`) REFERENCES `plans` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Historical pricing per plan';

--
-- Table structure for table `retention_jobs`
--

DROP TABLE IF EXISTS `retention_jobs`;
CREATE TABLE `retention_jobs` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `job_key` varchar(64) NOT NULL,
  `started_at` datetime NOT NULL DEFAULT current_timestamp(),
  `finished_at` datetime DEFAULT NULL,
  `rows_swept` int(11) NOT NULL DEFAULT 0,
  `status` enum('running','ok','failed') NOT NULL DEFAULT 'running',
  `error_message` text DEFAULT NULL,
  `notes_json` longtext DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_ret_jobs_job_time` (`job_key`,`started_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Retention sweep bookkeeping';

--
-- Table structure for table `schema_version`
--

DROP TABLE IF EXISTS `schema_version`;
CREATE TABLE `schema_version` (
  `version_key` varchar(64) NOT NULL,
  `applied_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`version_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Table structure for table `subscriptions`
--

DROP TABLE IF EXISTS `subscriptions`;
CREATE TABLE `subscriptions` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` varchar(191) NOT NULL,
  `plan_id` bigint(20) unsigned NOT NULL,
  `status` enum('pending','trial','active','past_due','cancelled','expired') NOT NULL DEFAULT 'pending',
  `trial_ends_at` datetime DEFAULT NULL,
  `current_period_start` datetime DEFAULT NULL,
  `current_period_end` datetime DEFAULT NULL,
  `cancel_at_period_end` tinyint(1) NOT NULL DEFAULT 0,
  `cancelled_at` datetime DEFAULT NULL,
  `provider` enum('razorpay','manual') NOT NULL DEFAULT 'razorpay',
  `provider_subscription_id` varchar(191) DEFAULT NULL,
  `provider_customer_id` varchar(191) DEFAULT NULL,
  `provider_order_id` varchar(191) DEFAULT NULL,
  `notes` mediumtext DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `previous_period_end` datetime DEFAULT NULL COMMENT 'fair early renewal — extend from here, not NOW()',
  `renewed_from_subscription_id` bigint(20) unsigned DEFAULT NULL COMMENT 'FK-soft to prior subscription',
  `scheduled_plan_id` bigint(20) unsigned DEFAULT NULL COMMENT 'downgrade scheduled for next period',
  `scheduled_change_at` datetime DEFAULT NULL COMMENT 'when the scheduled plan change takes effect',
  PRIMARY KEY (`id`),
  KEY `idx_subscriptions_user_status` (`user_id`,`status`),
  KEY `idx_subscriptions_provider_sub_id` (`provider_subscription_id`),
  KEY `idx_subscriptions_provider_order_id` (`provider_order_id`),
  KEY `idx_sub_expires` (`status`,`current_period_end`),
  KEY `fk_subscriptions_plan` (`plan_id`),
  KEY `idx_sub_user_status` (`user_id`,`status`),
  KEY `idx_sub_period_end` (`current_period_end`),
  KEY `idx_sub_provider_sub_id` (`provider_subscription_id`),
  KEY `idx_sub_provider_order_id` (`provider_order_id`),
  KEY `fk_sub_plan` (`plan_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Table structure for table `udhari_entries`
--

DROP TABLE IF EXISTS `udhari_entries`;
CREATE TABLE `udhari_entries` (
  `id` varchar(191) NOT NULL,
  `user_id` varchar(191) NOT NULL,
  `person_id` varchar(191) NOT NULL,
  `direction` enum('given','received') NOT NULL,
  `amount_paise` bigint(20) NOT NULL DEFAULT 0,
  `due_date` date DEFAULT NULL,
  `settlement_status` varchar(32) NOT NULL DEFAULT 'open',
  `notes` varchar(500) NOT NULL DEFAULT '',
  `linked_transaction_id` varchar(191) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_udhari_ent_user` (`user_id`,`person_id`,`settlement_status`),
  KEY `idx_udhari_ent_person` (`person_id`),
  KEY `fk_udhari_ent_person` (`person_id`),
  CONSTRAINT `fk_udhari_ent_person` FOREIGN KEY (`person_id`) REFERENCES `udhari_people` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_udhari_ent_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Phase 9 udhari line items';

--
-- Table structure for table `udhari_people`
--

DROP TABLE IF EXISTS `udhari_people`;
CREATE TABLE `udhari_people` (
  `id` varchar(191) NOT NULL,
  `user_id` varchar(191) NOT NULL,
  `display_name` varchar(120) NOT NULL DEFAULT '',
  `phone_hash` varchar(128) NOT NULL DEFAULT '' COMMENT 'opaque hash; no raw phone',
  `relationship` varchar(64) NOT NULL DEFAULT 'other',
  `total_receivable_paise` bigint(20) NOT NULL DEFAULT 0,
  `total_payable_paise` bigint(20) NOT NULL DEFAULT 0,
  `risk_level` varchar(32) NOT NULL DEFAULT 'ok',
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_udhari_people_user` (`user_id`,`deleted_at`),
  CONSTRAINT `fk_udhari_people_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Phase 9 udhari people rollups';

--
-- Table structure for table `udhari_settlements`
--

DROP TABLE IF EXISTS `udhari_settlements`;
CREATE TABLE `udhari_settlements` (
  `id` varchar(191) NOT NULL,
  `user_id` varchar(191) NOT NULL,
  `person_id` varchar(191) NOT NULL,
  `udhari_entry_id` varchar(191) NOT NULL,
  `amount_paise` bigint(20) NOT NULL DEFAULT 0,
  `settlement_date` date NOT NULL,
  `account_id` varchar(191) DEFAULT NULL COMMENT 'NULL for write-off',
  `notes` varchar(500) NOT NULL DEFAULT '',
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_udhari_set_entry` (`udhari_entry_id`,`settlement_date`),
  KEY `idx_udhari_set_user` (`user_id`),
  KEY `fk_udhari_set_person` (`person_id`),
  CONSTRAINT `fk_udhari_set_entry` FOREIGN KEY (`udhari_entry_id`) REFERENCES `udhari_entries` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_udhari_set_person` FOREIGN KEY (`person_id`) REFERENCES `udhari_people` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_udhari_set_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Phase 9 settlement lines';

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
  `id` varchar(191) NOT NULL,
  `username` varchar(24) NOT NULL,
  `display_name` varchar(60) NOT NULL,
  `pin_hash` varchar(255) NOT NULL,
  `pin_salt` varchar(64) NOT NULL,
  `role` enum('user','admin') NOT NULL DEFAULT 'user',
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `last_login_at` datetime DEFAULT NULL,
  `mobile` varchar(32) DEFAULT NULL,
  `email` varchar(120) DEFAULT NULL,
  `avatar_emoji` varchar(16) DEFAULT NULL,
  `avatar_color` varchar(7) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `must_change_pin` tinyint(1) NOT NULL DEFAULT 0 COMMENT 'client must force a PIN change before any other admin action',
  `deleted_at` datetime DEFAULT NULL COMMENT 'self-service or admin soft-delete timestamp',
  `deleted_reason` varchar(120) DEFAULT NULL COMMENT 'self|admin|abuse|inactive — for audit',
  `last_policy_check_at` datetime DEFAULT NULL COMMENT 'when policy versions were last checked on login',
  `mobile_e164` varchar(20) DEFAULT NULL COMMENT 'PII — encrypt at app layer',
  `email_lc` varchar(254) DEFAULT NULL COMMENT 'lowercased email for lookup',
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`),
  UNIQUE KEY `uq_users_username` (`username`),
  KEY `idx_users_role_active` (`role`,`is_active`),
  KEY `idx_users_created_at` (`created_at`),
  KEY `idx_users_deleted` (`deleted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Table structure for table `user_audit_logs`
--

DROP TABLE IF EXISTS `user_audit_logs`;
CREATE TABLE `user_audit_logs` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` varchar(191) NOT NULL,
  `action_key` varchar(191) NOT NULL,
  `entity_type` varchar(191) NOT NULL DEFAULT '',
  `entity_id` varchar(191) NOT NULL DEFAULT '',
  `before_json` longtext DEFAULT NULL,
  `after_json` longtext DEFAULT NULL,
  `ip_address` varchar(64) NOT NULL DEFAULT '',
  `user_agent` varchar(512) NOT NULL DEFAULT '',
  `request_id` varchar(64) NOT NULL DEFAULT '',
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_ual_user_time` (`user_id`,`created_at`),
  KEY `idx_ual_action` (`action_key`),
  KEY `idx_ual_entity` (`entity_type`,`entity_id`),
  CONSTRAINT `fk_ual_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Per-user state-change audit trail';

--
-- Table structure for table `user_credit_cards`
--

DROP TABLE IF EXISTS `user_credit_cards`;
CREATE TABLE `user_credit_cards` (
  `id` varchar(191) NOT NULL,
  `user_id` varchar(191) NOT NULL,
  `card_name` varchar(120) NOT NULL DEFAULT '',
  `issuer_name` varchar(120) NOT NULL DEFAULT '',
  `last4` char(4) NOT NULL DEFAULT '',
  `credit_limit_paise` bigint(20) NOT NULL DEFAULT 0,
  `current_outstanding_paise` bigint(20) NOT NULL DEFAULT 0,
  `unbilled_amount_paise` bigint(20) NOT NULL DEFAULT 0,
  `statement_balance_paise` bigint(20) NOT NULL DEFAULT 0,
  `minimum_due_paise` bigint(20) NOT NULL DEFAULT 0,
  `statement_day` tinyint(3) unsigned NOT NULL DEFAULT 1,
  `due_day` tinyint(3) unsigned NOT NULL DEFAULT 15,
  `last_statement_date` date DEFAULT NULL,
  `next_due_date` date DEFAULT NULL,
  `interest_rate_bps` int(10) unsigned NOT NULL DEFAULT 0 COMMENT 'APR * 100',
  `annual_fee_paise` bigint(20) NOT NULL DEFAULT 0,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `deleted_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_user_cc_user_active` (`user_id`,`is_active`,`deleted_at`),
  CONSTRAINT `fk_user_cc_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Phase 7 shadow metrics per card';

--
-- Table structure for table `user_loans`
--

DROP TABLE IF EXISTS `user_loans`;
CREATE TABLE `user_loans` (
  `id` varchar(191) NOT NULL,
  `user_id` varchar(191) NOT NULL,
  `loan_name` varchar(120) NOT NULL DEFAULT '',
  `lender_name` varchar(120) NOT NULL DEFAULT '',
  `loan_type` varchar(32) NOT NULL DEFAULT 'personal',
  `principal_sanctioned_paise` bigint(20) NOT NULL DEFAULT 0,
  `disbursed_amount_paise` bigint(20) NOT NULL DEFAULT 0,
  `current_principal_paise` bigint(20) NOT NULL DEFAULT 0,
  `annual_interest_bps` int(10) unsigned NOT NULL DEFAULT 0 COMMENT 'APR * 100',
  `interest_type` varchar(32) NOT NULL DEFAULT 'reducing_balance',
  `emi_amount_paise` bigint(20) NOT NULL DEFAULT 0,
  `original_tenure_months` int(10) unsigned NOT NULL DEFAULT 0,
  `remaining_tenure_months` int(10) unsigned NOT NULL DEFAULT 0,
  `start_date` date DEFAULT NULL,
  `first_emi_date` date DEFAULT NULL,
  `due_day` tinyint(3) unsigned NOT NULL DEFAULT 1,
  `processing_fee_paise` bigint(20) NOT NULL DEFAULT 0,
  `insurance_fee_paise` bigint(20) NOT NULL DEFAULT 0,
  `prepayment_allowed` tinyint(1) NOT NULL DEFAULT 1,
  `foreclosure_charge_bps` int(10) unsigned NOT NULL DEFAULT 0,
  `status` varchar(32) NOT NULL DEFAULT 'active',
  `lifecycle_mode` varchar(32) NOT NULL DEFAULT 'fresh',
  `deleted_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_user_loans_user` (`user_id`,`status`,`deleted_at`),
  CONSTRAINT `fk_user_loans_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Phase 8 loan shadow';

--
-- Table structure for table `user_loan_payments`
--

DROP TABLE IF EXISTS `user_loan_payments`;
CREATE TABLE `user_loan_payments` (
  `id` varchar(191) NOT NULL,
  `user_id` varchar(191) NOT NULL,
  `loan_id` varchar(191) NOT NULL,
  `due_month` char(7) NOT NULL COMMENT 'YYYY-MM',
  `due_date` date NOT NULL,
  `paid_date` date DEFAULT NULL,
  `scheduled_emi_paise` bigint(20) NOT NULL DEFAULT 0,
  `actual_paid_paise` bigint(20) NOT NULL DEFAULT 0,
  `principal_component_paise` bigint(20) NOT NULL DEFAULT 0,
  `interest_component_paise` bigint(20) NOT NULL DEFAULT 0,
  `penalty_paise` bigint(20) NOT NULL DEFAULT 0,
  `fee_paise` bigint(20) NOT NULL DEFAULT 0,
  `extra_principal_paise` bigint(20) NOT NULL DEFAULT 0,
  `opening_principal_paise` bigint(20) NOT NULL DEFAULT 0,
  `closing_principal_paise` bigint(20) NOT NULL DEFAULT 0,
  `status` varchar(32) NOT NULL DEFAULT 'due',
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_user_loan_pay_loan` (`loan_id`,`due_month`),
  KEY `idx_user_loan_pay_user` (`user_id`),
  CONSTRAINT `fk_user_loan_pay_loan` FOREIGN KEY (`loan_id`) REFERENCES `user_loans` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_user_loan_pay_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Phase 8 EMI payment ledger';

--
-- Table structure for table `user_policy_acceptances`
--

DROP TABLE IF EXISTS `user_policy_acceptances`;
CREATE TABLE `user_policy_acceptances` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` varchar(191) NOT NULL,
  `policy_key` varchar(64) NOT NULL COMMENT 'terms | privacy | cookie | data_processing',
  `version` varchar(32) NOT NULL,
  `accepted_at` datetime NOT NULL DEFAULT current_timestamp(),
  `ip_address` varchar(64) NOT NULL DEFAULT '',
  `user_agent` varchar(512) NOT NULL DEFAULT '',
  `withdrawn_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_user_policy_version` (`user_id`,`policy_key`,`version`),
  KEY `idx_upa_user` (`user_id`,`policy_key`),
  CONSTRAINT `fk_upa_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Per-user acceptance of policy versions';

--
-- Table structure for table `user_security_recovery`
--

DROP TABLE IF EXISTS `user_security_recovery`;
CREATE TABLE `user_security_recovery` (
  `user_id` varchar(191) NOT NULL,
  `security_question` varchar(255) NOT NULL,
  `security_answer_hash` varchar(255) NOT NULL,
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Table structure for table `webhook_events`
--

DROP TABLE IF EXISTS `webhook_events`;
CREATE TABLE `webhook_events` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `provider` enum('razorpay') NOT NULL DEFAULT 'razorpay',
  `event_id` varchar(191) NOT NULL,
  `event_type` varchar(191) NOT NULL,
  `signature_valid` tinyint(1) NOT NULL DEFAULT 0,
  `payload_json` longtext NOT NULL,
  `processed_at` datetime DEFAULT NULL,
  `processing_status` enum('pending','processed','failed') NOT NULL DEFAULT 'pending',
  `error_message` mediumtext DEFAULT NULL,
  `retry_count` tinyint(3) unsigned NOT NULL DEFAULT 0,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `event_id` (`event_id`),
  UNIQUE KEY `uq_webhook_event_id` (`event_id`),
  KEY `idx_webhook_events_provider_status` (`provider`,`processing_status`),
  KEY `idx_webhook_created` (`created_at`),
  KEY `idx_webhook_provider_status` (`provider`,`processing_status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Data for table `admin_audit_logs` (0 rows)
--

--
-- Data for table `ai_suggestions` (0 rows)
--

--
-- Data for table `api_rate_limits` (13 rows)
--

INSERT INTO `api_rate_limits` (`id`, `bucket_key`, `hit_count`, `window_start`, `updated_at`) VALUES
(1, 'auth_login|171.61.163.16', 3, '2026-05-01 13:54:34', '2026-05-01 13:54:55'),
(3, 'auth_register|171.61.163.16', 1, '2026-05-01 13:54:54', '2026-05-01 13:54:54'),
(5, 'auth_login|152.59.3.95', 2, '2026-05-01 13:55:56', '2026-05-01 13:55:56'),
(7, 'auth_login|103.241.224.218', 5, '2026-05-02 07:41:26', '2026-05-02 07:41:55'),
(12, 'auth_register|152.59.5.7', 1, '2026-05-02 13:22:28', '2026-05-02 13:22:28'),
(13, 'auth_login|152.59.5.7', 1, '2026-05-02 13:22:29', '2026-05-02 13:22:29'),
(14, 'auth_login|152.59.0.225', 2, '2026-05-02 13:34:46', '2026-05-02 13:34:46'),
(16, 'auth_login|103.39.128.174', 2, '2026-05-03 13:46:27', '2026-05-03 13:46:28'),
(20, 'auth_login|152.59.5.106', 1, '2026-05-03 14:13:58', '2026-05-03 14:13:58'),
(21, 'auth_login|171.61.165.39', 2, '2026-05-04 10:37:09', '2026-05-04 10:37:09'),
(22, 'auth_login|103.39.128.150', 2, '2026-05-06 16:05:06', '2026-05-06 16:05:07'),
(24, 'auth_login|171.61.167.185', 2, '2026-05-07 15:17:39', '2026-05-07 15:17:40'),
(25, 'auth_login|103.228.147.226', 2, '2026-05-11 04:50:24', '2026-05-11 04:50:26');

--
-- Data for table `app_settings` (8 rows)
--

INSERT INTO `app_settings` (`id`, `setting_key`, `setting_value`, `is_public`, `updated_by_user_id`, `updated_at`, `created_at`) VALUES
(1, 'app_title', '\"SparowVault\"', 1, NULL, '2026-05-01 13:54:03', '2026-05-01 13:54:03'),
(2, 'logo_url', '\"\"', 1, NULL, '2026-05-01 13:54:03', '2026-05-01 13:54:03'),
(3, 'favicon_url', '\"\"', 1, NULL, '2026-05-01 13:54:03', '2026-05-01 13:54:03'),
(4, 'support_email', '\"support@example.com\"', 1, NULL, '2026-05-01 13:54:03', '2026-05-01 13:54:03'),
(5, 'privacy_url', '\"/privacy\"', 1, NULL, '2026-05-01 13:54:03', '2026-05-01 13:54:03'),
(6, 'terms_url', '\"/terms\"', 1, NULL, '2026-05-01 13:54:03', '2026-05-01 13:54:03'),
(7, 'theme_accent', '\"#0ea5e9\"', 1, NULL, '2026-05-01 13:54:03', '2026-05-01 13:54:03'),
(8, 'theme_primary', '\"#1d4ed8\"', 1, NULL, '2026-05-01 13:54:03', '2026-05-01 13:54:03');

--
-- Data for table `audit_logs` (0 rows)
--

--
-- Data for table `cloud_collection_rows` (139 rows)
--

INSERT INTO `cloud_collection_rows` (`id`, `user_id`, `collection_name`, `entity_id`, `payload`, `updated_at`, `deleted_at`, `created_at`, `amount_paise`, `schema_version`, `txn_local_date`, `txn_month`, `txn_type`, `payment_mode`, `category_id`, `account_id`, `card_id`, `loan_id`, `goal_id`, `udhari_id`, `business_or_personal`, `source_device_id`, `payload_hash`) VALUES
('row_02d953e8c68e025bf5428405', 'cu_85024323863151a04375d3e5', 'transactions', 'txn_mp121ioq_p21dk9h066a19nfd', '{\"id\":\"txn_mp121ioq_p21dk9h066a19nfd\",\"userId\":\"cu_85024323863151a04375d3e5\",\"createdAt\":\"2026-05-11T10:24:24.794Z\",\"updatedAt\":\"2026-05-11T10:24:28.000Z\",\"isDeleted\":0,\"version\":1,\"tags\":[],\"notes\":\"\",\"date\":\"2026-05-10T18:30:00.000Z\",\"type\":\"expense\",\"amount\":30,\"categoryId\":\"cat_moq4vw8q_6b099gvhyea1hggw\",\"accountId\":\"acc_moopckwl_uoxw3nmnyvq8j4uh\",\"toAccountId\":\"\",\"linkedCardId\":\"\",\"linkedLoanId\":\"\",\"linkedGoalId\":\"\",\"linkedUdhariId\":\"\",\"linkedSavingsId\":\"\",\"paymentMode\":\"upi\",\"merchantOrPerson\":\"Milk & Food Packet\",\"description\":\"\",\"billAvailable\":0,\"gstApplicable\":0,\"taxFlag\":0,\"businessOrPersonal\":\"personal\",\"needWant\":\"unassigned\",\"fixedVariable\":\"unassigned\",\"plannedUnplanned\":\"unassigned\"}', '2026-05-11 04:54:28', NULL, '2026-05-11 10:24:28', 3000, 1, '2026-05-09 18:30:00', '2026-05', 'expense', 'upi', 'cat_moq4vw8q_6b099gvhyea1hggw', 'acc_moopckwl_uoxw3nmnyvq8j4uh', '', NULL, NULL, NULL, 'personal', NULL, '2f0012d5dc0c0ed85f8c9eae485b9baad9276e9a4abdf97d364dd6f2f5050dcc'),
('row_030b7e809f60371ef5a91bb6', 'cu_521c089bd5eaca0e152039e2', 'transactions', 'txn_movypivf_dibzu0y0vjo5h8pg', '{\"id\":\"txn_movypivf_dibzu0y0vjo5h8pg\",\"userId\":\"cu_521c089bd5eaca0e152039e2\",\"createdAt\":\"2026-05-07T20:52:15.435Z\",\"updatedAt\":\"2026-05-07T20:52:16.000Z\",\"isDeleted\":0,\"version\":1,\"tags\":[],\"notes\":\"\",\"date\":\"2026-05-06T18:30:00.000Z\",\"type\":\"expense\",\"amount\":285.56999999999999317878973670303821563720703125,\"categoryId\":\"cat_mopd5p4h_e0h3t1a65h8aa8ko\",\"accountId\":\"acc_moosa3qj_hj3adif2i3hpl7df\",\"toAccountId\":\"\",\"linkedCardId\":\"\",\"linkedLoanId\":\"\",\"linkedGoalId\":\"\",\"linkedUdhariId\":\"\",\"linkedSavingsId\":\"\",\"paymentMode\":\"credit_card\",\"merchantOrPerson\":\"Claude token\",\"description\":\"\",\"billAvailable\":0,\"gstApplicable\":0,\"taxFlag\":0,\"businessOrPersonal\":\"personal\",\"needWant\":\"unassigned\",\"fixedVariable\":\"unassigned\",\"plannedUnplanned\":\"unassigned\"}', '2026-05-07 15:22:16', NULL, '2026-05-07 20:52:16', 28557, 1, '2026-05-05 18:30:00', '2026-05', 'expense', 'credit_card', 'cat_mopd5p4h_e0h3t1a65h8aa8ko', 'acc_moosa3qj_hj3adif2i3hpl7df', '', NULL, NULL, NULL, 'personal', NULL, '89b6ee885c690673c039a4ee3e81c9c334b2b6b658f1a90883e79832c804a008'),
('row_094f5089838308f2be97bfbd', 'cu_521c089bd5eaca0e152039e2', 'transactions', 'txn_moqu0el8_14chadfb56k85jrw', '{\"id\":\"txn_moqu0el8_14chadfb56k85jrw\",\"userId\":\"cu_521c089bd5eaca0e152039e2\",\"createdAt\":\"2026-05-04T06:41:54.140Z\",\"updatedAt\":\"2026-05-04T06:41:55.000Z\",\"isDeleted\":0,\"version\":1,\"tags\":[],\"notes\":\"\",\"date\":\"2026-05-02T18:30:00.000Z\",\"type\":\"expense\",\"amount\":452,\"categoryId\":\"cat_mopi8v9k_qewycy5n6mvvax1o\",\"accountId\":\"acc_moosa3qj_hj3adif2i3hpl7df\",\"toAccountId\":\"\",\"linkedCardId\":\"\",\"linkedLoanId\":\"\",\"linkedGoalId\":\"\",\"linkedUdhariId\":\"\",\"linkedSavingsId\":\"\",\"paymentMode\":\"upi\",\"merchantOrPerson\":\"Blinkit\",\"description\":\"\",\"billAvailable\":0,\"gstApplicable\":0,\"taxFlag\":0,\"businessOrPersonal\":\"personal\",\"needWant\":\"unassigned\",\"fixedVariable\":\"unassigned\",\"plannedUnplanned\":\"unassigned\"}', '2026-05-04 01:11:55', NULL, '2026-05-04 06:41:55', 45200, 1, '2026-05-01 18:30:00', '2026-05', 'expense', 'upi', 'cat_mopi8v9k_qewycy5n6mvvax1o', 'acc_moosa3qj_hj3adif2i3hpl7df', '', NULL, NULL, NULL, 'personal', NULL, '469707ea183bd23fe8f0dea388fe357487a64c89840173caefe0cd1fd55c1687'),
('row_097037212f703cd820c6ea36', 'cu_521c089bd5eaca0e152039e2', 'categories', 'cat_mopd7m7l_bhzqylu68kh8suqi', '{\"id\":\"cat_mopd7m7l_bhzqylu68kh8suqi\",\"userId\":\"cu_521c089bd5eaca0e152039e2\",\"createdAt\":\"2026-05-03T06:03:50.961Z\",\"updatedAt\":\"2026-05-03T08:24:31.000Z\",\"isDeleted\":1,\"version\":2,\"tags\":[],\"notes\":\"\",\"name\":\"BlinkIT\",\"appliesTo\":\"expense\",\"icon\":\"\\ud83d\\uded2\",\"color\":\"#0ea5e9\",\"budgetable\":1,\"taxRelevant\":0,\"gstRelevant\":0,\"parentId\":null,\"sortOrder\":999,\"archived\":0}', '2026-05-03 02:54:31', '2026-05-03 02:54:31', '2026-05-03 06:03:56', NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
('row_1216115ba3ed8176da2b073b', 'cu_521c089bd5eaca0e152039e2', 'transactions', 'txn_moyihuw0_ucxf8hc1lkv860pv', '{\"id\":\"txn_moyihuw0_ucxf8hc1lkv860pv\",\"userId\":\"cu_521c089bd5eaca0e152039e2\",\"createdAt\":\"2026-05-09T15:41:42.432Z\",\"updatedAt\":\"2026-05-09T15:41:43.000Z\",\"isDeleted\":0,\"version\":1,\"tags\":[],\"notes\":\"\",\"date\":\"2026-05-08T18:30:00.000Z\",\"type\":\"income\",\"amount\":608,\"categoryId\":\"cat_mopilywn_830g8ygnfr999o40\",\"accountId\":\"acc_moosa3qj_hj3adif2i3hpl7df\",\"toAccountId\":\"\",\"linkedCardId\":\"\",\"linkedLoanId\":\"\",\"linkedGoalId\":\"\",\"linkedUdhariId\":\"\",\"linkedSavingsId\":\"\",\"paymentMode\":\"upi\",\"merchantOrPerson\":\"Pizza Comtro\",\"description\":\"\",\"billAvailable\":0,\"gstApplicable\":0,\"taxFlag\":0,\"businessOrPersonal\":\"personal\",\"needWant\":\"unassigned\",\"fixedVariable\":\"unassigned\",\"plannedUnplanned\":\"unassigned\"}', '2026-05-09 10:11:43', NULL, '2026-05-09 15:41:43', 60800, 1, '2026-05-07 18:30:00', '2026-05', 'income', 'upi', 'cat_mopilywn_830g8ygnfr999o40', 'acc_moosa3qj_hj3adif2i3hpl7df', '', NULL, NULL, NULL, 'personal', NULL, '4b6b3a852bca28f41f6f1193ff7a8e723b6a44fdbb62b044542d60fa2e7bb6da'),
('row_133db9dcee8d01756217c479', 'cu_521c089bd5eaca0e152039e2', 'categories', 'cat_mopid2ir_ly26vx6yqc4irq1j', '{\"id\":\"cat_mopid2ir_ly26vx6yqc4irq1j\",\"userId\":\"cu_521c089bd5eaca0e152039e2\",\"createdAt\":\"2026-05-03T08:28:03.459Z\",\"updatedAt\":\"2026-05-03T08:28:04.000Z\",\"isDeleted\":0,\"version\":1,\"tags\":[],\"notes\":\"\",\"name\":\"Business\",\"appliesTo\":\"income\",\"icon\":\"\\ud83d\\udcbc\",\"color\":\"#0ea5e9\",\"budgetable\":1,\"taxRelevant\":0,\"gstRelevant\":0,\"parentId\":null,\"sortOrder\":999,\"archived\":0}', '2026-05-03 02:58:04', NULL, '2026-05-03 08:28:04', NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
('row_187d1f1a5d1f5771f6c9fcb8', 'cu_521c089bd5eaca0e152039e2', 'transactions', 'txn_mopikhnt_soyunlyrdh9lcptf', '{\"id\":\"txn_mopikhnt_soyunlyrdh9lcptf\",\"userId\":\"cu_521c089bd5eaca0e152039e2\",\"createdAt\":\"2026-05-03T08:33:49.673Z\",\"updatedAt\":\"2026-05-03T08:33:50.000Z\",\"isDeleted\":0,\"version\":1,\"tags\":[],\"notes\":\"\",\"date\":\"2026-05-02T18:30:00.000Z\",\"type\":\"expense\",\"amount\":256,\"categoryId\":\"cat_mopi9l71_up6us90eminu4zh9\",\"accountId\":\"acc_moosa3qj_hj3adif2i3hpl7df\",\"toAccountId\":\"\",\"linkedCardId\":\"\",\"linkedLoanId\":\"\",\"linkedGoalId\":\"\",\"linkedUdhariId\":\"\",\"linkedSavingsId\":\"\",\"paymentMode\":\"upi\",\"merchantOrPerson\":\"Diy \",\"description\":\"\",\"billAvailable\":0,\"gstApplicable\":0,\"taxFlag\":0,\"businessOrPersonal\":\"personal\",\"needWant\":\"unassigned\",\"fixedVariable\":\"unassigned\",\"plannedUnplanned\":\"unassigned\"}', '2026-05-03 03:03:50', NULL, '2026-05-03 08:33:50', 25600, 1, '2026-05-01 18:30:00', '2026-05', 'expense', 'upi', 'cat_mopi9l71_up6us90eminu4zh9', 'acc_moosa3qj_hj3adif2i3hpl7df', '', NULL, NULL, NULL, 'personal', NULL, 'f4b22c1e119e2f7b894e6a1bca4bd7525c6f26f9ddcf20a5ee9b999bc02cd275'),
('row_18a19e2f07e71eae60440fd2', 'cu_85024323863151a04375d3e5', 'transactions', 'txn_moykvs9c_sz1jhq1y8cjsf2al', '{\"id\":\"txn_moykvs9c_sz1jhq1y8cjsf2al\",\"userId\":\"cu_85024323863151a04375d3e5\",\"createdAt\":\"2026-05-09T16:48:31.440Z\",\"updatedAt\":\"2026-05-09T16:53:08.000Z\",\"isDeleted\":0,\"version\":2,\"tags\":[],\"notes\":\"\",\"date\":\"2026-05-08T18:30:00.000Z\",\"type\":\"expense\",\"amount\":1400,\"categoryId\":\"cat_moq56yg5_vr694rs6095w8yui\",\"accountId\":\"acc_moopbws1_c65oqcylv9tpac90\",\"toAccountId\":\"\",\"linkedCardId\":\"\",\"linkedLoanId\":\"\",\"linkedGoalId\":\"\",\"linkedUdhariId\":\"\",\"linkedSavingsId\":\"\",\"paymentMode\":\"upi\",\"merchantOrPerson\":\"Bike Battery\",\"description\":\"\",\"billAvailable\":0,\"gstApplicable\":0,\"taxFlag\":0,\"businessOrPersonal\":\"personal\",\"needWant\":\"unassigned\",\"fixedVariable\":\"unassigned\",\"plannedUnplanned\":\"unassigned\"}', '2026-05-09 11:23:08', NULL, '2026-05-09 16:48:33', 140000, 1, '2026-05-07 18:30:00', '2026-05', 'expense', 'upi', 'cat_moq56yg5_vr694rs6095w8yui', 'acc_moopbws1_c65oqcylv9tpac90', '', NULL, NULL, NULL, 'personal', NULL, '868bfca9a98301c9af59bebb95ab745be769826308f94f9963b57821a9dbfc2e'),
('row_195ebfd478632d331f8aa3af', 'cu_85024323863151a04375d3e5', 'transactions', 'txn_moq6bgz8_1jctcib0v3zg2y2u', '{\"id\":\"txn_moq6bgz8_1jctcib0v3zg2y2u\",\"userId\":\"cu_85024323863151a04375d3e5\",\"createdAt\":\"2026-05-03T19:38:39.668Z\",\"updatedAt\":\"2026-05-03T19:38:44.000Z\",\"isDeleted\":0,\"version\":1,\"tags\":[],\"notes\":\"\",\"date\":\"2026-05-03T18:30:00.000Z\",\"type\":\"income\",\"amount\":1670,\"categoryId\":\"\",\"accountId\":\"acc_moopbws1_c65oqcylv9tpac90\",\"toAccountId\":\"\",\"linkedCardId\":\"\",\"linkedLoanId\":\"\",\"linkedGoalId\":\"\",\"linkedUdhariId\":\"\",\"linkedSavingsId\":\"\",\"paymentMode\":\"auto_debit\",\"merchantOrPerson\":\"saving\",\"description\":\"\",\"billAvailable\":0,\"gstApplicable\":0,\"taxFlag\":0,\"businessOrPersonal\":\"personal\",\"needWant\":\"unassigned\",\"fixedVariable\":\"unassigned\",\"plannedUnplanned\":\"unassigned\"}', '2026-05-03 14:08:44', NULL, '2026-05-03 19:38:44', 167000, 1, '2026-05-02 18:30:00', '2026-05', 'income', 'auto_debit', '', 'acc_moopbws1_c65oqcylv9tpac90', '', NULL, NULL, NULL, 'personal', NULL, 'e6866fe7571fd33ab266acd9ee90dda95d2b3bf8645a513f22729c2fb5fa99f2'),
('row_19daf939fb4724d137f07d2e', 'cu_85024323863151a04375d3e5', 'cards', 'crd_moopf9t0_pmledmdwk4hxjd4d', '{\"id\":\"crd_moopf9t0_pmledmdwk4hxjd4d\",\"userId\":\"cu_85024323863151a04375d3e5\",\"createdAt\":\"2026-05-02T18:57:57.348Z\",\"updatedAt\":\"2026-05-02T18:58:33.000Z\",\"isDeleted\":1,\"version\":2,\"tags\":[],\"notes\":\"\",\"nickname\":\"FREEDOM\",\"bank\":\"HDFC Bank\",\"last4\":\"5702\",\"type\":\"credit\",\"linkedAccountId\":\"\",\"creditLimit\":47000,\"statementDay\":20,\"dueDay\":2,\"interestRate\":0,\"annualFee\":500,\"rewardNote\":\"\",\"color\":\"#8b5cf6\",\"isInactive\":0}', '2026-05-02 13:28:33', '2026-05-02 13:28:33', '2026-05-02 18:58:14', NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
('row_1aa12131a19373f44475f969', 'cu_521c089bd5eaca0e152039e2', 'categories', 'cat_mopd7lzo_o4qm34uqwe661xvj', '{\"id\":\"cat_mopd7lzo_o4qm34uqwe661xvj\",\"userId\":\"cu_521c089bd5eaca0e152039e2\",\"createdAt\":\"2026-05-03T06:03:50.676Z\",\"updatedAt\":\"2026-05-03T08:24:26.000Z\",\"isDeleted\":1,\"version\":2,\"tags\":[],\"notes\":\"\",\"name\":\"BlinkIT\",\"appliesTo\":\"expense\",\"icon\":\"\\ud83d\\uded2\",\"color\":\"#0ea5e9\",\"budgetable\":1,\"taxRelevant\":0,\"gstRelevant\":0,\"parentId\":null,\"sortOrder\":999,\"archived\":0}', '2026-05-03 02:54:26', '2026-05-03 02:54:26', '2026-05-03 06:03:55', NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
('row_1e7ce996cd904486079d4768', 'cu_85024323863151a04375d3e5', 'transactions', 'txn_mowr4d2a_3ftvqm4jh6u4hcdb', '{\"id\":\"txn_mowr4d2a_3ftvqm4jh6u4hcdb\",\"userId\":\"cu_85024323863151a04375d3e5\",\"createdAt\":\"2026-05-08T10:07:36.994Z\",\"updatedAt\":\"2026-05-09T16:57:09.000Z\",\"isDeleted\":0,\"version\":2,\"tags\":[],\"notes\":\"\",\"date\":\"2026-05-07T18:30:00.000Z\",\"type\":\"income\",\"amount\":3200,\"categoryId\":\"\",\"accountId\":\"acc_moopckwl_uoxw3nmnyvq8j4uh\",\"toAccountId\":\"\",\"linkedCardId\":\"\",\"linkedLoanId\":\"\",\"linkedGoalId\":\"\",\"linkedUdhariId\":\"\",\"linkedSavingsId\":\"\",\"paymentMode\":\"upi\",\"merchantOrPerson\":\"Gaurav Shing\",\"description\":\"\",\"billAvailable\":0,\"gstApplicable\":0,\"taxFlag\":0,\"businessOrPersonal\":\"personal\",\"needWant\":\"unassigned\",\"fixedVariable\":\"unassigned\",\"plannedUnplanned\":\"unassigned\"}', '2026-05-09 11:27:09', NULL, '2026-05-08 10:07:38', 320000, 1, '2026-05-06 18:30:00', '2026-05', 'income', 'upi', '', 'acc_moopckwl_uoxw3nmnyvq8j4uh', '', NULL, NULL, NULL, 'personal', NULL, 'c9daca7ff5b8501de1ef0a20e5b2b61a211a002887e82a4e208882b4e573b40a'),
('row_1f24a942814c5be57c8d187f', 'cu_521c089bd5eaca0e152039e2', 'transactions', 'txn_mowj97hj_zsaics45oa281k2p', '{\"id\":\"txn_mowj97hj_zsaics45oa281k2p\",\"userId\":\"cu_521c089bd5eaca0e152039e2\",\"createdAt\":\"2026-05-08T06:27:26.119Z\",\"updatedAt\":\"2026-05-08T06:27:27.000Z\",\"isDeleted\":0,\"version\":1,\"tags\":[],\"notes\":\"\",\"date\":\"2026-05-07T18:30:00.000Z\",\"type\":\"expense\",\"amount\":368.05000000000001136868377216160297393798828125,\"categoryId\":\"cat_mopd695a_dkhmbr7h0lgnqhnl\",\"accountId\":\"acc_moosa3qj_hj3adif2i3hpl7df\",\"toAccountId\":\"\",\"linkedCardId\":\"\",\"linkedLoanId\":\"\",\"linkedGoalId\":\"\",\"linkedUdhariId\":\"\",\"linkedSavingsId\":\"\",\"paymentMode\":\"upi\",\"merchantOrPerson\":\"zomato\",\"description\":\"\",\"billAvailable\":0,\"gstApplicable\":0,\"taxFlag\":0,\"businessOrPersonal\":\"personal\",\"needWant\":\"unassigned\",\"fixedVariable\":\"unassigned\",\"plannedUnplanned\":\"unassigned\"}', '2026-05-08 00:57:27', NULL, '2026-05-08 06:27:27', 36805, 1, '2026-05-06 18:30:00', '2026-05', 'expense', 'upi', 'cat_mopd695a_dkhmbr7h0lgnqhnl', 'acc_moosa3qj_hj3adif2i3hpl7df', '', NULL, NULL, NULL, 'personal', NULL, '3d8353943f0dacdc3da2523d1d759b29b6457841a975a40650262311fee516bd'),
('row_202a510a9ad917eab70b22e3', 'cu_85024323863151a04375d3e5', 'cards', 'crd_moopfe03_lf6q02aaj8zbiksf', '{\"id\":\"crd_moopfe03_lf6q02aaj8zbiksf\",\"userId\":\"cu_85024323863151a04375d3e5\",\"createdAt\":\"2026-05-02T18:58:02.787Z\",\"updatedAt\":\"2026-05-02T18:58:36.000Z\",\"isDeleted\":1,\"version\":2,\"tags\":[],\"notes\":\"\",\"nickname\":\"FREEDOM\",\"bank\":\"HDFC Bank\",\"last4\":\"5702\",\"type\":\"credit\",\"linkedAccountId\":\"\",\"creditLimit\":47000,\"statementDay\":20,\"dueDay\":2,\"interestRate\":0,\"annualFee\":500,\"rewardNote\":\"\",\"color\":\"#8b5cf6\",\"isInactive\":0}', '2026-05-02 13:28:36', '2026-05-02 13:28:36', '2026-05-02 18:58:15', NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
('row_21fccea9b20577f02113fa20', 'cu_521c089bd5eaca0e152039e2', 'categories', 'cat_mopd5p4h_e0h3t1a65h8aa8ko', '{\"id\":\"cat_mopd5p4h_e0h3t1a65h8aa8ko\",\"userId\":\"cu_521c089bd5eaca0e152039e2\",\"createdAt\":\"2026-05-03T06:02:21.425Z\",\"updatedAt\":\"2026-05-03T06:02:41.000Z\",\"isDeleted\":0,\"version\":2,\"tags\":[],\"notes\":\"\",\"name\":\"Subscription\",\"appliesTo\":\"expense\",\"icon\":\"\\ud83d\\udcbb\",\"color\":\"#3b82f6\",\"budgetable\":1,\"taxRelevant\":0,\"gstRelevant\":0,\"parentId\":null,\"sortOrder\":999,\"archived\":0}', '2026-05-03 00:32:41', NULL, '2026-05-03 06:02:22', NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
('row_25dd0d9fc9a3eb54a6bb6a2e', 'cu_521c089bd5eaca0e152039e2', 'accounts', 'acc_moosc9t3_bf8f2yn0bc7ekeix', '{\"id\":\"acc_moosc9t3_bf8f2yn0bc7ekeix\",\"userId\":\"cu_521c089bd5eaca0e152039e2\",\"createdAt\":\"2026-05-02T20:19:36.231Z\",\"updatedAt\":\"2026-05-02T20:19:36.000Z\",\"isDeleted\":0,\"version\":1,\"tags\":[],\"notes\":\"\",\"name\":\"Induslnd  Bank\",\"type\":\"savings\",\"institution\":\"Induslnd  Bank\",\"openingBalance\":1090,\"color\":\"#b3475d\",\"icon\":\"wallet\",\"isInactive\":0}', '2026-05-02 14:49:36', NULL, '2026-05-02 20:19:36', NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
('row_267f57cd4799aa8f253c111e', 'cu_85024323863151a04375d3e5', 'cards', 'crd_moopfbmz_j3sjp011xagh37b4', '{\"id\":\"crd_moopfbmz_j3sjp011xagh37b4\",\"userId\":\"cu_85024323863151a04375d3e5\",\"createdAt\":\"2026-05-02T18:57:59.723Z\",\"updatedAt\":\"2026-05-02T18:58:29.000Z\",\"isDeleted\":1,\"version\":2,\"tags\":[],\"notes\":\"\",\"nickname\":\"FREEDOM\",\"bank\":\"HDFC Bank\",\"last4\":\"5702\",\"type\":\"credit\",\"linkedAccountId\":\"\",\"creditLimit\":47000,\"statementDay\":20,\"dueDay\":2,\"interestRate\":0,\"annualFee\":500,\"rewardNote\":\"\",\"color\":\"#8b5cf6\",\"isInactive\":0}', '2026-05-02 13:28:29', '2026-05-02 13:28:29', '2026-05-02 18:58:13', NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
('row_2cf8404e4cf8dc56af642d9e', 'cu_521c089bd5eaca0e152039e2', 'transactions', 'txn_mopiigc1_3ikq08gufysf721k', '{\"id\":\"txn_mopiigc1_3ikq08gufysf721k\",\"userId\":\"cu_521c089bd5eaca0e152039e2\",\"createdAt\":\"2026-05-03T08:32:14.641Z\",\"updatedAt\":\"2026-05-03T08:32:15.000Z\",\"isDeleted\":0,\"version\":1,\"tags\":[],\"notes\":\"\",\"date\":\"2026-05-01T18:30:00.000Z\",\"type\":\"expense\",\"amount\":220,\"categoryId\":\"cat_mopd695a_dkhmbr7h0lgnqhnl\",\"accountId\":\"acc_moosa3qj_hj3adif2i3hpl7df\",\"toAccountId\":\"\",\"linkedCardId\":\"\",\"linkedLoanId\":\"\",\"linkedGoalId\":\"\",\"linkedUdhariId\":\"\",\"linkedSavingsId\":\"\",\"paymentMode\":\"upi\",\"merchantOrPerson\":\"Lassi\",\"description\":\"\",\"billAvailable\":0,\"gstApplicable\":0,\"taxFlag\":0,\"businessOrPersonal\":\"personal\",\"needWant\":\"unassigned\",\"fixedVariable\":\"unassigned\",\"plannedUnplanned\":\"unassigned\"}', '2026-05-03 03:02:15', NULL, '2026-05-03 08:32:15', 22000, 1, '2026-04-30 18:30:00', '2026-05', 'expense', 'upi', 'cat_mopd695a_dkhmbr7h0lgnqhnl', 'acc_moosa3qj_hj3adif2i3hpl7df', '', NULL, NULL, NULL, 'personal', NULL, '4fd41be6cdf576bc872cee73542250e65a876b6d9204b324a8de4b078ecfd642'),
('row_34c67c46e218021511091d6f', 'cu_521c089bd5eaca0e152039e2', 'categories', 'cat_mopd7lvb_veuhvlumwtmy30tp', '{\"id\":\"cat_mopd7lvb_veuhvlumwtmy30tp\",\"userId\":\"cu_521c089bd5eaca0e152039e2\",\"createdAt\":\"2026-05-03T06:03:50.519Z\",\"updatedAt\":\"2026-05-03T06:03:55.000Z\",\"isDeleted\":0,\"version\":1,\"tags\":[],\"notes\":\"\",\"name\":\"BlinkIT\",\"appliesTo\":\"expense\",\"icon\":\"\\ud83d\\uded2\",\"color\":\"#0ea5e9\",\"budgetable\":1,\"taxRelevant\":0,\"gstRelevant\":0,\"parentId\":null,\"sortOrder\":999,\"archived\":0}', '2026-05-03 00:33:55', NULL, '2026-05-03 06:03:55', NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
('row_34f8c8da1af7bf69b93b027e', 'cu_521c089bd5eaca0e152039e2', 'transactions', 'txn_mou8rh4p_gvdwcy2xwtwpnt6z', '{\"id\":\"txn_mou8rh4p_gvdwcy2xwtwpnt6z\",\"userId\":\"cu_521c089bd5eaca0e152039e2\",\"createdAt\":\"2026-05-06T15:58:10.297Z\",\"updatedAt\":\"2026-05-06T15:58:14.000Z\",\"isDeleted\":0,\"version\":1,\"tags\":[],\"notes\":\"\",\"date\":\"2026-05-01T18:30:00.000Z\",\"type\":\"expense\",\"amount\":391.3799999999999954525264911353588104248046875,\"categoryId\":\"cat_mopd695a_dkhmbr7h0lgnqhnl\",\"accountId\":\"acc_moosa3qj_hj3adif2i3hpl7df\",\"toAccountId\":\"\",\"linkedCardId\":\"\",\"linkedLoanId\":\"\",\"linkedGoalId\":\"\",\"linkedUdhariId\":\"\",\"linkedSavingsId\":\"\",\"paymentMode\":\"upi\",\"merchantOrPerson\":\"Zomato\",\"description\":\"\",\"billAvailable\":0,\"gstApplicable\":0,\"taxFlag\":0,\"businessOrPersonal\":\"personal\",\"needWant\":\"unassigned\",\"fixedVariable\":\"unassigned\",\"plannedUnplanned\":\"unassigned\"}', '2026-05-06 10:28:14', NULL, '2026-05-06 15:58:14', 39138, 1, '2026-04-30 18:30:00', '2026-05', 'expense', 'upi', 'cat_mopd695a_dkhmbr7h0lgnqhnl', 'acc_moosa3qj_hj3adif2i3hpl7df', '', NULL, NULL, NULL, 'personal', NULL, '334a751e061700a5ce501905f0f23412655e0be86c5c9fb60c1186289e66a8c4'),
('row_35e069a37177d607912d846e', 'cu_521c089bd5eaca0e152039e2', 'categories', 'cat_mopilywn_830g8ygnfr999o40', '{\"id\":\"cat_mopilywn_830g8ygnfr999o40\",\"userId\":\"cu_521c089bd5eaca0e152039e2\",\"createdAt\":\"2026-05-03T08:34:58.679Z\",\"updatedAt\":\"2026-05-03T08:35:19.000Z\",\"isDeleted\":0,\"version\":2,\"tags\":[],\"notes\":\"\",\"name\":\"Friends\",\"appliesTo\":\"mixed\",\"icon\":\"\\ud83e\\udd1d\",\"color\":\"#0ea5e9\",\"budgetable\":1,\"taxRelevant\":0,\"gstRelevant\":0,\"parentId\":null,\"sortOrder\":999,\"archived\":0}', '2026-05-03 03:05:19', NULL, '2026-05-03 08:34:59', NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
('row_35e3b86f1d073340001c2edf', 'cu_521c089bd5eaca0e152039e2', 'categories', 'cat_mopd695a_dkhmbr7h0lgnqhnl', '{\"id\":\"cat_mopd695a_dkhmbr7h0lgnqhnl\",\"userId\":\"cu_521c089bd5eaca0e152039e2\",\"createdAt\":\"2026-05-03T06:02:47.374Z\",\"updatedAt\":\"2026-05-03T06:02:48.000Z\",\"isDeleted\":0,\"version\":1,\"tags\":[],\"notes\":\"\",\"name\":\"Food\",\"appliesTo\":\"expense\",\"icon\":\"\\ud83c\\udf7d\\ufe0f\",\"color\":\"#0ea5e9\",\"budgetable\":1,\"taxRelevant\":0,\"gstRelevant\":0,\"parentId\":null,\"sortOrder\":999,\"archived\":0}', '2026-05-03 00:32:48', NULL, '2026-05-03 06:02:48', NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
('row_37c6a7d7cd91aad53ff325b1', 'cu_85024323863151a04375d3e5', 'transactions', 'txn_moq58ex8_9iufw2w0p684flq5', '{\"id\":\"txn_moq58ex8_9iufw2w0p684flq5\",\"userId\":\"cu_85024323863151a04375d3e5\",\"createdAt\":\"2026-05-03T19:08:17.420Z\",\"updatedAt\":\"2026-05-03T19:08:21.000Z\",\"isDeleted\":0,\"version\":1,\"tags\":[],\"notes\":\"\",\"date\":\"2026-05-03T18:30:00.000Z\",\"type\":\"expense\",\"amount\":1500,\"categoryId\":\"cat_moq56yg5_vr694rs6095w8yui\",\"accountId\":\"acc_moopbws1_c65oqcylv9tpac90\",\"toAccountId\":\"\",\"linkedCardId\":\"\",\"linkedLoanId\":\"\",\"linkedGoalId\":\"\",\"linkedUdhariId\":\"\",\"linkedSavingsId\":\"\",\"paymentMode\":\"upi\",\"merchantOrPerson\":\"Slim bag and report\",\"description\":\"\",\"billAvailable\":0,\"gstApplicable\":0,\"taxFlag\":0,\"businessOrPersonal\":\"personal\",\"needWant\":\"unassigned\",\"fixedVariable\":\"unassigned\",\"plannedUnplanned\":\"unassigned\"}', '2026-05-03 13:38:21', NULL, '2026-05-03 19:08:21', 150000, 1, '2026-05-02 18:30:00', '2026-05', 'expense', 'upi', 'cat_moq56yg5_vr694rs6095w8yui', 'acc_moopbws1_c65oqcylv9tpac90', '', NULL, NULL, NULL, 'personal', NULL, 'b8b5c021b7ae01fbd872d70813edad198aa271ae5a6da1ff0bc22339ed937826'),
('row_3834e4ebce2cc7f7f7737855', 'cu_85024323863151a04375d3e5', 'transactions', 'txn_mov9lh1e_8h5ony23suk1s0j1', '{\"id\":\"txn_mov9lh1e_8h5ony23suk1s0j1\",\"userId\":\"cu_85024323863151a04375d3e5\",\"createdAt\":\"2026-05-07T09:09:16.034Z\",\"updatedAt\":\"2026-05-07T09:09:17.000Z\",\"isDeleted\":0,\"version\":1,\"tags\":[],\"notes\":\"\",\"date\":\"2026-05-08T18:30:00.000Z\",\"type\":\"expense\",\"amount\":69,\"categoryId\":\"cat_moq4vb39_glbfxcxgxt2i4kwv\",\"accountId\":\"acc_moopckwl_uoxw3nmnyvq8j4uh\",\"toAccountId\":\"\",\"linkedCardId\":\"\",\"linkedLoanId\":\"\",\"linkedGoalId\":\"\",\"linkedUdhariId\":\"\",\"linkedSavingsId\":\"\",\"paymentMode\":\"upi\",\"merchantOrPerson\":\"\",\"description\":\"\",\"billAvailable\":0,\"gstApplicable\":0,\"taxFlag\":0,\"businessOrPersonal\":\"personal\",\"needWant\":\"unassigned\",\"fixedVariable\":\"unassigned\",\"plannedUnplanned\":\"unassigned\"}', '2026-05-07 03:39:17', NULL, '2026-05-07 09:09:17', 6900, 1, '2026-05-07 18:30:00', '2026-05', 'expense', 'upi', 'cat_moq4vb39_glbfxcxgxt2i4kwv', 'acc_moopckwl_uoxw3nmnyvq8j4uh', '', NULL, NULL, NULL, 'personal', NULL, 'e40de7c2f32053302ebc686fe15517582dc4249f430212769864d6b016bdd5e5'),
('row_3880426455903687c4b21562', 'cu_85024323863151a04375d3e5', 'transactions', 'txn_mp5ga567_mbhnujsdnztecbhr', '{\"id\":\"txn_mp5ga567_mbhnujsdnztecbhr\",\"userId\":\"cu_85024323863151a04375d3e5\",\"createdAt\":\"2026-05-14T12:14:06.511Z\",\"updatedAt\":\"2026-05-14T12:14:06.000Z\",\"isDeleted\":0,\"version\":1,\"tags\":[],\"notes\":\"\",\"date\":\"2026-05-13T18:30:00.000Z\",\"type\":\"expense\",\"amount\":410,\"categoryId\":\"cat_moq4u7b9_sgs3dsgctfc0m5o3\",\"accountId\":\"acc_moopckwl_uoxw3nmnyvq8j4uh\",\"toAccountId\":\"\",\"linkedCardId\":\"\",\"linkedLoanId\":\"\",\"linkedGoalId\":\"\",\"linkedUdhariId\":\"\",\"linkedSavingsId\":\"\",\"paymentMode\":\"upi\",\"merchantOrPerson\":\"Bike Power petrol\",\"description\":\"\",\"billAvailable\":0,\"gstApplicable\":0,\"taxFlag\":0,\"businessOrPersonal\":\"personal\",\"needWant\":\"unassigned\",\"fixedVariable\":\"unassigned\",\"plannedUnplanned\":\"unassigned\"}', '2026-05-14 06:44:06', NULL, '2026-05-14 12:14:06', 41000, 1, '2026-05-12 18:30:00', '2026-05', 'expense', 'upi', 'cat_moq4u7b9_sgs3dsgctfc0m5o3', 'acc_moopckwl_uoxw3nmnyvq8j4uh', '', NULL, NULL, NULL, 'personal', NULL, '03a5abc34166bcf6ffa4d8dddc00b706436874ee954c992a824c7c19e675720e'),
('row_3903498117b58dcfb5dca1a6', 'cu_521c089bd5eaca0e152039e2', 'accounts', 'acc_monayvf0_8pgjvfckajeqtok7', '{\"id\":\"acc_monayvf0_8pgjvfckajeqtok7\",\"userId\":\"cu_521c089bd5eaca0e152039e2\",\"createdAt\":\"2026-05-01T19:25:31.404Z\",\"updatedAt\":\"2026-05-02T20:18:04.000Z\",\"isDeleted\":1,\"version\":2,\"tags\":[],\"notes\":\"\",\"name\":\"Kotak 811\",\"type\":\"savings\",\"institution\":\"Kotak 811\",\"openingBalance\":2722,\"color\":\"#ff0000\",\"icon\":\"wallet\",\"isInactive\":0}', '2026-05-02 14:48:04', '2026-05-02 14:48:04', '2026-05-01 19:25:35', NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
('row_3935f616afdb5e5a698b154c', 'cu_85024323863151a04375d3e5', 'categories', 'cat_mp123t6p_spkzsl48k00c63c5', '{\"id\":\"cat_mp123t6p_spkzsl48k00c63c5\",\"userId\":\"cu_85024323863151a04375d3e5\",\"createdAt\":\"2026-05-11T10:26:11.713Z\",\"updatedAt\":\"2026-05-11T10:26:14.000Z\",\"isDeleted\":0,\"version\":1,\"tags\":[],\"notes\":\"\",\"name\":\"Jio Subscription\",\"appliesTo\":\"expense\",\"icon\":\"\\ud83d\\udcbb\",\"color\":\"#0ea5e9\",\"budgetable\":1,\"taxRelevant\":0,\"gstRelevant\":0,\"parentId\":null,\"sortOrder\":999,\"archived\":0}', '2026-05-11 04:56:14', NULL, '2026-05-11 10:26:14', NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
('row_3b97518686defecf3c15b93a', 'cu_521c089bd5eaca0e152039e2', 'categories', 'cat_mopi9uy8_8w5oxe3jdfaczkel', '{\"id\":\"cat_mopi9uy8_8w5oxe3jdfaczkel\",\"userId\":\"cu_521c089bd5eaca0e152039e2\",\"createdAt\":\"2026-05-03T08:25:33.680Z\",\"updatedAt\":\"2026-05-03T08:25:34.000Z\",\"isDeleted\":0,\"version\":1,\"tags\":[],\"notes\":\"\",\"name\":\"Mobile\",\"appliesTo\":\"expense\",\"icon\":\"\\ud83d\\udcf1\",\"color\":\"#0ea5e9\",\"budgetable\":1,\"taxRelevant\":0,\"gstRelevant\":0,\"parentId\":null,\"sortOrder\":999,\"archived\":0}', '2026-05-03 02:55:34', NULL, '2026-05-03 08:25:34', NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
('row_3c153efe210b8fee4f3d350d', 'cu_521c089bd5eaca0e152039e2', 'transactions', 'txn_mp11v2ib_6wmt89vmko566xd1', '{\"id\":\"txn_mp11v2ib_6wmt89vmko566xd1\",\"userId\":\"cu_521c089bd5eaca0e152039e2\",\"createdAt\":\"2026-05-11T10:19:23.891Z\",\"updatedAt\":\"2026-05-11T10:19:26.000Z\",\"isDeleted\":0,\"version\":1,\"tags\":[],\"notes\":\"\",\"date\":\"2026-05-08T18:30:00.000Z\",\"type\":\"expense\",\"amount\":94.2600000000000051159076974727213382720947265625,\"categoryId\":\"cat_mopd5p4h_e0h3t1a65h8aa8ko\",\"accountId\":\"acc_moosa3qj_hj3adif2i3hpl7df\",\"toAccountId\":\"\",\"linkedCardId\":\"\",\"linkedLoanId\":\"\",\"linkedGoalId\":\"\",\"linkedUdhariId\":\"\",\"linkedSavingsId\":\"\",\"paymentMode\":\"credit_card\",\"merchantOrPerson\":\"chatgpt\",\"description\":\"\",\"billAvailable\":0,\"gstApplicable\":0,\"taxFlag\":0,\"businessOrPersonal\":\"personal\",\"needWant\":\"unassigned\",\"fixedVariable\":\"unassigned\",\"plannedUnplanned\":\"unassigned\"}', '2026-05-11 04:49:26', NULL, '2026-05-11 10:19:26', 9426, 1, '2026-05-07 18:30:00', '2026-05', 'expense', 'credit_card', 'cat_mopd5p4h_e0h3t1a65h8aa8ko', 'acc_moosa3qj_hj3adif2i3hpl7df', '', NULL, NULL, NULL, 'personal', NULL, 'd9ee944b76b9169ca61ecf7b2482464993a62e9a9311397382f6d5eda89cde76'),
('row_3e1bd665be7703405c1163a7', 'cu_521c089bd5eaca0e152039e2', 'transactions', 'txn_mov24whq_gha96ik04yo7ismq', '{\"id\":\"txn_mov24whq_gha96ik04yo7ismq\",\"userId\":\"cu_521c089bd5eaca0e152039e2\",\"createdAt\":\"2026-05-07T05:40:25.598Z\",\"updatedAt\":\"2026-05-07T05:40:28.000Z\",\"isDeleted\":0,\"version\":1,\"tags\":[],\"notes\":\"\",\"date\":\"2026-05-06T18:30:00.000Z\",\"type\":\"expense\",\"amount\":351.029999999999972715158946812152862548828125,\"categoryId\":\"cat_mopd695a_dkhmbr7h0lgnqhnl\",\"accountId\":\"acc_moosa3qj_hj3adif2i3hpl7df\",\"toAccountId\":\"\",\"linkedCardId\":\"\",\"linkedLoanId\":\"\",\"linkedGoalId\":\"\",\"linkedUdhariId\":\"\",\"linkedSavingsId\":\"\",\"paymentMode\":\"upi\",\"merchantOrPerson\":\"Zomato\",\"description\":\"\",\"billAvailable\":0,\"gstApplicable\":0,\"taxFlag\":0,\"businessOrPersonal\":\"personal\",\"needWant\":\"unassigned\",\"fixedVariable\":\"unassigned\",\"plannedUnplanned\":\"unassigned\"}', '2026-05-07 00:10:28', NULL, '2026-05-07 05:40:28', 35103, 1, '2026-05-05 18:30:00', '2026-05', 'expense', 'upi', 'cat_mopd695a_dkhmbr7h0lgnqhnl', 'acc_moosa3qj_hj3adif2i3hpl7df', '', NULL, NULL, NULL, 'personal', NULL, 'aa5557653bbeb8237858bb6385646c351bb3faa9dabc39fcfe5127753872e568'),
('row_3ed24b638143217ab0872ed7', 'cu_85024323863151a04375d3e5', 'accounts', 'acc_moopckwl_uoxw3nmnyvq8j4uh', '{\"id\":\"acc_moopckwl_uoxw3nmnyvq8j4uh\",\"userId\":\"cu_85024323863151a04375d3e5\",\"createdAt\":\"2026-05-02T18:55:51.765Z\",\"updatedAt\":\"2026-05-02T18:55:55.000Z\",\"isDeleted\":0,\"version\":1,\"tags\":[],\"notes\":\"\",\"name\":\"KOTAK\",\"type\":\"savings\",\"institution\":\"KOTAK BANK\",\"openingBalance\":0,\"color\":\"#0ea5e9\",\"icon\":\"wallet\",\"isInactive\":0}', '2026-05-02 13:25:55', NULL, '2026-05-02 18:55:55', NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
('row_448641c3c63bde0a32f02f84', 'cu_521c089bd5eaca0e152039e2', 'transactions', 'txn_mopik4s8_0qbo6f0tym4bil3b', '{\"id\":\"txn_mopik4s8_0qbo6f0tym4bil3b\",\"userId\":\"cu_521c089bd5eaca0e152039e2\",\"createdAt\":\"2026-05-03T08:33:32.984Z\",\"updatedAt\":\"2026-05-03T08:33:34.000Z\",\"isDeleted\":0,\"version\":1,\"tags\":[],\"notes\":\"\",\"date\":\"2026-05-02T18:30:00.000Z\",\"type\":\"expense\",\"amount\":407,\"categoryId\":\"cat_mopd695a_dkhmbr7h0lgnqhnl\",\"accountId\":\"acc_moosa3qj_hj3adif2i3hpl7df\",\"toAccountId\":\"\",\"linkedCardId\":\"\",\"linkedLoanId\":\"\",\"linkedGoalId\":\"\",\"linkedUdhariId\":\"\",\"linkedSavingsId\":\"\",\"paymentMode\":\"cash\",\"merchantOrPerson\":\"Tuksh Food\",\"description\":\"\",\"billAvailable\":0,\"gstApplicable\":0,\"taxFlag\":0,\"businessOrPersonal\":\"personal\",\"needWant\":\"unassigned\",\"fixedVariable\":\"unassigned\",\"plannedUnplanned\":\"unassigned\"}', '2026-05-03 03:03:34', NULL, '2026-05-03 08:33:34', 40700, 1, '2026-05-01 18:30:00', '2026-05', 'expense', 'cash', 'cat_mopd695a_dkhmbr7h0lgnqhnl', 'acc_moosa3qj_hj3adif2i3hpl7df', '', NULL, NULL, NULL, 'personal', NULL, 'b55431fc167a7f4ed316f1041e1a46eecf17d3d3766e97909bdf029383ed79b8'),
('row_4855c846ad56c19e6bf77fd8', 'cu_521c089bd5eaca0e152039e2', 'categories', 'cat_mopd7j49_ps6lone32bwk3cvf', '{\"id\":\"cat_mopd7j49_ps6lone32bwk3cvf\",\"userId\":\"cu_521c089bd5eaca0e152039e2\",\"createdAt\":\"2026-05-03T06:03:46.953Z\",\"updatedAt\":\"2026-05-03T08:24:24.000Z\",\"isDeleted\":1,\"version\":2,\"tags\":[],\"notes\":\"\",\"name\":\"BlinkIT\",\"appliesTo\":\"expense\",\"icon\":\"\\ud83d\\uded2\",\"color\":\"#0ea5e9\",\"budgetable\":1,\"taxRelevant\":0,\"gstRelevant\":0,\"parentId\":null,\"sortOrder\":999,\"archived\":0}', '2026-05-03 02:54:24', '2026-05-03 02:54:24', '2026-05-03 06:03:56', NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
('row_49604b825e499da29e41a144', 'cu_521c089bd5eaca0e152039e2', 'transactions', 'txn_mopmxwey_2j37n8771ngl0h07', '{\"id\":\"txn_mopmxwey_2j37n8771ngl0h07\",\"userId\":\"cu_521c089bd5eaca0e152039e2\",\"createdAt\":\"2026-05-03T10:36:13.786Z\",\"updatedAt\":\"2026-05-03T17:26:28.000Z\",\"isDeleted\":1,\"version\":2,\"tags\":[],\"notes\":\"\",\"date\":\"2026-05-02T18:30:00.000Z\",\"type\":\"income\",\"amount\":35000,\"categoryId\":\"cat_mopib3r5_ldtrmna3rfck1u7e\",\"accountId\":\"acc_moosba06_7pn752s6qkubninu\",\"toAccountId\":\"\",\"linkedCardId\":\"\",\"linkedLoanId\":\"\",\"linkedGoalId\":\"\",\"linkedUdhariId\":\"\",\"linkedSavingsId\":\"\",\"paymentMode\":\"bank_transfer\",\"merchantOrPerson\":\"LD Finmave\",\"description\":\"\",\"billAvailable\":0,\"gstApplicable\":0,\"taxFlag\":0,\"businessOrPersonal\":\"personal\",\"needWant\":\"unassigned\",\"fixedVariable\":\"unassigned\",\"plannedUnplanned\":\"unassigned\"}', '2026-05-03 11:56:28', '2026-05-03 11:56:28', '2026-05-03 10:36:15', 3500000, 1, '2026-05-01 18:30:00', '2026-05', 'income', 'bank_transfer', 'cat_mopib3r5_ldtrmna3rfck1u7e', 'acc_moosba06_7pn752s6qkubninu', '', NULL, NULL, NULL, 'personal', NULL, 'c16e03829d6b3e00d582527e36a74a93e4d4a7244577b3e9971e8bd01d3c86b7'),
('row_50ff615b47f82aa2a66e0764', 'cu_521c089bd5eaca0e152039e2', 'transactions', 'txn_mopw4z2i_8d32mo5n1gxo2q20', '{\"id\":\"txn_mopw4z2i_8d32mo5n1gxo2q20\",\"userId\":\"cu_521c089bd5eaca0e152039e2\",\"createdAt\":\"2026-05-03T14:53:40.362Z\",\"updatedAt\":\"2026-05-03T17:26:21.000Z\",\"isDeleted\":1,\"version\":2,\"tags\":[],\"notes\":\"\",\"date\":\"2026-05-11T18:30:00.000Z\",\"type\":\"expense\",\"amount\":25000,\"categoryId\":\"cat_mopi8v9k_qewycy5n6mvvax1o\",\"accountId\":\"acc_moosa3qj_hj3adif2i3hpl7df\",\"toAccountId\":\"\",\"linkedCardId\":\"\",\"linkedLoanId\":\"\",\"linkedGoalId\":\"\",\"linkedUdhariId\":\"\",\"linkedSavingsId\":\"\",\"paymentMode\":\"upi\",\"merchantOrPerson\":\"Home\",\"description\":\"\",\"billAvailable\":0,\"gstApplicable\":0,\"taxFlag\":0,\"businessOrPersonal\":\"personal\",\"needWant\":\"unassigned\",\"fixedVariable\":\"unassigned\",\"plannedUnplanned\":\"unassigned\"}', '2026-05-03 11:56:21', '2026-05-03 11:56:21', '2026-05-03 14:53:41', 2500000, 1, '2026-05-10 18:30:00', '2026-05', 'expense', 'upi', 'cat_mopi8v9k_qewycy5n6mvvax1o', 'acc_moosa3qj_hj3adif2i3hpl7df', '', NULL, NULL, NULL, 'personal', NULL, 'a6dc7bee0cec6082fbc3b4839bf9ea40da32e433ea3b4559f702f1d07ea81bd5'),
('row_56ee5d4d27cc54be7bbe1f60', 'cu_85024323863151a04375d3e5', 'cards', 'crd_moopfe8r_mzi07xgmo39he74y', '{\"id\":\"crd_moopfe8r_mzi07xgmo39he74y\",\"userId\":\"cu_85024323863151a04375d3e5\",\"createdAt\":\"2026-05-02T18:58:03.099Z\",\"updatedAt\":\"2026-05-02T18:58:37.000Z\",\"isDeleted\":1,\"version\":2,\"tags\":[],\"notes\":\"\",\"nickname\":\"FREEDOM\",\"bank\":\"HDFC Bank\",\"last4\":\"5702\",\"type\":\"credit\",\"linkedAccountId\":\"\",\"creditLimit\":47000,\"statementDay\":20,\"dueDay\":2,\"interestRate\":0,\"annualFee\":500,\"rewardNote\":\"\",\"color\":\"#8b5cf6\",\"isInactive\":0}', '2026-05-02 13:28:37', '2026-05-02 13:28:37', '2026-05-02 18:58:17', NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
('row_57091f286907115d330e65f3', 'cu_521c089bd5eaca0e152039e2', 'categories', 'cat_mopd6tov_yhcvd17jiuxs3wre', '{\"id\":\"cat_mopd6tov_yhcvd17jiuxs3wre\",\"userId\":\"cu_521c089bd5eaca0e152039e2\",\"createdAt\":\"2026-05-03T06:03:13.999Z\",\"updatedAt\":\"2026-05-03T06:03:20.000Z\",\"isDeleted\":0,\"version\":2,\"tags\":[],\"notes\":\"\",\"name\":\"Fuel \",\"appliesTo\":\"expense\",\"icon\":\"\\u26fd\",\"color\":\"#0ea5e9\",\"budgetable\":1,\"taxRelevant\":0,\"gstRelevant\":0,\"parentId\":null,\"sortOrder\":999,\"archived\":0}', '2026-05-03 00:33:20', NULL, '2026-05-03 06:03:14', NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
('row_573e3f7d05656df80035d2be', 'cu_521c089bd5eaca0e152039e2', 'transactions', 'txn_mosfyn27_unmekb021w3qcphc', '{\"id\":\"txn_mosfyn27_unmekb021w3qcphc\",\"userId\":\"cu_521c089bd5eaca0e152039e2\",\"createdAt\":\"2026-05-05T09:44:09.535Z\",\"updatedAt\":\"2026-05-05T09:44:10.000Z\",\"isDeleted\":0,\"version\":1,\"tags\":[],\"notes\":\"\",\"date\":\"2026-05-04T18:30:00.000Z\",\"type\":\"expense\",\"amount\":166.330000000000012505552149377763271331787109375,\"categoryId\":\"cat_mopd695a_dkhmbr7h0lgnqhnl\",\"accountId\":\"acc_moosba06_7pn752s6qkubninu\",\"toAccountId\":\"\",\"linkedCardId\":\"\",\"linkedLoanId\":\"\",\"linkedGoalId\":\"\",\"linkedUdhariId\":\"\",\"linkedSavingsId\":\"\",\"paymentMode\":\"upi\",\"merchantOrPerson\":\"egg\",\"description\":\"\",\"billAvailable\":0,\"gstApplicable\":0,\"taxFlag\":0,\"businessOrPersonal\":\"personal\",\"needWant\":\"unassigned\",\"fixedVariable\":\"unassigned\",\"plannedUnplanned\":\"unassigned\"}', '2026-05-05 04:14:10', NULL, '2026-05-05 09:44:10', 16633, 1, '2026-05-03 18:30:00', '2026-05', 'expense', 'upi', 'cat_mopd695a_dkhmbr7h0lgnqhnl', 'acc_moosba06_7pn752s6qkubninu', '', NULL, NULL, NULL, 'personal', NULL, 'e6aae75ab89e02354d33521818c266dc369515746bdee17026078fac344812e0'),
('row_582e237c13b8e3453ec403fd', 'cu_521c089bd5eaca0e152039e2', 'categories', 'cat_mopi8858_ext2ok7elxrr60qz', '{\"id\":\"cat_mopi8858_ext2ok7elxrr60qz\",\"userId\":\"cu_521c089bd5eaca0e152039e2\",\"createdAt\":\"2026-05-03T08:24:17.468Z\",\"updatedAt\":\"2026-05-03T08:24:19.000Z\",\"isDeleted\":0,\"version\":1,\"tags\":[],\"notes\":\"\",\"name\":\"Enjoy\",\"appliesTo\":\"expense\",\"icon\":\"\\u2728\",\"color\":\"#0ea5e9\",\"budgetable\":1,\"taxRelevant\":0,\"gstRelevant\":0,\"parentId\":null,\"sortOrder\":999,\"archived\":0}', '2026-05-03 02:54:19', NULL, '2026-05-03 08:24:19', NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
('row_582f6f632bc23b7a9d94a6ff', 'cu_521c089bd5eaca0e152039e2', 'accounts', 'acc_moosba06_7pn752s6qkubninu', '{\"id\":\"acc_moosba06_7pn752s6qkubninu\",\"userId\":\"cu_521c089bd5eaca0e152039e2\",\"createdAt\":\"2026-05-02T20:18:49.830Z\",\"updatedAt\":\"2026-05-02T20:18:50.000Z\",\"isDeleted\":0,\"version\":1,\"tags\":[],\"notes\":\"\",\"name\":\"HDFC Bank\",\"type\":\"savings\",\"institution\":\"HDFC Bank\",\"openingBalance\":14492,\"color\":\"#0400ff\",\"icon\":\"wallet\",\"isInactive\":0}', '2026-05-02 14:48:50', NULL, '2026-05-02 20:18:50', NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
('row_58ba1e7250ac217214422e10', 'cu_85024323863151a04375d3e5', 'categories', 'cat_moq4vw8q_6b099gvhyea1hggw', '{\"id\":\"cat_moq4vw8q_6b099gvhyea1hggw\",\"userId\":\"cu_85024323863151a04375d3e5\",\"createdAt\":\"2026-05-03T18:58:33.338Z\",\"updatedAt\":\"2026-05-03T18:58:37.000Z\",\"isDeleted\":0,\"version\":1,\"tags\":[],\"notes\":\"\",\"name\":\"Food\",\"appliesTo\":\"expense\",\"icon\":\"\\ud83c\\udf7d\\ufe0f\",\"color\":\"#0ea5e9\",\"budgetable\":1,\"taxRelevant\":0,\"gstRelevant\":0,\"parentId\":null,\"sortOrder\":999,\"archived\":0}', '2026-05-03 13:28:37', NULL, '2026-05-03 18:58:37', NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
('row_5b00de48d3e2965205ba8082', 'cu_521c089bd5eaca0e152039e2', 'transactions', 'txn_moqtzrgl_fhdxo4imuc3sxok6', '{\"id\":\"txn_moqtzrgl_fhdxo4imuc3sxok6\",\"userId\":\"cu_521c089bd5eaca0e152039e2\",\"createdAt\":\"2026-05-04T06:41:24.165Z\",\"updatedAt\":\"2026-05-04T06:41:25.000Z\",\"isDeleted\":0,\"version\":1,\"tags\":[],\"notes\":\"\",\"date\":\"2026-05-03T18:30:00.000Z\",\"type\":\"expense\",\"amount\":769,\"categoryId\":\"cat_mopialsj_qat4q8h3ta2uich8\",\"accountId\":\"acc_moosba06_7pn752s6qkubninu\",\"toAccountId\":\"\",\"linkedCardId\":\"\",\"linkedLoanId\":\"\",\"linkedGoalId\":\"\",\"linkedUdhariId\":\"\",\"linkedSavingsId\":\"\",\"paymentMode\":\"upi\",\"merchantOrPerson\":\"Blinkit\",\"description\":\"\",\"billAvailable\":0,\"gstApplicable\":0,\"taxFlag\":0,\"businessOrPersonal\":\"personal\",\"needWant\":\"unassigned\",\"fixedVariable\":\"unassigned\",\"plannedUnplanned\":\"unassigned\"}', '2026-05-04 01:11:25', NULL, '2026-05-04 06:41:25', 76900, 1, '2026-05-02 18:30:00', '2026-05', 'expense', 'upi', 'cat_mopialsj_qat4q8h3ta2uich8', 'acc_moosba06_7pn752s6qkubninu', '', NULL, NULL, NULL, 'personal', NULL, 'e097afbce3346f85895fca1d5b32620c0fd277c940c697ab99a293816bc7a7b4'),
('row_5cdfb83b61bbb2bad4718a03', 'cu_521c089bd5eaca0e152039e2', 'categories', 'cat_mopilycu_k82l0720dgoabozn', '{\"id\":\"cat_mopilycu_k82l0720dgoabozn\",\"userId\":\"cu_521c089bd5eaca0e152039e2\",\"createdAt\":\"2026-05-03T08:34:57.966Z\",\"updatedAt\":\"2026-05-03T08:35:02.000Z\",\"isDeleted\":1,\"version\":2,\"tags\":[],\"notes\":\"\",\"name\":\"Friends\",\"appliesTo\":\"mixed\",\"icon\":\"\\ud83c\\udf7d\\ufe0f\",\"color\":\"#0ea5e9\",\"budgetable\":1,\"taxRelevant\":0,\"gstRelevant\":0,\"parentId\":null,\"sortOrder\":999,\"archived\":0}', '2026-05-03 03:05:02', '2026-05-03 03:05:02', '2026-05-03 08:34:59', NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
('row_5d693b502e692c0fd543aa2f', 'cu_521c089bd5eaca0e152039e2', 'cards', 'crd_moq5mgsu_lq38v6idv9of0vdh', '{\"id\":\"crd_moq5mgsu_lq38v6idv9of0vdh\",\"userId\":\"cu_521c089bd5eaca0e152039e2\",\"createdAt\":\"2026-05-03T19:19:13.038Z\",\"updatedAt\":\"2026-05-03T19:19:22.000Z\",\"isDeleted\":1,\"version\":2,\"tags\":[],\"notes\":\"\",\"nickname\":\"dev\",\"bank\":\"HDFC Bank\",\"last4\":\"1345\",\"type\":\"credit\",\"linkedAccountId\":\"\",\"creditLimit\":25000,\"statementDay\":1,\"dueDay\":15,\"interestRate\":36,\"annualFee\":0,\"rewardNote\":\"\",\"color\":\"#8b5cf6\",\"isInactive\":0}', '2026-05-03 13:49:22', '2026-05-03 13:49:22', '2026-05-03 19:19:14', NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
('row_603fcea3ea3276c2cfa73cef', 'cu_521c089bd5eaca0e152039e2', 'transactions', 'txn_movylp3f_v6okjknu9owwhj3a', '{\"id\":\"txn_movylp3f_v6okjknu9owwhj3a\",\"userId\":\"cu_521c089bd5eaca0e152039e2\",\"createdAt\":\"2026-05-07T20:49:16.875Z\",\"updatedAt\":\"2026-05-07T20:49:17.000Z\",\"isDeleted\":0,\"version\":1,\"tags\":[],\"notes\":\"\",\"date\":\"2026-05-06T18:30:00.000Z\",\"type\":\"expense\",\"amount\":9519,\"categoryId\":\"cat_mopd5p4h_e0h3t1a65h8aa8ko\",\"accountId\":\"acc_moosa3qj_hj3adif2i3hpl7df\",\"toAccountId\":\"\",\"linkedCardId\":\"\",\"linkedLoanId\":\"\",\"linkedGoalId\":\"\",\"linkedUdhariId\":\"\",\"linkedSavingsId\":\"\",\"paymentMode\":\"credit_card\",\"merchantOrPerson\":\"Cluade pro max\",\"description\":\"\",\"billAvailable\":0,\"gstApplicable\":0,\"taxFlag\":0,\"businessOrPersonal\":\"personal\",\"needWant\":\"unassigned\",\"fixedVariable\":\"unassigned\",\"plannedUnplanned\":\"unassigned\"}', '2026-05-07 15:19:17', NULL, '2026-05-07 20:49:17', 951900, 1, '2026-05-05 18:30:00', '2026-05', 'expense', 'credit_card', 'cat_mopd5p4h_e0h3t1a65h8aa8ko', 'acc_moosa3qj_hj3adif2i3hpl7df', '', NULL, NULL, NULL, 'personal', NULL, 'ebc18e67936541231006e78e16fa625e9115f67401d1c081c8bc1fc8d2e5f786'),
('row_63caad88928d6fe43683e17c', 'cu_85024323863151a04375d3e5', 'transactions', 'txn_moq4swff_7i3n4il7lpzfxijd', '{\"id\":\"txn_moq4swff_7i3n4il7lpzfxijd\",\"userId\":\"cu_85024323863151a04375d3e5\",\"createdAt\":\"2026-05-03T18:56:13.611Z\",\"updatedAt\":\"2026-05-03T18:56:16.000Z\",\"isDeleted\":0,\"version\":1,\"tags\":[],\"notes\":\"\",\"date\":\"2026-05-03T18:30:00.000Z\",\"type\":\"expense\",\"amount\":4000,\"categoryId\":\"\",\"accountId\":\"acc_moopbws1_c65oqcylv9tpac90\",\"toAccountId\":\"\",\"linkedCardId\":\"\",\"linkedLoanId\":\"\",\"linkedGoalId\":\"\",\"linkedUdhariId\":\"\",\"linkedSavingsId\":\"\",\"paymentMode\":\"bank_transfer\",\"merchantOrPerson\":\"Transfer to Kotak\",\"description\":\"\",\"billAvailable\":0,\"gstApplicable\":0,\"taxFlag\":0,\"businessOrPersonal\":\"personal\",\"needWant\":\"unassigned\",\"fixedVariable\":\"unassigned\",\"plannedUnplanned\":\"unassigned\"}', '2026-05-03 13:26:16', NULL, '2026-05-03 18:56:16', 400000, 1, '2026-05-02 18:30:00', '2026-05', 'expense', 'bank_transfer', '', 'acc_moopbws1_c65oqcylv9tpac90', '', NULL, NULL, NULL, 'personal', NULL, '7b1c18d50d84a9c4053757d81e80a4bb675fe557aa6a7b382fd465ab5f4d6907'),
('row_63fba8302b3029fd19052bf4', 'cu_85024323863151a04375d3e5', 'transactions', 'txn_mp11xw8s_tndqz6im2ku0uvei', '{\"id\":\"txn_mp11xw8s_tndqz6im2ku0uvei\",\"userId\":\"cu_85024323863151a04375d3e5\",\"createdAt\":\"2026-05-11T10:21:35.740Z\",\"updatedAt\":\"2026-05-11T10:21:39.000Z\",\"isDeleted\":0,\"version\":1,\"tags\":[],\"notes\":\"\",\"date\":\"2026-05-10T18:30:00.000Z\",\"type\":\"expense\",\"amount\":28,\"categoryId\":\"cat_moq4vw8q_6b099gvhyea1hggw\",\"accountId\":\"acc_moopckwl_uoxw3nmnyvq8j4uh\",\"toAccountId\":\"\",\"linkedCardId\":\"\",\"linkedLoanId\":\"\",\"linkedGoalId\":\"\",\"linkedUdhariId\":\"\",\"linkedSavingsId\":\"\",\"paymentMode\":\"upi\",\"merchantOrPerson\":\"Chass\",\"description\":\"\",\"billAvailable\":0,\"gstApplicable\":0,\"taxFlag\":0,\"businessOrPersonal\":\"personal\",\"needWant\":\"unassigned\",\"fixedVariable\":\"unassigned\",\"plannedUnplanned\":\"unassigned\"}', '2026-05-11 04:51:39', NULL, '2026-05-11 10:21:39', 2800, 1, '2026-05-09 18:30:00', '2026-05', 'expense', 'upi', 'cat_moq4vw8q_6b099gvhyea1hggw', 'acc_moopckwl_uoxw3nmnyvq8j4uh', '', NULL, NULL, NULL, 'personal', NULL, '74565adef11358ba6b71d0ad2a760e59e9d698fc03f813c804aeae0347f51990'),
('row_6500648524f63fe533a68830', 'cu_85024323863151a04375d3e5', 'categories', 'cat_mp122syq_dqsjlxrymud12scl', '{\"id\":\"cat_mp122syq_dqsjlxrymud12scl\",\"userId\":\"cu_85024323863151a04375d3e5\",\"createdAt\":\"2026-05-11T10:25:24.770Z\",\"updatedAt\":\"2026-05-11T10:25:27.000Z\",\"isDeleted\":0,\"version\":1,\"tags\":[],\"notes\":\"\",\"name\":\"Bank Trasfer\",\"appliesTo\":\"expense\",\"icon\":\"\\ud83c\\udfe6\",\"color\":\"#0ea5e9\",\"budgetable\":1,\"taxRelevant\":0,\"gstRelevant\":0,\"parentId\":null,\"sortOrder\":999,\"archived\":0}', '2026-05-11 04:55:27', NULL, '2026-05-11 10:25:27', NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
('row_671cccb5ca7511887b062112', 'cu_521c089bd5eaca0e152039e2', 'transactions', 'txn_mopieu16_6c3ze4fxoxa44fzp', '{\"id\":\"txn_mopieu16_6c3ze4fxoxa44fzp\",\"userId\":\"cu_521c089bd5eaca0e152039e2\",\"createdAt\":\"2026-05-03T08:29:25.770Z\",\"updatedAt\":\"2026-05-03T08:29:27.000Z\",\"isDeleted\":0,\"version\":1,\"tags\":[],\"notes\":\"\",\"date\":\"2026-05-01T18:30:00.000Z\",\"type\":\"expense\",\"amount\":276.279999999999972715158946812152862548828125,\"categoryId\":\"cat_mopd695a_dkhmbr7h0lgnqhnl\",\"accountId\":\"acc_moosa3qj_hj3adif2i3hpl7df\",\"toAccountId\":\"\",\"linkedCardId\":\"\",\"linkedLoanId\":\"\",\"linkedGoalId\":\"\",\"linkedUdhariId\":\"\",\"linkedSavingsId\":\"\",\"paymentMode\":\"upi\",\"merchantOrPerson\":\"Zomato\",\"description\":\"\",\"billAvailable\":0,\"gstApplicable\":0,\"taxFlag\":0,\"businessOrPersonal\":\"personal\",\"needWant\":\"unassigned\",\"fixedVariable\":\"unassigned\",\"plannedUnplanned\":\"unassigned\"}', '2026-05-03 02:59:27', NULL, '2026-05-03 08:29:27', 27628, 1, '2026-04-30 18:30:00', '2026-05', 'expense', 'upi', 'cat_mopd695a_dkhmbr7h0lgnqhnl', 'acc_moosa3qj_hj3adif2i3hpl7df', '', NULL, NULL, NULL, 'personal', NULL, '8b56cfa5c6d8a55b2f9a61888cb71f75c8c7e8fdc9df02e9b080c5ce6b38383a'),
('row_67384cf55862b6eca1efe5e5', 'cu_85024323863151a04375d3e5', 'cards', 'crd_moopfbi4_3aocmdir9f8vmbpv', '{\"id\":\"crd_moopfbi4_3aocmdir9f8vmbpv\",\"userId\":\"cu_85024323863151a04375d3e5\",\"createdAt\":\"2026-05-02T18:57:59.548Z\",\"updatedAt\":\"2026-05-02T18:58:13.000Z\",\"isDeleted\":0,\"version\":1,\"tags\":[],\"notes\":\"\",\"nickname\":\"FREEDOM\",\"bank\":\"HDFC Bank\",\"last4\":\"5702\",\"type\":\"credit\",\"linkedAccountId\":\"\",\"creditLimit\":47000,\"statementDay\":20,\"dueDay\":2,\"interestRate\":0,\"annualFee\":500,\"rewardNote\":\"\",\"color\":\"#8b5cf6\",\"isInactive\":0}', '2026-05-02 13:28:13', NULL, '2026-05-02 18:58:13', NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
('row_67d7f6dbf4c9163b87874c4a', 'cu_85024323863151a04375d3e5', 'transactions', 'txn_mp11yq7u_qkelynzwvgt0y8nn', '{\"id\":\"txn_mp11yq7u_qkelynzwvgt0y8nn\",\"userId\":\"cu_85024323863151a04375d3e5\",\"createdAt\":\"2026-05-11T10:22:14.586Z\",\"updatedAt\":\"2026-05-11T10:22:16.000Z\",\"isDeleted\":0,\"version\":1,\"tags\":[],\"notes\":\"\",\"date\":\"2026-05-10T18:30:00.000Z\",\"type\":\"expense\",\"amount\":80,\"categoryId\":\"cat_moq4vw8q_6b099gvhyea1hggw\",\"accountId\":\"acc_moopckwl_uoxw3nmnyvq8j4uh\",\"toAccountId\":\"\",\"linkedCardId\":\"\",\"linkedLoanId\":\"\",\"linkedGoalId\":\"\",\"linkedUdhariId\":\"\",\"linkedSavingsId\":\"\",\"paymentMode\":\"upi\",\"merchantOrPerson\":\"Water and Ice\",\"description\":\"\",\"billAvailable\":0,\"gstApplicable\":0,\"taxFlag\":0,\"businessOrPersonal\":\"personal\",\"needWant\":\"unassigned\",\"fixedVariable\":\"unassigned\",\"plannedUnplanned\":\"unassigned\"}', '2026-05-11 04:52:16', NULL, '2026-05-11 10:22:16', 8000, 1, '2026-05-09 18:30:00', '2026-05', 'expense', 'upi', 'cat_moq4vw8q_6b099gvhyea1hggw', 'acc_moopckwl_uoxw3nmnyvq8j4uh', '', NULL, NULL, NULL, 'personal', NULL, 'a01bf56558767704d4db1b4ae6818ee1bf35326891f1089ddc73cdc5c251b903'),
('row_69e1e0dad91a412effb08af3', 'cu_521c089bd5eaca0e152039e2', 'transactions', 'txn_mp11vm1y_xt75raw0huxudbdv', '{\"id\":\"txn_mp11vm1y_xt75raw0huxudbdv\",\"userId\":\"cu_521c089bd5eaca0e152039e2\",\"createdAt\":\"2026-05-11T10:19:49.222Z\",\"updatedAt\":\"2026-05-11T10:19:50.000Z\",\"isDeleted\":0,\"version\":1,\"tags\":[],\"notes\":\"\",\"date\":\"2026-05-09T18:30:00.000Z\",\"type\":\"expense\",\"amount\":9066.95000000000072759576141834259033203125,\"categoryId\":\"cat_mopd5p4h_e0h3t1a65h8aa8ko\",\"accountId\":\"acc_moosa3qj_hj3adif2i3hpl7df\",\"toAccountId\":\"\",\"linkedCardId\":\"\",\"linkedLoanId\":\"\",\"linkedGoalId\":\"\",\"linkedUdhariId\":\"\",\"linkedSavingsId\":\"\",\"paymentMode\":\"credit_card\",\"merchantOrPerson\":\"Codex\",\"description\":\"\",\"billAvailable\":0,\"gstApplicable\":0,\"taxFlag\":0,\"businessOrPersonal\":\"personal\",\"needWant\":\"unassigned\",\"fixedVariable\":\"unassigned\",\"plannedUnplanned\":\"unassigned\"}', '2026-05-11 04:49:50', NULL, '2026-05-11 10:19:50', 906695, 1, '2026-05-08 18:30:00', '2026-05', 'expense', 'credit_card', 'cat_mopd5p4h_e0h3t1a65h8aa8ko', 'acc_moosa3qj_hj3adif2i3hpl7df', '', NULL, NULL, NULL, 'personal', NULL, '125995b8fbfec00b16bbc9a0044c2b7c2b3a2e6d53b6f1c618c07fa1c497bd2e'),
('row_69fb15edc270fe25e1a949a4', 'cu_521c089bd5eaca0e152039e2', 'categories', 'cat_mopd7m3y_f0q2ay30olyg5n5g', '{\"id\":\"cat_mopd7m3y_f0q2ay30olyg5n5g\",\"userId\":\"cu_521c089bd5eaca0e152039e2\",\"createdAt\":\"2026-05-03T06:03:50.830Z\",\"updatedAt\":\"2026-05-03T08:24:27.000Z\",\"isDeleted\":1,\"version\":2,\"tags\":[],\"notes\":\"\",\"name\":\"BlinkIT\",\"appliesTo\":\"expense\",\"icon\":\"\\ud83d\\uded2\",\"color\":\"#0ea5e9\",\"budgetable\":1,\"taxRelevant\":0,\"gstRelevant\":0,\"parentId\":null,\"sortOrder\":999,\"archived\":0}', '2026-05-03 02:54:27', '2026-05-03 02:54:27', '2026-05-03 06:03:55', NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
('row_6a12376c351f220f39cc3945', 'cu_521c089bd5eaca0e152039e2', 'transactions', 'txn_mp11wiyf_7ny3dzhwscmujs6b', '{\"id\":\"txn_mp11wiyf_7ny3dzhwscmujs6b\",\"userId\":\"cu_521c089bd5eaca0e152039e2\",\"createdAt\":\"2026-05-11T10:20:31.863Z\",\"updatedAt\":\"2026-05-11T10:20:34.000Z\",\"isDeleted\":0,\"version\":1,\"tags\":[],\"notes\":\"\",\"date\":\"2026-05-09T18:30:00.000Z\",\"type\":\"expense\",\"amount\":292.07999999999998408384271897375583648681640625,\"categoryId\":\"cat_mopd6tov_yhcvd17jiuxs3wre\",\"accountId\":\"acc_moosa3qj_hj3adif2i3hpl7df\",\"toAccountId\":\"\",\"linkedCardId\":\"\",\"linkedLoanId\":\"\",\"linkedGoalId\":\"\",\"linkedUdhariId\":\"\",\"linkedSavingsId\":\"\",\"paymentMode\":\"upi\",\"merchantOrPerson\":\"Petrol\",\"description\":\"\",\"billAvailable\":0,\"gstApplicable\":0,\"taxFlag\":0,\"businessOrPersonal\":\"personal\",\"needWant\":\"unassigned\",\"fixedVariable\":\"unassigned\",\"plannedUnplanned\":\"unassigned\"}', '2026-05-11 04:50:34', NULL, '2026-05-11 10:20:34', 29208, 1, '2026-05-08 18:30:00', '2026-05', 'expense', 'upi', 'cat_mopd6tov_yhcvd17jiuxs3wre', 'acc_moosa3qj_hj3adif2i3hpl7df', '', NULL, NULL, NULL, 'personal', NULL, '3b4325876383c39af17b7238906cc45071898e9c4967cb73e565a7b189424f06'),
('row_6d39df5dd9aecf47ac8ca69b', 'cu_85024323863151a04375d3e5', 'loans', 'lon_moq5gps6_7r47lg12fdm4s4ic', '{\"id\":\"lon_moq5gps6_7r47lg12fdm4s4ic\",\"userId\":\"cu_85024323863151a04375d3e5\",\"createdAt\":\"2026-05-03T19:14:44.742Z\",\"updatedAt\":\"2026-05-03T19:28:31.000Z\",\"isDeleted\":0,\"version\":3,\"tags\":[],\"notes\":\"\",\"lender\":\"BenQ Screen EMI\",\"loanType\":\"personal\",\"principal\":17994,\"startDate\":\"2026-05-19T18:30:00.000Z\",\"tenureMonths\":3,\"annualInterestRate\":17.89999999999999857891452847979962825775146484375,\"emiDueDay\":5,\"processingFee\":0,\"insuranceCost\":0,\"prepaymentAllowed\":1,\"foreclosureCharges\":2,\"status\":\"active\"}', '2026-05-03 13:58:31', NULL, '2026-05-03 19:14:48', NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
('row_6d999080978f2256f262f779', 'cu_521c089bd5eaca0e152039e2', 'categories', 'cat_mopibqay_1ovoiw9svr5wwrqs', '{\"id\":\"cat_mopibqay_1ovoiw9svr5wwrqs\",\"userId\":\"cu_521c089bd5eaca0e152039e2\",\"createdAt\":\"2026-05-03T08:27:00.970Z\",\"updatedAt\":\"2026-05-03T08:27:04.000Z\",\"isDeleted\":1,\"version\":2,\"tags\":[],\"notes\":\"\",\"name\":\"OTP Platform\",\"appliesTo\":\"expense\",\"icon\":\"\\ud83d\\udcb3\",\"color\":\"#0ea5e9\",\"budgetable\":1,\"taxRelevant\":0,\"gstRelevant\":0,\"parentId\":null,\"sortOrder\":999,\"archived\":0}', '2026-05-03 02:57:04', '2026-05-03 02:57:04', '2026-05-03 08:27:02', NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
('row_6f3dd09e25462c8cbac3a718', 'cu_521c089bd5eaca0e152039e2', 'transactions', 'txn_moyiigli_8t7rqzm22cuh0a13', '{\"id\":\"txn_moyiigli_8t7rqzm22cuh0a13\",\"userId\":\"cu_521c089bd5eaca0e152039e2\",\"createdAt\":\"2026-05-09T15:42:10.566Z\",\"updatedAt\":\"2026-05-09T15:42:11.000Z\",\"isDeleted\":0,\"version\":1,\"tags\":[],\"notes\":\"\",\"date\":\"2026-05-08T18:30:00.000Z\",\"type\":\"expense\",\"amount\":2090,\"categoryId\":\"cat_mopialsj_qat4q8h3ta2uich8\",\"accountId\":\"acc_moosa3qj_hj3adif2i3hpl7df\",\"toAccountId\":\"\",\"linkedCardId\":\"\",\"linkedLoanId\":\"\",\"linkedGoalId\":\"\",\"linkedUdhariId\":\"\",\"linkedSavingsId\":\"\",\"paymentMode\":\"credit_card\",\"merchantOrPerson\":\"ink\",\"description\":\"\",\"billAvailable\":0,\"gstApplicable\":0,\"taxFlag\":0,\"businessOrPersonal\":\"personal\",\"needWant\":\"unassigned\",\"fixedVariable\":\"unassigned\",\"plannedUnplanned\":\"unassigned\"}', '2026-05-09 10:12:11', NULL, '2026-05-09 15:42:11', 209000, 1, '2026-05-07 18:30:00', '2026-05', 'expense', 'credit_card', 'cat_mopialsj_qat4q8h3ta2uich8', 'acc_moosa3qj_hj3adif2i3hpl7df', '', NULL, NULL, NULL, 'personal', NULL, 'eef3de77d44e095dbc6dff8afa838afbe6c03f6c33f1ada6453f83fa4e6775ff'),
('row_6f7d58cda968e01ba2b1531f', 'cu_521c089bd5eaca0e152039e2', 'transactions', 'txn_mopw6dwg_ynafy4rmr0thltb4', '{\"id\":\"txn_mopw6dwg_ynafy4rmr0thltb4\",\"userId\":\"cu_521c089bd5eaca0e152039e2\",\"createdAt\":\"2026-05-03T14:54:46.240Z\",\"updatedAt\":\"2026-05-03T17:26:25.000Z\",\"isDeleted\":1,\"version\":2,\"tags\":[],\"notes\":\"\",\"date\":\"2026-05-05T18:30:00.000Z\",\"type\":\"expense\",\"amount\":17972.75,\"categoryId\":\"cat_mopd5p4h_e0h3t1a65h8aa8ko\",\"accountId\":\"acc_moosa3qj_hj3adif2i3hpl7df\",\"toAccountId\":\"\",\"linkedCardId\":\"\",\"linkedLoanId\":\"\",\"linkedGoalId\":\"\",\"linkedUdhariId\":\"\",\"linkedSavingsId\":\"\",\"paymentMode\":\"upi\",\"merchantOrPerson\":\"Credit\",\"description\":\"\",\"billAvailable\":0,\"gstApplicable\":0,\"taxFlag\":0,\"businessOrPersonal\":\"personal\",\"needWant\":\"unassigned\",\"fixedVariable\":\"unassigned\",\"plannedUnplanned\":\"unassigned\"}', '2026-05-03 11:56:25', '2026-05-03 11:56:25', '2026-05-03 14:54:47', 1797275, 1, '2026-05-04 18:30:00', '2026-05', 'expense', 'upi', 'cat_mopd5p4h_e0h3t1a65h8aa8ko', 'acc_moosa3qj_hj3adif2i3hpl7df', '', NULL, NULL, NULL, 'personal', NULL, '3e382f121b35caa7de00e18ac15054496a2602a1fbfa1ff56344f2ef53c641b0'),
('row_6f934f85a08b6795fe5501d4', 'cu_521c089bd5eaca0e152039e2', 'transactions', 'txn_moukujs7_o1sduy5mjqcpqj5r', '{\"id\":\"txn_moukujs7_o1sduy5mjqcpqj5r\",\"userId\":\"cu_521c089bd5eaca0e152039e2\",\"createdAt\":\"2026-05-06T21:36:29.095Z\",\"updatedAt\":\"2026-05-06T21:36:29.000Z\",\"isDeleted\":0,\"version\":1,\"tags\":[],\"notes\":\"\",\"date\":\"2026-05-06T18:30:00.000Z\",\"type\":\"expense\",\"amount\":140,\"categoryId\":\"cat_mopd695a_dkhmbr7h0lgnqhnl\",\"accountId\":\"acc_moosa3qj_hj3adif2i3hpl7df\",\"toAccountId\":\"\",\"linkedCardId\":\"\",\"linkedLoanId\":\"\",\"linkedGoalId\":\"\",\"linkedUdhariId\":\"\",\"linkedSavingsId\":\"\",\"paymentMode\":\"upi\",\"merchantOrPerson\":\"Night food\",\"description\":\"\",\"billAvailable\":0,\"gstApplicable\":0,\"taxFlag\":0,\"businessOrPersonal\":\"personal\",\"needWant\":\"unassigned\",\"fixedVariable\":\"unassigned\",\"plannedUnplanned\":\"unassigned\"}', '2026-05-06 16:06:29', NULL, '2026-05-06 21:36:29', 14000, 1, '2026-05-05 18:30:00', '2026-05', 'expense', 'upi', 'cat_mopd695a_dkhmbr7h0lgnqhnl', 'acc_moosa3qj_hj3adif2i3hpl7df', '', NULL, NULL, NULL, 'personal', NULL, '4c35e7d3bbf2f7dcc5c8791a2e59168a4591eddc1621e149d6c2f2dee42beee9'),
('row_6f9fa78f9c6ddd27f4e94bb4', 'cu_521c089bd5eaca0e152039e2', 'categories', 'cat_mopi8v9k_qewycy5n6mvvax1o', '{\"id\":\"cat_mopi8v9k_qewycy5n6mvvax1o\",\"userId\":\"cu_521c089bd5eaca0e152039e2\",\"createdAt\":\"2026-05-03T08:24:47.432Z\",\"updatedAt\":\"2026-05-03T08:24:48.000Z\",\"isDeleted\":0,\"version\":1,\"tags\":[],\"notes\":\"\",\"name\":\"Home \",\"appliesTo\":\"expense\",\"icon\":\"\\ud83c\\udfe0\",\"color\":\"#0ea5e9\",\"budgetable\":1,\"taxRelevant\":0,\"gstRelevant\":0,\"parentId\":null,\"sortOrder\":999,\"archived\":0}', '2026-05-03 02:54:48', NULL, '2026-05-03 08:24:48', NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
('row_743acd4d51c483d53d593e75', 'cu_85024323863151a04375d3e5', 'loans', 'lon_moq61pyw_vm2vlebsn2eko6lm', '{\"id\":\"lon_moq61pyw_vm2vlebsn2eko6lm\",\"userId\":\"cu_85024323863151a04375d3e5\",\"createdAt\":\"2026-05-03T19:31:04.760Z\",\"updatedAt\":\"2026-05-03T19:31:09.000Z\",\"isDeleted\":0,\"version\":1,\"tags\":[],\"notes\":\"\",\"lender\":\"Arzopa Screen EMI\",\"loanType\":\"personal\",\"principal\":15995,\"startDate\":\"2025-09-22T18:30:00.000Z\",\"tenureMonths\":12,\"annualInterestRate\":16,\"emiDueDay\":20,\"processingFee\":0,\"insuranceCost\":0,\"prepaymentAllowed\":1,\"foreclosureCharges\":2,\"status\":\"active\"}', '2026-05-03 14:01:09', NULL, '2026-05-03 19:31:09', NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
('row_750d5c7c0580cca401bdd399', 'cu_85024323863151a04375d3e5', 'transactions', 'txn_mp5g9pk2_4xfnrzpvznpabt00', '{\"id\":\"txn_mp5g9pk2_4xfnrzpvznpabt00\",\"userId\":\"cu_85024323863151a04375d3e5\",\"createdAt\":\"2026-05-14T12:13:46.274Z\",\"updatedAt\":\"2026-05-14T12:13:47.000Z\",\"isDeleted\":0,\"version\":1,\"tags\":[],\"notes\":\"\",\"date\":\"2026-05-13T18:30:00.000Z\",\"type\":\"expense\",\"amount\":45,\"categoryId\":\"cat_moq4vw8q_6b099gvhyea1hggw\",\"accountId\":\"acc_moopckwl_uoxw3nmnyvq8j4uh\",\"toAccountId\":\"\",\"linkedCardId\":\"\",\"linkedLoanId\":\"\",\"linkedGoalId\":\"\",\"linkedUdhariId\":\"\",\"linkedSavingsId\":\"\",\"paymentMode\":\"upi\",\"merchantOrPerson\":\"Food\",\"description\":\"\",\"billAvailable\":0,\"gstApplicable\":0,\"taxFlag\":0,\"businessOrPersonal\":\"personal\",\"needWant\":\"unassigned\",\"fixedVariable\":\"unassigned\",\"plannedUnplanned\":\"unassigned\"}', '2026-05-14 06:43:47', NULL, '2026-05-14 12:13:47', 4500, 1, '2026-05-12 18:30:00', '2026-05', 'expense', 'upi', 'cat_moq4vw8q_6b099gvhyea1hggw', 'acc_moopckwl_uoxw3nmnyvq8j4uh', '', NULL, NULL, NULL, 'personal', NULL, 'f77483911c792cbde6336ff9c87db297351a98497642cb7e14f3547157fd501a'),
('row_7512dd0e065c56627c47e3f5', 'cu_521c089bd5eaca0e152039e2', 'transactions', 'txn_moqujsk5_ni25hugvt3knj5ps', '{\"id\":\"txn_moqujsk5_ni25hugvt3knj5ps\",\"userId\":\"cu_521c089bd5eaca0e152039e2\",\"createdAt\":\"2026-05-04T06:56:58.709Z\",\"updatedAt\":\"2026-05-04T13:29:11.000Z\",\"isDeleted\":1,\"version\":2,\"tags\":[],\"notes\":\"\",\"date\":\"2026-05-05T18:30:00.000Z\",\"type\":\"expense\",\"amount\":17972.75,\"categoryId\":\"cat_mopd5p4h_e0h3t1a65h8aa8ko\",\"accountId\":\"acc_moosa3qj_hj3adif2i3hpl7df\",\"toAccountId\":\"\",\"linkedCardId\":\"\",\"linkedLoanId\":\"\",\"linkedGoalId\":\"\",\"linkedUdhariId\":\"\",\"linkedSavingsId\":\"\",\"paymentMode\":\"bank_transfer\",\"merchantOrPerson\":\"Credit Bill\",\"description\":\"\",\"billAvailable\":0,\"gstApplicable\":0,\"taxFlag\":0,\"businessOrPersonal\":\"personal\",\"needWant\":\"unassigned\",\"fixedVariable\":\"unassigned\",\"plannedUnplanned\":\"unassigned\"}', '2026-05-04 07:59:11', '2026-05-04 07:59:11', '2026-05-04 06:57:01', 1797275, 1, '2026-05-04 18:30:00', '2026-05', 'expense', 'bank_transfer', 'cat_mopd5p4h_e0h3t1a65h8aa8ko', 'acc_moosa3qj_hj3adif2i3hpl7df', '', NULL, NULL, NULL, 'personal', NULL, '68a2bc4c0e6d9c45762fc4bbbce9c81fc0ece3e1462a9167f3e19a0912fa7590'),
('row_79f02b70db1de238d2382f95', 'cu_521c089bd5eaca0e152039e2', 'transactions', 'txn_mopw0yy1_1ez90zk4gqijnjlu', '{\"id\":\"txn_mopw0yy1_1ez90zk4gqijnjlu\",\"userId\":\"cu_521c089bd5eaca0e152039e2\",\"createdAt\":\"2026-05-03T14:50:33.577Z\",\"updatedAt\":\"2026-05-03T14:50:34.000Z\",\"isDeleted\":0,\"version\":1,\"tags\":[],\"notes\":\"\",\"date\":\"2026-05-02T18:30:00.000Z\",\"type\":\"expense\",\"amount\":1072.890000000000100044417195022106170654296875,\"categoryId\":\"cat_mopd695a_dkhmbr7h0lgnqhnl\",\"accountId\":\"acc_moosa3qj_hj3adif2i3hpl7df\",\"toAccountId\":\"\",\"linkedCardId\":\"\",\"linkedLoanId\":\"\",\"linkedGoalId\":\"\",\"linkedUdhariId\":\"\",\"linkedSavingsId\":\"\",\"paymentMode\":\"upi\",\"merchantOrPerson\":\"Zomato\",\"description\":\"\",\"billAvailable\":0,\"gstApplicable\":0,\"taxFlag\":0,\"businessOrPersonal\":\"personal\",\"needWant\":\"unassigned\",\"fixedVariable\":\"unassigned\",\"plannedUnplanned\":\"unassigned\"}', '2026-05-03 09:20:34', NULL, '2026-05-03 14:50:34', 107289, 1, '2026-05-01 18:30:00', '2026-05', 'expense', 'upi', 'cat_mopd695a_dkhmbr7h0lgnqhnl', 'acc_moosa3qj_hj3adif2i3hpl7df', '', NULL, NULL, NULL, 'personal', NULL, 'cbc9c76a4fd04d41b003903eb9096b0c9c9eecfe38baec78c57e5b9cf419b757'),
('row_7e8883773f41f2fa983c0e94', 'cu_521c089bd5eaca0e152039e2', 'transactions', 'txn_mowr9rg6_ghgvypp7oq7hp1gl', '{\"id\":\"txn_mowr9rg6_ghgvypp7oq7hp1gl\",\"userId\":\"cu_521c089bd5eaca0e152039e2\",\"createdAt\":\"2026-05-08T10:11:48.918Z\",\"updatedAt\":\"2026-05-08T10:11:50.000Z\",\"isDeleted\":0,\"version\":1,\"tags\":[],\"notes\":\"\",\"date\":\"2026-05-07T18:30:00.000Z\",\"type\":\"expense\",\"amount\":20000,\"categoryId\":\"cat_mopi8v9k_qewycy5n6mvvax1o\",\"accountId\":\"acc_moosba06_7pn752s6qkubninu\",\"toAccountId\":\"\",\"linkedCardId\":\"\",\"linkedLoanId\":\"\",\"linkedGoalId\":\"\",\"linkedUdhariId\":\"\",\"linkedSavingsId\":\"\",\"paymentMode\":\"upi\",\"merchantOrPerson\":\"home\",\"description\":\"\",\"billAvailable\":0,\"gstApplicable\":0,\"taxFlag\":0,\"businessOrPersonal\":\"personal\",\"needWant\":\"unassigned\",\"fixedVariable\":\"unassigned\",\"plannedUnplanned\":\"unassigned\"}', '2026-05-08 04:41:50', NULL, '2026-05-08 10:11:50', 2000000, 1, '2026-05-06 18:30:00', '2026-05', 'expense', 'upi', 'cat_mopi8v9k_qewycy5n6mvvax1o', 'acc_moosba06_7pn752s6qkubninu', '', NULL, NULL, NULL, 'personal', NULL, 'dfa7fee239d43266392338d9ff6d6ef30c9ce316fba492c1fa3a0bf02454b25b'),
('row_7eae2907ab33428f41ada02f', 'cu_85024323863151a04375d3e5', 'alerts', 'alt_moq6i9kx_q1x7q6bdnns29oot', '{\"id\":\"alt_moq6i9kx_q1x7q6bdnns29oot\",\"userId\":\"cu_85024323863151a04375d3e5\",\"createdAt\":\"2026-05-03T19:43:56.673Z\",\"updatedAt\":\"2026-05-03T19:47:30.000Z\",\"isDeleted\":0,\"version\":4,\"tags\":[],\"notes\":\"\",\"kind\":\"emi_overdue\",\"severity\":\"danger\",\"title\":\"Arzopa Screen EMI EMI overdue\",\"message\":\"196 day(s) overdue \\u2014 clear soon.\",\"dismissed\":1,\"triggeredAt\":\"2026-05-03T19:43:56.672Z\"}', '2026-05-03 14:17:30', NULL, '2026-05-03 19:43:59', NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
('row_8308f98637fadbf8d2657448', 'cu_521c089bd5eaca0e152039e2', 'transactions', 'txn_mopimvj5_zotilegswbxcad1s', '{\"id\":\"txn_mopimvj5_zotilegswbxcad1s\",\"userId\":\"cu_521c089bd5eaca0e152039e2\",\"createdAt\":\"2026-05-03T08:35:40.961Z\",\"updatedAt\":\"2026-05-03T08:36:06.000Z\",\"isDeleted\":1,\"version\":2,\"tags\":[],\"notes\":\"\",\"date\":\"2026-05-01T18:30:00.000Z\",\"type\":\"income\",\"amount\":1500,\"categoryId\":\"cat_mopilywn_830g8ygnfr999o40\",\"accountId\":\"acc_moosa3qj_hj3adif2i3hpl7df\",\"toAccountId\":\"\",\"linkedCardId\":\"\",\"linkedLoanId\":\"\",\"linkedGoalId\":\"\",\"linkedUdhariId\":\"\",\"linkedSavingsId\":\"\",\"paymentMode\":\"upi\",\"merchantOrPerson\":\"Print + Dmart\",\"description\":\"\",\"billAvailable\":0,\"gstApplicable\":0,\"taxFlag\":0,\"businessOrPersonal\":\"personal\",\"needWant\":\"unassigned\",\"fixedVariable\":\"unassigned\",\"plannedUnplanned\":\"unassigned\"}', '2026-05-03 03:06:06', '2026-05-03 03:06:06', '2026-05-03 08:35:42', 150000, 1, '2026-04-30 18:30:00', '2026-05', 'income', 'upi', 'cat_mopilywn_830g8ygnfr999o40', 'acc_moosa3qj_hj3adif2i3hpl7df', '', NULL, NULL, NULL, 'personal', NULL, '0cb20402787e11da160505ddb5b395c09827d7e58baa6c3a2a493dd2e1d67215'),
('row_847d58581f0c28c06ff8ffb6', 'cu_521c089bd5eaca0e152039e2', 'categories', 'cat_mopic2nm_mh39uhroxsndd9vx', '{\"id\":\"cat_mopic2nm_mh39uhroxsndd9vx\",\"userId\":\"cu_521c089bd5eaca0e152039e2\",\"createdAt\":\"2026-05-03T08:27:16.978Z\",\"updatedAt\":\"2026-05-03T08:27:17.000Z\",\"isDeleted\":0,\"version\":1,\"tags\":[],\"notes\":\"\",\"name\":\"Travel\",\"appliesTo\":\"expense\",\"icon\":\"\\u2708\\ufe0f\",\"color\":\"#0ea5e9\",\"budgetable\":1,\"taxRelevant\":0,\"gstRelevant\":0,\"parentId\":null,\"sortOrder\":999,\"archived\":0}', '2026-05-03 02:57:17', NULL, '2026-05-03 08:27:17', NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
('row_84885805d025ae70b30c8b1f', 'cu_85024323863151a04375d3e5', 'categories', 'cat_moq4uob6_c70ylxm8h68u17x1', '{\"id\":\"cat_moq4uob6_c70ylxm8h68u17x1\",\"userId\":\"cu_85024323863151a04375d3e5\",\"createdAt\":\"2026-05-03T18:57:36.402Z\",\"updatedAt\":\"2026-05-03T18:57:40.000Z\",\"isDeleted\":0,\"version\":1,\"tags\":[],\"notes\":\"\",\"name\":\"Adobe subscription\",\"appliesTo\":\"expense\",\"icon\":\"\\ud83d\\udcbb\",\"color\":\"#0ea5e9\",\"budgetable\":1,\"taxRelevant\":0,\"gstRelevant\":0,\"parentId\":null,\"sortOrder\":999,\"archived\":0}', '2026-05-03 13:27:40', NULL, '2026-05-03 18:57:40', NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
('row_85f62c8040e23c418689370b', 'cu_85024323863151a04375d3e5', 'cards', 'crd_moopf5kh_mkk0gkq6bbk1peyt', '{\"id\":\"crd_moopf5kh_mkk0gkq6bbk1peyt\",\"userId\":\"cu_85024323863151a04375d3e5\",\"createdAt\":\"2026-05-02T18:57:51.857Z\",\"updatedAt\":\"2026-05-02T18:58:27.000Z\",\"isDeleted\":1,\"version\":2,\"tags\":[],\"notes\":\"\",\"nickname\":\"FREEDOM\",\"bank\":\"HDFC Bank\",\"last4\":\"5702\",\"type\":\"credit\",\"linkedAccountId\":\"\",\"creditLimit\":47000,\"statementDay\":20,\"dueDay\":2,\"interestRate\":0,\"annualFee\":500,\"rewardNote\":\"\",\"color\":\"#8b5cf6\",\"isInactive\":0}', '2026-05-02 13:28:27', '2026-05-02 13:28:27', '2026-05-02 18:58:13', NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
('row_861d582312c869719585a937', 'cu_521c089bd5eaca0e152039e2', 'transactions', 'txn_mou8lw0k_uw4clrax31q1ev2e', '{\"id\":\"txn_mou8lw0k_uw4clrax31q1ev2e\",\"userId\":\"cu_521c089bd5eaca0e152039e2\",\"createdAt\":\"2026-05-06T15:53:49.652Z\",\"updatedAt\":\"2026-05-06T15:53:53.000Z\",\"isDeleted\":0,\"version\":1,\"tags\":[],\"notes\":\"\",\"date\":\"2026-05-05T18:30:00.000Z\",\"type\":\"expense\",\"amount\":463.82999999999998408384271897375583648681640625,\"categoryId\":\"cat_mopd695a_dkhmbr7h0lgnqhnl\",\"accountId\":\"acc_moosa3qj_hj3adif2i3hpl7df\",\"toAccountId\":\"\",\"linkedCardId\":\"\",\"linkedLoanId\":\"\",\"linkedGoalId\":\"\",\"linkedUdhariId\":\"\",\"linkedSavingsId\":\"\",\"paymentMode\":\"upi\",\"merchantOrPerson\":\"Zomato\",\"description\":\"\",\"billAvailable\":0,\"gstApplicable\":0,\"taxFlag\":0,\"businessOrPersonal\":\"personal\",\"needWant\":\"unassigned\",\"fixedVariable\":\"unassigned\",\"plannedUnplanned\":\"unassigned\"}', '2026-05-06 10:23:53', NULL, '2026-05-06 15:53:53', 46383, 1, '2026-05-04 18:30:00', '2026-05', 'expense', 'upi', 'cat_mopd695a_dkhmbr7h0lgnqhnl', 'acc_moosa3qj_hj3adif2i3hpl7df', '', NULL, NULL, NULL, 'personal', NULL, '320a73a03b37950a799f81c584193e26317fe3ea5acb4264d9ef746bd0804159'),
('row_8714d83bd0eabb2b6f6e8f91', 'cu_85024323863151a04375d3e5', 'transactions', 'txn_mp11zbwy_eegbvdmor0z9ougp', '{\"id\":\"txn_mp11zbwy_eegbvdmor0z9ougp\",\"userId\":\"cu_85024323863151a04375d3e5\",\"createdAt\":\"2026-05-11T10:22:42.706Z\",\"updatedAt\":\"2026-05-11T10:22:44.000Z\",\"isDeleted\":0,\"version\":1,\"tags\":[],\"notes\":\"\",\"date\":\"2026-05-10T18:30:00.000Z\",\"type\":\"expense\",\"amount\":50,\"categoryId\":\"cat_moq4vw8q_6b099gvhyea1hggw\",\"accountId\":\"acc_moopckwl_uoxw3nmnyvq8j4uh\",\"toAccountId\":\"\",\"linkedCardId\":\"\",\"linkedLoanId\":\"\",\"linkedGoalId\":\"\",\"linkedUdhariId\":\"\",\"linkedSavingsId\":\"\",\"paymentMode\":\"upi\",\"merchantOrPerson\":\"Pani Puri\",\"description\":\"\",\"billAvailable\":0,\"gstApplicable\":0,\"taxFlag\":0,\"businessOrPersonal\":\"personal\",\"needWant\":\"unassigned\",\"fixedVariable\":\"unassigned\",\"plannedUnplanned\":\"unassigned\"}', '2026-05-11 04:52:44', NULL, '2026-05-11 10:22:44', 5000, 1, '2026-05-09 18:30:00', '2026-05', 'expense', 'upi', 'cat_moq4vw8q_6b099gvhyea1hggw', 'acc_moopckwl_uoxw3nmnyvq8j4uh', '', NULL, NULL, NULL, 'personal', NULL, 'a99630b91ceb151a083956ad19ffb4eb9e1f35cd09fe5090954cad2231f6c0b2'),
('row_8ae09035a8c3b79f3f77f4b9', 'cu_521c089bd5eaca0e152039e2', 'goals', 'gol_mopiptwy_oz5h7av1lyj33y9p', '{\"id\":\"gol_mopiptwy_oz5h7av1lyj33y9p\",\"userId\":\"cu_521c089bd5eaca0e152039e2\",\"createdAt\":\"2026-05-03T08:37:58.834Z\",\"updatedAt\":\"2026-05-03T08:37:59.000Z\",\"isDeleted\":0,\"version\":1,\"tags\":[],\"notes\":\"\",\"title\":\"Car\",\"goalType\":\"car\",\"targetAmount\":500000,\"targetDate\":\"2027-12-30T18:30:00.000Z\",\"currentSaved\":0,\"priority\":4,\"autoContributionEnabled\":false,\"autoContributionAmount\":0,\"autoContributionDay\":1,\"icon\":\"\\ud83c\\udfaf\",\"color\":\"#8b5cf6\",\"status\":\"active\",\"startedAt\":\"2026-05-03T08:37:58.834Z\"}', '2026-05-03 03:07:59', NULL, '2026-05-03 08:37:59', NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
('row_8d598cfc262cae897af2b546', 'cu_521c089bd5eaca0e152039e2', 'loans', 'lon_moq5kgxo_hxmstgulof4xi4wh', '{\"id\":\"lon_moq5kgxo_hxmstgulof4xi4wh\",\"userId\":\"cu_521c089bd5eaca0e152039e2\",\"createdAt\":\"2026-05-03T19:17:39.900Z\",\"updatedAt\":\"2026-05-03T19:18:03.000Z\",\"isDeleted\":0,\"version\":2,\"tags\":[],\"notes\":\"\",\"lender\":\"car\",\"loanType\":\"personal\",\"principal\":25000,\"startDate\":\"2026-05-03T18:30:00.000Z\",\"tenureMonths\":12,\"annualInterestRate\":10,\"emiDueDay\":7,\"processingFee\":0,\"insuranceCost\":0,\"prepaymentAllowed\":1,\"foreclosureCharges\":0,\"status\":\"active\"}', '2026-05-03 13:48:03', NULL, '2026-05-03 19:17:40', NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
('row_91ed4959efa814df06fe4004', 'cu_521c089bd5eaca0e152039e2', 'transactions', 'txn_mopii0f0_252kbk6nty6dxome', '{\"id\":\"txn_mopii0f0_252kbk6nty6dxome\",\"userId\":\"cu_521c089bd5eaca0e152039e2\",\"createdAt\":\"2026-05-03T08:31:54.012Z\",\"updatedAt\":\"2026-05-03T08:31:54.000Z\",\"isDeleted\":0,\"version\":1,\"tags\":[],\"notes\":\"\",\"date\":\"2026-05-01T18:30:00.000Z\",\"type\":\"expense\",\"amount\":199,\"categoryId\":\"cat_mopibqv6_yrpkvzjbk25ooyur\",\"accountId\":\"acc_moosa3qj_hj3adif2i3hpl7df\",\"toAccountId\":\"\",\"linkedCardId\":\"\",\"linkedLoanId\":\"\",\"linkedGoalId\":\"\",\"linkedUdhariId\":\"\",\"linkedSavingsId\":\"\",\"paymentMode\":\"upi\",\"merchantOrPerson\":\"Netflix\",\"description\":\"\",\"billAvailable\":0,\"gstApplicable\":0,\"taxFlag\":0,\"businessOrPersonal\":\"personal\",\"needWant\":\"unassigned\",\"fixedVariable\":\"unassigned\",\"plannedUnplanned\":\"unassigned\"}', '2026-05-03 03:01:54', NULL, '2026-05-03 08:31:54', 19900, 1, '2026-04-30 18:30:00', '2026-05', 'expense', 'upi', 'cat_mopibqv6_yrpkvzjbk25ooyur', 'acc_moosa3qj_hj3adif2i3hpl7df', '', NULL, NULL, NULL, 'personal', NULL, '15280e8c829846cf83d4548f848a220254c0dfca19fbcd949f9ee9ee30c2a3fa'),
('row_92879e9db5efe83c155b485b', 'cu_521c089bd5eaca0e152039e2', 'transactions', 'txn_movyk7bl_z3ux9u4t59i7d8hz', '{\"id\":\"txn_movyk7bl_z3ux9u4t59i7d8hz\",\"userId\":\"cu_521c089bd5eaca0e152039e2\",\"createdAt\":\"2026-05-07T20:48:07.185Z\",\"updatedAt\":\"2026-05-07T20:48:08.000Z\",\"isDeleted\":0,\"version\":1,\"tags\":[],\"notes\":\"\",\"date\":\"2026-05-06T18:30:00.000Z\",\"type\":\"income\",\"amount\":15000,\"categoryId\":\"cat_mopib3r5_ldtrmna3rfck1u7e\",\"accountId\":\"acc_moosba06_7pn752s6qkubninu\",\"toAccountId\":\"\",\"linkedCardId\":\"\",\"linkedLoanId\":\"\",\"linkedGoalId\":\"\",\"linkedUdhariId\":\"\",\"linkedSavingsId\":\"\",\"paymentMode\":\"bank_transfer\",\"merchantOrPerson\":\"LD Finmave\",\"description\":\"\",\"billAvailable\":0,\"gstApplicable\":0,\"taxFlag\":0,\"businessOrPersonal\":\"personal\",\"needWant\":\"unassigned\",\"fixedVariable\":\"unassigned\",\"plannedUnplanned\":\"unassigned\"}', '2026-05-07 15:18:08', NULL, '2026-05-07 20:48:08', 1500000, 1, '2026-05-05 18:30:00', '2026-05', 'income', 'bank_transfer', 'cat_mopib3r5_ldtrmna3rfck1u7e', 'acc_moosba06_7pn752s6qkubninu', '', NULL, NULL, NULL, 'personal', NULL, '6fe2154ef148ca545c3aa95cb2793b0b6352ebe69f39cc8fb126281e80ecbd7b'),
('row_9565922fb66dcf091d3827ca', 'cu_521c089bd5eaca0e152039e2', 'transactions', 'txn_mp11xa6o_18vhdc3mjl69q7ev', '{\"id\":\"txn_mp11xa6o_18vhdc3mjl69q7ev\",\"userId\":\"cu_521c089bd5eaca0e152039e2\",\"createdAt\":\"2026-05-11T10:21:07.152Z\",\"updatedAt\":\"2026-05-11T10:21:17.000Z\",\"isDeleted\":0,\"version\":1,\"tags\":[],\"notes\":\"\",\"date\":\"2026-05-09T18:30:00.000Z\",\"type\":\"expense\",\"amount\":183.330000000000012505552149377763271331787109375,\"categoryId\":\"cat_mopd695a_dkhmbr7h0lgnqhnl\",\"accountId\":\"acc_moosa3qj_hj3adif2i3hpl7df\",\"toAccountId\":\"\",\"linkedCardId\":\"\",\"linkedLoanId\":\"\",\"linkedGoalId\":\"\",\"linkedUdhariId\":\"\",\"linkedSavingsId\":\"\",\"paymentMode\":\"upi\",\"merchantOrPerson\":\"zomato\",\"description\":\"\",\"billAvailable\":0,\"gstApplicable\":0,\"taxFlag\":0,\"businessOrPersonal\":\"personal\",\"needWant\":\"unassigned\",\"fixedVariable\":\"unassigned\",\"plannedUnplanned\":\"unassigned\"}', '2026-05-11 04:51:17', NULL, '2026-05-11 10:21:17', 18333, 1, '2026-05-08 18:30:00', '2026-05', 'expense', 'upi', 'cat_mopd695a_dkhmbr7h0lgnqhnl', 'acc_moosa3qj_hj3adif2i3hpl7df', '', NULL, NULL, NULL, 'personal', NULL, '6308e3d443a4e6724088c6ef15e1b07c331b505325d629ab3b209ac06199c6ba'),
('row_9598235bc23f977d8b1eebd2', 'cu_85024323863151a04375d3e5', 'categories', 'cat_moq4ts5z_p63wayuvtm9syj9v', '{\"id\":\"cat_moq4ts5z_p63wayuvtm9syj9v\",\"userId\":\"cu_85024323863151a04375d3e5\",\"createdAt\":\"2026-05-03T18:56:54.743Z\",\"updatedAt\":\"2026-05-03T18:56:58.000Z\",\"isDeleted\":0,\"version\":1,\"tags\":[],\"notes\":\"\",\"name\":\"Blink It\",\"appliesTo\":\"expense\",\"icon\":\"\\ud83d\\uded2\",\"color\":\"#0ea5e9\",\"budgetable\":1,\"taxRelevant\":0,\"gstRelevant\":0,\"parentId\":null,\"sortOrder\":999,\"archived\":0}', '2026-05-03 13:26:58', NULL, '2026-05-03 18:56:58', NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
('row_965a3feea324f31180f1e888', 'cu_85024323863151a04375d3e5', 'cards', 'crd_moopfdl1_s0cpw88ngw0kp3ht', '{\"id\":\"crd_moopfdl1_s0cpw88ngw0kp3ht\",\"userId\":\"cu_85024323863151a04375d3e5\",\"createdAt\":\"2026-05-02T18:58:02.245Z\",\"updatedAt\":\"2026-05-02T18:58:31.000Z\",\"isDeleted\":1,\"version\":2,\"tags\":[],\"notes\":\"\",\"nickname\":\"FREEDOM\",\"bank\":\"HDFC Bank\",\"last4\":\"5702\",\"type\":\"credit\",\"linkedAccountId\":\"\",\"creditLimit\":47000,\"statementDay\":20,\"dueDay\":2,\"interestRate\":0,\"annualFee\":500,\"rewardNote\":\"\",\"color\":\"#8b5cf6\",\"isInactive\":0}', '2026-05-02 13:28:31', '2026-05-02 13:28:31', '2026-05-02 18:58:13', NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
('row_967e2c8867c579f4b9e8a625', 'cu_521c089bd5eaca0e152039e2', 'transactions', 'txn_mou8p3p4_sangnjna93whvg9k', '{\"id\":\"txn_mou8p3p4_sangnjna93whvg9k\",\"userId\":\"cu_521c089bd5eaca0e152039e2\",\"createdAt\":\"2026-05-06T15:56:19.576Z\",\"updatedAt\":\"2026-05-06T15:56:23.000Z\",\"isDeleted\":0,\"version\":1,\"tags\":[],\"notes\":\"\",\"date\":\"2026-05-02T18:30:00.000Z\",\"type\":\"expense\",\"amount\":419,\"categoryId\":\"cat_mopd7lvb_veuhvlumwtmy30tp\",\"accountId\":\"acc_moosa3qj_hj3adif2i3hpl7df\",\"toAccountId\":\"\",\"linkedCardId\":\"\",\"linkedLoanId\":\"\",\"linkedGoalId\":\"\",\"linkedUdhariId\":\"\",\"linkedSavingsId\":\"\",\"paymentMode\":\"upi\",\"merchantOrPerson\":\"OFF. Water Cold Cofee\",\"description\":\"\",\"billAvailable\":0,\"gstApplicable\":0,\"taxFlag\":0,\"businessOrPersonal\":\"personal\",\"needWant\":\"unassigned\",\"fixedVariable\":\"unassigned\",\"plannedUnplanned\":\"unassigned\"}', '2026-05-06 10:26:23', NULL, '2026-05-06 15:56:23', 41900, 1, '2026-05-01 18:30:00', '2026-05', 'expense', 'upi', 'cat_mopd7lvb_veuhvlumwtmy30tp', 'acc_moosa3qj_hj3adif2i3hpl7df', '', NULL, NULL, NULL, 'personal', NULL, '5c4833ef7320bc8134e2725bae55d0bd2b33b8cc420ffcee8a741966674a96b1'),
('row_9e29727e4611cc0c87322785', 'cu_85024323863151a04375d3e5', 'categories', 'cat_moq56yg5_vr694rs6095w8yui', '{\"id\":\"cat_moq56yg5_vr694rs6095w8yui\",\"userId\":\"cu_85024323863151a04375d3e5\",\"createdAt\":\"2026-05-03T19:07:09.413Z\",\"updatedAt\":\"2026-05-03T19:07:12.000Z\",\"isDeleted\":0,\"version\":1,\"tags\":[],\"notes\":\"\",\"name\":\"Shopping\",\"appliesTo\":\"expense\",\"icon\":\"\\ud83d\\uded2\",\"color\":\"#0ea5e9\",\"budgetable\":1,\"taxRelevant\":0,\"gstRelevant\":0,\"parentId\":null,\"sortOrder\":999,\"archived\":0}', '2026-05-03 13:37:12', NULL, '2026-05-03 19:07:12', NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
('row_9ff07418a9d45708eeb08f67', 'cu_85024323863151a04375d3e5', 'cards', 'crd_moopfbrp_nzhzr53dncjv8mpu', '{\"id\":\"crd_moopfbrp_nzhzr53dncjv8mpu\",\"userId\":\"cu_85024323863151a04375d3e5\",\"createdAt\":\"2026-05-02T18:57:59.892Z\",\"updatedAt\":\"2026-05-02T18:58:23.000Z\",\"isDeleted\":1,\"version\":2,\"tags\":[],\"notes\":\"\",\"nickname\":\"FREEDOM\",\"bank\":\"HDFC Bank\",\"last4\":\"5702\",\"type\":\"credit\",\"linkedAccountId\":\"\",\"creditLimit\":47000,\"statementDay\":20,\"dueDay\":2,\"interestRate\":0,\"annualFee\":500,\"rewardNote\":\"\",\"color\":\"#8b5cf6\",\"isInactive\":0}', '2026-05-02 13:28:23', '2026-05-02 13:28:23', '2026-05-02 18:58:13', NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
('row_a03fa3f6a31597a61b08bf98', 'cu_85024323863151a04375d3e5', 'categories', 'cat_moq4u7b9_sgs3dsgctfc0m5o3', '{\"id\":\"cat_moq4u7b9_sgs3dsgctfc0m5o3\",\"userId\":\"cu_85024323863151a04375d3e5\",\"createdAt\":\"2026-05-03T18:57:14.373Z\",\"updatedAt\":\"2026-05-03T18:57:17.000Z\",\"isDeleted\":0,\"version\":1,\"tags\":[],\"notes\":\"\",\"name\":\"Petrol\",\"appliesTo\":\"expense\",\"icon\":\"\\u26fd\",\"color\":\"#0ea5e9\",\"budgetable\":1,\"taxRelevant\":0,\"gstRelevant\":0,\"parentId\":null,\"sortOrder\":999,\"archived\":0}', '2026-05-03 13:27:17', NULL, '2026-05-03 18:57:17', NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
('row_a181080186630f9c315b38bd', 'cu_521c089bd5eaca0e152039e2', 'transactions', 'txn_mopifkwx_qiv50rrk74ofre8u', '{\"id\":\"txn_mopifkwx_qiv50rrk74ofre8u\",\"userId\":\"cu_521c089bd5eaca0e152039e2\",\"createdAt\":\"2026-05-03T08:30:00.609Z\",\"updatedAt\":\"2026-05-03T08:30:01.000Z\",\"isDeleted\":0,\"version\":1,\"tags\":[],\"notes\":\"\",\"date\":\"2026-05-01T18:30:00.000Z\",\"type\":\"expense\",\"amount\":760,\"categoryId\":\"cat_mopi8858_ext2ok7elxrr60qz\",\"accountId\":\"acc_moosa3qj_hj3adif2i3hpl7df\",\"toAccountId\":\"\",\"linkedCardId\":\"\",\"linkedLoanId\":\"\",\"linkedGoalId\":\"\",\"linkedUdhariId\":\"\",\"linkedSavingsId\":\"\",\"paymentMode\":\"upi\",\"merchantOrPerson\":\"Hair Cut\",\"description\":\"\",\"billAvailable\":0,\"gstApplicable\":0,\"taxFlag\":0,\"businessOrPersonal\":\"personal\",\"needWant\":\"unassigned\",\"fixedVariable\":\"unassigned\",\"plannedUnplanned\":\"unassigned\"}', '2026-05-03 03:00:01', NULL, '2026-05-03 08:30:01', 76000, 1, '2026-04-30 18:30:00', '2026-05', 'expense', 'upi', 'cat_mopi8858_ext2ok7elxrr60qz', 'acc_moosa3qj_hj3adif2i3hpl7df', '', NULL, NULL, NULL, 'personal', NULL, '746f6a533d470abed4cabbc486d874d91847f71536131e7b0f4d39ffff57cd72'),
('row_a184a28703ac6bcf3eeaaf7d', 'cu_521c089bd5eaca0e152039e2', 'transactions', 'txn_mopigpra_4r9vdctxbi7j995o', '{\"id\":\"txn_mopigpra_4r9vdctxbi7j995o\",\"userId\":\"cu_521c089bd5eaca0e152039e2\",\"createdAt\":\"2026-05-03T08:30:53.542Z\",\"updatedAt\":\"2026-05-03T08:30:53.000Z\",\"isDeleted\":0,\"version\":1,\"tags\":[],\"notes\":\"\",\"date\":\"2026-05-01T18:30:00.000Z\",\"type\":\"expense\",\"amount\":1350,\"categoryId\":\"cat_mopiath4_exsrtqggo285vkbq\",\"accountId\":\"acc_moosanov_2qbs16k7rzkbqpnb\",\"toAccountId\":\"\",\"linkedCardId\":\"\",\"linkedLoanId\":\"\",\"linkedGoalId\":\"\",\"linkedUdhariId\":\"\",\"linkedSavingsId\":\"\",\"paymentMode\":\"cash\",\"merchantOrPerson\":\"Health Report\",\"description\":\"\",\"billAvailable\":0,\"gstApplicable\":0,\"taxFlag\":0,\"businessOrPersonal\":\"personal\",\"needWant\":\"unassigned\",\"fixedVariable\":\"unassigned\",\"plannedUnplanned\":\"unassigned\"}', '2026-05-03 03:00:53', NULL, '2026-05-03 08:30:53', 135000, 1, '2026-04-30 18:30:00', '2026-05', 'expense', 'cash', 'cat_mopiath4_exsrtqggo285vkbq', 'acc_moosanov_2qbs16k7rzkbqpnb', '', NULL, NULL, NULL, 'personal', NULL, 'b1c2b436f5a9f7b0a4c0d0b1090d83fe44f3c4364a67cea84e75aa9176ea1b57'),
('row_a1b48621d0004307ee9d97ff', 'cu_521c089bd5eaca0e152039e2', 'categories', 'cat_mopi9uig_myhbec85lne0qk7q', '{\"id\":\"cat_mopi9uig_myhbec85lne0qk7q\",\"userId\":\"cu_521c089bd5eaca0e152039e2\",\"createdAt\":\"2026-05-03T08:25:33.112Z\",\"updatedAt\":\"2026-05-03T08:25:42.000Z\",\"isDeleted\":1,\"version\":2,\"tags\":[],\"notes\":\"\",\"name\":\"Mobile\",\"appliesTo\":\"expense\",\"icon\":\"\\ud83d\\udcf1\",\"color\":\"#0ea5e9\",\"budgetable\":1,\"taxRelevant\":0,\"gstRelevant\":0,\"parentId\":null,\"sortOrder\":999,\"archived\":0}', '2026-05-03 02:55:42', '2026-05-03 02:55:42', '2026-05-03 08:25:33', NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
('row_a39b644cfa316eb374aac474', 'cu_85024323863151a04375d3e5', 'accounts', 'acc_moopbws1_c65oqcylv9tpac90', '{\"id\":\"acc_moopbws1_c65oqcylv9tpac90\",\"userId\":\"cu_85024323863151a04375d3e5\",\"createdAt\":\"2026-05-02T18:55:20.497Z\",\"updatedAt\":\"2026-05-02T18:55:23.000Z\",\"isDeleted\":0,\"version\":1,\"tags\":[],\"notes\":\"\",\"name\":\"HDFC\",\"type\":\"savings\",\"institution\":\"HDFC\",\"openingBalance\":0,\"color\":\"#e70d0d\",\"icon\":\"wallet\",\"isInactive\":0}', '2026-05-02 13:25:23', NULL, '2026-05-02 18:55:23', NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
('row_a8448ac307d6f58fc83d81ac', 'cu_521c089bd5eaca0e152039e2', 'categories', 'cat_mopiath4_exsrtqggo285vkbq', '{\"id\":\"cat_mopiath4_exsrtqggo285vkbq\",\"userId\":\"cu_521c089bd5eaca0e152039e2\",\"createdAt\":\"2026-05-03T08:26:18.424Z\",\"updatedAt\":\"2026-05-03T08:26:18.000Z\",\"isDeleted\":0,\"version\":1,\"tags\":[],\"notes\":\"\",\"name\":\"Medical\",\"appliesTo\":\"expense\",\"icon\":\"\\ud83c\\udfe5\",\"color\":\"#0ea5e9\",\"budgetable\":1,\"taxRelevant\":0,\"gstRelevant\":0,\"parentId\":null,\"sortOrder\":999,\"archived\":0}', '2026-05-03 02:56:18', NULL, '2026-05-03 08:26:18', NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
('row_a86dc6b3cb0ef6827a59178d', 'cu_85024323863151a04375d3e5', 'categories', 'cat_mp124j8h_f7qwlvatnli09oc7', '{\"id\":\"cat_mp124j8h_f7qwlvatnli09oc7\",\"userId\":\"cu_85024323863151a04375d3e5\",\"createdAt\":\"2026-05-11T10:26:45.473Z\",\"updatedAt\":\"2026-05-11T10:26:47.000Z\",\"isDeleted\":0,\"version\":1,\"tags\":[],\"notes\":\"\",\"name\":\"Accesories\",\"appliesTo\":\"expense\",\"icon\":\"\\ud83d\\udd27\",\"color\":\"#0ea5e9\",\"budgetable\":1,\"taxRelevant\":0,\"gstRelevant\":0,\"parentId\":null,\"sortOrder\":999,\"archived\":0}', '2026-05-11 04:56:47', NULL, '2026-05-11 10:26:47', NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
('row_acee1ae941f7cf06407bc35f', 'cu_85024323863151a04375d3e5', 'categories', 'cat_moq4vb39_glbfxcxgxt2i4kwv', '{\"id\":\"cat_moq4vb39_glbfxcxgxt2i4kwv\",\"userId\":\"cu_85024323863151a04375d3e5\",\"createdAt\":\"2026-05-03T18:58:05.925Z\",\"updatedAt\":\"2026-05-03T18:58:09.000Z\",\"isDeleted\":0,\"version\":1,\"tags\":[],\"notes\":\"\",\"name\":\"Spotify sbscription\",\"appliesTo\":\"expense\",\"icon\":\"\\ud83d\\udcf1\",\"color\":\"#0ea5e9\",\"budgetable\":1,\"taxRelevant\":0,\"gstRelevant\":0,\"parentId\":null,\"sortOrder\":999,\"archived\":0}', '2026-05-03 13:28:09', NULL, '2026-05-03 18:58:09', NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
('row_af302a6d1cbbaac3996310b3', 'cu_521c089bd5eaca0e152039e2', 'transactions', 'txn_mosfxdzp_mg1ftq4z6lmalc6n', '{\"id\":\"txn_mosfxdzp_mg1ftq4z6lmalc6n\",\"userId\":\"cu_521c089bd5eaca0e152039e2\",\"createdAt\":\"2026-05-05T09:43:11.125Z\",\"updatedAt\":\"2026-05-05T09:43:12.000Z\",\"isDeleted\":0,\"version\":1,\"tags\":[],\"notes\":\"\",\"date\":\"2026-05-04T18:30:00.000Z\",\"type\":\"income\",\"amount\":1500,\"categoryId\":\"cat_mopilywn_830g8ygnfr999o40\",\"accountId\":\"acc_moosa3qj_hj3adif2i3hpl7df\",\"toAccountId\":\"\",\"linkedCardId\":\"\",\"linkedLoanId\":\"\",\"linkedGoalId\":\"\",\"linkedUdhariId\":\"\",\"linkedSavingsId\":\"\",\"paymentMode\":\"upi\",\"merchantOrPerson\":\"jignesh\",\"description\":\"\",\"billAvailable\":0,\"gstApplicable\":0,\"taxFlag\":0,\"businessOrPersonal\":\"personal\",\"needWant\":\"unassigned\",\"fixedVariable\":\"unassigned\",\"plannedUnplanned\":\"unassigned\"}', '2026-05-05 04:13:12', NULL, '2026-05-05 09:43:12', 150000, 1, '2026-05-03 18:30:00', '2026-05', 'income', 'upi', 'cat_mopilywn_830g8ygnfr999o40', 'acc_moosa3qj_hj3adif2i3hpl7df', '', NULL, NULL, NULL, 'personal', NULL, 'f2cd493de8ed31d6bf7c4a8302a901ca10b7ccf985b224d54ba014034adfe062'),
('row_b5b74c2ff176b8fba6283908', 'cu_521c089bd5eaca0e152039e2', 'transactions', 'txn_mouktk8y_422tyku0hr88djph', '{\"id\":\"txn_mouktk8y_422tyku0hr88djph\",\"userId\":\"cu_521c089bd5eaca0e152039e2\",\"createdAt\":\"2026-05-06T21:35:43.042Z\",\"updatedAt\":\"2026-05-06T21:35:43.000Z\",\"isDeleted\":0,\"version\":1,\"tags\":[],\"notes\":\"\",\"date\":\"2026-05-05T18:30:00.000Z\",\"type\":\"expense\",\"amount\":1500,\"categoryId\":\"cat_mopi8v9k_qewycy5n6mvvax1o\",\"accountId\":\"acc_moosanov_2qbs16k7rzkbqpnb\",\"toAccountId\":\"\",\"linkedCardId\":\"\",\"linkedLoanId\":\"\",\"linkedGoalId\":\"\",\"linkedUdhariId\":\"\",\"linkedSavingsId\":\"\",\"paymentMode\":\"cash\",\"merchantOrPerson\":\"Home\",\"description\":\"\",\"billAvailable\":0,\"gstApplicable\":0,\"taxFlag\":0,\"businessOrPersonal\":\"personal\",\"needWant\":\"unassigned\",\"fixedVariable\":\"unassigned\",\"plannedUnplanned\":\"unassigned\"}', '2026-05-06 16:05:43', NULL, '2026-05-06 21:35:43', 150000, 1, '2026-05-04 18:30:00', '2026-05', 'expense', 'cash', 'cat_mopi8v9k_qewycy5n6mvvax1o', 'acc_moosanov_2qbs16k7rzkbqpnb', '', NULL, NULL, NULL, 'personal', NULL, '802484eb6abcd27fd157762e88d444f28014f3e49b71ede852a537b813bdbf4a'),
('row_b6f55099005e7f4cd0e9a91f', 'cu_521c089bd5eaca0e152039e2', 'categories', 'cat_mopd6h3d_nkha2lanqubm2mk7', '{\"id\":\"cat_mopd6h3d_nkha2lanqubm2mk7\",\"userId\":\"cu_521c089bd5eaca0e152039e2\",\"createdAt\":\"2026-05-03T06:02:57.673Z\",\"updatedAt\":\"2026-05-03T06:02:59.000Z\",\"isDeleted\":0,\"version\":1,\"tags\":[],\"notes\":\"\",\"name\":\"Cloth\",\"appliesTo\":\"expense\",\"icon\":\"\\ud83d\\udecd\\ufe0f\",\"color\":\"#0ea5e9\",\"budgetable\":1,\"taxRelevant\":0,\"gstRelevant\":0,\"parentId\":null,\"sortOrder\":999,\"archived\":0}', '2026-05-03 00:32:59', NULL, '2026-05-03 06:02:59', NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
('row_b8c89140bc17808cc7b5b70b', 'cu_521c089bd5eaca0e152039e2', 'transactions', 'txn_mopj50q1_6k8y44tw41zbza7g', '{\"id\":\"txn_mopj50q1_6k8y44tw41zbza7g\",\"userId\":\"cu_521c089bd5eaca0e152039e2\",\"createdAt\":\"2026-05-03T08:49:47.497Z\",\"updatedAt\":\"2026-05-03T08:49:48.000Z\",\"isDeleted\":0,\"version\":1,\"tags\":[],\"notes\":\"\",\"date\":\"2026-05-02T18:30:00.000Z\",\"type\":\"income\",\"amount\":3631.8800000000001091393642127513885498046875,\"categoryId\":\"cat_mopilywn_830g8ygnfr999o40\",\"accountId\":\"acc_moosa3qj_hj3adif2i3hpl7df\",\"toAccountId\":\"\",\"linkedCardId\":\"\",\"linkedLoanId\":\"\",\"linkedGoalId\":\"\",\"linkedUdhariId\":\"\",\"linkedSavingsId\":\"\",\"paymentMode\":\"upi\",\"merchantOrPerson\":\"credit \",\"description\":\"\",\"billAvailable\":0,\"gstApplicable\":0,\"taxFlag\":0,\"businessOrPersonal\":\"personal\",\"needWant\":\"unassigned\",\"fixedVariable\":\"unassigned\",\"plannedUnplanned\":\"unassigned\"}', '2026-05-03 03:19:48', NULL, '2026-05-03 08:49:48', 363188, 1, '2026-05-01 18:30:00', '2026-05', 'income', 'upi', 'cat_mopilywn_830g8ygnfr999o40', 'acc_moosa3qj_hj3adif2i3hpl7df', '', NULL, NULL, NULL, 'personal', NULL, 'b82ddb2ab95cc9bac2008ed3c6e5e58b1d78b98ff80fcb20f8c08e95e3a313fc'),
('row_b92dd9693dc251ccf7c5af47', 'cu_521c089bd5eaca0e152039e2', 'accounts', 'acc_monayukh_jqvbs7lct6tt5431', '{\"id\":\"acc_monayukh_jqvbs7lct6tt5431\",\"userId\":\"cu_521c089bd5eaca0e152039e2\",\"createdAt\":\"2026-05-01T19:25:30.304Z\",\"updatedAt\":\"2026-05-01T19:25:37.000Z\",\"isDeleted\":1,\"version\":2,\"tags\":[],\"notes\":\"\",\"name\":\"Kotak 811\",\"type\":\"savings\",\"institution\":\"Kotak 811\",\"openingBalance\":2722,\"color\":\"#ff0000\",\"icon\":\"wallet\",\"isInactive\":0}', '2026-05-01 13:55:37', '2026-05-01 13:55:37', '2026-05-01 19:25:35', NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
('row_baa98661413d845d6da45cc0', 'cu_521c089bd5eaca0e152039e2', 'transactions', 'txn_moqtz3kf_4ye8hra3du52i3y2', '{\"id\":\"txn_moqtz3kf_4ye8hra3du52i3y2\",\"userId\":\"cu_521c089bd5eaca0e152039e2\",\"createdAt\":\"2026-05-04T06:40:53.199Z\",\"updatedAt\":\"2026-05-04T06:41:36.000Z\",\"isDeleted\":1,\"version\":2,\"tags\":[],\"notes\":\"\",\"date\":\"2026-05-02T18:30:00.000Z\",\"type\":\"expense\",\"amount\":452,\"categoryId\":\"cat_mopi8v9k_qewycy5n6mvvax1o\",\"accountId\":\"acc_moosa3qj_hj3adif2i3hpl7df\",\"toAccountId\":\"\",\"linkedCardId\":\"\",\"linkedLoanId\":\"\",\"linkedGoalId\":\"\",\"linkedUdhariId\":\"\",\"linkedSavingsId\":\"\",\"paymentMode\":\"upi\",\"merchantOrPerson\":\"Zomato\",\"description\":\"\",\"billAvailable\":0,\"gstApplicable\":0,\"taxFlag\":0,\"businessOrPersonal\":\"personal\",\"needWant\":\"unassigned\",\"fixedVariable\":\"unassigned\",\"plannedUnplanned\":\"unassigned\"}', '2026-05-04 01:11:36', '2026-05-04 01:11:36', '2026-05-04 06:40:54', 45200, 1, '2026-05-01 18:30:00', '2026-05', 'expense', 'upi', 'cat_mopi8v9k_qewycy5n6mvvax1o', 'acc_moosa3qj_hj3adif2i3hpl7df', '', NULL, NULL, NULL, 'personal', NULL, '99dac6a9fc2213eeb10c32ee9cc0761efbe256a55bd37ec38202afe8e6bd79a3'),
('row_bafa572d1259fe502cbeb9ab', 'cu_85024323863151a04375d3e5', 'transactions', 'txn_moq59gvn_zkl7y387uumuh8i3', '{\"id\":\"txn_moq59gvn_zkl7y387uumuh8i3\",\"userId\":\"cu_85024323863151a04375d3e5\",\"createdAt\":\"2026-05-03T19:09:06.611Z\",\"updatedAt\":\"2026-05-03T19:09:10.000Z\",\"isDeleted\":0,\"version\":1,\"tags\":[],\"notes\":\"\",\"date\":\"2026-05-03T18:30:00.000Z\",\"type\":\"expense\",\"amount\":200,\"categoryId\":\"cat_moq4ts5z_p63wayuvtm9syj9v\",\"accountId\":\"acc_moopckwl_uoxw3nmnyvq8j4uh\",\"toAccountId\":\"\",\"linkedCardId\":\"\",\"linkedLoanId\":\"\",\"linkedGoalId\":\"\",\"linkedUdhariId\":\"\",\"linkedSavingsId\":\"\",\"paymentMode\":\"upi\",\"merchantOrPerson\":\"Coffee\",\"description\":\"\",\"billAvailable\":0,\"gstApplicable\":0,\"taxFlag\":0,\"businessOrPersonal\":\"personal\",\"needWant\":\"unassigned\",\"fixedVariable\":\"unassigned\",\"plannedUnplanned\":\"unassigned\"}', '2026-05-03 13:39:10', NULL, '2026-05-03 19:09:10', 20000, 1, '2026-05-02 18:30:00', '2026-05', 'expense', 'upi', 'cat_moq4ts5z_p63wayuvtm9syj9v', 'acc_moopckwl_uoxw3nmnyvq8j4uh', '', NULL, NULL, NULL, 'personal', NULL, '22d0336877af01deebf08987ef86c5169438cecb5d7939df4a3657a511174337'),
('row_bcce2bdf0871336cb4b50b57', 'cu_521c089bd5eaca0e152039e2', 'transactions', 'txn_mou8m77c_cm63e9ocwj8ryr2w', '{\"id\":\"txn_mou8m77c_cm63e9ocwj8ryr2w\",\"userId\":\"cu_521c089bd5eaca0e152039e2\",\"createdAt\":\"2026-05-06T15:54:04.152Z\",\"updatedAt\":\"2026-05-06T15:54:06.000Z\",\"isDeleted\":0,\"version\":1,\"tags\":[],\"notes\":\"\",\"date\":\"2026-05-05T18:30:00.000Z\",\"type\":\"expense\",\"amount\":181,\"categoryId\":\"cat_mopi9uy8_8w5oxe3jdfaczkel\",\"accountId\":\"acc_moosa3qj_hj3adif2i3hpl7df\",\"toAccountId\":\"\",\"linkedCardId\":\"\",\"linkedLoanId\":\"\",\"linkedGoalId\":\"\",\"linkedUdhariId\":\"\",\"linkedSavingsId\":\"\",\"paymentMode\":\"upi\",\"merchantOrPerson\":\"Cover\",\"description\":\"\",\"billAvailable\":0,\"gstApplicable\":0,\"taxFlag\":0,\"businessOrPersonal\":\"personal\",\"needWant\":\"unassigned\",\"fixedVariable\":\"unassigned\",\"plannedUnplanned\":\"unassigned\"}', '2026-05-06 10:24:06', NULL, '2026-05-06 15:54:06', 18100, 1, '2026-05-04 18:30:00', '2026-05', 'expense', 'upi', 'cat_mopi9uy8_8w5oxe3jdfaczkel', 'acc_moosa3qj_hj3adif2i3hpl7df', '', NULL, NULL, NULL, 'personal', NULL, 'f0b722369f7fa77e4ca3e446a6b568391925a79382dba1d28cf0b68b3df9b49e'),
('row_bd2517b04d8d8a7f76d794d6', 'cu_521c089bd5eaca0e152039e2', 'transactions', 'txn_mou8q6um_1ei201n8hv5kju68', '{\"id\":\"txn_mou8q6um_1ei201n8hv5kju68\",\"userId\":\"cu_521c089bd5eaca0e152039e2\",\"createdAt\":\"2026-05-06T15:57:10.318Z\",\"updatedAt\":\"2026-05-06T15:57:14.000Z\",\"isDeleted\":0,\"version\":1,\"tags\":[],\"notes\":\"\",\"date\":\"2026-05-02T18:30:00.000Z\",\"type\":\"income\",\"amount\":99.4599999999999937472239253111183643341064453125,\"categoryId\":\"cat_mopib8y5_10572l4ihz0iumhz\",\"accountId\":\"acc_moosa3qj_hj3adif2i3hpl7df\",\"toAccountId\":\"\",\"linkedCardId\":\"\",\"linkedLoanId\":\"\",\"linkedGoalId\":\"\",\"linkedUdhariId\":\"\",\"linkedSavingsId\":\"\",\"paymentMode\":\"bank_transfer\",\"merchantOrPerson\":\"Visa Refund\",\"description\":\"\",\"billAvailable\":0,\"gstApplicable\":0,\"taxFlag\":0,\"businessOrPersonal\":\"personal\",\"needWant\":\"unassigned\",\"fixedVariable\":\"unassigned\",\"plannedUnplanned\":\"unassigned\"}', '2026-05-06 10:27:14', NULL, '2026-05-06 15:57:14', 9946, 1, '2026-05-01 18:30:00', '2026-05', 'income', 'bank_transfer', 'cat_mopib8y5_10572l4ihz0iumhz', 'acc_moosa3qj_hj3adif2i3hpl7df', '', NULL, NULL, NULL, 'personal', NULL, 'cbce1f3cd7d3fabf729aefc184f32c1567353f933fc53710df967099aa2a38e0'),
('row_bdcc69fa031a9177d9b9b95c', 'cu_521c089bd5eaca0e152039e2', 'categories', 'cat_mopi8up6_leajvgjlgloivn96', '{\"id\":\"cat_mopi8up6_leajvgjlgloivn96\",\"userId\":\"cu_521c089bd5eaca0e152039e2\",\"createdAt\":\"2026-05-03T08:24:46.698Z\",\"updatedAt\":\"2026-05-03T08:25:49.000Z\",\"isDeleted\":1,\"version\":2,\"tags\":[],\"notes\":\"\",\"name\":\"Home \",\"appliesTo\":\"expense\",\"icon\":\"\\ud83c\\udfe0\",\"color\":\"#0ea5e9\",\"budgetable\":1,\"taxRelevant\":0,\"gstRelevant\":0,\"parentId\":null,\"sortOrder\":999,\"archived\":0}', '2026-05-03 02:55:49', '2026-05-03 02:55:49', '2026-05-03 08:24:48', NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
('row_beb89258df301976bed639ba', 'cu_521c089bd5eaca0e152039e2', 'transactions', 'txn_movykke5_zvavkmd976dbhpsh', '{\"id\":\"txn_movykke5_zvavkmd976dbhpsh\",\"userId\":\"cu_521c089bd5eaca0e152039e2\",\"createdAt\":\"2026-05-07T20:48:24.125Z\",\"updatedAt\":\"2026-05-07T20:48:24.000Z\",\"isDeleted\":0,\"version\":1,\"tags\":[],\"notes\":\"\",\"date\":\"2026-05-06T18:30:00.000Z\",\"type\":\"income\",\"amount\":20000,\"categoryId\":\"cat_mopib3r5_ldtrmna3rfck1u7e\",\"accountId\":\"acc_moosa3qj_hj3adif2i3hpl7df\",\"toAccountId\":\"\",\"linkedCardId\":\"\",\"linkedLoanId\":\"\",\"linkedGoalId\":\"\",\"linkedUdhariId\":\"\",\"linkedSavingsId\":\"\",\"paymentMode\":\"bank_transfer\",\"merchantOrPerson\":\"LD Finmave\",\"description\":\"\",\"billAvailable\":0,\"gstApplicable\":0,\"taxFlag\":0,\"businessOrPersonal\":\"personal\",\"needWant\":\"unassigned\",\"fixedVariable\":\"unassigned\",\"plannedUnplanned\":\"unassigned\"}', '2026-05-07 15:18:24', NULL, '2026-05-07 20:48:24', 2000000, 1, '2026-05-05 18:30:00', '2026-05', 'income', 'bank_transfer', 'cat_mopib3r5_ldtrmna3rfck1u7e', 'acc_moosa3qj_hj3adif2i3hpl7df', '', NULL, NULL, NULL, 'personal', NULL, '06d088cee863c0448768ae5acc484ab261e61041991c872449d50a092324d92d'),
('row_bf02b24676e55b7103dea47a', 'cu_85024323863151a04375d3e5', 'transactions', 'txn_moq6e4lq_vv0h20fkh1ks54ql', '{\"id\":\"txn_moq6e4lq_vv0h20fkh1ks54ql\",\"userId\":\"cu_85024323863151a04375d3e5\",\"createdAt\":\"2026-05-03T19:40:43.598Z\",\"updatedAt\":\"2026-05-03T19:40:47.000Z\",\"isDeleted\":0,\"version\":1,\"tags\":[],\"notes\":\"\",\"date\":\"2026-05-03T18:30:00.000Z\",\"type\":\"income\",\"amount\":70,\"categoryId\":\"\",\"accountId\":\"acc_moopckwl_uoxw3nmnyvq8j4uh\",\"toAccountId\":\"\",\"linkedCardId\":\"\",\"linkedLoanId\":\"\",\"linkedGoalId\":\"\",\"linkedUdhariId\":\"\",\"linkedSavingsId\":\"\",\"paymentMode\":\"auto_debit\",\"merchantOrPerson\":\"Saving\",\"description\":\"\",\"billAvailable\":0,\"gstApplicable\":0,\"taxFlag\":0,\"businessOrPersonal\":\"personal\",\"needWant\":\"unassigned\",\"fixedVariable\":\"unassigned\",\"plannedUnplanned\":\"unassigned\"}', '2026-05-03 14:10:47', NULL, '2026-05-03 19:40:47', 7000, 1, '2026-05-02 18:30:00', '2026-05', 'income', 'auto_debit', '', 'acc_moopckwl_uoxw3nmnyvq8j4uh', '', NULL, NULL, NULL, 'personal', NULL, 'b9af321b6475a3452ecfec55dd8b38d7c9290c57fda15fa6f820e5d3426db91d'),
('row_c02ccc5a4bd30bac46099e1b', 'cu_521c089bd5eaca0e152039e2', 'transactions', 'txn_moyihbmp_b9d01cn11ov1983y', '{\"id\":\"txn_moyihbmp_b9d01cn11ov1983y\",\"userId\":\"cu_521c089bd5eaca0e152039e2\",\"createdAt\":\"2026-05-09T15:41:17.473Z\",\"updatedAt\":\"2026-05-09T15:41:18.000Z\",\"isDeleted\":0,\"version\":1,\"tags\":[],\"notes\":\"\",\"date\":\"2026-05-08T18:30:00.000Z\",\"type\":\"expense\",\"amount\":1217,\"categoryId\":\"cat_mopd695a_dkhmbr7h0lgnqhnl\",\"accountId\":\"acc_moosa3qj_hj3adif2i3hpl7df\",\"toAccountId\":\"\",\"linkedCardId\":\"\",\"linkedLoanId\":\"\",\"linkedGoalId\":\"\",\"linkedUdhariId\":\"\",\"linkedSavingsId\":\"\",\"paymentMode\":\"credit_card\",\"merchantOrPerson\":\"Pizza\",\"description\":\"\",\"billAvailable\":0,\"gstApplicable\":0,\"taxFlag\":0,\"businessOrPersonal\":\"personal\",\"needWant\":\"unassigned\",\"fixedVariable\":\"unassigned\",\"plannedUnplanned\":\"unassigned\"}', '2026-05-09 10:11:18', NULL, '2026-05-09 15:41:18', 121700, 1, '2026-05-07 18:30:00', '2026-05', 'expense', 'credit_card', 'cat_mopd695a_dkhmbr7h0lgnqhnl', 'acc_moosa3qj_hj3adif2i3hpl7df', '', NULL, NULL, NULL, 'personal', NULL, 'b77df7443480083fefdb247268fe3955551abe3ade593435fec9f74880eca113'),
('row_c0be7fd062d5b2af4490ac4b', 'cu_521c089bd5eaca0e152039e2', 'transactions', 'txn_mopig8pm_0up60nlxsfv7owyj', '{\"id\":\"txn_mopig8pm_0up60nlxsfv7owyj\",\"userId\":\"cu_521c089bd5eaca0e152039e2\",\"createdAt\":\"2026-05-03T08:30:31.450Z\",\"updatedAt\":\"2026-05-03T08:30:32.000Z\",\"isDeleted\":0,\"version\":1,\"tags\":[],\"notes\":\"\",\"date\":\"2026-05-02T18:30:00.000Z\",\"type\":\"expense\",\"amount\":130,\"categoryId\":\"cat_mopi9uy8_8w5oxe3jdfaczkel\",\"accountId\":\"acc_moosa3qj_hj3adif2i3hpl7df\",\"toAccountId\":\"\",\"linkedCardId\":\"\",\"linkedLoanId\":\"\",\"linkedGoalId\":\"\",\"linkedUdhariId\":\"\",\"linkedSavingsId\":\"\",\"paymentMode\":\"upi\",\"merchantOrPerson\":\"15 plus Tuffen\",\"description\":\"\",\"billAvailable\":0,\"gstApplicable\":0,\"taxFlag\":0,\"businessOrPersonal\":\"personal\",\"needWant\":\"unassigned\",\"fixedVariable\":\"unassigned\",\"plannedUnplanned\":\"unassigned\"}', '2026-05-03 03:00:32', NULL, '2026-05-03 08:30:32', 13000, 1, '2026-05-01 18:30:00', '2026-05', 'expense', 'upi', 'cat_mopi9uy8_8w5oxe3jdfaczkel', 'acc_moosa3qj_hj3adif2i3hpl7df', '', NULL, NULL, NULL, 'personal', NULL, '0c48b5df05627e28056d26d071e30ced260ff7d70f99c8be5f3bcb18e5efe5d8'),
('row_c2ce5f25c3c6d2793c4ba137', 'cu_521c089bd5eaca0e152039e2', 'transactions', 'txn_mou8msne_1yjfib5ig7aic6oc', '{\"id\":\"txn_mou8msne_1yjfib5ig7aic6oc\",\"userId\":\"cu_521c089bd5eaca0e152039e2\",\"createdAt\":\"2026-05-06T15:54:31.946Z\",\"updatedAt\":\"2026-05-06T15:54:35.000Z\",\"isDeleted\":0,\"version\":1,\"tags\":[],\"notes\":\"\",\"date\":\"2026-05-05T18:30:00.000Z\",\"type\":\"expense\",\"amount\":403.990000000000009094947017729282379150390625,\"categoryId\":\"cat_mopd5p4h_e0h3t1a65h8aa8ko\",\"accountId\":\"acc_moosa3qj_hj3adif2i3hpl7df\",\"toAccountId\":\"\",\"linkedCardId\":\"\",\"linkedLoanId\":\"\",\"linkedGoalId\":\"\",\"linkedUdhariId\":\"\",\"linkedSavingsId\":\"\",\"paymentMode\":\"bank_transfer\",\"merchantOrPerson\":\"Credit bill\",\"description\":\"\",\"billAvailable\":0,\"gstApplicable\":0,\"taxFlag\":0,\"businessOrPersonal\":\"personal\",\"needWant\":\"unassigned\",\"fixedVariable\":\"unassigned\",\"plannedUnplanned\":\"unassigned\"}', '2026-05-06 10:24:35', NULL, '2026-05-06 15:54:35', 40399, 1, '2026-05-04 18:30:00', '2026-05', 'expense', 'bank_transfer', 'cat_mopd5p4h_e0h3t1a65h8aa8ko', 'acc_moosa3qj_hj3adif2i3hpl7df', '', NULL, NULL, NULL, 'personal', NULL, '2c91184038e6ff60aed4fb5f3063accea587228f0cc41e203a03af8a45622f74'),
('row_c36fbac95a98ee5d55d42a58', 'cu_521c089bd5eaca0e152039e2', 'categories', 'cat_mopi9lsr_8ej52rtx0u3hm79s', '{\"id\":\"cat_mopi9lsr_8ej52rtx0u3hm79s\",\"userId\":\"cu_521c089bd5eaca0e152039e2\",\"createdAt\":\"2026-05-03T08:25:21.819Z\",\"updatedAt\":\"2026-05-03T08:25:46.000Z\",\"isDeleted\":1,\"version\":2,\"tags\":[],\"notes\":\"\",\"name\":\"Stationary\",\"appliesTo\":\"expense\",\"icon\":\"\\ud83d\\udd25\",\"color\":\"#0ea5e9\",\"budgetable\":1,\"taxRelevant\":0,\"gstRelevant\":0,\"parentId\":null,\"sortOrder\":999,\"archived\":0}', '2026-05-03 02:55:46', '2026-05-03 02:55:46', '2026-05-03 08:25:22', NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
('row_c805bcf1da6dad354fe067cc', 'cu_521c089bd5eaca0e152039e2', 'transactions', 'txn_mopihjya_ntuprxgjfp0zzuoi', '{\"id\":\"txn_mopihjya_ntuprxgjfp0zzuoi\",\"userId\":\"cu_521c089bd5eaca0e152039e2\",\"createdAt\":\"2026-05-03T08:31:32.674Z\",\"updatedAt\":\"2026-05-07T06:23:02.000Z\",\"isDeleted\":0,\"version\":2,\"tags\":[],\"notes\":\"\",\"date\":\"2026-05-01T18:30:00.000Z\",\"type\":\"expense\",\"amount\":3047.59999999999990905052982270717620849609375,\"categoryId\":\"cat_mopialsj_qat4q8h3ta2uich8\",\"accountId\":\"acc_moosa3qj_hj3adif2i3hpl7df\",\"toAccountId\":\"\",\"linkedCardId\":\"\",\"linkedLoanId\":\"\",\"linkedGoalId\":\"\",\"linkedUdhariId\":\"\",\"linkedSavingsId\":\"\",\"paymentMode\":\"upi\",\"merchantOrPerson\":\"D Mart\",\"description\":\"\",\"billAvailable\":0,\"gstApplicable\":0,\"taxFlag\":0,\"businessOrPersonal\":\"personal\",\"needWant\":\"unassigned\",\"fixedVariable\":\"unassigned\",\"plannedUnplanned\":\"unassigned\"}', '2026-05-07 00:53:02', NULL, '2026-05-03 08:31:33', 304760, 1, '2026-04-30 18:30:00', '2026-05', 'expense', 'upi', 'cat_mopialsj_qat4q8h3ta2uich8', 'acc_moosa3qj_hj3adif2i3hpl7df', '', NULL, NULL, NULL, 'personal', NULL, '57571ba98488541cc639010cf4659de898155fc9a127cf511f6cd87f2ade8648'),
('row_cda09f22a7f9763478cd320a', 'cu_85024323863151a04375d3e5', 'transactions', 'txn_mp5gaptk_ipj1zcidz905ox49', '{\"id\":\"txn_mp5gaptk_ipj1zcidz905ox49\",\"userId\":\"cu_85024323863151a04375d3e5\",\"createdAt\":\"2026-05-14T12:14:33.272Z\",\"updatedAt\":\"2026-05-14T12:14:33.000Z\",\"isDeleted\":0,\"version\":1,\"tags\":[],\"notes\":\"\",\"date\":\"2026-05-13T18:30:00.000Z\",\"type\":\"expense\",\"amount\":254,\"categoryId\":\"cat_moq4ts5z_p63wayuvtm9syj9v\",\"accountId\":\"acc_moopckwl_uoxw3nmnyvq8j4uh\",\"toAccountId\":\"\",\"linkedCardId\":\"\",\"linkedLoanId\":\"\",\"linkedGoalId\":\"\",\"linkedUdhariId\":\"\",\"linkedSavingsId\":\"\",\"paymentMode\":\"upi\",\"merchantOrPerson\":\"Cofee\",\"description\":\"\",\"billAvailable\":0,\"gstApplicable\":0,\"taxFlag\":0,\"businessOrPersonal\":\"personal\",\"needWant\":\"unassigned\",\"fixedVariable\":\"unassigned\",\"plannedUnplanned\":\"unassigned\"}', '2026-05-14 06:44:33', NULL, '2026-05-14 12:14:33', 25400, 1, '2026-05-12 18:30:00', '2026-05', 'expense', 'upi', 'cat_moq4ts5z_p63wayuvtm9syj9v', 'acc_moopckwl_uoxw3nmnyvq8j4uh', '', NULL, NULL, NULL, 'personal', NULL, '322d182b6e68c0a3b2734ae8cf12048751b4acf761f1694ef3d584c1bd19911e'),
('row_cdfe61b088c2ba308f9ab427', 'cu_521c089bd5eaca0e152039e2', 'transactions', 'txn_mopw4ayr_7ojtto34byie6idr', '{\"id\":\"txn_mopw4ayr_7ojtto34byie6idr\",\"userId\":\"cu_521c089bd5eaca0e152039e2\",\"createdAt\":\"2026-05-03T14:53:09.123Z\",\"updatedAt\":\"2026-05-03T17:26:18.000Z\",\"isDeleted\":1,\"version\":2,\"tags\":[],\"notes\":\"\",\"date\":\"2026-05-13T18:30:00.000Z\",\"type\":\"income\",\"amount\":27000,\"categoryId\":\"cat_mopib8y5_10572l4ihz0iumhz\",\"accountId\":\"acc_moosa3qj_hj3adif2i3hpl7df\",\"toAccountId\":\"\",\"linkedCardId\":\"\",\"linkedLoanId\":\"\",\"linkedGoalId\":\"\",\"linkedUdhariId\":\"\",\"linkedSavingsId\":\"\",\"paymentMode\":\"bank_transfer\",\"merchantOrPerson\":\"Findlocall\",\"description\":\"\",\"billAvailable\":0,\"gstApplicable\":0,\"taxFlag\":0,\"businessOrPersonal\":\"personal\",\"needWant\":\"unassigned\",\"fixedVariable\":\"unassigned\",\"plannedUnplanned\":\"unassigned\"}', '2026-05-03 11:56:18', '2026-05-03 11:56:18', '2026-05-03 14:53:12', 2700000, 1, '2026-05-12 18:30:00', '2026-05', 'income', 'bank_transfer', 'cat_mopib8y5_10572l4ihz0iumhz', 'acc_moosa3qj_hj3adif2i3hpl7df', '', NULL, NULL, NULL, 'personal', NULL, 'f319446390e085eb3ba6f9d2ad62e1cf71f16dc347298b8dfa94a3f31f274404'),
('row_d2fcc0c85d89a39164514fb9', 'cu_521c089bd5eaca0e152039e2', 'categories', 'cat_mopi9l71_up6us90eminu4zh9', '{\"id\":\"cat_mopi9l71_up6us90eminu4zh9\",\"userId\":\"cu_521c089bd5eaca0e152039e2\",\"createdAt\":\"2026-05-03T08:25:21.037Z\",\"updatedAt\":\"2026-05-03T08:25:22.000Z\",\"isDeleted\":0,\"version\":1,\"tags\":[],\"notes\":\"\",\"name\":\"Stationary\",\"appliesTo\":\"expense\",\"icon\":\"\\ud83d\\udd25\",\"color\":\"#0ea5e9\",\"budgetable\":1,\"taxRelevant\":0,\"gstRelevant\":0,\"parentId\":null,\"sortOrder\":999,\"archived\":0}', '2026-05-03 02:55:22', NULL, '2026-05-03 08:25:22', NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
('row_d30b2fda793abbcfd500e14d', 'cu_85024323863151a04375d3e5', 'transactions', 'txn_moopam50_2n8cb3m515c6fsdv', '{\"id\":\"txn_moopam50_2n8cb3m515c6fsdv\",\"userId\":\"cu_85024323863151a04375d3e5\",\"createdAt\":\"2026-05-02T18:54:20.052Z\",\"updatedAt\":\"2026-05-02T19:01:17.000Z\",\"isDeleted\":1,\"version\":2,\"tags\":[],\"notes\":\"\",\"date\":\"2026-05-02T18:30:00.000Z\",\"type\":\"income\",\"amount\":20634,\"categoryId\":\"\",\"accountId\":\"\",\"toAccountId\":\"\",\"linkedCardId\":\"\",\"linkedLoanId\":\"\",\"linkedGoalId\":\"\",\"linkedUdhariId\":\"\",\"linkedSavingsId\":\"\",\"paymentMode\":\"upi\",\"merchantOrPerson\":\"\",\"description\":\"\",\"billAvailable\":0,\"gstApplicable\":0,\"taxFlag\":0,\"businessOrPersonal\":\"personal\",\"needWant\":\"unassigned\",\"fixedVariable\":\"unassigned\",\"plannedUnplanned\":\"unassigned\"}', '2026-05-02 13:31:17', '2026-05-02 13:31:17', '2026-05-02 18:54:22', 2063400, 1, '2026-05-01 18:30:00', '2026-05', 'income', 'upi', '', '', '', NULL, NULL, NULL, 'personal', NULL, '97a7e1b16ac490b2ed85cd4af2cef0ce2f936d820be0a9bf58d95a4bc13f8640'),
('row_d377a5e6575f84b7c539380a', 'cu_85024323863151a04375d3e5', 'transactions', 'txn_mov9jgp1_czy2cipn7scxk6fp', '{\"id\":\"txn_mov9jgp1_czy2cipn7scxk6fp\",\"userId\":\"cu_85024323863151a04375d3e5\",\"createdAt\":\"2026-05-07T09:07:42.277Z\",\"updatedAt\":\"2026-05-07T09:08:42.000Z\",\"isDeleted\":0,\"version\":3,\"tags\":[],\"notes\":\"\",\"date\":\"2026-05-04T18:30:00.000Z\",\"type\":\"expense\",\"amount\":499,\"categoryId\":\"cat_moq4uob6_c70ylxm8h68u17x1\",\"accountId\":\"acc_moopbws1_c65oqcylv9tpac90\",\"toAccountId\":\"\",\"linkedCardId\":\"\",\"linkedLoanId\":\"\",\"linkedGoalId\":\"\",\"linkedUdhariId\":\"\",\"linkedSavingsId\":\"\",\"paymentMode\":\"upi\",\"merchantOrPerson\":\"Adobe cloud\",\"description\":\"\",\"billAvailable\":0,\"gstApplicable\":0,\"taxFlag\":0,\"businessOrPersonal\":\"personal\",\"needWant\":\"unassigned\",\"fixedVariable\":\"unassigned\",\"plannedUnplanned\":\"unassigned\"}', '2026-05-07 03:38:42', NULL, '2026-05-07 09:07:43', 49900, 1, '2026-05-03 18:30:00', '2026-05', 'expense', 'upi', 'cat_moq4uob6_c70ylxm8h68u17x1', 'acc_moopbws1_c65oqcylv9tpac90', '', NULL, NULL, NULL, 'personal', NULL, '289b4e012bf083b95c191dbb11aa9971a03685fb0e58d9609d0af33f97892671'),
('row_d3ef2549bc9b09e61e306ec9', 'cu_521c089bd5eaca0e152039e2', 'transactions', 'txn_mov3mtcv_1s0994u8h6pjrsyl', '{\"id\":\"txn_mov3mtcv_1s0994u8h6pjrsyl\",\"userId\":\"cu_521c089bd5eaca0e152039e2\",\"createdAt\":\"2026-05-07T06:22:20.959Z\",\"updatedAt\":\"2026-05-07T06:22:25.000Z\",\"isDeleted\":0,\"version\":1,\"tags\":[],\"notes\":\"\",\"date\":\"2026-05-06T18:30:00.000Z\",\"type\":\"income\",\"amount\":160,\"categoryId\":\"cat_mopilywn_830g8ygnfr999o40\",\"accountId\":\"acc_moosa3qj_hj3adif2i3hpl7df\",\"toAccountId\":\"\",\"linkedCardId\":\"\",\"linkedLoanId\":\"\",\"linkedGoalId\":\"\",\"linkedUdhariId\":\"\",\"linkedSavingsId\":\"\",\"paymentMode\":\"upi\",\"merchantOrPerson\":\"Zomato Refund\",\"description\":\"\",\"billAvailable\":0,\"gstApplicable\":0,\"taxFlag\":0,\"businessOrPersonal\":\"personal\",\"needWant\":\"unassigned\",\"fixedVariable\":\"unassigned\",\"plannedUnplanned\":\"unassigned\"}', '2026-05-07 00:52:25', NULL, '2026-05-07 06:22:25', 16000, 1, '2026-05-05 18:30:00', '2026-05', 'income', 'upi', 'cat_mopilywn_830g8ygnfr999o40', 'acc_moosa3qj_hj3adif2i3hpl7df', '', NULL, NULL, NULL, 'personal', NULL, '01bc04f0f71d61b3d705f72feb7d629b5e84879f7f36a1cfc261112d78206efd'),
('row_d41ffcc91c1351630e343122', 'cu_85024323863151a04375d3e5', 'categories', 'cat_moq56wzs_ve1hwy5gc4wlop0g', '{\"id\":\"cat_moq56wzs_ve1hwy5gc4wlop0g\",\"userId\":\"cu_85024323863151a04375d3e5\",\"createdAt\":\"2026-05-03T19:07:07.528Z\",\"updatedAt\":\"2026-05-03T19:07:17.000Z\",\"isDeleted\":1,\"version\":2,\"tags\":[],\"notes\":\"\",\"name\":\"Shopping\",\"appliesTo\":\"expense\",\"icon\":\"\\ud83d\\uded2\",\"color\":\"#0ea5e9\",\"budgetable\":1,\"taxRelevant\":0,\"gstRelevant\":0,\"parentId\":null,\"sortOrder\":999,\"archived\":0}', '2026-05-03 13:37:17', '2026-05-03 13:37:17', '2026-05-03 19:07:11', NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
('row_d445006d7301a8c31a75d0ce', 'cu_85024323863151a04375d3e5', 'transactions', 'txn_moy6vin0_nmow849da17isbqf', '{\"id\":\"txn_moy6vin0_nmow849da17isbqf\",\"userId\":\"cu_85024323863151a04375d3e5\",\"createdAt\":\"2026-05-09T10:16:24.348Z\",\"updatedAt\":\"2026-05-09T10:16:25.000Z\",\"isDeleted\":0,\"version\":1,\"tags\":[],\"notes\":\"\",\"date\":\"2026-05-08T18:30:00.000Z\",\"type\":\"expense\",\"amount\":608,\"categoryId\":\"\",\"accountId\":\"acc_moopckwl_uoxw3nmnyvq8j4uh\",\"toAccountId\":\"\",\"linkedCardId\":\"\",\"linkedLoanId\":\"\",\"linkedGoalId\":\"\",\"linkedUdhariId\":\"\",\"linkedSavingsId\":\"\",\"paymentMode\":\"upi\",\"merchantOrPerson\":\"PIZZA\",\"description\":\"\",\"billAvailable\":0,\"gstApplicable\":0,\"taxFlag\":0,\"businessOrPersonal\":\"personal\",\"needWant\":\"unassigned\",\"fixedVariable\":\"unassigned\",\"plannedUnplanned\":\"unassigned\"}', '2026-05-09 04:46:25', NULL, '2026-05-09 10:16:25', 60800, 1, '2026-05-07 18:30:00', '2026-05', 'expense', 'upi', '', 'acc_moopckwl_uoxw3nmnyvq8j4uh', '', NULL, NULL, NULL, 'personal', NULL, '8520b371b77b64bb34ef5e1d0355e74ab35574b602c1cd37f11995c8af3458b4'),
('row_d4a6615779a3b9b232d848ad', 'cu_85024323863151a04375d3e5', 'transactions', 'txn_moopku5x_gegvxpkcqym4d21r', '{\"id\":\"txn_moopku5x_gegvxpkcqym4d21r\",\"userId\":\"cu_85024323863151a04375d3e5\",\"createdAt\":\"2026-05-02T19:02:17.013Z\",\"updatedAt\":\"2026-05-02T19:02:20.000Z\",\"isDeleted\":0,\"version\":1,\"tags\":[],\"notes\":\"\",\"date\":\"2026-05-02T18:30:00.000Z\",\"type\":\"income\",\"amount\":20634,\"categoryId\":\"\",\"accountId\":\"acc_moopbws1_c65oqcylv9tpac90\",\"toAccountId\":\"\",\"linkedCardId\":\"\",\"linkedLoanId\":\"\",\"linkedGoalId\":\"\",\"linkedUdhariId\":\"\",\"linkedSavingsId\":\"\",\"paymentMode\":\"bank_transfer\",\"merchantOrPerson\":\"Office beacon salary\",\"description\":\"Salary credited\",\"billAvailable\":0,\"gstApplicable\":0,\"taxFlag\":0,\"businessOrPersonal\":\"personal\",\"needWant\":\"unassigned\",\"fixedVariable\":\"unassigned\",\"plannedUnplanned\":\"unassigned\"}', '2026-05-02 13:32:20', NULL, '2026-05-02 19:02:20', 2063400, 1, '2026-05-01 18:30:00', '2026-05', 'income', 'bank_transfer', '', 'acc_moopbws1_c65oqcylv9tpac90', '', NULL, NULL, NULL, 'personal', NULL, '878e302a665decf13bd7a3211cd80c270fb34dafe6eb2c568e3c94d05a38c89e'),
('row_d7626353c56c66cfea6a99a9', 'cu_521c089bd5eaca0e152039e2', 'categories', 'cat_mopd7ktb_zivc0a07p77hjh5h', '{\"id\":\"cat_mopd7ktb_zivc0a07p77hjh5h\",\"userId\":\"cu_521c089bd5eaca0e152039e2\",\"createdAt\":\"2026-05-03T06:03:49.151Z\",\"updatedAt\":\"2026-05-03T08:24:33.000Z\",\"isDeleted\":1,\"version\":2,\"tags\":[],\"notes\":\"\",\"name\":\"BlinkIT\",\"appliesTo\":\"expense\",\"icon\":\"\\ud83d\\uded2\",\"color\":\"#0ea5e9\",\"budgetable\":1,\"taxRelevant\":0,\"gstRelevant\":0,\"parentId\":null,\"sortOrder\":999,\"archived\":0}', '2026-05-03 02:54:33', '2026-05-03 02:54:33', '2026-05-03 06:03:55', NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
('row_d7f6d31032c447f35a284690', 'cu_85024323863151a04375d3e5', 'transactions', 'txn_moq4s9rl_2wv2ti8izim332d3', '{\"id\":\"txn_moq4s9rl_2wv2ti8izim332d3\",\"userId\":\"cu_85024323863151a04375d3e5\",\"createdAt\":\"2026-05-03T18:55:44.240Z\",\"updatedAt\":\"2026-05-03T18:55:47.000Z\",\"isDeleted\":0,\"version\":1,\"tags\":[],\"notes\":\"\",\"date\":\"2026-05-03T18:30:00.000Z\",\"type\":\"income\",\"amount\":4000,\"categoryId\":\"\",\"accountId\":\"acc_moopckwl_uoxw3nmnyvq8j4uh\",\"toAccountId\":\"\",\"linkedCardId\":\"\",\"linkedLoanId\":\"\",\"linkedGoalId\":\"\",\"linkedUdhariId\":\"\",\"linkedSavingsId\":\"\",\"paymentMode\":\"bank_transfer\",\"merchantOrPerson\":\"my self\",\"description\":\"\",\"billAvailable\":0,\"gstApplicable\":0,\"taxFlag\":0,\"businessOrPersonal\":\"personal\",\"needWant\":\"unassigned\",\"fixedVariable\":\"unassigned\",\"plannedUnplanned\":\"unassigned\"}', '2026-05-03 13:25:47', NULL, '2026-05-03 18:55:47', 400000, 1, '2026-05-02 18:30:00', '2026-05', 'income', 'bank_transfer', '', 'acc_moopckwl_uoxw3nmnyvq8j4uh', '', NULL, NULL, NULL, 'personal', NULL, 'cf6496f1293f915dc0ecc3dd6ab0bfa7b735e3b984fad7c48ed6ad7a29a87191'),
('row_db757302186a4f79ec06e017', 'cu_85024323863151a04375d3e5', 'transactions', 'txn_mp12017e_1r8kb5hwq937cb24', '{\"id\":\"txn_mp12017e_1r8kb5hwq937cb24\",\"userId\":\"cu_85024323863151a04375d3e5\",\"createdAt\":\"2026-05-11T10:23:15.482Z\",\"updatedAt\":\"2026-05-11T10:23:17.000Z\",\"isDeleted\":0,\"version\":1,\"tags\":[],\"notes\":\"\",\"date\":\"2026-05-10T18:30:00.000Z\",\"type\":\"expense\",\"amount\":140,\"categoryId\":\"cat_moq4vw8q_6b099gvhyea1hggw\",\"accountId\":\"acc_moopckwl_uoxw3nmnyvq8j4uh\",\"toAccountId\":\"\",\"linkedCardId\":\"\",\"linkedLoanId\":\"\",\"linkedGoalId\":\"\",\"linkedUdhariId\":\"\",\"linkedSavingsId\":\"\",\"paymentMode\":\"upi\",\"merchantOrPerson\":\"Dabli\",\"description\":\"\",\"billAvailable\":0,\"gstApplicable\":0,\"taxFlag\":0,\"businessOrPersonal\":\"personal\",\"needWant\":\"unassigned\",\"fixedVariable\":\"unassigned\",\"plannedUnplanned\":\"unassigned\"}', '2026-05-11 04:53:17', NULL, '2026-05-11 10:23:17', 14000, 1, '2026-05-09 18:30:00', '2026-05', 'expense', 'upi', 'cat_moq4vw8q_6b099gvhyea1hggw', 'acc_moopckwl_uoxw3nmnyvq8j4uh', '', NULL, NULL, NULL, 'personal', NULL, '818a137b5bfaba3968ae1297309d903404b83affc4bb813762e44e22b824dcf9'),
('row_dc9737af15bf9a5997b79f24', 'cu_521c089bd5eaca0e152039e2', 'goals', 'gol_mopipf93_r7ex7qdp479i6zyz', '{\"id\":\"gol_mopipf93_r7ex7qdp479i6zyz\",\"userId\":\"cu_521c089bd5eaca0e152039e2\",\"createdAt\":\"2026-05-03T08:37:39.831Z\",\"updatedAt\":\"2026-05-03T08:37:41.000Z\",\"isDeleted\":0,\"version\":1,\"tags\":[],\"notes\":\"\",\"title\":\"I phone 17 Pro Max\",\"goalType\":\"phone\",\"targetAmount\":100000,\"targetDate\":\"2027-10-24T18:30:00.000Z\",\"currentSaved\":0,\"priority\":5,\"autoContributionEnabled\":false,\"autoContributionAmount\":0,\"autoContributionDay\":1,\"icon\":\"\\ud83c\\udfaf\",\"color\":\"#8b5cf6\",\"status\":\"active\",\"startedAt\":\"2026-05-03T08:37:39.831Z\"}', '2026-05-03 03:07:41', NULL, '2026-05-03 08:37:41', NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
('row_ddc99803e66233d0cfd134e0', 'cu_521c089bd5eaca0e152039e2', 'categories', 'cat_mopi94y2_ogmxk5dybiayfifi', '{\"id\":\"cat_mopi94y2_ogmxk5dybiayfifi\",\"userId\":\"cu_521c089bd5eaca0e152039e2\",\"createdAt\":\"2026-05-03T08:24:59.978Z\",\"updatedAt\":\"2026-05-03T08:25:00.000Z\",\"isDeleted\":0,\"version\":1,\"tags\":[],\"notes\":\"\",\"name\":\"Donate\",\"appliesTo\":\"expense\",\"icon\":\"\\ud83d\\udc8e\",\"color\":\"#0ea5e9\",\"budgetable\":1,\"taxRelevant\":0,\"gstRelevant\":0,\"parentId\":null,\"sortOrder\":999,\"archived\":0}', '2026-05-03 02:55:00', NULL, '2026-05-03 08:25:00', NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
('row_e01f39ac32bf235e2a98646e', 'cu_85024323863151a04375d3e5', 'transactions', 'txn_mp120rub_4cztgqozb796uxse', '{\"id\":\"txn_mp120rub_4cztgqozb796uxse\",\"userId\":\"cu_85024323863151a04375d3e5\",\"createdAt\":\"2026-05-11T10:23:50.003Z\",\"updatedAt\":\"2026-05-11T10:23:55.000Z\",\"isDeleted\":0,\"version\":1,\"tags\":[],\"notes\":\"\",\"date\":\"2026-05-10T18:30:00.000Z\",\"type\":\"expense\",\"amount\":50,\"categoryId\":\"cat_moq4vw8q_6b099gvhyea1hggw\",\"accountId\":\"acc_moopckwl_uoxw3nmnyvq8j4uh\",\"toAccountId\":\"\",\"linkedCardId\":\"\",\"linkedLoanId\":\"\",\"linkedGoalId\":\"\",\"linkedUdhariId\":\"\",\"linkedSavingsId\":\"\",\"paymentMode\":\"upi\",\"merchantOrPerson\":\"Krukure coke\",\"description\":\"\",\"billAvailable\":0,\"gstApplicable\":0,\"taxFlag\":0,\"businessOrPersonal\":\"personal\",\"needWant\":\"unassigned\",\"fixedVariable\":\"unassigned\",\"plannedUnplanned\":\"unassigned\"}', '2026-05-11 04:53:55', NULL, '2026-05-11 10:23:55', 5000, 1, '2026-05-09 18:30:00', '2026-05', 'expense', 'upi', 'cat_moq4vw8q_6b099gvhyea1hggw', 'acc_moopckwl_uoxw3nmnyvq8j4uh', '', NULL, NULL, NULL, 'personal', NULL, 'd345236ea68a2996428c2e4a1cc6d26464efbeb5dfa2bc7617da40ccdf460c77'),
('row_e3ffc457a93829da78014e30', 'cu_521c089bd5eaca0e152039e2', 'transactions', 'txn_mosfxvq6_r6j3sfqadkamb50v', '{\"id\":\"txn_mosfxvq6_r6j3sfqadkamb50v\",\"userId\":\"cu_521c089bd5eaca0e152039e2\",\"createdAt\":\"2026-05-05T09:43:34.110Z\",\"updatedAt\":\"2026-05-05T09:43:35.000Z\",\"isDeleted\":0,\"version\":1,\"tags\":[],\"notes\":\"\",\"date\":\"2026-05-04T18:30:00.000Z\",\"type\":\"income\",\"amount\":999,\"categoryId\":\"cat_mopib8y5_10572l4ihz0iumhz\",\"accountId\":\"acc_moosa3qj_hj3adif2i3hpl7df\",\"toAccountId\":\"\",\"linkedCardId\":\"\",\"linkedLoanId\":\"\",\"linkedGoalId\":\"\",\"linkedUdhariId\":\"\",\"linkedSavingsId\":\"\",\"paymentMode\":\"upi\",\"merchantOrPerson\":\"intern\",\"description\":\"\",\"billAvailable\":0,\"gstApplicable\":0,\"taxFlag\":0,\"businessOrPersonal\":\"personal\",\"needWant\":\"unassigned\",\"fixedVariable\":\"unassigned\",\"plannedUnplanned\":\"unassigned\"}', '2026-05-05 04:13:35', NULL, '2026-05-05 09:43:35', 99900, 1, '2026-05-03 18:30:00', '2026-05', 'income', 'upi', 'cat_mopib8y5_10572l4ihz0iumhz', 'acc_moosa3qj_hj3adif2i3hpl7df', '', NULL, NULL, NULL, 'personal', NULL, '42c7e7f14d59591332e5044ce4a640edced50956066a93ebc81d949c9528d784'),
('row_e4356e46953dce01b3449597', 'cu_521c089bd5eaca0e152039e2', 'transactions', 'txn_mopinyv4_ga8b2dg3a45vshqr', '{\"id\":\"txn_mopinyv4_ga8b2dg3a45vshqr\",\"userId\":\"cu_521c089bd5eaca0e152039e2\",\"createdAt\":\"2026-05-03T08:36:31.936Z\",\"updatedAt\":\"2026-05-03T08:36:42.000Z\",\"isDeleted\":0,\"version\":1,\"tags\":[],\"notes\":\"\",\"date\":\"2026-05-01T18:30:00.000Z\",\"type\":\"income\",\"amount\":1500,\"categoryId\":\"cat_mopilywn_830g8ygnfr999o40\",\"accountId\":\"acc_moosa3qj_hj3adif2i3hpl7df\",\"toAccountId\":\"\",\"linkedCardId\":\"\",\"linkedLoanId\":\"\",\"linkedGoalId\":\"\",\"linkedUdhariId\":\"\",\"linkedSavingsId\":\"\",\"paymentMode\":\"upi\",\"merchantOrPerson\":\"Rutvik - Print + D Mart\",\"description\":\"\",\"billAvailable\":0,\"gstApplicable\":0,\"taxFlag\":0,\"businessOrPersonal\":\"personal\",\"needWant\":\"unassigned\",\"fixedVariable\":\"unassigned\",\"plannedUnplanned\":\"unassigned\"}', '2026-05-03 03:06:42', NULL, '2026-05-03 08:36:42', 150000, 1, '2026-04-30 18:30:00', '2026-05', 'income', 'upi', 'cat_mopilywn_830g8ygnfr999o40', 'acc_moosa3qj_hj3adif2i3hpl7df', '', NULL, NULL, NULL, 'personal', NULL, 'd25cee964945117004eea3627bd63e55bc0674e264daa4ff08754526111e88d3'),
('row_e44eab72f96736c60393c982', 'cu_521c089bd5eaca0e152039e2', 'categories', 'cat_mopib8y5_10572l4ihz0iumhz', '{\"id\":\"cat_mopib8y5_10572l4ihz0iumhz\",\"userId\":\"cu_521c089bd5eaca0e152039e2\",\"createdAt\":\"2026-05-03T08:26:38.477Z\",\"updatedAt\":\"2026-05-03T08:26:38.000Z\",\"isDeleted\":0,\"version\":1,\"tags\":[],\"notes\":\"\",\"name\":\"Freelance\",\"appliesTo\":\"income\",\"icon\":\"\\ud83c\\udf7d\\ufe0f\",\"color\":\"#0ea5e9\",\"budgetable\":1,\"taxRelevant\":0,\"gstRelevant\":0,\"parentId\":null,\"sortOrder\":999,\"archived\":0}', '2026-05-03 02:56:38', NULL, '2026-05-03 08:26:38', NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
('row_e49e33e06d728e321d2e422b', 'cu_85024323863151a04375d3e5', 'cards', 'crd_moopfdvo_i20wyy7br04zrm8p', '{\"id\":\"crd_moopfdvo_i20wyy7br04zrm8p\",\"userId\":\"cu_85024323863151a04375d3e5\",\"createdAt\":\"2026-05-02T18:58:02.628Z\",\"updatedAt\":\"2026-05-02T18:58:43.000Z\",\"isDeleted\":1,\"version\":2,\"tags\":[],\"notes\":\"\",\"nickname\":\"FREEDOM\",\"bank\":\"HDFC Bank\",\"last4\":\"5702\",\"type\":\"credit\",\"linkedAccountId\":\"\",\"creditLimit\":47000,\"statementDay\":20,\"dueDay\":2,\"interestRate\":0,\"annualFee\":500,\"rewardNote\":\"\",\"color\":\"#8b5cf6\",\"isInactive\":0}', '2026-05-02 13:28:43', '2026-05-02 13:28:43', '2026-05-02 18:58:14', NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
('row_e51f403776324ccd4f6f065b', 'cu_85024323863151a04375d3e5', 'transactions', 'txn_moq5a4i7_8wrukbeqebnhev8d', '{\"id\":\"txn_moq5a4i7_8wrukbeqebnhev8d\",\"userId\":\"cu_85024323863151a04375d3e5\",\"createdAt\":\"2026-05-03T19:09:37.231Z\",\"updatedAt\":\"2026-05-03T19:09:40.000Z\",\"isDeleted\":0,\"version\":1,\"tags\":[],\"notes\":\"\",\"date\":\"2026-05-03T18:30:00.000Z\",\"type\":\"expense\",\"amount\":430,\"categoryId\":\"cat_moq4u7b9_sgs3dsgctfc0m5o3\",\"accountId\":\"acc_moopckwl_uoxw3nmnyvq8j4uh\",\"toAccountId\":\"\",\"linkedCardId\":\"\",\"linkedLoanId\":\"\",\"linkedGoalId\":\"\",\"linkedUdhariId\":\"\",\"linkedSavingsId\":\"\",\"paymentMode\":\"upi\",\"merchantOrPerson\":\"Pulsar Petrol\",\"description\":\"\",\"billAvailable\":0,\"gstApplicable\":0,\"taxFlag\":0,\"businessOrPersonal\":\"personal\",\"needWant\":\"unassigned\",\"fixedVariable\":\"unassigned\",\"plannedUnplanned\":\"unassigned\"}', '2026-05-03 13:39:40', NULL, '2026-05-03 19:09:40', 43000, 1, '2026-05-02 18:30:00', '2026-05', 'expense', 'upi', 'cat_moq4u7b9_sgs3dsgctfc0m5o3', 'acc_moopckwl_uoxw3nmnyvq8j4uh', '', NULL, NULL, NULL, 'personal', NULL, '21ee77868e9e644d77de65ffa51eb11da4b363c09b52fa8c084a89a03e4a8f1f'),
('row_e6049bf6d6dd18a6586d1c29', 'cu_521c089bd5eaca0e152039e2', 'transactions', 'txn_mou8kxn6_e3g0sktae5aovz7s', '{\"id\":\"txn_mou8kxn6_e3g0sktae5aovz7s\",\"userId\":\"cu_521c089bd5eaca0e152039e2\",\"createdAt\":\"2026-05-06T15:53:05.106Z\",\"updatedAt\":\"2026-05-06T15:53:07.000Z\",\"isDeleted\":0,\"version\":1,\"tags\":[],\"notes\":\"\",\"date\":\"2026-05-05T18:30:00.000Z\",\"type\":\"income\",\"amount\":1000,\"categoryId\":\"cat_mopib8y5_10572l4ihz0iumhz\",\"accountId\":\"acc_moosa3qj_hj3adif2i3hpl7df\",\"toAccountId\":\"\",\"linkedCardId\":\"\",\"linkedLoanId\":\"\",\"linkedGoalId\":\"\",\"linkedUdhariId\":\"\",\"linkedSavingsId\":\"\",\"paymentMode\":\"upi\",\"merchantOrPerson\":\"Intern\",\"description\":\"\",\"billAvailable\":0,\"gstApplicable\":0,\"taxFlag\":0,\"businessOrPersonal\":\"personal\",\"needWant\":\"unassigned\",\"fixedVariable\":\"unassigned\",\"plannedUnplanned\":\"unassigned\"}', '2026-05-06 10:23:07', NULL, '2026-05-06 15:53:07', 100000, 1, '2026-05-04 18:30:00', '2026-05', 'income', 'upi', 'cat_mopib8y5_10572l4ihz0iumhz', 'acc_moosa3qj_hj3adif2i3hpl7df', '', NULL, NULL, NULL, 'personal', NULL, '2998d2b2b74146456c98705436fcabc9ffadde8231548357966e1b97a9e786ba'),
('row_e79c0d00a7b625a311d8c7bc', 'cu_521c089bd5eaca0e152039e2', 'categories', 'cat_mopi898e_7brtd1d732xg8rql', '{\"id\":\"cat_mopi898e_7brtd1d732xg8rql\",\"userId\":\"cu_521c089bd5eaca0e152039e2\",\"createdAt\":\"2026-05-03T08:24:18.878Z\",\"updatedAt\":\"2026-05-03T08:25:52.000Z\",\"isDeleted\":1,\"version\":2,\"tags\":[],\"notes\":\"\",\"name\":\"Enjoy\",\"appliesTo\":\"expense\",\"icon\":\"\\u2728\",\"color\":\"#0ea5e9\",\"budgetable\":1,\"taxRelevant\":0,\"gstRelevant\":0,\"parentId\":null,\"sortOrder\":999,\"archived\":0}', '2026-05-03 02:55:52', '2026-05-03 02:55:52', '2026-05-03 08:24:19', NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
('row_e8e0ec5ceb29da295e774dd9', 'cu_521c089bd5eaca0e152039e2', 'categories', 'cat_mopibqv6_yrpkvzjbk25ooyur', '{\"id\":\"cat_mopibqv6_yrpkvzjbk25ooyur\",\"userId\":\"cu_521c089bd5eaca0e152039e2\",\"createdAt\":\"2026-05-03T08:27:01.698Z\",\"updatedAt\":\"2026-05-03T08:27:02.000Z\",\"isDeleted\":0,\"version\":1,\"tags\":[],\"notes\":\"\",\"name\":\"OTP Platform\",\"appliesTo\":\"expense\",\"icon\":\"\\ud83d\\udcb3\",\"color\":\"#0ea5e9\",\"budgetable\":1,\"taxRelevant\":0,\"gstRelevant\":0,\"parentId\":null,\"sortOrder\":999,\"archived\":0}', '2026-05-03 02:57:02', NULL, '2026-05-03 08:27:02', NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
('row_e9513907b410a59345a47e6e', 'cu_521c089bd5eaca0e152039e2', 'accounts', 'acc_moosanov_2qbs16k7rzkbqpnb', '{\"id\":\"acc_moosanov_2qbs16k7rzkbqpnb\",\"userId\":\"cu_521c089bd5eaca0e152039e2\",\"createdAt\":\"2026-05-02T20:18:20.911Z\",\"updatedAt\":\"2026-05-02T20:18:21.000Z\",\"isDeleted\":0,\"version\":1,\"tags\":[],\"notes\":\"\",\"name\":\"Cash \",\"type\":\"cash\",\"institution\":\"Cash\",\"openingBalance\":2500,\"color\":\"#0de727\",\"icon\":\"wallet\",\"isInactive\":0}', '2026-05-02 14:48:21', NULL, '2026-05-02 20:18:21', NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
('row_eae0171792f59ea7a1db0061', 'cu_521c089bd5eaca0e152039e2', 'transactions', 'txn_movyn32y_6igdug8024zjxdpd', '{\"id\":\"txn_movyn32y_6igdug8024zjxdpd\",\"userId\":\"cu_521c089bd5eaca0e152039e2\",\"createdAt\":\"2026-05-07T20:50:21.658Z\",\"updatedAt\":\"2026-05-07T20:50:22.000Z\",\"isDeleted\":0,\"version\":1,\"tags\":[],\"notes\":\"\",\"date\":\"2026-05-07T18:30:00.000Z\",\"type\":\"expense\",\"amount\":16354.2900000000008731149137020111083984375,\"categoryId\":\"cat_mopi94y2_ogmxk5dybiayfifi\",\"accountId\":\"acc_moosa3qj_hj3adif2i3hpl7df\",\"toAccountId\":\"\",\"linkedCardId\":\"\",\"linkedLoanId\":\"\",\"linkedGoalId\":\"\",\"linkedUdhariId\":\"\",\"linkedSavingsId\":\"\",\"paymentMode\":\"bank_transfer\",\"merchantOrPerson\":\"Credit Bill\",\"description\":\"\",\"billAvailable\":0,\"gstApplicable\":0,\"taxFlag\":0,\"businessOrPersonal\":\"personal\",\"needWant\":\"unassigned\",\"fixedVariable\":\"unassigned\",\"plannedUnplanned\":\"unassigned\"}', '2026-05-07 15:20:22', NULL, '2026-05-07 20:50:22', 1635429, 1, '2026-05-06 18:30:00', '2026-05', 'expense', 'bank_transfer', 'cat_mopi94y2_ogmxk5dybiayfifi', 'acc_moosa3qj_hj3adif2i3hpl7df', '', NULL, NULL, NULL, 'personal', NULL, '732871ff3c3e82730520989643431d92fde5559d215f76ddfe36dad88a9ccd9a'),
('row_ed383933891bdb032cdc2771', 'cu_521c089bd5eaca0e152039e2', 'categories', 'cat_mopialsj_qat4q8h3ta2uich8', '{\"id\":\"cat_mopialsj_qat4q8h3ta2uich8\",\"userId\":\"cu_521c089bd5eaca0e152039e2\",\"createdAt\":\"2026-05-03T08:26:08.467Z\",\"updatedAt\":\"2026-05-03T08:26:09.000Z\",\"isDeleted\":0,\"version\":1,\"tags\":[],\"notes\":\"\",\"name\":\"Office \",\"appliesTo\":\"expense\",\"icon\":\"\\ud83c\\udfe2\",\"color\":\"#0ea5e9\",\"budgetable\":1,\"taxRelevant\":0,\"gstRelevant\":0,\"parentId\":null,\"sortOrder\":999,\"archived\":0}', '2026-05-03 02:56:09', NULL, '2026-05-03 08:26:09', NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
('row_f0985c2dc9c81e190bd8a378', 'cu_85024323863151a04375d3e5', 'transactions', 'txn_moq53coj_1ua8hacjkcci03ns', '{\"id\":\"txn_moq53coj_1ua8hacjkcci03ns\",\"userId\":\"cu_85024323863151a04375d3e5\",\"createdAt\":\"2026-05-03T19:04:21.235Z\",\"updatedAt\":\"2026-05-03T19:04:24.000Z\",\"isDeleted\":0,\"version\":1,\"tags\":[],\"notes\":\"Coffee & Bag\",\"date\":\"2026-05-03T18:30:00.000Z\",\"type\":\"expense\",\"amount\":432,\"categoryId\":\"cat_moq4ts5z_p63wayuvtm9syj9v\",\"accountId\":\"acc_moopbws1_c65oqcylv9tpac90\",\"toAccountId\":\"\",\"linkedCardId\":\"\",\"linkedLoanId\":\"\",\"linkedGoalId\":\"\",\"linkedUdhariId\":\"\",\"linkedSavingsId\":\"\",\"paymentMode\":\"upi\",\"merchantOrPerson\":\"\",\"description\":\"\",\"billAvailable\":0,\"gstApplicable\":0,\"taxFlag\":0,\"businessOrPersonal\":\"personal\",\"needWant\":\"unassigned\",\"fixedVariable\":\"unassigned\",\"plannedUnplanned\":\"unassigned\"}', '2026-05-03 13:34:24', NULL, '2026-05-03 19:04:24', 43200, 1, '2026-05-02 18:30:00', '2026-05', 'expense', 'upi', 'cat_moq4ts5z_p63wayuvtm9syj9v', 'acc_moopbws1_c65oqcylv9tpac90', '', NULL, NULL, NULL, 'personal', NULL, '3fbcce98bfeffb31503aa86cb95000bdbf7a631cb14e98bbd1e117c424846ad8'),
('row_f0fb65db2c3856ff72477c94', 'cu_521c089bd5eaca0e152039e2', 'categories', 'cat_mopib3r5_ldtrmna3rfck1u7e', '{\"id\":\"cat_mopib3r5_ldtrmna3rfck1u7e\",\"userId\":\"cu_521c089bd5eaca0e152039e2\",\"createdAt\":\"2026-05-03T08:26:31.745Z\",\"updatedAt\":\"2026-05-03T08:26:32.000Z\",\"isDeleted\":0,\"version\":1,\"tags\":[],\"notes\":\"\",\"name\":\"Salary\",\"appliesTo\":\"income\",\"icon\":\"\\ud83d\\udcbb\",\"color\":\"#0ea5e9\",\"budgetable\":1,\"taxRelevant\":0,\"gstRelevant\":0,\"parentId\":null,\"sortOrder\":999,\"archived\":0}', '2026-05-03 02:56:32', NULL, '2026-05-03 08:26:32', NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
('row_f80f9427963cdcf1e3c1f29d', 'cu_521c089bd5eaca0e152039e2', 'transactions', 'txn_moukxq30_ap8s4v02jbk7ecwj', '{\"id\":\"txn_moukxq30_ap8s4v02jbk7ecwj\",\"userId\":\"cu_521c089bd5eaca0e152039e2\",\"createdAt\":\"2026-05-06T21:38:57.228Z\",\"updatedAt\":\"2026-05-06T21:38:58.000Z\",\"isDeleted\":0,\"version\":1,\"tags\":[],\"notes\":\"\",\"date\":\"2026-05-05T18:30:00.000Z\",\"type\":\"expense\",\"amount\":271,\"categoryId\":\"cat_mopd6tov_yhcvd17jiuxs3wre\",\"accountId\":\"acc_moosa3qj_hj3adif2i3hpl7df\",\"toAccountId\":\"\",\"linkedCardId\":\"\",\"linkedLoanId\":\"\",\"linkedGoalId\":\"\",\"linkedUdhariId\":\"\",\"linkedSavingsId\":\"\",\"paymentMode\":\"credit_card\",\"merchantOrPerson\":\"Fuel\",\"description\":\"\",\"billAvailable\":0,\"gstApplicable\":0,\"taxFlag\":0,\"businessOrPersonal\":\"personal\",\"needWant\":\"unassigned\",\"fixedVariable\":\"unassigned\",\"plannedUnplanned\":\"unassigned\"}', '2026-05-06 16:08:58', NULL, '2026-05-06 21:38:58', 27100, 1, '2026-05-04 18:30:00', '2026-05', 'expense', 'credit_card', 'cat_mopd6tov_yhcvd17jiuxs3wre', 'acc_moosa3qj_hj3adif2i3hpl7df', '', NULL, NULL, NULL, 'personal', NULL, 'eece4be1fe15825af3bffa4533e4a3ade2e4dfbf33a7af48d9b022f9c641bb5c'),
('row_f91a394825ec40884df0de45', 'cu_85024323863151a04375d3e5', 'cards', 'crd_moopfdq6_ish2oyejxbornb7t', '{\"id\":\"crd_moopfdq6_ish2oyejxbornb7t\",\"userId\":\"cu_85024323863151a04375d3e5\",\"createdAt\":\"2026-05-02T18:58:02.430Z\",\"updatedAt\":\"2026-05-02T18:58:41.000Z\",\"isDeleted\":1,\"version\":2,\"tags\":[],\"notes\":\"\",\"nickname\":\"FREEDOM\",\"bank\":\"HDFC Bank\",\"last4\":\"5702\",\"type\":\"credit\",\"linkedAccountId\":\"\",\"creditLimit\":47000,\"statementDay\":20,\"dueDay\":2,\"interestRate\":0,\"annualFee\":500,\"rewardNote\":\"\",\"color\":\"#8b5cf6\",\"isInactive\":0}', '2026-05-02 13:28:41', '2026-05-02 13:28:41', '2026-05-02 18:58:14', NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
('row_fdc8c24d59302351dc7ab709', 'cu_521c089bd5eaca0e152039e2', 'accounts', 'acc_moosa3qj_hj3adif2i3hpl7df', '{\"id\":\"acc_moosa3qj_hj3adif2i3hpl7df\",\"userId\":\"cu_521c089bd5eaca0e152039e2\",\"createdAt\":\"2026-05-02T20:17:55.051Z\",\"updatedAt\":\"2026-05-02T20:17:55.000Z\",\"isDeleted\":0,\"version\":1,\"tags\":[],\"notes\":\"\",\"name\":\"Kotak 811\",\"type\":\"savings\",\"institution\":\"Kotak 811\",\"openingBalance\":2757,\"color\":\"#ff0000\",\"icon\":\"wallet\",\"isInactive\":0}', '2026-05-02 14:47:55', NULL, '2026-05-02 20:17:55', NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
('row_ffb7e623202232719699f4ef', 'cu_521c089bd5eaca0e152039e2', 'transactions', 'txn_mp11xyln_931eilhlvy06j7g3', '{\"id\":\"txn_mp11xyln_931eilhlvy06j7g3\",\"userId\":\"cu_521c089bd5eaca0e152039e2\",\"createdAt\":\"2026-05-11T10:21:38.795Z\",\"updatedAt\":\"2026-05-11T10:21:52.000Z\",\"isDeleted\":0,\"version\":1,\"tags\":[],\"notes\":\"\",\"date\":\"2026-05-08T18:30:00.000Z\",\"type\":\"expense\",\"amount\":438.6299999999999954525264911353588104248046875,\"categoryId\":\"cat_mopd695a_dkhmbr7h0lgnqhnl\",\"accountId\":\"acc_moosa3qj_hj3adif2i3hpl7df\",\"toAccountId\":\"\",\"linkedCardId\":\"\",\"linkedLoanId\":\"\",\"linkedGoalId\":\"\",\"linkedUdhariId\":\"\",\"linkedSavingsId\":\"\",\"paymentMode\":\"upi\",\"merchantOrPerson\":\"zomato\",\"description\":\"\",\"billAvailable\":0,\"gstApplicable\":0,\"taxFlag\":0,\"businessOrPersonal\":\"personal\",\"needWant\":\"unassigned\",\"fixedVariable\":\"unassigned\",\"plannedUnplanned\":\"unassigned\"}', '2026-05-11 04:51:52', NULL, '2026-05-11 10:21:52', 43863, 1, '2026-05-07 18:30:00', '2026-05', 'expense', 'upi', 'cat_mopd695a_dkhmbr7h0lgnqhnl', 'acc_moosa3qj_hj3adif2i3hpl7df', '', NULL, NULL, NULL, 'personal', NULL, '18408314d77d1f376cd545be61a0b61d479543477590eb022d7817adfb5fa12e');

--
-- Data for table `cloud_users` (0 rows)
--

--
-- Data for table `feature_flags_global` (8 rows)
--

INSERT INTO `feature_flags_global` (`id`, `feature_key`, `is_enabled`, `description`, `updated_by_user_id`, `updated_at`, `created_at`) VALUES
(1, 'exports', 1, 'Allow users to export data to CSV/JSON', NULL, '2026-05-01 13:54:03', '2026-05-01 13:54:03'),
(2, 'advanced_reports', 0, 'Advanced multi-period financial reports', NULL, '2026-05-01 13:54:03', '2026-05-01 13:54:03'),
(3, 'alerts', 1, 'Budget overrun, due-date and udhari alerts', NULL, '2026-05-01 13:54:03', '2026-05-01 13:54:03'),
(4, 'admin_panel', 1, 'Access to admin console at /admin', NULL, '2026-05-01 13:54:03', '2026-05-01 13:54:03'),
(5, 'branding', 1, 'Platform branding customisation', NULL, '2026-05-01 13:54:03', '2026-05-01 13:54:03'),
(6, 'import', 1, 'Bulk import from CSV/Excel', NULL, '2026-05-01 13:54:03', '2026-05-01 13:54:03'),
(7, 'subscriptions', 1, 'Subscription and payment flow', NULL, '2026-05-01 13:54:03', '2026-05-01 13:54:03'),
(8, 'cloud_sync_enabled', 0, 'Deprecated cloud sync switch kept for compatibility', NULL, '2026-05-01 13:54:03', '2026-05-01 13:54:03');

--
-- Data for table `financial_effects` (0 rows)
--

--
-- Data for table `financial_events` (0 rows)
--

--
-- Data for table `login_attempts` (2 rows)
--

INSERT INTO `login_attempts` (`id`, `username`, `ip_address`, `attempt_count`, `locked_until`, `first_attempt_at`, `updated_at`, `created_at`) VALUES
(1, 'rutvik patel', '103.228.147.226', 5, '2026-05-11 04:48:56', '2026-05-11 10:15:14', '2026-05-11 04:46:56', '2026-05-11 04:45:14'),
(3, 'rutvik', '103.228.147.226', 1, NULL, '2026-05-11 10:16:31', '2026-05-11 04:46:31', '2026-05-11 04:46:31');

--
-- Data for table `payments` (0 rows)
--

--
-- Data for table `plans` (4 rows)
--

INSERT INTO `plans` (`id`, `code`, `name`, `description`, `price_inr`, `billing_interval`, `trial_days`, `is_active`, `sort_order`, `created_at`, `updated_at`) VALUES
(1, 'FREE', 'Free', 'Basic personal finance tracking', '0.00', 'monthly', 0, 1, 1, '2026-05-01 13:54:03', '2026-05-01 13:54:03'),
(2, 'BASIC', 'Basic', 'Unlimited transactions, budgets and goals', '299.00', 'monthly', 7, 1, 2, '2026-05-01 13:54:03', '2026-05-01 13:54:03'),
(3, 'PRO', 'Pro', 'Advanced reports, export and alerts', '799.00', 'monthly', 7, 1, 3, '2026-05-01 13:54:03', '2026-05-01 13:54:03'),
(4, 'PRO_YEARLY', 'Pro Yearly', 'Pro features at yearly discounted price', '7999.00', 'yearly', 14, 1, 4, '2026-05-01 13:54:03', '2026-05-01 13:54:03');

--
-- Data for table `plan_features` (20 rows)
--

INSERT INTO `plan_features` (`id`, `plan_id`, `feature_key`, `is_enabled`, `created_at`, `updated_at`, `limit_value`, `limit_unit`) VALUES
(1, 2, 'exports', 0, '2026-05-01 13:54:03', '2026-05-01 13:54:03', NULL, NULL),
(2, 1, 'exports', 0, '2026-05-01 13:54:03', '2026-05-01 13:54:03', NULL, NULL),
(3, 3, 'exports', 1, '2026-05-01 13:54:03', '2026-05-01 13:54:03', NULL, NULL),
(4, 4, 'exports', 1, '2026-05-01 13:54:03', '2026-05-01 13:54:03', NULL, NULL),
(8, 2, 'advanced_reports', 0, '2026-05-01 13:54:03', '2026-05-01 13:54:03', NULL, NULL),
(9, 1, 'advanced_reports', 0, '2026-05-01 13:54:03', '2026-05-01 13:54:03', NULL, NULL),
(10, 3, 'advanced_reports', 1, '2026-05-01 13:54:03', '2026-05-01 13:54:03', NULL, NULL),
(11, 4, 'advanced_reports', 1, '2026-05-01 13:54:03', '2026-05-01 13:54:03', NULL, NULL),
(15, 2, 'alerts', 1, '2026-05-01 13:54:03', '2026-05-01 13:54:03', NULL, NULL),
(16, 1, 'alerts', 0, '2026-05-01 13:54:03', '2026-05-01 13:54:03', NULL, NULL),
(17, 3, 'alerts', 1, '2026-05-01 13:54:03', '2026-05-01 13:54:03', NULL, NULL),
(18, 4, 'alerts', 1, '2026-05-01 13:54:03', '2026-05-01 13:54:03', NULL, NULL),
(22, 2, 'import', 1, '2026-05-01 13:54:03', '2026-05-01 13:54:03', NULL, NULL),
(23, 1, 'import', 0, '2026-05-01 13:54:03', '2026-05-01 13:54:03', NULL, NULL),
(24, 3, 'import', 1, '2026-05-01 13:54:03', '2026-05-01 13:54:03', NULL, NULL),
(25, 4, 'import', 1, '2026-05-01 13:54:03', '2026-05-01 13:54:03', NULL, NULL),
(29, 1, 'udhari', 1, '2026-05-01 13:54:03', '2026-05-01 13:54:03', NULL, NULL),
(30, 2, 'udhari', 1, '2026-05-01 13:54:03', '2026-05-01 13:54:03', NULL, NULL),
(31, 3, 'udhari', 1, '2026-05-01 13:54:03', '2026-05-01 13:54:03', NULL, NULL),
(32, 4, 'udhari', 1, '2026-05-01 13:54:03', '2026-05-01 13:54:03', NULL, NULL);

--
-- Data for table `plan_prices` (4 rows)
--

INSERT INTO `plan_prices` (`id`, `plan_id`, `amount_paise`, `currency`, `billing_interval`, `starts_at`, `ends_at`, `notes`, `created_at`) VALUES
(1, 1, 0, 'INR', 'monthly', '2026-05-01 13:54:03', NULL, 'Backfilled from legacy plans.price_inr during final hosting SQL generation', '2026-05-14 15:30:03'),
(2, 2, 29900, 'INR', 'monthly', '2026-05-01 13:54:03', NULL, 'Backfilled from legacy plans.price_inr during final hosting SQL generation', '2026-05-14 15:30:03'),
(3, 3, 79900, 'INR', 'monthly', '2026-05-01 13:54:03', NULL, 'Backfilled from legacy plans.price_inr during final hosting SQL generation', '2026-05-14 15:30:03'),
(4, 4, 799900, 'INR', 'yearly', '2026-05-01 13:54:03', NULL, 'Backfilled from legacy plans.price_inr during final hosting SQL generation', '2026-05-14 15:30:03');

--
-- Data for table `retention_jobs` (0 rows)
--

--
-- Data for table `schema_version` (11 rows)
--

INSERT INTO `schema_version` (`version_key`, `applied_at`) VALUES
('20260501_sql_only_full', '2026-05-01 13:54:03'),
('phase_01_security_2026_05_13', '2026-05-14 15:30:02'),
('phase_03_cloud_amount_paise_2026_05_13', '2026-05-14 15:30:02'),
('phase_04_indexed_sync_fields_2026_05_13', '2026-05-14 15:30:02'),
('phase_05_financial_ledger_2026_05_13', '2026-05-14 15:30:02'),
('phase_07_user_credit_cards_2026_05_13', '2026-05-14 15:30:02'),
('phase_08_user_loans_2026_05_13', '2026-05-14 15:30:02'),
('phase_09_udhari_engine_2026_05_13', '2026-05-14 15:30:02'),
('phase_11_ai_suggestions_2026_05_13', '2026-05-14 15:30:02'),
('phase_13_privacy_audit_2026_05_13', '2026-05-14 15:30:02'),
('phase_14_saas_billing_2026_05_13', '2026-05-14 15:30:02');

--
-- Data for table `subscriptions` (0 rows)
--

--
-- Data for table `udhari_entries` (0 rows)
--

--
-- Data for table `udhari_people` (0 rows)
--

--
-- Data for table `udhari_settlements` (0 rows)
--

--
-- Data for table `users` (3 rows)
--

INSERT INTO `users` (`id`, `username`, `display_name`, `pin_hash`, `pin_salt`, `role`, `is_active`, `last_login_at`, `mobile`, `email`, `avatar_emoji`, `avatar_color`, `created_at`, `updated_at`, `must_change_pin`, `deleted_at`, `deleted_reason`, `last_policy_check_at`, `mobile_e164`, `email_lc`) VALUES
('admin_seed_001', 'admin', 'Platform Admin', '$2y$12$ii9n2hQu3Gtfa1jZ1RDpMO1idRVkAL92ChgwQDeILt1RGunF5SsZi', 'seed', 'admin', 1, NULL, NULL, NULL, NULL, NULL, '2026-05-01 13:54:03', '2026-05-01 13:54:03', 0, NULL, NULL, NULL, NULL, NULL),
('cu_521c089bd5eaca0e152039e2', 'devpatel', 'Dev Patel', '$2y$12$yqZgVPFkOIciaZgVTbUu7eiq8RQ4PNDIHnSIG8iW/Fz3nrE1uK/sG', '1d23160e4615b5e7bf397d2d321d30df', 'user', 1, NULL, NULL, NULL, NULL, NULL, '2026-05-01 13:54:55', '2026-05-01 13:54:55', 0, NULL, NULL, NULL, NULL, NULL),
('cu_85024323863151a04375d3e5', 'darvik', 'Rutvik Patel', '$2y$12$IJnJPgi1AjGbYFQc2E/yC.dLwLbCsYgueh7wpCyTitRIVwcm4txcm', '7b834700e90dfc7589692fb239cc1dd0', 'user', 1, NULL, NULL, NULL, '?', '#ef4444', '2026-05-02 13:22:29', '2026-05-03 14:17:07', 0, NULL, NULL, NULL, NULL, NULL);

--
-- Data for table `user_audit_logs` (0 rows)
--

--
-- Data for table `user_credit_cards` (0 rows)
--

--
-- Data for table `user_loans` (0 rows)
--

--
-- Data for table `user_loan_payments` (0 rows)
--

--
-- Data for table `user_policy_acceptances` (0 rows)
--

--
-- Data for table `user_security_recovery` (0 rows)
--

--
-- Data for table `webhook_events` (0 rows)
--

COMMIT;
SET FOREIGN_KEY_CHECKS = 1;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
