-- Allow ON_ACCOUNT / ADVANCE allocations without a bill_ref row.
-- bill_refs.status already includes CANCELLED (see 20260923_company_core.sql).

ALTER TABLE company_bill_allocations DROP FOREIGN KEY fk_company_bill_alloc_bill;
ALTER TABLE company_bill_allocations MODIFY COLUMN bill_ref_id VARCHAR(191) NULL;
ALTER TABLE company_bill_allocations ADD CONSTRAINT fk_company_bill_alloc_bill FOREIGN KEY (bill_ref_id) REFERENCES company_bill_refs(id) ON DELETE RESTRICT;
