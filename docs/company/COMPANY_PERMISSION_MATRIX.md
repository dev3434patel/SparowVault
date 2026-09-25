# Company Permission Matrix

**Status:** Architecture (pre-implementation)  
**Enforcement:** Server-side on every company API (UI hide is not security)

---

## 1. Access stack

```text
Authenticated SparowVault user
  AND ACTIVE company membership
  AND permission key granted via role(s)
  AND (optional) sensitive-action PIN / approval
```

Logged-in without membership → cannot read any `company_*` row.

Cross-company: membership in A never grants access to B (IDOR tests mandatory).

---

## 2. System roles (presets)

| Role | Intent |
|------|--------|
| `COMPANY_OWNER` | Full control; billing/org; cannot be locked out of manage_company without transfer |
| `SUPER_ADMIN` | Full books + users; may exclude billing transfer |
| `ACCOUNTANT` | Full vouchers, ledgers, reports; limited user admin |
| `MANAGER` | Approvals, operational reports, party manage; limited ledger redesign |
| `DATA_ENTRY` | Create drafts / receipts / payments within limits |
| `VIEWER` | Read dashboard, parties, non-sensitive reports |
| `AUDITOR` | Read-all + audit trail; no mutate |

Companies may clone/customize roles; permission keys remain stable.

---

## 3. Permission keys

| Key | Description | Enforcement |
|-----|-------------|-------------|
| `view_dashboard` | KPIs; period-lock list | ENFORCE |
| `view_party` | Party list/detail; search parties | ENFORCE |
| `view_party_balance` | Balances & statements | ENFORCE |
| `manage_parties` | Create/edit parties, roles, categories | ENFORCE |
| `view_ledgers` | Chart of accounts; search ledgers | ENFORCE |
| `manage_ledgers` | Create/edit groups & ledgers | @future (no COA editor API) |
| `create_receipt` | Money received / RECEIPT (+ preview) | ENFORCE |
| `create_payment` | Money paid / PAYMENT (+ preview) | ENFORCE |
| `create_contra` | Transfer (+ preview) | ENFORCE |
| `create_journal` | Journal / adjustment (+ preview) | ENFORCE |
| `create_purchase_sale` | Purchase/Sale/Notes | ENFORCE |
| `edit_own_voucher` | Edit own DRAFT / rejected | @future |
| `edit_any_voucher` | Edit others’ drafts | @future |
| `approve_voucher` | Approval workflow | ENFORCE |
| `post_voucher` | Mark posted (if split from create) | ENFORCE |
| `reverse_voucher` | Reverse posted | ENFORCE |
| `delete_draft` | Cancel/delete drafts | @future |
| `view_receivables` | AR; search receivable bills; export | ENFORCE |
| `view_payables` | AP; search payable bills; export | ENFORCE |
| `view_day_book` | Day book; voucher-item GET; search vouchers | ENFORCE |
| `view_pnl` | Profit & Loss (+ export) | ENFORCE |
| `view_balance_sheet` | Balance Sheet (+ export) | ENFORCE |
| `view_trial_balance` | Trial Balance (+ export) | ENFORCE |
| `view_cash_bank_books` | Cash/Bank/R&P (+ export) | ENFORCE |
| `view_audit` | Audit trail | ENFORCE |
| `export_reports` | PDF/DOCX/XLSX/CSV (plus report view_*) | ENFORCE |
| `export_backup` | Company backup pack | ENFORCE (report/format=backup) |
| `manage_users` | Invite/remove; assign roles | ENFORCE |
| `manage_company` | Company profile, FY, GST flags | @future (no workspace PATCH) |
| `manage_dimensions` | Business/area/project/cost centre | ENFORCE |
| `lock_period` | Set period lock | ENFORCE |
| `reopen_period` | Reopen (sensitive PIN) | ENFORCE |
| `manage_approvals_settings` | Thresholds | @future |
| `manage_opening_balances` | Opening vouchers (OPENING_BALANCE type) | ENFORCE |

### Soft-read rules (Phase 02)

- `search.php` — membership alone is insufficient; each result domain is filtered by its `view_*` key. Zero searchable domains → `403 FORBIDDEN`.
- `voucher-item.php` GET → `view_day_book` (not membership-only).
- `voucher-preview.php` → same `create_*` gate as post via `company_can_preview_voucher`.
- `period-locks.php` GET → `view_dashboard`; create → `lock_period`; reopen → `reopen_period` + PIN.
- `exports.php` → `export_reports` **and** the report’s `view_*` from `company-report-registry.json` (via `company_require_report_view_permission`).

---

## 4. Role × permission matrix (default)

| Permission | Owner | Super Admin | Accountant | Manager | Data Entry | Viewer | Auditor |
|------------|:-----:|:-----------:|:----------:|:-------:|:----------:|:------:|:-------:|
| view_dashboard | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| view_party / balance | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| manage_parties | ✓ | ✓ | ✓ | ✓ | ✓* | — | — |
| view_ledgers | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| manage_ledgers | ✓ | ✓ | ✓ | — | — | — | — |
| create_receipt/payment/contra | ✓ | ✓ | ✓ | ✓ | ✓ | — | — |
| create_journal | ✓ | ✓ | ✓ | ✓ | — | — | — |
| create_purchase_sale | ✓ | ✓ | ✓ | ✓ | ✓* | — | — |
| edit_own_voucher | ✓ | ✓ | ✓ | ✓ | ✓ | — | — |
| edit_any_voucher | ✓ | ✓ | ✓ | ✓ | — | — | — |
| approve_voucher | ✓ | ✓ | ✓ | ✓ | — | — | — |
| post_voucher | ✓ | ✓ | ✓ | ✓ | —** | — | — |
| reverse_voucher | ✓ | ✓ | ✓ | — | — | — | — |
| delete_draft | ✓ | ✓ | ✓ | ✓ | ✓ own | — | — |
| view AR/AP/day book | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| view_pnl / BS / TB | ✓ | ✓ | ✓ | ✓ | — | —*** | ✓ |
| view_audit | ✓ | ✓ | ✓ | ✓ | — | — | ✓ |
| export_reports | ✓ | ✓ | ✓ | ✓ | — | — | ✓ |
| export_backup | ✓ | ✓ | — | — | — | — | — |
| manage_users | ✓ | ✓ | — | — | — | — | — |
| manage_company | ✓ | ✓ | — | — | — | — | — |
| manage_dimensions | ✓ | ✓ | ✓ | ✓ | — | — | — |
| lock_period | ✓ | ✓ | ✓ | — | — | — | — |
| reopen_period | ✓ | ✓ | — | — | — | — | — |
| manage_opening_balances | ✓ | ✓ | ✓ | — | — | — | — |

\* Data Entry party/purchase may be company-configurable.  
\*\* If approvals enabled, Data Entry creates PENDING only.  
\*\*\* Viewer P&amp;L/BS optional company setting (default off).

---

## 5. Sensitive actions (extra gate)

Require reason + Company/Sensitive PIN (and optionally Owner approval):

- `reopen_period`
- `reverse_voucher` above threshold
- `manage_opening_balances` after books started
- `manage_users` role elevation to Owner/Super Admin
- `export_backup`
- adjustments above configurable paise threshold

---

## 6. Approval workflow (optional per company)

```text
DATA_ENTRY creates payment ≥ threshold
  → PENDING_APPROVAL
  → MANAGER/ACCOUNTANT approve_voucher
  → POSTED
```

Thresholds: e.g. &gt; ₹50,000, &gt; ₹1,00,000, custom per voucher type.

Rejection returns to DRAFT/REJECTED with comment; audit logged.

---

## 7. API enforcement pattern

Every `api/company/*` handler:

1. `require_cloud_user()`
2. Resolve `company_id` from path/body (never trust client-only)
3. `company_require_membership($userId, $companyId)`
4. `company_require_permission($membership, 'create_payment')`
5. Proceed

List endpoints must filter `WHERE company_id = ?` from membership context, not from unchecked client arrays.

---

## 8. Relation to existing SparowVault roles

| Existing | Company meaning |
|----------|-----------------|
| `users.role = user` | Can use company if membership exists |
| `users.role = admin` | Platform admin — **not** automatic company access |
| Household owner/partner/viewer | Irrelevant to company ACL |

Platform admin support access to a company (if ever needed) must be explicit break-glass with audit — out of v1 scope.
