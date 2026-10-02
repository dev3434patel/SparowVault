# 06 — Feature Matrix

| Feature | Implemented | Verified this run | Verdict |
|---------|-------------|-------------------|---------|
| Create company | YES | Browser A PASS | PASS |
| Dashboard + New menu | YES | Product browser PASS | PASS |
| Parties | YES | Browser B PASS | PASS |
| Categories master | YES (`CategoriesPanel`) | Route unit PASS; live click NOT VERIFIED | PARTIAL |
| Voucher create chooser | YES (`VoucherCreatePage`) | Viewport 320–1440 vouchers-new PASS | PASS |
| Cash & Bank own page | YES | Product DRILL_CASH PASS | PASS |
| Quick received/paid/transfer/journal | YES | Browser C/D + viewport PASS | PASS |
| Loan / farmer / property | YES | Browser C–E PASS | PASS |
| Reverse from list | YES in detail page | Browser G FAIL (list rows=0) | FAIL journey |
| Reports core | YES | Browser I opened 4 | PASS |
| Management reports | Registry enabled | NOT VERIFIED in browser | PARTIAL |
| Export | YES | Browser M + fidelity PASS | PASS |
| Approvals / locks UI | YES | Browser K/L + product PASS | PASS |
| Modules (items/GST/payroll/bridge) | UI present | NOT VERIFIED end-to-end | PARTIAL |
| Documents / recurring / org subscriptions | Endpoints exist | NOT VERIFIED | PARTIAL / FUTURE |

Implementation of core books: ~92%. Verified this run: ~80%.
