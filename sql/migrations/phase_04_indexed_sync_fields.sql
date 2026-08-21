-- Phase 4 - indexed finance columns + payload hash on cloud_collection_rows.
-- Idempotent on MySQL 8.0.12+ / compatible MariaDB hosts.

ALTER TABLE cloud_collection_rows
  ADD COLUMN IF NOT EXISTS amount_paise BIGINT NULL COMMENT 'denormalized primary amount in paise' AFTER payload,
  ADD COLUMN IF NOT EXISTS schema_version INT NOT NULL DEFAULT 1 COMMENT 'payload schema / client version' AFTER created_at,
  ADD COLUMN IF NOT EXISTS txn_local_date DATE NULL AFTER amount_paise,
  ADD COLUMN IF NOT EXISTS txn_month CHAR(7) NULL AFTER txn_local_date,
  ADD COLUMN IF NOT EXISTS txn_type VARCHAR(32) NULL AFTER txn_month,
  ADD COLUMN IF NOT EXISTS payment_mode VARCHAR(32) NULL AFTER txn_type,
  ADD COLUMN IF NOT EXISTS category_id VARCHAR(191) NULL AFTER payment_mode,
  ADD COLUMN IF NOT EXISTS account_id VARCHAR(191) NULL AFTER category_id,
  ADD COLUMN IF NOT EXISTS card_id VARCHAR(191) NULL AFTER account_id,
  ADD COLUMN IF NOT EXISTS loan_id VARCHAR(191) NULL AFTER card_id,
  ADD COLUMN IF NOT EXISTS goal_id VARCHAR(191) NULL AFTER loan_id,
  ADD COLUMN IF NOT EXISTS udhari_id VARCHAR(191) NULL AFTER goal_id,
  ADD COLUMN IF NOT EXISTS business_or_personal VARCHAR(32) NULL AFTER udhari_id,
  ADD COLUMN IF NOT EXISTS source_device_id VARCHAR(191) NULL AFTER business_or_personal,
  ADD COLUMN IF NOT EXISTS payload_hash CHAR(64) NULL COMMENT 'SHA-256 hex of payload JSON' AFTER source_device_id;

ALTER TABLE cloud_collection_rows
  ADD KEY IF NOT EXISTS idx_ccr_uid_coll_txn_date (user_id, collection_name, txn_local_date),
  ADD KEY IF NOT EXISTS idx_ccr_uid_cat_month (user_id, category_id, txn_month),
  ADD KEY IF NOT EXISTS idx_ccr_uid_card_txn_date (user_id, card_id, txn_local_date),
  ADD KEY IF NOT EXISTS idx_ccr_uid_loan_txn_date (user_id, loan_id, txn_local_date),
  ADD KEY IF NOT EXISTS idx_ccr_uid_goal_txn_date (user_id, goal_id, txn_local_date),
  ADD KEY IF NOT EXISTS idx_ccr_uid_amount_paise (user_id, amount_paise);
