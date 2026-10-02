# 04 — API

Voucher get now requires `view_day_book` (`company_vouchers_get`). Preview uses `company_can_preview_voucher` in `posting_guards.php`. Export still gates on `export_reports` only.

`api/company/search.php` still calls `company_require_membership` only.

Newer endpoints exist: categories, documents, recurring, gst, payroll-preview, bridge, items, operations, invite-token, groups, org-subscription, cheque-match. Some are product-active via `ModulesPage`; GST filing / payroll remain partial product surfaces.

**Status: PARTIAL**
