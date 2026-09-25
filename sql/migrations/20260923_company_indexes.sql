-- Additive indexes for company list/report performance
-- Safe to re-run (IF NOT EXISTS not supported for indexes on all MySQL — use procedure-style ignore)

ALTER TABLE company_vouchers ADD INDEX idx_cv_company_date (company_id, voucher_date);
ALTER TABLE company_vouchers ADD INDEX idx_cv_company_status (company_id, status);
ALTER TABLE company_vouchers ADD INDEX idx_cv_company_party (company_id, party_id);
ALTER TABLE company_voucher_lines ADD INDEX idx_cvl_company_ledger (company_id, ledger_id);
ALTER TABLE company_bill_refs ADD INDEX idx_cbr_company_side_status (company_id, side, status);
ALTER TABLE company_parties ADD INDEX idx_cp_company_name (company_id, display_name);
ALTER TABLE company_audit_logs ADD INDEX idx_cal_company_created (company_id, created_at);
