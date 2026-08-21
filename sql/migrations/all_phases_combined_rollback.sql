-- =============================================================================
-- SparowVault — ROLLBACK for all_phases_combined.sql
-- =============================================================================
--
-- WARNING:
--   This drops every Phase 1-14 table and column, including:
--     - financial_events, financial_effects        (Phase 5)
--     - user_credit_cards                          (Phase 7)
--     - user_loans, user_loan_payments             (Phase 8)
--     - udhari_people, udhari_entries, udhari_settlements  (Phase 9)
--     - ai_suggestions                             (Phase 11)
--     - user_policy_acceptances, user_audit_logs, retention_jobs  (Phase 13)
--     - plan_prices                                (Phase 14)
--   and removes the column adds on users / payments / subscriptions /
--   plan_features / cloud_collection_rows.
--
--   Existing user data in cloud_collection_rows.payload is NOT touched —
--   only the indexed shadow columns are dropped.
--
--   Take a backup BEFORE running this. See docs/backup-checklist.md.
-- =============================================================================

DELIMITER //

DROP PROCEDURE IF EXISTS sv_drop_column_if_present//
CREATE PROCEDURE sv_drop_column_if_present(IN tbl VARCHAR(64), IN col VARCHAR(64))
BEGIN
  DECLARE n INT DEFAULT 0;
  SELECT COUNT(*) INTO n FROM information_schema.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = tbl AND COLUMN_NAME = col;
  IF n = 1 THEN
    SET @ddl = CONCAT('ALTER TABLE `', tbl, '` DROP COLUMN `', col, '`');
    PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;
  END IF;
END//

DROP PROCEDURE IF EXISTS sv_drop_index_if_present//
CREATE PROCEDURE sv_drop_index_if_present(IN tbl VARCHAR(64), IN idx VARCHAR(64))
BEGIN
  DECLARE n INT DEFAULT 0;
  SELECT COUNT(*) INTO n FROM information_schema.STATISTICS
   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = tbl AND INDEX_NAME = idx;
  IF n > 0 THEN
    SET @ddl = CONCAT('ALTER TABLE `', tbl, '` DROP INDEX `', idx, '`');
    PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;
  END IF;
END//

DELIMITER ;

-- Phase 14 ----------------------------------------------------------------
CALL sv_drop_column_if_present('subscriptions', 'scheduled_change_at');
CALL sv_drop_column_if_present('subscriptions', 'scheduled_plan_id');
CALL sv_drop_column_if_present('subscriptions', 'renewed_from_subscription_id');
CALL sv_drop_column_if_present('subscriptions', 'previous_period_end');
CALL sv_drop_column_if_present('plan_features', 'limit_unit');
CALL sv_drop_column_if_present('plan_features', 'limit_value');
DROP TABLE IF EXISTS plan_prices;

-- Phase 13 ----------------------------------------------------------------
CALL sv_drop_column_if_present('users', 'email_lc');
CALL sv_drop_column_if_present('users', 'mobile_e164');
CALL sv_drop_column_if_present('users', 'last_policy_check_at');
DROP TABLE IF EXISTS retention_jobs;
DROP TABLE IF EXISTS user_audit_logs;
DROP TABLE IF EXISTS user_policy_acceptances;

-- Phase 11 ----------------------------------------------------------------
DROP TABLE IF EXISTS ai_suggestions;

-- Phase 9 -----------------------------------------------------------------
DROP TABLE IF EXISTS udhari_settlements;
DROP TABLE IF EXISTS udhari_entries;
DROP TABLE IF EXISTS udhari_people;

-- Phase 8 -----------------------------------------------------------------
DROP TABLE IF EXISTS user_loan_payments;
DROP TABLE IF EXISTS user_loans;

-- Phase 7 -----------------------------------------------------------------
DROP TABLE IF EXISTS user_credit_cards;

-- Phase 5 -----------------------------------------------------------------
DROP TABLE IF EXISTS financial_effects;
DROP TABLE IF EXISTS financial_events;

-- Phase 4 -----------------------------------------------------------------
CALL sv_drop_index_if_present('cloud_collection_rows', 'idx_ccr_uid_amount_paise');
CALL sv_drop_index_if_present('cloud_collection_rows', 'idx_ccr_uid_goal_txn_date');
CALL sv_drop_index_if_present('cloud_collection_rows', 'idx_ccr_uid_loan_txn_date');
CALL sv_drop_index_if_present('cloud_collection_rows', 'idx_ccr_uid_card_txn_date');
CALL sv_drop_index_if_present('cloud_collection_rows', 'idx_ccr_uid_cat_month');
CALL sv_drop_index_if_present('cloud_collection_rows', 'idx_ccr_uid_coll_txn_date');

CALL sv_drop_column_if_present('cloud_collection_rows', 'payload_hash');
CALL sv_drop_column_if_present('cloud_collection_rows', 'source_device_id');
CALL sv_drop_column_if_present('cloud_collection_rows', 'business_or_personal');
CALL sv_drop_column_if_present('cloud_collection_rows', 'udhari_id');
CALL sv_drop_column_if_present('cloud_collection_rows', 'goal_id');
CALL sv_drop_column_if_present('cloud_collection_rows', 'loan_id');
CALL sv_drop_column_if_present('cloud_collection_rows', 'card_id');
CALL sv_drop_column_if_present('cloud_collection_rows', 'account_id');
CALL sv_drop_column_if_present('cloud_collection_rows', 'category_id');
CALL sv_drop_column_if_present('cloud_collection_rows', 'payment_mode');
CALL sv_drop_column_if_present('cloud_collection_rows', 'txn_type');
CALL sv_drop_column_if_present('cloud_collection_rows', 'txn_month');
CALL sv_drop_column_if_present('cloud_collection_rows', 'txn_local_date');
CALL sv_drop_column_if_present('cloud_collection_rows', 'schema_version');

-- Phase 3 -----------------------------------------------------------------
CALL sv_drop_column_if_present('cloud_collection_rows', 'amount_paise');

-- Phase 1 -----------------------------------------------------------------
CALL sv_drop_index_if_present('users',    'idx_users_deleted');
CALL sv_drop_column_if_present('users',    'deleted_reason');
CALL sv_drop_column_if_present('users',    'deleted_at');
CALL sv_drop_column_if_present('users',    'must_change_pin');
CALL sv_drop_index_if_present('payments', 'uq_pay_provider_payment_id');
CALL sv_drop_index_if_present('payments', 'uq_pay_provider_order_id');
-- payments.currency is part of production_schema.sql — DO NOT drop unless
-- you're rolling back to a pre-production_schema environment.
-- CALL sv_drop_column_if_present('payments', 'currency');
CALL sv_drop_column_if_present('payments', 'captured_amount_paise');
CALL sv_drop_column_if_present('payments', 'expected_amount_paise');

-- schema_version entries
DELETE FROM schema_version WHERE version_key LIKE 'phase_0%' OR version_key LIKE 'phase_1%';

-- Cleanup
DROP PROCEDURE IF EXISTS sv_drop_column_if_present;
DROP PROCEDURE IF EXISTS sv_drop_index_if_present;
