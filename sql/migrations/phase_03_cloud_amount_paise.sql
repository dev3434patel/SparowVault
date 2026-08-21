-- Phase 3 - denormalized amount on cloud_collection_rows.
-- Idempotent on MySQL 8.0.12+ / compatible MariaDB hosts.

ALTER TABLE cloud_collection_rows
  ADD COLUMN IF NOT EXISTS amount_paise BIGINT NULL DEFAULT NULL
  COMMENT 'Primary monetary amount in paise when applicable (e.g. transactions)'
  AFTER payload;

ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS captured_amount_paise BIGINT UNSIGNED NULL
  COMMENT 'Validated captured payment amount in paise from provider webhook'
  AFTER expected_amount_paise;
