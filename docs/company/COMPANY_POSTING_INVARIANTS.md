# Company Posting Invariants

1. Σ Debit paise = Σ Credit paise on every POSTED voucher.
2. Server is final accounting authority; client preview is non-canonical.
3. Purpose resolution uses `config/company-purpose-rules.json` only.
4. RECEIPT debits cash/bank; PAYMENT credits cash/bank; CONTRA all cash/bank (skipped for isReversal).
5. Bill allocations: perform or 422 — never silent continue.
6. ON_ACCOUNT persists with `bill_ref_id NULL`.
7. Reversal is one transaction; NEW_REFERENCE → CANCELLED; AGAINST restores outstanding.
8. PENDING stores bill intent; approve rechecks period lock then applies side effects once.
9. Company A cannot read Company B rows (company_id scope).
10. Personal and company domains remain isolated.
