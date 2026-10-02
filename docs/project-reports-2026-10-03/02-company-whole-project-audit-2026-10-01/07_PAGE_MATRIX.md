# 07 — Page Matrix

Viewport matrix: **168/168 PASS** (`raw/EVIDENCE_VIEWPORT.txt`) across 320, 375, 768, 1024, 1280, 1440 for dashboard, parties, vouchers, vouchers-new, quick flows, AR/AP, reports, masters, users, approvals, settings, audit, export, search, select.

| Page | Status | Evidence |
|------|--------|----------|
| Login / Select / Dashboard | PASS | Browser A, product DASH, screens |
| Parties | PASS | Browser B |
| Voucher new | PASS | Distinct `VoucherCreatePage`; Sep 24 dead-end is gone |
| Voucher list after post | PARTIAL | Browser F rows=0 after a successful post |
| Masters categories | PARTIAL | Code + route test; not clicked this run |
| Reports | PASS | Browser I |
| Settings / Approvals / Users / Export | PASS | Browser J–M |
| Modules / Invoices | NOT VERIFIED | Routes exist in `CompanyApp` |

Sep 24 failures for categories fallthrough and voucher-new-as-list are **closed in code**.
