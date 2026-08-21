-- Phase 3 rollback - remove denormalized paise columns added in this phase.
-- Run only when intentionally rolling back Phase 3.

ALTER TABLE payments
  DROP COLUMN IF EXISTS captured_amount_paise;

ALTER TABLE cloud_collection_rows
  DROP COLUMN IF EXISTS amount_paise;
