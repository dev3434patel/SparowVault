-- Company voucher reversal / correction lineage FKs (Wave B #25)
-- Safe additive: self-references on company_vouchers.id (PK)

ALTER TABLE company_vouchers
  ADD INDEX idx_cv_reversed (reversed_voucher_id),
  ADD INDEX idx_cv_correction (correction_of_voucher_id);

ALTER TABLE company_vouchers
  ADD CONSTRAINT fk_cv_reversed
    FOREIGN KEY (reversed_voucher_id) REFERENCES company_vouchers(id)
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE company_vouchers
  ADD CONSTRAINT fk_cv_correction
    FOREIGN KEY (correction_of_voucher_id) REFERENCES company_vouchers(id)
    ON DELETE SET NULL ON UPDATE CASCADE;
