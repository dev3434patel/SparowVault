# Company Accounting Invariants (certified fixtures)

- Σ Dr = Σ Cr (paise integers) — unbalanced reject PASS
- POSTED only in TB/P&L/BS
- Loan received P&L = 0 — PASS
- Property advance P&L = 0; property expense hits P&L — PASS
- ON_ACCOUNT persists — PASS
- Preview ledger IDs/sides/amounts = post — PASS
- PREVIEW_STALE on hash mismatch — PASS
- Reverse idempotent replay — PASS
- Voucher seq numeric after 9999 — PASS (AUD-006)
