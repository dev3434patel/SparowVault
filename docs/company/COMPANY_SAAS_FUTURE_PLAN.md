# Company SaaS Future Plan

**Status:** Architecture (pre-implementation)  
**Principle:** Design multi-tenant from day one; ship single-company usefulness first.

---

## 1. Tenancy hierarchy

```text
Platform User (SparowVault auth)
  └── Company Membership(s)
        └── Company Workspace (books)
              └── Accounting data

Optional:
Company Group
  └── member Company Workspaces (separate books)
        └── consolidated reporting views only
```

Example:

```text
User Dev
├── SparowTech Solutions LLP
├── Farming Business
├── Property Venture
└── Future Client Company
```

Isolation is absolute at voucher/party/report/attachment level.

---

## 2. Group company (future)

- Group entity holds membership of companies.
- Consolidated reports: sum KPIs / TB lines by mapped COA codes.
- **Never** merge vouchers into one book.
- Inter-company eliminations = explicit future phase (not v1).

---

## 3. Subscription model shift

Today SparowVault billing is largely **user-scoped** (`subscriptions`, plan features like `max_transactions_per_month`).

Company SaaS should bill **Organisation / Company Workspace** (or Company Group):

| Plan field | Meaning |
|------------|---------|
| `maxCompanies` | Workspaces per org |
| `maxUsers` | Seats / memberships |
| `maxVouchersPerMonth` | Posting quota |
| `reports` | Advanced reports pack |
| `exports` | PDF/DOCX/XLSX |
| `approvals` | Workflow |
| `gst` | GST templates |
| `inventory` | Future |
| `bankImport` | Statement→voucher assist |
| `api` | Public API |
| `storage` | Attachment MB |

### Adapter pattern

```text
SparowVault Billing (plans, payments, Razorpay)
        ↑
CompanyBillingAdapter
        ↑
company permission / quota checks
```

Do **not** mix:

- SparowVault subscription rupees  
with  
- Company customer/vendor accounting money  

Subscription payments stay in platform billing tables; company GL stays in `company_*`.

Reuse: `php/helpers/billing.php` patterns (`has_feature`, quotas) via company-specific feature keys, e.g. `company_exports`, `company_approvals`.

---

## 4. Client onboarding flow (future)

```text
Register (platform user)
  → Create Organisation (billing account)
  → Choose Plan
  → Create Company Workspace
  → Invite Accountant / Users
  → Opening Balances wizard
  → Start Books
```

v1 can collapse Organisation = first Company for solo operators.

---

## 5. Feature flags

Use existing `feature_flags_global` + plan features:

| Flag | Purpose |
|------|---------|
| `company_module_enabled` | Show `/company` entry |
| `company_approvals` | Workflow |
| `company_gst_posting` | Tax lines |
| `company_bridge_personal` | Cross-domain bridge |
| `company_group_reports` | Consolidation |

---

## 6. Hosting / subdomain

| Phase | URL |
|-------|-----|
| Now | `app.sparowvault.com/company` (or current host + `/company`) |
| Later | `company.sparowvault.com` |

Cookie domain and CSRF strategy must be redesigned before subdomain SSO. Until then, same-site path routing is safer.

---

## 7. Backup & restore

- Company-level export pack (masters + vouchers + bills + documents metadata).
- Restore only into **same company id** or explicit **clone** workflow (new ids, remapped FKs).
- Never restore company pack into personal collections.

Align operationally with existing backup/restore drills, but separate artefact type: `company_backup_v1`.

---

## 8. API / integrations (future)

Versioned `api/company/v1/*` with company API keys scoped to one workspace.  
Idempotency headers mandatory for posts.  
Rate limits per plan.

---

## 9. Compliance trajectory (non-binding)

| Capability | Horizon |
|------------|---------|
| Audit trail immutability | v1 |
| Period lock | v1 |
| GSTIN storage | v1 |
| GST return aids | later |
| e-Invoice | later |
| Multi-currency | later |
| Inventory | later |

---

## 10. Success metrics (product)

- Time to first balanced voucher &lt; 10 minutes after company create
- Operator posts daily money in/out without accountant
- Accountant TB balances daily
- Zero cross-tenant incidents in isolation suite
- Personal finance certification remains green

---

## 11. Implementation sequencing vs SaaS

| Build now (schema/API shape) | Monetize later |
|------------------------------|----------------|
| `company_id` everywhere | Org checkout |
| Memberships + seats fields | Seat enforcement |
| Feature permission keys | Plan packaging |
| Quotas hooks (soft) | Hard paywall |
| Group tables nullable | Group UI |

Shipping C0–C2 without payment UI is fine; avoid schema rewrites later by keeping tenancy columns and adapter boundaries clean.

---

## 12. Master-prompt DEFERRED modules (§116–119)

These are **NOT PRODUCT-ACTIVE** in the current certification. Schema may exist; UI/API product flows are deferred:

| # | Module | Status |
|---|--------|--------|
| 116 | Documents / attachments product UI | DEFERRED |
| 117 | Recurring voucher rules engine UI | DEFERRED |
| 118 | Cross-domain personal↔company sync bridge | DEFERRED |
| 119 | Org subscriptions / billing adapter enforcement | DEFERRED |

Do not surface as LIVE in sidebar. See [COMPANY_226_MASTER_TRACKER.md](COMPANY_226_MASTER_TRACKER.md).

