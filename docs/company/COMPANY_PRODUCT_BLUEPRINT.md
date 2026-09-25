# SparowVault Company — Product Blueprint

**Status:** Architecture package (pre-implementation)  
**Date:** 2026-09-23  
**Primary route:** `/company`  
**Future host:** `company.sparowvault.com`  
**Constraint:** Personal finance domain remains intact and isolated.

---

## 1. Product definition

**SparowVault Company** is a professional **hisab-kitab / double-entry accounting workspace** for businesses, farms, property ventures, partnerships, and client organisations.

It is **not**:

- a personal-finance module
- an extension of `transactions` / `accounts` / `cards` / `loans` / `udhari`
- a `businessOrPersonal` tag on personal transactions
- a household consolidation feature

It **is**:

- company-scoped books of account
- party-wise Debit/Credit money management with a real ledger engine
- multi-dimensional reporting (business, area, project, cost centre, category)
- multi-user membership + RBAC
- SaaS-ready multi-tenant organisation model from day one

Working metaphor for operators:

> “Who gave money, whom did I pay, why, for which business/area/project — and do Debit = Credit?”

Working metaphor for accountants:

> Chart of accounts + vouchers + bill-wise outstanding + Trial Balance / P&L / Balance Sheet.

---

## 2. Positioning vs SparowVault Personal

| Dimension | Personal (existing) | Company (new) |
|-----------|---------------------|---------------|
| Primary user | Individual / household | Organisation operators |
| Money model | Transaction + derived `financial_events`/`effects` | Voucher header + balanced lines (GL) |
| Storage | Mostly JSON collections + shadow tables | Normalized `company_*` SQL tables |
| Tenancy | `user_id` | `company_id` (+ membership) |
| Party concept | Udhari people / lenders loosely | First-class Party + roles + categories |
| Reports | Personal KPIs, CA-ish exports | Day book, TB, P&L, BS, ageing, party ledger |
| Entry UX | Income/Expense/Transfer | Money Received / Money Paid / Transfer + optional accounting mode |

See `PERSONAL_COMPANY_DOMAIN_BOUNDARY.md`.

---

## 3. Experience spine

```text
/company
  → not authenticated? /company/login
  → authenticated, no membership? create/join company
  → one membership? skip selector → Company Dashboard
  → many memberships? /company/select → Dashboard
```

Dashboard answer targets (must be instant from posted books):

- Cash & Bank available
- Money in / out (today, month, FY)
- Receivable / Payable / Overdue
- Net party position
- Recent money flow with purpose + dimensions

Primary actions (plain language, not GL jargon):

| Button | User meaning | Engine maps to |
|--------|--------------|----------------|
| + Credit / Received | Money into company | RECEIPT (bank/cash Dr) |
| − Debit / Paid | Money out of company | PAYMENT (bank/cash Cr) |
| ↔ Transfer | Cash ↔ Bank / Bank ↔ Bank | CONTRA |
| Journal / More | Adjustments | JOURNAL / notes / purchase-sale |

**Rule:** UI “Credit/Received” ≠ accounting Credit. Effect preview must show both plain language and Dr/Cr.

---

## 4. Domain pillars

1. **Workspace** — legal entity / books container  
2. **Membership & RBAC** — who may act  
3. **Masters** — parties, ledgers, dimensions  
4. **Voucher engine** — only POSTED vouchers affect books  
5. **Bill-wise outstanding** — reference / allocation / ageing  
6. **Reports & exports** — PDF / DOCX / XLSX / CSV with filter fidelity  
7. **Audit & period lock** — immutable history discipline  
8. **SaaS subscription adapter** — org-scoped plans (future)

---

## 5. Suggested codebase layout (aligned to SparowVault)

Personal app today uses path→page switching (`navRoutes.ts` + `AppShell`), not React Router. Company should be a **separate shell** under `/company/*` so personal nav never leaks company pages.

### Frontend

```text
src/company/
  AppShell.tsx                 # Company shell (own sidebar/header)
  routes.ts                    # /company path map
  pages/
  components/
  services/                    # posting rules, report engines, purpose presets
  repositories/                # company API clients (not personal BaseRepo collections)
  types/
  store/                       # activeCompanyId, membership, permissions
```

UI primitives may import from `src/components/ui/*`.  
Money helpers may import from `src/utils/money.ts` (paise only).  
Do **not** import personal repos (`transactionRepo`, etc.) into company services except via an explicit bridge adapter (future, gated).

### Backend

```text
api/company/*.php
php/controllers/company/
php/services/company/
php/helpers/company/
```

Auth: reuse `require_cloud_user()` then **additionally** require company membership + permission.

### Database

All tables: `company_*` with mandatory `company_id` (or `workspace_id` synonym — pick **one** and stick to `company_id`).

Not stored in `cloud_collection_rows` for core accounting. JSON blobs are allowed only for non-canonical metadata (e.g. export job params), never for voucher lines.

---

## 6. Phased delivery (implementation order after architecture sign-off)

| Phase | Scope | Exit criteria |
|-------|--------|---------------|
| **C0** | Workspace, membership, roles, company login/select, empty dashboard | Tenant isolation tests green |
| **C1** | Chart of accounts seed + party master + roles/categories/tags | Party CRUD + COA browse |
| **C2** | Voucher engine: RECEIPT/PAYMENT/CONTRA/JOURNAL + balance invariant + mutationId | Debit=Credit enforced; idempotent post |
| **C3** | Purpose presets + effect preview + quick entry UX | Non-accountant can post loan receipt correctly |
| **C4** | Dimensions: business unit, area, project, cost centre (+ allocation) | Dimension filters on lists |
| **C5** | Bill refs + allocations + ageing + AR/AP dashboard widgets | Partial settlement correct |
| **C6** | Party ledger/statement + plain-language balances | Statement PDF |
| **C7** | Core reports: Day Book, Cash/Bank Book, TB, P&L, BS, R&P | TB balances; P&L ignores pure loans |
| **C8** | Period lock, reverse/correct, audit trail, approvals (optional) | Posted edit blocked; reverse works |
| **C9** | Exports (PDF/DOCX/XLSX/CSV), attachments metadata, recurring (optional) | Filter-faithful export |
| **C10** | Org subscription adapter, group company view (read-only consolidate) | Plan gates server-side |

No phase may write company balances into personal `financial_events`.

---

## 7. Shared infrastructure reuse map

| Reuse | Source | How |
|-------|--------|-----|
| Users / JWT / cookie / CSRF | `php/helpers/auth.php`, `apiClient.ts` | Login shared; company ACL layered |
| Paise money | `money.ts`, `money_paise.php` | Canonical amounts |
| Idempotent writes pattern | `financial_write_receipts`, `mutationId` | Parallel `company_financial_write_receipts` |
| Platform audit helpers | `php/helpers/audit.php` | Plus company-scoped `company_audit_logs` |
| UI primitives | `src/components/ui/*` | Visual consistency |
| DB connection | `php/config/db.php` | Same MySQL server, separate tables |
| HTTP envelope | `json_ok` / `json_error` | Same API style |
| Billing tables (adapter only) | `plans`, `subscriptions` | Org subscription via adapter — not GL |

| Do not reuse as SoT | Reason |
|---------------------|--------|
| `transactions`, `accounts`, `cards`, `loans`, `udhari` | Personal domain |
| `financial_events` / `financial_effects` | Personal derived ledger, not GL |
| `cloud_collection_rows` for vouchers | Need relational integrity + indexes |
| Household roles | Not company RBAC (`docs/RBAC-SECURITY-AUDIT.md`) |
| `businessOrPersonal` | Tagging, not books |

---

## 8. Non-goals (v1)

- Full GST e-invoice / GSTR filing automation (store GSTIN/flags; posting templates later)
- Inventory / stock valuation engine
- Purchase order → GRN → invoice full supply chain (voucher types reserved)
- Automatic interest posting without explicit enable
- Automatic personal↔company dual-write
- Merging vouchers across companies in a group

---

## 9. Success definition

The product succeeds when an operator can run daily hisab-kitab **without accounting training**, while an accountant can open the same books and see professional vouchers, trial balance, and audit trail — with **strict isolation** from personal SparowVault data.

---

## 10. Document index

| Document | Purpose |
|----------|---------|
| `COMPANY_ACCOUNTING_MODEL.md` | Ledgers, parties, vouchers, equations |
| `COMPANY_DATABASE_SCHEMA.md` | Tables, indexes, invariants |
| `COMPANY_ROUTE_PAGE_MAP.md` | `/company` IA |
| `COMPANY_PERMISSION_MATRIX.md` | Roles × permissions |
| `COMPANY_VOUCHER_RULES.md` | Posting rules + purpose presets |
| `COMPANY_REPORT_MATRIX.md` | Reports + exports |
| `COMPANY_TEST_MATRIX.md` | QA gates |
| `PERSONAL_COMPANY_DOMAIN_BOUNDARY.md` | Isolation + bridge rules |
| `COMPANY_SAAS_FUTURE_PLAN.md` | Multi-tenant SaaS |

**Gate:** Architecture review sign-off required before coding C0.
