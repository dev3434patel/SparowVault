-- PHASE_08 — covering indexes for hot company queries at ≥100k vouchers.
-- Safe to re-run on MariaDB / MySQL 8.0+ that support IF NOT EXISTS on indexes.
-- If your MySQL build rejects IF NOT EXISTS, the EXPLAIN pack script applies
-- these via information_schema-aware helpers.

CREATE INDEX IF NOT EXISTS idx_cv_company_status_date
  ON company_vouchers (company_id, status, voucher_date);

CREATE INDEX IF NOT EXISTS idx_cv_company_type_date
  ON company_vouchers (company_id, voucher_type, voucher_date);

CREATE INDEX IF NOT EXISTS idx_cv_company_number
  ON company_vouchers (company_id, voucher_number);

CREATE INDEX IF NOT EXISTS idx_cvl_company_voucher
  ON company_voucher_lines (company_id, voucher_id);

CREATE INDEX IF NOT EXISTS idx_cbr_company_side_status_bill
  ON company_bill_refs (company_id, side, status, bill_date);

CREATE INDEX IF NOT EXISTS idx_cbr_company_party_side
  ON company_bill_refs (company_id, party_id, side, status);

CREATE INDEX IF NOT EXISTS idx_cp_company_active_name
  ON company_parties (company_id, active, display_name);

CREATE INDEX IF NOT EXISTS idx_cal_company_created_action
  ON company_audit_logs (company_id, created_at, action);
